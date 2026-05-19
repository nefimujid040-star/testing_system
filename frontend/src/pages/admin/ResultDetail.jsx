import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('ru-RU');
}
function dur(start, end) {
  if (!start || !end) return '—';
  const secs = Math.round((new Date(end) - new Date(start)) / 1000);
  return `${Math.floor(secs / 60)} мин ${secs % 60} сек`;
}

export default function ResultDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');

  useEffect(() => {
    api.get(`/admin/results/${id}`)
      .then(r => setSession(r.data))
      .finally(() => setLoading(false));
  }, [id]);

  async function exportFile(format) {
    setExporting(format);
    try {
      const resp = await api.get(`/admin/results/${id}/export/${format}`, { responseType: 'blob' });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `result_${id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Ошибка экспорта');
    } finally {
      setExporting('');
    }
  }

  if (loading) return <div className="spinner" />;
  if (!session) return <div className="container"><div className="alert alert--error">Сессия не найдена</div></div>;

  const pct = session.total_questions > 0 ? Math.round(session.score / session.total_questions * 100) : 0;
  const scoreClass = pct >= 70 ? 'score-circle--good' : pct >= 40 ? 'score-circle--mid' : 'score-circle--bad';

  return (
    <>
      <nav className="navbar">
        <span className="navbar__brand">📝 Администратор</span>
        <div className="navbar__links">
          <button className="btn btn--secondary btn--sm"
            style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', border: 'none' }}
            onClick={() => navigate('/admin/results')}>← К результатам</button>
        </div>
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>Результат участника</h1>
          <div className="flex gap-8">
            <button className="btn btn--secondary btn--sm" disabled={!!exporting}
              onClick={() => exportFile('docx')}>
              {exporting === 'docx' ? 'Экспорт...' : '⬇ DOCX'}
            </button>
            <button className="btn btn--secondary btn--sm" disabled={!!exporting}
              onClick={() => exportFile('pdf')}>
              {exporting === 'pdf' ? 'Экспорт...' : '⬇ PDF'}
            </button>
          </div>
        </div>

        {/* Summary card */}
        <div className="card">
          <div className={`score-circle ${scoreClass}`}>
            <span className="score-circle__pct">{pct}%</span>
            <span className="score-circle__label">{session.score}/{session.total_questions}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {[
              ['Участник', session.participant_name],
              ['Тест', session.test_title],
              ['Начало', fmt(session.started_at)],
              ['Окончание', fmt(session.finished_at)],
              ['Затрачено', dur(session.started_at, session.finished_at)],
              ['Правильных ответов', `${session.score} из ${session.total_questions}`],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-secondary" style={{ fontSize: '0.8rem', marginBottom: 2 }}>{label}</div>
                <div className="font-bold">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Responses */}
        <h2 style={{ margin: '20px 0 12px', fontSize: '1.1rem', fontWeight: 600 }}>
          Ответы на вопросы
        </h2>
        {(session.responses || []).map((r, i) => (
          <div key={i} className="card" style={{ marginBottom: 10, borderLeft: `4px solid ${r.is_correct ? 'var(--green)' : 'var(--red)'}` }}>
            <div className="font-bold" style={{ marginBottom: 8 }}>
              {i + 1}. {r.question_text}
            </div>
            <div style={{ fontSize: '0.9rem', marginBottom: r.is_correct ? 0 : 6 }}>
              <span className="text-secondary">Ответ участника: </span>
              <span style={{ color: r.is_correct ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
                {r.chosen_answer || '(нет ответа)'} {r.is_correct ? '✓' : '✗'}
              </span>
            </div>
            {!r.is_correct && (
              <div style={{ fontSize: '0.9rem' }}>
                <span className="text-secondary">Правильный ответ: </span>
                <span style={{ color: 'var(--green)', fontWeight: 500 }}>{r.correct_answer}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
