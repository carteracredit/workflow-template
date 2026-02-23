#!/usr/bin/env node
/**
 * update-wrangler-version.js
 *
 * Updates all versioned Worker names in wrangler.jsonc to reflect the new
 * major version from a semver string.
 *
 * Usage: node scripts/update-wrangler-version.js <semver>
 * Example: node scripts/update-wrangler-version.js 2.0.0
 *
 * What it does:
 *  - Reads wrangler.jsonc
 *  - Replaces all occurrences of -v<digit(s)> with -v<newMajor>
 *  - Updates WORKFLOW_VERSION vars to the new major
 *  - Writes the updated file back
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const WRANGLER_PATH = join(ROOT, "wrangler.jsonc");

const semver = process.argv[2];
if (!semver) {
	console.error("Usage: node scripts/update-wrangler-version.js <semver>");
	process.exit(1);
}

const major = semver.split(".")[0];
if (!major || isNaN(Number(major))) {
	console.error(`Invalid semver: ${semver}`);
	process.exit(1);
}

const content = readFileSync(WRANGLER_PATH, "utf8");

// Replace all versioned Worker name patterns: -v<digits> -> -v<major>
// Covers: "name": "my-workflow-dev-v1" and "name": "my-workflow-v1"
const updated = content
	.replace(/-v\d+(?=")/g, `-v${major}`)
	.replace(/"WORKFLOW_VERSION":\s*"\d+"/, `"WORKFLOW_VERSION": "${major}"`);

writeFileSync(WRANGLER_PATH, updated, "utf8");

console.log(
	`wrangler.jsonc updated: all versioned names bumped to v${major} (from semver ${semver})`,
);
