import { promises as fs } from "fs";

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
