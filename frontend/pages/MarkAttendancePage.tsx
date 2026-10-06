import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Search, Trash2, ArrowUpDown, CalendarCheck } from 'lucide-react';
import { apiRequest } from '../api';
import { AttendanceRecord, Employee, Shift, ShiftAssignment } from '../types';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

interface MarkAttendancePageProps {
  onShowToast: (type: 'success' | 'error', title: string, message: string, sqlPreview?: string) => void;
}

export const MarkAttendancePage: React.FC<MarkAttendancePageProps> = ({ onShowToast }) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // INSERT form state
  const todayStr = new Date().toISOString().slice(0, 10);
  const [empId, setEmpId] = useState<string>('');
  const [shiftId, setShiftId] = useState<string>('');
  const [attendanceDate, setAttendanceDate] = useState<string>(todayStr);
  const [checkIn, setCheckIn] = useState<string>('09:00');
  const [checkOut, setCheckOut] = useState<string>('17:30');
  const [status, setStatus] = useState<string>('Present');
  const [remarks, setRemarks] = useState<string>('');

  // Search, filter & sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'attendance_date' | 'emp_id' | 'status'>('attendance_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [attRes, empRes, shiftRes, assignRes] = await Promise.all([
        apiRequest('/api/attendance'),
        apiRequest('/api/employees'),
        apiRequest('/api/shifts'),
        apiRequest('/api/shift-assignments'),
      ]);
      setRecords(attRes.data || []);
      setEmployees(empRes.data || []);
      setShifts(shiftRes.data || []);
      setAssignments(assignRes.data || []);

      if (!empId && empRes.data?.length > 0) {
        setEmpId(String(empRes.data[0].emp_id));
      }
      if (!shiftId && shiftRes.data?.length > 0) {
        setShiftId(String(shiftRes.data[0].shift_id));
      }
    } catch (err: any) {
      onShowToast('error', 'Failed to load attendance data', err.message);
    } finally {
      setLoading(false);
    }
  }, [empId, shiftId, onShowToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-select employee's assigned shift when employee dropdown changes
  const handleEmployeeChange = (newEmpId: string) => {
    setEmpId(newEmpId);
    const activeAssign = assignments.find((a) => String(a.emp_id) === newEmpId);
    if (activeAssign) {
      setShiftId(String(activeAssign.shift_id));
      setCheckIn(activeAssign.start_time.slice(0, 5));
      setCheckOut(activeAssign.end_time.slice(0, 5));
    }
  };

  const handleInsertAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId || !shiftId || !attendanceDate || !status) {
      onShowToast('error', 'Validation Error', 'Please select Employee, Shift, Date, and Status.');
      return;
    }

    setSubmitting(true);
    try {
      const noTimes = status === 'Absent' || status === 'On Leave';
      const res = await apiRequest('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({
          emp_id: Number(empId),
          shift_id: Number(shiftId),
          attendance_date: attendanceDate,
          check_in: noTimes ? null : checkIn,
          check_out: noTimes ? null : checkOut,
          status,
          remarks: remarks.trim() || null,
        }),
      });
      onShowToast('success', 'Attendance Marked', res.message, res.sqlLog?.interpolatedSql);
      setRemarks('');
      await loadData();
    } catch (err: any) {
      onShowToast('error', 'Insert Attendance Failed', err.message, err.sqlLog?.interpolatedSql);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await apiRequest(`/api/attendance/${deleteTarget.attendance_id}`, {
        method: 'DELETE',
      });
      onShowToast('success', 'Record Deleted', res.message, res.sqlLog?.interpolatedSql);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      onShowToast('error', 'Delete Failed', err.message, err.sqlLog?.interpolatedSql);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    return records
      .filter((r) => {
        const matchesSearch =
          !searchQuery.trim() ||
          `${r.first_name} ${r.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.dept_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.shift_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          String(r.emp_id).includes(searchQuery);
        const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
        const matchesDate = !dateFilter || r.attendance_date === dateFilter;
        return matchesSearch && matchesStatus && matchesDate;
      })
      .sort((a, b) => {
        const factor = sortDir === 'asc' ? 1 : -1;
        if (sortBy === 'emp_id') return (a.emp_id - b.emp_id) * factor;
        if (sortBy === 'status') return a.status.localeCompare(b.status) * factor;
        return a.attendance_date.localeCompare(b.attendance_date) * factor;
      });
  }, [records, searchQuery, statusFilter, dateFilter, sortBy, sortDir]);

  const toggleSort = (col: 'attendance_date' | 'emp_id' | 'status') => {
    if (sortBy === col) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const getStatusClass = (st: string) => {
    if (st === 'Present') return 'text-emerald-700 font-semibold';
    if (st === 'Late' || st === 'Half-Day') return 'text-amber-700 font-semibold';
    if (st === 'Absent') return 'text-rose-700 font-semibold';
    return 'text-slate-700 font-semibold';
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Mark Attendance & Attendance Register (<span className="font-mono text-xl">Attendance</span> Table)
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Insert daily employee check-in/check-out records using foreign key dropdowns (<span className="font-mono text-xs">emp_id</span>, <span className="font-mono text-xs">shift_id</span>) and inspect the 4-table joined view.
        </p>
      </div>

      {/* INSERT FORM CARD */}
      <form
        onSubmit={handleInsertAttendance}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-slate-800" />
            <h2 className="text-base font-semibold text-slate-900">
              INSERT INTO Attendance — Log Daily Check-In / Check-Out
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500">
            UNIQUE Constraint: (emp_id, attendance_date)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Foreign Key Dropdown: Employee */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Employee (Foreign Key <span className="font-mono">emp_id</span>) *
            </label>
            <select
              value={empId}
              onChange={(e) => handleEmployeeChange(e.target.value)}
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

          {/* Foreign Key Dropdown: Shift */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Shift (Foreign Key <span className="font-mono">shift_id</span>) *
            </label>
            <select
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">-- Select Shift --</option>
              {shifts.map((sh) => (
                <option key={sh.shift_id} value={sh.shift_id}>
                  #{sh.shift_id} · {sh.shift_name} ({sh.start_time.slice(0, 5)}–{sh.end_time.slice(0, 5)})
                </option>
              ))}
            </select>
          </div>

          {/* Attendance Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Attendance Date (<span className="font-mono">attendance_date</span>) *
            </label>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Check-In Time */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Check-In Time (<span className="font-mono">check_in</span>)
            </label>
            <input
              type="time"
              value={checkIn}
              disabled={status === 'Absent' || status === 'On Leave'}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Check-Out Time */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Check-Out Time (<span className="font-mono">check_out</span>)
            </label>
            <input
              type="time"
              value={checkOut}
              disabled={status === 'Absent' || status === 'On Leave'}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Attendance Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Attendance Status (<span className="font-mono">status</span>) *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Half-Day">Half-Day</option>
              <option value="Absent">Absent</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-4 pt-1">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Remarks / Verification Note (<span className="font-mono">remarks</span>)
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g., Biometric gate verified / Approved half-day exit"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{submitting ? 'Executing INSERT...' : 'Mark Attendance (INSERT)'}</span>
          </button>
        </div>
      </form>

      {/* VIEW TABLE WITH SEARCH, FILTER, SORT & DELETE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Attendance Records Joined View ({filteredAndSorted.length} rows)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              SQL: <span className="font-mono">SELECT a.*, e.first_name, e.last_name, d.dept_name, s.shift_name FROM Attendance a INNER JOIN Employee e ... INNER JOIN Shift s</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employee, dept, shift..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Date Filter */}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              title="Filter by attendance date"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="text-xs text-slate-500 hover:text-slate-900 underline"
              >
                All Dates
              </button>
            )}

            {/* Segmented Status Filter */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {['ALL', 'Present', 'Late', 'Half-Day', 'Absent', 'On Leave'].map((st) => (
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
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('attendance_date')}
                    className="flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('emp_id')}
                    className="flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>Employee (FK emp_id)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Shift (FK shift_id)</th>
                <th className="py-3 px-4">Check-In</th>
                <th className="py-3 px-4">Check-Out</th>
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
                <th className="py-3 px-4">Remarks</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    Executing SQL query...
                  </td>
                </tr>
              ) : filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    No matching attendance rows found.
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((row) => (
                  <tr key={row.attendance_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-500 tabular-nums">
                      #{row.attendance_id}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-900 tabular-nums">
                      {row.attendance_date}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-slate-900">
                        {row.first_name} {row.last_name}
                      </span>{' '}
                      <span className="font-mono text-slate-500 tabular-nums">
                        (ID: {row.emp_id})
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{row.dept_name}</td>
                    <td className="py-2.5 px-4 text-slate-700">
                      {row.shift_name}{' '}
                      <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                        ({row.start_time.slice(0, 5)}–{row.end_time.slice(0, 5)})
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700 tabular-nums">
                      {row.check_in || '—'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700 tabular-nums">
                      {row.check_out || '—'}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={getStatusClass(row.status)}>{row.status}</span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate">
                      {row.remarks || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(row)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded transition-colors"
                        title="Delete Attendance Record"
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
        tableName="Attendance"
        primaryKeyColumn="attendance_id"
        primaryKeyValue={deleteTarget?.attendance_id || ''}
        recordLabel={
          deleteTarget
            ? `Attendance for ${deleteTarget.first_name} ${deleteTarget.last_name} on ${deleteTarget.attendance_date}`
            : ''
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
};
