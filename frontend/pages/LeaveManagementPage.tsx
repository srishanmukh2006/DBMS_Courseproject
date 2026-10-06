import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Search, Trash2, ArrowUpDown, Check, X, CalendarRange } from 'lucide-react';
import { apiRequest } from '../api';
import { Employee, LeaveRequest, LeaveType } from '../types';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

interface LeaveManagementPageProps {
  onShowToast: (type: 'success' | 'error', title: string, message: string, sqlPreview?: string) => void;
}

export const LeaveManagementPage: React.FC<LeaveManagementPageProps> = ({ onShowToast }) => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // INSERT form state
  const todayStr = new Date().toISOString().slice(0, 10);
  const [empId, setEmpId] = useState<string>('');
  const [leaveTypeId, setLeaveTypeId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [reason, setReason] = useState<string>('');

  // Search, filter & sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'leave_id' | 'start_date' | 'total_days' | 'status'>('leave_id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<LeaveRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, empRes, typeRes] = await Promise.all([
        apiRequest('/api/leave-requests'),
        apiRequest('/api/employees'),
        apiRequest('/api/leave-types'),
      ]);
      setRequests(reqRes.data || []);
      setEmployees(empRes.data || []);
      setLeaveTypes(typeRes.data || []);

      if (!empId && empRes.data?.length > 0) {
        setEmpId(String(empRes.data[0].emp_id));
      }
      if (!leaveTypeId && typeRes.data?.length > 0) {
        setLeaveTypeId(String(typeRes.data[0].leave_type_id));
      }
    } catch (err: any) {
      onShowToast('error', 'Failed to load leave requests', err.message);
    } finally {
      setLoading(false);
    }
  }, [empId, leaveTypeId, onShowToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate requested leave duration in days
  const calculatedDays = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return 0;
    const s = new Date(startDate + 'T00:00:00');
    const e = new Date(endDate + 'T00:00:00');
    return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId || !leaveTypeId || !startDate || !endDate || !reason.trim()) {
      onShowToast('error', 'Validation Error', 'All fields including Reason are required.');
      return;
    }

    if (endDate < startDate) {
      onShowToast(
        'error',
        'Date Range Constraint Error',
        'End Date must be greater than or equal to Start Date (end_date >= start_date).'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest('/api/leave-requests', {
        method: 'POST',
        body: JSON.stringify({
          emp_id: Number(empId),
          leave_type_id: Number(leaveTypeId),
          start_date: startDate,
          end_date: endDate,
          reason: reason.trim(),
          status: 'Pending',
          applied_on: todayStr,
        }),
      });
      onShowToast('success', 'Leave Application Submitted', res.message, res.sqlLog?.interpolatedSql);
      setReason('');
      await loadData();
    } catch (err: any) {
      onShowToast('error', 'Leave Application Failed', err.message, err.sqlLog?.interpolatedSql);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (leaveId: number, status: 'Approved' | 'Rejected') => {
    setUpdatingId(leaveId);
    try {
      const res = await apiRequest(`/api/leave-requests/${leaveId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      onShowToast('success', `Leave ${status}`, res.message, res.sqlLog?.interpolatedSql);
      await loadData();
    } catch (err: any) {
      onShowToast('error', 'Status Update Failed', err.message, err.sqlLog?.interpolatedSql);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await apiRequest(`/api/leave-requests/${deleteTarget.leave_id}`, {
        method: 'DELETE',
      });
      onShowToast('success', 'Leave Request Deleted', res.message, res.sqlLog?.interpolatedSql);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      onShowToast('error', 'Delete Failed', err.message, err.sqlLog?.interpolatedSql);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    return requests
      .filter((r) => {
        const matchesSearch =
          !searchQuery.trim() ||
          `${r.first_name} ${r.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.dept_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.leave_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.reason.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const factor = sortDir === 'asc' ? 1 : -1;
        if (sortBy === 'leave_id') return (a.leave_id - b.leave_id) * factor;
        if (sortBy === 'total_days') return (a.total_days - b.total_days) * factor;
        if (sortBy === 'status') return a.status.localeCompare(b.status) * factor;
        return a.start_date.localeCompare(b.start_date) * factor;
      });
  }, [requests, searchQuery, statusFilter, sortBy, sortDir]);

  const toggleSort = (col: 'leave_id' | 'start_date' | 'total_days' | 'status') => {
    if (sortBy === col) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const getStatusClass = (st: string) => {
    if (st === 'Approved') return 'text-emerald-700 font-semibold';
    if (st === 'Pending') return 'text-amber-700 font-semibold';
    return 'text-rose-700 font-semibold';
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Leave Management & Approval Workflow (<span className="font-mono text-xl">Leave_Request</span> Table)
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Submit employee leave applications with foreign key dropdowns (<span className="font-mono text-xs">emp_id</span>, <span className="font-mono text-xs">leave_type_id</span>), date range validation (<span className="font-mono text-xs">end_date &gt;= start_date</span>), and live Approve / Reject <span className="font-mono text-xs">UPDATE</span> actions.
        </p>
      </div>

      {/* INSERT FORM: Apply for Leave */}
      <form
        onSubmit={handleApplyLeave}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-slate-800" />
            <h2 className="text-base font-semibold text-slate-900">
              INSERT INTO Leave_Request — Apply for Employee Leave
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500">
            CHECK Constraint: end_date &gt;= start_date
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Foreign Key Dropdown: Employee */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Employee (FK <span className="font-mono">emp_id</span>) *
            </label>
            <select
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">-- Select Employee --</option>
              {employees.map((emp) => (
                <option key={emp.emp_id} value={emp.emp_id}>
                  #{emp.emp_id} · {emp.first_name} {emp.last_name} ({emp.dept_name})
                </option>
              ))}
            </select>
          </div>

          {/* Foreign Key Dropdown: Leave Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Leave Type (FK <span className="font-mono">leave_type_id</span>) *
            </label>
            <select
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">-- Select Leave Type --</option>
              {leaveTypes.map((lt) => (
                <option key={lt.leave_type_id} value={lt.leave_type_id}>
                  #{lt.leave_type_id} · {lt.leave_name} (Max {lt.max_days_per_year}d/yr ·{' '}
                  {lt.is_paid ? 'Paid' : 'Unpaid'})
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Start Date (<span className="font-mono">start_date</span>) *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* End Date */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                End Date (<span className="font-mono">end_date</span>) *
              </label>
              <span
                className={`text-[11px] font-mono tabular-nums ${
                  endDate < startDate ? 'text-rose-600 font-semibold' : 'text-slate-500'
                }`}
              >
                {endDate < startDate ? 'Invalid (< start_date)' : `${calculatedDays} day(s)`}
              </span>
            </div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className={`w-full px-3 py-2 text-xs font-mono bg-white border rounded-lg focus:outline-none focus:ring-2 ${
                endDate < startDate
                  ? 'border-rose-400 focus:ring-rose-600'
                  : 'border-slate-300 focus:ring-slate-900'
              }`}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-4 pt-1">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Reason for Leave (<span className="font-mono">reason</span>) *
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="e.g., Medical recovery / Family ceremony / Annual vacation"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{submitting ? 'Submitting...' : 'Apply for Leave (INSERT)'}</span>
          </button>
        </div>
      </form>

      {/* VIEW TABLE: Leave Requests Joined View */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Leave Requests Joined View ({filteredAndSorted.length} rows)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              SQL: <span className="font-mono">SELECT lr.*, e.first_name, e.last_name, d.dept_name, lt.leave_name FROM Leave_Request lr INNER JOIN Employee e ... INNER JOIN Leave_Type lt</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employee, leave type, reason..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {['ALL', 'Pending', 'Approved', 'Rejected'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('leave_id')}
                    className="flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4">Employee (FK emp_id)</th>
                <th className="py-3 px-4">Leave Type (FK leave_type_id)</th>
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('start_date')}
                    className="flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>Date Range</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('total_days')}
                    className="flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>Days</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('status')}
                    className="flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4">Approve / Reject (UPDATE)</th>
                <th className="py-3 px-4 text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    Executing SQL query...
                  </td>
                </tr>
              ) : filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No matching leave requests found.
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((row) => (
                  <tr key={row.leave_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-500 tabular-nums">
                      #{row.leave_id}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {row.first_name} {row.last_name}{' '}
                        <span className="font-mono font-normal text-slate-500 tabular-nums">
                          (#{row.emp_id})
                        </span>
                      </div>
                      <div className="text-slate-500">{row.dept_name}</div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">
                      <div>{row.leave_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {row.is_paid ? 'Paid Leave' : 'Unpaid (LOP)'}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-800 tabular-nums whitespace-nowrap">
                      {row.start_date} → {row.end_date}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 tabular-nums">
                      {row.total_days}d
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate" title={row.reason}>
                      {row.reason}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={getStatusClass(row.status)}>{row.status}</span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={updatingId === row.leave_id || row.status === 'Approved'}
                          onClick={() => handleStatusUpdate(row.leave_id, 'Approved')}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors disabled:opacity-40 whitespace-nowrap"
                          title="UPDATE Leave_Request SET status = 'Approved'"
                        >
                          <Check className="w-3 h-3" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === row.leave_id || row.status === 'Rejected'}
                          onClick={() => handleStatusUpdate(row.leave_id, 'Rejected')}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors disabled:opacity-40 whitespace-nowrap"
                          title="UPDATE Leave_Request SET status = 'Rejected'"
                        >
                          <X className="w-3 h-3" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(row)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        tableName="Leave_Request"
        primaryKeyColumn="leave_id"
        primaryKeyValue={deleteTarget?.leave_id || ''}
        recordLabel={
          deleteTarget
            ? `Leave Request #${deleteTarget.leave_id} (${deleteTarget.first_name} ${deleteTarget.last_name} · ${deleteTarget.leave_name})`
            : ''
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
};
