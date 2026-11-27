"""backfill conviction retrieval surfaces

Revision ID: 0039
Revises: 0038
Create Date: 2026-12-02

Reflected convictions were minted with `subjects`/`tags` empty — the
`create` op never inherited a surface, so a belief like 'I am becoming
the weather itself' could only ever surface through the semantic door:
no shared tag could summon it. This rebuilds the surface from each
conviction's evidence memories:

  subjects += the union of the evidence's subjects (Relation echo)
  tags     += the union of the evidence's CONTACT tags — ambient
              families (type/weather/region/subtype/act) stay out, the
              same way they stay out of evocation ('the same wet sky'
              must not summon a worldview).

Both unions are merges, never replacements — a conviction that already
carries a surface (an inverted belief's inherited subjects) keeps it.
Convictions without resolvable evidence are untouched.
"""
from alembic import op

revision = '0039'
down_revision = '0038'
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "UPDATE mind.memories c "
        "SET subjects = (SELECT jsonb_agg(DISTINCT v ORDER BY v) "
        "                FROM jsonb_array_elements_text("
        "                    CASE WHEN jsonb_typeof(c.subjects) = 'array' "
        "                         THEN c.subjects ELSE '[]'::jsonb END"
        "                    || COALESCE(sub.subj, '[]'::jsonb)) AS v), "
        "    tags = COALESCE((SELECT jsonb_agg(DISTINCT v ORDER BY v) "
        "            FROM jsonb_array_elements_text("
        "                CASE WHEN jsonb_typeof(c.tags) = 'array' "
        "                     THEN c.tags ELSE '[]'::jsonb END"
        "                || COALESCE(sub.tags, '[]'::jsonb)) AS v), "
        "            '[]'::jsonb) "
        "FROM ("
        "    SELECT c2.id, "
        "        jsonb_agg(DISTINCT s.value ORDER BY s.value) "
        "            FILTER (WHERE s.value IS NOT NULL) AS subj, "
        "        jsonb_agg(DISTINCT t.value ORDER BY t.value) "
        "            FILTER (WHERE t.value IS NOT NULL) AS tags "
        "    FROM mind.memories c2 "
        "    CROSS JOIN LATERAL jsonb_array_elements_text("
        "        c2.conviction -> 'evidence') AS ev(mem_id) "
        "    JOIN mind.memories ev_m ON ev_m.id = ev.mem_id "
        "    LEFT JOIN LATERAL jsonb_array_elements_text("
        "        CASE WHEN jsonb_typeof(ev_m.subjects) = 'array' "
        "             THEN ev_m.subjects ELSE '[]'::jsonb END"
        "    ) AS s(value) ON true "
        "    LEFT JOIN LATERAL ("
        "        SELECT x.value FROM jsonb_array_elements_text("
        "            CASE WHEN jsonb_typeof(ev_m.tags) = 'array' "
        "                 THEN ev_m.tags ELSE '[]'::jsonb END) AS x(value) "
        "        WHERE (CASE WHEN x.value LIKE 'tag:%' "
        "                    THEN split_part(substr(x.value, 5), ':', 1) "
        "                    ELSE split_part(x.value, ':', 1) END) "
        "              NOT IN ('type', 'weather', 'subtype', 'act', 'region')"
        "    ) AS t(value) ON true "
        "    GROUP BY c2.id"
        ") sub "
        "WHERE c.id = sub.id AND c.kind = 'conviction'"
    )


def downgrade():
    # No way back: rows created after the fix inherit subjects legitimately,
    # and they are indistinguishable from the backfilled ones. Emptying
    # them again would destroy real surfaces.
    pass
