#!/usr/bin/env node
/**
 * update-wrangler-version.js
 *
 * No-op: worker names and WORKFLOW_VERSION are now managed exclusively by
 * workflow-svc, which commits the correct -vN into wrangler.jsonc before CI
 * runs.  The CI pipeline (semantic-release) deploys whatever is committed
 * without overwriting it.
 *
 * This file is intentionally kept as a no-op so that:
 *  - Existing repos that call `prepareCmd` in .releaserc.cjs continue to work.
 *  - workflow-svc propagates the neutralized version on each re-publish.
 */

const semver = process.argv[2];
if (!semver) {
	console.error("Usage: node scripts/update-wrangler-version.js <semver>");
	process.exit(1);
}

console.log(
	`wrangler.jsonc version management skipped (semver ${semver}): worker name is controlled by workflow-svc.`,
);
