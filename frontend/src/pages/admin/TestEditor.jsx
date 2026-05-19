import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';

const EMPTY_ANSWER = { text: '', is_correct: false };
const emptyAnswers = () => [
  { text: '', is_correct: true },
  { text: '', is_correct: false },
  { text: '', is_correct: false },
  { text: '', is_correct: false },
];

function QuestionForm({ initial, onSave, onCancel, index }) {
  const [text, setText] = useState(initial?.text || '');
  const [answers, setAnswers] = useState(
    initial?.answers?.length === 4 ? initial.answers.map(a => ({ ...a })) : emptyAnswers()
  );
  const [error, setError] = useState('');

  function setAnswerText(i, val) {
    setAnswers(prev => prev.map((a, idx) => idx === i ? { ...a, text: val } : a));
  }
  function setCorrect(i) {
    setAnswers(prev => prev.map((a, idx) => ({ ...a, is_correct: idx === i })));
  }

  function handleSave() {
    setError('');
    if (!text.trim()) { setError('Введите текст вопроса'); return; }
    if (answers.some(a => !a.text.trim())) { setError('Заполните все 4 варианта ответа'); return; }
    if (!answers.some(a => a.is_correct)) { setError('Выберите правильный ответ'); return; }
    onSave({ text: text.trim(), answers, order_index: index });
  }

  return (
    <div className="card" style={{ border: '2px solid var(--blue-light)', marginBottom: 12 }}>
      <div className="form-group">
        <label className="form-label">Текст вопроса {index + 1}</label>
        <textarea className="form-textarea" value={text}
          onChange={e => setText(e.target.value)} placeholder="Введите вопрос..." />
      </div>
      <div className="form-label" style={{ marginBottom: 8 }}>Варианты ответов (отметьте правильный)</div>
      {answers.map((a, i) => (
        <div key={i} className="flex items-center gap-8" style={{ marginBottom: 8 }}>
          <input type="radio" name={`correct-${index}`} checked={a.is_correct}
            onChange={() => setCorrect(i)}
            title="Правильный ответ" style={{ flexShrink: 0, accentColor: 'var(--green)', width: 18, height: 18 }} />
          <input className="form-input" value={a.text}
            onChange={e => setAnswerText(i, e.target.value)}
            placeholder={`Вариант ${i + 1}`} />
        </div>
      ))}
      <div className="form-hint">Выберите радиокнопку рядом с правильным ответом</div>
      {error && <div className="form-error">{error}</div>}
      <div className="flex gap-8 mt-16">
        <button className="btn btn--primary btn--sm" onClick={handleSave}>Сохранить вопрос</button>
        {onCancel && <button className="btn btn--secondary btn--sm" onClick={onCancel}>Отмена</button>}
      </div>
    </div>
  );
}

export default function TestEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [testForm, setTestForm] = useState({ title: '', description: '', time_limit: '', status: 'draft' });
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [testSaved, setTestSaved] = useState(!isNew);
  const [currentTestId, setCurrentTestId] = useState(id || null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (!isNew) loadTest();
  }, [id]);

  async function loadTest() {
    try {
      const { data } = await api.get(`/admin/tests/${id}`);
      setTestForm({
        title: data.title,
        description: data.description || '',
        time_limit: data.time_limit || '',
        status: data.status,
      });
      setQuestions(data.questions || []);
    } catch {
      setError('Не удалось загрузить тест');
    } finally {
      setLoading(false);
    }
  }

  async function saveTestMeta(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!testForm.title.trim()) { setError('Введите название теста'); return; }
    setSaving(true);
    try {
      const payload = {
        title: testForm.title.trim(),
        description: testForm.description || null,
        time_limit: testForm.time_limit ? Number(testForm.time_limit) : null,
        status: testForm.status,
      };
      if (isNew && !currentTestId) {
        const { data } = await api.post('/admin/tests', payload);
        setCurrentTestId(data.id);
        setTestSaved(true);
        navigate(`/admin/tests/${data.id}`, { replace: true });
        setSuccess('Тест создан. Теперь добавьте вопросы.');
      } else {
        await api.put(`/admin/tests/${currentTestId}`, payload);
        setSuccess('Изменения сохранены');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveQuestion(qdata) {
    try {
      const { data } = await api.post(`/admin/tests/${currentTestId}/questions`, {
        ...qdata,
        order_index: questions.length,
      });
      setQuestions(prev => [...prev, data]);
      setAddingQuestion(false);
      setSuccess('Вопрос добавлен');
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка добавления вопроса');
    }
  }

  async function handleUpdateQuestion(qid, qdata) {
    try {
      const { data } = await api.put(`/admin/questions/${qid}`, qdata);
      setQuestions(prev => prev.map(q => q.id === qid ? data : q));
      setEditingId(null);
      setSuccess('Вопрос обновлён');
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка обновления');
    }
  }

  async function deleteQuestion(qid, qtext) {
    if (!confirm(`Удалить вопрос «${qtext.slice(0, 60)}...»?`)) return;
    try {
      await api.delete(`/admin/questions/${qid}`);
      setQuestions(prev => prev.filter(q => q.id !== qid));
    } catch {
      alert('Не удалось удалить вопрос');
    }
  }

  if (loading) return <div className="spinner" />;

  return (
    <>
      <nav className="navbar">
        <span className="navbar__brand">📝 Администратор</span>
        <div className="navbar__links">
          <button className="btn btn--secondary btn--sm"
            style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', border: 'none' }}
            onClick={() => navigate('/admin/dashboard')}>← К тестам</button>
        </div>
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>{isNew ? 'Новый тест' : 'Редактирование теста'}</h1>
        </div>

        {error && <div className="alert alert--error">{error}</div>}
        {success && <div className="alert alert--success">{success}</div>}

        {/* Test meta form */}
        <div className="card">
          <h2 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 600 }}>Настройки теста</h2>
          <form onSubmit={saveTestMeta}>
            <div className="form-group">
              <label className="form-label">Название теста *</label>
              <input className="form-input" value={testForm.title}
                onChange={e => setTestForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Введите название" required />
            </div>
            <div className="form-group">
              <label className="form-label">Инструкция / описание</label>
              <textarea className="form-textarea" value={testForm.description}
                onChange={e => setTestForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Необязательное описание для участника" />
            </div>
            <div className="flex gap-12" style={{ flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
                <label className="form-label">Ограничение времени (минут)</label>
                <input className="form-input" type="number" min="1" max="300"
                  value={testForm.time_limit}
                  onChange={e => setTestForm(f => ({ ...f, time_limit: e.target.value }))}
                  placeholder="Без ограничения" />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
                <label className="form-label">Статус</label>
                <select className="form-select" value={testForm.status}
                  onChange={e => setTestForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="draft">Черновик</option>
                  <option value="active">Активен</option>
                  <option value="archived">В архиве</option>
                </select>
              </div>
            </div>
            <button className="btn btn--primary" type="submit" disabled={saving}>
              {saving ? 'Сохранение...' : (isNew && !currentTestId ? 'Создать тест' : 'Сохранить')}
            </button>
          </form>
        </div>

        {/* Questions section */}
        {(testSaved || currentTestId) && (
          <div>
            <div className="page-header" style={{ marginTop: 8 }}>
              <h2>Вопросы ({questions.length})</h2>
              {!addingQuestion && (
                <button className="btn btn--primary" onClick={() => { setAddingQuestion(true); setEditingId(null); }}>
                  + Добавить вопрос
                </button>
              )}
            </div>

            {questions.length === 0 && !addingQuestion && (
              <div className="alert alert--info">Вопросов пока нет. Добавьте первый вопрос.</div>
            )}

            {questions.map((q, i) => (
              editingId === q.id
                ? <QuestionForm key={q.id} initial={q} index={i}
                    onSave={qdata => handleUpdateQuestion(q.id, { ...qdata, order_index: i })}
                    onCancel={() => setEditingId(null)} />
                : (
                  <div key={q.id} className="card" style={{ marginBottom: 10 }}>
                    <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div className="font-bold" style={{ marginBottom: 6 }}>
                          {i + 1}. {q.text}
                        </div>
                        <div className="flex flex-col gap-4">
                          {(q.answers || []).map(a => (
                            <div key={a.id} style={{ fontSize: '0.88rem', color: a.is_correct ? 'var(--green)' : 'var(--text-secondary)' }}>
                              {a.is_correct ? '✓ ' : '○ '}{a.text}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-8" style={{ flexShrink: 0 }}>
                        <button className="btn btn--secondary btn--sm" onClick={() => { setEditingId(q.id); setAddingQuestion(false); }}>
                          Изменить
                        </button>
                        <button className="btn btn--danger btn--sm" onClick={() => deleteQuestion(q.id, q.text)}>
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                )
            ))}

            {addingQuestion && (
              <QuestionForm index={questions.length}
                onSave={handleSaveQuestion}
                onCancel={() => setAddingQuestion(false)} />
            )}
          </div>
        )}
      </div>
    </>
  );
}
