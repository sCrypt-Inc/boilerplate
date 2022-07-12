const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const os = require('os');
const fs = require('fs');
const stream = require('stream');
const util = require('util');
const path = require('path');
const chalk = require("chalk");
var child_process_1 = require("child_process");

const DEFAULT_COMPILER_VERSION = '2.0.5';

function compilerVersion(cmdPath) {
  try {
    var text = child_process_1.execSync('"'+ cmdPath + '"' + " --version").toString();
    return text;
  }
  catch (e) {
    throw new Error("compiler version fail when run: " + cmdPath + " --version");
  }
}

const getCircom = async () => {
  let PLATFORM = "windows";
  let VERSION = process.argv.slice(3)[0] || DEFAULT_COMPILER_VERSION;

  if (os.platform() === 'linux') {
    PLATFORM = "linux";
  } else if (os.platform() === 'darwin') {
    PLATFORM = "macos";
  }

  const streamPipeline = util.promisify(stream.pipeline);
  const urlCompiler = `https://github.com/iden3/circom/releases/download/v${VERSION}/circom-${PLATFORM}-amd64`
  const filePathCompiler = path.join(__dirname, '..', 'node_modules/.bin/circom');

  console.log(`${chalk.yellow(`Downloading compiler ${urlCompiler} ...`)}`);

  const fromRelease = await fetch(urlCompiler);

  if (!fromRelease.ok) {
    console.log(`⛔️ ${chalk.red('Download Unsuccesful:')} ${fromRelease.statusText}`);
  } else {
    await streamPipeline(fromRelease.body, fs.createWriteStream(filePathCompiler));
    fs.chmodSync(filePathCompiler, '755');
    console.log(`Download Successful, path: ${filePathCompiler}`);
    // console.log(`Compiler vesion: ${chalk.green.bold(compilerVersion("circom"))} ${chalk.green("✔")}`);
  }
}

if (require.main === module) {
  getCircom();
}

module.exports = getCircom;
