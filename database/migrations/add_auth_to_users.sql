-- Migration: Add auth fields to users table
-- Date: 2026-06-28
-- Description: Add is_admin flag and username. Mark admin@middleearth.com as admin.

ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Mark the existing admin user
UPDATE users SET is_admin = true WHERE email = 'admin@middleearth.com';

-- Also add a column to track which user "owns" a character clone
-- (template characters have owner_user_id = NULL)
ALTER TABLE character_state ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE character_state ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES character_state(id) ON DELETE SET NULL;

-- Verification
SELECT email, is_admin FROM users;
