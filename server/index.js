import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getClient, query } from './db.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.SERVER_PORT ?? 3000);
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be defined in the environment');
}

const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};

const formatProgressText = (value, target, unit) => {
  const roundedValue = Number(value);
  const roundedTarget = Number(target);

  if (unit === 'ml' && roundedValue >= 1000) {
    const liters = (roundedValue / 1000).toFixed(1);
    const targetLiters = (roundedTarget / 1000).toFixed(1);
    return `${liters}L de ${targetLiters}L`;
  }

  return `${roundedValue} ${unit} de ${roundedTarget} ${unit}`;
};

const toIntegerOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

const toNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toPublicUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  height: toIntegerOrNull(row.height ?? row.height_cm),
  weight: toIntegerOrNull(row.weight ?? row.weight_kg),
  age: toIntegerOrNull(row.age),
  createdAt: row.createdAt ?? row.created_at,
  updatedAt: row.updatedAt ?? row.updated_at,
});

const computeRecommendedWater = (heightCm, weightKg) => {
  const height = Number(heightCm);
  const weight = Number(weightKg);

  if (!Number.isFinite(height) || !Number.isFinite(weight)) {
    return 2000;
  }

  const base = weight * 35;
  const heightAdjustment = Math.max(0, height - 150) * 5;
  return Math.round(base + heightAdjustment);
};

const createToken = (userId) =>
  jwt.sign(
    {
      userId,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token de autenticación requerido' });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ message: 'Token de autenticación requerido' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload?.userId) {
      return res.status(401).json({ message: 'Token inválido' });
    }

    const userId = Number(payload.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ message: 'Token inválido' });
    }

    req.userId = userId;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post(
  '/api/auth/register',
  asyncHandler(async (req, res) => {
    const { name, email, password, height, weight, age } = req.body ?? {};

  if (!name || !email || !password || !height || !weight || !age) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedName = String(name).trim();
    const numericHeight = height === undefined || height === null ? null : toIntegerOrNull(height);
    const numericWeight = weight === undefined || weight === null ? null : toIntegerOrNull(weight);
    const numericAge = age === undefined || age === null ? null : toIntegerOrNull(age);

    if ((height !== undefined && numericHeight === null) || (weight !== undefined && numericWeight === null)) {
      return res.status(400).json({ message: 'Altura y peso deben ser valores numéricos' });
    }

    if (age !== undefined && numericAge === null) {
      return res.status(400).json({ message: 'Edad inválida' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        `INSERT INTO users (name, email, password_hash, height_cm, weight_kg, age)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, email, height_cm AS "height", weight_kg AS "weight", age, created_at AS "createdAt", updated_at AS "updatedAt"`,
        [normalizedName, normalizedEmail, passwordHash, numericHeight, numericWeight, numericAge]
      );

      const [user] = userResult.rows;
      if (!user) {
        await client.query('ROLLBACK');
        return res.status(500).json({ message: 'No se pudo crear el usuario' });
      }

      const habitTypesResult = await client.query(
        `SELECT id, slug, default_unit AS "defaultUnit", default_target_value AS "defaultTarget"
         FROM habit_types
         WHERE slug = ANY($1)`,
        [[
          'water',
          'sleep',
          'exercise',
          'nutrition',
        ]]
      );

      const habitsBySlug = new Map(habitTypesResult.rows.map((row) => [row.slug, row]));
      const waterType = habitsBySlug.get('water');
      const sleepType = habitsBySlug.get('sleep');
      const exerciseType = habitsBySlug.get('exercise');
      const nutritionType = habitsBySlug.get('nutrition');

      const waterGoal = computeRecommendedWater(numericHeight ?? 170, numericWeight ?? 65);
      const timezone = 'UTC';

      if (waterType) {
        const waterHabit = await client.query(
          `INSERT INTO user_habits (user_id, habit_type_id, target_value, target_unit, reminder_enabled, reminder_interval_minutes, timezone)
           VALUES ($1, $2, $3, $4, TRUE, $5, $6)
           RETURNING id`,
          [user.id, waterType.id, waterGoal, waterType.defaultUnit, 120, timezone]
        );

        const [waterHabitRow] = waterHabit.rows;
        if (waterHabitRow) {
          await client.query(
            `INSERT INTO water_settings (user_habit_id, use_recommended_target, recommended_target_ml, custom_target_ml, reminder_interval_minutes)
             VALUES ($1, TRUE, $2, NULL, $3)
             ON CONFLICT (user_habit_id)
             DO UPDATE SET
               use_recommended_target = EXCLUDED.use_recommended_target,
               recommended_target_ml = EXCLUDED.recommended_target_ml,
               custom_target_ml = EXCLUDED.custom_target_ml,
               reminder_interval_minutes = EXCLUDED.reminder_interval_minutes,
               last_recalculated_at = CURRENT_TIMESTAMP`,
            [waterHabitRow.id, waterGoal, 120]
          );
        }
      }

      if (sleepType) {
        const sleepHabit = await client.query(
          `INSERT INTO user_habits (user_id, habit_type_id, target_value, target_unit, reminder_enabled, reminder_time, timezone)
           VALUES ($1, $2, $3, $4, TRUE, TIME '22:30:00', $5)
           RETURNING id`,
          [user.id, sleepType.id, sleepType.defaultTarget ?? 8, sleepType.defaultUnit, timezone]
        );

        const [sleepHabitRow] = sleepHabit.rows;
        if (sleepHabitRow) {
          await client.query(
            `INSERT INTO sleep_schedules (user_habit_id, bed_time, wake_time, reminder_enabled, reminder_advance_minutes)
             VALUES ($1, TIME '22:30:00', TIME '06:30:00', TRUE, 30)
             ON CONFLICT (user_habit_id)
             DO UPDATE SET
               bed_time = EXCLUDED.bed_time,
               wake_time = EXCLUDED.wake_time,
               reminder_enabled = EXCLUDED.reminder_enabled,
               reminder_advance_minutes = EXCLUDED.reminder_advance_minutes`,
            [sleepHabitRow.id]
          );
        }
      }

      if (exerciseType) {
        const exerciseHabit = await client.query(
          `INSERT INTO user_habits (user_id, habit_type_id, target_value, target_unit, reminder_enabled, reminder_time, timezone)
           VALUES ($1, $2, $3, $4, TRUE, TIME '18:00:00', $5)
           RETURNING id`,
          [
            user.id,
            exerciseType.id,
            exerciseType.defaultTarget ?? 30,
            exerciseType.defaultUnit,
            timezone,
          ]
        );

        const [exerciseHabitRow] = exerciseHabit.rows;
        if (exerciseHabitRow) {
await client.query(
  `INSERT INTO exercise_preferences (user_habit_id, reminder_enabled, reminder_time, daily_goal_minutes)
   VALUES ($1, TRUE, TIME '18:00:00', $2)
   ON CONFLICT (user_habit_id)
   DO UPDATE SET
     reminder_enabled = EXCLUDED.reminder_enabled,
     reminder_time = EXCLUDED.reminder_time,
     daily_goal_minutes = EXCLUDED.daily_goal_minutes`,
  [exerciseHabitRow.id, Math.round(Number(exerciseType.defaultTarget ?? 30))]
);

        }
      }

      if (nutritionType) {
        const nutritionHabit = await client.query(
          `INSERT INTO user_habits (user_id, habit_type_id, target_value, target_unit, reminder_enabled, timezone)
           VALUES ($1, $2, $3, $4, TRUE, $5)
           RETURNING id`,
          [
            user.id,
            nutritionType.id,
            nutritionType.defaultTarget ?? 3,
            nutritionType.defaultUnit,
            timezone,
          ]
        );

        const [nutritionHabitRow] = nutritionHabit.rows;
        if (nutritionHabitRow) {
          const meals = [
            { code: 'breakfast', label: 'Desayuno', time: '08:00:00' },
            { code: 'lunch', label: 'Almuerzo', time: '13:00:00' },
            { code: 'dinner', label: 'Cena', time: '20:00:00' },
          ];

          await client.query('DELETE FROM nutrition_meals WHERE user_habit_id = $1', [nutritionHabitRow.id]);

          for (const meal of meals) {
            await client.query(
              `INSERT INTO nutrition_meals (user_habit_id, meal_code, label, scheduled_time, enabled, reminder_enabled)
               VALUES ($1, $2, $3, $4::time, TRUE, TRUE)
               ON CONFLICT (user_habit_id, meal_code)
               DO UPDATE SET
                 label = EXCLUDED.label,
                 scheduled_time = EXCLUDED.scheduled_time,
                 enabled = EXCLUDED.enabled,
                 reminder_enabled = EXCLUDED.reminder_enabled`,
              [nutritionHabitRow.id, meal.code, meal.label, meal.time]
            );
          }
        }
      }

      await client.query('COMMIT');

      const token = createToken(user.id);
      res.status(201).json({
        token,
        user: toPublicUser(user),
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error al registrar usuario:', error);
      res.status(500).json({ message: 'No se pudo crear el usuario' });
    } finally {
      client.release();
    }
  })
);

app.post(
  '/api/auth/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Correo y contraseña son obligatorios' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const found = await query(
      `SELECT id, name, email, password_hash AS "passwordHash", height_cm AS "height", weight_kg AS "weight", age, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    );

    const [user] = found;
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const isValidPassword = await bcrypt.compare(String(password), user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = createToken(user.id);

    const { passwordHash: _passwordHash, ...rest } = user;

    res.json({
      token,
      user: toPublicUser(rest),
    });
  })
);

app.get(
  '/api/auth/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT id, name, email, height_cm AS "height", weight_kg AS "weight", age, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users
       WHERE id = $1`,
      [req.userId]
    );

    const [user] = result;
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ user: toPublicUser(user) });
  })
);

app.patch(
  '/api/auth/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { name, height, weight, age } = req.body ?? {};

    const updates = [];
    const params = [];

    if (name !== undefined) {
      const normalizedName = String(name).trim();
      if (!normalizedName) {
        return res.status(400).json({ message: 'El nombre no puede estar vacío' });
      }
      params.push(normalizedName);
      updates.push(`name = $${params.length}`);
    }

    if (height !== undefined) {
      const numericHeight = toIntegerOrNull(height);
      if (numericHeight === null) {
        return res.status(400).json({ message: 'Altura inválida' });
      }
      params.push(numericHeight);
      updates.push(`height_cm = $${params.length}`);
    }

    if (weight !== undefined) {
      const numericWeight = toIntegerOrNull(weight);
      if (numericWeight === null) {
        return res.status(400).json({ message: 'Peso inválido' });
      }
      params.push(numericWeight);
      updates.push(`weight_kg = $${params.length}`);
    }

    if (age !== undefined) {
      const numericAge = toIntegerOrNull(age);
      if (numericAge === null) {
        return res.status(400).json({ message: 'Edad inválida' });
      }
      params.push(numericAge);
      updates.push(`age = $${params.length}`);
    }

    if (!updates.length) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');
      params.push(req.userId);

      const result = await client.query(
        `UPDATE users
         SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $${params.length}
         RETURNING id, name, email, height_cm AS "height", weight_kg AS "weight", age, created_at AS "createdAt", updated_at AS "updatedAt"`,
        params
      );

      const updatedUser = result.rows[0];
      if (!updatedUser) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const waterHabitResult = await client.query(
        `SELECT uh.id
         FROM user_habits AS uh
         INNER JOIN habit_types AS ht ON ht.id = uh.habit_type_id
         WHERE uh.user_id = $1 AND ht.slug = 'water'
         LIMIT 1`,
        [req.userId]
      );

      const waterHabit = waterHabitResult.rows[0];
      if (waterHabit) {
        const waterGoal = computeRecommendedWater(updatedUser.height, updatedUser.weight);

        const waterSettingsResult = await client.query(
          `SELECT use_recommended_target AS "useRecommended", reminder_interval_minutes AS "reminderInterval"
           FROM water_settings
           WHERE user_habit_id = $1`,
          [waterHabit.id]
        );

        const waterSettings = waterSettingsResult.rows[0];

        await client.query(
          `UPDATE water_settings
           SET recommended_target_ml = $1, last_recalculated_at = CURRENT_TIMESTAMP
           WHERE user_habit_id = $2`,
          [waterGoal, waterHabit.id]
        );

        if (!waterSettings || waterSettings.useRecommended) {
          await client.query(
            `UPDATE user_habits
             SET target_value = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [waterGoal, waterHabit.id]
          );
        }
      }

      await client.query('COMMIT');

      res.json({ user: toPublicUser(updatedUser) });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error al actualizar perfil:', error);
      res.status(500).json({ message: 'No se pudo actualizar el perfil' });
    } finally {
      client.release();
    }
  })
);

app.patch(
  '/api/habits/settings',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { type } = req.body ?? {};

    if (!type || typeof type !== 'string') {
      return res.status(400).json({ message: 'Tipo de hábito requerido' });
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      const habitResult = await client.query(
        `SELECT uh.id, uh.target_value AS "targetValue", uh.reminder_interval_minutes AS "reminderInterval", ht.slug
         FROM user_habits AS uh
         INNER JOIN habit_types AS ht ON ht.id = uh.habit_type_id
         WHERE uh.user_id = $1 AND ht.slug = $2
         LIMIT 1`,
        [req.userId, type]
      );

      const habit = habitResult.rows[0];
      if (!habit) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Hábito no encontrado' });
      }

      let responsePayload = { type: habit.slug };

      if (habit.slug === 'water') {
        const userMetricsResult = await client.query(
          `SELECT height_cm AS "height", weight_kg AS "weight"
           FROM users
           WHERE id = $1`,
          [req.userId]
        );

        const metrics = userMetricsResult.rows[0] ?? { height: null, weight: null };
        const previousSettingsResult = await client.query(
          `SELECT use_recommended_target AS "useRecommendedTarget",
                  recommended_target_ml AS "recommendedTarget",
                  custom_target_ml AS "customTarget",
                  reminder_interval_minutes AS "reminderInterval"
           FROM water_settings
           WHERE user_habit_id = $1`,
          [habit.id]
        );

        const previous = previousSettingsResult.rows[0] ?? {};

        const fallbackReminder =
          previous.reminderInterval ?? habit.reminderInterval ?? 120;

        const useRecommendedTarget =
          req.body.useRecommendedTarget !== undefined
            ? Boolean(req.body.useRecommendedTarget)
            : previous.useRecommendedTarget ?? true;

        const requestedTarget =
          req.body.targetValue !== undefined ? toIntegerOrNull(req.body.targetValue) : null;

        if (req.body.targetValue !== undefined && (requestedTarget === null || requestedTarget <= 0)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Meta de hábito inválida' });
        }

        let customTarget =
          req.body.customTarget !== undefined
            ? toIntegerOrNull(req.body.customTarget)
            : previous.customTarget ?? null;

        if (req.body.customTarget !== undefined && (customTarget === null || customTarget <= 0)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Meta personalizada inválida' });
        }

        const recommendedTarget = computeRecommendedWater(metrics.height, metrics.weight);

        let resolvedTarget = recommendedTarget;
        if (useRecommendedTarget) {
          resolvedTarget = requestedTarget && requestedTarget > 0 ? requestedTarget : recommendedTarget;
          customTarget = null;
        } else {
          if (requestedTarget && requestedTarget > 0) {
            customTarget = requestedTarget;
          }

          if (customTarget === null || customTarget <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Debes indicar una meta personalizada válida' });
          }
          resolvedTarget = customTarget;
        }

        const reminderInterval =
          req.body.reminderInterval !== undefined
            ? toIntegerOrNull(req.body.reminderInterval)
            : previous.reminderInterval ?? habit.reminderInterval ?? null;

        if (req.body.reminderInterval !== undefined && (!reminderInterval || reminderInterval <= 0)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Intervalo de recordatorio inválido' });
        }

        const reminderIntervalValue = reminderInterval ?? fallbackReminder;

        await client.query(
          `UPDATE user_habits
           SET target_value = $1,
               reminder_interval_minutes = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [resolvedTarget, reminderIntervalValue, habit.id]
        );

        await client.query(
  `INSERT INTO water_settings (user_habit_id, use_recommended_target, recommended_target_ml, custom_target_ml, reminder_interval_minutes)
   VALUES ($1, $2, $3, $4, $5)
   ON CONFLICT (user_habit_id)
   DO UPDATE SET
     use_recommended_target = EXCLUDED.use_recommended_target,
     recommended_target_ml = EXCLUDED.recommended_target_ml,
     custom_target_ml = EXCLUDED.custom_target_ml,
     reminder_interval_minutes = EXCLUDED.reminder_interval_minutes,
     last_recalculated_at = CURRENT_TIMESTAMP`,
     
  [
    
    habit.id,
    useRecommendedTarget,
    Math.round(Number(recommendedTarget ?? 0)),
    customTarget ? Math.round(Number(customTarget)) : null,
    Math.round(Number(reminderIntervalValue ?? 120)),
  ]
);


        responsePayload = {
          type: 'water',
          targetValue: resolvedTarget,
          recommendedTarget,
          customTarget,
          useRecommendedTarget,
          reminderInterval: reminderIntervalValue,
        };
      } else if (habit.slug === 'sleep') {
        const previous = await client.query(
          `SELECT bed_time AS "bedTime",
                  wake_time AS "wakeTime",
                  reminder_enabled AS "reminderEnabled",
                  reminder_advance_minutes AS "reminderAdvance"
           FROM sleep_schedules
           WHERE user_habit_id = $1`,
          [habit.id]
        );

        const previousSettings = previous.rows[0] ?? {
          bedTime: '22:30:00',
          wakeTime: '06:30:00',
          reminderEnabled: true,
          reminderAdvance: 30,
        };

        const existingTarget =
          habit.targetValue !== undefined && habit.targetValue !== null
            ? Number(habit.targetValue)
            : null;

        const isValidTime = (value) => typeof value === 'string' && /^\d{2}:\d{2}$/.test(value);
        const formatTime = (value) => (value.length === 5 ? `${value}:00` : value);

        let bedTime = previousSettings.bedTime;
        if (req.body.bedTime !== undefined) {
          if (!isValidTime(req.body.bedTime)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Hora de dormir inválida' });
          }
          bedTime = formatTime(req.body.bedTime);
        }

        let wakeTime = previousSettings.wakeTime;
        if (req.body.wakeTime !== undefined) {
          if (!isValidTime(req.body.wakeTime)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Hora de despertar inválida' });
          }
          wakeTime = formatTime(req.body.wakeTime);
        }

        const reminderEnabled =
          req.body.reminderEnabled !== undefined
            ? Boolean(req.body.reminderEnabled)
            : Boolean(previousSettings.reminderEnabled);

        const reminderAdvance =
          req.body.reminderAdvance !== undefined
            ? toIntegerOrNull(req.body.reminderAdvance)
            : toIntegerOrNull(previousSettings.reminderAdvance) ?? 30;

        if (req.body.reminderAdvance !== undefined && (reminderAdvance === null || reminderAdvance < 0)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Anticipación de recordatorio inválida' });
        }

        const targetValue =
          req.body.targetValue !== undefined
            ? toNumberOrNull(req.body.targetValue)
            : existingTarget;

        if (req.body.targetValue !== undefined && (targetValue === null || targetValue <= 0)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Meta de sueño inválida' });
        }

        if (targetValue !== null && targetValue > 0) {
          await client.query(
            `UPDATE user_habits
             SET target_value = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [targetValue, habit.id]
          );
        }

        await client.query(
          `INSERT INTO sleep_schedules (user_habit_id, bed_time, wake_time, reminder_enabled, reminder_advance_minutes)
           VALUES ($1, $2::time, $3::time, $4, $5)
           ON CONFLICT (user_habit_id)
           DO UPDATE SET
             bed_time = EXCLUDED.bed_time,
             wake_time = EXCLUDED.wake_time,
             reminder_enabled = EXCLUDED.reminder_enabled,
             reminder_advance_minutes = EXCLUDED.reminder_advance_minutes`,
          [habit.id, bedTime, wakeTime, reminderEnabled, reminderAdvance ?? 30]
        );

        responsePayload = {
          type: 'sleep',
          bedTime: bedTime.slice(0, 5),
          wakeTime: wakeTime.slice(0, 5),
          reminderEnabled,
          reminderAdvance: reminderAdvance ?? 30,
          reminderAdvanceMinutes: reminderAdvance ?? 30,
          targetValue: targetValue ?? undefined,
        };
      } else if (habit.slug === 'exercise') {
        const previous = await client.query(
          `SELECT reminder_enabled AS "reminderEnabled",
                  reminder_time AS "reminderTime",
                  daily_goal_minutes AS "dailyGoal"
           FROM exercise_preferences
           WHERE user_habit_id = $1`,
          [habit.id]
        );

        const previousSettings = previous.rows[0] ?? {
          reminderEnabled: true,
          reminderTime: '18:00:00',
          dailyGoal: 30,
        };

        const existingDailyGoal =
          toIntegerOrNull(previousSettings.dailyGoal) ??
          toIntegerOrNull(habit.targetValue) ??
          30;

        const isValidTime = (value) => typeof value === 'string' && /^\d{2}:\d{2}$/.test(value);
        const formatTime = (value) => (value.length === 5 ? `${value}:00` : value);

        const reminderEnabled =
          req.body.reminderEnabled !== undefined
            ? Boolean(req.body.reminderEnabled)
            : Boolean(previousSettings.reminderEnabled);

        let reminderTime = previousSettings.reminderTime;
        if (req.body.reminderTime !== undefined) {
          if (!isValidTime(req.body.reminderTime)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Hora de recordatorio inválida' });
          }
          reminderTime = formatTime(req.body.reminderTime);
        }

        const dailyGoalMinutes =
          req.body.dailyGoalMinutes !== undefined
            ? toIntegerOrNull(req.body.dailyGoalMinutes)
            : existingDailyGoal;

        if (req.body.dailyGoalMinutes !== undefined && (!dailyGoalMinutes || dailyGoalMinutes <= 0)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Meta de ejercicio inválida' });
        }

        await client.query(
          `UPDATE user_habits
           SET target_value = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [dailyGoalMinutes, habit.id]
        );

        await client.query(
          `INSERT INTO exercise_preferences (user_habit_id, reminder_enabled, reminder_time, daily_goal_minutes)
           VALUES ($1, $2, $3::time, $4)
           ON CONFLICT (user_habit_id)
           DO UPDATE SET
             reminder_enabled = EXCLUDED.reminder_enabled,
             reminder_time = EXCLUDED.reminder_time,
             daily_goal_minutes = EXCLUDED.daily_goal_minutes`,
          [habit.id, reminderEnabled, reminderTime, dailyGoalMinutes]
        );


        responsePayload = {
          type: 'exercise',
          reminderEnabled,
          reminderTime: reminderTime.slice(0, 5),
          dailyGoalMinutes,
        };
      } else if (habit.slug === 'nutrition') {
        const remindersEnabled =
          req.body.remindersEnabled !== undefined
            ? Boolean(req.body.remindersEnabled)
            : true;

        const meals = Array.isArray(req.body.meals) ? req.body.meals : [];

        if (!meals.length) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Debes enviar al menos una comida para actualizar' });
        }

        const isValidTime = (value) => typeof value === 'string' && /^\d{2}:\d{2}$/.test(value);
        const formatTime = (value) => (value.length === 5 ? `${value}:00` : value);

        let enabledMeals = 0;
        await client.query('DELETE FROM nutrition_meals WHERE user_habit_id = $1', [habit.id]);

        for (const meal of meals) {
          if (!meal || typeof meal !== 'object') {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Formato de comida inválido' });
          }

          const code = meal.id ?? meal.code;
          const label = meal.label ?? meal.name;
          const time = meal.time ?? meal.localTime;
          const enabled = meal.enabled !== undefined ? Boolean(meal.enabled) : true;

          if (!code || !label || !isValidTime(time)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Datos de comida incompletos' });
          }

          if (enabled) {
            enabledMeals += 1;
          }

          await client.query(
            `INSERT INTO nutrition_meals (user_habit_id, meal_code, label, scheduled_time, enabled, reminder_enabled)
             VALUES ($1, $2, $3, $4::time, $5, $6)
             ON CONFLICT (user_habit_id, meal_code)
             DO UPDATE SET
               label = EXCLUDED.label,
               scheduled_time = EXCLUDED.scheduled_time,
               enabled = EXCLUDED.enabled,
               reminder_enabled = EXCLUDED.reminder_enabled`,
            [habit.id, code, label, formatTime(time), enabled, remindersEnabled]
          );
        }

        const fallbackTarget = (toIntegerOrNull(habit.targetValue) ?? meals.length) || 3;
        const targetValue = enabledMeals > 0 ? enabledMeals : fallbackTarget;

        await client.query(
          `UPDATE user_habits
           SET target_value = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [targetValue, habit.id]
        );

        responsePayload = {
          type: 'nutrition',
          remindersEnabled,
          meals: meals.map((meal) => ({
            id: meal.id ?? meal.code,
            label: meal.label ?? meal.name,
            time: (meal.time ?? meal.localTime)?.slice(0, 5),
            enabled: meal.enabled !== undefined ? Boolean(meal.enabled) : true,
          })),
          targetValue,
        };
      } else {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Tipo de hábito no soportado' });
      }

      await client.query('COMMIT');

      res.json({ habitId: habit.id, settings: responsePayload });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error al actualizar ajustes de hábito:', error);
      res.status(500).json({ message: 'No se pudieron actualizar los ajustes' });
    } finally {
      client.release();
    }
  })
);

app.get(
  '/api/dashboard',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    const requestedDate = req.query.date
      ? dayjs(req.query.date)
      : dayjs();

    if (!requestedDate.isValid()) {
      return res.status(400).json({ message: 'Fecha inválida' });
    }

    const date = requestedDate.format('YYYY-MM-DD');

    const habits = await query(
      `SELECT
         uh.id,
         ht.slug,
         COALESCE(uh.custom_name, ht.name) AS name,
         ht.icon,
         ht.color,
         uh.target_value AS "targetValue",
         uh.target_unit AS "targetUnit"
       FROM user_habits AS uh
       INNER JOIN habit_types AS ht ON ht.id = uh.habit_type_id
       WHERE uh.user_id = $1
       ORDER BY uh.id ASC`,
      [userId]
    );

    if (!habits.length) {
      return res.json({
        date,
        totalHabits: 0,
        completedHabits: 0,
        completionPercentage: 0,
        habits: [],
        reminders: [],
      });
    }

    const entries = await query(
      `SELECT he.user_habit_id AS "habitId", SUM(he.value) AS "totalValue"
       FROM habit_entries AS he
       INNER JOIN user_habits AS uh ON uh.id = he.user_habit_id
       WHERE uh.user_id = $1 AND he.entry_date = $2
       GROUP BY he.user_habit_id`,
      [userId, date]
    );

    const entryByHabit = new Map(entries.map((item) => [item.habitId, Number(item.totalValue)]));

    const summaries = habits.map((habit) => {
      const progressValue = entryByHabit.get(habit.id) ?? 0;
      const completionRate = habit.targetValue
        ? Math.min(progressValue / Number(habit.targetValue), 1)
        : 0;
      const isComplete = completionRate >= 1;

      return {
        id: habit.id,
        slug: habit.slug,
        name: habit.name,
        icon: habit.icon,
        color: habit.color,
        targetValue: Number(habit.targetValue),
        targetUnit: habit.targetUnit,
        progressValue,
        completionRate,
        isComplete,
        progressText: formatProgressText(progressValue, habit.targetValue, habit.targetUnit),
      };
    });

    const notifications = await query(
      `SELECT id,
              user_habit_id AS "habitId",
              title,
              message,
              type,
              channel,
              scheduled_for AS "scheduledFor",
              read_at AS "readAt",
              created_at AS "createdAt"
       FROM notifications
       WHERE user_id = $1
       ORDER BY COALESCE(scheduled_for, created_at) ASC
       LIMIT 10`,
      [userId]
    );

    const reminders = notifications
      .filter((notification) => notification.type === 'reminder')
      .map((notification) => ({
        ...notification,
        read: Boolean(notification.readAt),
      }));

    const completedHabits = summaries.filter((habit) => habit.isComplete).length;
    const totalHabits = summaries.length;
    const completionPercentage = totalHabits ? completedHabits / totalHabits : 0;

    res.json({
      date,
      totalHabits,
      completedHabits,
      completionPercentage,
      habits: summaries,
      reminders,
      notifications: notifications.map((notification) => ({
        ...notification,
        read: Boolean(notification.readAt),
      })),
    });
  })
);

app.get(
  '/api/habits/:habitId/logs',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const habitId = Number(req.params.habitId);
    if (Number.isNaN(habitId)) {
      return res.status(400).json({ message: 'HabitId inválido' });
    }

    const limit = Number(req.query.limit ?? 10);
    const dateFilter = req.query.date ? dayjs(req.query.date) : null;

    if (dateFilter && !dateFilter.isValid()) {
      return res.status(400).json({ message: 'Fecha inválida' });
    }

    const habitOwnership = await query(
      'SELECT id FROM user_habits WHERE id = $1 AND user_id = $2',
      [habitId, req.userId]
    );

    if (!habitOwnership.length) {
      return res.status(404).json({ message: 'Hábito no encontrado' });
    }

    let logs;
    if (dateFilter) {
      logs = await query(
        `SELECT id, user_habit_id AS "habitId", value, notes, logged_at AS "loggedAt"
         FROM habit_entries
         WHERE user_habit_id = $1 AND entry_date = $2
         ORDER BY logged_at DESC`,
        [habitId, dateFilter.format('YYYY-MM-DD')]
      );
    } else {
      logs = await query(
        `SELECT id, user_habit_id AS "habitId", value, notes, logged_at AS "loggedAt"
         FROM habit_entries
         WHERE user_habit_id = $1
         ORDER BY logged_at DESC
         LIMIT $2`,
        [habitId, limit]
      );
    }

    res.json(
      logs.map((log) => ({
        id: log.id,
        habitId: log.habitId,
        value: Number(log.value),
        notes: log.notes,
        loggedAt: log.loggedAt,
      }))
    );
  })
);

app.post(
  '/api/habits/:habitId/logs',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const habitId = Number(req.params.habitId);
    if (Number.isNaN(habitId)) {
      return res.status(400).json({ message: 'HabitId inválido' });
    }

    const { value, notes, loggedAt } = req.body ?? {};

    if (value === undefined || Number.isNaN(Number(value))) {
      return res.status(400).json({ message: 'El valor del registro es obligatorio' });
    }

    const habitOwnership = await query(
      'SELECT id FROM user_habits WHERE id = $1 AND user_id = $2',
      [habitId, req.userId]
    );

    if (!habitOwnership.length) {
      return res.status(404).json({ message: 'Hábito no encontrado' });
    }

    const timestamp = loggedAt ? dayjs(loggedAt) : dayjs();
    if (!timestamp.isValid()) {
      return res.status(400).json({ message: 'Fecha y hora inválidas' });
    }

    const entryDate = timestamp.format('YYYY-MM-DD');
    const entryTimestamp = timestamp.toISOString();

    const result = await query(
      `INSERT INTO habit_entries (user_habit_id, entry_date, logged_at, value, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [habitId, entryDate, entryTimestamp, Number(value), notes ?? null]
    );

    const [inserted] = result;
    if (!inserted) {
      return res.status(500).json({ message: 'No se pudo crear el registro de hábito' });
    }

    res.status(201).json({
      id: inserted.id,
      habitId,
      value: Number(value),
      notes: notes ?? null,
      loggedAt: entryTimestamp,
      entryDate,
    });
  })
);

app.get(
  '/api/notifications',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    const includeRead = req.query.includeRead === 'true';
    const typeFilter = req.query.type ?? null;

    let sql =
      'SELECT id, user_habit_id AS "habitId", title, message, type, channel, scheduled_for AS "scheduledFor", read_at AS "readAt", created_at AS "createdAt" FROM notifications WHERE user_id = $1';
    const params = [userId];

    if (!includeRead) {
      sql += ' AND read_at IS NULL';
    }

    if (typeFilter) {
      params.push(typeFilter);
      sql += ` AND type = $${params.length}`;
    }

    sql += ' ORDER BY COALESCE(scheduled_for, created_at) ASC';

    const notifications = await query(sql, params);

    res.json(
      notifications.map((notification) => ({
        ...notification,
        read: Boolean(notification.readAt),
      }))
    );
  })
);

app.patch(
  '/api/notifications/:notificationId/read',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const notificationId = Number(req.params.notificationId);
    if (Number.isNaN(notificationId)) {
      return res.status(400).json({ message: 'NotificationId inválido' });
    }

    const result = await query(
      `UPDATE notifications
       SET read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING read_at AS "readAt"`,
      [notificationId, req.userId]
    );

    const [updated] = result;
    if (!updated) {
      return res.status(404).json({ message: 'Notificación no encontrada' });
    }

    res.json({ id: notificationId, readAt: updated.readAt ?? dayjs().toISOString() });
  })
);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
