DO $$
BEGIN
  IF to_regclass('public.interactions') IS NOT NULL
     AND to_regclass('public.encounter_forms') IS NULL THEN
    ALTER TABLE interactions DROP CONSTRAINT IF EXISTS interactions_pkey;
    ALTER TABLE interactions RENAME COLUMN id TO legacy_id;
    ALTER TABLE interactions RENAME COLUMN form TO interaction_form;
    ALTER TABLE interactions RENAME TO encounter_forms;

    ALTER TABLE encounter_forms ADD COLUMN id UUID;
    UPDATE encounter_forms
    SET id = (
      SUBSTRING(md5(entity_type || '|' || interaction_form), 1, 8) || '-' ||
      SUBSTRING(md5(entity_type || '|' || interaction_form), 9, 4) || '-5' ||
      SUBSTRING(md5(entity_type || '|' || interaction_form), 14, 3) || '-a' ||
      SUBSTRING(md5(entity_type || '|' || interaction_form), 18, 3) || '-' ||
      SUBSTRING(md5(entity_type || '|' || interaction_form), 21, 12)
    )::UUID;
    ALTER TABLE encounter_forms ALTER COLUMN id SET NOT NULL;
    ALTER TABLE encounter_forms ADD PRIMARY KEY (id);
    ALTER TABLE encounter_forms DROP COLUMN legacy_id;
    ALTER INDEX IF EXISTS idx_interactions_entity_type RENAME TO idx_encounter_forms_entity_type;
  END IF;
END $$;
