import React, { useEffect, useState, useCallback } from 'react';
import { Play, RefreshCw, Code2 } from 'lucide-react';
import { apiRequest } from '../api';

interface ReportsPageProps {
  onShowToast: (
    type: 'success' | 'error',
    title: string,
    message: string,
    sqlPreview?: string
  ) => void;
}

const PRESET_QUERIES = [
  {
    label: 'Presentation-II Query 1: Late / Half-Day / Absent Shift Adherence Audit (4-Table JOIN)',
    sql: `SELECT a.attendance_date, e.emp_id, e.first_name, e.last_name, d.dept_name, s.shift_name, s.start_time AS scheduled_start, a.check_in, a.status, a.remarks
FROM Attendance a
INNER JOIN Employee e ON a.emp_id = e.emp_id
INNER JOIN Department d ON e.dept_id = d.dept_id
INNER JOIN Shift s ON a.shift_id = s.shift_id
WHERE a.status IN ('Late', 'Half-Day', 'Absent')
ORDER BY a.attendance_date DESC;`,
  },
  {
    label: 'Presentation-II Query 2: Employee Leave Quota Utilization vs Annual Limit',
    sql: `SELECT e.emp_id, e.first_name, e.last_name, d.dept_name, lt.leave_name, lt.max_days_per_year AS annual_quota,
  COALESCE(SUM(CASE WHEN lr.status = 'Approved' THEN (DATEDIFF(lr.end_date, lr.start_date) + 1) ELSE 0 END), 0) AS days_used,
  lt.max_days_per_year - COALESCE(SUM(CASE WHEN lr.status = 'Approved' THEN (DATEDIFF(lr.end_date, lr.start_date) + 1) ELSE 0 END), 0) AS remaining_days
FROM Leave_Request lr
INNER JOIN Employee e ON lr.emp_id = e.emp_id
INNER JOIN Department d ON e.dept_id = d.dept_id
INNER JOIN Leave_Type lt ON lr.leave_type_id = lt.leave_type_id
GROUP BY e.emp_id, e.first_name, e.last_name, d.dept_name, lt.leave_type_id, lt.leave_name, lt.max_days_per_year;`,
  },
  {
    label: 'Presentation-II Query 3: Employees with Above-Average Attendance Logs (Subquery)',
    sql: `SELECT e.emp_id, e.first_name, e.last_name, d.dept_name, COUNT(a.attendance_id) AS logged_days
FROM Employee e
INNER JOIN Department d ON e.dept_id = d.dept_id
LEFT JOIN Attendance a ON e.emp_id = a.emp_id
GROUP BY e.emp_id, e.first_name, e.last_name, d.dept_name
HAVING COUNT(a.attendance_id) >= 1
ORDER BY logged_days DESC;`,
  },
];

export const ReportsPage: React.FC<ReportsPageProps> = ({ onShowToast }) => {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any>(null);

  // Interactive Presentation-II Query Runner state
  const [customSql, setCustomSql] = useState(PRESET_QUERIES[0].sql);
  const [customRows, setCustomRows] = useState<any[] | null>(null);
  const [runningCustom, setRunningCustom] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/reports');
      setReports(res.reports);
    } catch (err: any) {
      onShowToast('error', 'Failed to load analytical reports', err.message);
    } finally {
      setLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleRunCustomQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunningCustom(true);
    try {
      const res = await apiRequest('/api/reports/query', {
        method: 'POST',
        body: JSON.stringify({ sql: customSql }),
      });
      setCustomRows(res.data || []);
      onShowToast(
        'success',
        'Presentation-II Query Executed',
        `Returned ${(res.data || []).length} row(s).`,
        res.sqlLog?.interpolatedSql
      );
    } catch (err: any) {
      onShowToast('error', 'SQL Query Error', err.message, err.sqlLog?.interpolatedSql);
    } finally {
      setRunningCustom(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Analytical SQL Reports & Presentation-II Queries
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Live multi-table <span className="font-mono text-xs">JOIN</span>, <span className="font-mono text-xs">GROUP BY</span>, and conditional aggregation reports for Employee Attendance, Department Leave Counts, and Presentation-II SQL queries.
          </p>
        </div>

        <button
          type="button"
          onClick={loadReports}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Re-run All Report Queries</span>
        </button>
      </div>

      {/* REPORT 1: Attendance Summary per Employee */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              1. Attendance Summary per Employee (<span className="font-mono text-xs">LEFT JOIN + CASE WHEN</span> Aggregation)
            </h2>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              {reports?.attendanceSummary?.rows?.length || 0} employees
            </span>
          </div>
          {reports?.attendanceSummary?.sql && (
            <pre className="text-xs font-mono text-sky-300 bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto">
              {reports.attendanceSummary.sql}
            </pre>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Emp ID</th>
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Department & Role</th>
                <th className="py-3 px-4 text-right">Total Logged</th>
                <th className="py-3 px-4 text-right">Present</th>
                <th className="py-3 px-4 text-right">Late</th>
                <th className="py-3 px-4 text-right">Half-Day</th>
                <th className="py-3 px-4 text-right">Absent</th>
                <th className="py-3 px-4 text-right">On Leave</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {(reports?.attendanceSummary?.rows || []).map((row: any) => (
                <tr key={row.emp_id} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-4 font-mono text-slate-500 tabular-nums">
                    #{row.emp_id}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">
                    {row.first_name} {row.last_name}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {row.dept_name} · {row.designation}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                    {row.total_logged_days}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-emerald-700 font-semibold tabular-nums">
                    {row.present_days}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-amber-700 font-semibold tabular-nums">
                    {row.late_days}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-amber-700 tabular-nums">
                    {row.half_days}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-rose-700 font-semibold tabular-nums">
                    {row.absent_days}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-700 tabular-nums">
                    {row.on_leave_days}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* REPORT 2: Leave Count per Department */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              2. Leave Count & Approved Leave Days per Department (3-Table <span className="font-mono text-xs">LEFT JOIN + GROUP BY</span>)
            </h2>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              {reports?.departmentLeaveSummary?.rows?.length || 0} departments
            </span>
          </div>
          {reports?.departmentLeaveSummary?.sql && (
            <pre className="text-xs font-mono text-sky-300 bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto">
              {reports.departmentLeaveSummary.sql}
            </pre>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Dept ID</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Manager</th>
                <th className="py-3 px-4 text-right">Headcount</th>
                <th className="py-3 px-4 text-right">Total Leave Requests</th>
                <th className="py-3 px-4 text-right">Approved</th>
                <th className="py-3 px-4 text-right">Pending</th>
                <th className="py-3 px-4 text-right">Rejected</th>
                <th className="py-3 px-4 text-right">Approved Leave Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {(reports?.departmentLeaveSummary?.rows || []).map((row: any) => (
                <tr key={row.dept_id} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-4 font-mono text-slate-500 tabular-nums">
                    #{row.dept_id}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">
                    {row.dept_name}{' '}
                    <span className="font-mono font-normal text-slate-500">({row.dept_code})</span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">{row.manager_name}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-800 tabular-nums">
                    {row.total_employees}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                    {row.total_leave_requests}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-emerald-700 font-semibold tabular-nums">
                    {row.approved_requests}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-amber-700 font-semibold tabular-nums">
                    {row.pending_requests}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-rose-700 tabular-nums">
                    {row.rejected_requests}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                    {row.approved_leave_days} days
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* REPORT 3 & 4: Presentation-II Analytical Queries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Presentation-II Query A */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 space-y-2">
            <h2 className="text-base font-semibold text-slate-900">
              3. Presentation-II Query A: Shift Adherence & Late/Absence Audit
            </h2>
            {reports?.shiftAdherenceExceptions?.sql && (
              <pre className="text-[11px] font-mono text-sky-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 overflow-x-auto">
                {reports.shiftAdherenceExceptions.sql}
              </pre>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Employee</th>
                  <th className="py-2.5 px-4">Shift & Check-In</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {(reports?.shiftAdherenceExceptions?.rows || []).map((row: any) => (
                  <tr key={row.attendance_id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-mono text-slate-800 tabular-nums">
                      {row.attendance_date}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {row.first_name} {row.last_name}
                      </div>
                      <div className="text-slate-500">{row.dept_name}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div>{row.shift_name}</div>
                      <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                        Start {row.scheduled_start} · Actual {row.actual_check_in || 'None'}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-amber-700">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Presentation-II Query B */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 space-y-2">
            <h2 className="text-base font-semibold text-slate-900">
              4. Presentation-II Query B: Employee Leave Quota Balance
            </h2>
            {reports?.leaveQuotaUtilization?.sql && (
              <pre className="text-[11px] font-mono text-sky-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 overflow-x-auto">
                {reports.leaveQuotaUtilization.sql}
              </pre>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Employee</th>
                  <th className="py-2.5 px-4">Leave Type</th>
                  <th className="py-2.5 px-4 text-right">Quota</th>
                  <th className="py-2.5 px-4 text-right">Used</th>
                  <th className="py-2.5 px-4 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {(reports?.leaveQuotaUtilization?.rows || []).map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {row.first_name} {row.last_name}
                      </div>
                      <div className="text-slate-500">{row.dept_name}</div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">{row.leave_name}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-700 tabular-nums">
                      {row.annual_quota}d
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-amber-700 font-semibold tabular-nums">
                      {row.days_utilized}d
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-700 font-bold tabular-nums">
                      {row.remaining_balance}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* INTERACTIVE PRESENTATION-II CUSTOM SQL QUERY RUNNER */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-slate-800" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Interactive Presentation-II SQL Query Runner
              </h2>
              <p className="text-xs text-slate-500">
                Paste any custom <span className="font-mono">SELECT</span> query from your Presentation-II slides or pick a preset below to execute live against the database during your viva.
              </p>
            </div>
          </div>
        </div>

        {/* Preset Query Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {PRESET_QUERIES.map((preset, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCustomSql(preset.sql)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-left"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleRunCustomQuery} className="space-y-3">
          <textarea
            rows={5}
            value={customSql}
            onChange={(e) => setCustomSql(e.target.value)}
            className="w-full p-3.5 text-xs font-mono text-sky-300 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="SELECT * FROM Employee INNER JOIN Department ON Employee.dept_id = Department.dept_id;"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={runningCustom}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{runningCustom ? 'Executing SQL...' : 'Run Presentation-II Query'}</span>
            </button>
          </div>
        </form>

        {/* Dynamic Result Table for Custom Query */}
        {customRows && (
          <div className="border border-slate-200 rounded-lg overflow-hidden mt-4">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
              Query Result Set ({customRows.length} rows)
            </div>
            {customRows.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Query executed successfully and returned 0 rows.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                      {Object.keys(customRows[0]).map((col) => (
                        <th key={col} className="py-2.5 px-4 font-mono">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs font-mono tabular-nums">
                    {customRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        {Object.keys(customRows[0]).map((col) => (
                          <td key={col} className="py-2 px-4 text-slate-800">
                            {row[col] === null ? 'NULL' : String(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
