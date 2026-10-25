-- =============================================================================
-- CampusConnect — Flow 2 Migration: Follow → Connection System
-- Run this script against your campusconnect MySQL database
-- =============================================================================

-- 1. Drop old followers table
DROP TABLE IF EXISTS followers;

-- 2. Create connection_requests table
CREATE TABLE IF NOT EXISTS connection_requests (
    request_id   INT AUTO_INCREMENT PRIMARY KEY,
    sender_id    INT NOT NULL,
    receiver_id  INT NOT NULL,
    status       ENUM('pending','accepted','rejected','withdrawn') NOT NULL DEFAULT 'pending',
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_connection_request (sender_id, receiver_id),
    INDEX idx_sender   (sender_id),
    INDEX idx_receiver (receiver_id),
    CONSTRAINT fk_cr_sender   FOREIGN KEY (sender_id)   REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_cr_receiver FOREIGN KEY (receiver_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 3. Create connections table
CREATE TABLE IF NOT EXISTS connections (
    connection_id INT AUTO_INCREMENT PRIMARY KEY,
    user_one      INT NOT NULL,
    user_two      INT NOT NULL,
    connected_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_connection (user_one, user_two),
    INDEX idx_user_one (user_one),
    INDEX idx_user_two (user_two),
    CONSTRAINT fk_conn_one FOREIGN KEY (user_one) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_conn_two FOREIGN KEY (user_two) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 4. Update notifications table: change columns to VARCHAR(50)
ALTER TABLE notifications
    MODIFY COLUMN notification_type VARCHAR(50) NOT NULL,
    MODIFY COLUMN reference_type    VARCHAR(50) NULL;

-- 5. Add connection_notifications to notification_preferences
ALTER TABLE notification_preferences
    ADD COLUMN connection_notifications BOOLEAN NOT NULL DEFAULT TRUE;

-- 6. Remove follow_notifications column from notification_preferences
ALTER TABLE notification_preferences
    DROP COLUMN follow_notifications;

-- 7. Delete any existing follow-type notifications (clean up old data)
DELETE FROM notifications WHERE notification_type IN ('follow', 'follow_request');

SELECT 'Migration Flow 2 complete.' AS status;
