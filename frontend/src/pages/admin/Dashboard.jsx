import React, { useEffect, useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import api from '../../api';

const STATUS_LABEL = { draft: 'Черновик', active: 'Активен', archived: 'В архиве' };

export default function Dashboard() {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [changePwd, setChangePwd] = useState(false);
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [pwdMsg, setPwdMsg] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data } = await api.get('/admin/tests');
      setTests(data);
    } catch {
      setError('Не удалось загрузить тесты');
    } finally {
      setLoading(false);
    }
  }

  async function deleteTest(id, title) {
    if (!confirm(`Удалить тест «${title}»? Все результаты будут потеряны.`)) return;
    try {
      await api.delete(`/admin/tests/${id}`);
      setTests(t => t.filter(x => x.id !== id));
    } catch {
      alert('Не удалось удалить тест');
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwdMsg('');
    if (pwd.next !== pwd.confirm) { setPwdMsg('Пароли не совпадают'); return; }
    try {
      await api.post('/auth/change-password', { currentPassword: pwd.current, newPassword: pwd.next });
      setPwdMsg('✓ Пароль изменён');
      setPwd({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwdMsg(err.response?.data?.error || 'Ошибка');
    }
  }

  function logout() {
    localStorage.removeItem('admin_token');
    navigate('/');
  }

  return (
    <>
      <nav className="navbar">
        <span className="navbar__brand">📝 Администратор</span>
        <div className="navbar__links">
          <NavLink className="navbar__link" to="/admin/dashboard">Тесты</NavLink>
          <NavLink className="navbar__link" to="/admin/results">Результаты</NavLink>
          <button className="btn btn--secondary btn--sm" style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', border: 'none' }} onClick={logout}>Выйти</button>
        </div>
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>Тесты</h1>
          <div className="flex gap-8">
            <button className="btn btn--secondary btn--sm" onClick={() => setChangePwd(v => !v)}>
              🔑 Сменить пароль
            </button>
            <button className="btn btn--primary" onClick={() => navigate('/admin/tests/new')}>
              + Создать тест
            </button>
          </div>
        </div>

        {changePwd && (
          <div className="card mb-16">
            <h2 style={{ marginBottom: 16, fontSize: '1rem' }}>Смена пароля</h2>
            <form onSubmit={changePassword}>
              <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
                  <label className="form-label">Текущий пароль</label>
                  <input className="form-input" type="password" value={pwd.current}
                    onChange={e => setPwd(p => ({ ...p, current: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
                  <label className="form-label">Новый пароль</label>
                  <input className="form-input" type="password" value={pwd.next}
                    onChange={e => setPwd(p => ({ ...p, next: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
                  <label className="form-label">Повторите пароль</label>
                  <input className="form-input" type="password" value={pwd.confirm}
                    onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} required />
                </div>
              </div>
              {pwdMsg && <div className={`alert ${pwdMsg.startsWith('✓') ? 'alert--success' : 'alert--error'}`}>{pwdMsg}</div>}
              <button className="btn btn--primary btn--sm" type="submit">Сохранить</button>
            </form>
          </div>
        )}

        {error && <div className="alert alert--error">{error}</div>}
        {loading ? <div className="spinner" /> : (
          <div className="card" style={{ padding: 0 }}>
            {tests.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                Тестов пока нет. Создайте первый тест.
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Название</th>
                      <th>Статус</th>
                      <th>Вопросов</th>
                      <th>Время (мин)</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map(t => (
                      <tr key={t.id}>
                        <td>{t.title}</td>
                        <td><span className={`badge badge--${t.status}`}>{STATUS_LABEL[t.status]}</span></td>
                        <td>{t.question_count}</td>
                        <td>{t.time_limit || '—'}</td>
                        <td>
                          <div className="td-actions">
                            <button className="btn btn--secondary btn--sm"
                              onClick={() => navigate(`/admin/tests/${t.id}`)}>Редактировать</button>
                            <button className="btn btn--danger btn--sm"
                              onClick={() => deleteTest(t.id, t.title)}>Удалить</button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
