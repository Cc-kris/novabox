#!/usr/bin/env node
import readline from 'node:readline';
import { NovaboxService, ServiceError } from './src/core/service.mjs';

const VERSION = '1.1.0';
const PROTOCOL_VERSION = '2025-06-18';
const service = new NovaboxService();

const TOOL_DEFS = [
  {
    name: 'novabox.search_tools',
    description: 'Search published Novabox tools by capability, keyword or category. Call this first when the user asks to calculate or transform data and a reusable tool may exist.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Capability or keywords, in the user’s language' },
        category: { type: 'string', description: 'Optional exact category' },
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 }
      }
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  {
    name: 'novabox.list_tools',
    description: 'List all published Novabox tools with versions and input summaries.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string' },
        favoritesOnly: { type: 'boolean', default: false }
      }
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  {
    name: 'novabox.get_tool',
    description: 'Read one tool definition, including its exact input JSON Schema, outputs, permissions and test summary. Read before running when inputs are ambiguous.',
    inputSchema: {
      type: 'object',
      properties: { tool_id: { type: 'string' } },
      required: ['tool_id']
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  {
    name: 'novabox.run_tool',
    description: 'Run a published Novabox tool with validated inputs. The result is deterministic and runs locally. The Novabox UI opens automatically with inputs and results when enabled.',
    inputSchema: {
      type: 'object',
      properties: {
        tool_id: { type: 'string' },
        inputs: { type: 'object', additionalProperties: true }
      },
      required: ['tool_id', 'inputs']
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  {
    name: 'novabox.create_draft',
    description: 'Create a draft tool from a novabox/v1 constrained definition. Drafts never execute until validated and published.',
    inputSchema: {
      type: 'object',
      properties: {
        definition: { type: 'object', additionalProperties: true }
      },
      required: ['definition']
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
  },
  {
    name: 'novabox.validate_draft',
    description: 'Run static validation and every declared test for a draft. Returns exact mismatch details.',
    inputSchema: {
      type: 'object',
      properties: { draft_id: { type: 'string' } },
      required: ['draft_id']
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  {
    name: 'novabox.publish_tool',
    description: 'Publish a validated draft after re-running tests. Published versions are immutable; publish a higher version for changes.',
    inputSchema: {
      type: 'object',
      properties: { draft_id: { type: 'string' } },
      required: ['draft_id']
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
  },
  {
    name: 'novabox.open_tool',
    description: 'Open a tool page in the Novabox UI with optional prefilled inputs, without running it.',
    inputSchema: {
      type: 'object',
      properties: {
        tool_id: { type: 'string' },
        inputs: { type: 'object', additionalProperties: true }
      },
      required: ['tool_id']
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  }
];

function rpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function rpcError(id, code, message, data) {
  return { jsonrpc: '2.0', id, error: { code, message, ...(data ? { data } : {}) } };
}

function toolResult(data, { isError = false } = {}) {
  return {
    content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }],
    structuredContent: typeof data === 'object' && data !== null ? data : { value: data },
    isError
  };
}

async function postLocal(pathname, body) {
  let res;
  try {
    res = await fetch(`http://127.0.0.1:${process.env.NOVABOX_PORT || 8787}${pathname}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000)
    });
  } catch {
    return null;
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* keep null */ }
  if (!res.ok) {
    const error = data?.error ?? {};
    throw new ServiceError(error.message || `Novabox HTTP ${res.status}`, {
      status: res.status,
      code: error.code || 'HTTP_ERROR',
      details: error.details
    });
  }
  return data;
}

async function callTool(name, args = {}) {
  switch (name) {
    case 'novabox.search_tools': {
      const result = service.listTools({ query: args.query ?? '', category: args.category ?? 'all' });
      const limit = Math.max(1, Math.min(Number(args.limit) || 10, 50));
      return {
        tools: result.tools.slice(0, limit).map((tool) => ({
          id: tool.id,
          name: tool.name,
          version: tool.version,
          summary: tool.summary,
          category: tool.category,
          inputCount: tool.inputCount
        })),
        total: result.total,
        hint: result.total === 0 ? 'No matching tool. Do not fabricate a result. Consider creating a draft or asking the user.' : 'Call novabox.get_tool to read the input schema, then novabox.run_tool.'
      };
    }
    case 'novabox.list_tools': {
      const result = service.listTools({ category: args.category ?? 'all', favoritesOnly: Boolean(args.favoritesOnly) });
      return { tools: result.tools, categories: result.categories, total: result.total };
    }
    case 'novabox.get_tool': {
      const tool = service.getTool(args.tool_id);
      return {
        id: tool.id,
        version: tool.version,
        name: tool.name,
        summary: tool.summary,
        inputSchema: tool.definition.inputs.schema,
        outputMapping: tool.definition.outputs.mapping,
        permissions: tool.permissions,
        tests: tool.tests.map((test) => ({ name: test.name })),
        exampleInputs: tool.tests[0]?.inputs ?? null,
        source: tool.source
      };
    }
    case 'novabox.run_tool': {
      const viaHttp = await postLocal(`/api/tools/${encodeURIComponent(args.tool_id)}/run`, {
        inputs: args.inputs ?? {},
        origin: 'mcp'
      });
      const result = viaHttp ?? service.runTool(args.tool_id, args.inputs ?? {}, { origin: 'mcp' });
      return {
        runId: result.run.id,
        toolId: result.run.toolId,
        toolName: result.run.toolName,
        outputs: result.run.outputs,
        durationMs: result.run.durationMs,
        createdAt: result.run.createdAt
      };
    }
    case 'novabox.create_draft': {
      const draft = service.createDraft(args.definition);
      return {
        draftId: draft.id,
        toolId: draft.toolId,
        name: draft.name,
        status: draft.status,
        next: `Call novabox.validate_draft with draft_id=${draft.id}`
      };
    }
    case 'novabox.validate_draft': {
      const draft = service.validateDraft(args.draft_id);
      return {
        draftId: draft.id,
        status: draft.status,
        passed: draft.testReport?.passed ?? 0,
        total: draft.testReport?.total ?? 0,
        ok: Boolean(draft.testReport?.ok),
        staticErrors: draft.testReport?.staticErrors ?? [],
        results: draft.testReport?.results ?? []
      };
    }
    case 'novabox.publish_tool': {
      const result = service.publishDraft(args.draft_id);
      return {
        published: true,
        tool: { id: result.tool.id, name: result.tool.name, version: result.tool.version },
        tests: { passed: result.tests.passed, total: result.tests.total }
      };
    }
    case 'novabox.open_tool': {
      const viaHttp = await postLocal('/api/system/open-tool', {
        tool_id: args.tool_id,
        inputs: args.inputs ?? null
      });
      return viaHttp ?? service.openTool(args.tool_id, args.inputs ?? null);
    }
    default:
      throw new ServiceError(`Unknown tool: ${name}`, { status: 404, code: 'TOOL_NOT_FOUND' });
  }
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

async function handle(message) {
  const { id, method, params } = message;
  const isNotification = id === undefined || id === null;

  if (method === 'initialize') {
    if (isNotification) return;
    send(rpcResult(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'novabox', title: 'Novabox', version: VERSION },
      instructions: 'Novabox is a local, deterministic toolbox. Flow: search_tools → get_tool → run_tool. Never invent a tool or result. If no tool matches, say so and create a constrained draft only when the user asks. Published tools run locally with no network, filesystem, shell or side effects.'
    }));
    return;
  }

  if (method === 'notifications/initialized' || method === 'notifications/cancelled') return;

  if (method === 'ping') {
    if (!isNotification) send(rpcResult(id, {}));
    return;
  }

  if (method === 'tools/list') {
    if (!isNotification) send(rpcResult(id, { tools: TOOL_DEFS }));
    return;
  }

  if (method === 'tools/call') {
    if (isNotification) return;
    const name = params?.name;
    const args = params?.arguments ?? {};
    try {
      const data = await callTool(name, args);
      send(rpcResult(id, toolResult(data)));
    } catch (error) {
      const messageText = error instanceof ServiceError ? error.message : (error?.message ?? String(error));
      console.error(`[novabox-mcp] ${name} failed:`, messageText);
      send(rpcResult(id, toolResult({ error: messageText, code: error.code ?? 'MCP_TOOL_ERROR', details: error.details ?? null }, { isError: true })));
    }
    return;
  }

  if (method === 'resources/list') {
    if (!isNotification) send(rpcResult(id, { resources: [] }));
    return;
  }

  if (method === 'prompts/list') {
    if (!isNotification) send(rpcResult(id, { prompts: [] }));
    return;
  }

  if (!isNotification) send(rpcError(id, -32601, `Method not found: ${method}`));
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
let chain = Promise.resolve();
rl.on('line', (line) => {
  const text = line.trim();
  if (!text) return;
  chain = chain.then(() => {
    let message;
    try {
      message = JSON.parse(text);
    } catch {
      send(rpcError(null, -32700, 'Parse error'));
      return;
    }
    if (Array.isArray(message)) {
      for (const item of message) handle(item);
      return;
    }
    handle(message);
  }).catch((error) => {
    console.error('[novabox-mcp] fatal handler error', error);
  });
});

rl.on('close', () => {
  service.close();
  process.exit(0);
});

console.error(`[novabox-mcp] ready; ${service.store.stats().tools} tools available`);
