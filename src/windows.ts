import { exec } from "child_process";
import path from "path";

// no way to do this natively in nodejs so we have a c# app for it
export const sendPlayPauseKey = async (): Promise<boolean> => {
  await new Promise((resolve: (mainWindowTitle: string) => void, reject) => {
    const binaryPath =
      process.env.NODE_ENV === "development"
        ? path.resolve(__dirname, "../SendPlayPause/SendPlayPause.exe")
        : path.resolve("./SendPlayPause/SendPlayPause.exe");

    exec(binaryPath, { shell: "powershell.exe" }, (err, stdout, stderr) => {
      if (err) {
        reject(err);
        return;
      }

      if (stderr) {
        reject(new Error(stderr));
        return;
      }

      resolve(stdout);
    });
  });

  return true;
};
