import Store from "electron-store";

const store = new Store();

const keys = {
  isAutoPauseEnabled: "isAutoPauseEnabled",
};

export const getIsAutoPauseEnabled = (): boolean =>
  !!store.get(keys.isAutoPauseEnabled, "true");

export const setIsAutoPauseEnabled = (newValue: boolean): void =>
  store.set(keys.isAutoPauseEnabled, newValue);
