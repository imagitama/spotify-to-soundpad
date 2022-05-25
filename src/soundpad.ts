import xml from "xml2js";
import net from "net";
import path from "path";
import { delay, removeExtension } from "./utils";

// full list of commands: https://www.leppsoft.com/soundpad/files/rc/SoundpadRemoteControl.java

let pipe: undefined | net.Socket;
let isConnected = false;

export const connect = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    pipe = net.createConnection("\\\\.\\pipe\\sp_remote_control", () => {
      isConnected = true;
      resolve();
    });

    pipe.on("error", (error) => {
      pipe = undefined;
      isConnected = false;
      reject(error);
    });

    pipe.on("close", () => {
      isConnected = false;
      pipe = undefined;
    });

    pipe.on("end", () => {
      isConnected = false;
      pipe = undefined;
    });

    pipe.on("timeout", () => {
      isConnected = false;
      pipe = undefined;
    });
  });
};

const sendRequest = async <TResult>(request: string): Promise<TResult> => {
  return new Promise((resolve, reject) => {
    if (!isConnected || !pipe) {
      reject(new Error("Not connected"));
      return;
    }

    pipe.write(request);

    pipe.once("data", (buffer) => {
      //   if (request !== "GetSoundlist()") {
      // console.debug(`sendRequest ${request} ${buffer.toString()}`);
      //   }

      const stringResult = buffer.toString();

      if (stringResult[0] === "<") {
        const xmlResult = xml.parseStringPromise(stringResult);
        resolve(xmlResult);
        return;
      }

      if (stringResult[0] === "R") {
        const statusCode = stringResult.replace("R-", "");

        switch (statusCode) {
          case "200":
          case "204":
            resolve(undefined as unknown as TResult);
            break;
          default:
            reject(new Error(`Soundpad result was ${statusCode}`));
        }
      }

      if (!Number.isNaN(Number(stringResult))) {
        const numberResult = parseInt(stringResult);
        resolve(numberResult as unknown as TResult);
        return;
      }

      resolve(stringResult as unknown as TResult);
    });
  });
};

const getSongTitleByPath = (pathToSoundFile: string) =>
  path.basename(removeExtension(pathToSoundFile));

export const playSoundFile = async (pathToSoundFile: string): Promise<void> => {
  const sounds = await getAllSounds();

  const songTitle = getSongTitleByPath(pathToSoundFile);

  const existingSound = sounds.find((sound) => sound.title === songTitle);
  let index;

  if (existingSound) {
    index = existingSound.index;
  } else {
    index = await addSoundFile(pathToSoundFile);
  }

  await playSoundAtIndex(index);
};

export const addSoundFile = async (
  pathToSoundFile: string
): Promise<number> => {
  console.debug(`Adding sound file ${pathToSoundFile} to Soundpad...`);

  await sendRequest(`DoAddSound(${pathToSoundFile})`);

  const title = getSongTitleByPath(pathToSoundFile);
  const index = await waitForSoundIndexByTitle(title);

  if (index === 0) {
    throw new Error(`Cannot find sound by title ${title} `);
  }

  return index;
};

const waitForSoundIndexByTitle = async (title: string): Promise<number> => {
  const sounds = await getAllSounds();

  const existingSound = sounds.find((sound) => sound.title === title);

  if (existingSound) {
    return existingSound.index;
  }

  // takes a moment to actually update
  // TODO: Keep polling until it is there
  await delay(100);

  return waitForSoundIndexByTitle(title);
};

const getSoundIndexByTitle = async (title: string): Promise<number> => {
  const sounds = await getAllSounds();

  const existingSound = sounds.find((sound) => sound.title === title);

  if (existingSound) {
    return existingSound.index;
  }

  return 0;
};

export const playSoundAtIndex = async (soundIndex: number): Promise<void> => {
  console.debug(`Playing sound ${soundIndex} in Soundpad...`);
  await sendRequest(`DoPlaySound(${soundIndex})`);
};

interface NativeSound {
  index: number;
  url: string;
  artist: string;
  title: string;
  duration: string;
  addedOn: string;
  lastPlayedOn: string;
  playCount: number;
}

type NativeSoundParent = {
  $: NativeSound;
};

type NativeSoundlist = {
  Sound: NativeSoundParent[];
};

type SoundlistResponse = {
  Soundlist: NativeSoundlist;
};

export const getAllSounds = async (): Promise<NativeSound[]> => {
  const result = await sendRequest<SoundlistResponse>("GetSoundlist()");
  return result.Soundlist.Sound.map((nativeSound) => nativeSound.$);
};

export const pause = async (): Promise<void> => {
  await sendRequest("DoStopSound()");
};

export const getPlaybackDurationInMs = async (): Promise<number> =>
  await sendRequest<number>("GetPlaybackDurationInMs()");
export const getPlaybackPositionInMs = async (): Promise<number> =>
  await sendRequest<number>("GetPlaybackPositionInMs()");

export enum PlayStatus {
  STOPPED = "STOPPED",
  PLAYING = "PLAYING",
  PAUSED = "PAUSED",
  SEEKING = "SEEKING",
}

export const getPlayStatus = async (): Promise<PlayStatus> =>
  sendRequest<PlayStatus>("GetPlayStatus()");

export const getIsPlaying = async () => {
  return (await getPlayStatus()) === PlayStatus.PLAYING;
};
