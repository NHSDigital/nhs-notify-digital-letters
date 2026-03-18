"""W3C TraceContext helpers for Digital Letters

Format: 00-<trace-id:32hex>-<parent-id:16hex>-<flags:2hex>
"""

import re
import secrets

_TRACEPARENT_RE = re.compile(r'^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$')


def create_traceparent() -> str:
    """Return a new root W3C traceparent (sampled)."""
    return f'00-{secrets.token_hex(16)}-{secrets.token_hex(8)}-01'


def derive_child_traceparent(incoming: str) -> str:
    """Return a child traceparent that shares the incoming trace-id."""
    match = _TRACEPARENT_RE.match(incoming)
    if not match:
        raise ValueError(f'Invalid traceparent: {incoming!r}')
    trace_id, flags = match.group(1), match.group(3)
    return f'00-{trace_id}-{secrets.token_hex(8)}-{flags}'
