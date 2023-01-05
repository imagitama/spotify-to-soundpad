import React, { useEffect, useState } from "react";
import path from "path";
import { ErrorBoundary } from "react-error-boundary";
import {
  SoundpadStatus,
  SpotifyStatus,
  state,
  Status,
  subscribe,
} from "./store";
import { setupAndStart } from "./startup";
import { getAppVersion } from "./app-stuff";
import { publish } from "./ipc";

const retrySetup = async () => {
  try {
    console.debug(`Retrying setup...`);
    await setupAndStart();
  } catch (err) {
    console.error(err);
  }
};

const getSpotifyConnectionStatusLabel = () => {
  switch (state.spotifyStatus) {
    case SpotifyStatus.not_detected:
      return "Failed to connect (is it running and playing a song?)";
    case SpotifyStatus.detected:
      return "Connected";
    case SpotifyStatus.waiting:
      return "Waiting";
    default:
      return "Unknown";
  }
};

const getSoundpadConnectionStatusLabel = () => {
  switch (state.soundpadStatus) {
    case SoundpadStatus.connecting:
      return "Connecting...";
    case SoundpadStatus.connected:
      return "Connected";
    case SoundpadStatus.failed:
      return "Failed to connect (is it running?)";
    case SoundpadStatus.waiting:
      return "Waiting";
    default:
      return "Unknown";
  }
};

const getStatusAsLabel = () => {
  switch (state.status) {
    case Status.starting_up:
      return "Waiting";
    case Status.starting_up:
      return "Starting up...";
    case Status.downloading_song:
      return `Downloading song "${
        state.artistAndSongBeingDownloaded || "(unknown)"
      }"...`;
    case Status.playing_song:
      return `Playing song "${state.artistAndSongBeingPlayed || "(unknown)"}"`;
    case Status.error:
      return `Error: ${state.lastErrorMessage || "(no error message)"}`;
    default:
      return "Unknown";
  }
};

const getValueStatusForSpotifyConnection = () => {
  switch (state.spotifyStatus) {
    case SpotifyStatus.not_detected:
      return ValueStatus.bad;
    case SpotifyStatus.detected:
      return ValueStatus.good;
    case SpotifyStatus.waiting:
      return ValueStatus.warning;
    default:
      return ValueStatus.warning;
  }
};

const getValueStatusForSoundpadConnection = () => {
  switch (state.soundpadStatus) {
    case SoundpadStatus.connecting:
      return ValueStatus.warning;
    case SoundpadStatus.connected:
      return ValueStatus.good;
    case SoundpadStatus.failed:
      return ValueStatus.bad;
    case SoundpadStatus.waiting:
      return ValueStatus.warning;
    default:
      return ValueStatus.warning;
  }
};

const getValueStatusForStatus = () => {
  switch (state.status) {
    case Status.waiting:
    case Status.starting_up:
      return ValueStatus.warning;
    case Status.playing_song:
    case Status.downloading_song:
      return ValueStatus.good;
    case Status.error:
      return ValueStatus.bad;
    default:
      return ValueStatus.warning;
  }
};

const styleSheet = `
span {
  color: white;
  display: block;
}

body {
  background-color: #000;
  color: #FFF;
  font: Helvetica, Arial, sans-serif;
}

#row {
  display: flex;
  margin-bottom: 10px;
}

#heading {
  font-size: 20px;
}

#label {
  width: 30%;
}

#value-bad {
  color: #fc0303;
}

#value-warning {
  color: #fcec03;
}

#value-good {
  color: #0bfc03;
}

#footer QLabel {
  font-size: 8px;
}
  `;

enum ValueStatus {
  warning = "warning",
  good = "good",
  bad = "bad",
}

const View = ({
  id,
  children,
}: {
  id?: string;
  children: React.ReactChild | React.ReactChild[];
}) => <section id={id}>{children}</section>;
const Text = ({
  id,
  children,
}: {
  id?: string;
  children: React.ReactChild | React.ReactChild[];
}) => <span id={id}>{children}</span>;
const Button = ({
  onClick,
  children,
}: {
  onClick?: () => void;
  children: React.ReactChild | React.ReactChild[];
}) => <button onClick={onClick}>{children}</button>;

const Heading = ({
  children,
}: {
  children: string | number | Array<string | number>;
}) => <Text id="heading">{children}</Text>;

const Label = ({
  children,
}: {
  children: string | number | Array<string | number>;
}) => <Text id="label">{children}</Text>;

const Value = ({
  children,
  status,
}: {
  children: string | number | Array<string | number>;
  status: ValueStatus;
}) => <Text id={`value-${status}`}>{children}</Text>;

const Row = ({
  children,
}: {
  children: React.ReactChild | React.ReactChild[];
}) => <View id="row">{children}</View>;

const getSongDownloadPath = () => state.songDownloadPath;

const App = () => {
  const [, forceRerender] = useState(0);

  const hydrate = () => forceRerender((currentVal) => currentVal + 1);

  useEffect(() => {
    subscribe(() => hydrate());
    publish("app-ready", {});
  }, []);

  return (
    <View id="rootView">
      <style>{styleSheet}</style>
      <ErrorBoundary
        FallbackComponent={({ error }) => <Text>Error: {error.message}</Text>}
        onError={(error) => console.error(error)}
      >
        <Row>
          <Heading>Spotify To Soundpad {getAppVersion()}</Heading>
        </Row>
        <Row>
          <Label>Spotify</Label>
          <Value status={getValueStatusForSpotifyConnection()}>
            {getSpotifyConnectionStatusLabel()}
          </Value>
        </Row>
        <Row>
          <Label>Soundpad</Label>
          <Value status={getValueStatusForSoundpadConnection()}>
            {getSoundpadConnectionStatusLabel()}
          </Value>
        </Row>
        <Row>
          <Label>Status</Label>
          <Value status={getValueStatusForStatus()}>{getStatusAsLabel()}</Value>
        </Row>
        <Row>
          {state.soundpadStatus === SoundpadStatus.failed ||
          state.spotifyStatus === SpotifyStatus.not_detected ? (
            <Button onClick={() => retrySetup()}>Retry</Button>
          ) : (
            <></>
          )}
        </Row>
        <View id="footer">
          <Text>
            New releases:
            https://github.com/imagitama/spotify-to-soundpad/releases
          </Text>
          <Text>Downloading to: {getSongDownloadPath()}</Text>
        </View>
      </ErrorBoundary>
    </View>
  );
};

export default App;
