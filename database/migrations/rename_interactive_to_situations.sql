-- rename_interactive_to_situations.sql
-- The column no longer holds interactivity — options/commands/outcomes live
-- in the `interactions` table since Wave D. What remains is the authored
-- Situation descriptor store (id, gating tags, when, situation/stance prose),
-- so the column is renamed to say what it is.
ALTER TABLE places_narration   RENAME COLUMN interactive TO situations;
ALTER TABLE entities_narration RENAME COLUMN interactive TO situations;
