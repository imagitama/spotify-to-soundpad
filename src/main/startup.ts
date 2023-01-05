import path from "path";
import { setState, SoundpadStatus, SpotifyStatus, Status } from "./store";
import {
  getIsPlaying as getIsPlayingInSoundpad,
  getPlaybackDurationInMs,
  getPlaybackPositionInMs,
  pause as pauseSoundpad,
  playSoundFile,
  connect as connectToSoundpad,
  getAllSounds,
} from "./soundpad";
import {
  getCurrentlyPlayingArtistAndTitle,
  playNextSong as playNextSongInSpotify,
  pause as pauseSpotify,
  connect as connectToSpotify,
} from "./spotify";
import { downloadYouTubeBySearch, songDownloadPath } from "./download-youtube";
import { getIfFileExists } from "./utils";
import { handleError } from "./errors";
import { subscribe } from "./ipc";

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
    console.debug(`Connecting to Soundpad...`);

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

    // TODO: toggle this behavior or provide option to queue up next song
    await pauseSpotify();
    await pauseSoundpad();

    await playNewSong(lastKnownArtistAndTitle);

    isQueuingNextSong = false;
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
};
