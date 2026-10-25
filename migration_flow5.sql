-- ============================================================
-- CampusConnect – Enhancement Flow 5
-- Club & Event Approval System Migration (MySQL compatible)
-- ============================================================

-- 1. Add approval columns to communities table
ALTER TABLE communities
    ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    ADD COLUMN approved_by INT NULL,
    ADD COLUMN approved_at TIMESTAMP NULL,
    ADD COLUMN approval_notes TEXT NULL;

-- 2. Add approval columns to events table
ALTER TABLE events
    ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    ADD COLUMN approved_by INT NULL,
    ADD COLUMN approved_at TIMESTAMP NULL,
    ADD COLUMN approval_notes TEXT NULL;

-- 3. Backfill existing communities as approved (no disruption to live data)
UPDATE communities
SET approval_status = 'approved',
    approved_at = created_at
WHERE approval_status = 'pending';

-- 4. Backfill existing events as approved
UPDATE events
SET approval_status = 'approved',
    approved_at = created_at
WHERE approval_status = 'pending';
