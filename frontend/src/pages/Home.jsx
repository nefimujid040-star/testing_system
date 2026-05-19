import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  return (
    <div className="home">
      <div className="home__card">
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📝</div>
        <h1 className="home__title">Система тестирования</h1>
        <p className="home__subtitle">Выберите режим входа</p>
        <div className="home__buttons">
          <button className="btn btn--primary btn--lg" onClick={() => navigate('/test/enter')}>
            Пройти тест
          </button>
          <button className="btn btn--secondary btn--lg" onClick={() => navigate('/admin/login')}>
            Войти как администратор
          </button>
        </div>
      </div>
    </div>
  );
}
