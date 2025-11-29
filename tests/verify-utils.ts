import { spawn } from 'node:child_process';
import * as fs from 'node:fs';

/**
 * Utility functions for test verification scripts
 */

export class VerificationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'VerificationError';
	}
}

/**
 * Options for running Bueller
 */
export interface RunBuellerOptions {
	issuesDir?: string;
	maxIterations?: number;
	timeoutMs?: number;
	additionalArgs?: string[];
}

/**
 * Run Bueller with the given options
 */
export async function runBueller(options: RunBuellerOptions = {}): Promise<{
	exitCode: number;
	output: string;
	timedOut: boolean;
}> {
	const {
		issuesDir = './issues',
		maxIterations = 10,
		timeoutMs = 60000,
		additionalArgs = [],
	} = options;

	const args = ['../bueller.js', '--issues-dir', issuesDir, '--max-iterations', String(maxIterations), ...additionalArgs];

	return new Promise((resolve) => {
		const output: string[] = [];

		const child = spawn('node', args, {
			cwd: process.cwd(),
			stdio: 'pipe',
		});

		let timedOut = false;
		const timeout = setTimeout(() => {
			timedOut = true;
			child.kill('SIGTERM');
		}, timeoutMs);

		child.stdout?.on('data', (data) => {
			output.push(data.toString());
		});

		child.stderr?.on('data', (data) => {
			output.push(data.toString());
		});

		child.on('close', (code) => {
			clearTimeout(timeout);
			const fullOutput = output.join('');
			// Save output for debugging
			fs.writeFileSync('bueller.output.txt', fullOutput);
			resolve({
				exitCode: code ?? 1,
				output: fullOutput,
				timedOut,
			});
		});

		child.on('error', (error) => {
			clearTimeout(timeout);
			const errorOutput = `Error: ${error.message}`;
			fs.writeFileSync('bueller.output.txt', errorOutput);
			resolve({
				exitCode: 1,
				output: errorOutput,
				timedOut: false,
			});
		});
	});
}

/**
 * Assert that a file exists
 */
export function assertFileExists(filePath: string, message?: string): void {
	if (!fs.existsSync(filePath)) {
		throw new VerificationError(message || `FAIL: File does not exist: ${filePath}`);
	}
}

/**
 * Assert that a file does not exist
 */
export function assertFileNotExists(filePath: string, message?: string): void {
	if (fs.existsSync(filePath)) {
		throw new VerificationError(message || `FAIL: File should not exist: ${filePath}`);
	}
}

/**
 * Assert that a file contains a string
 */
export function assertFileContains(filePath: string, search: string, message?: string): void {
	assertFileExists(filePath);
	const content = fs.readFileSync(filePath, 'utf-8');
	if (!content.includes(search)) {
		throw new VerificationError(
			message || `FAIL: File ${filePath} does not contain '${search}'`,
		);
	}
}

/**
 * Assert that a file matches a regex pattern
 */
export function assertFileMatches(filePath: string, pattern: RegExp, message?: string): void {
	assertFileExists(filePath);
	const content = fs.readFileSync(filePath, 'utf-8');
	if (!pattern.test(content)) {
		throw new VerificationError(
			message || `FAIL: File ${filePath} does not match pattern ${pattern}`,
		);
	}
}

/**
 * Count occurrences of a string in a file
 */
export function countInFile(filePath: string, search: string): number {
	assertFileExists(filePath);
	const content = fs.readFileSync(filePath, 'utf-8');
	const matches = content.match(new RegExp(search, 'g'));
	return matches ? matches.length : 0;
}

/**
 * Assert that a count matches an expected value
 */
export function assertCount(actual: number, expected: number, message?: string): void {
	if (actual !== expected) {
		throw new VerificationError(message || `FAIL: Expected ${expected}, got ${actual}`);
	}
}

/**
 * Assert that a count is at least a minimum value
 */
export function assertCountAtLeast(actual: number, minimum: number, message?: string): void {
	if (actual < minimum) {
		throw new VerificationError(message || `FAIL: Expected at least ${minimum}, got ${actual}`);
	}
}

/**
 * Success message
 */
export function pass(message: string): void {
	console.log(`PASS: ${message}`);
	process.exit(0);
}
