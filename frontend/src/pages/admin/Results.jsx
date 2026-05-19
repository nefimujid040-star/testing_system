import React, { useEffect, useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import api from '../../api';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('ru-RU');
}
function dur(secs) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}м ${s}с`;
}

export default function Results() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [tests, setTests] = useState([]);
  const [filter, setFilter] = useState({ test_id: '', name: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/results'),
      api.get('/admin/tests'),
    ]).then(([r1, r2]) => {
      setSessions(r1.data);
      setTests(r2.data);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = sessions.filter(s => {
    if (filter.test_id && String(s.test_id) !== filter.test_id) return false;
    if (filter.name && !s.participant_name.toLowerCase().includes(filter.name.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <nav className="navbar">
        <span className="navbar__brand">📝 Администратор</span>
        <div className="navbar__links">
          <NavLink className="navbar__link" to="/admin/dashboard">Тесты</NavLink>
          <NavLink className="navbar__link" to="/admin/results">Результаты</NavLink>
          <button className="btn btn--secondary btn--sm"
            style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', border: 'none' }}
            onClick={() => { localStorage.removeItem('admin_token'); navigate('/'); }}>Выйти</button>
        </div>
      </nav>

      <div className="container--wide">
        <div className="page-header">
          <h1>Результаты тестирований</h1>
        </div>

        <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
          <div className="flex gap-12" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
              <label className="form-label">Фильтр по тесту</label>
              <select className="form-select" value={filter.test_id}
                onChange={e => setFilter(f => ({ ...f, test_id: e.target.value }))}>
                <option value="">Все тесты</option>
                {tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
              <label className="form-label">Поиск по ФИО</label>
              <input className="form-input" value={filter.name}
                onChange={e => setFilter(f => ({ ...f, name: e.target.value }))}
                placeholder="Введите ФИО..." />
            </div>
          </div>
        </div>

        {loading ? <div className="spinner" /> : (
          <div className="card" style={{ padding: 0 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                {sessions.length === 0 ? 'Результатов пока нет' : 'Ничего не найдено'}
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ФИО участника</th>
                      <th>Тест</th>
                      <th>Начало</th>
                      <th>Окончание</th>
                      <th>Время</th>
                      <th>Результат</th>
                      <th>%</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(s => {
                      const pct = s.total_questions > 0 ? Math.round(s.score / s.total_questions * 100) : 0;
                      return (
                        <tr key={s.id}>
                          <td>{s.participant_name}</td>
                          <td>{s.test_title}</td>
                          <td>{fmt(s.started_at)}</td>
                          <td>{s.finished_at ? fmt(s.finished_at) : <span className="text-secondary">В процессе</span>}</td>
                          <td>{dur(s.duration_seconds)}</td>
                          <td>{s.finished_at ? `${s.score} / ${s.total_questions}` : '—'}</td>
                          <td>
                            {s.finished_at ? (
                              <span style={{ color: pct >= 70 ? 'var(--green)' : pct >= 40 ? '#E65100' : 'var(--red)', fontWeight: 600 }}>
                                {pct}%
                              </span>
                            ) : '—'}
                          </td>
                          <td>
                            <button className="btn btn--secondary btn--sm"
                              onClick={() => navigate(`/admin/results/${s.id}`)}>
                              Подробнее
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
