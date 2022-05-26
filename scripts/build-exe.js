const nexe = require("nexe");
const path = require("path");
const archiver = require("archiver");
const fs = require("fs");

const { version } = require(path.resolve(__dirname, "../package.json"));

const pathToBuilds = path.resolve(__dirname, "../build");
const pathToThisBuild = path.resolve(__dirname, "../build", version);

nexe
  .compile({
    input: "dist/main.js",
    build: true,
    verbose: true,
    resources: [".env"],
    output: path.resolve(pathToThisBuild, "spotify-to-soundpad.exe"),
    ico: path.resolve(__dirname, "../assets/icon.ico"),
    name: "Spotify To Soundpad",
  })
  .then(() => {
    const output = fs.createWriteStream(
      path.resolve(pathToBuilds, `spotify-to-soundpad ${version}.zip`)
    );

    const archive = archiver("zip", {
      zlib: { level: 9 }, // Sets the compression level.
    });

    archive.on("error", function (err) {
      throw err;
    });

    archive.pipe(output);

    output.on("close", function () {
      console.log(archive.pointer() / 1000 + " total kb");
      console.log(
        "archiver has been finalized and the output file descriptor has closed."
      );

      process.exit(0);
    });

    archive.directory(pathToThisBuild, false);

    archive.finalize();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
