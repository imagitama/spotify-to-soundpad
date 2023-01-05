import log from "electron-log";
import { app } from "electron";
import showMainWindow from "./window";
import { setState, Status } from "./store";
import setupStartup, { setupAndStart } from "./startup";
import {
  getSongDownloadPath,
  setupYouTubeDownloader,
} from "./download-youtube";
import { handleError } from "./errors";
import { publish, subscribe } from "./ipc";

Object.assign(console, log.functions);

require("dotenv").config();

const main = async () => {
  try {
    console.log("Starting up...");

    setupStartup();

    await app.whenReady();

    console.log("App is ready");

    showMainWindow();

    subscribe("app-ready", () => {
      publish("new-state", {
        state: {
          songDownloadPath: getSongDownloadPath(),
        },
      });
    });

    setupYouTubeDownloader();

    await setupAndStart();
  } catch (err) {
    console.error(err);

    handleError(err as Error);

    setState({
      status: Status.error,
    });
  }
};

main();
