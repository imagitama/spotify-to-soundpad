export enum SpotifyStatus {
  waiting,
  not_detected,
  detected,
}

export enum SoundpadStatus {
  waiting,
  connecting,
  connected,
  failed,
}

export enum Status {
  waiting,
  starting_up,
  downloading_song,
  playing_song,
  error,
}

export interface State {
  spotifyStatus?: SpotifyStatus;
  soundpadStatus?: SoundpadStatus;
  status?: Status;
  lastErrorMessage?: string;
  artistAndSongBeingPlayed?: string;
  artistAndSongBeingDownloaded?: string;
  songDownloadPath?: string;
}
