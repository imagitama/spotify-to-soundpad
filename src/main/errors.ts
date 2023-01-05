import { promises as fs } from "fs";
import path from "path";
import { setState } from "./store";

if (!process.env.APPDATA) {
  throw new Error("No app data");
}

const pathToLogFile = path.resolve(
  process.env.APPDATA,
  "spotify-to-soundpad/log.txt"
);

export const handleError = async (err: Error) => {
  const contents = err.message;
  await fs.mkdir(path.dirname(pathToLogFile), { recursive: true });
  await fs.appendFile(
    pathToLogFile,
    `
  ${contents}`
  );

  setState({
    lastErrorMessage: err.message,
  });
};
