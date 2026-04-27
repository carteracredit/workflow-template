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
		createSignatureRequest: (input: {
			caseId: string;
			workflowInstanceId?: string;
			workflowNodeId?: string;
			nodeConfig: {
				templateId: string;
				flow: "embedded" | "email_only" | "email_and_sms";
				title?: string;
				subject?: string;
				message?: string;
				testMode?: boolean;
				smsAuthentication?: boolean;
				ccEmailAddresses?: string[];
				signers: Array<{
					role: string;
					source: "case_role" | "variable";
					caseRole?: "client" | "seller" | "credit_agent" | "org_manager";
					email?: string;
					name?: string;
					smsPhoneNumber?: string;
				}>;
				customFields: Array<{
					apiId: string;
					name: string;
					value: string;
				}>;
			};
		}) => Promise<{
			signatureRequestId: string;
			status: string;
			flow: string;
		}>;
		getSignatureRequestStatus: (input: {
			signatureRequestId: string;
		}) => Promise<{
			id: string;
			caseId: string;
			signatureRequestId: string;
			templateId: string;
			flow: string;
			status: string;
			signers: Array<{
				role: string;
				name: string;
				email: string;
				signatureId?: string;
				status: string;
				signedAt?: string | null;
			}>;
			customFields: unknown[];
			lastEventType: string | null;
			lastEventAt: string | null;
			signedPdfDocumentId: string | null;
			workflowInstanceId: string | null;
			workflowNodeId: string | null;
			createdAt: string;
			updatedAt: string;
		} | null>;
	};
}

interface WorkflowPromotionSnapshot {
	name: string;
	contractorFee: number;
	interestRate: number;
	maxTermMonths: number;
	maxAmount: number;
	minDownPayment: number;
	statutoryRate: number;
	secondaryRate: number;
	loanTemplateNumber: number;
	loanPortfolioName: string;
	template: string;
}

interface WorkflowParams {
	promotion?: WorkflowPromotionSnapshot | null;
	selectedTerm?: number | null;
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
