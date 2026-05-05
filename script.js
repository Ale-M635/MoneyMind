/* ============================================================
   MoneyMind – Script principal
   Moneda: Bolivianos (Bs.)
   Persistencia: LocalStorage
   ============================================================ */

'use strict';

/* ============================================================
   1. ESTADO GLOBAL
   ============================================================ */
const App = {
  currentUser: null,  // nombre del usuario activo
  expenses:    [],    // array de gastos del usuario activo
  income:      { monthly: 0, daily: 0 }, // ingresos del usuario
  goal:        null,  // meta de ahorro { name, amount, saved }
};

/* Colores para el gráfico de torta (uno por categoría) */
const PIE_COLORS = [
  '#2E7D32','#1565C0','#00897B','#E65100','#6A1B9A',
  '#AD1457','#F9A825','#00838F','#4E342E','#37474F'
];

/* ============================================================
   2. HELPERS DE LOCALSTORAGE
   ============================================================ */

/**
 * Devuelve el objeto de usuarios guardado en LS.
 * Estructura: { "usuario": { password, expenses, income, goal } }
 */
function getUsers() {
  return JSON.parse(localStorage.getItem('mm_users') || '{}');
}

function saveUsers(users) {
  localStorage.setItem('mm_users', JSON.stringify(users));
}

/** Carga todos los datos del usuario activo desde LS. */
function loadUserData() {
  const users = getUsers();
  const u = users[App.currentUser];
  App.expenses = u?.expenses || [];
  App.income   = u?.income   || { monthly: 0, daily: 0 };
  App.goal     = u?.goal     || null;
}

/** Persiste todos los datos del usuario activo en LS. */
function persistUserData() {
  const users = getUsers();
  if (users[App.currentUser]) {
    users[App.currentUser].expenses = App.expenses;
    users[App.currentUser].income   = App.income;
    users[App.currentUser].goal     = App.goal;
    saveUsers(users);
  }
}

/* ============================================================
   3. AUTENTICACIÓN
   ============================================================ */

function showLogin() {
  document.getElementById('screen-login').classList.add('active');
  document.getElementById('screen-app').classList.remove('active');
}

function showApp() {
  document.getElementById('screen-login').classList.remove('active');
  document.getElementById('screen-app').classList.add('active');
  document.getElementById('topbar-username').textContent = `👤 ${App.currentUser}`;
  navigateTo('dashboard');
}

function login(username, password) {
  const users = getUsers();
  if (!users[username]) return 'Usuario no encontrado.';
  if (users[username].password !== password) return 'Contraseña incorrecta.';
  App.currentUser = username;
  loadUserData();
  return null;
}

function register(username, password) {
  if (!username.trim()) return 'El nombre de usuario no puede estar vacío.';
  if (password.length < 4) return 'La contraseña debe tener al menos 4 caracteres.';
  const users = getUsers();
  if (users[username]) return 'Ese nombre de usuario ya existe.';
  users[username] = { password, expenses: [], income: { monthly: 0, daily: 0 }, goal: null };
  saveUsers(users);
  return null;
}

/* ============================================================
   4. GESTIÓN DE GASTOS
   ============================================================ */

function addExpense(expense) {
  expense.id = Date.now().toString();
  App.expenses.unshift(expense);
  persistUserData();
}

function deleteExpense(id) {
  App.expenses = App.expenses.filter(e => e.id !== id);
  persistUserData();
}

function clearExpenses() {
  App.expenses = [];
  persistUserData();
}

/* ============================================================
   5. CÁLCULOS
   ============================================================ */

function totalExpenses() {
  return App.expenses.reduce((sum, e) => sum + e.amount, 0);
}

/** Devuelve { categoria: total } ordenado de mayor a menor. */
function expensesByCategory() {
  const map = {};
  App.expenses.forEach(e => {
    map[e.category] = (map[e.category] || 0) + e.amount;
  });
  return Object.fromEntries(Object.entries(map).sort((a, b) => b[1] - a[1]));
}

function topCategory() {
  const keys = Object.keys(expensesByCategory());
  return keys.length ? keys[0] : null;
}

function estimatedSaving() {
  return totalExpenses() * 0.20;
}

function expensesThisMonth() {
  const now = new Date();
  return App.expenses.filter(e => {
    const d = new Date(e.date + 'T00:00:00');
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
}

/** Saldo disponible = ingreso mensual - total gastado */
function availableBalance() {
  return App.income.monthly - totalExpenses();
}

/* ============================================================
   6. RENDERIZADO – DASHBOARD
   ============================================================ */

function renderDashboard() {
  const total   = totalExpenses();
  const balance = availableBalance();
  const goalPct = App.goal && App.goal.amount > 0
    ? Math.min(100, Math.round((App.goal.saved / App.goal.amount) * 100))
    : 0;

  // Tarjetas
  document.getElementById('stat-total').textContent    = formatBs(total);
  document.getElementById('stat-income').textContent   = formatBs(App.income.monthly);
  document.getElementById('stat-balance').textContent  = formatBs(balance);
  document.getElementById('stat-goal-pct').textContent = App.goal ? `${goalPct}%` : '–';

  // Colorear saldo según estado
  const balEl = document.getElementById('stat-balance');
  balEl.style.color = balance < 0 ? 'var(--red)' : balance < App.income.monthly * 0.1 ? 'var(--orange)' : 'var(--green-dark)';

  // Saludo dinámico
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '☀️ Buenos días' : hour < 18 ? '🌤️ Buenas tardes' : '🌙 Buenas noches';
  document.getElementById('dashboard-greeting').textContent = `${greeting}, ${App.currentUser}`;

  renderPieChart();
  renderBarChart();
  renderRecentExpenses();
}

/* ---- Gráfico de torta SVG ---- */
function renderPieChart() {
  const svg    = document.getElementById('pie-chart');
  const legend = document.getElementById('pie-legend');
  const empty  = document.getElementById('pie-empty');
  const cats   = expensesByCategory();
  const keys   = Object.keys(cats);
  const total  = totalExpenses();

  if (!keys.length) {
    svg.innerHTML = '';
    legend.innerHTML = '';
    empty.style.display = 'block';
    svg.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  svg.style.display = 'block';

  const cx = 100, cy = 100, r = 80;
  let startAngle = -Math.PI / 2; // empezar desde arriba
  let slices = '';

  keys.forEach((cat, i) => {
    const pct   = cats[cat] / total;
    const angle = pct * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const largeArc = angle > Math.PI ? 1 : 0;
    const color = PIE_COLORS[i % PIE_COLORS.length];

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    // Si es 100% dibujamos un círculo completo
    if (pct >= 0.9999) {
      slices += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" class="pie-slice"><title>${cat}: ${formatBs(cats[cat])}</title></circle>`;
    } else {
      slices += `<path d="M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${largeArc},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z" fill="${color}" class="pie-slice"><title>${cat}: ${formatBs(cats[cat])}</title></path>`;
    }
    startAngle = endAngle;
  });

  // Círculo interior (efecto donut)
  slices += `<circle cx="${cx}" cy="${cy}" r="44" fill="var(--surface)"/>`;
  // Texto central
  slices += `<text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="11" fill="var(--text-secondary)" font-family="Inter,sans-serif">Total</text>`;
  slices += `<text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--text-primary)" font-family="Inter,sans-serif">${formatBs(total)}</text>`;

  svg.innerHTML = slices;

  // Leyenda
  legend.innerHTML = keys.map((cat, i) => {
    const pct = total > 0 ? ((cats[cat] / total) * 100).toFixed(1) : 0;
    return `<div class="pie-legend-item">
      <span class="pie-dot" style="background:${PIE_COLORS[i % PIE_COLORS.length]}"></span>
      <span>${getCategoryEmoji(cat)} ${cat} <strong>${pct}%</strong></span>
    </div>`;
  }).join('');
}

/** Gráfico de barras CSS por categoría. */
function renderBarChart() {
  const container = document.getElementById('bar-chart');
  const cats = expensesByCategory();
  const keys = Object.keys(cats);

  if (!keys.length) {
    container.innerHTML = '<p class="empty-msg">Sin datos aún.</p>';
    return;
  }
  const maxVal = cats[keys[0]];
  container.innerHTML = keys.map(cat => {
    const pct = maxVal > 0 ? (cats[cat] / maxVal) * 100 : 0;
    return `<div class="bar-row">
      <span class="bar-label">${getCategoryEmoji(cat)} ${cat}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      <span class="bar-amount">${formatBs(cats[cat])}</span>
    </div>`;
  }).join('');
}

/** Últimos 5 gastos en el dashboard. */
function renderRecentExpenses() {
  const list  = document.getElementById('recent-list');
  const empty = document.getElementById('recent-empty');
  const last5 = App.expenses.slice(0, 5);

  if (!last5.length) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  list.innerHTML = last5.map(e => `
    <li class="recent-item">
      <div class="recent-item-left">
        <span class="recent-cat-icon">${getCategoryEmoji(e.category)}</span>
        <div>
          <div class="recent-desc">${escapeHtml(e.description || e.category)}</div>
          <div class="recent-cat">${e.category} · ${formatDate(e.date)}</div>
        </div>
      </div>
      <span class="recent-amount">${formatBs(e.amount)}</span>
    </li>`).join('');
}

/* ============================================================
   7. RENDERIZADO – HISTORIAL
   ============================================================ */

function renderHistory() {
  const list    = document.getElementById('expense-list');
  const empty   = document.getElementById('history-empty');
  const sortVal = document.getElementById('sort-select').value;
  let sorted    = [...App.expenses];

  switch (sortVal) {
    case 'date-desc':   sorted.sort((a, b) => new Date(b.date) - new Date(a.date)); break;
    case 'date-asc':    sorted.sort((a, b) => new Date(a.date) - new Date(b.date)); break;
    case 'amount-desc': sorted.sort((a, b) => b.amount - a.amount); break;
    case 'amount-asc':  sorted.sort((a, b) => a.amount - b.amount); break;
  }

  if (!sorted.length) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  list.innerHTML = sorted.map(e => `
    <li class="expense-item" data-id="${e.id}">
      <div class="expense-item-left">
        <span class="expense-emoji">${getCategoryEmoji(e.category)}</span>
        <div class="expense-info">
          <div class="expense-desc">${escapeHtml(e.description || '(sin descripción)')}</div>
          <div class="expense-meta">${e.category} · ${formatDate(e.date)}</div>
        </div>
      </div>
      <div class="expense-item-right">
        <span class="expense-amount">${formatBs(e.amount)}</span>
        <button class="btn-delete" data-id="${e.id}" title="Eliminar" aria-label="Eliminar gasto">🗑️</button>
      </div>
    </li>`).join('');
}

/* ============================================================
   8. RENDERIZADO – FINANZAS (ingresos + meta de ahorro)
   ============================================================ */

function renderFinances() {
  const monthly = App.income.monthly;
  const daily   = App.income.daily;

  // Rellenar campos del formulario con valores guardados
  if (monthly > 0) document.getElementById('income-monthly').value = monthly;
  if (daily   > 0) document.getElementById('income-daily').value   = daily;

  // Resumen ingreso vs gasto
  const total   = totalExpenses();
  const balance = availableBalance();
  document.getElementById('sum-income').textContent  = formatBs(monthly);
  document.getElementById('sum-spent').textContent   = formatBs(total);
  const balEl = document.getElementById('sum-balance');
  balEl.textContent  = formatBs(balance);
  balEl.style.color  = balance < 0 ? 'var(--red)' : 'var(--green-dark)';

  // Barra de progreso gasto/ingreso
  const fill    = document.getElementById('spend-bar-fill');
  const pctEl   = document.getElementById('spend-bar-pct');
  const msgEl   = document.getElementById('spend-bar-msg');
  const spendPct = monthly > 0 ? Math.min(100, (total / monthly) * 100) : 0;
  fill.style.width = `${spendPct}%`;
  pctEl.textContent = `${spendPct.toFixed(0)}%`;
  fill.className = 'spend-bar-fill';
  if (spendPct >= 100) {
    fill.classList.add('danger');
    msgEl.textContent = '⚠️ Has superado tu ingreso mensual.';
  } else if (spendPct >= 80) {
    fill.classList.add('warning');
    msgEl.textContent = '⚡ Estás cerca del límite de tu ingreso.';
  } else {
    msgEl.textContent = '✅ Tus gastos están dentro del rango saludable.';
  }

  // Regla 50/30/20
  renderRuleBreakdown(monthly);

  // Meta de ahorro
  renderGoalProgress();
}

/**
 * Muestra la distribución recomendada 50/30/20 del ingreso mensual.
 * 50% necesidades, 30% deseos, 20% ahorro.
 */
function renderRuleBreakdown(monthly) {
  const ruleEl  = document.getElementById('rule-breakdown');
  const emptyEl = document.getElementById('rule-empty');

  if (!monthly) {
    ruleEl.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  const rules = [
    { label: '🏠 Necesidades (50%)', pct: 50, cls: 'rule-fill-needs',   desc: 'Vivienda, alimentación, salud, transporte básico' },
    { label: '🎮 Deseos (30%)',       pct: 30, cls: 'rule-fill-wants',   desc: 'Ocio, ropa, tecnología, salidas' },
    { label: '🐷 Ahorro (20%)',       pct: 20, cls: 'rule-fill-savings', desc: 'Fondo de emergencia, metas, inversión' },
  ];

  ruleEl.innerHTML = rules.map(r => {
    const amount = (monthly * r.pct) / 100;
    return `<div class="rule-item">
      <span class="rule-label" title="${r.desc}">${r.label}</span>
      <div class="rule-track"><div class="rule-fill ${r.cls}" style="width:${r.pct}%"></div></div>
      <span class="rule-amount">${formatBs(amount)}</span>
    </div>`;
  }).join('');
}

/** Renderiza el progreso de la meta de ahorro. */
function renderGoalProgress() {
  const prog = document.getElementById('goal-progress');

  if (!App.goal || !App.goal.amount) {
    prog.style.display = 'none';
    return;
  }

  const { name, amount, saved } = App.goal;
  const pct = Math.min(100, Math.round((saved / amount) * 100));
  const remaining = Math.max(0, amount - saved);

  // Estimar meses para alcanzar la meta (basado en ahorro mensual 20%)
  const monthlySaving = App.income.monthly * 0.20;
  const monthsNeeded  = monthlySaving > 0 ? Math.ceil(remaining / monthlySaving) : null;

  document.getElementById('goal-title').textContent      = `🎯 ${escapeHtml(name)}`;
  document.getElementById('goal-pct-label').textContent  = `${pct}%`;
  document.getElementById('goal-fill').style.width       = `${pct}%`;
  document.getElementById('goal-saved-label').textContent  = `Ahorrado: ${formatBs(saved)}`;
  document.getElementById('goal-target-label').textContent = `Meta: ${formatBs(amount)}`;
  document.getElementById('goal-months-msg').textContent   = monthsNeeded
    ? `A este ritmo (20% de tu ingreso = ${formatBs(monthlySaving)}/mes), alcanzarás tu meta en ~${monthsNeeded} mes${monthsNeeded !== 1 ? 'es' : ''}.`
    : 'Ingresa tu ingreso mensual para estimar el tiempo.';

  prog.style.display = 'block';
}

/** Genera el análisis automático y sugerencias. */
function renderAnalysis() {
  const cats      = expensesByCategory();
  const keys      = Object.keys(cats);
  const total     = totalExpenses();
  const alertEl   = document.getElementById('analysis-alert');
  const breakEl   = document.getElementById('breakdown-list');
  const suggEl    = document.getElementById('suggestions-list');
  const suggEmpty = document.getElementById('suggestions-empty');
  const tipsCat   = document.getElementById('tips-category').value;

  if (!keys.length) {
    alertEl.className   = 'analysis-alert';
    alertEl.textContent = '📊 Aún no hay gastos para analizar. Empieza registrando tus movimientos.';
    breakEl.innerHTML   = '';
    suggEl.innerHTML    = '';
    suggEmpty.style.display = 'block';
    return;
  }

  const topCat = keys[0];
  const topPct = total > 0 ? (cats[topCat] / total) * 100 : 0;

  if (topPct > 50) {
    alertEl.className = 'analysis-alert warning';
    alertEl.innerHTML = `⚠️ <strong>Atención:</strong> Estás gastando mucho en <strong>${topCat}</strong>. Representa el <strong>${topPct.toFixed(0)}%</strong> de tus gastos totales.`;
  } else {
    alertEl.className = 'analysis-alert';
    alertEl.innerHTML = `✅ Tu categoría con mayor gasto es <strong>${topCat}</strong> (${topPct.toFixed(0)}% del total). Vas bien.`;
  }

  // Desglose por categoría
  breakEl.innerHTML = keys.map(cat => {
    const pct = total > 0 ? (cats[cat] / total) * 100 : 0;
    return `<div class="breakdown-item">
      <div class="breakdown-bar-wrap">
        <span class="breakdown-cat">${getCategoryEmoji(cat)} ${cat}</span>
        <div class="breakdown-track"><div class="breakdown-fill" style="width:${pct}%"></div></div>
      </div>
      <span class="breakdown-pct">${pct.toFixed(1)}%</span>
    </div>`;
  }).join('');

  // Consejos según filtro
  const tips = getTips(tipsCat, cats, total);
  if (!tips.length) {
    suggEl.innerHTML = '';
    suggEmpty.style.display = 'block';
  } else {
    suggEmpty.style.display = 'none';
    suggEl.innerHTML = tips.map(t => `<li class="suggestion-item">${t}</li>`).join('');
  }
}

/**
 * Banco de consejos por categoría.
 */
function getTips(filter, cats, total) {
  const allTips = {
    general: [
      `📐 Aplica la regla 50/30/20: 50% necesidades, 30% deseos, 20% ahorro.`,
      `🐷 Automatiza tu ahorro: transfiere el 20% de tu ingreso apenas lo recibas.`,
      `📋 Revisa tus gastos cada semana para detectar patrones antes de que se acumulen.`,
      `🎯 Tener una meta concreta (nombre + monto) multiplica la motivación para ahorrar.`,
      `💳 Evita compras impulsivas esperando 48 horas antes de decidir.`,
      `📊 Compara tus gastos del mes actual con el anterior para ver si mejoras.`,
      total > 0 ? `🐷 Reducir tus gastos un 20% te ahorraría <strong>${formatBs(estimatedSaving())}</strong> en este período.` : null,
    ].filter(Boolean),
    'Alimentación': [
      `🍳 Cocinar en casa puede reducir este gasto hasta un 50% vs comer fuera.`,
      `📝 Planifica el menú semanal y haz una sola compra grande en lugar de varias pequeñas.`,
      `🛒 Compra en mercados locales o ferias; suelen ser más baratos que supermercados.`,
      `🥦 Prioriza alimentos de temporada: son más baratos y nutritivos.`,
      `📦 Compra al por mayor productos no perecederos (arroz, fideo, aceite) para ahorrar.`,
      `🍱 Lleva almuerzo al trabajo o estudio: ahorras entre Bs. 15–30 por día.`,
    ],
    'Transporte': [
      `🚌 Usa transporte público siempre que sea posible; es hasta 5x más barato.`,
      `🚶 Para distancias menores a 15 minutos, caminar ahorra dinero y mejora tu salud.`,
      `🤝 Organiza carpooling con compañeros de trabajo o estudio.`,
      `🛵 Evalúa si una bicicleta o moto pequeña es más económica a largo plazo.`,
      `📍 Agrupa tus diligencias en una sola salida para reducir viajes.`,
    ],
    'Ocio': [
      `🎬 Busca actividades gratuitas: parques, eventos culturales, bibliotecas.`,
      `📺 Comparte suscripciones de streaming con familiares o amigos.`,
      `🎮 Aprovecha juegos gratuitos o de código abierto antes de comprar.`,
      `🎟️ Compra entradas con anticipación; suelen tener descuentos del 20–40%.`,
      `📚 Las bibliotecas públicas ofrecen libros, películas y cursos sin costo.`,
    ],
    'Salud': [
      `💊 Consulta si existen genéricos de tus medicamentos; son igual de efectivos y más baratos.`,
      `🏃 Invertir en hábitos saludables reduce gastos médicos futuros.`,
      `🏥 Usa el sistema público de salud para consultas de rutina.`,
      `🦷 La prevención dental es más barata que el tratamiento; visita al dentista cada 6 meses.`,
    ],
    'Educación': [
      `🎓 Busca becas, descuentos por pago anticipado o planes de financiamiento.`,
      `💻 YouTube, Coursera o Khan Academy ofrecen cursos gratuitos de calidad.`,
      `📚 Comparte libros de texto con compañeros o búscalos en versión digital.`,
      `🤝 Grupos de estudio reducen la necesidad de clases particulares.`,
    ],
    'Ropa': [
      `🛍️ Compra en temporada baja (enero y julio) cuando hay liquidaciones de hasta 70%.`,
      `👗 Prioriza prendas versátiles que combinen con varias outfits.`,
      `♻️ Considera ropa de segunda mano; hay piezas en excelente estado a bajo precio.`,
      `📋 Haz una lista de lo que realmente necesitas antes de ir de compras.`,
    ],
    'Hogar': [
      `💡 Desconecta aparatos en standby; pueden representar hasta el 10% de tu factura eléctrica.`,
      `🚿 Duchas cortas y grifos cerrados al cepillarte reducen la factura de agua.`,
      `🔧 Aprende reparaciones básicas para evitar técnicos.`,
      `🛒 Compara precios de servicios (internet, cable) y negocia o cambia de proveedor.`,
    ],
    'Tecnología': [
      `📱 Antes de comprar un gadget nuevo, evalúa si realmente lo necesitas.`,
      `🔄 Vende o intercambia dispositivos viejos antes de comprar nuevos.`,
      `☁️ Revisa tus suscripciones digitales; cancela las que no uses activamente.`,
      `🛒 Espera el Black Friday o fechas de descuento para compras tecnológicas grandes.`,
    ],
  };

  if (filter !== 'general' && allTips[filter]) {
    return [...allTips[filter], ...allTips.general.slice(0, 2)];
  }
  const topCat = Object.keys(cats)[0];
  const extra  = topCat && allTips[topCat] ? [allTips[topCat][0]] : [];
  return [...allTips.general, ...extra];
}

/* ============================================================
   10. NAVEGACIÓN
   ============================================================ */

function navigateTo(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`view-${viewName}`)?.classList.add('active');
  document.querySelector(`.nav-btn[data-view="${viewName}"]`)?.classList.add('active');

  switch (viewName) {
    case 'dashboard': renderDashboard(); break;
    case 'history':   renderHistory();   break;
    case 'finances':  renderFinances();  break;
    case 'analysis':  renderAnalysis();  break;
  }
}

/* ============================================================
   11. MODO OSCURO
   ============================================================ */

function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode');
  document.body.classList.toggle('light-mode', !isDark);
  document.getElementById('btn-dark-mode').textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('mm_dark_mode', isDark ? '1' : '0');
  if (document.getElementById('view-dashboard').classList.contains('active')) renderPieChart();
}

function applyStoredTheme() {
  if (localStorage.getItem('mm_dark_mode') === '1') {
    document.body.classList.add('dark-mode');
    document.body.classList.remove('light-mode');
    document.getElementById('btn-dark-mode').textContent = '☀️';
  }
}

/* ============================================================
   12. UTILIDADES DE FORMATO
   ============================================================ */

/** Formatea un número en Bolivianos (Bs.) */
function formatBs(amount) {
  return `Bs. ${Number(amount).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '–';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getCategoryEmoji(category) {
  const map = {
    'Alimentación': '🍔', 'Transporte': '🚗', 'Ocio': '🎮',
    'Salud': '💊', 'Educación': '📚', 'Ropa': '👗',
    'Hogar': '🏠', 'Tecnología': '💻', 'Otros': '📦',
  };
  return map[category] || '💰';
}

function showToast(message, duration = 2500) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

/* ============================================================
   13. INICIALIZACIÓN Y EVENT LISTENERS
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  applyStoredTheme();

  /* ---- TABS AUTH ---- */
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      document.getElementById(`form-${tab}`).classList.add('active');
      document.getElementById('login-error').textContent = '';
      document.getElementById('reg-error').textContent   = '';
    });
  });

  /* ---- LOGIN ---- */
  document.getElementById('form-login').addEventListener('submit', e => {
    e.preventDefault();
    const username = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-pass').value;
    const error    = login(username, password);
    if (error) { document.getElementById('login-error').textContent = error; }
    else        { document.getElementById('login-error').textContent = ''; showApp(); }
  });

  /* ---- REGISTRO ---- */
  document.getElementById('form-register').addEventListener('submit', e => {
    e.preventDefault();
    const username = document.getElementById('reg-user').value.trim();
    const password = document.getElementById('reg-pass').value;
    const error    = register(username, password);
    if (error) { document.getElementById('reg-error').textContent = error; }
    else        { document.getElementById('reg-error').textContent = ''; login(username, password); showApp(); }
  });

  /* ---- LOGOUT ---- */
  document.getElementById('btn-logout').addEventListener('click', () => {
    App.currentUser = null;
    App.expenses    = [];
    App.income      = { monthly: 0, daily: 0 };
    App.goal        = null;
    showLogin();
  });

  /* ---- MODO OSCURO ---- */
  document.getElementById('btn-dark-mode').addEventListener('click', toggleDarkMode);

  /* ---- NAVEGACIÓN ---- */
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.view));
  });

  /* ---- FORMULARIO DE GASTO ---- */
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('exp-date').value = today;
  document.getElementById('exp-date').max   = today;

  document.getElementById('form-expense').addEventListener('submit', e => {
    e.preventDefault();
    const amountRaw   = document.getElementById('exp-amount').value;
    const category    = document.getElementById('exp-category').value;
    const date        = document.getElementById('exp-date').value;
    const description = document.getElementById('exp-desc').value.trim();
    const errorEl     = document.getElementById('exp-error');
    const amount      = parseFloat(amountRaw);

    if (!amountRaw || isNaN(amount) || amount <= 0) { errorEl.textContent = 'Ingresa un monto válido mayor a 0.'; return; }
    if (!category) { errorEl.textContent = 'Selecciona una categoría.'; return; }
    if (!date)     { errorEl.textContent = 'Selecciona una fecha.'; return; }

    errorEl.textContent = '';
    addExpense({ amount, category, date, description });
    document.getElementById('form-expense').reset();
    document.getElementById('exp-date').value = today;
    showToast(`✅ Gasto de ${formatBs(amount)} agregado`);
  });

  /* ---- HISTORIAL: ORDENAMIENTO ---- */
  document.getElementById('sort-select').addEventListener('change', renderHistory);

  /* ---- HISTORIAL: ELIMINAR (delegación) ---- */
  document.getElementById('expense-list').addEventListener('click', e => {
    const btn = e.target.closest('.btn-delete');
    if (!btn) return;
    if (confirm('¿Eliminar este gasto?')) {
      deleteExpense(btn.dataset.id);
      renderHistory();
      if (document.getElementById('view-dashboard').classList.contains('active')) renderDashboard();
    }
  });

  /* ---- HISTORIAL: LIMPIAR TODO ---- */
  document.getElementById('btn-clear').addEventListener('click', () => {
    if (!App.expenses.length) { showToast('⚠️ No hay gastos para eliminar'); return; }
    if (confirm('¿Eliminar TODOS los gastos? Esta acción no se puede deshacer.')) {
      clearExpenses();
      renderHistory();
      renderDashboard();
      showToast('🗑️ Historial limpiado');
    }
  });

  /* ---- INGRESOS: sincronizar mensual <-> diario ---- */
  document.getElementById('income-monthly').addEventListener('input', e => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val > 0) {
      document.getElementById('income-daily').value = (val / 30).toFixed(2);
    }
  });
  document.getElementById('income-daily').addEventListener('input', e => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val > 0) {
      document.getElementById('income-monthly').value = (val * 30).toFixed(2);
    }
  });

  /* ---- GUARDAR INGRESOS ---- */
  document.getElementById('form-income').addEventListener('submit', e => {
    e.preventDefault();
    const monthly = parseFloat(document.getElementById('income-monthly').value) || 0;
    const daily   = parseFloat(document.getElementById('income-daily').value)   || 0;
    App.income = { monthly, daily };
    persistUserData();
    renderFinances();
    showToast('💾 Ingresos guardados');
  });

  /* ---- GUARDAR META DE AHORRO ---- */
  document.getElementById('form-goal').addEventListener('submit', e => {
    e.preventDefault();
    const name   = document.getElementById('goal-name').value.trim();
    const amount = parseFloat(document.getElementById('goal-amount').value);
    const saved  = parseFloat(document.getElementById('goal-saved').value) || 0;

    if (!name)                       { showToast('⚠️ Ingresa un nombre para la meta'); return; }
    if (!amount || amount <= 0)      { showToast('⚠️ Ingresa un monto objetivo válido'); return; }
    if (saved < 0 || saved > amount) { showToast('⚠️ El monto ahorrado no puede superar el objetivo'); return; }

    App.goal = { name, amount, saved };
    persistUserData();
    renderFinances();
    showToast('🎯 Meta guardada');
  });

  /* ---- ANÁLISIS: cambio de filtro de consejos ---- */
  document.getElementById('tips-category').addEventListener('change', renderAnalysis);

  showLogin();
});
