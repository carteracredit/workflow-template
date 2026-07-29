#!/usr/bin/env node
/**
 * confirm-deployment.mjs
 *
 * Calls POST /deployment-confirm on the freshly deployed worker so it can
 * report itself to workflow-svc via RPC.  The worker reads its own env vars
 * (WORKFLOW_ID, WORKFLOW_VERSION, ENVIRONMENT) and calls
 * WORKFLOW_SVC.confirmWorkflowDeployment(), which transitions the D1 row from
 * `deploying` → `active`.
 *
 * Retries up to MAX_ATTEMPTS times with exponential back-off because
 * Cloudflare Workers can take a few seconds to become reachable after deploy.
 *
 * Usage (called automatically by deploy:prod / deploy:dev scripts):
 *   node scripts/confirm-deployment.mjs production
 *   node scripts/confirm-deployment.mjs development
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const WRANGLER_PATH = join(ROOT, "wrangler.jsonc");

const MAX_ATTEMPTS = 6;
const INITIAL_DELAY_MS = 3000;

function parseWrangler() {
	const raw = readFileSync(WRANGLER_PATH, "utf8");
	// Strip JSONC comments and trailing commas so JSON.parse works.
	const sanitized = raw
		.replace(/\/\/[^\n]*/g, "")
		.replace(/,(\s*[}\]])/g, "$1");
	return JSON.parse(sanitized);
}

function resolveWorkerUrl(config, environment) {
	if (environment === "production") {
		const prodEnv = config.env?.production ?? {};
		// Prefer custom domain route; fall back to workers.dev subdomain.
		const route = Array.isArray(prodEnv.routes) && prodEnv.routes[0];
		if (route?.pattern) {
			return `https://${route.pattern}`;
		}
		const name = prodEnv.name ?? config.name;
		return `https://${name}.cartera.credit`;
	}
	// Development: use workers.dev
	const name = config.name;
	return `https://${name}.carteracredit.workers.dev`;
}

async function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function confirmWithRetry(workerUrl) {
	const url = `${workerUrl}/deployment-confirm`;
	let delay = INITIAL_DELAY_MS;

	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		try {
			console.log(
				`[confirm-deployment] Attempt ${attempt}/${MAX_ATTEMPTS}: POST ${url}`,
			);
			const res = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				signal: AbortSignal.timeout(10_000),
			});
			const body = await res.json().catch(() => ({}));
			if (res.ok) {
				console.log(
					`[confirm-deployment] Success (${res.status}):`,
					JSON.stringify(body),
				);
				return;
			}
			// A 4xx/5xx from the worker itself is meaningful — log and retry.
			console.warn(
				`[confirm-deployment] Worker responded ${res.status}:`,
				JSON.stringify(body),
			);
		} catch (err) {
			console.warn(
				`[confirm-deployment] Network error on attempt ${attempt}: ${err.message}`,
			);
		}

		if (attempt < MAX_ATTEMPTS) {
			console.log(`[confirm-deployment] Retrying in ${delay}ms…`);
			await sleep(delay);
			delay = Math.min(delay * 2, 30_000);
		}
	}

	// Non-fatal: log clearly but don't fail the deploy.  The deployment is
	// live; the only consequence is the D1 row stays `deploying` until the
	// next confirm (e.g. the next publish re-publish triggers a new attempt).
	console.error(
		`[confirm-deployment] All ${MAX_ATTEMPTS} attempts failed. The worker is deployed but D1 status may remain 'deploying'. Re-publish the workflow to retry confirmation.`,
	);
}

async function main() {
	const environment = process.argv[2] ?? "development";
	if (environment !== "production" && environment !== "development") {
		console.error(
			`[confirm-deployment] Unknown environment: ${environment}. Expected 'production' or 'development'.`,
		);
		process.exit(1);
	}

	let config;
	try {
		config = parseWrangler();
	} catch (err) {
		console.error(
			`[confirm-deployment] Failed to parse wrangler.jsonc: ${err.message}`,
		);
		process.exit(1);
	}

	const workerUrl = resolveWorkerUrl(config, environment);
	console.log(
		`[confirm-deployment] Confirming deployment at ${workerUrl} (${environment})`,
	);

	await confirmWithRetry(workerUrl);
}

main();
