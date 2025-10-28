import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import { query } from './db.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.SERVER_PORT ?? 3000);

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get(
  '/api/dashboard',
  asyncHandler(async (req, res) => {
    const userId = Number(req.query.userId ?? 1);
    const requestedDate = req.query.date
      ? dayjs(req.query.date)
      : dayjs();

    if (!requestedDate.isValid()) {
      return res.status(400).json({ message: 'Fecha inválida' });
    }

    const date = requestedDate.format('YYYY-MM-DD');

    const habits = await query(
      `SELECT id, slug, name, icon, color, target_value AS targetValue, target_unit AS targetUnit
       FROM habits
       WHERE user_id = ?
       ORDER BY id ASC`,
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
      `SELECT habit_id AS habitId, SUM(value) AS totalValue
       FROM habit_entries
       WHERE entry_date = ?
       GROUP BY habit_id`,
      [date]
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
      `SELECT id, habit_id AS habitId, title, message, type, scheduled_for AS scheduledFor, read_at AS readAt, created_at AS createdAt
       FROM notifications
       WHERE user_id = ?
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

    let logs;
    if (dateFilter) {
      logs = await query(
        `SELECT id, habit_id AS habitId, value, notes, logged_at AS loggedAt
         FROM habit_entries
         WHERE habit_id = ? AND entry_date = ?
         ORDER BY logged_at DESC`,
        [habitId, dateFilter.format('YYYY-MM-DD')]
      );
    } else {
      logs = await query(
        `SELECT id, habit_id AS habitId, value, notes, logged_at AS loggedAt
         FROM habit_entries
         WHERE habit_id = ?
         ORDER BY logged_at DESC
         LIMIT ?`,
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
  asyncHandler(async (req, res) => {
    const habitId = Number(req.params.habitId);
    if (Number.isNaN(habitId)) {
      return res.status(400).json({ message: 'HabitId inválido' });
    }

    const { value, notes, loggedAt } = req.body ?? {};

    if (value === undefined || Number.isNaN(Number(value))) {
      return res.status(400).json({ message: 'El valor del registro es obligatorio' });
    }

    const timestamp = loggedAt ? dayjs(loggedAt) : dayjs();
    if (!timestamp.isValid()) {
      return res.status(400).json({ message: 'Fecha y hora inválidas' });
    }

    const entryDate = timestamp.format('YYYY-MM-DD');
    const entryTimestamp = timestamp.format('YYYY-MM-DD HH:mm:ss');

    const result = await query(
      `INSERT INTO habit_entries (habit_id, entry_date, logged_at, value, notes)
       VALUES (?, ?, ?, ?, ?)`
        ,
      [habitId, entryDate, entryTimestamp, Number(value), notes ?? null]
    );

    const insertedId = result.insertId;

    res.status(201).json({
      id: insertedId,
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
  asyncHandler(async (req, res) => {
    const userId = Number(req.query.userId ?? 1);
    const includeRead = req.query.includeRead === 'true';
    const typeFilter = req.query.type ?? null;

    let sql =
      'SELECT id, habit_id AS habitId, title, message, type, scheduled_for AS scheduledFor, read_at AS readAt, created_at AS createdAt FROM notifications WHERE user_id = ?';
    const params = [userId];

    if (!includeRead) {
      sql += ' AND read_at IS NULL';
    }

    if (typeFilter) {
      sql += ' AND type = ?';
      params.push(typeFilter);
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
  asyncHandler(async (req, res) => {
    const notificationId = Number(req.params.notificationId);
    if (Number.isNaN(notificationId)) {
      return res.status(400).json({ message: 'NotificationId inválido' });
    }

    await query(
      `UPDATE notifications
       SET read_at = NOW()
       WHERE id = ?` ,
      [notificationId]
    );

    res.json({ id: notificationId, readAt: dayjs().format('YYYY-MM-DD HH:mm:ss') });
  })
);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
