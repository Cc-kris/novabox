import fs from 'node:fs';
import path from 'node:path';
import { validateDefinition } from './definition.mjs';
import { TOOLS_DIR } from './paths.mjs';

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(fullPath));
    else if (entry.isFile() && entry.name === 'tool.json') result.push(fullPath);
  }
  return result;
}

export function loadToolPackages(root = TOOLS_DIR) {
  const tools = [];
  const warnings = [];
  for (const filePath of walk(root)) {
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      warnings.push({ file: path.relative(root, filePath), error: `JSON 解析失败：${error.message}` });
      continue;
    }
    const validation = validateDefinition(parsed);
    if (!validation.ok) {
      warnings.push({ file: path.relative(root, filePath), error: validation.errors.join('；') });
      continue;
    }
    tools.push({ definition: parsed, sourcePath: filePath });
  }
  return { tools, warnings };
}

export function readToolFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}
