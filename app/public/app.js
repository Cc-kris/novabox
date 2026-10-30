/* Novabox v1 · real local-tool workspace */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const SHELL_PARAMS = new URLSearchParams(window.location.search);
if (SHELL_PARAMS.get('shell') === 'desktop') {
  document.documentElement.classList.add('novabox-desktop');
  if (SHELL_PARAMS.get('platform') === 'win') document.documentElement.classList.add('novabox-win');
}

const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  star: '<path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.9L12 3.6Z"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  play: '<path d="m8 5 11 7-11 7V5Z"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  activity: '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  alert: '<path d="M10.3 3.7 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  external: '<path d="M15 3h6v6M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
  spark: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/>',
  text: '<path d="M4 6h16M4 11h12M4 16h16M4 21h9"/>',
  braces: '<path d="M9 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h2M15 3h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-2"/>',
  ruler: '<path d="m3 15 6-6 6 6-6 6-6-6Z"/><path d="m9 9 3-3 6 6-3 3"/><path d="m7 12 2 2M10 9l2 2M13 12l2 2"/>',
  regex: '<path d="M17 3v8M13.5 5l7 4M20.5 5l-7 4"/><circle cx="6" cy="17" r="2"/><path d="M8 17h3"/>',
  binary: '<rect x="3" y="4" width="7" height="7" rx="1"/><rect x="14" y="4" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M17.5 14v7M14 17.5h7"/>',
  menu: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  box: '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="M3 7v10l9 5 9-5V7"/><path d="M12 12v10"/>'
};

function icon(name, cls = 'icon') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.box}</svg>`;
}

const CATEGORY_STYLES = {
  '文本处理': { glow: 'rgba(24,201,152,.16)', bg: 'linear-gradient(145deg,#174b3c,#0d8a5f)' },
  '数据转换': { glow: 'rgba(59,156,255,.15)', bg: 'linear-gradient(145deg,#1c4166,#2b82d8)' },
  '开发辅助': { glow: 'rgba(154,99,255,.14)', bg: 'linear-gradient(145deg,#3c2b65,#7a56d6)' },
  '时间处理': { glow: 'rgba(226,164,66,.16)', bg: 'linear-gradient(145deg,#5b4216,#b07a22)' }
};

const state = {
  view: 'tools',
  tools: [],
  categories: [],
  selected: null,
  result: null,
  resultError: null,
  history: [],
  historyTotal: 0,
  drafts: [],
  activeDraft: null,
  settings: { historyEnabled: true, keepInputs: true, autoOpen: true, reducedMotion: false, interfaceDensity: 'comfortable' },
  update: null,
  updateInfo: null,
  health: null,
  query: '',
  category: 'all',
  favoritesOnly: false,
  pendingInputs: null,
  loading: false,
  events: null
};

async function api(path, options = {}) {
  const headers = { ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) };
  const response = await fetch(path, { ...options, headers });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `请求失败（${response.status}）`);
    error.payload = payload;
    error.status = response.status;
    throw error;
  }
  return payload;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function styleFor(tool) {
  return CATEGORY_STYLES[tool.category] || CATEGORY_STYLES['文本处理'];
}

const ICON_ART = ['text', 'calc', 'money', 'convert', 'data', 'time', 'code', 'box'];
function iconArtFor(tool) {
  const id = String(tool.id || '');
  const category = String(tool.category || '');
  if (category === '文本处理') return 'text';
  if (category === '数据转换') return 'convert';
  if (category === '金融计算') return 'money';
  if (category === '电商工具') {
    if (/weight|volume|freight|shipping|package/i.test(id)) return 'box';
    if (/review|rating|comment/i.test(id)) return 'data';
    if (/profit|margin|cost/i.test(id)) return 'calc';
    return 'money';
  }
  let hash = 0;
  for (const char of (id || tool.name || 'box')) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return ICON_ART[hash % ICON_ART.length];
}

function toolIcon(tool, cls = 'tool-icon') {
  const style = styleFor(tool);
  const art = iconArtFor(tool);
  return `<span class="${cls}" style="--icon-bg:${style.bg}"><img src="/icons/3d/${art}.png" alt="" loading="eager" decoding="async" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><span class="tool-icon-fallback">${icon(tool.icon || 'box')}</span></span>`;
}

function relativeTime(iso) {
  if (!iso) return '—';
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return '—';
  const seconds = Math.round((Date.now() - time) / 1000);
  if (seconds < 45) return '刚刚';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`;
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const PRIMARY_OUTPUT_KEYS = ['profit', 'total_cost', 'total', 'acos', 'current_rating', 'minimum_price'];
const OUTPUT_LABELS = {
  value: '结果', result: '结果', profit: '利润', profit_margin: '利润率',
  minimum_price: '最低售价', total_cost: '总成本', total: '合计',
  base_freight: '基础运费', fuel_surcharge: '燃油附加费',
  acos: 'ACOS', current_rating: '当前星级',
  additional_five_star_reviews: '还需五星数',
  chargeableKg: '计费重', volumetricKg: '体积重',
};

function primaryOutputKey(outputs) {
  if (!outputs || typeof outputs !== 'object') return null;
  if (outputs.value !== undefined) return 'value';
  if (outputs.result !== undefined) return 'result';
  const preferred = PRIMARY_OUTPUT_KEYS.find((key) => outputs[key] !== undefined && outputs[key] !== null && typeof outputs[key] !== 'object');
  if (preferred) return preferred;
  const first = Object.entries(outputs).find(([key, value]) => value !== null && value !== undefined && typeof value !== 'object' && !['summary', 'details', 'detail'].includes(key));
  return first?.[0] || null;
}

function outputValue(outputs) {
  if (!outputs || typeof outputs !== 'object') return String(outputs ?? '');
  const key = primaryOutputKey(outputs);
  if (key && outputs[key] !== undefined) {
    return typeof outputs[key] === 'object' ? JSON.stringify(outputs[key], null, 2) : String(outputs[key]);
  }
  return JSON.stringify(outputs, null, 2);
}

function toast(message, isError = false) {
  const container = $('#toast-container');
  const node = document.createElement('div');
  node.className = `toast${isError ? ' is-error' : ''}`;
  node.innerHTML = `${icon(isError ? 'alert' : 'checkCircle')}<span>${escapeHtml(message)}</span>`;
  container.appendChild(node);
  setTimeout(() => {
    node.style.opacity = '0';
    node.style.transform = 'translateY(6px)';
    node.style.transition = 'opacity 180ms, transform 180ms';
    setTimeout(() => node.remove(), 200);
  }, 3200);
}

function setConnection(status) {
  const pill = $('#connection-pill');
  const text = $('#connection-text');
  pill.dataset.state = status;
  text.textContent = status === 'online' ? '本地内核已连接' : status === 'offline' ? '内核未连接' : '连接中';
}

function updateFooter() {
  if (!state.health) return;
  const stats = state.health.stats || {};
  $('#footer-count').textContent = `${stats.tools ?? state.tools.length} 个工具 · ${stats.runs ?? 0} 次运行`;
  $('#footer-status').textContent = state.health.name ? `Novabox 本地内核 · ${state.health.version}` : '本地内核';
}

/* ===== Views: library ===== */
function filteredTools() {
  const query = state.query.trim().toLowerCase();
  return state.tools.filter((tool) => {
    if (state.favoritesOnly && !tool.favorite) return false;
    if (state.category !== 'all' && tool.category !== state.category) return false;
    if (!query) return true;
    const haystack = [tool.name, tool.summary, tool.category, ...(tool.keywords || [])].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

function renderToolGrid() {
  const grid = $('#tool-grid');
  if (!grid) return;
  const tools = filteredTools();
  const count = $('#result-count');
  if (count) count.textContent = `${tools.length} 个工具`;
  if (!tools.length) {
    const favoriteEmpty = state.favoritesOnly && !state.query;
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <span class="empty-icon">${icon(favoriteEmpty ? 'star' : 'search')}</span>
      <h3>${favoriteEmpty ? '还没有收藏' : '没有匹配的工具'}</h3>
      <p>${favoriteEmpty ? '点工具卡片右上角的星标，常用工具就会收在这里。' : '换个关键词，或清除筛选条件。'}</p>
    </div>`;
    return;
  }
  grid.innerHTML = tools.map((tool) => {
    const style = styleFor(tool);
    return `<div class="tool-card" role="button" tabindex="0" data-action="open-tool" data-id="${escapeHtml(tool.id)}" style="--card-glow:${style.glow}">
      <button class="favorite-btn ${tool.favorite ? 'is-on' : ''}" data-action="favorite" data-id="${escapeHtml(tool.id)}" data-favorite="${tool.favorite ? '1' : '0'}" aria-pressed="${tool.favorite ? 'true' : 'false'}" aria-label="${tool.favorite ? '取消收藏' : '收藏'}" title="${tool.favorite ? '取消收藏' : '收藏'}">${icon('star', 'icon icon-sm')}</button>
      <div class="tool-card-head">
        ${toolIcon(tool)}
        <h3 class="tool-card-name">${escapeHtml(tool.name)}</h3>
      </div>
      <p class="tool-card-summary">${escapeHtml(tool.summary)}</p>
      <div class="tool-card-foot">
        <span class="tool-cat">${escapeHtml(tool.category)}</span>
        <span class="dot"></span>
        <span>${tool.inputCount} 参数</span>
        <span class="dot"></span>
        <span class="tool-verified">${icon('checkCircle', 'icon-sm')} ${tool.testCount} 测试</span>
        ${tool.useCount ? `<span class="dot"></span><span>用过 ${tool.useCount} 次</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

function renderToolsView() {
  const categories = [...new Set(state.tools.map((tool) => tool.category))];
  const counts = Object.fromEntries(categories.map((category) => [category, state.tools.filter((tool) => tool.category === category).length]));
  const totalRuns = state.health?.stats?.runs ?? 0;
  return `<section class="view">
    <div class="hero">
      <div class="hero-row">
        <div>
          <p class="eyebrow">Your method, packaged</p>
          <h1 class="page-title">把方法，变成<em>可复用的工具。</em></h1>
        </div>
        <div class="hero-stats">
          <div class="hero-stat"><strong>${state.tools.length}</strong><span>已发布工具</span></div>
          <div class="hero-stat"><strong>${totalRuns}</strong><span>真实运行</span></div>
        </div>
      </div>
    </div>
    <div class="chips" style="margin-top:22px">
      <button class="chip ${state.category === 'all' ? 'is-active' : ''}" data-action="set-category" data-category="all">全部 ${state.tools.length}</button>
      ${categories.map((category) => `<button class="chip ${state.category === category ? 'is-active' : ''}" data-action="set-category" data-category="${escapeHtml(category)}">${escapeHtml(category)} ${counts[category]}</button>`).join('')}
    </div>
    <div class="chips" style="justify-content:flex-end;margin-top:-12px;margin-bottom:12px"><span class="count-note" id="result-count"></span></div>
    <div class="tool-grid" id="tool-grid"></div>
  </section>`;
}

/* ===== Views: tool workspace ===== */
function fieldHtml(key, property, isRequired = false) {
  const label = property.title || key;
  const required = isRequired ? '<span class="req">必填</span>' : '';
  const help = property.description ? `<p class="field-help">${escapeHtml(property.description)}</p>` : '';
  const common = `name="${escapeHtml(key)}" id="field-${escapeHtml(key)}" ${isRequired ? 'required' : ''}`;
  const xui = property['x-ui'] || {};
  const placeholder = escapeHtml(xui.placeholder || property.placeholder || '');
  const enumValues = Array.isArray(property.enum) ? property.enum : (Array.isArray(property.options) ? property.options : null);
  let control = '';
  if (enumValues) {
    control = `<select class="select" ${common}>${enumValues.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('')}</select>`;
  } else if (property.type === 'boolean') {
    return `<div class="field"><label class="check-row"><input type="checkbox" ${common}> ${escapeHtml(label)}${required ? ' <span class="req">必填</span>' : ''}</label>${help}</div>`;
  } else if (property.type === 'number' || property.type === 'integer') {
    const attrs = [property.minimum !== undefined ? `min="${property.minimum}"` : '', property.maximum !== undefined ? `max="${property.maximum}"` : ''].filter(Boolean).join(' ');
    control = `<input class="input" type="number" ${attrs} step="${property.type === 'integer' ? '1' : 'any'}" placeholder="${placeholder}" ${common}>`;
  } else if (property.multiline || xui.widget === 'textarea' || property.format === 'textarea') {
    control = `<textarea class="textarea" rows="${xui.rows || 6}" placeholder="${placeholder}" ${common}></textarea>`;
  } else {
    control = `<input class="input" type="text" placeholder="${placeholder}" ${common}>`;
  }
  return `<div class="field"><label class="field-label" for="field-${escapeHtml(key)}"><span>${escapeHtml(label)}</span>${required}</label>${control}${help}</div>`;
}

function resultLabel(run) {
  const explicit = run.outputs?.label;
  if (explicit) return String(explicit).replace(/[：:]\s*$/, '');
  const summary = String(run.outputs?.summary || '');
  const prefix = summary.match(/^([^：:]{1,14})[：:]/);
  if (prefix) return prefix[1].trim();
  const key = primaryOutputKey(run.outputs);
  if (key && OUTPUT_LABELS[key]) return OUTPUT_LABELS[key];
  const name = String(run.toolName || '');
  const stripped = name.replace(/(计算器|换算器|转换器|工具)$/u, '').trim();
  return stripped && stripped !== name ? stripped : '';
}

function resultDisplayText(run) {
  const raw = outputValue(run.outputs);
  const label = resultLabel(run);
  return label ? `${label}：${raw}` : raw;
}

function renderResult() {
  const pane = $('#result-pane');
  if (!pane) return;
  if (state.resultError) {
    const { message, errors } = state.resultError;
    pane.innerHTML = `<div class="result-card result-error">
      <div class="result-head"><span class="result-status"><span class="status-dot"></span>运行失败</span><span class="badge">未产生结果</span></div>
      <div class="result-body">
        <span class="result-label">错误</span>
        <p class="result-value">${escapeHtml(message)}</p>
        ${errors?.length ? `<ul class="result-details">${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul>` : ''}
        <div class="result-meta"><span>修正输入后可以再次运行</span></div>
      </div>
      <div class="result-actions"><button class="btn btn-sm" data-action="rerun-tool">${icon('refresh', 'icon icon-sm')} 重新运行</button></div>
    </div>`;
    return;
  }
  if (!state.result) {
    pane.innerHTML = `<div class="result-card"><div class="result-empty">
      <div class="result-orbit">${icon('spark')}</div>
      <h3>结果会在这里展开</h3>
      <p>填写左侧参数并运行。计算在本地完成，结果同时写入历史。</p>
    </div></div>`;
    return;
  }
  const run = state.result;
  const rawValue = outputValue(run.outputs);
  const label = resultLabel(run);
  const displayValue = label ? rawValue : resultDisplayText(run);
  const isLong = displayValue.length > 90 || displayValue.includes('\n');
  const details = run.outputs?.details ?? run.outputs?.detail ?? '';
  const summary = run.outputs?.summary || '';
  const showSummary = summary && summary !== displayValue && summary !== rawValue && summary !== `${label}：${rawValue}`;
  pane.innerHTML = `<div class="result-card">
    <div class="result-head"><span class="result-status"><span class="status-dot"></span>计算完成</span><span class="badge">${run.durationMs} ms</span></div>
    <div class="result-body">
      <span class="result-label">${escapeHtml(label || '结果')}</span>
      <pre class="result-value ${isLong ? 'is-long' : ''}">${escapeHtml(displayValue)}</pre>
      ${showSummary ? `<p class="result-summary">${escapeHtml(summary)}</p>` : ''}
      ${details ? `<p class="result-details">${escapeHtml(details)}</p>` : ''}
      <div class="result-meta"><span>${escapeHtml(run.toolName)}</span><span>v${escapeHtml(run.toolVersion)}</span><span>${formatTime(run.createdAt)}</span></div>
    </div>
    <div class="result-actions">
      <button class="btn btn-sm" data-action="copy-result" data-value="${escapeHtml(displayValue)}">${icon('copy', 'icon icon-sm')} 复制结果</button>
      <button class="btn btn-sm" data-action="rerun-tool">${icon('refresh', 'icon icon-sm')} 再算一次</button>
    </div>
  </div>`;
}

function detailProperties(tool) {
  const schema = tool.definition?.inputs?.schema || { properties: {} };
  const properties = Object.entries(schema.properties || {});
  const requiredFields = new Set(Array.isArray(schema.required) ? schema.required : []);
  return { properties, requiredFields };
}

function detailFieldsHtml(tool) {
  const { properties, requiredFields } = detailProperties(tool);
  if (!properties.length) return `<div class="detail-empty">该工具没有输入参数。</div>`;
  return properties.map(([key, property]) => fieldHtml(key, property, requiredFields.has(key))).join('');
}

function detailFieldCount(tool) {
  const { properties } = detailProperties(tool);
  return `${properties.length} 个字段`;
}

function renderDetailFields() {
  const tool = state.selected;
  if (!tool) return;
  const fields = document.getElementById('detail-fields');
  if (fields) fields.innerHTML = detailFieldsHtml(tool);
  const text = detailFieldCount(tool);
  for (const id of ['detail-field-count', 'detail-field-count-head']) {
    const label = document.getElementById(id);
    if (label) label.textContent = text;
  }
}

function renderToolView() {
  const tool = state.selected;
  if (!tool) return `<section class="view"><div class="empty-state"><h3>工具未找到</h3><p>它可能已被移除。</p></div></section>`;
  const definition = tool.definition || {};
  const countText = detailFieldCount(tool);
  return `<section class="view">
    <button class="back-link" data-action="back-tools">${icon('back', 'icon icon-sm')} 返回工具库</button>
    <div class="tool-heading">
      ${toolIcon(tool)}
      <div class="tool-heading-copy">
        <h1>${escapeHtml(tool.name)}</h1>
        <p>${escapeHtml(tool.summary)}</p>
        <div class="tool-badges">
          <span class="badge badge-green">${icon('checkCircle', 'icon-sm')} ${tool.testCount} 项测试通过</span>
          <span class="badge">${escapeHtml(tool.category)}</span>
          <span class="badge badge-blue">${escapeHtml(tool.id)}@${escapeHtml(tool.version)}</span>
          <span class="badge">${icon('lock', 'icon-sm')} 无网络 / 无副作用</span>
        </div>
      </div>
      <button class="btn btn-sm btn-danger tool-delete-btn" data-action="delete-tool" data-id="${escapeHtml(tool.id)}">${icon('trash', 'icon icon-sm')} 删除</button>
    </div>
    <div class="detail-toolbar">
      <span class="count-note" id="detail-field-count">${countText}</span>
    </div>
    <div class="tool-layout">
      <div class="workbench">
        <form class="form-card" id="tool-form" data-tool-id="${escapeHtml(tool.id)}">
          <div class="form-card-head"><h2>输入参数</h2><span id="detail-field-count-head">${countText}</span></div>
          <div id="detail-fields">${detailFieldsHtml(tool)}</div>
          <div class="form-actions">
            <span class="form-note">⌘ ↵ 运行 · 参数在本地校验</span>
            <button class="btn btn-primary run-btn" type="submit">${icon('play', 'icon icon-sm')} 运行工具</button>
          </div>
        </form>
        <details class="definition-block">
          <summary>查看工具定义 · JSON</summary>
          <pre>${escapeHtml(JSON.stringify(definition, null, 2))}</pre>
        </details>
      </div>
      <aside class="result-pane" id="result-pane"></aside>
    </div>
  </section>`;
}
/* ===== History ===== */
function historyRows() {
  const query = (state.historyQuery || '').trim().toLowerCase();
  const runs = state.history.filter((run) => {
    if (!query) return true;
    return [run.toolName, run.toolId, run.outputs?.summary, outputValue(run.outputs)].join(' ').toLowerCase().includes(query);
  });
  if (!runs.length) {
    return `<div class="empty-state"><span class="empty-icon">${icon('history')}</span><h3>${state.history.length ? '没有匹配的运行' : '还没有运行记录'}</h3><p>${state.history.length ? '换个关键词试试。' : '从工具库运行一次，结果会自动记录在这里。'}</p></div>`;
  }
  return runs.map((run) => `<div class="history-row">
    <div class="history-main">
      <span class="history-mark">${icon('activity')}</span>
      <div class="history-info">
        <div class="history-name">${escapeHtml(run.toolName)} <span class="status-tag ${run.status === 'error' ? 'is-error' : ''}">${run.status === 'error' ? '失败' : '成功'}</span></div>
        <div class="history-time">${formatTime(run.createdAt)} · ${run.durationMs} ms</div>
      </div>
    </div>
    <div class="history-output">${escapeHtml(run.status === 'error' ? (run.error?.message || '执行失败') : (run.outputs?.summary || outputValue(run.outputs)))}</div>
    <div class="history-origin">${run.origin === 'mcp' ? 'MCP 调用' : '工作台'}</div>
    <div class="history-actions">
      <button class="mini-btn" data-action="load-history" data-id="${escapeHtml(run.id)}" title="载入参数">${icon('arrow', 'icon-sm')}</button>
      <button class="mini-btn" data-action="rerun-history" data-id="${escapeHtml(run.id)}" title="再次运行">${icon('play', 'icon-sm')}</button>
    </div>
  </div>`).join('');
}

function renderHistoryView() {
  return `<section class="view">
    <div class="page-head">
      <div><p class="eyebrow">Run ledger</p><h1 class="page-title">运行历史</h1><p class="page-lead">每次真实执行都会写入本地 SQLite，包含输入、输出与耗时。</p></div>
      <div class="head-actions"><span class="count-note">${state.historyTotal} 条记录</span><button class="btn btn-sm btn-danger" data-action="clear-history" ${state.history.length ? '' : 'disabled'}>${icon('trash', 'icon icon-sm')} 清空</button></div>
    </div>
    <div class="history-toolbar"><label class="search-box" style="max-width:none"><span class="sr-only">搜索历史</span>${icon('search')}<input class="search-input" id="history-search" type="search" placeholder="搜索工具或结果…" value="${escapeHtml(state.historyQuery || '')}"></label></div>
    <div class="history-list" id="history-list">${historyRows()}</div>
  </section>`;
}

/* ===== Drafts ===== */
const DRAFT_STATUS = { draft: '待校验', validated: '已通过', invalid: '需修正', published: '已发布' };

function reportHtml(draft) {
  const report = draft.testReport;
  if (!report) return `<div class="hint-card">创建草稿后，先运行静态校验与测试。全部通过才能发布。</div>`;
  const errors = report.staticErrors || [];
  const results = report.results || [];
  const ok = report.ok && !errors.length;
  return `<div class="validation-box ${ok ? 'ok' : 'bad'}">
    <div class="validation-box-head">${icon(ok ? 'checkCircle' : 'alert', 'icon icon-sm')} ${ok ? '校验通过' : '校验未通过'} · ${report.passed ?? 0}/${report.total ?? results.length} 测试</div>
    ${errors.length ? `<ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul>` : ''}
    ${results.length ? `<div style="padding:0 12px 8px">${results.map((test) => `<div class="test-case"><span>${escapeHtml(test.name)}</span><span class="${test.ok ? 'ok' : 'bad'}">${test.ok ? '通过' : '失败'}</span></div>`).join('')}</div>` : ''}
  </div>`;
}

function renderDraftsView() {
  const active = state.activeDraft;
  const editorValue = active ? JSON.stringify(active.definition, null, 2) : '';
  return `<section class="view">
    <div class="page-head">
      <div><p class="eyebrow">Constrained builder</p><h1 class="page-title">工具草稿</h1><p class="page-lead">粘贴受约束的定义，先校验、再跑测试，全部通过后才允许发布。</p></div>
      <div class="head-actions"><span class="count-note">${state.drafts.length} 份草稿</span></div>
    </div>
    <div class="drafts-layout">
      <div class="editor-card">
        <div class="editor-head"><h2>${active ? `编辑 · ${escapeHtml(active.name)}` : '新建定义'}</h2><span>novabox/v1</span></div>
        <div class="editor-body">
          <textarea class="editor-textarea" id="draft-editor" spellcheck="false" placeholder="粘贴工具定义 JSON…">${escapeHtml(editorValue)}</textarea>
          <div class="editor-actions">
            <button class="btn btn-sm" data-action="draft-template">${icon('file', 'icon icon-sm')} 载入内置示例</button>
            ${active ? `<button class="btn btn-sm" data-action="draft-close">关闭当前</button>` : ''}
            <button class="btn btn-primary btn-sm" data-action="draft-create">${icon('plus', 'icon icon-sm')} 从编辑器创建草稿</button>
          </div>
          <p class="field-help" style="margin-top:10px">保存的草稿不会自动跟随编辑器改动；修改后请重新创建草稿，再校验与发布。</p>
        </div>
      </div>
      <div>
        <div class="side-card">
          <div class="side-head"><h2>草稿列表</h2><span class="count-note">${state.drafts.length}</span></div>
          <div class="side-body">
            <div class="draft-list">${state.drafts.length ? state.drafts.map((draft) => `<div class="draft-item" style="${active?.id === draft.id ? 'border-color:#9ccdb9;background:#f5fcf8' : ''}">
              <div class="draft-item-head"><span class="draft-item-name">${escapeHtml(draft.name)}</span><span class="badge">${DRAFT_STATUS[draft.status] || draft.status}</span></div>
              <div class="draft-item-meta">${escapeHtml(draft.toolId)} · ${relativeTime(draft.updatedAt || draft.createdAt)}</div>
              <div class="draft-item-actions">
                <button class="btn btn-sm btn-ghost" data-action="draft-select" data-id="${escapeHtml(draft.id)}">打开</button>
                <button class="btn btn-sm btn-ghost" data-action="draft-validate" data-id="${escapeHtml(draft.id)}">校验</button>
                <button class="btn btn-sm btn-ghost" data-action="draft-delete" data-id="${escapeHtml(draft.id)}">删除</button>
              </div>
            </div>`).join('') : '<div class="draft-empty">还没有草稿。先从编辑器创建一份。</div>'}</div>
          </div>
        </div>
        ${active ? `<div class="side-card">
          <div class="side-head"><h2>校验与发布</h2><span class="badge">${DRAFT_STATUS[active.status] || active.status}</span></div>
          <div class="side-body">
            ${reportHtml(active)}
            <div class="editor-actions" style="margin-top:12px">
              <button class="btn btn-sm" data-action="draft-validate" data-id="${escapeHtml(active.id)}">${icon('check', 'icon icon-sm')} 重新校验</button>
              <button class="btn btn-primary btn-sm" style="margin-left:auto" data-action="draft-publish" data-id="${escapeHtml(active.id)}" ${active.status === 'validated' ? '' : 'disabled'}>${icon('arrow', 'icon icon-sm')} 确认发布</button>
            </div>
          </div>
        </div>` : ''}
        <div class="hint-card" style="margin-top:14px"><strong>发布发生什么？</strong><br>定义会写入 <span class="mono">tools/user/&lt;id&gt;/tool.json</span>，同一秒注册到工作台与 MCP，不需要重启服务。</div>
      </div>
    </div>
  </section>`;
}

/* ===== Settings ===== */
const SETTINGS_ROWS = [
  { key: 'historyEnabled', title: '记录运行历史', description: '每次成功或失败都写入本地 SQLite。' },
  { key: 'keepInputs', title: '在历史中保存输入参数', description: '关闭后只保存输出和耗时，不保留原始输入。' },
  { key: 'autoOpen', title: 'MCP 调用时自动展开', description: 'Codex / Claude Code 调用工具后，工作台自动打开工具页并填入数据。' },
  { key: 'reducedMotion', title: '减少界面动效', description: '关闭卡片浮起、流光和视图过渡。' }
];

function renderSettingsView() {
  const update = state.update || {};
  return `<section class="view">
    <div class="page-head"><div><p class="eyebrow">Local preferences</p><h1 class="page-title">设置</h1><p class="page-lead">所有偏好保存在本地数据库，不经过网络。</p></div></div>
    <div class="settings-wrap">
      <div class="settings-group">
        <div class="settings-group-title">运行与联动</div>
        ${SETTINGS_ROWS.map((row) => `<div class="setting-row">
          <div class="setting-copy"><h3>${row.title}</h3><p>${row.description}</p></div>
          <button class="switch" role="switch" aria-checked="${Boolean(state.settings[row.key])}" aria-label="${row.title}" data-action="toggle-setting" data-key="${row.key}"></button>
        </div>`).join('')}
      </div>
      <div class="settings-group" id="update-group">
        <div class="settings-group-title">软件更新</div>
        <div id="update-controls">
          <div class="setting-row">
            <div class="setting-copy"><h3>当前版本</h3><p>点击检查更新即可，自动从内置发布源获取并验证。</p></div>
            <span class="badge badge-blue" id="update-current">v${escapeHtml(update.currentVersion || '—')}</span>
          </div>
          <div class="update-actions">
            <button class="btn btn-sm" data-action="check-update" id="check-update">${icon('refresh', 'icon icon-sm')} 检查更新</button>
            <button class="btn btn-primary btn-sm" data-action="install-update" id="install-update" disabled>${icon('arrow', 'icon icon-sm')} 安装更新</button>
          </div>
          <div class="update-detail" id="update-detail">点击“检查更新”获取新版本。</div>
        </div>
        <div class="update-progress" id="update-progress" hidden>
          <div class="update-progress-top"><span id="update-progress-label">正在更新</span><strong id="update-progress-value">0%</strong></div>
          <div class="update-track"><div class="update-bar" id="update-bar"></div></div>
          <p id="update-progress-message">准备下载…</p>
        </div>
      </div>
      <div class="settings-group">
        <div class="settings-group-title">连接信息</div>
        <div class="setting-row"><div class="setting-copy"><h3>本地服务</h3><p>仅监听回环地址，不暴露到局域网。</p></div><span class="badge badge-green">http://127.0.0.1:8787</span></div>
        <div class="setting-row"><div class="setting-copy"><h3>MCP 入口</h3><p>Codex / Claude Code 通过 stdio 启动本地适配器。</p></div><span class="badge badge-blue">node mcp-server.mjs</span></div>
      </div>
      <div class="settings-status" id="settings-status">设置保存后立即生效。</div>
    </div>
  </section>`;
}

let updatePollTimer = null;

function updateDetailText(update, info) {
  const current = update.state || {};
  if (info) {
    if (info.hasUpdate) {
      const installHint = info.canInstall ? '' : (update.platform === 'win32' ? ' · Windows 请从 Release 手动下载安装' : ' · 仅安装版可自动安装');
      return `发现新版本 v${info.latestVersion}${info.asset ? ` · ${info.asset.name}` : ''}${installHint}`;
    }
    return `已是最新版本 v${info.currentVersion}`;
  }
  if (current.status === 'error') return current.error || '更新失败';
  if (current.message && current.status !== 'idle') return current.message;
  return '点击“检查更新”获取新版本。';
}

function syncUpdatePanel() {
  const update = state.update;
  if (!update || !document.getElementById('update-panel') && !document.getElementById('update-group')) return;
  const info = state.updateInfo;
  const current = update.state || {};
  const active = Boolean(current.active) || ['downloading', 'verifying', 'installing', 'restarting'].includes(current.status);
  const currentLabel = document.getElementById('update-current');
  if (currentLabel) currentLabel.textContent = `v${update.currentVersion || '—'}`;

  const controls = document.getElementById('update-controls') || document.querySelector('.update-actions');
  const progress = document.getElementById('update-progress');
  if (controls) controls.hidden = active;
  if (progress) progress.hidden = !active;

  if (active) {
    const percent = Math.max(0, Math.min(100, Math.round(Number(current.progress) || 0)));
    const value = document.getElementById('update-progress-value');
    const bar = document.getElementById('update-bar');
    const message = document.getElementById('update-progress-message');
    const label = document.getElementById('update-progress-label');
    if (value) value.textContent = `${percent}%`;
    if (bar) bar.style.width = `${percent}%`;
    if (message) message.textContent = current.message || '正在更新…';
    if (label) label.textContent = current.status === 'restarting' ? '正在重启' : '正在更新';
    return;
  }

  const install = document.getElementById('install-update');
  if (install) install.disabled = !info?.hasUpdate || !update.canInstall;
  const detail = document.getElementById('update-detail');
  if (detail) detail.textContent = updateDetailText(update, info);
}

async function loadUpdateStatus(showError = false) {
  try {
    state.update = await api('/api/update/status');
    syncUpdatePanel();
  } catch (error) {
    if (showError) toast(error.message, true);
  }
}

function startUpdatePolling() {
  clearInterval(updatePollTimer);
  let failures = 0;
  updatePollTimer = setInterval(async () => {
    try {
      state.update = await api('/api/update/status');
      failures = 0;
      syncUpdatePanel();
      const current = state.update.state || {};
      if (!current.active && current.status !== 'restarting') clearInterval(updatePollTimer);
    } catch {
      failures += 1;
      if (failures >= 3) {
        clearInterval(updatePollTimer);
        const message = document.getElementById('update-progress-message');
        if (message) message.textContent = '应用正在重启，请稍候…';
      }
    }
  }, 800);
}
function renderDiagnosticsView() {
  const diag = state.diagnostics;
  if (!diag) return `<section class="view"><div class="empty-state"><span class="inline-loading"><span class="spinner"></span> 读取诊断信息…</span></div></section>`;
  const stats = diag.stats || {};
  const checks = diag.checks || [];
  return `<section class="view">
    <div class="page-head"><div><p class="eyebrow">Runtime truth</p><h1 class="page-title">运行诊断</h1><p class="page-lead">这里显示的是服务端实际状态，不是演示数据。</p></div><div class="head-actions"><button class="btn btn-sm" data-action="refresh-diagnostics">${icon('refresh', 'icon icon-sm')} 刷新</button></div></div>
    <div class="diag-grid">
      <div class="diag-card"><div class="diag-label">Published tools</div><div class="diag-value">${stats.tools ?? 0}</div><div class="diag-detail">${diag.tools?.length ?? 0} 个定义已载入</div></div>
      <div class="diag-card"><div class="diag-label">Real runs</div><div class="diag-value">${stats.runs ?? 0}</div><div class="diag-detail">最近 ${escapeHtml(relativeTime(stats.lastRunAt))}</div></div>
      <div class="diag-card"><div class="diag-label">Drafts</div><div class="diag-value">${stats.drafts ?? 0}</div><div class="diag-detail">受约束定义</div></div>
    </div>
    <div class="diag-section"><h2>系统检查</h2>${checks.map((check) => `<div class="kv-row"><span>${escapeHtml(check.label)}</span><span style="color:${check.ok ? '#287b5d' : '#b42318'}">${check.ok ? '通过' : '异常'} · ${escapeHtml(check.detail)}</span></div>`).join('') || '<div class="kv-row"><span>无检查项</span></div>'}</div>
    <div class="diag-section"><h2>运行环境</h2>
      <div class="kv-row"><span>Node</span><span>${escapeHtml(diag.runtime?.node ?? '—')}</span></div>
      <div class="kv-row"><span>平台</span><span>${escapeHtml(diag.runtime?.platform ?? '—')}</span></div>
      <div class="kv-row"><span>数据库</span><span class="mono">${escapeHtml(diag.storage?.dataDir ?? '—')}</span></div>
      <div class="kv-row"><span>数据库大小</span><span>${Math.round((diag.storage?.dbBytes ?? 0) / 1024)} KB</span></div>
      <div class="kv-row"><span>MCP 协议</span><span>${escapeHtml(diag.runtime?.mcpProtocol ?? '2025-06-18')}</span></div>
    </div>
    ${diag.warnings?.length ? `<div class="diag-section"><h2>工具包警告</h2><pre class="code-block">${escapeHtml(JSON.stringify(diag.warnings, null, 2))}</pre></div>` : ''}
    <details class="definition-block"><summary>查看完整诊断 JSON</summary><pre>${escapeHtml(JSON.stringify(diag, null, 2))}</pre></details>
  </section>`;
}

/* ===== Render + navigation ===== */
function setActiveNav() {
  const settingsView = state.view === 'settings' || state.view === 'diagnostics';
  $$('.nav-item').forEach((item) => {
    const active = item.dataset.view ? item.dataset.view === state.view : item.classList.contains('nav-settings') && settingsView;
    item.classList.toggle('is-active', active);
  });
}

function updateHeader() {
  const input = $('#tool-search');
  if (input && document.activeElement !== input) input.value = state.query;
  const favorites = $('.header-tools [data-action="toggle-favorites"]');
  if (favorites) {
    favorites.classList.toggle('is-on', state.favoritesOnly);
    favorites.setAttribute('aria-pressed', String(state.favoritesOnly));
  }
}

function hydrateToolForm() {
  const tool = state.selected;
  const form = $('#tool-form');
  if (!tool || !form) return;
  const properties = tool.definition?.inputs?.schema?.properties || {};
  const inputs = state.pendingInputs || {};
  for (const [key, property] of Object.entries(properties)) {
    const element = form.elements.namedItem(key);
    if (!element) continue;
    let value = inputs[key];
    if (value === undefined) value = property.default;
    const enumValues = Array.isArray(property.enum) ? property.enum : (Array.isArray(property.options) ? property.options : null);
    if (value === undefined && enumValues?.length) value = enumValues[0];
    if (property.type === 'boolean') element.checked = Boolean(value);
    else element.value = value ?? '';
  }
}

function render() {
  document.body.classList.toggle('is-tool-view', state.view === 'tool');
  setActiveNav();
  updateHeader();
  const main = $('#main-content');
  const scrollTop = main.scrollTop;
  if (state.view === 'tools') main.innerHTML = renderToolsView();
  else if (state.view === 'tool') main.innerHTML = renderToolView();
  else if (state.view === 'history') main.innerHTML = renderHistoryView();
  else if (state.view === 'drafts') main.innerHTML = renderDraftsView();
  else if (state.view === 'settings') main.innerHTML = renderSettingsView();
  else if (state.view === 'diagnostics') main.innerHTML = renderDiagnosticsView();
  if (state.view === 'tools') {
    renderToolGrid();
    main.scrollTop = scrollTop;
  }
  if (state.view === 'tool') {
    hydrateToolForm();
    renderResult();
  }
  updateFooter();
  reportNativeState();
  if (state.view === 'settings') syncUpdatePanel();
  closeMenu();
}

let lastNativeSignature = null;
function reportNativeState() {
  const bridge = window.webkit?.messageHandlers?.novaboxState;
  if (!bridge) return;
  const payload = {
    view: state.view,
    toolId: state.selected?.id || null,
    toolName: state.selected?.definition?.metadata?.name || state.selected?.name || null,
    resultId: state.result?.id || null,
    resultSummary: state.result?.outputs?.summary || null,
    at: new Date().toISOString()
  };
  const signature = JSON.stringify([payload.view, payload.toolId, payload.resultId]);
  if (signature === lastNativeSignature) return;
  lastNativeSignature = signature;
  bridge.postMessage(payload);
}

function closeMenu() {
  const menu = $('#settings-menu');
  const button = $('.nav-settings');
  if (menu) menu.hidden = true;
  if (button) button.setAttribute('aria-expanded', 'false');
}

async function refreshTools() {
  const data = await api('/api/tools');
  state.tools = data.tools || [];
  if (state.selected) {
    const fresh = state.tools.find((tool) => tool.id === state.selected.id);
    if (fresh) state.selected = { ...state.selected, ...fresh };
  }
}

async function loadHistory() {
  const data = await api('/api/history?limit=80');
  state.history = data.runs || [];
  state.historyTotal = data.total ?? state.history.length;
}

async function loadDrafts() {
  const data = await api('/api/drafts');
  state.drafts = data.drafts || [];
  if (state.activeDraft) state.activeDraft = state.drafts.find((draft) => draft.id === state.activeDraft.id) || null;
  updateFooter();
}

async function loadSettings() {
  const data = await api('/api/settings');
  state.settings = data.settings;
  applySettings();
}

async function loadDiagnostics() {
  state.diagnostics = await api('/api/diagnostics');
}

function applySettings() {
  document.documentElement.classList.toggle('reduce-motion', Boolean(state.settings.reducedMotion));
}

async function openTool(id, inputs = null, result = null) {
  try {
    const data = await api(`/api/tools/${encodeURIComponent(id)}`);
    state.selected = data.tool;
    state.pendingInputs = inputs;
    state.result = result;
    state.resultError = null;
    state.view = 'tool';
    render();
    $('#main-content').scrollTop = 0;
  } catch (error) {
    toast(error.message, true);
  }
}

async function navigate(view) {
  closeMenu();
  try {
    if (view === 'history') await loadHistory();
    if (view === 'drafts') await loadDrafts();
    if (view === 'settings') await loadSettings();
    if (view === 'diagnostics') { state.diagnostics = null; state.view = view; render(); await loadDiagnostics(); }
  } catch (error) {
    toast(error.message, true);
  }
  state.view = view;
  render();
  $('#main-content').scrollTop = 0;
  if (view === 'settings') await loadUpdateStatus();
}

/* ===== Actions ===== */
function collectInputs(form, tool) {
  const properties = tool.definition?.inputs?.schema?.properties || {};
  const values = {};
  for (const [key, property] of Object.entries(properties)) {
    const element = form.elements.namedItem(key);
    if (!element) continue;
    if (property.type === 'boolean') { values[key] = element.checked; continue; }
    const raw = element.value;
    if (raw === '' && !property.required) continue;
    if (property.type === 'number') values[key] = raw === '' ? undefined : Number(raw);
    else if (property.type === 'integer') values[key] = raw === '' ? undefined : parseInt(raw, 10);
    else if (property.type === 'array') {
      try { values[key] = JSON.parse(raw); } catch { values[key] = raw; }
    } else values[key] = raw;
  }
  return values;
}

async function runCurrentTool(form) {
  if (!state.selected) return;
  const button = form.querySelector('button[type="submit"]');
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<span class="spinner" style="border-color:rgba(255,255,255,.35);border-top-color:#fff"></span> 运行中`;
  state.resultError = null;
  try {
    const inputs = collectInputs(form, state.selected);
    state.pendingInputs = inputs;
    const data = await api(`/api/tools/${encodeURIComponent(state.selected.id)}/run`, { method: 'POST', body: JSON.stringify({ inputs }) });
    state.result = data.run;
    state.selected = { ...state.selected, ...data.tool };
    renderResult();
    state.health.stats.runs = (state.health.stats.runs || 0) + 1;
    state.health.stats.lastRunAt = data.run.createdAt;
    updateFooter();
    toast(`已完成：${data.run.outputs?.summary || '结果已生成'}`);
  } catch (error) {
    state.result = null;
    state.resultError = {
      message: error.message,
      errors: error.payload?.error?.details?.errors || (error.payload?.error?.details?.results ? [] : null)
    };
    renderResult();
    toast(error.message, true);
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

async function toggleFavorite(id, current) {
  try {
    const data = await api(`/api/tools/${encodeURIComponent(id)}/favorite`, { method: 'POST', body: JSON.stringify({ favorite: !current }) });
    const index = state.tools.findIndex((tool) => tool.id === id);
    if (index >= 0) state.tools[index] = data.tool;
    if (state.selected?.id === id) state.selected = { ...state.selected, ...data.tool };
    if (state.view === 'tools') renderToolGrid();
    toast(data.tool.favorite ? '已加入收藏' : '已取消收藏');
  } catch (error) { toast(error.message, true); }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  toast('结果已复制');
}

async function createDraftFromEditor() {
  const raw = $('#draft-editor')?.value?.trim();
  if (!raw) { toast('请先粘贴工具定义', true); return; }
  let definition;
  try { definition = JSON.parse(raw); } catch (error) { toast(`JSON 解析失败：${error.message}`, true); return; }
  try {
    const data = await api('/api/drafts', { method: 'POST', body: JSON.stringify({ definition }) });
    await loadDrafts();
    state.activeDraft = data.draft;
    state.view = 'drafts';
    render();
    toast('草稿已创建，下一步运行校验');
  } catch (error) { toast(error.message, true); }
}

async function validateDraft(id) {
  try {
    const data = await api(`/api/drafts/${encodeURIComponent(id)}/validate`, { method: 'POST', body: '{}' });
    state.activeDraft = data.draft;
    await loadDrafts();
    state.activeDraft = state.drafts.find((draft) => draft.id === id) || data.draft;
    render();
    toast(data.draft.testReport?.ok ? '校验与测试全部通过' : '校验未通过，请查看报告', !data.draft.testReport?.ok);
  } catch (error) { toast(error.message, true); }
}

async function publishDraft(id) {
  try {
    const data = await api(`/api/drafts/${encodeURIComponent(id)}/publish`, { method: 'POST', body: '{}' });
    await Promise.all([loadDrafts(), refreshTools()]);
    state.activeDraft = state.drafts.find((draft) => draft.id === id) || null;
    state.view = 'drafts';
    render();
    toast(`已发布 ${data.tool.name}，工作台与 MCP 同时可用`);
  } catch (error) {
    const details = error.payload?.error?.details;
    const message = details?.results ? '测试未全部通过，查看报告' : (details?.errors?.[0] || error.message);
    toast(message, true);
  }
}

async function deleteDraft(id) {
  if (!confirm('删除这份草稿？此操作不可撤销。')) return;
  try {
    await api(`/api/drafts/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (state.activeDraft?.id === id) state.activeDraft = null;
    await loadDrafts();
    render();
    toast('草稿已删除');
  } catch (error) { toast(error.message, true); }
}

async function toggleSetting(key) {
  const next = !state.settings[key];
  try {
    const data = await api('/api/settings', { method: 'PATCH', body: JSON.stringify({ [key]: next }) });
    state.settings = data.settings;
    applySettings();
    render();
    toast(next ? '已开启' : '已关闭');
  } catch (error) { toast(error.message, true); }
}

/* ===== Events ===== */
const APP_STARTED_AT = Date.now();

function revealNativeWindow() {
  try {
    window.webkit?.messageHandlers?.novaboxReveal?.postMessage({ at: Date.now() });
  } catch { /* browser mode */ }
}

function connectEvents() {
  if (state.events) state.events.close();
  const events = new EventSource('/api/events');
  state.events = events;
  events.onopen = () => setConnection('online');
  events.onerror = () => setConnection('offline');
  events.addEventListener('tool.completed', async (event) => {
    try {
      const envelope = JSON.parse(event.data);
      if (new Date(envelope.createdAt).getTime() < APP_STARTED_AT - 1500) return;
      const data = envelope.payload || {};
      if (data.origin === 'ui') return;
      toast(`MCP 调用了「${data.toolName}」`);
      if (state.settings.autoOpen) {
        revealNativeWindow();
        await openTool(data.toolId, data.inputs, { id: data.runId, ...data, status: 'success' });
      }
    } catch { /* ignore malformed event */ }
  });
  events.addEventListener('tool.open', async (event) => {
    try {
      const envelope = JSON.parse(event.data);
      if (new Date(envelope.createdAt).getTime() < APP_STARTED_AT - 1500) return;
      const data = envelope.payload || {};
      if (data.toolId && state.settings.autoOpen) {
        revealNativeWindow();
        await openTool(data.toolId, data.inputs);
      }
    } catch { /* ignore */ }
  });
  events.addEventListener('tools.changed', async (event) => {
    try {
      const envelope = JSON.parse(event.data);
      if (new Date(envelope.createdAt).getTime() < APP_STARTED_AT - 1500) return;
      await refreshTools();
      if (state.view === 'tools') render();
    } catch { /* ignore */ }
  });
}

/* ===== Delegation ===== */
document.addEventListener('click', async (event) => {
  const target = event.target.closest('[data-action]');
  const nav = event.target.closest('[data-view]');
  if (nav && !target) { await navigate(nav.dataset.view); return; }
  if (!target) {
    if (!event.target.closest('.nav-dropdown')) closeMenu();
    return;
  }
  const action = target.dataset.action;
  if (action !== 'toggle-settings-menu' && !event.target.closest('.nav-dropdown')) closeMenu();
  if (action === 'toggle-settings-menu') {
    const menu = $('#settings-menu');
    const willOpen = menu.hidden;
    closeMenu();
    menu.hidden = !willOpen;
    target.setAttribute('aria-expanded', String(willOpen));
    return;
  }
  if (action === 'open-tool') { await openTool(target.dataset.id); return; }
  if (action === 'back-tools') { state.view = 'tools'; render(); return; }
  if (action === 'delete-tool') {
    event.stopPropagation();
    const tool = state.selected;
    if (!tool) return;
    if (target.dataset.confirm !== '1') {
      target.dataset.confirm = '1';
      target.classList.add('is-confirming');
      target.innerHTML = `${icon('trash', 'icon icon-sm')} 确认删除`;
      setTimeout(() => {
        if (!target.isConnected || target.dataset.confirm !== '1') return;
        delete target.dataset.confirm;
        target.classList.remove('is-confirming');
        target.innerHTML = `${icon('trash', 'icon icon-sm')} 删除`;
      }, 3000);
      return;
    }
    target.disabled = true;
    try {
      await api(`/api/tools/${encodeURIComponent(tool.id)}`, { method: 'DELETE' });
      state.selected = null;
        state.view = 'tools';
      await refreshTools();
      render();
      toast(`已删除「${tool.name}」`);
    } catch (error) {
      target.disabled = false;
      toast(error.message, true);
    }
    return;
  }
  if (action === 'favorite') {
    event.stopPropagation();
    await toggleFavorite(target.dataset.id, target.dataset.favorite === '1');
    return;
  }
  if (action === 'set-category') { state.category = target.dataset.category; state.view = 'tools'; render(); return; }
  if (action === 'toggle-favorites') { state.favoritesOnly = !state.favoritesOnly; state.view = 'tools'; render(); return; }
  if (action === 'check-update') {
    target.disabled = true;
    try {
      state.updateInfo = await api('/api/update/check', { method: 'POST' });
      await loadUpdateStatus(true);
      syncUpdatePanel();
      document.querySelector('#update-detail')?.classList.remove('is-error');
      toast(state.updateInfo.hasUpdate ? `发现新版本 v${state.updateInfo.latestVersion}` : '当前已是最新版本');
    } catch (error) {
      const detail = document.querySelector('#update-detail');
      if (detail) {
        detail.textContent = error.message;
        detail.classList.add('is-error');
      }
      toast(error.message, true);
    } finally {
      target.disabled = false;
    }
    return;
  }
  if (action === 'install-update') {
    target.disabled = true;
    try {
      const result = await api('/api/update/install', { method: 'POST' });
      state.update = { ...(state.update || {}), state: result.state };
      syncUpdatePanel();
      startUpdatePolling();
      toast('开始下载更新');
    } catch (error) {
      target.disabled = false;
      toast(error.message, true);
    }
    return;
  }
  if (action === 'copy-result') { await copyText(state.result ? resultDisplayText(state.result) : ''); return; }
  if (action === 'rerun-tool') { $('#tool-form')?.requestSubmit(); return; }
  if (action === 'load-history') {
    const run = state.history.find((item) => item.id === target.dataset.id);
    if (run) await openTool(run.toolId, run.inputs || null);
    return;
  }
  if (action === 'rerun-history') {
    const run = state.history.find((item) => item.id === target.dataset.id);
    if (!run) return;
    await openTool(run.toolId, run.inputs || null);
    setTimeout(() => $('#tool-form')?.requestSubmit(), 120);
    return;
  }
  if (action === 'clear-history') {
    if (!confirm('清空全部运行历史？此操作不可撤销。')) return;
    try {
      await api('/api/history', { method: 'DELETE' });
      state.history = []; state.historyTotal = 0;
      if (state.health?.stats) state.health.stats.runs = 0;
      render();
      toast('运行历史已清空');
    } catch (error) { toast(error.message, true); }
    return;
  }
  if (action === 'sync-tools') {
    try {
      await api('/api/system/sync', { method: 'POST', body: '{}' });
      await refreshTools();
      render();
      toast(`已重新扫描，${state.tools.length} 个工具可用`);
    } catch (error) { toast(error.message, true); }
    return;
  }
  if (action === 'draft-template') {
    try {
      const data = await api('/api/tools/text-format');
      const editor = $('#draft-editor');
      if (editor) { editor.value = JSON.stringify(data.tool.definition, null, 2); editor.focus(); }
      if (!state.activeDraft) toast('已载入示例，可直接创建草稿');
    } catch (error) { toast(error.message, true); }
    return;
  }
  if (action === 'draft-create') { await createDraftFromEditor(); return; }
  if (action === 'draft-select') {
    state.activeDraft = state.drafts.find((draft) => draft.id === target.dataset.id) || null;
    render();
    return;
  }
  if (action === 'draft-close') { state.activeDraft = null; render(); return; }
  if (action === 'draft-validate') { await validateDraft(target.dataset.id); return; }
  if (action === 'draft-publish') { await publishDraft(target.dataset.id); return; }
  if (action === 'draft-delete') { await deleteDraft(target.dataset.id); return; }
  if (action === 'toggle-setting') { await toggleSetting(target.dataset.key); return; }
  if (action === 'refresh-diagnostics') {
    state.diagnostics = null; render();
    try { await loadDiagnostics(); render(); } catch (error) { toast(error.message, true); }
    return;
  }
});

document.addEventListener('submit', async (event) => {
  if (event.target.id === 'tool-form') {
    event.preventDefault();
    await runCurrentTool(event.target);
  }
});

document.addEventListener('input', (event) => {
  if (event.target.id === 'tool-search') {
    state.query = event.target.value;
    renderToolGrid();
  }
  if (event.target.id === 'history-search') {
    state.historyQuery = event.target.value;
    const list = $('#history-list');
    if (list) list.innerHTML = historyRows();
  }
});

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (state.view !== 'tools') { state.view = 'tools'; render(); }
    $('#tool-search')?.focus();
  }
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && state.view === 'tool') {
    event.preventDefault();
    $('#tool-form')?.requestSubmit();
  }
  if (event.key === 'Escape') closeMenu();
  if (event.key === 'Enter' && event.target.classList?.contains('tool-card')) {
    event.preventDefault();
    event.target.click();
  }
});

/* ===== Boot ===== */
async function boot() {
  try {
    const [health, tools, settings, drafts] = await Promise.all([
      api('/api/health'),
      api('/api/tools'),
      api('/api/settings'),
      api('/api/drafts')
    ]);
    state.health = health;
    state.tools = tools.tools || [];
    state.settings = settings.settings;
    state.drafts = drafts.drafts || [];
    applySettings();
    setConnection('online');
    state.view = 'tools';
    render();
    connectEvents();
  } catch (error) {
    setConnection('offline');
    $('#main-content').innerHTML = `<section class="view"><div class="empty-state"><span class="empty-icon">${icon('alert')}</span><h3>无法连接本地内核</h3><p>${escapeHtml(error.message)}。请确认服务已启动：<span class="mono">node server.mjs</span></p></div></section>`;
    $('#footer-status').textContent = '本地内核未连接';
    toast('无法连接本地内核', true);
  }
}

boot();
