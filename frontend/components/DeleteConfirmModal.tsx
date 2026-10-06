import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  tableName: string;
  primaryKeyColumn: string;
  primaryKeyValue: number | string;
  recordLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  tableName,
  primaryKeyColumn,
  primaryKeyValue,
  recordLabel,
  onConfirm,
  onCancel,
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  const previewSql = `DELETE FROM ${tableName} WHERE ${primaryKeyColumn} = ?; -- Param: [${primaryKeyValue}]`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="delete-modal-title" className="text-base font-semibold text-slate-900">
                Confirm SQL DELETE Operation
              </h3>
              <p className="text-xs text-slate-500">
                Table: <span className="font-mono font-medium text-slate-700">{tableName}</span> · Primary Key:{' '}
                <span className="font-mono font-medium text-slate-700">
                  {primaryKeyColumn} = {primaryKeyValue}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-sm text-slate-600 space-y-2">
          <p>
            Are you sure you want to permanently delete{' '}
            <span className="font-semibold text-slate-900">{recordLabel}</span>?
          </p>
          <p className="text-xs text-slate-500">
            Note: If child records in other tables reference this row via a Foreign Key (
            <span className="font-mono">ON DELETE RESTRICT</span>), MySQL will reject the deletion with
            referential integrity error <span className="font-mono">errno 1451</span>.
          </p>
        </div>

        <div className="bg-slate-950 text-sky-300 font-mono text-xs p-3 rounded-lg border border-slate-800 overflow-x-auto">
          {previewSql}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Executing DELETE...' : 'Execute DELETE'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
