import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db.js';

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

const toPublicUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  createdAt: row.createdAt ?? row.created_at,
});

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

app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const { name, email, password, height, weight, age } = req.body;

  if (!name || !email || !password || !height || !weight || !age) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await query(
    `INSERT INTO users (username, email, password_hash, height_cm, weight_kg, age)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, username AS name, email, height_cm AS height, weight_kg AS weight, age, created_at AS "createdAt"`,
    [name, email, passwordHash, height, weight, age]
  );

  const [user] = result;
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({ token, user });
}));


app.post(
  '/api/auth/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Correo y contraseña son obligatorios' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const found = await query(
      `SELECT id, name, email, password_hash AS "passwordHash", created_at AS "createdAt"
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

    res.json({
      token,
      user: toPublicUser(user),
    });
  })
);

app.get(
  '/api/auth/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT id, name, email, created_at AS "createdAt"
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
