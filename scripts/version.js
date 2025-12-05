#!/usr/bin/env node

import { createInterface } from "readline";
import { execSync } from "child_process";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function main() {
  console.log("\n🚀 Version & Release Script\n");

  let versionType;
  while (!["major", "minor", "patch"].includes(versionType)) {
    versionType = await askQuestion(
      "What kind of update is this? (major/minor/patch): "
    );

    if (!["major", "minor", "patch"].includes(versionType)) {
      console.log("❌ Please enter one of: major, minor, or patch\n");
    }
  }

  rl.close();

  console.log(`\n📦 Creating ${versionType} version...\n`);

  try {
    // npm version automatically creates a commit and tag
    // Then we push with --follow-tags
    execSync(`npm version ${versionType} && git push --follow-tags`, {
      stdio: "inherit",
    });

    console.log(`\n✅ Successfully released ${versionType} version!\n`);
  } catch (error) {
    console.error("\n❌ Error during version release:", error.message);
    process.exit(1);
  }
}

main();
