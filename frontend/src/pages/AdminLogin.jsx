import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ login: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('admin_token', data.token);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="home">
      <div className="home__card">
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🔐</div>
        <h1 className="home__title" style={{ fontSize: '1.4rem' }}>Вход администратора</h1>
        <form onSubmit={handleSubmit} style={{ marginTop: '24px', textAlign: 'left' }}>
          <div className="form-group">
            <label className="form-label">Логин</label>
            <input className="form-input" value={form.login}
              onChange={e => setForm(f => ({ ...f, login: e.target.value }))}
              autoFocus autoComplete="username" required />
          </div>
          <div className="form-group">
            <label className="form-label">Пароль</label>
            <input className="form-input" type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              autoComplete="current-password" required />
          </div>
          {error && <div className="alert alert--error">{error}</div>}
          <button className="btn btn--primary btn--full btn--lg" type="submit" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <button className="btn btn--secondary btn--full mt-16"
          onClick={() => navigate('/')}>← На главную</button>
      </div>
    </div>
  );
}
