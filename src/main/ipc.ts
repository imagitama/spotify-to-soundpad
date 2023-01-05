import { ipcMain, webContents } from "electron";

export const subscribe = (
  topic: string,
  callback: (newData?: any) => Promise<any> | void
) => {
  ipcMain.addListener(topic, (...args) => {
    try {
      const data = args[1][0];
      callback(data);
    } catch (err) {
      console.error(err);
    }
  });
};

export const publish = <TData>(topic: string, data: TData) => {
  for (const wc of webContents.getAllWebContents()) {
    wc.send(topic, [data]);
  }
};
