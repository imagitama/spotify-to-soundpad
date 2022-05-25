import request from "request";
import { promises as fs } from "fs";
import path from "path";
import express, { Express } from "express";
import open from "open";
import { create as createYoutubeDl } from "youtube-dl-exec";
import os from "os";
import Soundpad from "./soundpad";
import { getCurrentlyPlayingArtistAndTitle } from "./spotify";
import { sendPlayPauseKey } from "./windows";

require("dotenv").config();

const youtubeApiKey = process.env.YOUTUBE_API_KEY;
const songDownloadPath = path.resolve(
  os.homedir(),
  "Music/spotify-to-soundpad"
);

if (!process.env.APPDATA) {
  throw new Error("No app data");
}

if (!youtubeApiKey) {
  throw new Error("No youtube api key");
}

const pathToConfig = path.resolve(
  process.env.APPDATA,
  "spotify-to-soundpad/config.json"
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
const youtubeApiBaseUrl = "https://www.googleapis.com/youtube/v3";

const getBestYouTubeVideoId = async (searchTerm: string): Promise<string> => {
  console.debug(`Querying youtube...`, { searchTerm, youtubeApiKey });

  const cleanSearchTerm = encodeURIComponent(searchTerm);
  const url = `${youtubeApiBaseUrl}/search?part=snippet&maxResults=1&order=relevance&q=${cleanSearchTerm}&type=video&videoDefinition=high&key=${youtubeApiKey}`;

  return new Promise((resolve, reject) => {
    var options = {
      url,
      json: true,
    };

    request.get(options, function (error, response, body) {
      if (error) {
        reject(error);
        return;
      }

      if (body.error) {
        reject(new Error(`${body.error.code}: ${body.error.message}`));
        return;
      }

      if (!body.items.length) {
        reject(new Error("No youtube videos found!"));
        return;
      }

      const bestResultId = body.items[0].id.videoId;

      console.debug(`Found best result: ${bestResultId}`);

      resolve(bestResultId);
    });
  });
};

const getIfFileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.stat(filePath);
    return true;
  } catch (err: any) {
    if (err.code && err.code === "ENOENT") {
      return false;
    } else {
      throw err;
    }
  }
};

const downloadYouTubeId = async (
  videoId: string,
  filenameWithoutExt: string
): Promise<string> => {
  const outputPath = path.resolve(
    songDownloadPath,
    `${filenameWithoutExt}.mp3`
  );

  console.debug(`Downloading youtube id ${videoId} to ${outputPath}...`);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  if (await getIfFileExists(outputPath)) {
    console.debug(`File already existings - skipping download`);
    return outputPath;
  }

  // defaults to 128kb
  await youtubedl(`https://www.youtube.com/watch?v=${videoId}`, {
    output: outputPath,
    noWarnings: true,
    callHome: false,
    noCheckCertificate: true,
    preferFreeFormats: true,
    youtubeSkipDashManifest: true,
    referer: `https://www.youtube.com/watch?v=${videoId}`,
    extractAudio: true,
    audioFormat: "mp3",
  });

  return outputPath;
};

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
  try {
    console.debug(`Starting the loop...`);

    setInterval(() => {
      syncWithSpotify();
    }, 500);

    syncWithSpotify();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

let youtubedl: ReturnType<typeof createYoutubeDl>;

const setupYouTubeDownloader = () => {
  youtubedl = createYoutubeDl(path.resolve(__dirname, "yt-dlp.exe"));
};

const setupSoundpad = async () => {
  console.debug(`Connecting to Soundpad...`);

  await Soundpad.connectAsync();

  const sounds = await Soundpad.getSoundsAsync();

  if (!sounds) {
    throw new Error("No sounds found!");
  }

  console.debug(`Found ${sounds.length} Soundpad sounds`);
};

const main = async () => {
  try {
    console.log("Starting up...");

    setupYouTubeDownloader();

    await setupSoundpad();

    await start();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

main();
