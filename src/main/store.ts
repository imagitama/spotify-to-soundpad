import { publish } from "./ipc";
import { State } from "../shared/store";

export const setState = (newState: State): void => {
  publish("new-state", { state: newState });
};
