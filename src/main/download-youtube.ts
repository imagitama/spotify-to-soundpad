import path from "path";
import os from "os";
import { promises as fs } from "fs";
import { create as createYoutubeDl } from "youtube-dl-exec";
import { getIfFileExists } from "./utils";

export const songDownloadPath = path.resolve(
  os.homedir(),
  "Music/spotify-to-soundpad"
);

export const getSongDownloadPath = () => songDownloadPath;

let youtubedl: ReturnType<typeof createYoutubeDl>;

export const setupYouTubeDownloader = () => {
  youtubedl = createYoutubeDl(path.resolve(__dirname, "../../bin/yt-dlp.exe"));
};

export const downloadYouTubeBySearch = async (
  searchTerm: string,
  outputFileNameWithoutExt: string
) => {
  const outputPath = path.resolve(
    songDownloadPath,
    `${outputFileNameWithoutExt}.mp3`
  );

  console.debug(
    `Downloading youtube by searching "${searchTerm}" to ${outputPath}...`
  );

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  if (await getIfFileExists(outputPath)) {
    console.debug(`File already existings - skipping download`);
    return outputPath;
  }

  // defaults to 128kb
  await youtubedl(`ytsearch1:${searchTerm}`, {
    output: outputPath,
    noWarnings: true,
    callHome: false,
    noCheckCertificate: true,
    preferFreeFormats: true,
    youtubeSkipDashManifest: true,
    // referer: `https://www.youtube.com/watch?v=${videoId}`,
    extractAudio: true,
    audioFormat: "mp3",
    ffmpegLocation: path.resolve(__dirname, "../../bin/ffmpeg.exe"),
  });

  return outputPath;
};

export const downloadYouTubeId = async (
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
