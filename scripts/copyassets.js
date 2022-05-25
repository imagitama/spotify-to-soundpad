const fs = require("fs");
const path = require("path");

const { version } = require(path.resolve(__dirname, "../package.json"));

const pathToBin = path.resolve(__dirname, "../bin", version);

fs.mkdirSync(path.resolve(pathToBin, "SendPlayPause"), { recursive: true });

fs.copyFileSync(
  path.resolve(__dirname, "../SendPlayPause/SendPlayPause.exe"),
  path.resolve(pathToBin, "SendPlayPause/SendPlayPause.exe")
);

fs.copyFileSync(
  path.resolve(__dirname, "../yt-dlp.exe"),
  path.resolve(pathToBin, "yt-dlp.exe")
);
