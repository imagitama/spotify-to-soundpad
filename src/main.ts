import { promises as fs } from "fs";
import path from "path";
import Soundpad from "./soundpad";
import { getCurrentlyPlayingArtistAndTitle } from "./spotify";
import { sendPlayPauseKey } from "./windows";
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

const pathToConfig = path.resolve(
  process.env.APPDATA,
  "spotify-to-soundpad/config.json"
);
const pathToLogFile = path.resolve(
  process.env.APPDATA,
  "spotify-to-soundpad/log.txt"
);

interface Config {
  access_token: string;
}

const readConfig = async (): Promise<Config> => {
  try {
    const configJsonBuffer = await fs.readFile(pathToConfig);
    const config = JSON.parse(configJsonBuffer.toString());
    return config;
  } catch (err) {
    return {
      access_token: "",
    };
  }
};

const writeConfig = async (newConfig: Config): Promise<void> => {
  await fs.mkdir(path.dirname(pathToConfig), { recursive: true });
  const json = JSON.stringify(newConfig, null, "  ");
  await fs.writeFile(pathToConfig, json);
};

const pauseSpotify = async () => {
  console.debug(`Pausing spotify...`);
  await sendPlayPauseKey();
};

let lastKnownArtistAndTitle = "";

const playNewSong = async (artistAndTitle: string): Promise<void> => {
  const existingFilePath = path.resolve(
    songDownloadPath,
    `${artistAndTitle}.mp3`
  );

  if (await getIfFileExists(existingFilePath)) {
    console.debug(`Existing mp3 exists, playing it...`);
    await playMp3InSoundpad(existingFilePath, artistAndTitle);
    return;
  }

  // hardcode "lyrics" here to reduce video size
  const searchTerm = `${artistAndTitle} lyrics`;

  const youtubeVideoId = await getBestYouTubeVideoId(searchTerm);

  const result = await downloadYouTubeId(youtubeVideoId, artistAndTitle);

  await playMp3InSoundpad(result, artistAndTitle);
};

const pauseSoundpad = async () => {
  Soundpad.pause();
};

const delay = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const playMp3InSoundpad = async (
  mp3Path: string,
  title: string
): Promise<void> => {
  console.debug(`Playing mp3 file in soundpad... ${mp3Path}`);

  const originalSounds = await Soundpad.getSoundsAsync();

  if (!originalSounds) {
    throw new Error("No sounds found!");
  }

  const filenameWithoutExt = path.basename(mp3Path).replace(".mp3", "");

  const match = originalSounds.find(
    (sound) => sound.$.title === filenameWithoutExt
  );

  if (match) {
    console.debug(`Sound already in Soundpad, playing...`);
    Soundpad.playSound(match.$.index);
    return;
  }

  console.debug(`Adding sound to Soundpad...`);

  const originalSoundCount = originalSounds.length;

  await Soundpad.addSound(mp3Path, title);

  // we dont actually know if it was successful (thanks soundpad)
  await delay(500);

  // pray they havent added a sound in this delay!
  const soundIndex = originalSoundCount + 1;

  console.debug(`Playing sound ${soundIndex}`);

  await Soundpad.playSound(soundIndex);
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
  }
};

const start = async () => {
  console.debug(`Starting the loop...`);

  setInterval(async () => {
    try {
      await syncWithSpotify();
    } catch (err) {
      console.error(err);
      handleError(err);
    }
  }, 500);

  await syncWithSpotify();
};

const setupSoundpad = async () => {
  console.debug(`Connecting to Soundpad...`);

  const connected = await Soundpad.connectAsync();

  if (!connected) {
    throw new Error("Failed to connect to Soundpad! Is it running?");
  }

  const sounds = await Soundpad.getSoundsAsync();

  if (!sounds) {
    throw new Error("No sounds found!");
  }

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
    // process.exit(1);
  }
};

main();
