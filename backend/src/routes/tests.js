const router = require('express').Router();
const db = require('../db');
const requireAdmin = require('../middleware/auth');

// List all tests
router.get('/tests', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT t.*, COUNT(q.id)::int AS question_count
       FROM tests t
       LEFT JOIN questions q ON q.test_id = t.id
       GROUP BY t.id
       ORDER BY t.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Get test with questions and answers
router.get('/tests/:id', requireAdmin, async (req, res) => {
  try {
    const { rows: tests } = await db.query('SELECT * FROM tests WHERE id = $1', [req.params.id]);
    if (!tests[0]) return res.status(404).json({ error: 'Тест не найден' });

    const { rows: questions } = await db.query(
      'SELECT * FROM questions WHERE test_id = $1 ORDER BY order_index',
      [req.params.id]
    );

    for (const q of questions) {
      const { rows: answers } = await db.query(
        'SELECT * FROM answers WHERE question_id = $1',
        [q.id]
      );
      q.answers = answers;
    }

    res.json({ ...tests[0], questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Create test
router.post('/tests', requireAdmin, async (req, res) => {
  const { title, description, time_limit, status } = req.body;
  if (!title) return res.status(400).json({ error: 'Название обязательно' });
  try {
    const { rows } = await db.query(
      `INSERT INTO tests (title, description, time_limit, status)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, description || null, time_limit || null, status || 'draft']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Update test
router.put('/tests/:id', requireAdmin, async (req, res) => {
  const { title, description, time_limit, status } = req.body;
  if (!title) return res.status(400).json({ error: 'Название обязательно' });
  try {
    const { rows } = await db.query(
      `UPDATE tests SET title=$1, description=$2, time_limit=$3, status=$4
       WHERE id=$5 RETURNING *`,
      [title, description || null, time_limit || null, status || 'draft', req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Тест не найден' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Delete test
router.delete('/tests/:id', requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM tests WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Add question with answers
router.post('/tests/:id/questions', requireAdmin, async (req, res) => {
  const { text, answers, order_index } = req.body;
  if (!text) return res.status(400).json({ error: 'Текст вопроса обязателен' });
  if (!answers || answers.length !== 4) {
    return res.status(400).json({ error: 'Необходимо ровно 4 варианта ответа' });
  }
  const correctCount = answers.filter(a => a.is_correct).length;
  if (correctCount !== 1) {
    return res.status(400).json({ error: 'Должен быть ровно 1 правильный ответ' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { rows: qs } = await client.query(
      'INSERT INTO questions (test_id, text, order_index) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, text, order_index ?? 0]
    );
    const question = qs[0];
    const insertedAnswers = [];
    for (const a of answers) {
      const { rows: ans } = await client.query(
        'INSERT INTO answers (question_id, text, is_correct) VALUES ($1, $2, $3) RETURNING *',
        [question.id, a.text, !!a.is_correct]
      );
      insertedAnswers.push(ans[0]);
    }
    await client.query('COMMIT');
    res.status(201).json({ ...question, answers: insertedAnswers });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  } finally {
    client.release();
  }
});

// Update question with answers
router.put('/questions/:id', requireAdmin, async (req, res) => {
  const { text, answers, order_index } = req.body;
  if (!text) return res.status(400).json({ error: 'Текст вопроса обязателен' });
  if (!answers || answers.length !== 4) {
    return res.status(400).json({ error: 'Необходимо ровно 4 варианта ответа' });
  }
  const correctCount = answers.filter(a => a.is_correct).length;
  if (correctCount !== 1) {
    return res.status(400).json({ error: 'Должен быть ровно 1 правильный ответ' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { rows: qs } = await client.query(
      'UPDATE questions SET text=$1, order_index=$2 WHERE id=$3 RETURNING *',
      [text, order_index ?? 0, req.params.id]
    );
    if (!qs[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Вопрос не найден' }); }

    await client.query('DELETE FROM answers WHERE question_id = $1', [req.params.id]);
    const insertedAnswers = [];
    for (const a of answers) {
      const { rows: ans } = await client.query(
        'INSERT INTO answers (question_id, text, is_correct) VALUES ($1, $2, $3) RETURNING *',
        [req.params.id, a.text, !!a.is_correct]
      );
      insertedAnswers.push(ans[0]);
    }
    await client.query('COMMIT');
    res.json({ ...qs[0], answers: insertedAnswers });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  } finally {
    client.release();
  }
});

// Delete question
router.delete('/questions/:id', requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM questions WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
