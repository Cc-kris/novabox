import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Store } from './db.mjs';
import { validateDefinition } from './definition.mjs';
import { executeDefinition, runTests } from './executor.mjs';
import { validateInputs } from './schema.mjs';
import { loadToolPackages } from './tool-loader.mjs';
import { APP_ROOT, DB_PATH, TOOLS_DIR } from './paths.mjs';

export class ServiceError extends Error {
  constructor(message, { status = 400, code = 'BAD_REQUEST', details = null } = {}) {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const VALID_ORIGINS = new Set(['ui', 'mcp', 'system']);
const DENSITY_VALUES = new Set(['comfortable', 'compact']);

function parseDefinitionObject(definition) {
  let value = definition;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch (error) {
      throw new ServiceError(`JSON 解析失败：${error.message}`, { code: 'INVALID_JSON' });
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ServiceError('工具定义必须是 JSON 对象', { code: 'INVALID_DEFINITION' });
  }
  return value;
}

const VISIBLE_BUILTIN_IDS = new Set(['text-format', 'unit-convert', 'currency-convert']);

function isVisibleTool(tool) {
  return tool.source !== 'builtin' || VISIBLE_BUILTIN_IDS.has(tool.id);
}

function summarizeTool(tool) {
  const definition = tool.definition;
  return {
    id: tool.id,
    version: tool.version,
    name: tool.name,
    summary: tool.summary,
    category: tool.category,
    icon: definition.metadata?.icon ?? 'box',
    favorite: tool.favorite,
    useCount: tool.useCount,
    lastUsedAt: tool.lastUsedAt,
    updatedAt: tool.updatedAt,
    source: definition.metadata?.source ?? 'user',
    keywords: definition.metadata?.keywords ?? [],
    inputCount: Object.keys(definition.inputs?.schema?.properties ?? {}).length,
    testCount: Array.isArray(definition.tests) ? definition.tests.length : 0,
    permissions: definition.permissions ?? {}
  };
}

export class NovaboxService {
  constructor({ dbPath = DB_PATH } = {}) {
    this.store = new Store(dbPath);
    this.loadWarnings = [];
    this.startedAt = new Date().toISOString();
    this.syncTools();
  }

  syncTools() {
    const { tools, warnings } = loadToolPackages(TOOLS_DIR);
    for (const item of tools) this.store.upsertTool(item.definition, item.sourcePath);
    this.loadWarnings = warnings;
    return { loaded: tools.length, warnings };
  }

  searchTerms(query) {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return [];
  const terms = new Set();
  const parts = q.split(/[\s,，。;；:：/\\|_\-+()（）[\]{}]+/).filter(Boolean);
  for (const part of parts) {
    if (part.length >= 2) terms.add(part);
    for (const seg of part.match(/[\u3400-\u9fff]+/g) ?? []) {
      const max = Math.min(4, seg.length);
      for (let n = 2; n <= max; n += 1) {
        for (let i = 0; i + n <= seg.length; i += 1) terms.add(seg.slice(i, i + n));
      }
    }
    for (const seg of part.match(/[a-z0-9]+/g) ?? []) {
      if (seg.length >= 2) terms.add(seg);
    }
  }
  if (terms.size === 0) terms.add(q);
  return [...terms];
}

  listTools({ query = '', category = 'all', favoritesOnly = false } = {}) {
    const q = String(query ?? '').trim().toLowerCase();
    const visibleTools = this.store.listTools().map(summarizeTool).filter(isVisibleTool);
    let tools = visibleTools;
    if (category && category !== 'all') tools = tools.filter((tool) => tool.category === category);
    if (favoritesOnly) tools = tools.filter((tool) => tool.favorite);
    if (q) {
      const terms = this.searchTerms(q);
      tools = tools
        .map((tool) => {
          const id = String(tool.id ?? '').toLowerCase();
          const name = String(tool.name ?? '').toLowerCase();
          const haystack = [tool.id, tool.name, tool.summary, tool.category, ...(tool.keywords ?? [])].join(' ').toLowerCase();
          let score = 0;
          for (const term of terms) {
            if (id === term) score += 6;
            else if (id.includes(term)) score += 4;
            else if (name.includes(term)) score += 3;
            else if (haystack.includes(term)) score += 1;
          }
          return { tool, score };
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score
          || (b.tool.useCount ?? 0) - (a.tool.useCount ?? 0)
          || a.tool.name.localeCompare(b.tool.name, 'zh-CN'))
        .map((entry) => entry.tool);
    }
    const categories = [...new Set(visibleTools.map((tool) => tool.category))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    return { tools, categories, total: tools.length };
  }

  getTool(id) {
    const tool = this.store.getTool(id);
    if (!tool) throw new ServiceError('没有找到这个工具', { status: 404, code: 'TOOL_NOT_FOUND' });
    return {
      ...summarizeTool(tool),
      definition: tool.definition,
      tests: tool.definition.tests ?? [],
      sourcePath: tool.sourcePath
    };
  }

  setFavorite(id, favorite) {
    if (!this.store.setFavorite(id, Boolean(favorite))) {
      throw new ServiceError('没有找到这个工具', { status: 404, code: 'TOOL_NOT_FOUND' });
    }
    return this.getTool(id);
  }

  runTool(id, rawInputs = {}, { origin = 'ui' } = {}) {
    if (!VALID_ORIGINS.has(origin)) throw new ServiceError('来源无效', { code: 'INVALID_ORIGIN' });
    const tool = this.store.getTool(id);
    if (!tool) throw new ServiceError('没有找到这个工具', { status: 404, code: 'TOOL_NOT_FOUND' });

    const validation = validateInputs(tool.definition.inputs.schema, rawInputs);
    if (!validation.ok) {
      throw new ServiceError('参数校验未通过', { code: 'INVALID_INPUT', details: { errors: validation.errors } });
    }

    const settings = this.store.getSettings();
    const runId = crypto.randomUUID();
    const startedAt = Date.now();
    const createdAt = new Date().toISOString();
    let outputs;
    try {
      const result = executeDefinition(tool.definition, validation.values, { includeVars: false });
      outputs = result.outputs;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      if (settings.historyEnabled) {
        this.store.insertRun({
          id: runId,
          toolId: tool.id,
          toolName: tool.name,
          toolVersion: tool.version,
          origin,
          status: 'error',
          inputs: settings.keepInputs ? validation.values : undefined,
          error: { message: error.message, stepIndex: error.stepIndex ?? null },
          durationMs,
          createdAt
        });
      }
      this.store.markUsed(tool.id);
      throw new ServiceError(error.message, { status: 422, code: 'EXECUTION_FAILED', details: { runId } });
    }

    const durationMs = Date.now() - startedAt;
    const run = {
      id: runId,
      toolId: tool.id,
      toolName: tool.name,
      toolVersion: tool.version,
      origin,
      status: 'success',
      inputs: validation.values,
      outputs,
      durationMs,
      createdAt
    };

    if (settings.historyEnabled) {
      this.store.insertRun({ ...run, inputs: settings.keepInputs ? validation.values : undefined });
    }
    this.store.markUsed(tool.id);
    this.store.emit('tool.completed', {
      runId,
      toolId: tool.id,
      toolName: tool.name,
      toolVersion: tool.version,
      origin,
      outputs,
      inputs: settings.keepInputs ? validation.values : null,
      durationMs,
      createdAt
    });

    return { run, tool: summarizeTool(this.getTool(tool.id)) };
  }

  openTool(id, inputs = null) {
    const tool = this.getTool(id);
    this.store.emit('tool.open', {
      toolId: tool.id,
      toolName: tool.name,
      inputs: inputs && typeof inputs === 'object' ? inputs : null
    });
    return { opened: true, tool: { id: tool.id, name: tool.name } };
  }

  history({ limit = 50, toolId = null } = {}) {
    return { runs: this.store.listRuns({ limit, toolId }), total: this.store.stats().runs };
  }

  clearHistory() {
    this.store.clearRuns();
    return { ok: true };
  }

  createDraft(definition) {
    const parsed = parseDefinitionObject(definition);
    const validation = validateDefinition(parsed);
    const id = crypto.randomUUID();
    this.store.insertDraft({
      id,
      toolId: parsed.metadata?.id ?? 'unknown',
      name: parsed.metadata?.name ?? '未命名工具',
      definition: parsed,
      status: validation.ok ? 'draft' : 'invalid',
      testReport: validation.ok ? null : { ok: false, staticErrors: validation.errors, results: [] }
    });
    return this.store.getDraft(id);
  }

  listDrafts() {
    return { drafts: this.store.listDrafts(), total: this.store.listDrafts().length };
  }

  getDraft(id) {
    const draft = this.store.getDraft(id);
    if (!draft) throw new ServiceError('草稿不存在', { status: 404, code: 'DRAFT_NOT_FOUND' });
    return draft;
  }

  validateDraft(id) {
    const draft = this.getDraft(id);
    const validation = validateDefinition(draft.definition);
    let report;
    if (!validation.ok) {
      report = { ok: false, staticErrors: validation.errors, passed: 0, total: draft.definition.tests?.length ?? 0, results: [] };
    } else {
      const tests = runTests(draft.definition);
      report = { ...tests, staticErrors: [], ranAt: new Date().toISOString() };
    }
    this.store.updateDraft(id, { status: report.ok ? 'validated' : 'invalid', testReport: report });
    return this.store.getDraft(id);
  }

  publishDraft(id) {
    const draft = this.getDraft(id);
    const validation = validateDefinition(draft.definition);
    if (!validation.ok) {
      this.store.updateDraft(id, { status: 'invalid', testReport: { ok: false, staticErrors: validation.errors, results: [] } });
      throw new ServiceError('定义校验未通过，不能发布', { code: 'VALIDATION_FAILED', details: { errors: validation.errors } });
    }
    const tests = runTests(draft.definition);
    if (!tests.ok) {
      this.store.updateDraft(id, { status: 'invalid', testReport: tests });
      throw new ServiceError('测试未全部通过，不能发布', { code: 'TESTS_FAILED', details: tests });
    }

    const meta = draft.definition.metadata;
    const targetDir = path.join(TOOLS_DIR, 'user', meta.id);
    const targetPath = path.join(targetDir, 'tool.json');
    const existing = this.store.getTool(meta.id, meta.version);
    if (existing?.sourcePath && path.resolve(existing.sourcePath) !== path.resolve(targetPath)) {
      throw new ServiceError(`版本 ${meta.id}@${meta.version} 已被内置工具占用，请提升版本号`, {
        status: 409,
        code: 'VERSION_CONFLICT',
        details: { existingPath: existing.sourcePath }
      });
    }
    const normalized = { ...draft.definition, metadata: { ...meta, source: meta.source === 'builtin' ? 'user' : (meta.source ?? 'ai-draft') } };
    fs.mkdirSync(targetDir, { recursive: true });
    const tempPath = `${targetPath}.${process.pid}.tmp`;
    fs.writeFileSync(tempPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
    fs.renameSync(tempPath, targetPath);
    this.store.upsertTool(normalized, targetPath);
    this.store.restoreTool(meta.id);
    this.store.updateDraft(id, { status: 'published', testReport: tests });
    this.store.emit('tools.changed', { reason: 'published', toolId: meta.id, version: meta.version });
    return { draft: this.store.getDraft(id), tool: this.getTool(meta.id), tests };
  }

  deleteTool(id) {
    const tool = this.getTool(id);
    if (!tool) throw new ServiceError('工具不存在或已删除', { status: 404, code: 'TOOL_NOT_FOUND' });
    this.store.deleteTool(id);
    this.store.emit('tools.changed', { reason: 'deleted', toolId: id });
    return { ok: true, id };
  }

  deleteDraft(id) {
    if (!this.store.deleteDraft(id)) throw new ServiceError('草稿不存在', { status: 404, code: 'DRAFT_NOT_FOUND' });
    return { ok: true };
  }

  settings() {
    return { settings: this.store.getSettings() };
  }

  updateSettings(patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new ServiceError('设置必须是对象');
    if ('historyEnabled' in patch && typeof patch.historyEnabled !== 'boolean') throw new ServiceError('historyEnabled 必须是布尔值');
    if ('keepInputs' in patch && typeof patch.keepInputs !== 'boolean') throw new ServiceError('keepInputs 必须是布尔值');
    if ('autoOpen' in patch && typeof patch.autoOpen !== 'boolean') throw new ServiceError('autoOpen 必须是布尔值');
    if ('reducedMotion' in patch && typeof patch.reducedMotion !== 'boolean') throw new ServiceError('reducedMotion 必须是布尔值');
    if ('interfaceDensity' in patch && !DENSITY_VALUES.has(patch.interfaceDensity)) throw new ServiceError('interfaceDensity 无效');
    return { settings: this.store.updateSettings(patch) };
  }

  events(seq = 0) {
    return this.store.eventsAfter(seq);
  }

  diagnostics() {
    const { tools, warnings } = loadToolPackages(TOOLS_DIR);
    const settings = this.store.getSettings();
    const stats = this.store.stats();
    const checks = [];
    checks.push({ id: 'sqlite', label: 'SQLite 持久化', ok: true, detail: DB_PATH });
    checks.push({ id: 'tool-packages', label: '工具包扫描', ok: warnings.length === 0, detail: `${tools.length} 个有效工具${warnings.length ? `，${warnings.length} 个异常` : ''}` });
    const invalid = [];
    for (const item of tools) {
      const validation = validateDefinition(item.definition);
      if (!validation.ok) invalid.push({ id: item.definition.metadata?.id, errors: validation.errors });
    }
    checks.push({ id: 'schema', label: '定义 / Schema', ok: invalid.length === 0, detail: invalid.length ? `${invalid.length} 个定义异常` : '全部通过静态校验' });
    const mcpCli = path.join(APP_ROOT, 'mcp-server.mjs');
    checks.push({ id: 'mcp', label: 'MCP 适配器', ok: fs.existsSync(mcpCli), detail: mcpCli });
    checks.push({
      id: 'permissions',
      label: '能力边界',
      ok: true,
      detail: `网络 ${settings.allowNetwork ? '开' : '关'} / 文件写入 关 / Shell 关`
    });
    return {
      checks,
      warnings,
      stats,
      settings,
      runtime: {
        node: process.version,
        platform: `${process.platform} ${process.arch}`,
        appRoot: APP_ROOT,
        dbPath: DB_PATH,
        toolsDir: TOOLS_DIR,
        startedAt: this.startedAt,
        mcpProtocol: '2025-06-18'
      },
      storage: { dataDir: path.dirname(DB_PATH), dbBytes: fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0 }
    };
  }

  close() {
    this.store.close();
  }
}
