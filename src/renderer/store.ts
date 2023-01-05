import { subscribe as subscribeWithIpc } from "./ipc";
import { State, SpotifyStatus, SoundpadStatus, Status } from "../shared/store";

type Callback = (state: State) => void;

interface SubscriberInfo {
  keys: string[];
  callback: Callback;
}

export let state: State = {
  spotifyStatus: SpotifyStatus.waiting,
  soundpadStatus: SoundpadStatus.waiting,
  status: Status.starting_up,
  lastErrorMessage: "",
  artistAndSongBeingPlayed: "",
  artistAndSongBeingDownloaded: "",
  songDownloadPath: "",
  isAutoPauseEnabled: true,
};

const subscribers: SubscriberInfo[] = [];

export const setState = (newState: State): void => {
  const oldState: State = { ...state };

  state = {
    ...state,
    ...newState,
  };

  for (const subscriber of subscribers) {
    if (subscriber.keys.length) {
      for (const key of subscriber.keys) {
        // @ts-ignore
        if (oldState[key] !== newState[key]) {
          subscriber.callback(state);
          continue;
        }
      }
    } else {
      subscriber.callback(state);
    }
  }
};

export const subscribe = (callback: Callback, keys?: string[]): void => {
  subscribers.push({
    keys: keys || [],
    callback,
  });
};

const setup = () => {
  subscribeWithIpc("new-state", ({ state: newState }) => {
    setState(newState);
  });
};

export default setup;
