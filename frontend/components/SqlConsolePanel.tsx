import React, { useState } from 'react';
import { Terminal, Copy, Check, ChevronUp, ChevronDown, History, Database } from 'lucide-react';
import { SqlLogEntry } from '../types';

interface SqlConsolePanelProps {
  lastQuery: SqlLogEntry | null;
  queryHistory: SqlLogEntry[];
  onClearHistory: () => void;
}

export const SqlConsolePanel: React.FC<SqlConsolePanelProps> = ({
  lastQuery,
  queryHistory,
  onClearHistory,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showInterpolated, setShowInterpolated] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayedSql = lastQuery
    ? showInterpolated
      ? lastQuery.interpolatedSql
      : lastQuery.sql
    : 'SELECT * FROM Employee INNER JOIN Department ON Employee.dept_id = Department.dept_id;';

  const handleCopy = () => {
    navigator.clipboard.writeText(displayedSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="bg-slate-900 text-slate-100 border-t border-slate-800 transition-all">
      {/* Main Compact Bar: Always visible for "Before & After" viva screenshots */}
      <div className="max-w-[1440px] mx-auto px-6 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start lg:items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-2 shrink-0 text-xs font-semibold text-emerald-400 pt-0.5 lg:pt-0">
            <Terminal className="w-4 h-4" />
            <span>SQL Console · Last Executed Query</span>
          </div>

          <div className="hidden sm:block text-slate-600 select-none" aria-hidden="true">
            |
          </div>

          <div className="min-w-0 flex-1 font-mono text-xs bg-slate-950/90 border border-slate-800 rounded px-3 py-1.5 overflow-x-auto whitespace-nowrap">
            {lastQuery ? (
              <span className={lastQuery.status === 'ERROR' ? 'text-rose-400' : 'text-sky-300'}>
                {displayedSql}
              </span>
            ) : (
              <span className="text-slate-400">Waiting for database operation...</span>
            )}
          </div>
        </div>

        {/* Metadata & Controls */}
        <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 text-xs">
          {lastQuery && (
            <div className="flex items-center gap-2 text-slate-400 font-mono tabular-nums">
              <span className={lastQuery.status === 'ERROR' ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                {lastQuery.status}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Params: {lastQuery.params?.length ? JSON.stringify(lastQuery.params) : '[]'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{lastQuery.rowCount} row(s)</span>
              <span aria-hidden="true">·</span>
              <span>{lastQuery.durationMs} ms</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowInterpolated((prev) => !prev)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors whitespace-nowrap"
              title="Toggle between Parameterized (?) SQL and Bound Values Preview"
            >
              {showInterpolated ? 'Showing Bound Values' : 'Parameterized (?)'}
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Copy SQL query"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors whitespace-nowrap"
            >
              <History className="w-3.5 h-3.5" />
              <span>History ({queryHistory.length})</span>
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Full Query Inspector & History Drawer */}
      {expanded && (
        <div className="border-t border-slate-800 bg-slate-950/95 max-h-72 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto px-6 py-4 space-y-4">
            {lastQuery && (
              <div className="border border-slate-800 rounded-lg p-3.5 bg-slate-900/70 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-sky-400" />
                    <span className="font-semibold text-slate-200">{lastQuery.description || 'Database Query Execution'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{lastQuery.engine}</span>
                  </div>
                  <span className="font-mono tabular-nums">{new Date(lastQuery.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="text-[11px] text-slate-400 mb-1">Prepared Statement (Sent to mysql2 pool.execute):</div>
                    <pre className="text-xs font-mono text-sky-300 bg-slate-950 p-2.5 rounded border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                      {lastQuery.sql}
                    </pre>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 mb-1">
                      Bound Parameters Array & Interpolated Preview:
                    </div>
                    <pre className="text-xs font-mono text-emerald-300 bg-slate-950 p-2.5 rounded border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                      Params: {JSON.stringify(lastQuery.params)}{'\n'}
                      Preview: {lastQuery.interpolatedSql}
                    </pre>
                  </div>
                </div>
                {lastQuery.error && (
                  <div className="text-xs font-mono text-rose-400 bg-rose-950/40 border border-rose-900/60 rounded px-3 py-2">
                    MySQL Error: {lastQuery.error}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-300">
                  Session SQL Execution Log ({queryHistory.length} operations)
                </h4>
                {queryHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearHistory}
                    className="text-xs text-slate-400 hover:text-slate-200 underline"
                  >
                    Clear local log
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-lg overflow-hidden">
                {queryHistory.map((item) => (
                  <div
                    key={item.id}
                    className="px-3.5 py-2 bg-slate-900/40 hover:bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
                  >
                    <div className="min-w-0 flex-1 truncate">
                      <span
                        className={
                          item.status === 'ERROR'
                            ? 'text-rose-400 mr-2 font-semibold'
                            : 'text-emerald-400 mr-2 font-semibold'
                        }
                      >
                        [{item.status}]
                      </span>
                      <span className="text-slate-200">{item.interpolatedSql}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 shrink-0 tabular-nums">
                      <span>{item.rowCount} rows</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.durationMs} ms</span>
                      <span aria-hidden="true">·</span>
                      <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
