import { exec } from "child_process";
import { sendNextTrackKey, sendPlayPauseKey } from "./windows";

export const getCurrentlyPlayingArtistAndTitle = async (): Promise<string> => {
  const result = await new Promise(
    (resolve: (mainWindowTitle: string) => void, reject) => {
      exec(
        "Get-Process spotify | where {$_.mainWindowTitle} | Select mainwindowtitle | ForEach-Object {$_.mainwindowtitle}",
        { shell: "powershell.exe" },
        (err, stdout, stderr) => {
          if (err) {
            if (err.message.includes("Cannot find a process with the name")) {
              reject(new Error("Failed to detect Spotify. Is it running?"));
              return;
            }

            reject(err);
            return;
          }

          if (stderr) {
            reject(new Error(stderr));
            return;
          }

          resolve(stdout);
        }
      );
    }
  );

  // if not playing it is "Spotify" or "Spotify Premium"
  if (result.includes("Spotify")) {
    return "";
  }

  const resultWithoutLineBreak = result.replace("\r\n", "");

  const cleanedResult = resultWithoutLineBreak.replace(
    /[^a-zA-Z0-9 \-\\(\)\.']/g,
    ""
  );

  return cleanedResult;
};

export const pause = async () => {
  console.debug(`Pausing Spotify`);
  await sendPlayPauseKey();
};

export const playNextSong = async () => {
  console.debug(`Playing next song in Spotify`);
  await sendNextTrackKey();
};
