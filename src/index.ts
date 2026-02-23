import { MyWorkflow } from "./workflow";

export { MyWorkflow };

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const instanceId = url.searchParams.get("instanceId");

		if (request.method === "GET" && instanceId) {
			const instance = await env.WORKFLOW.get(instanceId);
			return Response.json(await instance.status());
		}

		if (request.method === "POST") {
			const body = await request
				.json<Record<string, unknown>>()
				.catch(() => ({}));
			const instance = await env.WORKFLOW.create({ params: body });
			return Response.json({ instanceId: instance.id }, { status: 201 });
		}

		return Response.json(
			{
				error:
					"Use POST to create an instance or GET ?instanceId=... to check status",
			},
			{ status: 400 },
		);
	},
} satisfies ExportedHandler<Env>;
