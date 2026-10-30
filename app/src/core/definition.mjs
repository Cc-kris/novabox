import { validateSchema } from './schema.mjs';
import { TRANSFORM_NAMES } from './transforms.mjs';

const STEP_TYPES = new Set(['set', 'calculate', 'transform', 'switch', 'template']);

export class DefinitionError extends Error {
  constructor(errors) {
    super(errors.join('；'));
    this.name = 'DefinitionError';
    this.errors = errors;
  }
}

function checkTemplateStrings(step, errors, path) {
  if (typeof step === 'string') {
    const matches = step.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g);
    for (const match of matches) {
      if (!/^(input|vars)\.[A-Za-z_][A-Za-z0-9_.]*$|^(input|vars)$/.test(match[1])) {
        errors.push(`${path} 中的模板变量 {{${match[1]}}} 无效`);
      }
    }
    return;
  }
  if (Array.isArray(step)) {
    step.forEach((item, index) => checkTemplateStrings(item, errors, `${path}[${index}]`));
    return;
  }
  if (step && typeof step === 'object') {
    for (const [key, value] of Object.entries(step)) checkTemplateStrings(value, errors, `${path}.${key}`);
  }
}

function validateSteps(steps, errors, path = 'execution.steps') {
  if (!Array.isArray(steps) || steps.length === 0) {
    errors.push('execution.steps 必须是非空数组');
    return;
  }
  if (steps.length > 60) errors.push('execution.steps 最多 60 步');
  steps.forEach((step, index) => {
    const at = `${path}[${index}]`;
    if (!step || typeof step !== 'object' || Array.isArray(step)) {
      errors.push(`${at} 必须是对象`);
      return;
    }
    if (!STEP_TYPES.has(step.type)) {
      errors.push(`${at}.type 不受支持：${step.type}`);
      return;
    }
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(step.var ?? '')) errors.push(`${at}.var 无效`);
    checkTemplateStrings(step, errors, at);
    if (step.type === 'transform' && !TRANSFORM_NAMES.includes(step.op)) {
      errors.push(`${at}.op 不受支持：${step.op}`);
    }
    if (step.type === 'calculate' && (typeof step.expression !== 'string' || !step.expression.trim())) {
      errors.push(`${at}.expression 不能为空`);
    }
    if (step.type === 'switch') {
      if (!Array.isArray(step.cases) || step.cases.length === 0) errors.push(`${at}.cases 必须是非空数组`);
      for (const [caseIndex, branch] of (step.cases ?? []).entries()) {
        if (typeof branch.when !== 'string' || !branch.when.trim()) errors.push(`${at}.cases[${caseIndex}].when 不能为空`);
        validateSteps(branch.steps, errors, `${at}.cases[${caseIndex}].steps`);
      }
      if (step.else) validateSteps(step.else, errors, `${at}.else`);
    }
  });
}

export function validateDefinition(definition) {
  const errors = [];
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
    return { ok: false, errors: ['定义必须是 JSON 对象'] };
  }
  if (definition.apiVersion !== 'novabox/v1') errors.push('apiVersion 必须是 novabox/v1');
  const meta = definition.metadata;
  if (!meta || typeof meta !== 'object') errors.push('缺少 metadata');
  else {
    if (!/^[a-z][a-z0-9-]{2,63}$/.test(meta.id ?? '')) errors.push('metadata.id 需为 3-64 位小写字母、数字和连字符');
    if (typeof meta.name !== 'string' || !meta.name.trim() || meta.name.length > 40) errors.push('metadata.name 需为 1-40 个字符');
    if (!/^\d+\.\d+\.\d+$/.test(meta.version ?? '')) errors.push('metadata.version 必须是 semver，例如 1.0.0');
    if (typeof meta.summary !== 'string' || !meta.summary.trim() || meta.summary.length > 160) errors.push('metadata.summary 需为 1-160 个字符');
    if (!meta.category) errors.push('metadata.category 不能为空');
    if (meta.source && !['builtin', 'mcp', 'ai-draft', 'user'].includes(meta.source)) errors.push('metadata.source 无效');
  }

  const schemaCheck = validateSchema(definition.inputs?.schema);
  if (!schemaCheck.ok) errors.push(...schemaCheck.errors);
  validateSteps(definition.execution?.steps, errors);

  if (!definition.outputs || typeof definition.outputs.mapping !== 'object' || definition.outputs.mapping === null) {
    errors.push('outputs.mapping 必须是对象');
  } else {
    checkTemplateStrings(definition.outputs.mapping, errors, 'outputs.mapping');
  }

  const permissions = definition.permissions ?? {};
  for (const key of ['network', 'filesystem', 'shell', 'sideEffects']) {
    if (permissions[key] === true) errors.push(`权限 ${key} 在 V1 中不允许开启`);
  }

  if (!Array.isArray(definition.tests) || definition.tests.length < 1) {
    errors.push('至少需要 1 条测试');
  } else {
    if (definition.tests.length > 20) errors.push('测试最多 20 条');
    definition.tests.forEach((test, index) => {
      if (!test.name || typeof test.name !== 'string') errors.push(`tests[${index}].name 不能为空`);
      if (!test.inputs || typeof test.inputs !== 'object') errors.push(`tests[${index}].inputs 必须是对象`);
      if (!test.expect || typeof test.expect !== 'object') errors.push(`tests[${index}].expect 必须是对象`);
    });
  }

  return { ok: errors.length === 0, errors };
}

export function assertValidDefinition(definition) {
  const result = validateDefinition(definition);
  if (!result.ok) throw new DefinitionError(result.errors);
  return result;
}

export { STEP_TYPES };
