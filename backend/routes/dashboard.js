/**
 * ============================================================================
 * FILE: backend/routes/dashboard.js
 * PURPOSE: Live SQL Aggregate Counts & Overview for Dashboard Screen
 * ============================================================================
 * ENDPOINTS:
 *   GET /api/dashboard
 *     - Runs live COUNT(*) aggregate queries on Employee, Attendance, and
 *       Leave_Request tables for today's date (CURDATE()).
 * ============================================================================
 */

import express from 'express';
import { executeQuery, getTodayDateString, getDatabaseStatus, getQueryHistory } from '../db.js';

const router = express.Router();

/**
 * GET /api/dashboard
 * VIVA EXPLANATION:
 * Computes 4 real-time KPI counts directly in SQL using subqueries and
 * aggregate COUNT(*):
 *   1. total_employees: Total rows in Employee table
 *   2. present_today: Employees marked 'Present', 'Late', or 'Half-Day' on CURDATE()
 *   3. on_leave_today: Approved Leave_Request rows overlapping CURDATE() OR
 *      Attendance rows marked 'On Leave' on CURDATE()
 *   4. pending_leave_requests: Leave_Request rows with status = 'Pending'
 */
router.get('/', async (req, res) => {
  try {
    const today = getTodayDateString();

    const kpiSql = `
      SELECT
        (SELECT COUNT(*) FROM Employee) AS total_employees,
        (SELECT COUNT(*) FROM Department) AS total_departments,
        (SELECT COUNT(*) FROM Shift) AS total_shifts,
        (SELECT COUNT(*) FROM Attendance
         WHERE attendance_date = ? AND status IN ('Present', 'Late', 'Half-Day')) AS present_today,
        (SELECT COUNT(DISTINCT emp_id) FROM (
           SELECT emp_id FROM Leave_Request
           WHERE status = 'Approved' AND ? BETWEEN start_date AND end_date
           UNION
           SELECT emp_id FROM Attendance
           WHERE attendance_date = ? AND status = 'On Leave'
        ) AS active_leaves) AS on_leave_today,
        (SELECT COUNT(*) FROM Leave_Request WHERE status = 'Pending') AS pending_leave_requests
    `;

    const { rows: kpiRows, sqlLog } = await executeQuery(
      kpiSql,
      [today, today, today],
      'Fetch live Dashboard KPI aggregate counts (Total Employees, Present Today, On Leave Today, Pending Leave Requests)'
    );

    // Fetch today's attendance feed with Employee and Shift JOIN
    const todayAttendanceSql = `
      SELECT
        a.attendance_id,
        a.emp_id,
        e.first_name,
        e.last_name,
        e.designation,
        d.dept_name,
        s.shift_name,
        s.start_time,
        a.attendance_date,
        a.check_in,
        a.check_out,
        a.status,
        a.remarks
      FROM Attendance a
      INNER JOIN Employee e ON a.emp_id = e.emp_id
      INNER JOIN Department d ON e.dept_id = d.dept_id
      INNER JOIN Shift s ON a.shift_id = s.shift_id
      WHERE a.attendance_date = ?
      ORDER BY a.attendance_id DESC
    `;

    const { rows: todayAttendance } = await executeQuery(
      todayAttendanceSql,
      [today],
      'Fetch today attendance logs joined with Employee, Department, and Shift'
    );

    // Fetch pending leave requests for quick action on Dashboard
    const pendingLeavesSql = `
      SELECT
        lr.leave_id,
        lr.emp_id,
        e.first_name,
        e.last_name,
        d.dept_name,
        lt.leave_name,
        lr.start_date,
        lr.end_date,
        lr.reason,
        lr.status,
        lr.applied_on
      FROM Leave_Request lr
      INNER JOIN Employee e ON lr.emp_id = e.emp_id
      INNER JOIN Department d ON e.dept_id = d.dept_id
      INNER JOIN Leave_Type lt ON lr.leave_type_id = lt.leave_type_id
      WHERE lr.status = 'Pending'
      ORDER BY lr.applied_on DESC, lr.leave_id DESC
    `;

    const { rows: pendingLeaves } = await executeQuery(
      pendingLeavesSql,
      [],
      'Fetch pending leave requests joined with Employee, Department, and Leave_Type'
    );

    res.json({
      success: true,
      today,
      kpis: kpiRows[0] || {
        total_employees: 0,
        total_departments: 0,
        total_shifts: 0,
        present_today: 0,
        on_leave_today: 0,
        pending_leave_requests: 0,
      },
      todayAttendance,
      pendingLeaves,
      dbStatus: getDatabaseStatus(),
      sqlLog,
      recentQueries: getQueryHistory().slice(0, 15),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to load dashboard counts',
      sqlLog: err.sqlLog,
    });
  }
});

export default router;
