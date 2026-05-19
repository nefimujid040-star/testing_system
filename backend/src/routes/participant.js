const router = require('express').Router();
const db = require('../db');

// List active tests
router.get('/tests', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, title, description, time_limit
       FROM tests WHERE status = 'active' ORDER BY title`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Start session — records participant name and start time
router.post('/sessions', async (req, res) => {
  const { test_id, participant_name } = req.body;
  if (!test_id || !participant_name || !participant_name.trim()) {
    return res.status(400).json({ error: 'Укажите тест и ФИО' });
  }
  try {
    const { rows: tests } = await db.query(
      "SELECT id, title, time_limit FROM tests WHERE id = $1 AND status = 'active'",
      [test_id]
    );
    if (!tests[0]) return res.status(404).json({ error: 'Тест не найден или недоступен' });

    const { rows } = await db.query(
      `INSERT INTO sessions (test_id, participant_name, started_at)
       VALUES ($1, $2, NOW()) RETURNING id, started_at`,
      [test_id, participant_name.trim()]
    );
    res.status(201).json({ session_id: rows[0].id, started_at: rows[0].started_at, test: tests[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Get questions for session (answers shuffled, correct not revealed)
router.get('/sessions/:id', async (req, res) => {
  try {
    const { rows: sessions } = await db.query(
      `SELECT s.id, s.test_id, s.participant_name, s.started_at, s.finished_at,
              t.title, t.description, t.time_limit
       FROM sessions s JOIN tests t ON t.id = s.test_id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (!sessions[0]) return res.status(404).json({ error: 'Сессия не найдена' });
    if (sessions[0].finished_at) {
      return res.status(400).json({ error: 'Тест уже завершён' });
    }

    const { rows: questions } = await db.query(
      'SELECT id, text, order_index FROM questions WHERE test_id = $1 ORDER BY order_index',
      [sessions[0].test_id]
    );

    for (const q of questions) {
      const { rows: answers } = await db.query(
        'SELECT id, text FROM answers WHERE question_id = $1',
        [q.id]
      );
      // Shuffle answers server-side
      q.answers = answers.sort(() => Math.random() - 0.5);
    }

    // Load already-saved responses
    const { rows: saved } = await db.query(
      'SELECT question_id, answer_id FROM responses WHERE session_id = $1',
      [req.params.id]
    );
    const savedMap = Object.fromEntries(saved.map(r => [r.question_id, r.answer_id]));

    res.json({ ...sessions[0], questions, saved_responses: savedMap });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Autosave single answer
router.post('/sessions/:id/autosave', async (req, res) => {
  const { question_id, answer_id } = req.body;
  try {
    const { rows: sessions } = await db.query(
      'SELECT id, finished_at FROM sessions WHERE id = $1',
      [req.params.id]
    );
    if (!sessions[0] || sessions[0].finished_at) {
      return res.status(400).json({ error: 'Сессия не найдена или уже завершена' });
    }

    await db.query(
      `INSERT INTO responses (session_id, question_id, answer_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (session_id, question_id) DO UPDATE SET answer_id = EXCLUDED.answer_id`,
      [req.params.id, question_id, answer_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Submit test — finalize session and calculate score
router.post('/sessions/:id/submit', async (req, res) => {
  const { responses } = req.body; // [{ question_id, answer_id }]
  try {
    const { rows: sessions } = await db.query(
      'SELECT * FROM sessions WHERE id = $1',
      [req.params.id]
    );
    if (!sessions[0]) return res.status(404).json({ error: 'Сессия не найдена' });
    if (sessions[0].finished_at) {
      return res.status(400).json({ error: 'Тест уже завершён' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Save all responses
      if (responses && responses.length > 0) {
        for (const r of responses) {
          if (!r.answer_id) continue;
          await client.query(
            `INSERT INTO responses (session_id, question_id, answer_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (session_id, question_id) DO UPDATE SET answer_id = EXCLUDED.answer_id`,
            [req.params.id, r.question_id, r.answer_id]
          );
        }
      }

      // Count total questions
      const { rows: qcount } = await client.query(
        'SELECT COUNT(*)::int AS cnt FROM questions WHERE test_id = $1',
        [sessions[0].test_id]
      );
      const total = qcount[0].cnt;

      // Calculate score
      const { rows: scoreRows } = await client.query(
        `SELECT COUNT(*)::int AS correct
         FROM responses r
         JOIN answers a ON a.id = r.answer_id
         WHERE r.session_id = $1 AND a.is_correct = TRUE`,
        [req.params.id]
      );
      const score = scoreRows[0].correct;

      await client.query(
        `UPDATE sessions SET finished_at = NOW(), score = $1, total_questions = $2
         WHERE id = $3`,
        [score, total, req.params.id]
      );

      await client.query('COMMIT');
      res.json({ score, total_questions: total });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
