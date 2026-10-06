import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  UserCheck,
  CalendarOff,
  Clock,
  RefreshCw,
  Check,
  X,
  ArrowRight,
  Database,
} from 'lucide-react';
import { apiRequest } from '../api';
import { DashboardKPIs, ModulePageId } from '../types';

interface DashboardPageProps {
  onNavigate: (page: ModulePageId) => void;
  onShowToast: (type: 'success' | 'error', title: string, message: string, sqlPreview?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onShowToast }) => {
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState('');
  const [kpis, setKpis] = useState<DashboardKPIs>({
    total_employees: 0,
    total_departments: 0,
    total_shifts: 0,
    present_today: 0,
    on_leave_today: 0,
    pending_leave_requests: 0,
  });
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/dashboard');
      setToday(res.today);
      setKpis(res.kpis);
      setTodayAttendance(res.todayAttendance || []);
      setPendingLeaves(res.pendingLeaves || []);
    } catch (err: any) {
      onShowToast('error', 'Dashboard Query Failed', err.message);
    } finally {
      setLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleLeaveAction = async (leaveId: number, status: 'Approved' | 'Rejected') => {
    setProcessingId(leaveId);
    try {
      const res = await apiRequest(`/api/leave-requests/${leaveId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      onShowToast(
        'success',
        `Leave Request ${status}`,
        res.message,
        res.sqlLog?.interpolatedSql
      );
      await loadDashboard();
    } catch (err: any) {
      onShowToast('error', 'Update Failed', err.message, err.sqlLog?.interpolatedSql);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusTextClass = (status: string) => {
    switch (status) {
      case 'Present':
      case 'Approved':
        return 'text-emerald-700 font-semibold';
      case 'Late':
      case 'Half-Day':
      case 'Pending':
        return 'text-amber-700 font-semibold';
      case 'Absent':
      case 'Rejected':
        return 'text-rose-700 font-semibold';
      default:
        return 'text-slate-700 font-medium';
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System Overview & Live SQL Metrics
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Real-time aggregate <span className="font-mono text-xs text-slate-800">COUNT(*)</span> queries executed against{' '}
            <span className="font-mono text-xs text-slate-800">Employee</span>,{' '}
            <span className="font-mono text-xs text-slate-800">Attendance</span>, and{' '}
            <span className="font-mono text-xs text-slate-800">Leave_Request</span> tables for{' '}
            <span className="font-mono font-medium text-slate-900 tabular-nums">{today || 'CURDATE()'}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadDashboard}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Live Counts</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('mark-attendance')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
          >
            <span>+ Mark Attendance</span>
          </button>
        </div>
      </div>

      {/* 4 Required Live KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Total Employees</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
              {loading ? '—' : kpis.total_employees}
            </span>
            <button
              type="button"
              onClick={() => onNavigate('employees')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <span>View Table</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 font-mono">
            SELECT COUNT(*) FROM Employee
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Present Today</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-emerald-700 font-mono tabular-nums">
              {loading ? '—' : kpis.present_today}
            </span>
            <button
              type="button"
              onClick={() => onNavigate('mark-attendance')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <span>Attendance Log</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 font-mono">
            WHERE attendance_date = CURDATE()
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">On Leave Today</span>
            <CalendarOff className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-amber-700 font-mono tabular-nums">
              {loading ? '—' : kpis.on_leave_today}
            </span>
            <button
              type="button"
              onClick={() => onNavigate('leave-management')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <span>Leave Register</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 font-mono">
            CURDATE() BETWEEN start_date AND end_date
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Pending Leave Requests</span>
            <Clock className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-rose-700 font-mono tabular-nums">
              {loading ? '—' : kpis.pending_leave_requests}
            </span>
            <button
              type="button"
              onClick={() => onNavigate('leave-management')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <span>Review Queue</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 font-mono">
            WHERE status = &apos;Pending&apos;
          </div>
        </div>
      </div>

      {/* Main Split Section: Today's Attendance Joined View & Pending Leave Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Attendance Register (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Today&apos;s Attendance Register ({today || 'Today'})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Joined view: <span className="font-mono">Attendance ⋈ Employee ⋈ Department ⋈ Shift</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('mark-attendance')}
              className="text-xs font-medium text-slate-700 hover:text-slate-900 underline whitespace-nowrap"
            >
              Open Full Attendance Module
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Emp ID</th>
                  <th className="py-2.5 px-4">Employee & Dept</th>
                  <th className="py-2.5 px-4">Shift</th>
                  <th className="py-2.5 px-4">Check-In / Out</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {todayAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No attendance records logged for today yet.{' '}
                      <button
                        type="button"
                        onClick={() => onNavigate('mark-attendance')}
                        className="text-slate-900 font-semibold underline ml-1"
                      >
                        Mark First Entry
                      </button>
                    </td>
                  </tr>
                ) : (
                  todayAttendance.map((row) => (
                    <tr key={row.attendance_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-slate-600 tabular-nums">
                        #{row.emp_id}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {row.first_name} {row.last_name}
                        </div>
                        <div className="text-slate-500">
                          {row.dept_name} · {row.designation}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">
                        <div>{row.shift_name}</div>
                        <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                          Starts {row.start_time}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-700 tabular-nums">
                        {row.check_in || '—'} / {row.check_out || '—'}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={getStatusTextClass(row.status)}>{row.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Leave Approvals Queue (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Pending Leave Approvals
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Executes <span className="font-mono">UPDATE Leave_Request SET status = ?</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('leave-management')}
                className="text-xs font-medium text-slate-700 hover:text-slate-900 underline whitespace-nowrap"
              >
                All Leave Requests
              </button>
            </div>

            <div className="divide-y divide-slate-200">
              {pendingLeaves.length === 0 ? (
                <div className="py-10 px-5 text-center text-xs text-slate-500">
                  All leave applications have been processed.{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('leave-management')}
                    className="text-slate-900 font-semibold underline ml-1"
                  >
                    Submit New Leave Request
                  </button>
                </div>
              ) : (
                pendingLeaves.map((lr) => (
                  <div key={lr.leave_id} className="p-4 hover:bg-slate-50/70 transition-colors space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-slate-900">
                          {lr.first_name} {lr.last_name}{' '}
                          <span className="font-mono font-normal text-slate-500">
                            (Emp #{lr.emp_id})
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {lr.dept_name} · {lr.leave_name}
                        </div>
                      </div>
                      <span className="text-xs font-mono text-slate-500 tabular-nums">
                        {lr.start_date} → {lr.end_date}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">{lr.reason}</p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                        Leave ID #{lr.leave_id} · Applied {lr.applied_on}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={processingId === lr.leave_id}
                          onClick={() => handleLeaveAction(lr.leave_id, 'Approved')}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors whitespace-nowrap disabled:opacity-50"
                        >
                          <Check className="w-3 h-3" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          disabled={processingId === lr.leave_id}
                          onClick={() => handleLeaveAction(lr.leave_id, 'Rejected')}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors whitespace-nowrap disabled:opacity-50"
                        >
                          <X className="w-3 h-3" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span>All 7 Normalized (3NF) Tables Ready for Viva Demo</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('viva-docs')}
              className="font-semibold text-slate-900 hover:underline whitespace-nowrap"
            >
              View SQL & API Reference →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
