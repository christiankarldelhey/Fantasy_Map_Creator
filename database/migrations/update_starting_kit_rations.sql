-- ============================================================================
-- Starting kit: 24 trail rations (was 7)
-- ----------------------------------------------------------------------------
-- Provisioning tops the pack to PROVISION_TARGET_RATIONS (24) at every
-- settlement and at trip start near one; the template kit itself should
-- carry the same load so a fresh clone and a reset arrive equally
-- provisioned — nobody should march out with an empty pack.
-- ============================================================================
UPDATE starting_kits sk
SET qty = 24
FROM items i
WHERE sk.item_id = i.id AND i.slug = 'trail_rations';
