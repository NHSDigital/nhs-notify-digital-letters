/**
 * Bump Shared Modules Version
 *
 * Updates all Terraform module source URLs in the dl component to use a new version
 * of the nhs-notify-shared-modules repository.
 */

import * as fs from "fs";
import * as path from "path";

// ANSI color codes
const colours = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
};

function showHelp() {
  console.log(`
Bump Shared Modules Version

Updates all Terraform module source URLs to use a new version
of the nhs-notify-shared-modules repository.

USAGE:
  npx ts-node scripts/terraform/bump-shared-modules.ts <version> [options]

ARGUMENTS:
  <version>     New version tag (e.g., v3.0.1)

OPTIONS:
  -h, --help    Show this help message
  --dry-run     Preview changes without modifying files

EXAMPLES:
  npx ts-node scripts/terraform/bump-shared-modules.ts v3.0.1
  npx ts-node scripts/terraform/bump-shared-modules.ts v3.0.1 --dry-run
`);
}

const args = process.argv.slice(2);
const NEW_VERSION = args[0];
const isDryRun = args.includes("--dry-run");

const VERSION_FORMAT = /^v\d+\.\d+\.\d+$/;

if (!VERSION_FORMAT.test(NEW_VERSION)) {
  console.error("Version must match format vX.Y.Z");
  process.exit(1);
}

if (!NEW_VERSION || NEW_VERSION === "-h" || NEW_VERSION === "--help") {
  showHelp();
  process.exit(NEW_VERSION ? 0 : 1);
}

const TARGET_DIR = path.resolve(
  process.cwd(),
  "infrastructure/terraform/components/dl"
);

if (!fs.existsSync(TARGET_DIR)) {
  console.error("Target directory does not exist:", TARGET_DIR);
  process.exit(1);
}

const VERSION_REGEX = /releases\/download\/v\d+\.\d+\.\d+/g;

function getTfFiles(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      getTfFiles(fullPath, files);
    } else if (fullPath.endsWith(".tf")) {
      files.push(fullPath);
    }
  }
  return files;
}

const tfFiles = getTfFiles(TARGET_DIR);

let total = 0;
const versionCount: Record<string, number> = {};
const fileChanges: Array<{
  file: string;
  versions: Set<string>;
  count: number;
}> = [];

for (const file of tfFiles) {
  const content = fs.readFileSync(file, "utf8");
  const matches = content.match(VERSION_REGEX);

  if (matches) {
    total += matches.length;
    const uniqueVersions = new Set(matches);

    fileChanges.push({
      file: path.relative(process.cwd(), file),
      versions: uniqueVersions,
      count: matches.length,
    });

    for (const match of matches) {
      versionCount[match] = (versionCount[match] || 0) + 1;
    }

    if (!isDryRun) {
      const updated = content.replace(
        VERSION_REGEX,
        `releases/download/${NEW_VERSION}`
      );
      fs.writeFileSync(file, updated, "utf8");
    }
  }
}

console.log(isDryRun ? "\n DRY RUN MODE - No files will be modified\n" : "");
console.log("Scanned directory:", TARGET_DIR);
console.log("Files to update:", fileChanges.length);
console.log("Total occurrences:", total);
console.log("\nVersion distribution before replacement:");
console.log(versionCount);
console.log("\nWill replace with:", NEW_VERSION);

if (isDryRun) {
  console.log("\n Detailed changes per file:\n");
  fileChanges.forEach((change) => {
    const versionsStr = Array.from(change.versions)
      .map((v) => v.replace("releases/download/", ""))
      .join(", ");
    console.log(
      `  ${change.file} ${colours.red}${versionsStr}${colours.reset} → ${colours.green}${NEW_VERSION}${colours.reset}`
    );
  });
  console.log("\n Run without --dry-run to apply changes.");
} else {
  console.log("\n Updated files:\n");
  fileChanges.forEach((change) => {
    const versionsStr = Array.from(change.versions)
      .map((v) => v.replace("releases/download/", ""))
      .join(", ");
    console.log(
      `  ${change.file} ${colours.red}${versionsStr}${colours.reset} → ${colours.green}${NEW_VERSION}${colours.reset}`
    );
  });
  console.log("\n Files updated successfully!");
}
