-- Add system_prompt and introduction_instructions columns to character_state
-- This allows each character to have custom narrative voice and introduction instructions

ALTER TABLE character_state
ADD COLUMN IF NOT EXISTS system_prompt TEXT,
ADD COLUMN IF NOT EXISTS introduction_instructions TEXT;

-- Add comments
COMMENT ON COLUMN character_state.system_prompt IS 'Custom narrator voice instructions for this character (replaces default SYSTEM_PROMPT)';
COMMENT ON COLUMN character_state.introduction_instructions IS 'Custom introduction instructions for this character (replaces default introduction)';
