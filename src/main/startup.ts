import path from "path";
import { setState } from "./store";
import { SoundpadStatus, SpotifyStatus, State, Status } from "../shared/store";
import {
  getIsPlaying as getIsPlayingInSoundpad,
  getPlaybackDurationInMs,
  getPlaybackPositionInMs,
  pause as pauseSoundpad,
  playSoundFile,
  connect as connectToSoundpad,
  getAllSounds,
  getIsConnected as getIsConnectedToSoundpad,
  getIsConnecting as getIsConnectingToSoundpad,
} from "./soundpad";
import {
  getCurrentlyPlayingArtistAndTitle,
  playNextSong as playNextSongInSpotify,
  pause as pauseSpotify,
  connect as connectToSpotify,
  getIsConnected as getIsConnectedToSpotify,
} from "./spotify";
import {
  downloadYouTubeBySearch,
  getSongDownloadPath,
  songDownloadPath,
} from "./download-youtube";
import { getIfFileExists } from "./utils";
import { handleError } from "./errors";
import { publish, subscribe } from "./ipc";
import { getIsAutoPauseEnabled, setIsAutoPauseEnabled } from "./config";

export const setupAndStart = async () => {
  try {
    setState({
      status: Status.starting_up,
      lastErrorMessage: "",
    });

    await Promise.all([setupSoundpad(), setupSpotify()]);
  } catch (err) {
    handleError(err as any);

    setState({
      status: Status.error,
    });

    return;
  }

  setState({
    status: Status.waiting,
    lastErrorMessage: "",
  });

  await start();
};

export const setupSoundpad = async () => {
  try {
    console.debug(`Setting up Soundpad...`);

    setState({
      soundpadStatus: SoundpadStatus.connecting,
    });

    await connectToSoundpad();

    setState({
      soundpadStatus: SoundpadStatus.connected,
    });

    const sounds = await getAllSounds();

    console.debug(`Found ${sounds.length} Soundpad sounds`);
  } catch (err) {
    setState({
      soundpadStatus: SoundpadStatus.failed,
      lastErrorMessage: (err as Error).message,
    });

    throw err;
  }
};

export const setupSpotify = async () => {
  try {
    console.debug(`Connecting to Spotify...`);

    setState({
      spotifyStatus: SpotifyStatus.waiting,
    });

    await connectToSpotify();

    setState({
      spotifyStatus: SpotifyStatus.detected,
    });
  } catch (err) {
    setState({
      spotifyStatus: SpotifyStatus.not_detected,
      lastErrorMessage: (err as Error).message,
    });

    throw err;
  }
};

let lastKnownArtistAndTitle = "";

const playNewSong = async (artistAndTitle: string): Promise<void> => {
  const existingFilePath = path.resolve(
    songDownloadPath,
    `${artistAndTitle}.mp3`
  );

  if (await getIfFileExists(existingFilePath)) {
    console.debug(`Existing mp3 exists, playing it...`);

    setState({
      status: Status.playing_song,
      artistAndSongBeingPlayed: artistAndTitle,
    });

    await playSoundFile(existingFilePath);
    return;
  }

  // hardcode "lyrics" here to reduce video size
  const searchTerm = `${artistAndTitle} lyrics`;

  setState({
    status: Status.downloading_song,
    artistAndSongBeingDownloaded: artistAndTitle,
  });

  const result = await downloadYouTubeBySearch(searchTerm, artistAndTitle);

  setState({
    status: Status.playing_song,
    artistAndSongBeingPlayed: artistAndTitle,
  });

  try {
    await playSoundFile(result);
  } catch (err) {
    console.error(err);

    setState({
      soundpadStatus: SoundpadStatus.failed,
      lastErrorMessage: (err as Error).message,
    });
  }
};

const syncWithSpotify = async () => {
  const artistAndTitle = await getCurrentlyPlayingArtistAndTitle();

  if (artistAndTitle && artistAndTitle !== lastKnownArtistAndTitle) {
    lastKnownArtistAndTitle = artistAndTitle;

    console.debug(`Spotify song detected: ${artistAndTitle}`);

    try {
      await pauseSpotify();

      if (getIsAutoPauseEnabled()) {
        await pauseSoundpad();
      }

      await playNewSong(lastKnownArtistAndTitle);

      isQueuingNextSong = false;
    } catch (err) {
      console.error(err);
      handleError(err as Error);
      return;
    }
  }
};

const start = async () => {
  console.debug(`Waiting for Spotify...`);

  setInterval(async () => {
    try {
      await syncWithSpotify();
    } catch (err) {
      console.error(err);
      handleError(err as Error);
    }
  }, 500);

  syncWithSpotify();

  setInterval(async () => {
    try {
      await syncWithSoundpad();
    } catch (err) {
      console.error(err);
      handleError(err as Error);
    }
  }, 500);

  syncWithSoundpad();
};

let isQueuingNextSong = false;
const msRemainingBeforeQueueNextSong = 1000;

const syncWithSoundpad = async () => {
  try {
    if (!(await getIsPlayingInSoundpad())) {
      return;
    }
  } catch (err) {
    console.error(err);

    setState({
      soundpadStatus: SoundpadStatus.failed,
      lastErrorMessage: (err as Error).message,
    });

    return;
  }

  const positionMs = await getPlaybackPositionInMs();
  const durationMs = await getPlaybackDurationInMs();

  const msRemaining = durationMs - positionMs;

  if (
    msRemaining < msRemainingBeforeQueueNextSong &&
    isQueuingNextSong === false
  ) {
    console.debug(`Nearing end of current song, queuing up next song...`);

    isQueuingNextSong = true;

    await playNextSongInSpotify();
  }
};

export default () => {
  subscribe("setup-and-start", async () => {
    try {
      await setupAndStart();
    } catch (err) {
      console.error(err);
      handleError(err as Error);
    }
  });

  subscribe("app-ready", async () => {
    console.debug(`Renderer has told us they are ready`);

    const initialState: State = {
      spotifyStatus: (await getIsConnectedToSpotify())
        ? SpotifyStatus.detected
        : SpotifyStatus.not_detected,
      soundpadStatus: getIsConnectedToSoundpad()
        ? SoundpadStatus.connected
        : getIsConnectingToSoundpad()
        ? SoundpadStatus.waiting
        : SoundpadStatus.failed,
      lastErrorMessage: "",
      artistAndSongBeingPlayed: "",
      artistAndSongBeingDownloaded: "",
      songDownloadPath: getSongDownloadPath(),
      isAutoPauseEnabled: getIsAutoPauseEnabled(),
    };

    console.debug("Initial state", initialState);

    publish("new-state", {
      state: initialState,
    });
  });

  subscribe("toggle-auto-pause", () => {
    const currentVal = getIsAutoPauseEnabled();
    const newVal = !currentVal;
    setIsAutoPauseEnabled(newVal);

    publish("new-state", {
      state: {
        isAutoPauseEnabled: newVal,
      },
    });
  });
};
