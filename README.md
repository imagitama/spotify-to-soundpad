# Spotify to Soundpad

A Node.js CLI application for synchronizing [Spotify](https://www.spotify.com/au/) with [Soundpad](https://leppsoft.com/soundpad/en/).

It periodically checks what is playing in Spotify and if it changes it will automatically pause Spotify, download an MP3 of the song from YouTube, add it to Soundpad and play it.

# Notes

- dumps MP3 files into Music folder
- strips out weird characters from filenames

# Development

1. enable "youtube data api" in google cloud console
2. create credentials (public data) and copy the API key
3. install python 3.10 from windows store (run `python` command in terminal)

## Building with NEXE

NEXE is old and you will have to build it yourself using `--build`.

If you get an error run the command with `--verbose`.

You might get an error about NASM. Download it [here](https://www.nasm.us/pub/nasm/releasebuilds/2.15.04/win64/).

## C# app

Needed for sending play/pause commands for Spotify.

## YouTube Downloading

`youtube-dl` is too slow. Using `yt-dlp` which is a faster fork.
