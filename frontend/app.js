/* ═══════════════════════════════════════════════════════════════
   API
═══════════════════════════════════════════════════════════════ */
const API = {
  async req(url, opts = {}) {
    const token = localStorage.getItem('admin_token');
    const res = await fetch('/api' + url, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(opts.headers || {}),
      },
    });
    if (res.status === 401) {
      localStorage.removeItem('admin_token');
      go('/admin/login');
      throw new Error('Unauthorized');
    }
    if (opts.blob) return res;
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
    return data;
  },
  get:    (u)    => API.req(u),
  post:   (u, b) => API.req(u, { method: 'POST',   body: JSON.stringify(b) }),
  put:    (u, b) => API.req(u, { method: 'PUT',    body: JSON.stringify(b) }),
  delete: (u)    => API.req(u, { method: 'DELETE' }),
  async download(url, filename) {
    const token = localStorage.getItem('admin_token');
    const res = await fetch('/api' + url, {
      headers: token ? { Authorization: 'Bearer ' + token } : {},
    });
    if (!res.ok) throw new Error('Ошибка экспорта');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};

/* ═══════════════════════════════════════════════════════════════
   Router
═══════════════════════════════════════════════════════════════ */
let _cleanup = null;

function go(path) { location.hash = '#' + path; }

function route() {
  if (_cleanup) { _cleanup(); _cleanup = null; }
  const h = location.hash.replace(/^#/, '') || '/';
  if (h === '/')                        return pgHome();
  if (h === '/admin/login')             return pgAdminLogin();
  if (h === '/admin/dashboard')         return guard(pgDashboard);
  if (h === '/admin/tests/new')         return guard(() => pgTestEditor(null));
  if (h === '/admin/results')           return guard(pgResults);
  if (h === '/test/enter')              return pgEnter();
  if (h === '/test/done')               return pgDone();
  const mTest  = h.match(/^\/admin\/tests\/(\d+)$/);
  const mResult = h.match(/^\/admin\/results\/(\d+)$/);
  const mTake  = h.match(/^\/test\/(\d+)$/);
  if (mTest)   return guard(() => pgTestEditor(mTest[1]));
  if (mResult) return guard(() => pgResultDetail(mResult[1]));
  if (mTake)   return pgTakeTest(mTake[1]);
  pgHome();
}

function guard(fn) {
  if (!localStorage.getItem('admin_token')) { go('/admin/login'); return; }
  fn();
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);

/* ═══════════════════════════════════════════════════════════════
   Helpers
═══════════════════════════════════════════════════════════════ */
const $app = () => document.getElementById('app');
const $     = (s, ctx) => (ctx || document).querySelector(s);
const $$    = (s, ctx) => (ctx || document).querySelectorAll(s);

function mount(html) { $app().innerHTML = html; }
function spinner()   { return '<div class="spinner"></div>'; }

function fmt(d)  { return d ? new Date(d).toLocaleString('ru-RU') : '—'; }
function dur(a, b) {
  if (!a || !b) return '—';
  const s = Math.round((new Date(b) - new Date(a)) / 1000);
  return Math.floor(s / 60) + ' мин ' + (s % 60) + ' сек';
}
function pad2(n) { return String(n).padStart(2, '0'); }
function fmtTime(s) { return pad2(Math.floor(s / 60)) + ':' + pad2(s % 60); }

function navbar(active) {
  return `<nav class="navbar">
    <span class="navbar__brand">📝 Администратор</span>
    <div class="navbar__links">
      <a href="#/admin/dashboard" class="nav-link ${active==='dash'?'active':''}">Тесты</a>
      <a href="#/admin/results"   class="nav-link ${active==='res'?'active':''}">Результаты</a>
      <button class="nav-link" id="btn-logout">Выйти</button>
    </div>
  </nav>`;
}
function bindLogout() {
  $('#btn-logout')?.addEventListener('click', () => {
    localStorage.removeItem('admin_token'); go('/');
  });
}

const STATUS = { draft:'Черновик', active:'Активен', archived:'В архиве' };

/* ═══════════════════════════════════════════════════════════════
   HOME
═══════════════════════════════════════════════════════════════ */
function pgHome() {
  mount(`<div class="home"><div class="home-card">
    <div style="font-size:3rem;margin-bottom:16px">📝</div>
    <h1 class="home-title">Система тестирования</h1>
    <p class="home-sub">Выберите режим входа</p>
    <div class="home-btns">
      <button class="btn btn-primary btn-lg" id="btn-participant">Пройти тест</button>
      <button class="btn btn-secondary btn-lg" id="btn-admin">Войти как администратор</button>
    </div>
  </div></div>`);
  $('#btn-participant').onclick = () => go('/test/enter');
  $('#btn-admin').onclick       = () => go('/admin/login');
}

/* ═══════════════════════════════════════════════════════════════
   ADMIN LOGIN
═══════════════════════════════════════════════════════════════ */
function pgAdminLogin() {
  mount(`<div class="home"><div class="home-card">
    <div style="font-size:2rem;margin-bottom:12px">🔐</div>
    <h1 class="home-title" style="font-size:1.4rem">Вход администратора</h1>
    <form id="login-form" style="margin-top:24px;text-align:left">
      <div class="fg"><label class="label">Логин</label>
        <input class="input" id="f-login" autocomplete="username" required autofocus></div>
      <div class="fg"><label class="label">Пароль</label>
        <input class="input" id="f-pwd" type="password" autocomplete="current-password" required></div>
      <div class="err" id="login-err"></div>
      <button class="btn btn-primary btn-full btn-lg" type="submit" id="btn-login-sub">Войти</button>
    </form>
    <button class="btn btn-secondary btn-full mt16" id="btn-back">← На главную</button>
  </div></div>`);

  $('#btn-back').onclick = () => go('/');
  $('#login-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('#btn-login-sub');
    btn.disabled = true; btn.textContent = 'Вход...';
    const err = $('#login-err');
    err.style.display = 'none';
    try {
      const data = await API.post('/auth/login', {
        login: $('#f-login').value,
        password: $('#f-pwd').value,
      });
      localStorage.setItem('admin_token', data.token);
      go('/admin/dashboard');
    } catch (ex) {
      err.textContent = ex.message; err.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Войти';
    }
  };
}

/* ═══════════════════════════════════════════════════════════════
   ADMIN DASHBOARD
═══════════════════════════════════════════════════════════════ */
async function pgDashboard() {
  mount(navbar('dash') + '<div class="wrap">' + spinner() + '</div>');
  bindLogout();

  let tests = [];
  try { tests = await API.get('/admin/tests'); }
  catch (e) { mount(navbar('dash') + `<div class="wrap"><div class="alert alert-err">${e.message}</div></div>`); bindLogout(); return; }

  function renderPwdForm(open) {
    if (!open) return '';
    return `<div class="card mb0" style="margin-bottom:16px">
      <h3 style="margin-bottom:14px;font-size:1rem">Смена пароля</h3>
      <form id="pwd-form">
        <div class="flex gap12 wrap-flex">
          <div class="fg" style="flex:1;min-width:160px;margin-bottom:0"><label class="label">Текущий пароль</label>
            <input class="input" id="p-cur" type="password" required></div>
          <div class="fg" style="flex:1;min-width:160px;margin-bottom:0"><label class="label">Новый пароль</label>
            <input class="input" id="p-new" type="password" required></div>
          <div class="fg" style="flex:1;min-width:160px;margin-bottom:0"><label class="label">Повторите</label>
            <input class="input" id="p-con" type="password" required></div>
        </div>
        <div class="err" id="pwd-err" style="margin-top:8px"></div>
        <div id="pwd-ok" class="alert alert-ok" style="display:none;margin-top:8px"></div>
        <button class="btn btn-primary btn-sm mt8" type="submit">Сохранить</button>
      </form>
    </div>`;
  }

  function renderTests(list) {
    if (!list.length) return `<div style="padding:40px;text-align:center;color:var(--text2)">Тестов пока нет. Создайте первый.</div>`;
    return `<div class="tbl-wrap"><table>
      <thead><tr><th>Название</th><th>Статус</th><th>Вопросов</th><th>Время (мин)</th><th>Действия</th></tr></thead>
      <tbody>${list.map(t => `<tr>
        <td>${t.title}</td>
        <td><span class="badge badge-${t.status}">${STATUS[t.status]||t.status}</span></td>
        <td>${t.question_count}</td>
        <td>${t.time_limit || '—'}</td>
        <td><div class="td-act">
          <a href="#/admin/tests/${t.id}" class="btn btn-secondary btn-sm">Редактировать</a>
          <button class="btn btn-danger btn-sm" data-del="${t.id}" data-title="${t.title}">Удалить</button>
        </div></td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  }

  let pwdOpen = false;
  function render() {
    mount(navbar('dash') + `<div class="wrap">
      <div class="ph"><h1>Тесты</h1>
        <div class="flex gap8">
          <button class="btn btn-secondary btn-sm" id="btn-pwd-toggle">🔑 Сменить пароль</button>
          <a href="#/admin/tests/new" class="btn btn-primary">+ Создать тест</a>
        </div>
      </div>
      ${renderPwdForm(pwdOpen)}
      <div class="card" style="padding:0" id="tests-card">${renderTests(tests)}</div>
    </div>`);

    bindLogout();
    $('#btn-pwd-toggle').onclick = () => { pwdOpen = !pwdOpen; render(); };

    if (pwdOpen) {
      $('#pwd-form').onsubmit = async (e) => {
        e.preventDefault();
        const nw = $('#p-new').value, cn = $('#p-con').value;
        const errEl = $('#pwd-err'), okEl = $('#pwd-ok');
        errEl.style.display = 'none'; okEl.style.display = 'none';
        if (nw !== cn) { errEl.textContent = 'Пароли не совпадают'; errEl.style.display='block'; return; }
        try {
          await API.post('/auth/change-password', { currentPassword: $('#p-cur').value, newPassword: nw });
          okEl.textContent = '✓ Пароль изменён'; okEl.style.display = 'block';
        } catch (ex) { errEl.textContent = ex.message; errEl.style.display = 'block'; }
      };
    }

    $$('[data-del]').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm(`Удалить тест «${btn.dataset.title}»? Все результаты будут потеряны.`)) return;
        try {
          await API.delete('/admin/tests/' + btn.dataset.del);
          tests = tests.filter(t => String(t.id) !== btn.dataset.del);
          $('#tests-card').innerHTML = renderTests(tests);
          $$('[data-del]').forEach(b => b.onclick = btn.onclick); // re-bind
        } catch (ex) { alert(ex.message); }
      };
    });
  }

  render();
}

/* ═══════════════════════════════════════════════════════════════
   TEST EDITOR
═══════════════════════════════════════════════════════════════ */
let _ed = {};

async function pgTestEditor(testId) {
  mount(navbar('dash') + '<div class="wrap">' + spinner() + '</div>');
  bindLogout();

  _ed = { testId, test: null, questions: [], adding: false, editId: null };

  if (testId) {
    try {
      const d = await API.get('/admin/tests/' + testId);
      _ed.test = d; _ed.questions = d.questions || [];
    } catch (e) {
      mount(navbar('dash') + `<div class="wrap"><div class="alert alert-err">${e.message}</div></div>`);
      bindLogout(); return;
    }
  }
  _renderEditor();
}

function _renderEditor() {
  const { testId, test, questions, adding, editId } = _ed;
  const t = test || {};

  const metaHtml = `<div class="card">
    <h2 style="font-size:1rem;font-weight:600;margin-bottom:16px">Настройки теста</h2>
    <div id="meta-ok"  class="alert alert-ok"  style="display:none"></div>
    <div id="meta-err" class="alert alert-err" style="display:none"></div>
    <form id="meta-form">
      <div class="fg"><label class="label">Название *</label>
        <input class="input" id="t-title" value="${t.title||''}" required placeholder="Введите название"></div>
      <div class="fg"><label class="label">Инструкция / описание</label>
        <textarea class="textarea" id="t-desc">${t.description||''}</textarea></div>
      <div class="flex gap12 wrap-flex">
        <div class="fg" style="flex:1;min-width:160px"><label class="label">Ограничение времени (мин)</label>
          <input class="input" id="t-time" type="number" min="1" max="300" value="${t.time_limit||''}" placeholder="Без ограничения"></div>
        <div class="fg" style="flex:1;min-width:160px"><label class="label">Статус</label>
          <select class="select" id="t-status">
            <option value="draft"    ${(t.status||'draft')==='draft'?'selected':''}>Черновик</option>
            <option value="active"   ${t.status==='active'?'selected':''}>Активен</option>
            <option value="archived" ${t.status==='archived'?'selected':''}>В архиве</option>
          </select></div>
      </div>
      <button class="btn btn-primary" type="submit" id="btn-meta-save">
        ${testId ? 'Сохранить' : 'Создать тест'}
      </button>
    </form>
  </div>`;

  const qFormHtml = (q) => {
    const a = q ? q.answers : [{text:'',is_correct:true},{text:'',is_correct:false},{text:'',is_correct:false},{text:'',is_correct:false}];
    return `<div class="card" style="border:2px solid var(--blue-light)">
      <div class="fg"><label class="label">Текст вопроса</label>
        <textarea class="textarea" id="qf-text">${q ? q.text : ''}</textarea></div>
      <div class="label" style="margin-bottom:8px">Варианты ответов (отметьте правильный)</div>
      ${a.map((ans, i) => `<div class="flex items-center gap8" style="margin-bottom:8px">
        <input type="radio" name="qf-correct" value="${i}" ${ans.is_correct?'checked':''} style="width:18px;height:18px;flex-shrink:0;accent-color:var(--green)">
        <input class="input" id="qf-ans-${i}" value="${ans.text||''}" placeholder="Вариант ${i+1}">
      </div>`).join('')}
      <div class="hint">Отметьте правиоьный ответ радиокнопкой</div>
      <div class="err" id="qf-err"></div>
      <div class="flex gap8 mt16">
        <button class="btn btn-primary btn-sm" id="btn-qf-save">Сохранить вопрос</button>
        <button class="btn btn-secondary btn-sm" id="btn-qf-cancel">Отмена</button>
      </div>
    </div>`;
  };

  const qListHtml = questions.map((q, i) => {
    if (String(q.id) === String(editId)) return qFormHtml(q);
    return `<div class="card" style="margin-bottom:10px">
      <div class="flex justify-between items-center wrap-flex gap8">
        <div style="flex:1">
          <div class="bold" style="margin-bottom:6px">${i+1}. ${q.text}</div>
          ${(q.answers||[]).map(a => `<div style="font-size:.88rem;color:${a.is_correct?'var(--green)':'var(--text2)'}">
            ${a.is_correct?'✓ ':'○ '}${a.text}</div>`).join('')}
        </div>
        <div class="flex gap8" style="flex-shrink:0">
          <button class="btn btn-secondary btn-sm" data-edit="${q.id}">Изменить</button>
          <button class="btn btn-danger btn-sm" data-qdelete="${q.id}" data-qtitle="${q.text.slice(0,40)}">Удалить</button>
        </div>
      </div>
    </div>`;
  }).join('');

  const questionsSection = testId ? `
    <div class="ph mt8"><h2>Вопросы (${questions.length})</h2>
      ${!adding && !editId ? '<button class="btn btn-primary" id="btn-add-q">+ Добавить вопрос</button>' : ''}
    </div>
    ${questions.length === 0 && !adding ? '<div class="alert alert-info">Вопросов пока нет. Добавьте первый вопрос.</div>' : ''}
    <div id="q-list">${qListHtml}</div>
    ${adding ? qFormHtml(null) : ''}
  ` : '';

  mount(`${navbar('dash')}<div class="wrap">
    <div class="ph">
      <h1>${testId ? 'Редактирование теста' : 'Новый тест'}</h1>
      <a href="#/admin/dashboard" class="btn btn-secondary">← К тестам</a>
    </div>
    ${metaHtml}
    ${questionsSection}
  </div>`);

  bindLogout();

  // Meta form
  $('#meta-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('#btn-meta-save');
    btn.disabled = true;
    $('#meta-err').style.display = 'none';
    const payload = {
      title: $('#t-title').value.trim(),
      description: $('#t-desc').value || null,
      time_limit: $('#t-time').value ? Number($('#t-time').value) : null,
      status: $('#t-status').value,
    };
    try {
      if (!_ed.testId) {
        const d = await API.post('/admin/tests', payload);
        _ed.testId = d.id; _ed.test = d;
        go('/admin/tests/' + d.id);
      } else {
        _ed.test = await API.put('/admin/tests/' + _ed.testId, payload);
        $('#meta-ok').textContent = 'Изменения сохранены';
        $('#meta-ok').style.display = 'block';
        setTimeout(() => { if ($('#meta-ok')) $('#meta-ok').style.display='none'; }, 3000);
      }
    } catch (ex) {
      $('#meta-err').textContent = ex.message; $('#meta-err').style.display = 'block';
    } finally { btn.disabled = false; }
  };

  if (testId) {
    // Add question button
    $('#btn-add-q')?.addEventListener('click', () => { _ed.adding = true; _ed.editId = null; _renderEditor(); });

    // Edit question buttons
    $$('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => { _ed.editId = btn.dataset.edit; _ed.adding = false; _renderEditor(); });
    });

    // Delete question buttons
    $$('[data-qdelete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Удалить вопрос «${btn.dataset.qtitle}...»?`)) return;
        try {
          await API.delete('/admin/questions/' + btn.dataset.qdelete);
          _ed.questions = _ed.questions.filter(q => String(q.id) !== btn.dataset.qdelete);
          _renderEditor();
        } catch (ex) { alert(ex.message); }
      });
    });

    // Question form bindings
    const bindQForm = (isEdit) => {
      $('#btn-qf-cancel')?.addEventListener('click', () => { _ed.adding = false; _ed.editId = null; _renderEditor(); });
      $('#btn-qf-save')?.addEventListener('click', async () => {
        const errEl = $('#qf-err');
        errEl.style.display = 'none';
        const text = $('#qf-text').value.trim();
        if (!text) { errEl.textContent = 'Введите текст вопроса'; errEl.style.display='block'; return; }
        const answers = [0,1,2,3].map(i => ({
          text: $(`#qf-ans-${i}`).value.trim(),
          is_correct: $(`input[name="qf-correct"]:checked`)?.value === String(i),
        }));
        if (answers.some(a => !a.text)) { errEl.textContent = 'Заполните все 4 варианта ответа'; errEl.style.display='block'; return; }
        if (!answers.some(a => a.is_correct)) { errEl.textContent = 'Выберите правильный ответ'; errEl.style.display='block'; return; }

        try {
          if (isEdit) {
            const d = await API.put('/admin/questions/' + _ed.editId, { text, answers, order_index: _ed.questions.findIndex(q => String(q.id) === String(_ed.editId)) });
            _ed.questions = _ed.questions.map(q => String(q.id) === String(_ed.editId) ? d : q);
            _ed.editId = null;
          } else {
            const d = await API.post('/admin/tests/' + _ed.testId + '/questions', { text, answers, order_index: _ed.questions.length });
            _ed.questions.push(d);
            _ed.adding = false;
          }
          _renderEditor();
        } catch (ex) { errEl.textContent = ex.message; errEl.style.display='block'; }
      });
    };

    if (_ed.adding)           bindQForm(false);
    if (_ed.editId !== null)  bindQForm(true);
  }
}

/* ═══════════════════════════════════════════════════════════════
   RESULTS LIST
═══════════════════════════════════════════════════════════════ */
async function pgResults() {
  mount(navbar('res') + '<div class="wrap--lg">' + spinner() + '</div>');
  bindLogout();

  let sessions = [], tests = [];
  try {
    [sessions, tests] = await Promise.all([API.get('/admin/results'), API.get('/admin/tests')]);
  } catch (e) {
    mount(navbar('res') + `<div class="wrap--lg"><div class="alert alert-err">${e.message}</div></div>`);
    bindLogout(); return;
  }

  let filterTest = '', filterName = '';

  function filtered() {
    return sessions.filter(s =>
      (!filterTest || String(s.test_id) === filterTest) &&
      (!filterName || s.participant_name.toLowerCase().includes(filterName.toLowerCase()))
    );
  }

  function renderTable(list) {
    if (!list.length) return `<div style="padding:40px;text-align:center;color:var(--text2)">${sessions.length?'Ничего не найдено':'Результатов пока нет'}</div>`;
    return `<div class="tbl-wrap"><table>
      <thead><tr><th>ФИО участника</th><th>Тест</th><th>Начало</th><th>Окончание</th><th>Время</th><th>Результат</th><th>%</th><th></th></tr></thead>
      <tbody>${list.map(s => {
        const pct = s.total_questions > 0 ? Math.round(s.score / s.total_questions * 100) : 0;
        const c = pct >= 70 ? 'var(--green)' : pct >= 40 ? '#E65100' : 'var(--red)';
        return `<tr>
          <td>${s.participant_name}</td>
          <td>${s.test_title}</td>
          <td>${fmt(s.started_at)}</td>
          <td>${s.finished_at ? fmt(s.finished_at) : '<span class="text2">В процессе</span>'}</td>
          <td>${dur(s.started_at, s.finished_at)}</td>
          <td>${s.finished_at ? s.score+' / '+s.total_questions : '—'}</td>
          <td>${s.finished_at ? `<span style="color:${c};font-weight:600">${pct}%</span>` : '—'}</td>
          <td><a href="#/admin/results/${s.id}" class="btn btn-secondary btn-sm">Подробнее</a></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  }

  function render() {
    mount(`${navbar('res')}<div class="wrap--lg">
      <div class="ph"><h1>Результаты тестирований</h1></div>
      <div class="card" style="padding:16px 20px;margin-bottom:16px">
        <div class="flex gap12 wrap-flex items-center">
          <div class="fg" style="flex:1;min-width:200px;margin-bottom:0"><label class="label">Фильтр по тесту</label>
            <select class="select" id="f-test">
              <option value="">Все тесты</option>
              ${tests.map(t => `<option value="${t.id}" ${filterTest===String(t.id)?'selected':''}>${t.title}</option>`).join('')}
            </select></div>
          <div class="fg" style="flex:1;min-width:200px;margin-bottom:0"><label class="label">Поиск по ФИО</label>
            <input class="input" id="f-name" value="${filterName}" placeholder="Введите ФИО..."></div>
        </div>
      </div>
      <div class="card" style="padding:0" id="res-table">${renderTable(filtered())}</div>
    </div>`);
    bindLogout();
    $('#f-test').oninput = (e) => { filterTest = e.target.value; $('#res-table').innerHTML = renderTable(filtered()); };
    $('#f-name').oninput = (e) => { filterName = e.target.value; $('#res-table').innerHTML = renderTable(filtered()); };
  }

  render();
}

/* ═══════════════════════════════════════════════════════════════
   RESULT DETAIL
═══════════════════════════════════════════════════════════════ */
async function pgResultDetail(id) {
  mount(navbar('res') + '<div class="wrap">' + spinner() + '</div>');
  bindLogout();

  let s;
  try { s = await API.get('/admin/results/' + id); }
  catch (e) { mount(navbar('res') + `<div class="wrap"><div class="alert alert-err">${e.message}</div></div>`); bindLogout(); return; }

  const pct = s.total_questions > 0 ? Math.round(s.score / s.total_questions * 100) : 0;
  const cls = pct >= 70 ? 'sc-good' : pct >= 40 ? 'sc-mid' : 'sc-bad';

  mount(`${navbar('res')}<div class="wrap">
    <div class="ph">
      <h1>Результат участника</h1>
      <div class="flex gap8">
        <button class="btn btn-secondary btn-sm" id="btn-docx">⬇ DOCX</button>
        <button class="btn btn-secondary btn-sm" id="btn-pdf">⬇ PDF</button>
        <a href="#/admin/results" class="btn btn-secondary btn-sm">← Назад</a>
      </div>
    </div>
    <div class="card">
      <div class="score-circle ${cls}">
        <span class="sc-pct">${pct}%</span>
        <span class="sc-lbl">${s.score}/${s.total_questions}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
        ${[['Участник',s.participant_name],['Тест',s.test_title],['Начало',fmt(s.started_at)],
           ['Окончание',fmt(s.finished_at)],['Затрачено',dur(s.started_at,s.finished_at)],
           ['Правильных',s.score+' из '+s.total_questions]].map(([l,v])=>`
          <div><div class="text2" style="font-size:.8rem;margin-bottom:2px">${l}</div><div class="bold">${v}</div></div>`).join('')}
      </div>
    </div>
    <h2 style="margin:20px 0 12px;font-size:1.1rem;font-weight:600">Ответы на вопросы</h2>
    ${(s.responses||[]).map((r,i)=>`
      <div class="card" style="margin-bottom:10px;border-left:4px solid ${r.is_correct?'var(--green)':'var(--red)'}">
        <div class="bold" style="margin-bottom:8px">${i+1}. ${r.question_text}</div>
        <div style="font-size:.9rem;${r.is_correct?'':'margin-bottom:6px'}">
          <span class="text2">Ответ участника: </span>
          <span style="color:${r.is_correct?'var(--green)':'var(--red)'};font-weight:500">
            ${r.chosen_answer||'(нет ответа)'} ${r.is_correct?'✓':'✗'}
          </span>
        </div>
        ${!r.is_correct?`<div style="font-size:.9rem"><span class="text2">Правильный ответ: </span>
          <span style="color:var(--green);font-weight:500">${r.correct_answer}</span></div>`:''}
      </div>`).join('')}
  </div>`);

  bindLogout();

  async function doExport(fmt) {
    const btn = fmt === 'docx' ? $('#btn-docx') : $('#btn-pdf');
    btn.disabled = true; btn.textContent = 'Экспорт...';
    try { await API.download('/admin/results/' + id + '/export/' + fmt, 'result_' + id + '.' + fmt); }
    catch (e) { alert(e.message); }
    finally { btn.disabled = false; btn.textContent = fmt === 'docx' ? '⬇ DOCX' : '⬇ PDF'; }
  }
  $('#btn-docx').onclick = () => doExport('docx');
  $('#btn-pdf').onclick  = () => doExport('pdf');
}

/* ═══════════════════════════════════════════════════════════════
   PARTICIPANT — ENTER
═══════════════════════════════════════════════════════════════ */
async function pgEnter() {
  mount('<div class="home"><div class="home-card" style="max-width:500px">' + spinner() + '</div></div>');
  let tests = [];
  try { tests = await API.get('/participant/tests'); } catch {}

  mount(`<div class="home"><div class="home-card" style="max-width:500px">
    <div style="font-size:2rem;margin-bottom:12px">📋</div>
    <h1 class="home-title" style="font-size:1.4rem">Начало тестирования</h1>
    <p class="home-sub">Заполните данные для начала теста</p>
    <form id="enter-form" style="text-align:left;margin-top:8px">
      <div class="fg"><label class="label">Фамилия *</label>
        <input class="input" id="e-last" placeholder="Иванов" required autofocus></div>
      <div class="fg"><label class="label">Имя *</label>
        <input class="input" id="e-first" placeholder="Иван" required></div>
      <div class="fg"><label class="label">Отчество</label>
        <input class="input" id="e-mid" placeholder="Иванович (необязательно)"></div>
      <div class="fg"><label class="label">Выберите тест *</label>
        ${!tests.length
          ? '<div class="alert alert-info" style="margin-top:4px">Активных тестов нет. Обратитесь к преподавателю.</div>'
          : `<select class="select" id="e-test" required>
               <option value="">— Выберите тест —</option>
               ${tests.map(t=>`<option value="${t.id}">${t.title}${t.time_limit?' ('+t.time_limit+' мин)':''}</option>`).join('')}
             </select>`}
      </div>
      <div class="err" id="enter-err"></div>
      <button class="btn btn-primary btn-full btn-lg" type="submit" id="btn-start" ${!tests.length?'disabled':''}>Начать тест</button>
    </form>
    <button class="btn btn-secondary btn-full mt16" id="btn-back">← На главную</button>
  </div></div>`);

  $('#btn-back').onclick = () => go('/');
  $('#enter-form').onsubmit = async (e) => {
    e.preventDefault();
    const err = $('#enter-err'); err.style.display = 'none';
    const last = $('#e-last').value.trim(), first = $('#e-first').value.trim(), mid = ($('#e-mid')?.value||'').trim();
    const test_id = $('#e-test')?.value;
    if (!test_id) { err.textContent = 'Выберите тест'; err.style.display='block'; return; }
    const btn = $('#btn-start'); btn.disabled = true; btn.textContent = 'Загрузка...';
    try {
      const d = await API.post('/participant/sessions', {
        test_id: Number(test_id),
        participant_name: [last, first, mid].filter(Boolean).join(' '),
      });
      go('/test/' + d.session_id);
    } catch (ex) { err.textContent = ex.message; err.style.display='block'; btn.disabled=false; btn.textContent='Начать тест'; }
  };
}

/* ═══════════════════════════════════════════════════════════════
   PARTICIPANT — TAKE TEST
═══════════════════════════════════════════════════════════════ */
let _tt = {};

async function pgTakeTest(sessionId) {
  mount(spinner());
  let session;
  try { session = await API.get('/participant/sessions/' + sessionId); }
  catch (e) { mount(`<div class="wrap"><div class="alert alert-err">${e.message}</div></div>`); return; }

  _tt = {
    session,
    answers: Object.fromEntries(Object.entries(session.saved_responses || {}).map(([k,v])=>[Number(k),v])),
    current: 0,
    timeLeft: session.time_limit ? Math.max(0, session.time_limit * 60 - Math.round((Date.now() - new Date(session.started_at)) / 1000)) : null,
    timer: null,
    autosave: null,
  };

  const qs = session.questions || [];

  function renderPage() {
    const { answers, current, timeLeft } = _tt;
    const q = qs[current];
    const answered = Object.keys(answers).length;
    const progress = qs.length ? answered / qs.length * 100 : 0;
    const tc = timeLeft === null ? '' : timeLeft <= 60 ? 'timer-danger' : timeLeft <= 300 ? 'timer-warn' : '';

    mount(`<div style="min-height:100vh;background:var(--gray)">
      <div style="background:#fff;border-bottom:1px solid var(--border);padding:12px 20px">
        <div style="max-width:720px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            <div class="bold" style="font-size:.95rem">${session.title}</div>
            <div class="text2" style="font-size:.82rem">${session.participant_name}</div>
          </div>
          <div class="flex items-center gap12">
            <div style="font-size:.88rem;color:var(--text2)">Отвечено: <strong>${answered}/${qs.length}</strong></div>
            ${timeLeft !== null ? `<div class="timer ${tc}" id="timer-display">⏱ ${fmtTime(timeLeft)}</div>` : ''}
          </div>
        </div>
        <div style="max-width:720px;margin:8px auto 0">
          <div class="prog"><div class="prog-fill" style="width:${progress}%"></div></div>
        </div>
      </div>
      <div style="max-width:720px;margin:0 auto;padding:24px 16px">
        <div class="q-nav">
          ${qs.map((qn,i) => {
            const bg = i===current ? 'var(--blue)' : answers[qn.id] ? 'var(--blue-light)' : '#fff';
            const color = i===current ? '#fff' : answers[qn.id] ? 'var(--blue)' : 'var(--text2)';
            return `<button class="q-pill" data-qnav="${i}" style="background:${bg};color:${color}">${i+1}</button>`;
          }).join('')}
        </div>
        ${q ? `<div class="card">
          <div class="text2" style="font-size:.82rem;margin-bottom:8px">Вопрос ${current+1} из ${qs.length}</div>
          <div class="bold" style="font-size:1.05rem;margin-bottom:16px;line-height:1.5">${q.text}</div>
          <div class="radio-group">
            ${q.answers.map(a => `<label class="radio-card ${answers[q.id]===a.id?'sel':''}">
              <input type="radio" name="ans" value="${a.id}" ${answers[q.id]===a.id?'checked':''}>
              <span>${a.text}</span>
            </label>`).join('')}
          </div>
        </div>` : ''}
        <div class="flex justify-between mt16 wrap-flex gap8">
          <button class="btn btn-secondary" id="btn-prev" ${current===0?'disabled':''}>← Назад</button>
          ${current < qs.length-1
            ? '<button class="btn btn-primary" id="btn-next">Далее →</button>'
            : '<button class="btn btn-success" id="btn-submit">✓ Завершить тест</button>'}
        </div>
        ${answered < qs.length ? `<div class="alert alert-info mt16">Без ответа: ${qs.length-answered} вопрос(ов)</div>` : ''}
      </div>
    </div>`);

    // Nav pills
    $$('[data-qnav]').forEach(btn => {
      btn.addEventListener('click', () => { _tt.current = Number(btn.dataset.qnav); renderPage(); });
    });

    // Answer selection
    $$('input[name="ans"]').forEach(inp => {
      inp.addEventListener('change', async () => {
        const aid = Number(inp.value);
        _tt.answers[q.id] = aid;
        renderPage();
        try { await API.post('/participant/sessions/'+sessionId+'/autosave', { question_id: q.id, answer_id: aid }); } catch {}
      });
    });

    $('#btn-prev')?.addEventListener('click', () => { _tt.current--; renderPage(); });
    $('#btn-next')?.addEventListener('click', () => { _tt.current++; renderPage(); });
    $('#btn-submit')?.addEventListener('click', () => submitTest(false));
  }

  async function submitTest(auto) {
    if (!auto && !confirm('Завершить тест? Изменить ответы будет невозможно.')) return;
    clearInterval(_tt.timer); clearInterval(_tt.autosave);
    mount(spinner());
    try {
      const responses = Object.entries(_tt.answers).map(([qid, aid]) => ({ question_id: Number(qid), answer_id: aid }));
      const d = await API.post('/participant/sessions/'+sessionId+'/submit', { responses });
      _cleanup = null;
      location.hash = '#/test/done';
      // pass state via sessionStorage since hash navigation loses state
      sessionStorage.setItem('done', JSON.stringify({ score: d.score, total: d.total_questions }));
    } catch (e) { alert('Ошибка отправки: ' + e.message); renderPage(); }
  }

  // Timer
  if (_tt.timeLeft !== null) {
    _tt.timer = setInterval(() => {
      _tt.timeLeft--;
      const el = document.getElementById('timer-display');
      if (el) {
        el.textContent = '⏱ ' + fmtTime(_tt.timeLeft);
        el.className = 'timer ' + (_tt.timeLeft <= 60 ? 'timer-danger' : _tt.timeLeft <= 300 ? 'timer-warn' : '');
      }
      if (_tt.timeLeft <= 0) submitTest(true);
    }, 1000);
  }

  _cleanup = () => { clearInterval(_tt.timer); clearInterval(_tt.autosave); };
  renderPage();
}

/* ═══════════════════════════════════════════════════════════════
   PARTICIPANT — DONE
═══════════════════════════════════════════════════════════════ */
function pgDone() {
  let score = 0, total = 0;
  try { const d = JSON.parse(sessionStorage.getItem('done') || '{}'); score = d.score||0; total = d.total||0; } catch {}
  sessionStorage.removeItem('done');

  const pct = total > 0 ? Math.round(score / total * 100) : 0;
  const cls = pct >= 70 ? 'sc-good' : pct >= 40 ? 'sc-mid' : 'sc-bad';
  const msg = pct >= 70 ? 'Отличный результат!' : pct >= 40 ? 'Неплохой результат' : 'Стоит повторить материал';

  mount(`<div class="home"><div class="home-card">
    <h1 class="home-title" style="margin-bottom:24px">Тест завершён</h1>
    <div class="score-circle ${cls}">
      <span class="sc-pct">${pct}%</span><span class="sc-lbl">${score}/${total}</span>
    </div>
    <p style="font-size:1.1rem;font-weight:500;margin-bottom:8px">${msg}</p>
    <p class="text2" style="margin-bottom:28px;font-size:.9rem">Правильных ответов: <strong>${score}</strong> из <strong>${total}</strong></p>
    <div class="home-btns">
      <button class="btn btn-primary btn-lg" id="btn-again">Пройти ещё раз</button>
      <button class="btn btn-secondary btn-lg" id="btn-home">На главную</button>
    </div>
  </div></div>`);

  $('#btn-again').onclick = () => go('/test/enter');
  $('#btn-home').onclick  = () => go('/');
}
