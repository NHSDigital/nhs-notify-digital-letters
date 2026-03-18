/**
 * W3C TraceContext helpers for Digital Letters
 *
 * Format: 00-<trace-id:32hex>-<parent-id:16hex>-<flags:2hex>
 */

import { randomBytes } from 'node:crypto';

const TRACEPARENT_REGEX = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

function randomHex(bytes: number): string {
  return randomBytes(bytes).toString('hex');
}

/** Create a new root W3C traceparent */
export function createTraceparent(): string {
  return `00-${randomHex(16)}-${randomHex(8)}-01`;
}

/** Return a child traceparent that shares the incoming trace-id */
export function deriveChildTraceparent(incoming: string): string {
  const match = TRACEPARENT_REGEX.exec(incoming);
  if (!match) {
    throw new Error(`Invalid traceparent: "${incoming}"`);
  }
  const [, traceId, , flags] = match;
  return `00-${traceId}-${randomHex(8)}-${flags}`;
}
