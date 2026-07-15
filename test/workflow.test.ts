import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { parseRestartOptions } from "../src/index";
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

describe("parseRestartOptions", () => {
	it("returns undefined when the body is empty (restart from the beginning)", async () => {
		const request = new Request("http://local.test/x/restart", {
			method: "POST",
		});
		await expect(parseRestartOptions(request)).resolves.toBeUndefined();
	});

	it("returns undefined when the body has no from.name", async () => {
		const request = new Request("http://local.test/x/restart", {
			method: "POST",
			body: JSON.stringify({}),
			headers: { "Content-Type": "application/json" },
		});
		await expect(parseRestartOptions(request)).resolves.toBeUndefined();
	});

	it("returns undefined when the body is not valid JSON", async () => {
		const request = new Request("http://local.test/x/restart", {
			method: "POST",
			body: "not-json",
			headers: { "Content-Type": "application/json" },
		});
		await expect(parseRestartOptions(request)).resolves.toBeUndefined();
	});

	it("returns { from: { name } } when the body has from.name", async () => {
		const request = new Request("http://local.test/x/restart", {
			method: "POST",
			body: JSON.stringify({ from: { name: "test-de-checkpoint" } }),
			headers: { "Content-Type": "application/json" },
		});
		await expect(parseRestartOptions(request)).resolves.toEqual({
			from: { name: "test-de-checkpoint" },
		});
	});

	it("coerces a non-string from.name to a string", async () => {
		const request = new Request("http://local.test/x/restart", {
			method: "POST",
			body: JSON.stringify({ from: { name: 42 } }),
			headers: { "Content-Type": "application/json" },
		});
		await expect(parseRestartOptions(request)).resolves.toEqual({
			from: { name: "42" },
		});
	});
});
