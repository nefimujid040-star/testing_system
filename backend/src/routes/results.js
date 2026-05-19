const router = require('express').Router();
const db = require('../db');
const requireAdmin = require('../middleware/auth');
const { generateDocx, generatePdf } = require('../utils/export');

// List all sessions (optionally filtered by test_id)
router.get('/results', requireAdmin, async (req, res) => {
  try {
    const { test_id } = req.query;
    const params = [];
    let where = '';
    if (test_id) {
      params.push(test_id);
      where = 'WHERE s.test_id = $1';
    }
    const { rows } = await db.query(
      `SELECT s.id, s.participant_name, s.started_at, s.finished_at, s.score,
              s.total_questions, t.title AS test_title, t.id AS test_id,
              EXTRACT(EPOCH FROM (s.finished_at - s.started_at))::int AS duration_seconds
       FROM sessions s
       JOIN tests t ON t.id = s.test_id
       ${where}
       ORDER BY s.started_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Get session detail with all responses
router.get('/results/:id', requireAdmin, async (req, res) => {
  try {
    const { rows: sessions } = await db.query(
      `SELECT s.*, t.title AS test_title, t.time_limit
       FROM sessions s JOIN tests t ON t.id = s.test_id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (!sessions[0]) return res.status(404).json({ error: 'Сессия не найдена' });

    const { rows: responses } = await db.query(
      `SELECT r.question_id, r.answer_id,
              q.text AS question_text, q.order_index,
              a.text AS chosen_answer,
              ca.text AS correct_answer,
              (r.answer_id = ca.id) AS is_correct
       FROM responses r
       JOIN questions q ON q.id = r.question_id
       LEFT JOIN answers a ON a.id = r.answer_id
       JOIN answers ca ON ca.question_id = r.question_id AND ca.is_correct = TRUE
       WHERE r.session_id = $1
       ORDER BY q.order_index`,
      [req.params.id]
    );

    res.json({ ...sessions[0], responses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Export to DOCX
router.get('/results/:id/export/docx', requireAdmin, async (req, res) => {
  try {
    const detail = await getSessionDetail(req.params.id);
    if (!detail) return res.status(404).json({ error: 'Сессия не найдена' });

    const buffer = await generateDocx(detail);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="result_${req.params.id}.docx"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка генерации файла' });
  }
});

// Export to PDF
router.get('/results/:id/export/pdf', requireAdmin, async (req, res) => {
  try {
    const detail = await getSessionDetail(req.params.id);
    if (!detail) return res.status(404).json({ error: 'Сессия не найдена' });

    const buffer = await generatePdf(detail);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="result_${req.params.id}.pdf"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка генерации файла' });
  }
});

async function getSessionDetail(sessionId) {
  const { rows: sessions } = await db.query(
    `SELECT s.*, t.title AS test_title FROM sessions s
     JOIN tests t ON t.id = s.test_id WHERE s.id = $1`,
    [sessionId]
  );
  if (!sessions[0]) return null;

  const { rows: responses } = await db.query(
    `SELECT q.text AS question_text, q.order_index,
            a.text AS chosen_answer,
            ca.text AS correct_answer,
            (r.answer_id = ca.id) AS is_correct
     FROM responses r
     JOIN questions q ON q.id = r.question_id
     LEFT JOIN answers a ON a.id = r.answer_id
     JOIN answers ca ON ca.question_id = r.question_id AND ca.is_correct = TRUE
     WHERE r.session_id = $1
     ORDER BY q.order_index`,
    [sessionId]
  );

  return { ...sessions[0], responses };
}

module.exports = router;
