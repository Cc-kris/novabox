import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = path.resolve(here, '../..');
export const DATA_DIR = process.env.NOVABOX_DATA_DIR
  ? path.resolve(process.env.NOVABOX_DATA_DIR)
  : path.join(APP_ROOT, 'data');
export const TOOLS_DIR = process.env.NOVABOX_TOOLS_DIR
  ? path.resolve(process.env.NOVABOX_TOOLS_DIR)
  : path.join(APP_ROOT, 'tools');
export const PUBLIC_DIR = path.join(APP_ROOT, 'public');
export const DB_PATH = process.env.NOVABOX_DB || path.join(DATA_DIR, 'novabox.db');
