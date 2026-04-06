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
	WORKFLOW_SVC: {
		batchUpdateFlagState: (input: {
			workflowId: string;
			changes: Array<{ flagId: string; optionId: string }>;
			instanceId?: string;
		}) => Promise<{
			changes: Array<{ flagId: string; optionId: string; updated: boolean }>;
		}>;
		updateInstanceProgress: (input: {
			workflowId: string;
			instanceId: string;
			nodeId: string;
			nodeType: string;
			stepName: string;
			status: "in_progress" | "completed" | "waiting_event";
			eventType?: string;
			retryCount?: number;
		}) => Promise<{ ok: boolean }>;
	};
	WORKFLOW_ID: string;
	CASES_SVC: {
		getCaseRoleContacts: (input: { caseId: string }) => Promise<{
			roleContacts: Record<
				string,
				{ email: string; name: string | null; phone?: string | null }
			>;
		}>;
		updateCaseObject: (
			caseId: string,
			data: Record<string, unknown>,
		) => Promise<void>;
	};
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
