import { BrowserWindow } from "electron";
import path from "path";
import { getAppVersion } from "./app";
import { songDownloadPath } from "./download-youtube";

let mainWindow;

const showMainWindow = () => {
  console.debug(`Showing main window...`);

  mainWindow = new BrowserWindow({
    title: "Spotify To Soundpad",
    width: 480,
    height: 320,
    resizable: false,
    icon: "assets/icon.png",
    maximizable: false,
    webPreferences: {
      preload: path.resolve(__dirname, "./preload.js"),
      additionalArguments: [`appVersion=${getAppVersion()}`],
    },
  });

  mainWindow.loadFile(path.resolve(__dirname, "../renderer/index.html"));
};

export default showMainWindow;
