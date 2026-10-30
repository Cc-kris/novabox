import { evaluateExpression } from './expr.mjs';
import { TRANSFORMS } from './transforms.mjs';

const MAX_STEPS = 300;
const MAX_LOOP_ITEMS = 500;

function getPath(root, path) {
  const parts = String(path).split('.').filter(Boolean);
  let current = root;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

export function resolveValue(value, context) {
  if (typeof value === 'string') {
    const exact = value.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
    if (exact) return getPath(context, exact[1]);
    return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, path) => {
      const resolved = getPath(context, path);
      if (resolved === null || resolved === undefined) return '';
      return typeof resolved === 'object' ? JSON.stringify(resolved) : String(resolved);
    });
  }
  if (Array.isArray(value)) return value.map((item) => resolveValue(item, context));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveValue(item, context)]));
  }
  return value;
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

export class ExecutionError extends Error {
  constructor(message, stepIndex) {
    super(message);
    this.name = 'ExecutionError';
    this.stepIndex = stepIndex;
  }
}

export function executeDefinition(definition, inputValues, options = {}) {
  const context = { input: inputValues, vars: {} };
  const trace = [];
  let stepBudget = MAX_STEPS;

  const runSteps = (steps, loopItem) => {
    for (let index = 0; index < steps.length; index += 1) {
      stepBudget -= 1;
      if (stepBudget < 0) throw new ExecutionError('执行步骤超过安全上限');
      const step = steps[index];
      if (!step || typeof step !== 'object') throw new ExecutionError('步骤格式无效', index);
      if (typeof step.var !== 'string' || !IDENTIFIER.test(step.var)) throw new ExecutionError('变量名无效', index);
      const stepContext = loopItem === undefined ? context : { ...context, item: loopItem, index: options.__loopIndex ?? 0 };
      try {
        if (step.type === 'set') {
          context.vars[step.var] = resolveValue(step.value, stepContext);
        } else if (step.type === 'template') {
          context.vars[step.var] = resolveValue(step.template, stepContext);
        } else if (step.type === 'calculate') {
          const result = evaluateExpression(step.expression, {
            input: context.input,
            vars: context.vars,
            item: stepContext.item,
            index: stepContext.index
          });
          context.vars[step.var] = result;
        } else if (step.type === 'transform') {
          const args = resolveValue(step.args ?? {}, stepContext);
          const transform = TRANSFORMS[step.op];
          if (!transform) throw new ExecutionError(`未知转换 ${step.op}`, index);
          context.vars[step.var] = transform(args);
        } else if (step.type === 'switch') {
          let matched = false;
          for (const branch of step.cases ?? []) {
            const condition = evaluateExpression(branch.when, {
              input: context.input,
              vars: context.vars,
              item: stepContext.item,
              index: stepContext.index
            });
            if (condition) {
              runSteps(branch.steps, loopItem);
              matched = true;
              break;
            }
          }
          if (!matched && Array.isArray(step.else)) runSteps(step.else, loopItem);
        } else {
          throw new ExecutionError(`未知步骤类型 ${step.type}`, index);
        }
        trace.push({ index, type: step.type, var: step.var, ok: true });
      } catch (error) {
        trace.push({ index, type: step.type, var: step.var, ok: false, error: error.message });
        throw new ExecutionError(`第 ${index + 1} 步（${step.var}）失败：${error.message}`, index);
      }
    }
  };

  runSteps(definition.execution.steps);
  const outputs = resolveValue(definition.outputs.mapping, context);
  return { outputs, trace, vars: options.includeVars ? context.vars : undefined };
}

export function runTests(definition, execute = executeDefinition) {
  const results = [];
  for (const test of definition.tests ?? []) {
    const started = Date.now();
    try {
      const result = execute(definition, test.inputs, { includeVars: false });
      const mismatches = [];
      for (const [key, expected] of Object.entries(test.expect ?? {})) {
        const actual = result.outputs?.[key];
        if (JSON.stringify(actual) !== JSON.stringify(expected)) mismatches.push({ key, expected, actual });
      }
      results.push({ name: test.name, ok: mismatches.length === 0, durationMs: Date.now() - started, mismatches, outputs: result.outputs });
    } catch (error) {
      results.push({ name: test.name, ok: false, durationMs: Date.now() - started, error: error.message });
    }
  }
  return { ok: results.every((result) => result.ok), passed: results.filter((result) => result.ok).length, total: results.length, results };
}

export const __test = { getPath, MAX_STEPS, MAX_LOOP_ITEMS };
