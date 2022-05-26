const { promises: fs } = require("fs");
const path = require("path");

async function copyDir(src, dest) {
  const entries = await fs.readdir(src, { withFileTypes: true });
  await fs.mkdir(dest, { recursive: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

const { version } = require(path.resolve(__dirname, "../package.json"));

const pathToOutput = path.resolve(__dirname, "../build", version);
const pathToBin = path.resolve(__dirname, "../bin");
const pathToAssets = path.resolve(__dirname, "../assets");

const main = async () => {
  try {
    await copyDir(pathToBin, path.resolve(pathToOutput, "bin"));
    await copyDir(pathToAssets, path.resolve(pathToOutput));
    await fs.copyFile(
      path.resolve(__dirname, "../CHANGELOG.md"),
      path.resolve(pathToOutput, "CHANGELOG.md")
    );
  } catch (err) {
    console.error(err);
  }
};

main();
