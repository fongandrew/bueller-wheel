#!/usr/bin/env tsx

import { execSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
	green: '\x1b[0;32m',
	red: '\x1b[0;31m',
	yellow: '\x1b[1;33m',
	cyan: '\x1b[0;36m',
	reset: '\x1b[0m',
};

const UNIT_TESTS_DIR = path.join(__dirname, 'unit');

interface TestResult {
	name: string;
	passed: boolean;
	error?: string;
}

async function runUnitTest(testFile: string): Promise<TestResult> {
	const testPath = path.join(UNIT_TESTS_DIR, testFile);
	const testName = path.basename(testFile, '.test.ts');

	console.log(`${colors.cyan}Running unit tests: ${testName}${colors.reset}`);

	try {
		execSync(`tsx "${testPath}"`, {
			stdio: 'inherit',
			encoding: 'utf-8',
		});

		return {
			name: testName,
			passed: true,
		};
	} catch (error) {
		return {
			name: testName,
			passed: false,
			error: error instanceof Error ? error.message : 'Test failed',
		};
	}
}

async function main() {
	console.log(`${colors.yellow}===========================================${colors.reset}`);
	console.log(`${colors.yellow}Running Unit Tests${colors.reset}`);
	console.log(`${colors.yellow}===========================================${colors.reset}\n`);

	const unitTests = ['issue-reader.test.ts', 'issue-summarize.test.ts'];

	const results: TestResult[] = [];

	for (const testFile of unitTests) {
		const result = await runUnitTest(testFile);
		results.push(result);
		console.log(''); // Add spacing between test suites
	}

	// Print summary
	const total = results.length;
	const passed = results.filter((r) => r.passed).length;
	const failed = total - passed;

	console.log(`${colors.yellow}===========================================${colors.reset}`);
	console.log(`${colors.yellow}Unit Test Summary${colors.reset}`);
	console.log(`${colors.yellow}===========================================${colors.reset}`);
	console.log(`Total test suites:  ${total}`);
	console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
	console.log(`${colors.red}Failed: ${failed}${colors.reset}`);

	if (failed > 0) {
		console.log('');
		console.log(`${colors.red}Failed test suites:${colors.reset}`);
		for (const test of results.filter((r) => !r.passed)) {
			console.log(`  - ${test.name}`);
		}
		process.exit(1);
	} else {
		console.log('');
		console.log(`${colors.green}All unit tests passed!${colors.reset}`);
		process.exit(0);
	}
}

main().catch((error) => {
	console.error(`${colors.red}Error running unit tests: ${error.message}${colors.reset}`);
	process.exit(1);
});
