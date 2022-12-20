# Spotify to Soundpad

**You must have Soundpad and Spotify running BEFORE launching this software!**

A Node.js CLI application for synchronizing [Spotify](https://www.spotify.com/au/) with [Soundpad](https://leppsoft.com/soundpad/en/).

It periodically checks what is playing in Spotify and if it changes it will automatically pause Spotify, download an MP3 of the song from YouTube, add it to Soundpad and play it.

# Notes

- dumps MP3 files into Music folder
- strips out weird characters from filenames

# Issues

## Spotify next track isnt played

In spotify go to settings and uncheck "Show desktop overlay when using media keys"

# Development

1. install python 3.10 from windows store (run `python` command in terminal)
2. download `yt-dlp.exe` (v2022.05.18) and `ffmpeg.exe` (4.2.3) and place into `bin` directory in root
3. run `build:cs` command to build the C# app
