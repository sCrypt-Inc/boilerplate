const fs = require("fs");
const path = require("path");

function replaceFuncBodyAsm(scryptFile, funcName, asm) {
  return new Promise((resolve, reject) => {
    // Buffer to store the characters
    let buffer = "";

    let pattern = "function " + funcName;
    let patternHits = 0;
    let matchActive = false;
    let curlyBraceLevel = 0;

    // Open the file in read-only mode
    const fileStream = fs.createReadStream(scryptFile, {
      encoding: "utf8",
    });

    // Listen for the data event
    fileStream.on("data", (chunk) => {
      for (let i = 0; i < chunk.length; i++) {
        let c = chunk[i];

        if (matchActive) {
          if (curlyBraceLevel == 0) {
            // Function args
            buffer += c;
          }
          if (c == "{") {
            curlyBraceLevel += 1;
            if (curlyBraceLevel == 1) {
              // First opening curly brace
              // Add ASM here
              buffer += " asm { ";
              buffer += asm;
              buffer += "}";
            }
          } else if (c == "}") {
            if (curlyBraceLevel == 1) {
              // Closing function curly brace
              buffer += c;
              matchActive = false;
            } else {
              curlyBraceLevel -= 1;
            }
          }
        } else if (c == pattern[patternHits]) {
          patternHits += 1;
          buffer += c;

          // Check if full pattern match
          if (patternHits == pattern.length) {
            matchActive = true;
          }
        } else {
          patternHits = 0;
          buffer += c;
        }
      }
    });

    // Listen for the end event
    fileStream.on("end", () => {
      fs.writeFileSync(scryptFile, buffer);
      resolve();
    });

    fileStream.on("error", (error) => {
      reject(error);
    });
  });
}

function getOutDir() {
  let outDir = "./artifacts";

  return outDir;
}

function findFilesWithExtension(directory, extension) {
  const files = fs.readdirSync(directory);
  let foundFiles = [];

  files.forEach((file) => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      const subdirectoryFiles = findFilesWithExtension(filePath, extension);
      foundFiles = foundFiles.concat(subdirectoryFiles);
    } else if (stats.isFile() && file.endsWith(extension)) {
      foundFiles.push(filePath);
    }
  });

  return foundFiles;
}

function fileContainsLineStartingWith(filePath, regexPattern) {
  const fileContent = fs.readFileSync(filePath, "utf8");
  const lines = fileContent.split("\n");

  const regex = new RegExp(`^(${regexPattern})`);
  return lines.some((line) => regex.test(line.trim()));
}

async function main() {
  const asmFile = JSON.parse(fs.readFileSync(".asm/asm.json", "utf-8"));

  const outDir = getOutDir();
  const scryptFiles = findFilesWithExtension(outDir, ".scrypt");

  for (const contractName of Object.keys(asmFile)) {
    let found = false;
    for (const scryptFile of scryptFiles) {
      if (
        fileContainsLineStartingWith(
          scryptFile,
          `(contract|library) ${contractName}`
        )
      ) {
        found = true;
        for (const func of Object.keys(asmFile[contractName])) {
          const asm = asmFile[contractName][func];
          await replaceFuncBodyAsm(scryptFile, func, asm);
        }
      }
    }

    if (!found) {
      throw new Error(
        `Contract ".scrypt" file not found for "${contractName}".`
      );
    }
  }
}

main();
