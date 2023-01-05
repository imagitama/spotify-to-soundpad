import path from "path";

export const getAppVersion = () => {
  const packageVersion = require(path.resolve(
    __dirname,
    "../../package.json"
  )).version;

  return packageVersion;
};
