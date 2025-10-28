-- Habit Tracker Database Schema
-- Run this script in MySQL Workbench to create the schema and seed data

CREATE DATABASE IF NOT EXISTS habit_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE habit_tracker;

-- Drop existing tables if they exist (optional during development)
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS habit_entries;
DROP TABLE IF EXISTS habits;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE habits (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  slug ENUM('water', 'sleep', 'exercise', 'nutrition') NOT NULL,
  name VARCHAR(120) NOT NULL,
  icon VARCHAR(50) NOT NULL,
  color VARCHAR(20) NOT NULL,
  target_value DECIMAL(10,2) NOT NULL,
  target_unit VARCHAR(25) NOT NULL,
  reminder_interval_minutes INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_habits_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE habit_entries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  habit_id INT UNSIGNED NOT NULL,
  entry_date DATE NOT NULL,
  logged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  value DECIMAL(10,2) NOT NULL,
  notes VARCHAR(255) DEFAULT NULL,
  CONSTRAINT fk_entries_habit FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
  INDEX idx_entries_habit_date (habit_id, entry_date)
);

CREATE TABLE notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  habit_id INT UNSIGNED NULL,
  title VARCHAR(150) NOT NULL,
  message VARCHAR(255) NOT NULL,
  type ENUM('reminder', 'achievement', 'alert') DEFAULT 'reminder',
  scheduled_for DATETIME DEFAULT NULL,
  read_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_habit FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE SET NULL,
  INDEX idx_notifications_user (user_id)
);

-- Seed data ---------------------------------------------------------------

INSERT INTO users (name, email)
VALUES ('María González', 'maria@example.com');

INSERT INTO habits (user_id, slug, name, icon, color, target_value, target_unit, reminder_interval_minutes)
VALUES
  (1, 'water', 'Consumo de Agua', 'Droplets', '#2563eb', 2000, 'ml', 120),
  (1, 'sleep', 'Sueño', 'Moon', '#7c3aed', 8, 'horas', NULL),
  (1, 'exercise', 'Ejercicio', 'Dumbbell', '#16a34a', 30, 'minutos', 0),
  (1, 'nutrition', 'Alimentación Saludable', 'Apple', '#f97316', 3, 'comidas', 0);

-- Sample entries for current week ----------------------------------------

SET @today := CURDATE();

INSERT INTO habit_entries (habit_id, entry_date, logged_at, value, notes)
VALUES
  (1, @today, CONCAT(@today, ' 08:30:00'), 250, 'Vaso de agua al despertar'),
  (1, @today, CONCAT(@today, ' 12:15:00'), 500, 'Botella durante el almuerzo'),
  (1, @today, CONCAT(@today, ' 15:45:00'), 750, 'Botella grande después de entrenar'),
  (1, @today, CONCAT(@today, ' 18:30:00'), 250, 'Vaso de agua'),
  (2, DATE_SUB(@today, INTERVAL 1 DAY), CONCAT(DATE_SUB(@today, INTERVAL 1 DAY), ' 22:30:00'), 8, 'Dormí muy bien'),
  (3, DATE_SUB(@today, INTERVAL 1 DAY), CONCAT(DATE_SUB(@today, INTERVAL 1 DAY), ' 07:30:00'), 35, 'Rutina de fuerza'),
  (4, DATE_SUB(@today, INTERVAL 1 DAY), CONCAT(DATE_SUB(@today, INTERVAL 1 DAY), ' 13:00:00'), 3, 'Comidas completas y saludables');

INSERT INTO notifications (user_id, habit_id, title, message, type, scheduled_for)
VALUES
  (1, 1, '💧 ¡Es hora de beber agua!', 'Te quedan 500ml para cumplir tu meta diaria.', 'reminder', CONCAT(@today, ' 17:00:00')),
  (1, 3, '🔥 ¡Gran trabajo!', 'Completaste tu objetivo de ejercicio ayer.', 'achievement', NULL),
  (1, NULL, '✨ Racha de Hábitos', 'Llevas 7 días manteniendo tu racha.', 'achievement', NULL);

