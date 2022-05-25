// https://github.com/sonodima/soundpad-web/blob/main/lib/Soundpad.ts

import net from "net";
import { type } from "os";

import xml from "xml2js";

type NativeSound = {
  index: number;
  url: string;
  artist: string;
  title: string;
  duration: string;
  addedOn: string;
  lastPlayedOn: string;
  playCount: number;
};

type NativeSoundParent = {
  $: NativeSound;
};

type NativeSoundlist = {
  Sound: NativeSoundParent[];
};

type SoundlistResponse = {
  Soundlist: NativeSoundlist;
};

class Soundpad {
  private _pipe?: net.Socket;
  connected: boolean;

  constructor() {
    this.connected = false;
  }

  connectAsync(): Promise<boolean> {
    return new Promise((resolve) => {
      this._pipe = net.createConnection(
        "\\\\.\\pipe\\sp_remote_control",
        () => {
          this.connected = true;
          resolve(true);
        }
      );

      this._pipe.on("error", (error) => {
        this._pipe = undefined;
        this.connected = false;
        // console.error(error);
        resolve(false);
      });

      this._pipe.on("close", () => {
        this.connected = false;
        this._pipe = undefined;
      });

      this._pipe.on("end", () => {
        this.connected = false;
        this._pipe = undefined;
      });

      this._pipe.on("timeout", () => {
        this.connected = false;
        this._pipe = undefined;
      });
    });
  }

  private async requestAsync(request: string): Promise<Buffer | undefined> {
    if (!this.connected || this._pipe == undefined) {
      console.error("Pipe is not ready");
      return undefined;
    }

    return new Promise((resolve) => {
      setTimeout(() => resolve(undefined), 1000);

      this._pipe?.write(request);
      this._pipe?.once("data", (buffer) => {
        resolve(buffer);
      });
    });
  }

  async getSoundsAsync(): Promise<null | undefined | NativeSoundParent[]> {
    const response = await this.requestAsync("GetSoundlist()");
    if (response != undefined) {
      // not sure why it returns a HTTP status code but w/e
      if (response.toString() === "R-200") {
        return this.getSoundsAsync();
      }

      const parsed = (await xml.parseStringPromise(
        response
      )) as SoundlistResponse;

      return parsed.Soundlist.Sound;
    }
  }

  playSound(id: number) {
    return this.requestAsync(`DoPlaySound(${id})`);
  }

  // NEW STUFF

  async addSound(soundPath: string, title: string) {
    await this.requestAsync(`DoAddSound(${soundPath})`);

    // now wait for the change to happen
    await new Promise((resolve) => {
      setInterval(async () => {
        const sounds = await this.getSoundsAsync();

        if (sounds && sounds.find((sound) => sound.$.title === title)) {
          resolve(true);
        }
      }, 100);
    });
  }

  pause() {
    return this.requestAsync(`DoStopSound()`);
  }
}

let soundpad = new Soundpad();

export default soundpad;
