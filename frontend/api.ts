import { SqlLogEntry } from './types';

type SqlLogListener = (log: SqlLogEntry) => void;
const listeners: Set<SqlLogListener> = new Set();

export function onSqlExecuted(listener: SqlLogListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitSqlLog(log?: SqlLogEntry) {
  if (!log) return;
  listeners.forEach((fn) => fn(log));
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json();

  if (payload?.sqlLog) {
    emitSqlLog(payload.sqlLog);
  }

  if (!response.ok || payload.success === false) {
    const error: any = new Error(payload.message || `Request failed with status ${response.status}`);
    error.sqlLog = payload.sqlLog;
    error.status = response.status;
    throw error;
  }

  return payload;
}
