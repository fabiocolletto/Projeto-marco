#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
let secret = process.env.WEBHOOK_SECRET || process.env.SECRET || '';
let bodyPath = '';

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];

  if (arg === '--secret') {
    if (i + 1 >= args.length) {
      console.error('Missing value for --secret option');
      process.exit(1);
    }

    secret = args[i + 1];
    i += 1;
    continue;
  }

  if (arg.startsWith('--secret=')) {
    secret = arg.slice('--secret='.length);
    continue;
  }

  if (arg.startsWith('-')) {
    console.error(`Unknown option: ${arg}`);
    process.exit(1);
  }

  if (!bodyPath) {
    bodyPath = arg;
    continue;
  }

  console.error('Only one body file path may be provided');
  process.exit(1);
}

if (!bodyPath) {
  console.error('A body file path is required');
  process.exit(1);
}

if (!secret) {
  console.error('A shared secret must be provided via --secret or WEBHOOK_SECRET');
  process.exit(1);
}

let body;
try {
  body = await readFile(bodyPath, 'utf8');
} catch (error) {
  console.error(`Failed to read body file: ${error.message}`);
  process.exit(1);
}

const signature = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');

console.log(`sha256=${signature}`);
