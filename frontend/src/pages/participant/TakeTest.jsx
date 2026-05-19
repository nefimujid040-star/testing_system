import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';

export default function TakeTest() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({}); // { question_id: answer_id }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const autosaveRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    api.get(`/participant/sessions/${sessionId}`)
      .then(r => {
        const s = r.data;
        setSession(s);
        setAnswers(
          Object.fromEntries(
            Object.entries(s.saved_responses || {}).map(([qid, aid]) => [Number(qid), aid])
          )
        );
        if (s.time_limit) {
          const elapsed = Math.round((Date.now() - new Date(s.started_at).getTime()) / 1000);
          const remaining = s.time_limit * 60 - elapsed;
          setTimeLeft(remaining > 0 ? remaining : 0);
        }
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) { handleSubmit(true); return; }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft]);

  // Autosave every 30s
  useEffect(() => {
    autosaveRef.current = setInterval(async () => {
      const q = session?.questions?.[current];
      if (!q || !answers[q.id]) return;
      try {
        await api.post(`/participant/sessions/${sessionId}/autosave`, {
          question_id: q.id,
          answer_id: answers[q.id],
        });
      } catch {}
    }, 30000);
    return () => clearInterval(autosaveRef.current);
  }, [session, current, answers]);

  const handleSelect = useCallback(async (questionId, answerId) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerId }));
    try {
      await api.post(`/participant/sessions/${sessionId}/autosave`, {
        question_id: questionId,
        answer_id: answerId,
      });
    } catch {}
  }, [sessionId]);

  const handleSubmit = useCallback(async (auto = false) => {
    if (!auto && !confirm('Завершить тест? Изменить ответы будет невозможно.')) return;
    clearInterval(autosaveRef.current);
    clearTimeout(timerRef.current);
    setSubmitting(true);
    try {
      const responses = Object.entries(answers).map(([qid, aid]) => ({
        question_id: Number(qid),
        answer_id: aid,
      }));
      const { data } = await api.post(`/participant/sessions/${sessionId}/submit`, { responses });
      navigate('/test/done', { state: { score: data.score, total: data.total_questions } });
    } catch {
      setSubmitting(false);
      alert('Ошибка отправки. Попробуйте ещё раз.');
    }
  }, [answers, sessionId, navigate]);

  if (loading) return <div className="spinner" />;
  if (!session) return null;

  const questions = session.questions || [];
  const q = questions[current];
  const answered = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answered / questions.length) * 100 : 0;

  const fmtTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  const timerClass = timeLeft === null ? '' : timeLeft <= 60 ? 'timer--danger' : timeLeft <= 300 ? 'timer--warning' : '';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray)' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '12px 20px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{session.title}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{session.participant_name}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Отвечено: <strong>{answered}/{questions.length}</strong>
            </div>
            {timeLeft !== null && (
              <div className={`timer ${timerClass}`}>⏱ {fmtTime(timeLeft)}</div>
            )}
          </div>
        </div>
        <div style={{ maxWidth: 720, margin: '8px auto 0' }}>
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
        {/* Question navigator */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {questions.map((qn, i) => (
            <button key={qn.id}
              onClick={() => setCurrent(i)}
              style={{
                width: 36, height: 36, borderRadius: 6, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.82rem',
                background: i === current ? 'var(--blue)' : answers[qn.id] ? 'var(--blue-light)' : '#fff',
                color: i === current ? '#fff' : answers[qn.id] ? 'var(--blue)' : 'var(--text-secondary)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}>
              {i + 1}
            </button>
          ))}
        </div>

        {/* Question card */}
        {q && (
          <div className="card">
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
              Вопрос {current + 1} из {questions.length}
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 16, lineHeight: 1.5 }}>
              {q.text}
            </div>
            <div className="radio-group">
              {q.answers.map(a => (
                <label key={a.id} className={`radio-card ${answers[q.id] === a.id ? 'selected' : ''}`}>
                  <input type="radio" name={`q${q.id}`}
                    checked={answers[q.id] === a.id}
                    onChange={() => handleSelect(q.id, a.id)} />
                  <span>{a.text}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 8 }}>
          <button className="btn btn--secondary"
            disabled={current === 0}
            onClick={() => setCurrent(c => c - 1)}>← Назад</button>

          {current < questions.length - 1
            ? <button className="btn btn--primary" onClick={() => setCurrent(c => c + 1)}>Далее →</button>
            : <button className="btn btn--success" disabled={submitting} onClick={() => handleSubmit(false)}>
                {submitting ? 'Отправка...' : '✓ Завершить тест'}
              </button>
          }
        </div>

        {answered < questions.length && (
          <div className="alert alert--info" style={{ marginTop: 16 }}>
            Остались без ответа: {questions.length - answered} вопрос(ов)
          </div>
        )}
      </div>
    </div>
  );
}
