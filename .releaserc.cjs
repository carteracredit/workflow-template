/**
 * semantic-release configuration
 *
 * - main: stable releases (e.g. 1.0.0, 2.0.0)
 * - dev: prerelease channel "rc" (e.g. 1.0.0-rc.1, 2.0.0-rc.1)
 *
 * Worker names and WORKFLOW_VERSION are managed by workflow-svc, which commits
 * the correct -vN into wrangler.jsonc before CI runs.  The prepareCmd is kept
 * as a no-op for compatibility with existing repos.  wrangler.jsonc is NOT
 * listed in the git assets so CI never overwrites what workflow-svc committed.
 */
module.exports = {
	branches: [
		"main",
		{
			name: "dev",
			channel: "rc",
			prerelease: "rc",
		},
	],
	tagFormat: "v${version}",
	plugins: [
		"@semantic-release/commit-analyzer",
		"@semantic-release/release-notes-generator",
		[
			"@semantic-release/changelog",
			{
				changelogFile: "CHANGELOG.md",
			},
		],
		[
			"@semantic-release/npm",
			{
				npmPublish: false,
			},
		],
		[
			"@semantic-release/exec",
			{
				prepareCmd:
					"node scripts/update-wrangler-version.js ${nextRelease.version}",
				publishCmd: "echo ${nextRelease.version} > .release-version",
			},
		],
		"@semantic-release/github",
		[
			"@semantic-release/git",
			{
				assets: ["CHANGELOG.md", "package.json", "pnpm-lock.yaml"],
				message:
					"chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
			},
		],
	],
};
