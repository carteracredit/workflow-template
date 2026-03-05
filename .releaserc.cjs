/**
 * semantic-release configuration
 *
 * - main: stable releases (e.g. 1.0.0, 2.0.0)
 * - dev: prerelease channel "rc" (e.g. 1.0.0-rc.1, 2.0.0-rc.1)
 *
 * On major version bumps (feat!: commits), the prepareCmd updates
 * wrangler.jsonc so the Worker is deployed under a new versioned name
 * (e.g. my-workflow-dev-v2), keeping prior versions running in parallel
 * for in-flight workflow instances.
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
				assets: [
					"CHANGELOG.md",
					"package.json",
					"pnpm-lock.yaml",
					"wrangler.jsonc",
				],
				message:
					"chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
			},
		],
	],
};
