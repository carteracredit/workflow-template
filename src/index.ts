import * as jose from "jose";
import { MyWorkflow } from "./workflow";

export { MyWorkflow };

interface AuthSvcRpc {
	getJwks(): Promise<{ keys: Record<string, unknown>[] }>;
	fetch(request: Request): Promise<Response>;
}

/**
 * `WorkflowInstance.restart()` accepts an optional
 * `{ from: { name, count?, type? } }` argument in the Cloudflare Workflows
 * API (added to workerd 2026-05-07), but the `restart(): Promise<void>`
 * signature generated from this project's pinned wrangler/workerd types
 * predates that addition. The deployed edge runtime already honors the
 * option; only the local type declaration is stale, so we widen it here
 * instead of bumping wrangler (which would require Node.js 22, breaking this
 * template's Node 20 CI/deploy pipeline).
 */
interface RestartableWorkflowInstance {
	restart(options?: {
		from?: {
			name: string;
			count?: number;
			type?: "do" | "sleep" | "waitForEvent";
		};
	}): Promise<void>;
}

/**
 * Parses the optional `{ from: { name, count?, type? } }` body of a
 * `POST /:instanceId/restart` request into the options accepted by
 * `WorkflowInstance.restart()`. `type` must be passed through explicitly
 * even for steps named the same as their `step.do` counterpart — Cloudflare
 * defaults it to `"do"`, and a `step.waitForEvent` target restarted with the
 * wrong type is reported as "not found in execution history".
 *
 * Returns `undefined` when the body is missing/invalid or has no
 * `from.name`, which restarts the instance from the beginning (the
 * pre-existing behavior).
 */
export async function parseRestartOptions(request: Request): Promise<
	| {
			from: {
				name: string;
				count?: number;
				type?: "do" | "sleep" | "waitForEvent";
			};
	  }
	| undefined
> {
	const rawBody = await request
		.json<{ from?: { name?: string; count?: number; type?: string } }>()
		.catch(() => ({}));
	const from =
		rawBody && typeof rawBody === "object" && "from" in rawBody
			? (
					rawBody as {
						from?: { name?: string; count?: number; type?: string };
					}
				).from
			: undefined;
	const fromName = from?.name ? String(from.name) : undefined;
	if (!fromName) return undefined;

	const count =
		typeof from?.count === "number" && Number.isFinite(from.count)
			? from.count
			: undefined;
	const type =
		from?.type === "do" ||
		from?.type === "sleep" ||
		from?.type === "waitForEvent"
			? from.type
			: undefined;

	return {
		from: {
			name: fromName,
			...(count !== undefined ? { count } : {}),
			...(type !== undefined ? { type } : {}),
		},
	};
}

const JWKS_CACHE_TTL_MS = 3600 * 1000;
let cachedJWKS: jose.JSONWebKeySet | null = null;
let cachedJWKSExpiry = 0;

async function getJWKS(authService: AuthSvcRpc): Promise<jose.JSONWebKeySet> {
	const now = Date.now();
	if (cachedJWKS && cachedJWKSExpiry > now) return cachedJWKS;
	const result = await authService.getJwks();
	const jwks = result as jose.JSONWebKeySet;
	if (!jwks.keys?.length) throw new Error("Invalid JWKS");
	cachedJWKS = jwks;
	cachedJWKSExpiry = now + JWKS_CACHE_TTL_MS;
	return jwks;
}

function extractBearer(request: Request): string | null {
	const h = request.headers.get("Authorization");
	if (!h) return null;
	const parts = h.split(" ");
	if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;
	return parts[1];
}

async function verifyJwt(request: Request, env: Env): Promise<Response | null> {
	const token = extractBearer(request);
	if (!token) {
		console.warn(
			"[workflow-worker:auth] 401 — no Bearer token in Authorization header",
		);
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const authService = (env as { AUTH_SERVICE?: AuthSvcRpc }).AUTH_SERVICE;
	if (!authService) {
		console.error(
			"[workflow-worker:auth] 401 — AUTH_SERVICE binding is not configured",
		);
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}
	try {
		const jwks = await getJWKS(authService);
		const jwksInstance = jose.createLocalJWKSet(jwks);
		const { payload } = await jose.jwtVerify(token, jwksInstance);
		if (!payload.sub) {
			console.warn(
				"[workflow-worker:auth] 401 — token verified but payload.sub is missing",
			);
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}
		return null;
	} catch (err) {
		console.warn(
			`[workflow-worker:auth] 401 — JWT verification failed: ${err instanceof Error ? err.message : String(err)}`,
		);
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const pathSegments = url.pathname
			.replace(/^\/+|\/+$/g, "")
			.split("/")
			.filter(Boolean);

		// POST / — create instance
		if (request.method === "POST" && pathSegments.length === 0) {
			const auth = await verifyJwt(request, env);
			if (auth) return auth;
			const body = await request
				.json<Record<string, unknown>>()
				.catch(() => ({}));
			const jwt = extractBearer(request);
			const instance = await env.WORKFLOW.create({
				params: { ...body, _jwt: jwt ?? "" },
			});
			return Response.json({ instanceId: instance.id }, { status: 201 });
		}

		// /:instanceId/status | /:instanceId/send-event | /:instanceId/pause | ...
		if (pathSegments.length >= 1) {
			const auth = await verifyJwt(request, env);
			if (auth) return auth;

			const instanceId = pathSegments[0];
			const action = pathSegments[1] ?? "status";

			let instance: Awaited<ReturnType<Env["WORKFLOW"]["get"]>>;
			try {
				instance = await env.WORKFLOW.get(instanceId);
			} catch {
				return Response.json({ error: "Instance not found" }, { status: 404 });
			}

			if (request.method === "GET" && action === "status") {
				return Response.json(await instance.status());
			}

			if (request.method === "POST") {
				switch (action) {
					case "send-event": {
						const rawBody = await request
							.json<{ type: string; payload?: unknown }>()
							.catch(() => ({}));
						const type =
							rawBody && typeof rawBody === "object" && "type" in rawBody
								? String((rawBody as { type: string }).type)
								: "";
						if (!type) {
							return Response.json(
								{ error: "Missing type in body" },
								{ status: 400 },
							);
						}
						const payload =
							rawBody && typeof rawBody === "object" && "payload" in rawBody
								? ((rawBody as { payload?: unknown }).payload ?? {})
								: {};
						await instance.sendEvent({
							type,
							payload,
						});
						return Response.json({ ok: true });
					}
					case "pause":
						await instance.pause();
						return Response.json({ ok: true });
					case "resume":
						await instance.resume();
						return Response.json({ ok: true });
					case "terminate":
						await instance.terminate();
						return Response.json({ ok: true });
					case "restart": {
						const restartOptions = await parseRestartOptions(request);
						await (instance as unknown as RestartableWorkflowInstance).restart(
							restartOptions,
						);
						return Response.json({ ok: true });
					}
					default:
						return Response.json(
							{ error: `Unknown action: ${action}` },
							{ status: 400 },
						);
				}
			}
		}

		return Response.json(
			{
				error:
					"POST / to create; GET|POST /:instanceId/status|send-event|pause|resume|terminate|restart",
			},
			{ status: 400 },
		);
	},
} satisfies ExportedHandler<Env>;
