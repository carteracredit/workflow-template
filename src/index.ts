import * as jose from "jose";
import { MyWorkflow } from "./workflow";

export { MyWorkflow };

const JWKS_CACHE_TTL_MS = 3600 * 1000;
let cachedJWKS: jose.JSONWebKeySet | null = null;
let cachedJWKSExpiry = 0;

async function getJWKS(authService: Fetcher): Promise<jose.JSONWebKeySet> {
	const now = Date.now();
	if (cachedJWKS && cachedJWKSExpiry > now) return cachedJWKS;
	const res = await authService.fetch(
		new Request("http://internal/api/auth/jwks", {
			headers: { Accept: "application/json" },
		}),
	);
	if (!res.ok) {
		throw new Error(`JWKS fetch failed: ${res.status}`);
	}
	const jwks = (await res.json()) as jose.JSONWebKeySet;
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
	const authService = (env as { AUTH_SERVICE?: Fetcher }).AUTH_SERVICE;
	if (!authService)
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	const token = extractBearer(request);
	if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
	try {
		const jwks = await getJWKS(authService);
		const jwksInstance = jose.createLocalJWKSet(jwks);
		const { payload } = await jose.jwtVerify(token, jwksInstance);
		if (!payload.sub)
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		return null;
	} catch {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const pathSegments = url.pathname.replace(/^\/+|\/+$/g, "").split("/");

		// POST / — create instance
		if (request.method === "POST" && pathSegments.length === 0) {
			const auth = await verifyJwt(request, env);
			if (auth) return auth;
			const body = await request
				.json<Record<string, unknown>>()
				.catch(() => ({}));
			const instance = await env.WORKFLOW.create({ params: body });
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
					case "restart":
						await instance.restart();
						return Response.json({ ok: true });
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
