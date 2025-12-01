import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';

import { BUELLER_OUTPUT_FILE, pass } from '../../verify-utils.js';

/**
 * Test that bueller exits early with help text when given unrecognized flags
 */

async function runBuellerWithFlag(flag: string): Promise<{
	exitCode: number;
	output: string;
}> {
	const args = ['./index.js', 'run', flag];

	return new Promise((resolve) => {
		const output: string[] = [];

		const child = spawn('node', args, {
			cwd: process.cwd(),
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		// Add a timeout in case it hangs
		const timeout = setTimeout(() => {
			child.kill('SIGTERM');
			throw new Error('FAIL: Command timed out (should exit immediately)');
		}, 5000);

		child.stdout?.on('data', (data) => {
			output.push(data.toString());
		});

		child.stderr?.on('data', (data) => {
			output.push(data.toString());
		});

		child.on('close', async (code) => {
			clearTimeout(timeout);
			const fullOutput = output.join('');
			await fs.writeFile(BUELLER_OUTPUT_FILE, fullOutput);
			resolve({
				exitCode: code ?? 1,
				output: fullOutput,
			});
		});

		child.on('error', async (error) => {
			clearTimeout(timeout);
			const errorOutput = `Error: ${error.message}`;
			await fs.writeFile(BUELLER_OUTPUT_FILE, errorOutput);
			resolve({
				exitCode: 1,
				output: errorOutput,
			});
		});
	});
}

// Test 1: Run with --foobar flag
const result = await runBuellerWithFlag('--foobar');

// Should exit with error code
if (result.exitCode === 0) {
	throw new Error(
		`FAIL: Expected non-zero exit code when given unrecognized flag, got ${result.exitCode}`,
	);
}

// Output should contain error about unrecognized flag
if (!result.output.includes('Unrecognized flag')) {
	throw new Error('FAIL: Output should contain "Unrecognized flag" error message');
}

// Output should contain the flag name
if (!result.output.includes('--foobar')) {
	throw new Error('FAIL: Output should mention the unrecognized flag "--foobar"');
}

// Output should contain help text (check for "Usage:" which is in the help text)
if (!result.output.includes('Usage:')) {
	throw new Error('FAIL: Output should contain help text (Usage:)');
}

// Test 2: Also test with a different unrecognized flag to ensure it's general
const result2 = await runBuellerWithFlag('--invalid-option');

if (result2.exitCode === 0) {
	throw new Error(
		`FAIL: Expected non-zero exit code for --invalid-option, got ${result2.exitCode}`,
	);
}

if (!result2.output.includes('Unrecognized flag')) {
	throw new Error('FAIL: Output should contain "Unrecognized flag" for --invalid-option');
}

if (!result2.output.includes('--invalid-option')) {
	throw new Error('FAIL: Output should mention the unrecognized flag "--invalid-option"');
}

// Test 3: Verify that --help works without a command and exits with 0
const helpResult = await new Promise<{ exitCode: number; output: string }>((resolve) => {
	const output: string[] = [];
	const child = spawn('node', ['./index.js', '--help'], {
		cwd: process.cwd(),
		stdio: ['ignore', 'pipe', 'pipe'],
	});

	const timeout = setTimeout(() => {
		child.kill('SIGTERM');
		throw new Error('FAIL: --help command timed out');
	}, 5000);

	child.stdout?.on('data', (data) => {
		output.push(data.toString());
	});

	child.stderr?.on('data', (data) => {
		output.push(data.toString());
	});

	child.on('close', async (code) => {
		clearTimeout(timeout);
		const fullOutput = output.join('');
		await fs.writeFile(BUELLER_OUTPUT_FILE, fullOutput);
		resolve({
			exitCode: code ?? 1,
			output: fullOutput,
		});
	});
});

if (helpResult.exitCode !== 0) {
	throw new Error(`FAIL: --help should exit with code 0, got ${helpResult.exitCode}`);
}

if (!helpResult.output.includes('Usage:')) {
	throw new Error('FAIL: --help output should contain help text');
}

pass('Unrecognized flags properly rejected and help text displayed');
