import { publish } from "./ipc";

export const setupAndStart = async () => {
  console.debug(`Informing main process to setup and start...`);
  publish("setup-and-start", null);
};
