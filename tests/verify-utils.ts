import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';

/**
 * Utility functions for test verification scripts
 */

export const BUELLER_OUTPUT_FILE = 'bueller.output.txt';

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

	// Check if any run flag is already in additionalArgs
	const hasRunFlag = additionalArgs.some((arg) =>
		['--run', '--git', '--continue', '--max'].includes(arg),
	);

	const args = [
		'./index.js',
		// Only add --run if no other run flag is present
		...(hasRunFlag ? [] : ['--run']),
		'--issues-dir',
		issuesDir,
		'--max',
		String(maxIterations),
		...additionalArgs,
	];

	return new Promise((resolve) => {
		const output: string[] = [];

		const child = spawn('node', args, {
			cwd: process.cwd(),
			stdio: ['ignore', 'pipe', 'pipe'], // stdin: ignore, stdout: pipe, stderr: pipe
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

		child.on('close', async (code) => {
			clearTimeout(timeout);
			const fullOutput = output.join('');
			// Save output for debugging, include timeout status
			const outputWithStatus = timedOut
				? `[TIMED OUT after ${timeoutMs}ms]\n\n${fullOutput}`
				: fullOutput;
			await fs.writeFile(BUELLER_OUTPUT_FILE, outputWithStatus);
			resolve({
				exitCode: code ?? 1,
				output: fullOutput,
				timedOut,
			});
		});

		child.on('error', async (error) => {
			clearTimeout(timeout);
			const errorOutput = `Error: ${error.message}`;
			await fs.writeFile(BUELLER_OUTPUT_FILE, errorOutput);
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
export async function assertFileExists(filePath: string, message?: string): Promise<void> {
	try {
		await fs.access(filePath);
	} catch {
		throw new VerificationError(message || `FAIL: File does not exist: ${filePath}`);
	}
}

/**
 * Assert that a file does not exist
 */
export async function assertFileNotExists(filePath: string, message?: string): Promise<void> {
	try {
		await fs.access(filePath);
		throw new VerificationError(message || `FAIL: File should not exist: ${filePath}`);
	} catch (error) {
		// File doesn't exist, which is what we want
		if (error instanceof VerificationError) {
			throw error;
		}
	}
}

/**
 * Assert that a file contains a string
 */
export async function assertFileContains(
	filePath: string,
	search: string,
	message?: string,
): Promise<void> {
	await assertFileExists(filePath);
	const content = await fs.readFile(filePath, 'utf-8');
	if (!content.includes(search)) {
		throw new VerificationError(
			message || `FAIL: File ${filePath} does not contain '${search}'`,
		);
	}
}

/**
 * Assert that a file matches a regex pattern
 */
export async function assertFileMatches(
	filePath: string,
	pattern: RegExp,
	message?: string,
): Promise<void> {
	await assertFileExists(filePath);
	const content = await fs.readFile(filePath, 'utf-8');
	if (!pattern.test(content)) {
		throw new VerificationError(
			message || `FAIL: File ${filePath} does not match pattern ${pattern}`,
		);
	}
}

/**
 * Count occurrences of a string in a file
 */
export async function countInFile(filePath: string, search: string): Promise<number> {
	await assertFileExists(filePath);
	const content = await fs.readFile(filePath, 'utf-8');
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
