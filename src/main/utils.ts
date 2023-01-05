import { promises as fs } from "fs";
import path from "path";

export const getIfFileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.stat(filePath);
    return true;
  } catch (err: any) {
    if (err.code && err.code === "ENOENT") {
      return false;
    } else {
      throw err;
    }
  }
};

export const removeExtension = (filePath: string): string =>
  path.join(
    path.dirname(filePath),
    path.basename(filePath).replace(path.extname(filePath), "")
  );

export const delay = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
