import { publish } from "./ipc";

export const setupSpotify = async () => {
  console.debug(`Informing main process to setup Spotify...`);
  publish("setup-spotify", null);
};

export const setupSoundpad = async () => {
  console.debug(`Informing main process to setup Soundpad...`);
  publish("setup-soundpad", null);
};
