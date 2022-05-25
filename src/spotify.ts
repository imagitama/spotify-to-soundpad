import { exec } from "child_process";

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

  return result.replace(/[^a-zA-Z0-9 ]/g, "");
};
