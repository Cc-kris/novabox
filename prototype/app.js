// Novabox Prototype - State & Router
'use strict';

// ===== Initial Data =====
const SAMPLE_TOOLS = [
  {
    id: 'text-format',
    name: '文本整理',
    description: '批量处理文本：去重、排序、格式化、统计字数',
    category: '文本处理',
    icon: 'AlignLeft',
    fields: [
      { key: 'text', label: '输入文本', type: 'textarea', required: true, placeholder: '每行一个条目...' },
      { key: 'operation', label: '操作', type: 'select', required: true, options: ['去重', '排序', '统计'] }
    ],
    version: '1.0',
    source: 'local'
  },
  {
    id: 'json-convert',
    name: 'JSON 转换',
    description: 'JSON 与其他格式互转：压缩/格式化/转表格',
    category: '数据转换',
    icon: 'Code',
    fields: [
      { key: 'json', label: 'JSON 内容', type: 'textarea', required: true, placeholder: '{"key": "value"}' },
      { key: 'format', label: '输出格式', type: 'select', required: true, options: ['格式化', '压缩', 'CSV'] }
    ],
    version: '1.0',
    source: 'local'
  },
  {
    id: 'unit-convert',
    name: '单位换算',
    description: '长度、重量、温度等常用单位转换',
    category: '计算工具',
    icon: 'Calculator',
    fields: [
      { key: 'value', label: '数值', type: 'number', required: true, placeholder: '100' },
      { key: 'from', label: '原单位', type: 'select', required: true, options: ['米', '千米', '英里', '千克', '磅'] },
      { key: 'to', label: '目标单位', type: 'select', required: true, options: ['米', '千米', '英里', '千克', '磅'] }
    ],
    version: '1.0',
    source: 'local'
  },
  {
    id: 'regex-test',
    name: '正则校验',
    description: '测试正则表达式并提取匹配结果',
    category: '开发工具',
    icon: 'Search',
    fields: [
      { key: 'pattern', label: '正则表达式', type: 'text', required: true, placeholder: '\\d{3}-\\d{4}' },
      { key: 'text', label: '测试文本', type: 'textarea', required: true, placeholder: '输入要匹配的内容...' },
      { key: 'flags', label: '标志', type: 'text', required: false, placeholder: 'gi' }
    ],
    version: '1.0',
    source: 'local'
  },
  {
    id: 'timestamp-convert',
    name: '时间戳转换',
    description: '时间戳与日期互转',
    category: '计算工具',
    icon: 'Clock',
    fields: [
      { key: 'input', label: '输入', type: 'text', required: true, placeholder: '时间戳或日期' },
      { key: 'timezone', label: '时区', type: 'select', required: true, options: ['UTC+8', 'UTC', 'UTC-5'] }
    ],
    version: '1.0',
    source: 'local'
  }
];

const SAMPLE_DRAFT = {
  id: 'draft-1',
  name: 'Markdown 表格生成器',
  description: '根据输入生成标准 Markdown 表格',
  category: '文本处理',
  icon: 'Table',
  fields: [
    { key: 'rows', label: '行数', type: 'number', required: true, placeholder: '3' },
    { key: 'cols', label: '列数', type: 'number', required: true, placeholder: '4' }
  ],
  version: '0.1',
  source: 'draft',
  status: {
    tested: true,
    validated: true,
    permissions: 'read-only'
  }
};

// ===== State Management =====
const state = {
  view: 'tools', // tools | tool | drafts | history | settings
  theme: 'light',
  returnView: 'tools',
  width: 360,
  hostConnected: true,
  query: '',
  filter: 'all', // all | favorites
  favorites: new Set(['text-format']),
  tools: [...SAMPLE_TOOLS],
  selectedTool: null,
  form: {},
  runStatus: null, // null | running | success | error
  result: null,
  resultOrigin: null,
  history: [],
  drafts: [SAMPLE_DRAFT],
  errors: {}
};

// ===== Render System =====
function render() {
  const main = document.getElementById('main-content');
  
  switch(state.view) {
    case 'tools':
      main.innerHTML = renderToolsView();
      break;
    case 'tool':
      main.innerHTML = renderToolView();
      break;
    case 'history':
      main.innerHTML = renderHistoryView();
      break;
    case 'drafts':
      main.innerHTML = renderDraftsView();
      break;
    case 'settings':
      main.innerHTML = renderSettingsView();
      break;
  }
  
  updateFooter();
  updateTheme();
  updateWidth();
}

function renderNavigation(active) {
  const items = [
    ['tools', '工具库', '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>'],
    ['drafts', '草稿', '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'],
    ['history', '历史', '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/>'],
    ['settings', '设置', '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1m0-14.2L17 7M7 17l-2.1 2.1"/>']
  ];
  return `<nav class="nav-tabs" role="tablist" aria-label="主菜单">${items.map(([id,label,icon]) => `
    <button class="nav-tab ${active === id ? 'active' : ''}" role="tab" aria-selected="${active === id}" data-action="nav" data-target="${id}" data-testid="nav-${id}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${icon}</svg>
      <span>${label}</span>
    </button>`).join('')}</nav>`;
}

function renderToolsView() {
  const filtered = getFilteredTools();
  
  return `
    <div class="view-tools">
      ${renderNavigation('tools')}
      <div class="tools-header">
        <div class="section-kicker">你的可复用工具</div>
        <div class="tools-search">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input 
            type="search" 
            class="search-input" 
            placeholder="搜索工具..." 
            value="${escapeHtml(state.query)}"
            data-action="search"
            data-testid="tool-search"
            aria-label="搜索工具"
          />
        </div>
        <div class="tools-filters">
          <button 
            class="filter-chip ${state.filter === 'all' ? 'active' : ''}" 
            data-action="filter" 
            data-filter="all"
            data-testid="filter-all"
          >
            全部 <span class="count">${state.tools.length}</span>
          </button>
          <button 
            class="filter-chip ${state.filter === 'favorites' ? 'active' : ''}" 
            data-action="filter" 
            data-filter="favorites"
            data-testid="filter-favorites"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${state.filter === 'favorites' ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            收藏 <span class="count">${state.favorites.size}</span>
          </button>
        </div>
      </div>
      
      ${filtered.length === 0 ? renderEmptyState() : `
        <ul class="tools-list" role="list">
          ${filtered.map(tool => `
            <li class="tool-item" data-action="open-tool" data-tool-id="${tool.id}" data-testid="tool-${tool.id}">
              <div class="tool-icon" aria-hidden="true">
                ${renderIcon(tool.icon)}
              </div>
              <div class="tool-content">
                <div class="tool-header">
                  <span class="tool-name">${escapeHtml(tool.name)}</span>
                  <div class="tool-meta">
                    <span class="tool-category">${escapeHtml(tool.category)}</span>
                  </div>
                </div>
                <p class="tool-description">${escapeHtml(tool.description)}</p>
              </div>
              <div class="tool-actions">
                <button 
                  class="favorite-btn ${state.favorites.has(tool.id) ? 'active' : ''}" 
                  data-action="toggle-favorite" 
                  data-tool-id="${tool.id}"
                  aria-label="${state.favorites.has(tool.id) ? '取消收藏' : '收藏'}"
                  data-testid="favorite-${tool.id}"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="${state.favorites.has(tool.id) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </button>
              </div>
            </li>
          `).join('')}
        </ul>
      `}
    </div>
  `;
}

function renderEmptyState() {
  return `
    <div class="empty-state">
      <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <h2 class="empty-title">没有找到工具</h2>
      <p class="empty-description">试试其他关键词，或清空搜索查看全部</p>
      ${state.query ? `<button class="empty-action" data-action="clear-search">清空搜索</button>` : ''}
    </div>
  `;
}

// ===== Utilities =====
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function getFilteredTools() {
  let filtered = state.tools;
  
  if (state.filter === 'favorites') {
    filtered = filtered.filter(t => state.favorites.has(t.id));
  }
  
  if (state.query) {
    const q = state.query.toLowerCase();
    filtered = filtered.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }
  
  return filtered;
}

function renderIcon(name) {
  const icons = {
    AlignLeft: '<path d="M21 6H3M15 12H3M17 18H3"/>',
    Code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    Calculator: '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/>',
    Search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
    Clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    Table: '<path d="M3 3h18v18H3z"/><path d="M3 9h18M3 15h18M12 3v18"/>'
  };
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icons[name] || icons.Code}</svg>`;
}

function updateFooter() {
  const hostText = document.getElementById('host-text');
  const statusIndicator = document.querySelector('.status-indicator');
  
  if (state.hostConnected) {
    hostText.textContent = '已连接 Codex';
    statusIndicator.classList.remove('disconnected');
  } else {
    hostText.textContent = '未连接';
    statusIndicator.classList.add('disconnected');
  }
}

function updateTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
}

function updateWidth() {
  document.documentElement.style.setProperty('--sidebar-width', `${state.width}px`);
}

// ===== Tool Detail View =====
function renderToolView() {
  const tool = state.selectedTool;
  if (!tool) return renderToolsView();
  
  return `
    <div class="view-tool">
      <button class="btn-secondary" data-action="back" style="margin-bottom: 16px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        返回
      </button>
      
      <div class="tool-detail-header">
        <div class="tool-detail-icon" aria-hidden="true">
          ${renderIcon(tool.icon)}
        </div>
        <div class="tool-detail-info">
          <h1 class="tool-detail-name">${escapeHtml(tool.name)}</h1>
          <p class="tool-detail-description">${escapeHtml(tool.description)}</p>
          <div class="tool-detail-meta">
            <span>${escapeHtml(tool.category)}</span>
            <span>v${tool.version}</span>
            ${tool.source === 'agent' ? '<span class="agent-badge">来自 Codex</span>' : ''}
          </div>
        </div>
      </div>
      
      ${tool.source === 'agent' ? `
        <div style="margin-bottom: 16px; padding: 12px; background: rgba(125, 183, 232, 0.1); border: 1px solid rgba(125, 183, 232, 0.3); border-radius: 6px; font-size: 12px; color: var(--state-info);">
          <strong>模拟 Agent 调用</strong> - 此工具参数由 Codex 自动生成（原型演示）
        </div>
      ` : ''}
      
      <form class="form-section" data-testid="tool-form">
        <h2 class="section-title">参数</h2>
        ${tool.fields.map(field => renderFormField(field, tool.id)).join('')}
        
        <div class="form-actions">
          <button type="submit" class="btn-primary ${state.runStatus === 'running' ? 'loading' : ''}" 
                  ${state.runStatus === 'running' ? 'disabled' : ''} 
                  data-action="run-tool" 
                  data-testid="run-tool-btn">
            ${state.runStatus === 'running' ? '运行中...' : '运行'}
          </button>
          ${tool.source !== 'agent' ? `
            <button type="button" class="btn-secondary" data-action="simulate-agent" data-testid="simulate-agent-btn">
              模拟 Agent 调用
            </button>
          ` : ''}
        </div>
      </form>
      
      ${state.result !== null ? renderResult() : ''}
    </div>
  `;
}

function renderFormField(field, toolId) {
  const value = state.form[field.key] || '';
  const error = state.errors[field.key] || '';
  const fieldId = `field-${toolId}-${field.key}`;
  
  let input = '';
  if (field.type === 'textarea') {
    input = `<textarea class="field-input ${error ? 'error' : ''}" id="${fieldId}" name="${field.key}" 
              placeholder="${escapeHtml(field.placeholder || '')}" ${field.required ? 'aria-required="true"' : ''}
              data-testid="input-${field.key}">${escapeHtml(value)}</textarea>`;
  } else if (field.type === 'select') {
    input = `<select class="field-input ${error ? 'error' : ''}" id="${fieldId}" name="${field.key}" 
              ${field.required ? 'aria-required="true"' : ''} data-testid="input-${field.key}">
              <option value="">请选择</option>
              ${field.options.map(opt => `<option value="${escapeHtml(opt)}" ${value === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
            </select>`;
  } else {
    input = `<input type="${field.type}" class="field-input ${error ? 'error' : ''}" id="${fieldId}" name="${field.key}"
              value="${escapeHtml(value)}" placeholder="${escapeHtml(field.placeholder || '')}"
              ${field.required ? 'aria-required="true"' : ''} data-testid="input-${field.key}" />`;
  }
  
  return `
    <div class="form-field">
      <label class="field-label" for="${fieldId}">
        ${escapeHtml(field.label)}
        ${field.required ? '<span class="required">*</span>' : ''}
      </label>
      ${input}
      ${error ? `<span class="field-error" role="alert">${escapeHtml(error)}</span>` : ''}
    </div>
  `;
}

function getResultPresentation() {
  const raw = state.result || '';
  if (state.runStatus === 'error') return { label: '错误信息', value: raw, detail: '' };
  if (state.selectedTool?.id === 'json-convert') {
    try {
      const data = JSON.parse(raw);
      const count = Array.isArray(data) ? data.length : Object.keys(data).length;
      return { label: '转换完成', value: `${count} 个${Array.isArray(data) ? '条目' : '字段'}`, detail: raw };
    } catch (_) {
      return { label: '转换结果', value: raw.split('\n')[0], detail: raw };
    }
  }
  return { label: '结果值', value: raw, detail: '' };
}

function renderResult() {
  const isSuccess = state.runStatus === 'success';
  const isError = state.runStatus === 'error';
  
  return `
    <div class="result-section" data-testid="result-section">
      <div class="result-header">
        <h2 class="result-title">结果</h2>
        <div class="result-status ${isSuccess ? 'success' : isError ? 'error' : ''}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${isSuccess ? '<polyline points="20 6 9 17 4 12"/>' : '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'}
          </svg>
          ${isSuccess ? '成功' : '失败'}
        </div>
      </div>
      ${state.resultOrigin ? `
        <div style="margin-bottom: 12px; font-size: 12px; color: var(--state-info);">
          来源：${escapeHtml(state.resultOrigin)}
        </div>
      ` : ''}
      ${isSuccess ? (() => { const result = getResultPresentation(); return `
        <div class="result-value-card">
          <div class="result-value-label">${escapeHtml(result.label)}</div>
          <div class="result-value" data-testid="result-content">${escapeHtml(result.value)}</div>
        </div>
        ${result.detail ? `<details class="result-details"><summary>查看结构化详情</summary><pre>${escapeHtml(result.detail)}</pre></details>` : ''}
      `; })() : `<div class="result-error-message" data-testid="result-content">${escapeHtml(state.result)}</div>`}
      ${isSuccess ? `
        <div class="result-actions">
          <button class="btn-icon-text" data-action="copy-result" data-testid="copy-result-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            复制结果
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

// ===== History & Drafts Views =====
function renderHistoryView() {
  return `
    <div class="view-history">
      ${renderNavigation('history')}
      <div class="section-kicker">最近的运行记录</div>
      
      ${state.history.length === 0 ? `
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <h2 class="empty-title">还没有历史记录</h2>
          <p class="empty-description">运行工具后会在这里显示</p>
        </div>
      ` : `
        <ul class="history-list" role="list">
          ${state.history.slice().reverse().map(record => {
            const tool = state.tools.find(t => t.id === record.toolId);
            return `
              <li class="history-item" data-action="open-history" data-history-id="${record.id}" data-testid="history-${record.id}">
                <div class="history-header">
                  <span class="history-tool-name">${tool ? escapeHtml(tool.name) : '未知工具'}</span>
                  <span class="history-time">${formatTime(record.createdAt)}</span>
                </div>
                <div class="history-preview">${escapeHtml(record.inputs[Object.keys(record.inputs)[0]] || '').substring(0, 60)}...</div>
                <span class="history-status-badge ${record.status}">${record.status === 'success' ? '成功' : '失败'}</span>
              </li>
            `;
          }).join('')}
        </ul>
      `}
    </div>
  `;
}

function renderDraftsView() {
  return `
    <div class="view-drafts">
      ${renderNavigation('drafts')}
      <div class="section-kicker">验证后，即可加入工具库</div>
      
      ${state.drafts.map(draft => `
        <div class="draft-item" data-testid="draft-${draft.id}">
          <div class="draft-header">
            <div class="draft-info">
              <h2 class="draft-name">${escapeHtml(draft.name)}</h2>
              <p class="draft-description">${escapeHtml(draft.description)}</p>
            </div>
            <div class="draft-status">
              ${draft.status.tested ? '<span class="status-chip success">已测试</span>' : '<span class="status-chip warning">待测试</span>'}
              ${draft.status.validated ? '<span class="status-chip success">已校验</span>' : ''}
            </div>
          </div>
          
          <div class="draft-meta">
            <div class="draft-meta-item">
              <span class="draft-meta-label">版本</span>
              <span class="draft-meta-value">v${draft.version}</span>
            </div>
            <div class="draft-meta-item">
              <span class="draft-meta-label">权限</span>
              <span class="draft-meta-value">${draft.status.permissions}</span>
            </div>
            <div class="draft-meta-item">
              <span class="draft-meta-label">来源</span>
              <span class="draft-meta-value">从会话创建</span>
            </div>
          </div>
          
          <div class="draft-actions">
            <button class="btn-primary" data-action="publish-draft" data-draft-id="${draft.id}" data-testid="publish-${draft.id}">
              确认发布
            </button>
            <button class="btn-secondary" data-action="preview-draft" data-draft-id="${draft.id}">
              预览
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSettingsView() {
  return `
    <div class="view-settings">
      ${renderNavigation('settings')}
      <div class="section-kicker">偏好与连接</div>
      
      <div class="settings-section">
        <div class="settings-label">外观</div>
        <div class="settings-description">明亮白色工作区，外侧流动光边</div>
      </div>
      
      <div class="settings-section">
        <div class="settings-label">侧栏宽度</div>
        <div class="settings-description">调整工具窗口宽度（像素）</div>
        <div class="settings-control">
          <div class="radio-group">
            <button class="radio-option ${state.width === 360 ? 'active' : ''}" data-action="set-width" data-value="360" data-testid="width-360">360</button>
            <button class="radio-option ${state.width === 400 ? 'active' : ''}" data-action="set-width" data-value="400" data-testid="width-400">400</button>
            <button class="radio-option ${state.width === 480 ? 'active' : ''}" data-action="set-width" data-value="480" data-testid="width-480">480</button>
          </div>
        </div>
      </div>
      
      <div class="settings-section">
        <div class="settings-label">宿主连接</div>
        <div class="settings-description">模拟与 Codex 的连接状态</div>
        <div class="settings-control">
          <div class="connection-status">
            <div class="connection-indicator ${state.hostConnected ? '' : 'disconnected'}"></div>
            <div class="connection-text">${state.hostConnected ? '已连接到 Codex' : '未连接（本地工具仍可用）'}</div>
            <button class="connection-action" data-action="toggle-host" data-testid="toggle-host">
              ${state.hostConnected ? '断开' : '连接'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ===== Actions =====
function validateForm(tool) {
  const errors = {};
  const data = {};
  
  tool.fields.forEach(field => {
    const value = state.form[field.key] || '';
    data[field.key] = value;
    
    if (field.required && !value.trim()) {
      errors[field.key] = '此字段为必填项';
    }
    
    if (field.type === 'number' && value && isNaN(Number(value))) {
      errors[field.key] = '请输入有效数字';
    }
  });
  
  state.errors = errors;
  return { valid: Object.keys(errors).length === 0, data };
}

function simulateToolRun(tool, inputs) {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate different results
      if (tool.id === 'text-format') {
        const lines = inputs.text.split('\n').filter(l => l.trim());
        if (inputs.operation === '去重') {
          resolve({ success: true, output: [...new Set(lines)].join('\n') });
        } else if (inputs.operation === '排序') {
          resolve({ success: true, output: lines.sort().join('\n') });
        } else {
          resolve({ success: true, output: `总行数: ${lines.length}\n总字数: ${inputs.text.length}` });
        }
      } else if (tool.id === 'json-convert') {
        try {
          const obj = JSON.parse(inputs.json);
          if (inputs.format === '格式化') {
            resolve({ success: true, output: JSON.stringify(obj, null, 2) });
          } else if (inputs.format === '压缩') {
            resolve({ success: true, output: JSON.stringify(obj) });
          } else {
            resolve({ success: true, output: 'key,value\n' + Object.entries(obj).map(([k,v]) => `${k},${v}`).join('\n') });
          }
        } catch (e) {
          resolve({ success: false, output: `JSON 解析错误: ${e.message}` });
        }
      } else {
        resolve({ success: true, output: `模拟结果:\n${JSON.stringify(inputs, null, 2)}` });
      }
    }, 1200);
  });
}

function formatTime(date) {
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff/60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}小时前`;
  return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function showDialog(title, body, actions) {
  const overlay = document.getElementById('dialog-overlay');
  const titleEl = document.getElementById('dialog-title');
  const bodyEl = document.getElementById('dialog-body');
  const footerEl = document.getElementById('dialog-footer');
  
  titleEl.textContent = title;
  bodyEl.innerHTML = body;
  footerEl.innerHTML = actions;
  
  overlay.removeAttribute('hidden');
  overlay.querySelector('.dialog-close').focus();
}

function closeDialog() {
  document.getElementById('dialog-overlay').setAttribute('hidden', '');
}

// ===== Event Delegation =====
function setupEventDelegation() {
  document.body.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    
    const action = target.dataset.action;
    
    if (action === 'search') return;
    if (action === 'filter') {
      e.preventDefault();
      state.filter = target.dataset.filter;
      render();
    }
    else if (action === 'clear-search') {
      state.query = '';
      render();
    }
    else if (action === 'toggle-favorite') {
      e.stopPropagation();
      const toolId = target.dataset.toolId;
      if (state.favorites.has(toolId)) {
        state.favorites.delete(toolId);
      } else {
        state.favorites.add(toolId);
      }
      render();
    }
    else if (action === 'open-tool') {
      const toolId = target.dataset.toolId;
      state.selectedTool = state.tools.find(t => t.id === toolId);
      state.view = 'tool';
      state.form = {};
      state.errors = {};
      state.result = null;
      state.resultOrigin = null;
      state.runStatus = null;
      render();
    }
    else if (action === 'back') {
      state.view = 'tools';
      state.selectedTool = null;
      render();
    }
    else if (action === 'run-tool') {
      e.preventDefault();
      if (state.runStatus === 'running') return;
      
      const form = document.querySelector('[data-testid="tool-form"]');
      const formData = new FormData(form);
      state.form = {};
      for (let [key, value] of formData) {
        state.form[key] = value;
      }
      
      const validation = validateForm(state.selectedTool);
      if (!validation.valid) {
        render();
        return;
      }
      
      state.runStatus = 'running';
      state.result = null;
      state.resultOrigin = null;
      render();
      
      const result = await simulateToolRun(state.selectedTool, validation.data);
      state.runStatus = result.success ? 'success' : 'error';
      state.result = result.output;
      
      // Add to history
      state.history.push({
        id: `hist-${Date.now()}`,
        toolId: state.selectedTool.id,
        origin: state.resultOrigin || 'local',
        inputs: {...validation.data},
        outputs: result.output,
        status: result.success ? 'success' : 'error',
        createdAt: new Date()
      });
      
      render();
    }
    else if (action === 'simulate-agent') {
      // Fill form with sample data
      const tool = state.selectedTool;
      state.form = {};
      
      if (tool.id === 'text-format') {
        state.form = { text: '苹果\n香蕉\n苹果\n橙子', operation: '去重' };
      } else if (tool.id === 'json-convert') {
        state.form = { json: '{"name":"测试","value":100}', format: '格式化' };
      } else {
        tool.fields.forEach(f => {
          if (f.type === 'number') state.form[f.key] = '100';
          else if (f.type === 'select' && f.options) state.form[f.key] = f.options[0];
          else state.form[f.key] = '示例数据';
        });
      }
      
      state.resultOrigin = 'Codex Agent (模拟)';
      render();
      
      // Auto-run
      setTimeout(() => {
        document.querySelector('[data-action="run-tool"]').click();
      }, 100);
    }
    else if (action === 'copy-result') {
      navigator.clipboard.writeText(getResultPresentation().value).then(() => {
        showToast('已复制到剪贴板');
      });
    }
    else if (action === 'open-history') {
      const historyId = target.dataset.historyId;
      const record = state.history.find(h => h.id === historyId);
      if (record) {
        state.selectedTool = state.tools.find(t => t.id === record.toolId);
        state.view = 'tool';
        state.form = {...record.inputs};
        state.errors = {};
        state.result = null;
        state.runStatus = null;
        render();
        showToast('已复用输入');
      }
    }
    else if (action === 'publish-draft') {
      const draftId = target.dataset.draftId;
      const draft = state.drafts.find(d => d.id === draftId);
      
      showDialog(
        '确认发布',
        `<p>发布后工具 <strong>${escapeHtml(draft.name)}</strong> 将添加到工具库，确定继续？</p>`,
        `<button class="btn-secondary" data-action="close-dialog">取消</button>
         <button class="btn-primary" data-action="confirm-publish" data-draft-id="${draftId}" data-testid="confirm-publish">发布</button>`
      );
    }
    else if (action === 'confirm-publish') {
      const draftId = target.dataset.draftId;
      const draftIndex = state.drafts.findIndex(d => d.id === draftId);
      const draft = state.drafts[draftIndex];
      
      const newTool = {...draft, id: `tool-${Date.now()}`, source: 'published'};
      state.tools.push(newTool);
      state.drafts.splice(draftIndex, 1);
      
      closeDialog();
      showToast('工具已发布');
      state.view = 'tools';
      render();
    }
    else if (action === 'close-dialog') {
      closeDialog();
    }
    else if (action === 'nav') {
      state.view = target.dataset.target;
      render();
    }
    else if (action === 'set-theme') {
      state.theme = target.dataset.value;
      render();
    }
    else if (action === 'set-width') {
      state.width = parseInt(target.dataset.value);
      render();
    }
    else if (action === 'toggle-host') {
      state.hostConnected = !state.hostConnected;
      render();
    }
    else if (action === 'back-settings') {
      state.view = state.returnView || 'tools';
      render();
    }
    else if (action === 'settings') {
      state.returnView = state.view === 'settings' ? 'tools' : state.view;
      state.view = 'settings';
      render();
    }
    else if (action === 'command') {
      showCommandMenu();
    }
  });
  
  document.body.addEventListener('input', (e) => {
    if (e.target.dataset.action === 'search') {
      state.query = e.target.value;
      render();
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDialog();
      closeCommandMenu();
    }
  });
}

function showCommandMenu() {
  const menu = document.getElementById('command-menu');
  menu.removeAttribute('hidden');
  menu.querySelector('.command-input').focus();
}

function closeCommandMenu() {
  const menu = document.getElementById('command-menu');
  menu.setAttribute('hidden', '');
}

// ===== Debug API =====
window.novaboxDebug = {
  getState: () => ({...state, favorites: Array.from(state.favorites)}),
  demoSimulateAgent: () => {
    if (state.view === 'tool' && state.selectedTool) {
      document.querySelector('[data-action="simulate-agent"]')?.click();
    }
  }
};

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  render();
  setupEventDelegation();
});
