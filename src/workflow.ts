import {
	WorkflowEntrypoint,
	WorkflowEvent,
	WorkflowStep,
} from "cloudflare:workers";

/**
 * MyWorkflow
 *
 * Placeholder workflow generated from the workflow editor.
 * This file is replaced when a workflow is published for the first time.
 *
 * Version: 1.0.0
 */

interface WorkflowEnv {
	FORMS?: unknown;
	NOTIFICATIONS?: unknown;
	FLAGS?: unknown;
	AI?: unknown;
}

interface WorkflowParams {
	[key: string]: unknown;
}

export class MyWorkflow extends WorkflowEntrypoint<
	WorkflowEnv,
	WorkflowParams
> {
	async run(
		event: WorkflowEvent<WorkflowParams>,
		step: WorkflowStep,
	): Promise<unknown> {
		// Workflow started

		await step.do("initialize", async () => {
			return { initialized: true };
		});

		// Workflow completed successfully
		return { success: true, instanceId: event.instanceId };
	}
}
