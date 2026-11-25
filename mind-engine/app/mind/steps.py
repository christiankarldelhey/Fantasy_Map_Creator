# ============================================================================
# @step — a named step of the mind, for the mind-map (docs/mind-map/)
# ----------------------------------------------------------------------------
# Inert decoration: the wrapper adds one identity call frame and nothing
# else unless a trace buffer is installed — by scripts/mind_map.py during
# `mind_map.py --update`, or by the test suite with MIND_TRACE_TESTS=1.
# Each traced call records {term, fn, in, out} so the map shows the data
# the step actually transformed, never a hand-written example.
#
# `term` must be a glossary heading in CONTEXT.md — `mind_map.py --check`
# fails otherwise. Keeping the vocabulary closed is the point: a step that
# cannot name what it is in the domain's own words is plumbing, not a step.
# ============================================================================
import functools
from contextlib import contextmanager
from contextvars import ContextVar

_trace_buffer = ContextVar('mind_step_trace', default=None)
_trace_test = ContextVar('mind_step_test', default=None)
_trace_depth = ContextVar('mind_step_depth', default=0)


def _summarize_value(v, depth=0):
    """JSON-safe, small: every traced value is an example a human will read."""
    if v is None or isinstance(v, (bool, int, float)):
        return v
    if isinstance(v, str):
        return v if len(v) <= 160 else v[:160] + '…'
    if depth >= 3:
        return '…'
    if isinstance(v, (list, tuple)):
        out = [_summarize_value(x, depth + 1) for x in v[:3]]
        if len(v) > 3:
            out.append(f'… {len(v) - 3} more')
        return out
    if isinstance(v, dict):
        return {
            k: _summarize_value(x, depth + 1)
            for k, x in list(v.items())[:12]
        }
    if hasattr(v, '__table__'):
        # An ORM row: show its shape — scalar columns inline, the rest as '…'
        out = {}
        for c in list(v.__table__.columns)[:10]:
            val = getattr(v, c.name, None)
            out[c.name] = (
                val if isinstance(val, (str, int, float, bool, type(None)))
                and (not isinstance(val, str) or len(val) <= 80)
                else '…')
        return out
    # Sessions, engines, anything else: name the class, never serialize.
    return f'<{type(v).__name__}>'


def _summarize_call(args, kwargs, fn=None):
    shown = []
    names = []
    if fn is not None:
        import inspect
        try:
            names = list(inspect.signature(fn).parameters)
        except (TypeError, ValueError):
            names = []
    for i, a in enumerate(args):
        if type(a).__name__ in ('Session', 'Mind'):
            continue
        label = names[i] if i < len(names) else f'arg{i}'
        shown.append({label: _summarize_value(a)})
    shown.extend(
        {k: _summarize_value(v)} for k, v in kwargs.items()
        if type(v).__name__ not in ('Session', 'Mind')
    )
    return shown[:8]


def step(term):
    """Mark a domain function as a named step of the mind."""
    def decorate(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            buf = _trace_buffer.get()
            if buf is None:
                return fn(*args, **kwargs)
            depth = _trace_depth.get()
            token = _trace_depth.set(depth + 1)
            try:
                out = fn(*args, **kwargs)
            finally:
                _trace_depth.reset(token)
            buf.append({
                'term': term,
                'fn': f'{fn.__module__}.{fn.__name__}',
                'in': _summarize_call(args, kwargs, fn),
                'out': _summarize_value(out),
                'test': _trace_test.get(),
                'depth': depth,
            })
            return out
        wrapper._mind_step = term
        return wrapper
    return decorate


@contextmanager
def trace_recording(buffer=None):
    """Install a trace buffer; every @step call inside appends to it."""
    buf = buffer if buffer is not None else []
    token = _trace_buffer.set(buf)
    try:
        yield buf
    finally:
        _trace_buffer.reset(token)


@contextmanager
def trace_test_name(name):
    """Tag traced calls with the test that produced them."""
    token = _trace_test.set(name)
    try:
        yield
    finally:
        _trace_test.reset(token)


def step_term(fn):
    """The term a function was annotated with, or None."""
    return getattr(fn, '_mind_step', None)
