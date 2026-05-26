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
	PROXY_SVC: {
		nlsCreateLoan: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<{ success: boolean; raw?: unknown }>;
		nlsCancelLoan: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<{ success: boolean; raw?: unknown }>;
		nlsGetAmortization: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<{
			LoanAmount: number;
			CashFlow: string;
			totalOfPayments: number;
			regularPaymentAmount: number;
			firstPaymentApr: string;
			lastPaymentAmount: number;
			lastPaymentDate: string | null;
			OriginationDate: string;
			apr: number | null;
		}>;
		// Oleada 1 — Loan Reads
		nlsGetLoan: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<Record<string, unknown> | null>;
		nlsGetLoanDetail1: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<Record<string, unknown> | null>;
		nlsGetPaymentInfo: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<Record<string, unknown> | null>;
		nlsGetCollectionFields: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<{ items: Record<string, unknown>[] }>;
		nlsGetStatuses: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<{ items: Record<string, unknown>[] }>;
		nlsGetPaymentHistory: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<{ items: Record<string, unknown>[] }>;
		nlsGetPaymentsDue: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<{ items: Record<string, unknown>[] }>;
		nlsGetPayoffAmounts: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<{ items: Record<string, unknown>[] }>;
		nlsGetPayoffDetails: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<Record<string, unknown> | null>;
		// Oleada 2 — Loan Writes
		nlsSubmitPayment: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<Record<string, unknown> | null>;
		nlsAddCollectionComment: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<Record<string, unknown> | null>;
		nlsUpdateCollectionComment: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<Record<string, unknown> | null>;
		nlsCancelPromiseToPay: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<{ success: boolean }>;
		nlsAddCreditCard: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<Record<string, unknown> | null>;
		nlsForgetCreditCard: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<{ success: boolean }>;
		nlsGetWebPayUrl: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<{ url: string | null }>;
		nlsGetAddPaymentMethodUrl: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<{ url: string | null }>;
		nlsGetConvenienceFee: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<Record<string, unknown> | null>;
		// Oleada 3 — Contacts & Utils
		nlsGetContact: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<Record<string, unknown> | null>;
		nlsSearchContacts: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<{ items: Record<string, unknown>[]; total: number }>;
		nlsSearchLoans: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<{ items: Record<string, unknown>[]; total: number }>;
		nlsParseName: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<Record<string, unknown> | null>;
		nlsParseAddress: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<Record<string, unknown> | null>;
		nlsCalculateAmortizedPayment: (input: {
			bearerToken: string;
			body: Record<string, unknown>;
		}) => Promise<{ paymentAmount: number | null }>;
	};
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
		runPrequalification: (input: {
			userJwt: string;
			actorType: "applicant" | "coapplicant";
			userId?: string;
			data?: {
				firstName: string;
				middleName?: string;
				lastName: string;
				email: string;
				birthDate?: string;
				phoneNumber?: string;
				taxIdType?: "SSN" | "ITIN" | null;
				taxIdNumber?: string;
				addressStreetNumber: string;
				addressStreetName: string;
				addressApt?: string;
				addressCity: string;
				addressState: string;
				addressZipCode: string;
			} | null;
			caseId?: string;
			orgId?: string;
			pullType?: "soft" | "hard" | "new";
		}) => Promise<{
			runId: string;
			passes: boolean | null;
			reason?: string | null;
			scoreCardV3: number | null;
			scoreCardV4: number | null;
			errorCode?: string | null;
			requestedPullType?: "soft" | "hard" | "new";
			actualPullType?: "soft" | "hard" | "new";
			reusedSoftPull?: boolean;
			actorType: "applicant" | "coapplicant";
			cifNumber: string | null;
			preApprovalResult?: number | null;
			preApprovalDate?: string | null;
			passesValidation?: number | null;
			bureau?: {
				fico: number | null;
				scoreFactor1: string | null;
				scoreFactor2: string | null;
				scoreFactor3: string | null;
				scoreFactor4: string | null;
				bankruptcyColor: string | null;
				mortgageColor: string | null;
				adjudication: string | null;
				defaults: number | null;
				hasMortgage: boolean | null;
				hasBankruptcy: boolean | null;
			} | null;
		}>;
		findPrequalificationMatches: (
			matchData: Record<string, string | undefined>,
		) => Promise<{
			matches: Array<Record<string, unknown>>;
		}>;
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
