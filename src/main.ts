import { promises as fs } from "fs";
import path from "path";
import {
  connect as connectToSoundpad,
  getAllSounds,
  getIsPlaying as getIsPlayingInSoundpad,
  getPlaybackDurationInMs,
  getPlaybackPositionInMs,
  pause as pauseSoundpad,
  playSoundFile,
} from "./soundpad";
import {
  getCurrentlyPlayingArtistAndTitle,
  playNextSong as playNextSongInSpotify,
  pause as pauseSpotify,
} from "./spotify";
import { getBestYouTubeVideoId } from "./youtube";
import {
  downloadYouTubeId,
  setupYouTubeDownloader,
  songDownloadPath,
} from "./download-youtube";
import { getIfFileExists } from "./utils";

require("dotenv").config();

if (!process.env.APPDATA) {
  throw new Error("No app data");
}

// const pathToConfig = path.resolve(
//   process.env.APPDATA,
//   "spotify-to-soundpad/config.json"
// );
const pathToLogFile = path.resolve(
  process.env.APPDATA,
  "spotify-to-soundpad/log.txt"
);

// interface Config {
//   access_token: string;
// }

// const readConfig = async (): Promise<Config> => {
//   try {
//     const configJsonBuffer = await fs.readFile(pathToConfig);
//     const config = JSON.parse(configJsonBuffer.toString());
//     return config;
//   } catch (err) {
//     return {
//       access_token: "",
//     };
//   }
// };

// const writeConfig = async (newConfig: Config): Promise<void> => {
//   await fs.mkdir(path.dirname(pathToConfig), { recursive: true });
//   const json = JSON.stringify(newConfig, null, "  ");
//   await fs.writeFile(pathToConfig, json);
// };

let lastKnownArtistAndTitle = "";

const playNewSong = async (artistAndTitle: string): Promise<void> => {
  const existingFilePath = path.resolve(
    songDownloadPath,
    `${artistAndTitle}.mp3`
  );

  if (await getIfFileExists(existingFilePath)) {
    console.debug(`Existing mp3 exists, playing it...`);
    await playSoundFile(existingFilePath);
    return;
  }

  // hardcode "lyrics" here to reduce video size
  const searchTerm = `${artistAndTitle} lyrics`;

  const youtubeVideoId = await getBestYouTubeVideoId(searchTerm);

  const result = await downloadYouTubeId(youtubeVideoId, artistAndTitle);

  await playSoundFile(result);
};

const syncWithSpotify = async () => {
  const artistAndTitle = await getCurrentlyPlayingArtistAndTitle();

  if (!artistAndTitle) {
    return;
  }

  if (artistAndTitle !== lastKnownArtistAndTitle) {
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
      handleError(err);
    }
  }, 500);

  syncWithSpotify();

  setInterval(async () => {
    try {
      await syncWithSoundpad();
    } catch (err) {
      console.error(err);
      handleError(err);
    }
  }, 500);

  syncWithSoundpad();
};

let isQueuingNextSong = false;
const msRemainingBeforeQueueNextSong = 1000;

const syncWithSoundpad = async () => {
  if (!(await getIsPlayingInSoundpad())) {
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

const setupSoundpad = async () => {
  console.debug(`Connecting to Soundpad...`);

  await connectToSoundpad();

  const sounds = await getAllSounds();

  console.debug(`Found ${sounds.length} Soundpad sounds`);
};

const handleError = async (err: any) => {
  const contents = typeof err === "object" ? err.message : err.toString();
  await fs.mkdir(path.dirname(pathToLogFile), { recursive: true });
  await fs.appendFile(pathToLogFile, contents);
};

const main = async () => {
  try {
    console.log("Starting up...");

    setupYouTubeDownloader();

    await setupSoundpad();

    await start();
  } catch (err: any) {
    console.error(err);
    handleError(err);
    process.exit(1);
  }
};

main();
