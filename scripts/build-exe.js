const nexe = require("nexe");
const path = require("path");
const archiver = require("archiver");
const fs = require("fs");

const { version } = require(path.resolve(__dirname, "../package.json"));

const pathToAllBins = path.resolve(__dirname, "../bin");
const pathToBin = path.resolve(__dirname, "../bin", version);

nexe
  .compile({
    input: "dist/main.js",
    build: true,
    verbose: true,
    resources: [".env"],
    output: path.resolve(pathToBin, "spotify-to-soundpad.exe"),
  })
  .then(() => {
    const output = fs.createWriteStream(
      path.resolve(pathToAllBins, `spotify-to-soundpad ${version}.zip`)
    );

    const archive = archiver("zip", {
      zlib: { level: 9 }, // Sets the compression level.
    });

    archive.on("error", function (err) {
      throw err;
    });

    archive.pipe(output);

    output.on("close", function () {
      console.log(archive.pointer() + " total bytes");
      console.log(
        "archiver has been finalized and the output file descriptor has closed."
      );

      process.exit(0);
    });

    archive.directory(pathToBin, false);

    archive.finalize();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
