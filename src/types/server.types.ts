type XrayServerStatusType = { [key: string]: string };

export const XrayServerStatus: XrayServerStatusType = {
	passed: "PASS",
	failed: "FAIL",
	skipped: "SKIPPED",
	timedOut: "FAIL",
	interrupted: "ABORTED",
};

export interface XrayJsonImportExecution {
	testExecutionKey: string;
	info: {
		project: string;
		summary: string;
		description: string;
		user: string;
		version: string;
		revision: string;
		startDate: string;
		finishDate: string;
	};
	tests: {
		comment: string;
		finish: string;
		start: string;
		status: string;
		testInfo: {
			testType: string;
			projectKey: string;
			summary: string;
			scenarioType: string;
			scenario: string;
			definition: string;
			requirementKeys: string;
		};
		testKey: string;
		executedBy: string;
		evidences: XrayTestEvidence[];
		results: {
			name: string;
			duration: number;
			log: string;
			status: string;
		}[];
		steps: XrayTestSteps[];
	}[];
}

export interface XrayTestSteps {
	status: string;
	comment?: string;
	actualResult?: string;
	evidences?: XrayTestEvidence[];
}

export interface XrayTestEvidence {
	data: string;
	filename: string;
	contentType: string;
}

export interface UpdateTestRunCustomFieldSingle {
	id: number;
	value: string;
}

export interface UpdateTestRunCustomFieldMulti {
	id: number;
	value: string[];
}
