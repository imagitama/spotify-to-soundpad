import { exec } from "child_process";
import path from "path";

// no way to do this natively in nodejs so we have a c# app for it
export const sendCommand = async (command: string): Promise<void> => {
  await new Promise((resolve, reject) => {
    const binaryPath = path.resolve(
      __dirname,
      "../../bin/SendPlayPause/SendPlayPause.exe"
    );

    exec(
      `& "${binaryPath}" ${command}`,
      { shell: "powershell.exe" },
      (err, stdout, stderr) => {
        if (err) {
          reject(err);
          return;
        }

        if (stderr) {
          reject(new Error(stderr));
          return;
        }

        resolve(undefined);
      }
    );
  });
};

export const sendPlayPauseKey = async (): Promise<void> =>
  sendCommand("playpause");
export const sendNextTrackKey = async (): Promise<void> =>
  sendCommand("nexttrack");
