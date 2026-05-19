import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

export default function Enter() {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [form, setForm] = useState({ last_name: '', first_name: '', middle_name: '', test_id: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/participant/tests').then(r => setTests(r.data));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const { last_name, first_name, middle_name, test_id } = form;
    if (!last_name.trim() || !first_name.trim()) {
      setError('Введите фамилию и имя');
      return;
    }
    if (!test_id) { setError('Выберите тест'); return; }

    const participant_name = [last_name, first_name, middle_name].filter(Boolean).map(s => s.trim()).join(' ');

    setLoading(true);
    try {
      const { data } = await api.post('/participant/sessions', {
        test_id: Number(test_id),
        participant_name,
      });
      navigate(`/test/${data.session_id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка запуска теста');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="home">
      <div className="home__card" style={{ maxWidth: 500 }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>📋</div>
        <h1 className="home__title" style={{ fontSize: '1.4rem' }}>Начало тестирования</h1>
        <p className="home__subtitle">Заполните данные для начала теста</p>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left', marginTop: 8 }}>
          <div className="form-group">
            <label className="form-label">Фамилия *</label>
            <input className="form-input" value={form.last_name}
              onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
              placeholder="Иванов" autoFocus required />
          </div>
          <div className="form-group">
            <label className="form-label">Имя *</label>
            <input className="form-input" value={form.first_name}
              onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              placeholder="Иван" required />
          </div>
          <div className="form-group">
            <label className="form-label">Отчество</label>
            <input className="form-input" value={form.middle_name}
              onChange={e => setForm(f => ({ ...f, middle_name: e.target.value }))}
              placeholder="Иванович (необязательно)" />
          </div>
          <div className="form-group">
            <label className="form-label">Выберите тест *</label>
            {tests.length === 0 ? (
              <div className="alert alert--info" style={{ marginTop: 4 }}>Активных тестов нет. Обратитесь к преподавателю.</div>
            ) : (
              <select className="form-select" value={form.test_id}
                onChange={e => setForm(f => ({ ...f, test_id: e.target.value }))} required>
                <option value="">— Выберите тест —</option>
                {tests.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title}{t.time_limit ? ` (${t.time_limit} мин)` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          {error && <div className="alert alert--error">{error}</div>}
          <button className="btn btn--primary btn--full btn--lg" type="submit"
            disabled={loading || tests.length === 0}>
            {loading ? 'Загрузка...' : 'Начать тест'}
          </button>
        </form>

        <button className="btn btn--secondary btn--full mt-16" onClick={() => navigate('/')}>
          ← На главную
        </button>
      </div>
    </div>
  );
}
