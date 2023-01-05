import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  send: (topic: string, payload: any) => ipcRenderer.send(topic, [payload]),
  on: (topic: string, callback: any) =>
    ipcRenderer.on(topic, (...args) => callback(args[1])),
  argv: process.argv,
});
