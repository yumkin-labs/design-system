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

function checkGitStatus() {
  try {
    const status = execSync("git status --porcelain", {
      encoding: "utf-8",
    }).trim();
    return status;
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log("\n🚀 Version & Release Script\n");

  // Check for uncommitted changes FIRST - npm version requires clean working directory
  const gitStatus = checkGitStatus();
  if (gitStatus) {
    console.log("⚠️  Error: You have uncommitted changes:");
    console.log(gitStatus.split("\n").slice(0, 10).join("\n"));
    if (gitStatus.split("\n").length > 10) {
      console.log(`   ... and ${gitStatus.split("\n").length - 10} more`);
    }
    console.log("\n");
    console.log("npm version requires a clean git working directory.\n");
    console.log(
      "Please commit or stash your changes first, then run this script again.\n"
    );
    rl.close();
    process.exit(1);
  }

  // Only ask for version type if git is clean
  let versionType;
  while (!["major", "minor", "patch"].includes(versionType)) {
    versionType = await askQuestion(
      "What kind of update is this? (major/minor/patch): "
    );

    if (!versionType) {
      console.log("❌ Please enter a value\n");
      versionType = undefined;
      continue;
    }

    if (!["major", "minor", "patch"].includes(versionType)) {
      console.log("❌ Please enter one of: major, minor, or patch\n");
      versionType = undefined;
    }
  }

  rl.close();

  console.log(`\n📦 Creating ${versionType} version...\n`);

  try {
    // npm version automatically creates a commit and tag
    execSync(`npm version ${versionType}`, {
      stdio: "inherit",
    });

    console.log("\n📤 Pushing to remote...\n");
    execSync("git push --follow-tags", {
      stdio: "inherit",
    });

    console.log(`\n✅ Successfully released ${versionType} version!\n`);
  } catch (error) {
    console.error("\n❌ Error during version release");
    if (error.message.includes("Git working directory not clean")) {
      console.error("   npm version requires a clean git working directory.");
      console.error("   Please commit or stash your changes first.\n");
    } else {
      console.error(`   ${error.message}\n`);
    }
    process.exit(1);
  }
}

main();
