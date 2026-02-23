import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { MyWorkflow } from "../src/workflow";

/**
 * Template tests – kept minimal on purpose.
 *
 * Tests that create actual Workflow instances via env.WORKFLOW.create() are
 * intentionally excluded here because miniflare leaves SQLite WAL auxiliary
 * files (.sqlite-shm) behind even after the workflow completes or is
 * terminated, causing the vitest isolated-storage frame cleanup to fail.
 *
 * This is a known upstream issue tracked at:
 * https://developers.cloudflare.com/workers/testing/vitest-integration/known-issues/#isolated-storage
 *
 * When replacing this placeholder with a real workflow, add integration tests
 * in a dedicated test file that uses `isolatedStorage: false` or waits for
 * the upstream fix before exercising the Workflow binding directly.
 */

describe("MyWorkflow class", () => {
	it("has a run method", () => {
		expect(typeof MyWorkflow.prototype.run).toBe("function");
	});

	it("is named MyWorkflow", () => {
		expect(MyWorkflow.name).toBe("MyWorkflow");
	});
});

describe("Workflow Worker - HTTP routing", () => {
	it("GET / without instanceId returns 400 with error message", async () => {
		const response = await SELF.fetch("http://local.test/");
		expect(response.status).toBe(400);

		const body = await response.json<{ error: string }>();
		expect(typeof body.error).toBe("string");
		expect(body.error.length).toBeGreaterThan(0);
	});
});
