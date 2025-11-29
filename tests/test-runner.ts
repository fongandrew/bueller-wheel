#!/usr/bin/env tsx

import { execSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BUELLER_OUTPUT_FILE } from './verify-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for output
const colors = {
	red: '\x1b[0;31m',
	green: '\x1b[0;32m',
	yellow: '\x1b[1;33m',
	reset: '\x1b[0m',
};

interface TestResult {
	name: string;
	passed: boolean;
	error?: string;
}

const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const SPECS_DIR = path.join(SCRIPT_DIR, 'specs');
const TEMP_BASE = path.join(PROJECT_ROOT, '.test-tmp');

async function buildProject(): Promise<void> {
	console.log('Building bueller...');
	try {
		execSync('pnpm run build', {
			cwd: PROJECT_ROOT,
			stdio: 'inherit',
		});
	} catch (error) {
		console.error(`${colors.red}FAIL: Build failed${colors.reset}`);
		console.error(error);
		process.exit(1);
	}

	const buelerPath = path.join(PROJECT_ROOT, 'dist', 'bueller.js');
	try {
		await fs.access(buelerPath);
	} catch {
		console.error(`${colors.red}FAIL: Build did not produce dist/bueller.js${colors.reset}`);
		process.exit(1);
	}

	console.log(`${colors.green}Build successful${colors.reset}\n`);
}

async function copyDirectory(src: string, dest: string): Promise<void> {
	await fs.mkdir(dest, { recursive: true });

	const entries = await fs.readdir(src, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);

		if (entry.isDirectory()) {
			await copyDirectory(srcPath, destPath);
		} else {
			await fs.copyFile(srcPath, destPath);
		}
	}
}

async function runTest(testName: string): Promise<TestResult> {
	const testDir = path.join(SPECS_DIR, testName);

	try {
		await fs.access(testDir);
	} catch {
		return {
			name: testName,
			passed: false,
			error: `Test directory not found: ${testDir}`,
		};
	}

	const runScript = path.join(testDir, 'run.ts');
	try {
		await fs.access(runScript);
	} catch {
		return {
			name: testName,
			passed: false,
			error: `run.ts not found in ${testDir}`,
		};
	}

	console.log(`${colors.yellow}Running test: ${testName}${colors.reset}`);

	// Create temp directory for this test
	const testTemp = path.join(TEMP_BASE, testName);
	try {
		await fs.access(testTemp);
		await fs.rm(testTemp, { recursive: true, force: true });
	} catch {
		// Directory doesn't exist, no need to remove
	}
	await fs.mkdir(testTemp, { recursive: true });

	// Copy the built script
	await fs.copyFile(
		path.join(PROJECT_ROOT, 'dist', 'bueller.js'),
		path.join(testTemp, 'bueller.js'),
	);

	// Copy the test issues directory
	const issuesDir = path.join(testDir, 'issues');
	try {
		await fs.access(issuesDir);
	} catch {
		return {
			name: testName,
			passed: false,
			error: `issues directory not found in ${testDir}`,
		};
	}

	await copyDirectory(issuesDir, path.join(testTemp, 'issues'));

	// Run the test script (which will run Bueller and verify results)
	try {
		execSync(`tsx "${runScript}"`, {
			cwd: testTemp,
			stdio: 'pipe',
			encoding: 'utf-8',
		});

		console.log(`${colors.green}PASS: ${testName}${colors.reset}\n`);
		return {
			name: testName,
			passed: true,
		};
	} catch (error) {
		const outputFile = path.join(testTemp, BUELLER_OUTPUT_FILE);
		console.log(`${colors.red}FAIL: ${testName}${colors.reset}`);

		// Collect error details
		let errorOutput = '';
		if (error instanceof Error) {
			// Extract the actual error message from stderr
			const stderr = (error as any).stderr?.toString() || '';
			const stdout = (error as any).stdout?.toString() || '';

			if (stderr) {
				console.log(`${colors.red}Error output:${colors.reset}`);
				console.log(stderr);
				errorOutput += `Error output:\n${stderr}\n\n`;
			}
			if (stdout) {
				console.log(`${colors.yellow}Standard output:${colors.reset}`);
				console.log(stdout);
				errorOutput += `Standard output:\n${stdout}\n\n`;
			}
			if (!stderr && !stdout && error.message) {
				console.log(`${colors.red}Error: ${error.message}${colors.reset}`);
				errorOutput += `Error: ${error.message}\n\n`;
			}
		}

		// Write error details to output file
		if (errorOutput) {
			try {
				const existingContent = await fs.readFile(outputFile, 'utf-8').catch(() => '');
				const separator = existingContent ? '\n\n=== Test Runner Error ===\n\n' : '';
				await fs.writeFile(outputFile, existingContent + separator + errorOutput);
			} catch (_writeError) {
				console.log(
					`${colors.yellow}Warning: Could not write error to output file${colors.reset}`,
				);
			}
		}

		try {
			await fs.access(outputFile);
			console.log(`Bueller output saved to: ${outputFile}`);
		} catch {
			// Output file doesn't exist
		}
		console.log('');

		return {
			name: testName,
			passed: false,
			error: error instanceof Error ? error.message : 'Test failed',
		};
	}
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const specificTest = args[0];

	// Build the project
	await buildProject();

	// Clean up old test runs
	try {
		await fs.access(TEMP_BASE);
		await fs.rm(TEMP_BASE, { recursive: true, force: true });
	} catch {
		// Directory doesn't exist, no need to remove
	}
	await fs.mkdir(TEMP_BASE, { recursive: true });

	// Track results
	const results: TestResult[] = [];

	if (specificTest) {
		// Run specific test
		const result = await runTest(specificTest);
		results.push(result);
	} else {
		// Run all tests
		console.log(`Discovering tests in ${SPECS_DIR}...`);

		try {
			await fs.access(SPECS_DIR);
		} catch {
			console.error(
				`${colors.red}ERROR: Specs directory not found: ${SPECS_DIR}${colors.reset}`,
			);
			process.exit(1);
		}

		const entries = await fs.readdir(SPECS_DIR, { withFileTypes: true });
		const testDirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

		if (testDirs.length === 0) {
			console.log(
				`${colors.yellow}WARNING: No test specs found in ${SPECS_DIR}${colors.reset}`,
			);
			console.log('Create test specs to get started. See tests/README.md for details.');
			process.exit(0);
		}

		for (const testName of testDirs) {
			const result = await runTest(testName);
			results.push(result);
		}
	}

	// Print summary
	const total = results.length;
	const passed = results.filter((r) => r.passed).length;
	const failed = total - passed;
	const failedTests = results.filter((r) => !r.passed);

	console.log('================================');
	console.log('Test Results');
	console.log('================================');
	console.log(`Total:  ${total}`);
	console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
	console.log(`${colors.red}Failed: ${failed}${colors.reset}`);

	if (failed > 0) {
		console.log('');
		console.log('Failed tests:');
		for (const test of failedTests) {
			console.log(`  - ${test.name}`);
		}
		console.log('');
		console.log(`Test artifacts preserved in: ${TEMP_BASE}`);
		process.exit(1);
	} else {
		console.log('');
		console.log(`${colors.green}All tests passed!${colors.reset}`);
		process.exit(0);
	}
}

main().catch((error) => {
	console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
	process.exit(1);
});
