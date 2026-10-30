import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { DATA_DIR, DB_PATH } from './paths.mjs';

const DEFAULT_SETTINGS = {
  historyEnabled: true,
  keepInputs: true,
  autoOpen: true,
  reducedMotion: false,
  interfaceDensity: 'comfortable'
};

export class Store {
  constructor(dbPath = DB_PATH) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    this.path = dbPath;
    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.migrate();
    this.seedSettings();
  }

  migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tools (
        id TEXT NOT NULL,
        version TEXT NOT NULL,
        name TEXT NOT NULL,
        summary TEXT NOT NULL,
        category TEXT NOT NULL,
        definition_json TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'published',
        favorite INTEGER NOT NULL DEFAULT 0,
        use_count INTEGER NOT NULL DEFAULT 0,
        last_used_at TEXT,
        source_path TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (id, version)
      );
      CREATE INDEX IF NOT EXISTS idx_tools_status ON tools(status, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_tools_favorite ON tools(favorite DESC, name);

      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        tool_id TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        tool_version TEXT NOT NULL,
        origin TEXT NOT NULL,
        status TEXT NOT NULL,
        inputs_json TEXT,
        outputs_json TEXT,
        error_json TEXT,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_runs_created ON runs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_runs_tool ON runs(tool_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS drafts (
        id TEXT PRIMARY KEY,
        tool_id TEXT NOT NULL,
        name TEXT NOT NULL,
        definition_json TEXT NOT NULL,
        status TEXT NOT NULL,
        test_report_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_drafts_updated ON drafts(updated_at DESC);

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS events (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tool_deletions (
        tool_id TEXT PRIMARY KEY,
        deleted_at TEXT NOT NULL
      );
    `);
  }

  seedSettings() {
    const statement = this.db.prepare('INSERT OR IGNORE INTO settings (key, value_json, updated_at) VALUES (?, ?, ?)');
    const now = new Date().toISOString();
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) statement.run(key, JSON.stringify(value), now);
  }

  now() {
    return new Date().toISOString();
  }

  upsertTool(definition, sourcePath = null) {
    const now = this.now();
    const meta = definition.metadata;
    this.db.prepare(`
      INSERT INTO tools (id, version, name, summary, category, definition_json, status, favorite, use_count, source_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'published', 0, 0, ?, ?, ?)
      ON CONFLICT(id, version) DO UPDATE SET
        name = excluded.name,
        summary = excluded.summary,
        category = excluded.category,
        definition_json = excluded.definition_json,
        source_path = excluded.source_path,
        updated_at = excluded.updated_at
    `).run(meta.id, meta.version, meta.name, meta.summary, meta.category, JSON.stringify(definition), sourcePath, now, now);
  }

  listTools() {
    return this.db.prepare(`
      SELECT t.* FROM tools t
      JOIN (SELECT id, MAX(updated_at) AS latest FROM tools WHERE status = 'published' GROUP BY id) x
        ON t.id = x.id AND t.updated_at = x.latest
      WHERE t.status = 'published'
        AND NOT EXISTS (SELECT 1 FROM tool_deletions d WHERE d.tool_id = t.id)
      ORDER BY t.favorite DESC, t.use_count DESC, t.updated_at DESC
    `).all().map((row) => this.toolFromRow(row));
  }

  listToolVersions(id) {
    return this.db.prepare('SELECT * FROM tools WHERE id = ? ORDER BY updated_at DESC').all(id).map((row) => this.toolFromRow(row));
  }

  getTool(id, version = null) {
    if (this.db.prepare('SELECT 1 FROM tool_deletions WHERE tool_id = ?').get(id)) return null;
    const row = version
      ? this.db.prepare('SELECT * FROM tools WHERE id = ? AND version = ? AND status = ?').get(id, version, 'published')
      : this.db.prepare('SELECT * FROM tools WHERE id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1').get(id, 'published');
    return row ? this.toolFromRow(row) : null;
  }

  deleteTool(id) {
    this.db.prepare(`
      INSERT INTO tool_deletions (tool_id, deleted_at) VALUES (?, ?)
      ON CONFLICT(tool_id) DO UPDATE SET deleted_at = excluded.deleted_at
    `).run(id, this.now());
    return true;
  }

  restoreTool(id) {
    this.db.prepare('DELETE FROM tool_deletions WHERE tool_id = ?').run(id);
  }

  toolFromRow(row) {
    return {
      id: row.id,
      version: row.version,
      name: row.name,
      summary: row.summary,
      category: row.category,
      definition: JSON.parse(row.definition_json),
      status: row.status,
      favorite: Boolean(row.favorite),
      useCount: row.use_count,
      lastUsedAt: row.last_used_at,
      sourcePath: row.source_path,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  setFavorite(id, favorite) {
    const versions = this.listToolVersions(id);
    if (!versions.length) return false;
    this.db.prepare('UPDATE tools SET favorite = ?, updated_at = updated_at WHERE id = ?').run(favorite ? 1 : 0, id);
    return true;
  }

  markUsed(id) {
    const latest = this.getTool(id);
    if (!latest) return;
    this.db.prepare('UPDATE tools SET use_count = use_count + 1, last_used_at = ? WHERE id = ? AND version = ?').run(this.now(), id, latest.version);
  }

  insertRun(run) {
    this.db.prepare(`
      INSERT INTO runs (id, tool_id, tool_name, tool_version, origin, status, inputs_json, outputs_json, error_json, duration_ms, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      run.id, run.toolId, run.toolName, run.toolVersion, run.origin, run.status,
      run.inputs === undefined ? null : JSON.stringify(run.inputs),
      run.outputs === undefined ? null : JSON.stringify(run.outputs),
      run.error === undefined ? null : JSON.stringify(run.error),
      run.durationMs, run.createdAt
    );
  }

  listRuns({ limit = 50, toolId = null } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const rows = toolId
      ? this.db.prepare('SELECT * FROM runs WHERE tool_id = ? ORDER BY created_at DESC LIMIT ?').all(toolId, safeLimit)
      : this.db.prepare('SELECT * FROM runs ORDER BY created_at DESC LIMIT ?').all(safeLimit);
    return rows.map((row) => ({
      id: row.id,
      toolId: row.tool_id,
      toolName: row.tool_name,
      toolVersion: row.tool_version,
      origin: row.origin,
      status: row.status,
      inputs: row.inputs_json ? JSON.parse(row.inputs_json) : null,
      outputs: row.outputs_json ? JSON.parse(row.outputs_json) : null,
      error: row.error_json ? JSON.parse(row.error_json) : null,
      durationMs: row.duration_ms,
      createdAt: row.created_at
    }));
  }

  clearRuns() {
    this.db.exec('DELETE FROM runs');
  }

  insertDraft(draft) {
    const now = this.now();
    this.db.prepare(`
      INSERT INTO drafts (id, tool_id, name, definition_json, status, test_report_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(draft.id, draft.toolId, draft.name, JSON.stringify(draft.definition), draft.status, draft.testReport ? JSON.stringify(draft.testReport) : null, now, now);
  }

  updateDraft(id, { status, testReport }) {
    this.db.prepare('UPDATE drafts SET status = ?, test_report_json = ?, updated_at = ? WHERE id = ?').run(
      status,
      testReport ? JSON.stringify(testReport) : null,
      this.now(),
      id
    );
  }

  getDraft(id) {
    const row = this.db.prepare('SELECT * FROM drafts WHERE id = ?').get(id);
    if (!row) return null;
    return {
      id: row.id,
      toolId: row.tool_id,
      name: row.name,
      definition: JSON.parse(row.definition_json),
      status: row.status,
      testReport: row.test_report_json ? JSON.parse(row.test_report_json) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  listDrafts() {
    return this.db.prepare('SELECT * FROM drafts ORDER BY updated_at DESC').all().map((row) => ({
      id: row.id,
      toolId: row.tool_id,
      name: row.name,
      definition: JSON.parse(row.definition_json),
      status: row.status,
      testReport: row.test_report_json ? JSON.parse(row.test_report_json) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  deleteDraft(id) {
    return this.db.prepare('DELETE FROM drafts WHERE id = ?').run(id).changes > 0;
  }

  getSettings() {
    const rows = this.db.prepare('SELECT key, value_json FROM settings').all();
    const settings = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value_json);
      } catch {
        // ignore malformed setting
      }
    }
    return settings;
  }

  updateSettings(patch) {
    const allowed = new Set(Object.keys(DEFAULT_SETTINGS));
    const statement = this.db.prepare(`
      INSERT INTO settings (key, value_json, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
    `);
    const now = this.now();
    for (const [key, value] of Object.entries(patch ?? {})) {
      if (!allowed.has(key)) continue;
      statement.run(key, JSON.stringify(value), now);
    }
    return this.getSettings();
  }

  emit(type, payload) {
    const result = this.db.prepare('INSERT INTO events (type, payload_json, created_at) VALUES (?, ?, ?)').run(type, JSON.stringify(payload), this.now());
    this.db.prepare('DELETE FROM events WHERE seq < ?').run(Number(result.lastInsertRowid) - 500);
    return Number(result.lastInsertRowid);
  }

  eventsAfter(seq = 0, limit = 50) {
    return this.db.prepare('SELECT * FROM events WHERE seq > ? ORDER BY seq ASC LIMIT ?').all(Number(seq) || 0, Math.min(Number(limit) || 50, 200)).map((row) => ({
      seq: row.seq,
      type: row.type,
      payload: JSON.parse(row.payload_json),
      createdAt: row.created_at
    }));
  }

  stats() {
    const tools = this.db.prepare(`
      SELECT COUNT(DISTINCT t.id) AS count FROM tools t
      WHERE t.status = 'published'
        AND NOT EXISTS (SELECT 1 FROM tool_deletions d WHERE d.tool_id = t.id)
    `).get();
    const runs = this.db.prepare('SELECT COUNT(*) AS count FROM runs').get();
    const drafts = this.db.prepare('SELECT COUNT(*) AS count FROM drafts').get();
    const lastRun = this.db.prepare('SELECT created_at FROM runs ORDER BY created_at DESC LIMIT 1').get();
    return { tools: tools.count, runs: runs.count, drafts: drafts.count, lastRunAt: lastRun?.created_at ?? null };
  }

  close() {
    this.db.close();
  }
}
