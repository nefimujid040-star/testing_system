require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }), require('./routes/auth'));
app.use('/api/admin', require('./routes/tests'));
app.use('/api/admin', require('./routes/results'));
app.use('/api/participant', require('./routes/participant'));

app.get('/api/health', (_, res) => res.json({ ok: true }));

const PUBLIC = path.join(__dirname, '../public');
app.use(express.static(PUBLIC));
app.get('*', (req, res) => res.sendFile(path.join(PUBLIC, 'index.html')));

async function seedAdmin() {
  try {
    const { rows } = await db.query('SELECT id FROM admins LIMIT 1');
    if (rows.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await db.query('INSERT INTO admins (login, password_hash) VALUES ($1, $2)', ['admin', hash]);
      console.log('Создан администратор по умолчанию — логин: admin, пароль: admin123');
    }
  } catch (e) {
    console.error('Ошибка инициализации:', e.message);
  }
}

app.listen(PORT, async () => {
  console.log(`Backend запущен на порту ${PORT}`);
  await seedAdmin();
});
