# ============================================================================
# Pack versioning (B10) — PRD §9.2: edits must not break production
# ----------------------------------------------------------------------------
# The live pack is the rows under `game_id` (what the resolver reads). A
# draft is a full copy under the namespace `<game_id>@draft-<version>` —
# a real game_id, so the admin CRUD and the NL tester work on it as-is.
#
#   clone_pack   — live → new draft namespace + PackVersion(status='draft')
#   promote_pack — live → archived snapshot; draft's rows replace live
#                  atomically; draft becomes the active version
#
# Every archived/active row keeps a frozen `snapshot` of the live content
# at archive/promote time — the rollback record. Episode config_snapshot
# records the active version at open, so a replay knows which pack it ran.
# ============================================================================
import logging
from datetime import datetime, timezone

from sqlalchemy import func

from app.mind.tables import (
    CompositeRule, Facet, NlBand, NlPhraseList, NlThreshold, PackVersion,
)

log = logging.getLogger(__name__)

# The pack tables, with the columns carried between namespaces.
PACK_TABLES = {
    'nl_bands': (NlBand, ['table_name', 'ordinal', 'below', 'phrase', 'meta']),
    'nl_thresholds': (NlThreshold, ['key', 'value']),
    'nl_phrase_lists': (NlPhraseList, ['key', 'ordinal', 'phrase']),
    'facets': (Facet, ['event_type', 'field_path', 'unit', 'description']),
    'composite_rules': (
        CompositeRule,
        ['key', 'need_type', 'event_type', 'streak_days', 'urgency_base',
         'urgency_per_day', 'conditions', 'description'],
    ),
}


def _now():
    return datetime.now(timezone.utc)


def _snapshot(session, namespace):
    """Frozen dump of every pack row under a namespace."""
    content = {}
    for table_name, (model, cols) in PACK_TABLES.items():
        rows = session.query(model).filter_by(game_id=namespace).all()
        content[table_name] = [
            {col: getattr(row, col) for col in cols} for row in rows
        ]
    return content


def _clear(session, namespace):
    for model, _cols in PACK_TABLES.values():
        session.query(model).filter_by(game_id=namespace).delete(
            synchronize_session=False
        )


def _copy_pack(session, src_ns, dst_ns):
    for _table, (model, cols) in PACK_TABLES.items():
        for row in session.query(model).filter_by(game_id=src_ns).all():
            session.add(model(
                game_id=dst_ns,
                **{col: getattr(row, col) for col in cols},
            ))


def _pack_size(session, namespace):
    return sum(
        session.query(model).filter_by(game_id=namespace).count()
        for model, _cols in PACK_TABLES.values()
    )


def list_versions(session, game_id):
    return (
        session.query(PackVersion)
        .filter_by(game_id=game_id)
        .order_by(PackVersion.version)
        .all()
    )


def active_version(session, game_id):
    """The version stamped on the live pack — None when the game was never
    promoted (live content predates versioning)."""
    return (
        session.query(func.max(PackVersion.version))
        .filter_by(game_id=game_id, status='active')
        .scalar()
    )


def clone_pack(session, game_id, note=None):
    """Snapshot the live pack into a new draft namespace. The draft is
    editable like any game_id — experiment there, promote when validated."""
    version = (
        session.query(func.max(PackVersion.version))
        .filter_by(game_id=game_id)
        .scalar() or 1
    ) + 1
    namespace = f'{game_id}@draft-{version}'
    _copy_pack(session, game_id, namespace)
    row = PackVersion(
        game_id=game_id, version=version, status='draft',
        namespace=namespace, note=note, created_at=_now(),
    )
    session.add(row)
    session.flush()
    return row


def promote_pack(session, game_id, version):
    """Publish a draft: archive the current live content, then replace the
    live rows with the draft's — one transaction, so readers never see a
    half-written pack."""
    draft = (
        session.query(PackVersion)
        .filter_by(game_id=game_id, version=version, status='draft')
        .one_or_none()
    )
    if draft is None:
        return None

    # Archive what production was serving — the rollback record.
    live_snapshot = _snapshot(session, game_id)
    prev_active = (
        session.query(PackVersion)
        .filter_by(game_id=game_id, status='active')
        .all()
    )
    if prev_active:
        for prev in prev_active:
            prev.status = 'archived'
            prev.namespace = None
            prev.snapshot = live_snapshot
    elif _pack_size(session, game_id):
        # The live pack predates versioning — keep it as version 1.
        session.add(PackVersion(
            game_id=game_id, version=1, status='archived',
            namespace=None, snapshot=live_snapshot,
            note='pre-versioning content', created_at=_now(),
        ))

    _clear(session, game_id)
    _copy_pack(session, draft.namespace, game_id)
    draft.status = 'active'
    draft.snapshot = _snapshot(session, game_id)
    session.flush()
    return draft
