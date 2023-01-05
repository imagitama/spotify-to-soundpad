export const getSongDownloadPath = () => {
  return window.electron.argv
    .find((arg) => arg.includes("songDownloadPath"))
    .split("=")
    .pop();
};
