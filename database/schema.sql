-- Habit Tracker Database Schema
-- Run this script in MySQL Workbench to create the schema and seed data

CREATE DATABASE IF NOT EXISTS habit_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE habit_tracker;

-- Drop existing tables if they exist (optional during development)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS notification_channels;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS habit_reminders;
DROP TABLE IF EXISTS habit_entries;
DROP TABLE IF EXISTS nutrition_meals;
DROP TABLE IF EXISTS exercise_preferences;
DROP TABLE IF EXISTS sleep_schedules;
DROP TABLE IF EXISTS water_settings;
DROP TABLE IF EXISTS user_habits;
DROP TABLE IF EXISTS habit_types;
DROP TABLE IF EXISTS user_metrics;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(60) NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  height_cm SMALLINT UNSIGNED NOT NULL,
  weight_kg DECIMAL(5,2) NOT NULL,
  age TINYINT UNSIGNED NOT NULL,
  gender ENUM('female', 'male', 'non_binary', 'prefer_not_to_say') DEFAULT 'prefer_not_to_say',
  timezone VARCHAR(100) DEFAULT 'America/Bogota',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_metrics (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  metric_date DATE NOT NULL,
  weight_kg DECIMAL(5,2) DEFAULT NULL,
  water_goal_ml INT UNSIGNED DEFAULT NULL,
  sleep_goal_hours DECIMAL(3,1) DEFAULT NULL,
  exercise_goal_minutes INT UNSIGNED DEFAULT NULL,
  notes VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_metrics_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_metrics_date (user_id, metric_date)
);

CREATE TABLE habit_types (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  icon VARCHAR(50) NOT NULL,
  color VARCHAR(20) NOT NULL,
  default_unit VARCHAR(25) NOT NULL,
  default_target_value DECIMAL(10,2) DEFAULT NULL
);

CREATE TABLE user_habits (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  habit_type_id TINYINT UNSIGNED NOT NULL,
  custom_name VARCHAR(120) DEFAULT NULL,
  target_value DECIMAL(10,2) NOT NULL,
  target_unit VARCHAR(25) NOT NULL,
  reminder_enabled TINYINT(1) DEFAULT 0,
  reminder_interval_minutes INT DEFAULT NULL,
  reminder_time TIME DEFAULT NULL,
  timezone VARCHAR(100) DEFAULT NULL,
  metadata JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_habits_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_habits_type FOREIGN KEY (habit_type_id) REFERENCES habit_types(id) ON DELETE RESTRICT
);

CREATE TABLE water_settings (
  user_habit_id INT UNSIGNED PRIMARY KEY,
  use_recommended_target TINYINT(1) DEFAULT 1,
  recommended_target_ml INT UNSIGNED NOT NULL,
  custom_target_ml INT UNSIGNED DEFAULT NULL,
  reminder_interval_minutes INT DEFAULT 120,
  last_recalculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_water_settings_habit FOREIGN KEY (user_habit_id) REFERENCES user_habits(id) ON DELETE CASCADE
);

CREATE TABLE sleep_schedules (
  user_habit_id INT UNSIGNED PRIMARY KEY,
  bed_time TIME NOT NULL,
  wake_time TIME NOT NULL,
  reminder_enabled TINYINT(1) DEFAULT 1,
  reminder_advance_minutes INT DEFAULT 30,
  timezone VARCHAR(100) DEFAULT NULL,
  CONSTRAINT fk_sleep_schedules_habit FOREIGN KEY (user_habit_id) REFERENCES user_habits(id) ON DELETE CASCADE
);

CREATE TABLE nutrition_meals (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_habit_id INT UNSIGNED NOT NULL,
  meal_code VARCHAR(40) NOT NULL,
  label VARCHAR(100) NOT NULL,
  scheduled_time TIME NOT NULL,
  enabled TINYINT(1) DEFAULT 1,
  reminder_enabled TINYINT(1) DEFAULT 1,
  CONSTRAINT fk_nutrition_meals_habit FOREIGN KEY (user_habit_id) REFERENCES user_habits(id) ON DELETE CASCADE,
  UNIQUE KEY uk_nutrition_meal (user_habit_id, meal_code)
);

CREATE TABLE exercise_preferences (
  user_habit_id INT UNSIGNED PRIMARY KEY,
  reminder_enabled TINYINT(1) DEFAULT 1,
  reminder_time TIME DEFAULT NULL,
  daily_goal_minutes INT UNSIGNED DEFAULT 30,
  focus_area VARCHAR(120) DEFAULT NULL,
  CONSTRAINT fk_exercise_preferences_habit FOREIGN KEY (user_habit_id) REFERENCES user_habits(id) ON DELETE CASCADE
);

CREATE TABLE habit_entries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_habit_id INT UNSIGNED NOT NULL,
  entry_date DATE NOT NULL,
  logged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  value DECIMAL(10,2) NOT NULL,
  notes VARCHAR(255) DEFAULT NULL,
  source ENUM('manual', 'auto', 'imported') DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_entries_user_habit FOREIGN KEY (user_habit_id) REFERENCES user_habits(id) ON DELETE CASCADE,
  INDEX idx_entries_habit_date (user_habit_id, entry_date)
);

CREATE TABLE habit_reminders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_habit_id INT UNSIGNED NOT NULL,
  reminder_time TIME NOT NULL,
  day_of_week TINYINT UNSIGNED DEFAULT NULL,
  frequency ENUM('daily', 'weekdays', 'weekends', 'custom') DEFAULT 'daily',
  enabled TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_habit_reminders_habit FOREIGN KEY (user_habit_id) REFERENCES user_habits(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  user_habit_id INT UNSIGNED DEFAULT NULL,
  title VARCHAR(150) NOT NULL,
  message VARCHAR(255) NOT NULL,
  type ENUM('reminder', 'achievement', 'alert') DEFAULT 'reminder',
  channel ENUM('in_app', 'push', 'email') DEFAULT 'in_app',
  scheduled_for DATETIME DEFAULT NULL,
  read_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_habit FOREIGN KEY (user_habit_id) REFERENCES user_habits(id) ON DELETE SET NULL,
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_schedule (scheduled_for)
);

CREATE TABLE notification_channels (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  channel ENUM('push', 'email', 'sms') NOT NULL,
  address VARCHAR(255) NOT NULL,
  verified_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notification_channels_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_channel_address (user_id, channel, address)
);

-- Seed data ---------------------------------------------------------------

INSERT INTO users (username, email, password_hash, height_cm, weight_kg, age, gender)
VALUES ('maria', 'maria@example.com', '$2y$10$abcdefghijklmnopqrstuvwxyz0123456789abcdefghi', 165, 64.5, 29, 'female');

INSERT INTO habit_types (slug, name, icon, color, default_unit, default_target_value)
VALUES
  ('water', 'Consumo de Agua', 'Droplets', '#2563eb', 'ml', 2000),
  ('sleep', 'Sueño', 'Moon', '#7c3aed', 'horas', 8),
  ('exercise', 'Ejercicio', 'Dumbbell', '#16a34a', 'minutos', 30),
  ('nutrition', 'Alimentación Saludable', 'Apple', '#f97316', 'comidas', 3);

INSERT INTO user_habits (
  user_id,
  habit_type_id,
  custom_name,
  target_value,
  target_unit,
  reminder_enabled,
  reminder_interval_minutes,
  reminder_time,
  timezone
)
SELECT
  1,
  id,
  NULL,
  default_target_value,
  default_unit,
  CASE WHEN slug IN ('water', 'sleep', 'exercise', 'nutrition') THEN 1 ELSE 0 END,
  CASE WHEN slug = 'water' THEN 120 ELSE NULL END,
  CASE WHEN slug = 'sleep' THEN '22:30:00' WHEN slug = 'exercise' THEN '07:00:00' ELSE NULL END,
  'America/Bogota'
FROM habit_types
ORDER BY id;

-- Water habit detailed settings
INSERT INTO water_settings (user_habit_id, use_recommended_target, recommended_target_ml, custom_target_ml, reminder_interval_minutes)
VALUES (1, 1, 2200, NULL, 120);

-- Sleep routine
INSERT INTO sleep_schedules (user_habit_id, bed_time, wake_time, reminder_enabled, reminder_advance_minutes, timezone)
VALUES (2, '22:30:00', '06:30:00', 1, 30, 'America/Bogota');

-- Nutrition meal plan
INSERT INTO nutrition_meals (user_habit_id, meal_code, label, scheduled_time, enabled, reminder_enabled)
VALUES
  (4, 'breakfast', 'Desayuno', '08:00:00', 1, 1),
  (4, 'lunch', 'Almuerzo', '13:00:00', 1, 1),
  (4, 'dinner', 'Cena', '20:00:00', 1, 1);

-- Exercise preferences
INSERT INTO exercise_preferences (user_habit_id, reminder_enabled, reminder_time, daily_goal_minutes, focus_area)
VALUES (3, 1, '07:00:00', 35, 'Fuerza y resistencia');

-- Sample metrics history
SET @today := CURDATE();
INSERT INTO user_metrics (user_id, metric_date, weight_kg, water_goal_ml, sleep_goal_hours, exercise_goal_minutes, notes)
VALUES
  (1, DATE_SUB(@today, INTERVAL 2 DAY), 64.8, 2200, 8.0, 35, 'Semana con mucha energía'),
  (1, DATE_SUB(@today, INTERVAL 1 DAY), 64.6, 2200, 8.0, 35, 'Seguimiento estable');

-- Sample entries for current week ----------------------------------------

INSERT INTO habit_entries (user_habit_id, entry_date, logged_at, value, notes, source)
VALUES
  (1, @today, CONCAT(@today, ' 08:30:00'), 250, 'Vaso de agua al despertar', 'manual'),
  (1, @today, CONCAT(@today, ' 12:15:00'), 500, 'Botella durante el almuerzo', 'manual'),
  (1, @today, CONCAT(@today, ' 15:45:00'), 750, 'Botella grande después de entrenar', 'manual'),
  (1, @today, CONCAT(@today, ' 18:30:00'), 250, 'Vaso de agua', 'manual'),
  (2, DATE_SUB(@today, INTERVAL 1 DAY), CONCAT(DATE_SUB(@today, INTERVAL 1 DAY), ' 22:30:00'), 8, 'Dormí muy bien', 'manual'),
  (3, DATE_SUB(@today, INTERVAL 1 DAY), CONCAT(DATE_SUB(@today, INTERVAL 1 DAY), ' 07:30:00'), 35, 'Rutina de fuerza', 'manual'),
  (4, DATE_SUB(@today, INTERVAL 1 DAY), CONCAT(DATE_SUB(@today, INTERVAL 1 DAY), ' 13:00:00'), 3, 'Comidas completas y saludables', 'manual');

INSERT INTO habit_reminders (user_habit_id, reminder_time, day_of_week, frequency, enabled)
VALUES
  (1, '09:00:00', NULL, 'daily', 1),
  (1, '15:00:00', NULL, 'daily', 1),
  (2, '22:00:00', NULL, 'daily', 1),
  (3, '06:30:00', NULL, 'weekdays', 1),
  (4, '12:30:00', NULL, 'daily', 1);

INSERT INTO notifications (user_id, user_habit_id, title, message, type, channel, scheduled_for)
VALUES
  (1, 1, '💧 ¡Es hora de beber agua!', 'Te quedan 500ml para cumplir tu meta diaria.', 'reminder', 'push', CONCAT(@today, ' 17:00:00')),
  (1, 3, '🔥 ¡Gran trabajo!', 'Completaste tu objetivo de ejercicio ayer.', 'achievement', 'in_app', NULL),
  (1, NULL, '✨ Racha de Hábitos', 'Llevas 7 días manteniendo tu racha.', 'achievement', 'in_app', NULL);

INSERT INTO notification_channels (user_id, channel, address, verified_at)
VALUES
  (1, 'push', 'expo-push-token[demo]', NOW()),
  (1, 'email', 'maria@example.com', NOW());

