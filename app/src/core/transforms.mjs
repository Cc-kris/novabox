const MAX_TEXT = 200000;

function asText(value, label = '输入') {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (text.length > MAX_TEXT) throw new Error(`${label}超过 ${MAX_TEXT} 字符上限`);
  return text;
}

function linesOf(text) {
  return text.replace(/\r\n?/g, '\n').split('\n');
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function objectsToCsv(rows) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('JSON 需要是非空对象数组');
  const keys = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('数组每一项都必须是对象');
    for (const key of Object.keys(row)) if (!keys.includes(key)) keys.push(key);
  }
  return [keys.map(csvCell).join(','), ...rows.map((row) => keys.map((key) => csvCell(row[key])).join(','))].join('\n');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0];
  return rows.slice(1).filter((items) => items.some((item) => item !== '')).map((items) => Object.fromEntries(headers.map((header, index) => [header, items[index] ?? ''])));
}

const LENGTH_UNITS = {
  m: { label: '米', factor: 1 },
  km: { label: '千米', factor: 1000 },
  cm: { label: '厘米', factor: 0.01 },
  mm: { label: '毫米', factor: 0.001 },
  mi: { label: '英里', factor: 1609.344 },
  ft: { label: '英尺', factor: 0.3048 },
  in: { label: '英寸', factor: 0.0254 }
};

const WEIGHT_UNITS = {
  kg: { label: '千克', factor: 1 },
  g: { label: '克', factor: 0.001 },
  t: { label: '吨', factor: 1000 },
  lb: { label: '磅', factor: 0.45359237 },
  oz: { label: '盎司', factor: 0.028349523125 }
};

const TEMP_LABELS = { C: '摄氏度', F: '华氏度', K: '开尔文' };

function convertTemperature(value, from, to) {
  let celsius;
  if (from === 'C') celsius = value;
  else if (from === 'F') celsius = (value - 32) * (5 / 9);
  else if (from === 'K') celsius = value - 273.15;
  else throw new Error(`不支持的温度单位 ${from}`);
  if (to === 'C') return celsius;
  if (to === 'F') return celsius * (9 / 5) + 32;
  if (to === 'K') return celsius + 273.15;
  throw new Error(`不支持的温度单位 ${to}`);
}

const CURRENCY_AS_OF = '2026-10-29';
// Offline reference snapshot: CNY per one unit. Not a live quote.
const CURRENCY_RATES_TO_CNY = {
  CNY: 1,
  USD: 7.08,
  EUR: 8.18,
  JPY: 0.0472,
  GBP: 9.42,
  HKD: 0.908,
  KRW: 0.00521,
  AUD: 4.66,
  CAD: 5.12,
  SGD: 5.43,
  CHF: 8.79,
  TWD: 0.226
};

function formatNumber(value) {
  if (!Number.isFinite(value)) return String(value);
  return Number(value.toFixed(10)).toLocaleString('zh-CN', { maximumFractionDigits: 10 });
}

export const TRANSFORMS = {
  dedupe_lines(args) {
    const lines = linesOf(asText(args.text));
    const seen = new Set();
    const result = [];
    let duplicates = 0;
    for (const line of lines) {
      if (seen.has(line)) {
        duplicates += 1;
        continue;
      }
      seen.add(line);
      result.push(line);
    }
    return {
      text: result.join('\n'),
      inputLines: lines.length,
      outputLines: result.length,
      duplicates
    };
  },

  remove_empty(args) {
    const lines = linesOf(asText(args.text));
    const result = lines.filter((line) => line.trim() !== '');
    return { text: result.join('\n'), inputLines: lines.length, outputLines: result.length, removed: lines.length - result.length };
  },

  sort_lines(args) {
    const lines = linesOf(asText(args.text));
    const direction = args.direction === 'desc' ? -1 : 1;
    const sorted = [...lines].sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true, sensitivity: 'base' }) * direction);
    return { text: sorted.join('\n'), inputLines: lines.length, outputLines: sorted.length };
  },

  count_text(args) {
    const text = asText(args.text);
    const compact = text.replace(/\s/g, '');
    return {
      characters: text.length,
      charactersNoSpace: compact.length,
      lines: text === '' ? 0 : linesOf(text).length,
      words: (text.match(/[A-Za-z0-9_]+/g) ?? []).length,
      chinese: (text.match(/[\u3400-\u9fff]/g) ?? []).length
    };
  },

  json_convert(args) {
    const raw = asText(args.text, 'JSON 文本');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error(`JSON 解析失败：${error.message}`);
    }
    const mode = args.mode ?? 'pretty';
    if (mode === 'minify') return { text: JSON.stringify(parsed), kind: 'JSON' };
    if (mode === 'pretty') return { text: JSON.stringify(parsed, null, 2), kind: 'JSON' };
    if (mode === 'json_to_csv') return { text: objectsToCsv(parsed), kind: 'CSV' };
    if (mode === 'csv_to_json') {
      // `text` is parsed as JSON first for this mode, so use a dedicated path below.
      throw new Error('csv_to_json 模式请使用 CSV 转 JSON 工具');
    }
    throw new Error(`不支持的转换模式 ${mode}`);
  },

  csv_to_json(args) {
    const text = asText(args.text, 'CSV 文本');
    const rows = parseCsv(text);
    return { text: JSON.stringify(rows, null, 2), kind: 'JSON', rows: rows.length };
  },

  currency_convert(args) {
    const amount = Number(args.amount);
    if (!Number.isFinite(amount)) throw new Error('待换算金额无效');
    const from = String(args.from ?? 'CNY').toUpperCase();
    const to = String(args.to ?? 'USD').toUpperCase();
    if (!CURRENCY_RATES_TO_CNY[from] || !CURRENCY_RATES_TO_CNY[to]) throw new Error('币种不受支持');
    const rate = CURRENCY_RATES_TO_CNY[from] / CURRENCY_RATES_TO_CNY[to];
    const converted = amount * rate;
    return {
      value: converted,
      formatted: formatNumber(converted),
      expression: `${formatNumber(amount)} ${from} = ${formatNumber(converted)} ${to}`,
      rate: formatNumber(rate),
      details: `参考快照 ${CURRENCY_AS_OF}：1 ${from} = ${formatNumber(rate)} ${to}。这是离线静态参考值，实际成交价以银行或支付平台为准。`
    };
  },

  unit_convert(args) {
    const value = Number(args.value);
    if (!Number.isFinite(value)) throw new Error('待换算数值无效');
    const category = args.category;
    const from = String(args.from ?? '').toLowerCase();
    const to = String(args.to ?? '').toLowerCase();
    let converted;
    let fromLabel;
    let toLabel;
    let kind;
    if (category === 'length') {
      if (!LENGTH_UNITS[from] || !LENGTH_UNITS[to]) throw new Error('长度单位不受支持');
      converted = (value * LENGTH_UNITS[from].factor) / LENGTH_UNITS[to].factor;
      fromLabel = LENGTH_UNITS[from].label;
      toLabel = LENGTH_UNITS[to].label;
      kind = '长度';
    } else if (category === 'weight') {
      if (!WEIGHT_UNITS[from] || !WEIGHT_UNITS[to]) throw new Error('重量单位不受支持');
      converted = (value * WEIGHT_UNITS[from].factor) / WEIGHT_UNITS[to].factor;
      fromLabel = WEIGHT_UNITS[from].label;
      toLabel = WEIGHT_UNITS[to].label;
      kind = '重量';
    } else if (category === 'temperature') {
      const upperFrom = from.toUpperCase();
      const upperTo = to.toUpperCase();
      if (!TEMP_LABELS[upperFrom] || !TEMP_LABELS[upperTo]) throw new Error('温度单位不受支持');
      converted = convertTemperature(value, upperFrom, upperTo);
      fromLabel = TEMP_LABELS[upperFrom];
      toLabel = TEMP_LABELS[upperTo];
      kind = '温度';
    } else {
      throw new Error('不支持的换算类别');
    }
    return {
      value: converted,
      formatted: formatNumber(converted),
      expression: `${formatNumber(value)} ${fromLabel} = ${formatNumber(converted)} ${toLabel}`,
      category: kind
    };
  },

  regex_test(args) {
    const text = asText(args.text, '待匹配文本');
    if (text.length > 50000) throw new Error('正则测试文本上限为 50000 字符');
    const pattern = asText(args.pattern, '正则表达式');
    if (!pattern || pattern.length > 300) throw new Error('正则表达式不能为空且不能超过 300 字符');
    let flags = String(args.flags ?? 'g').replace(/[^gimsu]/g, '');
    if (!flags.includes('g')) flags += 'g';
    let regex;
    try {
      regex = new RegExp(pattern, flags);
    } catch (error) {
      throw new Error(`正则表达式无效：${error.message}`);
    }
    const matches = [];
    for (const match of text.matchAll(regex)) {
      matches.push({
        value: match[0],
        index: match.index,
        groups: match.slice(1).filter((item) => item !== undefined)
      });
      if (matches.length >= 100) break;
    }
    return {
      count: matches.length,
      truncated: matches.length >= 100,
      matches,
      preview: matches.length
        ? matches.map((match) => `${match.index}: ${match.value}`).join('\n')
        : '没有匹配项'
    };
  },

  timestamp_convert(args) {
    const raw = asText(args.value, '时间值').trim();
    if (!raw) throw new Error('请输入时间值');
    let date;
    if (/^\d{10}$/.test(raw)) date = new Date(Number(raw) * 1000);
    else if (/^\d{13}$/.test(raw)) date = new Date(Number(raw));
    else date = new Date(raw);
    if (Number.isNaN(date.getTime())) throw new Error('无法识别该时间，请使用时间戳或常见日期格式');
    const timeZone = args.timezone === 'UTC' ? 'UTC' : 'Asia/Shanghai';
    return {
      iso: date.toISOString(),
      local: new Intl.DateTimeFormat('zh-CN', { timeZone, dateStyle: 'full', timeStyle: 'medium', hour12: false }).format(date),
      epochSeconds: Math.floor(date.getTime() / 1000),
      epochMilliseconds: date.getTime(),
      weekday: new Intl.DateTimeFormat('zh-CN', { timeZone, weekday: 'long' }).format(date),
      timezone: timeZone
    };
  },

  base64_convert(args) {
    const value = asText(args.text, '文本');
    const mode = args.mode ?? 'encode';
    try {
      if (mode === 'decode') {
        const decoded = Buffer.from(value.replace(/\s/g, ''), 'base64').toString('utf8');
        const normalized = Buffer.from(decoded, 'utf8').toString('base64');
        if (normalized.replace(/=+$/, '') !== value.replace(/\s/g, '').replace(/=+$/, '')) throw new Error('输入不是有效的 Base64');
        return { text: decoded, mode: '已解码', bytes: Buffer.byteLength(decoded, 'utf8') };
      }
      const encoded = Buffer.from(value, 'utf8').toString('base64');
      return { text: encoded, mode: '已编码', bytes: Buffer.byteLength(value, 'utf8') };
    } catch (error) {
      throw new Error(`Base64 解码失败：${error.message}`);
    }
  },

  markdown_table(args) {
    const text = asText(args.text, '表格数据');
    const delimiter = args.delimiter === 'tab' ? '\t' : ',';
    const rows = linesOf(text).filter((line) => line.trim() !== '').map((line) => line.split(delimiter).map((cell) => cell.trim()));
    if (!rows.length) throw new Error('没有可转换的表格行');
    const width = Math.max(...rows.map((row) => row.length));
    const padded = rows.map((row) => [...row, ...Array(width - row.length).fill('')]);
    const escape = (cell) => cell.replace(/\|/g, '\\|');
    const header = `| ${padded[0].map(escape).join(' | ')} |`;
    const divider = `| ${padded[0].map(() => '---').join(' | ')} |`;
    const body = padded.slice(1).map((row) => `| ${row.map(escape).join(' | ')} |`);
    return { text: [header, divider, ...body].join('\n'), rows: padded.length - 1, columns: width };
  },

  json_path(args) {
    const raw = asText(args.text, 'JSON 文本');
    let current;
    try {
      current = JSON.parse(raw);
    } catch (error) {
      throw new Error(`JSON 解析失败：${error.message}`);
    }
    const path = String(args.path ?? '').trim();
    if (path) {
      for (const key of path.replace(/^\[|\]$/g, '').split(/[.[\]]+/).filter(Boolean)) {
        if (current === null || current === undefined) break;
        current = current[key];
      }
    }
    return {
      found: current !== undefined,
      value: current === undefined ? null : current,
      formatted: JSON.stringify(current, null, 2) ?? 'undefined'
    };
  }
};

export const TRANSFORM_NAMES = Object.freeze(Object.keys(TRANSFORMS));
