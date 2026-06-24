-- Update character_state descriptions for the welcome modal selection screen

UPDATE character_state
SET description = 'You are tall and silent, one who counts the days by the stars and not the calendar. You have walked the borders of old Arnor for years, and this time you walk alone, seeking an ancient road few still speak of.'
WHERE name = 'Aranath';

UPDATE character_state
SET description = 'You see the ending in things — the rot in the green leaf, the ruin in the new-raised wall — and long ago you stopped flinching from it. Some call it a gift, some a curse. You call it seeing clearly.'
WHERE name = 'Celebrian';
