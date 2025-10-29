-- Habit Tracker Database Schema (PostgreSQL)
-- Ejecuta este script desde pgAdmin (Query Tool) o psql estando conectado a la base de datos `habit_tracker`.
-- Crea primero la base con: CREATE DATABASE habit_tracker;

-- Limpieza -----------------------------------------------------------------

DROP TABLE IF EXISTS notification_channels CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS habit_reminders CASCADE;
DROP TABLE IF EXISTS habit_entries CASCADE;
DROP TABLE IF EXISTS nutrition_meals CASCADE;
DROP TABLE IF EXISTS exercise_preferences CASCADE;
DROP TABLE IF EXISTS sleep_schedules CASCADE;
DROP TABLE IF EXISTS water_settings CASCADE;
DROP TABLE IF EXISTS user_habits CASCADE;
DROP TABLE IF EXISTS habit_types CASCADE;
DROP TABLE IF EXISTS user_metrics CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS notification_channel_type;
DROP TYPE IF EXISTS notification_type_enum;
DROP TYPE IF EXISTS habit_reminder_frequency_enum;
DROP TYPE IF EXISTS habit_entry_source_enum;

-- Tipos --------------------------------------------------------------------

CREATE TYPE habit_entry_source_enum AS ENUM ('manual', 'auto', 'imported');
CREATE TYPE habit_reminder_frequency_enum AS ENUM ('daily', 'weekdays', 'weekends', 'custom');
CREATE TYPE notification_type_enum AS ENUM ('reminder', 'achievement', 'alert');
CREATE TYPE notification_channel_type AS ENUM ('in_app', 'push', 'email', 'sms');

-- Tablas -------------------------------------------------------------------

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_metrics (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  weight_kg NUMERIC(5, 2),
  water_goal_ml INTEGER,
  sleep_goal_hours NUMERIC(3, 1),
  exercise_goal_minutes INTEGER,
  notes VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, metric_date)
);

CREATE TABLE habit_types (
  id SMALLSERIAL PRIMARY KEY,
  slug VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  icon VARCHAR(50) NOT NULL,
  color VARCHAR(20) NOT NULL,
  default_unit VARCHAR(25) NOT NULL,
  default_target_value NUMERIC(10, 2)
);

CREATE TABLE user_habits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  habit_type_id SMALLINT NOT NULL REFERENCES habit_types(id) ON DELETE RESTRICT,
  custom_name VARCHAR(120),
  target_value NUMERIC(10, 2) NOT NULL,
  target_unit VARCHAR(25) NOT NULL,
  reminder_enabled BOOLEAN DEFAULT FALSE,
  reminder_interval_minutes INTEGER,
  reminder_time TIME,
  timezone VARCHAR(100),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE water_settings (
  user_habit_id INTEGER PRIMARY KEY REFERENCES user_habits(id) ON DELETE CASCADE,
  use_recommended_target BOOLEAN DEFAULT TRUE,
  recommended_target_ml INTEGER NOT NULL,
  custom_target_ml INTEGER,
  reminder_interval_minutes INTEGER DEFAULT 120,
  last_recalculated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sleep_schedules (
  user_habit_id INTEGER PRIMARY KEY REFERENCES user_habits(id) ON DELETE CASCADE,
  bed_time TIME NOT NULL,
  wake_time TIME NOT NULL,
  reminder_enabled BOOLEAN DEFAULT TRUE,
  reminder_advance_minutes INTEGER DEFAULT 30,
  timezone VARCHAR(100)
);

CREATE TABLE nutrition_meals (
  id BIGSERIAL PRIMARY KEY,
  user_habit_id INTEGER NOT NULL REFERENCES user_habits(id) ON DELETE CASCADE,
  meal_code VARCHAR(40) NOT NULL,
  label VARCHAR(100) NOT NULL,
  scheduled_time TIME NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  reminder_enabled BOOLEAN DEFAULT TRUE,
  UNIQUE (user_habit_id, meal_code)
);

CREATE TABLE exercise_preferences (
  user_habit_id INTEGER PRIMARY KEY REFERENCES user_habits(id) ON DELETE CASCADE,
  reminder_enabled BOOLEAN DEFAULT TRUE,
  reminder_time TIME,
  daily_goal_minutes INTEGER DEFAULT 30,
  focus_area VARCHAR(120)
);

CREATE TABLE habit_entries (
  id BIGSERIAL PRIMARY KEY,
  user_habit_id INTEGER NOT NULL REFERENCES user_habits(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  value NUMERIC(10, 2) NOT NULL,
  notes VARCHAR(255),
  source habit_entry_source_enum DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_entries_habit_date ON habit_entries (user_habit_id, entry_date);

CREATE TABLE habit_reminders (
  id BIGSERIAL PRIMARY KEY,
  user_habit_id INTEGER NOT NULL REFERENCES user_habits(id) ON DELETE CASCADE,
  reminder_time TIME NOT NULL,
  day_of_week SMALLINT,
  frequency habit_reminder_frequency_enum DEFAULT 'daily',
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_habit_id INTEGER REFERENCES user_habits(id) ON DELETE SET NULL,
  title VARCHAR(150) NOT NULL,
  message VARCHAR(255) NOT NULL,
  type notification_type_enum DEFAULT 'reminder',
  channel notification_channel_type DEFAULT 'in_app',
  scheduled_for TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications (user_id);
CREATE INDEX idx_notifications_schedule ON notifications (scheduled_for);

CREATE TABLE notification_channels (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel notification_channel_type NOT NULL,
  address VARCHAR(255) NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, channel, address)
);

-- Datos de ejemplo ---------------------------------------------------------

INSERT INTO users (name, email, password_hash)
VALUES (
  'María Gómez',
  'maria@example.com',
  '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Gf3.cVQ/6Z3Y0JVpaz6RtZpmjH8u'
);

INSERT INTO habit_types (slug, name, icon, color, default_unit, default_target_value)
VALUES
  ('water', 'Consumo de Agua', 'Droplets', '#2563eb', 'ml', 2000),
  ('sleep', 'Sueño', 'Moon', '#7c3aed', 'horas', 8),
  ('exercise', 'Ejercicio', 'Dumbbell', '#16a34a', 'minutos', 30),
  ('nutrition', 'Alimentación Saludable', 'Apple', '#f97316', 'comidas', 3);

-- Configuración de hábitos por usuario
WITH water_type AS (
  SELECT id, default_target_value, default_unit FROM habit_types WHERE slug = 'water'
), water_habit AS (
  INSERT INTO user_habits (user_id, habit_type_id, custom_name, target_value, target_unit, reminder_enabled, reminder_interval_minutes, reminder_time, timezone)
  SELECT 1, id, NULL, default_target_value, default_unit, TRUE, 120, NULL, 'America/Bogota'
  FROM water_type
  RETURNING id
)
INSERT INTO water_settings (user_habit_id, use_recommended_target, recommended_target_ml, custom_target_ml, reminder_interval_minutes)
SELECT id, TRUE, 2200, NULL, 120 FROM water_habit;

WITH sleep_type AS (
  SELECT id, default_target_value, default_unit FROM habit_types WHERE slug = 'sleep'
), sleep_habit AS (
  INSERT INTO user_habits (user_id, habit_type_id, custom_name, target_value, target_unit, reminder_enabled, reminder_interval_minutes, reminder_time, timezone)
  SELECT 1, id, NULL, default_target_value, default_unit, TRUE, NULL, TIME '22:30:00', 'America/Bogota'
  FROM sleep_type
  RETURNING id
)
INSERT INTO sleep_schedules (user_habit_id, bed_time, wake_time, reminder_enabled, reminder_advance_minutes, timezone)
SELECT id, TIME '22:30:00', TIME '06:30:00', TRUE, 30, 'America/Bogota' FROM sleep_habit;

WITH exercise_type AS (
  SELECT id, default_target_value, default_unit FROM habit_types WHERE slug = 'exercise'
), exercise_habit AS (
  INSERT INTO user_habits (user_id, habit_type_id, custom_name, target_value, target_unit, reminder_enabled, reminder_interval_minutes, reminder_time, timezone)
  SELECT 1, id, NULL, default_target_value, default_unit, TRUE, NULL, TIME '07:00:00', 'America/Bogota'
  FROM exercise_type
  RETURNING id
)
INSERT INTO exercise_preferences (user_habit_id, reminder_enabled, reminder_time, daily_goal_minutes, focus_area)
SELECT id, TRUE, TIME '07:00:00', 35, 'Fuerza y resistencia' FROM exercise_habit;

WITH nutrition_type AS (
  SELECT id, default_target_value, default_unit FROM habit_types WHERE slug = 'nutrition'
), nutrition_habit AS (
  INSERT INTO user_habits (user_id, habit_type_id, custom_name, target_value, target_unit, reminder_enabled, reminder_interval_minutes, reminder_time, timezone)
  SELECT 1, id, NULL, default_target_value, default_unit, TRUE, NULL, NULL, 'America/Bogota'
  FROM nutrition_type
  RETURNING id
)
INSERT INTO nutrition_meals (user_habit_id, meal_code, label, scheduled_time, enabled, reminder_enabled)
SELECT nh.id, meals.meal_code, meals.label, meals.scheduled_time, meals.enabled, meals.reminder_enabled
FROM nutrition_habit AS nh
JOIN (VALUES
  ('breakfast', 'Desayuno', TIME '08:00:00', TRUE, TRUE),
  ('lunch', 'Almuerzo', TIME '13:00:00', TRUE, TRUE),
  ('dinner', 'Cena', TIME '20:00:00', TRUE, TRUE)
) AS meals(meal_code, label, scheduled_time, enabled, reminder_enabled) ON TRUE;

-- Historial de métricas
INSERT INTO user_metrics (user_id, metric_date, weight_kg, water_goal_ml, sleep_goal_hours, exercise_goal_minutes, notes)
VALUES
  (1, CURRENT_DATE - INTERVAL '2 days', 64.8, 2200, 8.0, 35, 'Semana con mucha energía'),
  (1, CURRENT_DATE - INTERVAL '1 day', 64.6, 2200, 8.0, 35, 'Seguimiento estable');

-- Registros de hábitos recientes
WITH water AS (
  SELECT uh.id FROM user_habits uh JOIN habit_types ht ON ht.id = uh.habit_type_id WHERE uh.user_id = 1 AND ht.slug = 'water'
), sleep AS (
  SELECT uh.id FROM user_habits uh JOIN habit_types ht ON ht.id = uh.habit_type_id WHERE uh.user_id = 1 AND ht.slug = 'sleep'
), exercise AS (
  SELECT uh.id FROM user_habits uh JOIN habit_types ht ON ht.id = uh.habit_type_id WHERE uh.user_id = 1 AND ht.slug = 'exercise'
), nutrition AS (
  SELECT uh.id FROM user_habits uh JOIN habit_types ht ON ht.id = uh.habit_type_id WHERE uh.user_id = 1 AND ht.slug = 'nutrition'
)
INSERT INTO habit_entries (user_habit_id, entry_date, logged_at, value, notes, source)
SELECT water.id, CURRENT_DATE, CURRENT_DATE + TIME '08:30:00', 250, 'Vaso de agua al despertar', 'manual' FROM water
UNION ALL
SELECT water.id, CURRENT_DATE, CURRENT_DATE + TIME '12:15:00', 500, 'Botella durante el almuerzo', 'manual' FROM water
UNION ALL
SELECT water.id, CURRENT_DATE, CURRENT_DATE + TIME '15:45:00', 750, 'Botella grande después de entrenar', 'manual' FROM water
UNION ALL
SELECT water.id, CURRENT_DATE, CURRENT_DATE + TIME '18:30:00', 250, 'Vaso de agua', 'manual' FROM water
UNION ALL
SELECT sleep.id, CURRENT_DATE - INTERVAL '1 day', (CURRENT_DATE - INTERVAL '1 day') + TIME '22:30:00', 8, 'Dormí muy bien', 'manual' FROM sleep
UNION ALL
SELECT exercise.id, CURRENT_DATE - INTERVAL '1 day', (CURRENT_DATE - INTERVAL '1 day') + TIME '07:30:00', 35, 'Rutina de fuerza', 'manual' FROM exercise
UNION ALL
SELECT nutrition.id, CURRENT_DATE - INTERVAL '1 day', (CURRENT_DATE - INTERVAL '1 day') + TIME '13:00:00', 3, 'Comidas completas y saludables', 'manual' FROM nutrition;

-- Recordatorios configurados
WITH water AS (
  SELECT uh.id FROM user_habits uh JOIN habit_types ht ON ht.id = uh.habit_type_id WHERE uh.user_id = 1 AND ht.slug = 'water'
), sleep AS (
  SELECT uh.id FROM user_habits uh JOIN habit_types ht ON ht.id = uh.habit_type_id WHERE uh.user_id = 1 AND ht.slug = 'sleep'
), exercise AS (
  SELECT uh.id FROM user_habits uh JOIN habit_types ht ON ht.id = uh.habit_type_id WHERE uh.user_id = 1 AND ht.slug = 'exercise'
), nutrition AS (
  SELECT uh.id FROM user_habits uh JOIN habit_types ht ON ht.id = uh.habit_type_id WHERE uh.user_id = 1 AND ht.slug = 'nutrition'
)
INSERT INTO habit_reminders (user_habit_id, reminder_time, day_of_week, frequency, enabled)
SELECT water.id, TIME '09:00:00', NULL, 'daily', TRUE FROM water
UNION ALL
SELECT water.id, TIME '15:00:00', NULL, 'daily', TRUE FROM water
UNION ALL
SELECT sleep.id, TIME '22:00:00', NULL, 'daily', TRUE FROM sleep
UNION ALL
SELECT exercise.id, TIME '06:30:00', NULL, 'weekdays', TRUE FROM exercise
UNION ALL
SELECT nutrition.id, TIME '12:30:00', NULL, 'daily', TRUE FROM nutrition;

-- Notificaciones de ejemplo
WITH water AS (
  SELECT uh.id FROM user_habits uh JOIN habit_types ht ON ht.id = uh.habit_type_id WHERE uh.user_id = 1 AND ht.slug = 'water'
), exercise AS (
  SELECT uh.id FROM user_habits uh JOIN habit_types ht ON ht.id = uh.habit_type_id WHERE uh.user_id = 1 AND ht.slug = 'exercise'
)
INSERT INTO notifications (user_id, user_habit_id, title, message, type, channel, scheduled_for)
SELECT 1, water.id, '💧 ¡Es hora de beber agua!', 'Te quedan 500ml para cumplir tu meta diaria.', 'reminder', 'push', CURRENT_DATE + TIME '17:00:00' FROM water
UNION ALL
SELECT 1, exercise.id, '🔥 ¡Gran trabajo!', 'Completaste tu objetivo de ejercicio ayer.', 'achievement', 'in_app', NULL FROM exercise
UNION ALL
SELECT 1, NULL, '✨ Racha de Hábitos', 'Llevas 7 días manteniendo tu racha.', 'achievement', 'in_app', NULL;

INSERT INTO notification_channels (user_id, channel, address, verified_at)
VALUES
  (1, 'push', 'expo-push-token[demo]', CURRENT_TIMESTAMP),
  (1, 'email', 'maria@example.com', CURRENT_TIMESTAMP);
