export const getAppVersion = () => {
  return window.electron.argv
    .find((arg) => arg.includes("appVersion"))
    .split("=")
    .pop();
};
