import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Done() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const score = state?.score ?? 0;
  const total = state?.total ?? 0;
  const pct = total > 0 ? Math.round(score / total * 100) : 0;
  const scoreClass = pct >= 70 ? 'score-circle--good' : pct >= 40 ? 'score-circle--mid' : 'score-circle--bad';
  const message = pct >= 70 ? 'Отличный результат!' : pct >= 40 ? 'Неплохой результат' : 'Стоит повторить материал';

  return (
    <div className="home">
      <div className="home__card">
        <h1 className="home__title" style={{ marginBottom: 24 }}>Тест завершён</h1>

        <div className={`score-circle ${scoreClass}`}>
          <span className="score-circle__pct">{pct}%</span>
          <span className="score-circle__label">{score}/{total}</span>
        </div>

        <p style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: 8 }}>{message}</p>
        <p className="text-secondary" style={{ marginBottom: 28, fontSize: '0.9rem' }}>
          Правильных ответов: <strong>{score}</strong> из <strong>{total}</strong>
        </p>

        <div className="home__buttons">
          <button className="btn btn--primary btn--lg" onClick={() => navigate('/test/enter')}>
            Пройти ещё раз
          </button>
          <button className="btn btn--secondary btn--lg" onClick={() => navigate('/')}>
            На главную
          </button>
        </div>
      </div>
    </div>
  );
}
