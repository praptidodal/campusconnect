-- ==============================================================================
-- CampusConnect — Full Relational Database Schema
-- Target: MySQL 8.0+ / 9.0+ / MySQL Workbench
-- Description: Complete 36-table schema including constraints, indexes, & triggers
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Database Creation
DROP DATABASE IF EXISTS `campusconnect`;
CREATE DATABASE `campusconnect` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `campusconnect`;

-- ==============================================================================
-- 2. Core Identity & User Tables
-- ==============================================================================

-- Table: users
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('student','faculty','club','admin','teacher') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'student',
  `status` enum('active','suspended','banned') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_verified` tinyint(1) NOT NULL DEFAULT '0',
  `department` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `designation` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employee_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `office_location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `office_hours` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `warning_count` int DEFAULT '0',
  `account_status` enum('active','suspended','banned') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: profiles
DROP TABLE IF EXISTS `profiles`;
CREATE TABLE `profiles` (
  `profile_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `bio` text COLLATE utf8mb4_unicode_ci,
  `department` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `year_of_study` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `designation` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `profile_picture` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `avatar_is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `avatar_deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`profile_id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `ix_profiles_profile_id` (`profile_id`),
  CONSTRAINT `profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: skills
DROP TABLE IF EXISTS `skills`;
CREATE TABLE `skills` (
  `skill_id` int NOT NULL AUTO_INCREMENT,
  `skill_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`skill_id`),
  UNIQUE KEY `ix_skills_skill_name` (`skill_name`),
  KEY `ix_skills_skill_id` (`skill_id`),
  KEY `idx_skills_name` (`skill_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: user_skills
DROP TABLE IF EXISTS `user_skills`;
CREATE TABLE `user_skills` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `skill_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_skill` (`user_id`,`skill_id`),
  KEY `skill_id` (`skill_id`),
  CONSTRAINT `user_skills_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `user_skills_ibfk_2` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`skill_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 3. Networking, Connections & Blocking
-- ==============================================================================

-- Table: connections
DROP TABLE IF EXISTS `connections`;
CREATE TABLE `connections` (
  `connection_id` int NOT NULL AUTO_INCREMENT,
  `user_one` int NOT NULL,
  `user_two` int NOT NULL,
  `connected_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`connection_id`),
  UNIQUE KEY `uq_connection` (`user_one`,`user_two`),
  KEY `idx_user_one` (`user_one`),
  KEY `idx_user_two` (`user_two`),
  CONSTRAINT `fk_conn_one` FOREIGN KEY (`user_one`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_conn_two` FOREIGN KEY (`user_two`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: connection_requests
DROP TABLE IF EXISTS `connection_requests`;
CREATE TABLE `connection_requests` (
  `request_id` int NOT NULL AUTO_INCREMENT,
  `sender_id` int NOT NULL,
  `receiver_id` int NOT NULL,
  `status` enum('pending','accepted','rejected','withdrawn') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`request_id`),
  UNIQUE KEY `uq_connection_request` (`sender_id`,`receiver_id`),
  KEY `idx_sender` (`sender_id`),
  KEY `idx_receiver` (`receiver_id`),
  CONSTRAINT `fk_cr_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cr_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: user_blocks
DROP TABLE IF EXISTS `user_blocks`;
CREATE TABLE `user_blocks` (
  `block_id` int NOT NULL AUTO_INCREMENT,
  `blocker_user_id` int NOT NULL,
  `blocked_user_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`block_id`),
  UNIQUE KEY `blocker_user_id` (`blocker_user_id`,`blocked_user_id`),
  KEY `blocked_user_id` (`blocked_user_id`),
  CONSTRAINT `user_blocks_ibfk_1` FOREIGN KEY (`blocker_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `user_blocks_ibfk_2` FOREIGN KEY (`blocked_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 4. Social Feed, Likes & Comments
-- ==============================================================================

-- Table: posts
DROP TABLE IF EXISTS `posts`;
CREATE TABLE `posts` (
  `post_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `visibility` enum('public','followers','community') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'public',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`post_id`),
  KEY `ix_posts_user_id` (`user_id`),
  KEY `ix_posts_post_id` (`post_id`),
  KEY `idx_posts_content` (`content`(255)),
  CONSTRAINT `posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: likes
DROP TABLE IF EXISTS `likes`;
CREATE TABLE `likes` (
  `like_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `post_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`like_id`),
  UNIQUE KEY `uq_like` (`user_id`,`post_id`),
  KEY `ix_likes_like_id` (`like_id`),
  KEY `ix_likes_post_id` (`post_id`),
  KEY `ix_likes_user_id` (`user_id`),
  CONSTRAINT `likes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `likes_ibfk_2` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: comments
DROP TABLE IF EXISTS `comments`;
CREATE TABLE `comments` (
  `comment_id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `user_id` int NOT NULL,
  `comment_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`comment_id`),
  KEY `ix_comments_user_id` (`user_id`),
  KEY `ix_comments_comment_id` (`comment_id`),
  KEY `ix_comments_post_id` (`post_id`),
  CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE,
  CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 5. Communities & Clubs
-- ==============================================================================

-- Table: communities
DROP TABLE IF EXISTS `communities`;
CREATE TABLE `communities` (
  `community_id` int NOT NULL AUTO_INCREMENT,
  `community_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `approval_status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `approval_notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`community_id`),
  UNIQUE KEY `ix_communities_community_name` (`community_name`),
  KEY `created_by` (`created_by`),
  KEY `ix_communities_community_id` (`community_id`),
  KEY `idx_communities_name` (`community_name`),
  CONSTRAINT `communities_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: community_members
DROP TABLE IF EXISTS `community_members`;
CREATE TABLE `community_members` (
  `membership_id` int NOT NULL AUTO_INCREMENT,
  `community_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` enum('owner','admin','member') COLLATE utf8mb4_unicode_ci NOT NULL,
  `joined_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`membership_id`),
  UNIQUE KEY `uq_community_member` (`community_id`,`user_id`),
  KEY `user_id` (`user_id`),
  KEY `ix_community_members_membership_id` (`membership_id`),
  CONSTRAINT `community_members_ibfk_1` FOREIGN KEY (`community_id`) REFERENCES `communities` (`community_id`) ON DELETE CASCADE,
  CONSTRAINT `community_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: community_posts
DROP TABLE IF EXISTS `community_posts`;
CREATE TABLE `community_posts` (
  `community_post_id` int NOT NULL AUTO_INCREMENT,
  `community_id` int NOT NULL,
  `user_id` int NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`community_post_id`),
  KEY `community_id` (`community_id`),
  KEY `user_id` (`user_id`),
  KEY `ix_community_posts_community_post_id` (`community_post_id`),
  CONSTRAINT `community_posts_ibfk_1` FOREIGN KEY (`community_id`) REFERENCES `communities` (`community_id`) ON DELETE CASCADE,
  CONSTRAINT `community_posts_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 6. Events & Registrations
-- ==============================================================================

-- Table: events
DROP TABLE IF EXISTS `events`;
CREATE TABLE `events` (
  `event_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `venue` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_datetime` datetime NOT NULL,
  `end_datetime` datetime NOT NULL,
  `registration_deadline` datetime DEFAULT NULL,
  `poster_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organizer_id` int NOT NULL,
  `community_id` int DEFAULT NULL,
  `max_participants` int DEFAULT NULL,
  `status` enum('upcoming','ongoing','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'upcoming',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `approval_status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `approval_notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`event_id`),
  KEY `organizer_id` (`organizer_id`),
  KEY `community_id` (`community_id`),
  KEY `ix_events_event_id` (`event_id`),
  KEY `idx_events_title` (`title`),
  CONSTRAINT `events_ibfk_1` FOREIGN KEY (`organizer_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `events_ibfk_2` FOREIGN KEY (`community_id`) REFERENCES `communities` (`community_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: event_registrations
DROP TABLE IF EXISTS `event_registrations`;
CREATE TABLE `event_registrations` (
  `registration_id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `user_id` int NOT NULL,
  `registration_status` enum('registered','cancelled','attended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'registered',
  `registered_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`registration_id`),
  UNIQUE KEY `uq_event_registration` (`event_id`,`user_id`),
  KEY `user_id` (`user_id`),
  KEY `ix_event_registrations_registration_id` (`registration_id`),
  CONSTRAINT `event_registrations_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`) ON DELETE CASCADE,
  CONSTRAINT `event_registrations_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 7. Collaborations & Opportunities
-- ==============================================================================

-- Table: collaborations
DROP TABLE IF EXISTS `collaborations`;
CREATE TABLE `collaborations` (
  `collaboration_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `required_skills` text COLLATE utf8mb4_unicode_ci,
  `positions_available` int NOT NULL DEFAULT '1',
  `deadline` datetime DEFAULT NULL,
  `status` enum('open','closed','completed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `created_by` int NOT NULL,
  `community_id` int DEFAULT NULL,
  `attachment_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`collaboration_id`),
  KEY `created_by` (`created_by`),
  KEY `community_id` (`community_id`),
  KEY `ix_collaborations_collaboration_id` (`collaboration_id`),
  KEY `idx_collaborations_title` (`title`),
  CONSTRAINT `collaborations_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `collaborations_ibfk_2` FOREIGN KEY (`community_id`) REFERENCES `communities` (`community_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: applications
DROP TABLE IF EXISTS `applications`;
CREATE TABLE `applications` (
  `application_id` int NOT NULL AUTO_INCREMENT,
  `collaboration_id` int NOT NULL,
  `applicant_id` int NOT NULL,
  `application_message` text COLLATE utf8mb4_unicode_ci,
  `resume_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','accepted','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `applied_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`application_id`),
  UNIQUE KEY `uq_collaboration_application` (`collaboration_id`,`applicant_id`),
  KEY `applicant_id` (`applicant_id`),
  KEY `ix_applications_application_id` (`application_id`),
  CONSTRAINT `applications_ibfk_1` FOREIGN KEY (`collaboration_id`) REFERENCES `collaborations` (`collaboration_id`) ON DELETE CASCADE,
  CONSTRAINT `applications_ibfk_2` FOREIGN KEY (`applicant_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: collaboration_requests
DROP TABLE IF EXISTS `collaboration_requests`;
CREATE TABLE `collaboration_requests` (
  `collab_id` int NOT NULL AUTO_INCREMENT,
  `created_by` int NOT NULL,
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `skills_required` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('open','closed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`collab_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `collaboration_requests_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 8. Messaging & Chat System
-- ==============================================================================

-- Table: conversations
DROP TABLE IF EXISTS `conversations`;
CREATE TABLE `conversations` (
  `conversation_id` int NOT NULL AUTO_INCREMENT,
  `conversation_type` enum('direct','community','collaboration') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` int DEFAULT NULL,
  `community_id` int DEFAULT NULL,
  `collaboration_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`conversation_id`),
  UNIQUE KEY `community_id` (`community_id`),
  UNIQUE KEY `collaboration_id` (`collaboration_id`),
  KEY `created_by` (`created_by`),
  KEY `ix_conversations_conversation_id` (`conversation_id`),
  CONSTRAINT `conversations_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `conversations_ibfk_2` FOREIGN KEY (`community_id`) REFERENCES `communities` (`community_id`) ON DELETE CASCADE,
  CONSTRAINT `conversations_ibfk_3` FOREIGN KEY (`collaboration_id`) REFERENCES `collaborations` (`collaboration_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: conversation_participants
DROP TABLE IF EXISTS `conversation_participants`;
CREATE TABLE `conversation_participants` (
  `participant_id` int NOT NULL AUTO_INCREMENT,
  `conversation_id` int NOT NULL,
  `user_id` int NOT NULL,
  `joined_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`participant_id`),
  UNIQUE KEY `uq_conversation_participant` (`conversation_id`,`user_id`),
  KEY `user_id` (`user_id`),
  KEY `ix_conversation_participants_participant_id` (`participant_id`),
  CONSTRAINT `conversation_participants_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`conversation_id`) ON DELETE CASCADE,
  CONSTRAINT `conversation_participants_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: messages
DROP TABLE IF EXISTS `messages`;
CREATE TABLE `messages` (
  `message_id` int NOT NULL AUTO_INCREMENT,
  `conversation_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `message_text` text COLLATE utf8mb4_unicode_ci,
  `attachment_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`message_id`),
  KEY `conversation_id` (`conversation_id`),
  KEY `sender_id` (`sender_id`),
  KEY `ix_messages_message_id` (`message_id`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`conversation_id`) ON DELETE CASCADE,
  CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: message_reads
DROP TABLE IF EXISTS `message_reads`;
CREATE TABLE `message_reads` (
  `read_id` int NOT NULL AUTO_INCREMENT,
  `message_id` int NOT NULL,
  `user_id` int NOT NULL,
  `read_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`read_id`),
  UNIQUE KEY `uq_message_read` (`message_id`,`user_id`),
  KEY `user_id` (`user_id`),
  KEY `ix_message_reads_read_id` (`read_id`),
  CONSTRAINT `message_reads_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `messages` (`message_id`) ON DELETE CASCADE,
  CONSTRAINT `message_reads_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 9. Resource Hub & Document Sharing
-- ==============================================================================

-- Table: resources
DROP TABLE IF EXISTS `resources`;
CREATE TABLE `resources` (
  `resource_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `resource_type` enum('community','event','collaboration') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_id` int NOT NULL,
  `uploaded_by` int NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint DEFAULT NULL,
  `file_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`resource_id`),
  KEY `uploaded_by` (`uploaded_by`),
  KEY `ix_resources_resource_id` (`resource_id`),
  KEY `ix_resources_reference_id` (`reference_id`),
  CONSTRAINT `resources_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: resource_downloads
DROP TABLE IF EXISTS `resource_downloads`;
CREATE TABLE `resource_downloads` (
  `download_id` int NOT NULL AUTO_INCREMENT,
  `resource_id` int NOT NULL,
  `user_id` int NOT NULL,
  `downloaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`download_id`),
  KEY `resource_id` (`resource_id`),
  KEY `user_id` (`user_id`),
  KEY `ix_resource_downloads_download_id` (`download_id`),
  CONSTRAINT `resource_downloads_ibfk_1` FOREIGN KEY (`resource_id`) REFERENCES `resources` (`resource_id`) ON DELETE CASCADE,
  CONSTRAINT `resource_downloads_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 10. Notifications & User Preferences
-- ==============================================================================

-- Table: notifications
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `notification_id` int NOT NULL AUTO_INCREMENT,
  `sender_id` int DEFAULT NULL,
  `receiver_id` int NOT NULL,
  `notification_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_id` int DEFAULT NULL,
  `reference_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  KEY `sender_id` (`sender_id`),
  KEY `receiver_id` (`receiver_id`),
  KEY `ix_notifications_notification_id` (`notification_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: notification_preferences
DROP TABLE IF EXISTS `notification_preferences`;
CREATE TABLE `notification_preferences` (
  `preference_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `like_notifications` tinyint(1) NOT NULL DEFAULT '1',
  `comment_notifications` tinyint(1) NOT NULL DEFAULT '1',
  `community_notifications` tinyint(1) NOT NULL DEFAULT '1',
  `event_notifications` tinyint(1) NOT NULL DEFAULT '1',
  `collaboration_notifications` tinyint(1) NOT NULL DEFAULT '1',
  `connection_notifications` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`preference_id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `ix_notification_preferences_preference_id` (`preference_id`),
  CONSTRAINT `notification_preferences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 11. Faculty Notices & Targeted Broadcasts
-- ==============================================================================

-- Table: official_notices
DROP TABLE IF EXISTS `official_notices`;
CREATE TABLE `official_notices` (
  `notice_id` int NOT NULL AUTO_INCREMENT,
  `teacher_id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_audience` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notice_id`),
  KEY `teacher_id` (`teacher_id`),
  KEY `ix_official_notices_notice_id` (`notice_id`),
  CONSTRAINT `official_notices_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: notice_recipients
DROP TABLE IF EXISTS `notice_recipients`;
CREATE TABLE `notice_recipients` (
  `recipient_id` int NOT NULL AUTO_INCREMENT,
  `notice_id` int NOT NULL,
  `user_id` int NOT NULL,
  `notification_sent` tinyint(1) NOT NULL DEFAULT '0',
  `read_status` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`recipient_id`),
  KEY `notice_id` (`notice_id`),
  KEY `user_id` (`user_id`),
  KEY `ix_notice_recipients_recipient_id` (`recipient_id`),
  CONSTRAINT `notice_recipients_ibfk_1` FOREIGN KEY (`notice_id`) REFERENCES `official_notices` (`notice_id`) ON DELETE CASCADE,
  CONSTRAINT `notice_recipients_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 12. Moderation, Reporting & Administrative Logs
-- ==============================================================================

-- Table: reports
DROP TABLE IF EXISTS `reports`;
CREATE TABLE `reports` (
  `report_id` int NOT NULL AUTO_INCREMENT,
  `reporter_id` int NOT NULL,
  `reported_user_id` int DEFAULT NULL,
  `content_type` enum('post','comment','message','community','event','profile') COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_id` int NOT NULL,
  `reason` enum('spam','harassment','hate_speech','fake_information','violence','copyright','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','reviewing','resolved','dismissed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`report_id`),
  KEY `reporter_id` (`reporter_id`),
  KEY `reported_user_id` (`reported_user_id`),
  KEY `reviewed_by` (`reviewed_by`),
  CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `reports_ibfk_2` FOREIGN KEY (`reported_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `reports_ibfk_3` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: moderation_logs
DROP TABLE IF EXISTS `moderation_logs`;
CREATE TABLE `moderation_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `report_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `action` enum('warning','suspend','unsuspend','ban','unban','delete_post','delete_comment','delete_message','delete_event','delete_community','dismiss_report') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `admin_id` (`admin_id`),
  KEY `report_id` (`report_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `moderation_logs_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `moderation_logs_ibfk_2` FOREIGN KEY (`report_id`) REFERENCES `reports` (`report_id`) ON DELETE SET NULL,
  CONSTRAINT `moderation_logs_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: admin_logs
DROP TABLE IF EXISTS `admin_logs`;
CREATE TABLE `admin_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `action` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` int DEFAULT NULL,
  `details` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `admin_id` (`admin_id`),
  KEY `ix_admin_logs_log_id` (`log_id`),
  CONSTRAINT `admin_logs_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 13. Search History, Analytics & Platform Telemetry
-- ==============================================================================

-- Table: search_history
DROP TABLE IF EXISTS `search_history`;
CREATE TABLE `search_history` (
  `search_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `search_query` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`search_id`),
  KEY `ix_search_history_user_id` (`user_id`),
  KEY `ix_search_history_search_id` (`search_id`),
  CONSTRAINT `search_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: user_activity_logs
DROP TABLE IF EXISTS `user_activity_logs`;
CREATE TABLE `user_activity_logs` (
  `activity_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `activity_type` enum('login','post_created','post_liked','comment_added','community_joined','event_registered','collaboration_created','collaboration_applied') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`activity_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_activity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: daily_platform_metrics
DROP TABLE IF EXISTS `daily_platform_metrics`;
CREATE TABLE `daily_platform_metrics` (
  `metric_id` int NOT NULL AUTO_INCREMENT,
  `metric_date` date NOT NULL,
  `total_users` int NOT NULL,
  `active_users` int NOT NULL,
  `total_posts` int NOT NULL,
  `total_communities` int NOT NULL,
  `total_events` int NOT NULL,
  `total_collaborations` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`metric_id`),
  UNIQUE KEY `metric_date` (`metric_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: achievements
DROP TABLE IF EXISTS `achievements`;
CREATE TABLE `achievements` (
  `achievement_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('certification','project','award') COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `issued_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`achievement_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `achievements_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: follow_requests
DROP TABLE IF EXISTS `follow_requests`;
CREATE TABLE `follow_requests` (
  `request_id` int NOT NULL AUTO_INCREMENT,
  `sender_id` int NOT NULL,
  `receiver_id` int NOT NULL,
  `status` enum('pending','accepted','rejected','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`request_id`),
  UNIQUE KEY `uq_follow_request` (`sender_id`,`receiver_id`),
  KEY `ix_follow_requests_receiver_id` (`receiver_id`),
  KEY `ix_follow_requests_sender_id` (`sender_id`),
  KEY `ix_follow_requests_request_id` (`request_id`),
  CONSTRAINT `follow_requests_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `follow_requests_ibfk_2` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- Schema Initialization Complete!
-- All 36 tables, indexes, constraints, and relationships have been configured.
-- ==============================================================================
