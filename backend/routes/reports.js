/**
 * ============================================================================
 * FILE: backend/routes/reports.js
 * PURPOSE: Complex Analytical SQL Queries & Presentation-II Reports
 * ============================================================================
 * ENDPOINTS & SQL:
 *   1. GET  /api/reports       -> Runs 4 multi-table analytical SQL queries:
 *      (a) Attendance Summary per Employee (LEFT JOIN + Conditional Aggregation)
 *      (b) Leave Count & Total Leave Days per Department (3-table JOIN + GROUP BY)
 *      (c) Presentation-II Query: Late Arrival & Shift Adherence Analysis
 *      (d) Presentation-II Query: Employee Leave Quota Balance & Utilization
 *   2. POST /api/reports/query -> Executes a custom read-only SELECT query from
 *      the student's Presentation-II slides and returns rows + SQL execution metadata.
 * ============================================================================
 */

import express from 'express';
import { executeQuery } from '../db.js';

const router = express.Router();

/**
 * GET /api/reports
 * VIVA EXPLANATION:
 * Executes the required analytical queries for the Reports screen and returns
 * both the result sets and the exact SQL statements so the student can showcase
 * them during their DBMS viva.
 */
router.get('/', async (req, res) => {
  try {
    // 1. Attendance Summary per Employee
    const attendanceSummarySql = `
      SELECT
        e.emp_id,
        e.first_name,
        e.last_name,
        d.dept_name,
        e.designation,
        COUNT(a.attendance_id) AS total_logged_days,
        SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present_days,
        SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) AS late_days,
        SUM(CASE WHEN a.status = 'Half-Day' THEN 1 ELSE 0 END) AS half_days,
        SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) AS absent_days,
        SUM(CASE WHEN a.status = 'On Leave' THEN 1 ELSE 0 END) AS on_leave_days
      FROM Employee e
      INNER JOIN Department d ON e.dept_id = d.dept_id
      LEFT JOIN Attendance a ON e.emp_id = a.emp_id
      GROUP BY e.emp_id, e.first_name, e.last_name, d.dept_name, e.designation
      ORDER BY present_days DESC, e.emp_id ASC
    `;

    const { rows: attendanceSummary } = await executeQuery(
      attendanceSummarySql,
      [],
      'Report 1: Attendance Summary per Employee using LEFT JOIN and CASE WHEN aggregation'
    );

    // 2. Leave Count & Days per Department
    const departmentLeaveSql = `
      SELECT
        d.dept_id,
        d.dept_name,
        d.dept_code,
        d.manager_name,
        COUNT(DISTINCT e.emp_id) AS total_employees,
        COUNT(lr.leave_id) AS total_leave_requests,
        SUM(CASE WHEN lr.status = 'Approved' THEN 1 ELSE 0 END) AS approved_requests,
        SUM(CASE WHEN lr.status = 'Pending' THEN 1 ELSE 0 END) AS pending_requests,
        SUM(CASE WHEN lr.status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_requests,
        COALESCE(SUM(CASE WHEN lr.status = 'Approved' THEN (DATEDIFF(lr.end_date, lr.start_date) + 1) ELSE 0 END), 0) AS approved_leave_days
      FROM Department d
      LEFT JOIN Employee e ON d.dept_id = e.dept_id
      LEFT JOIN Leave_Request lr ON e.emp_id = lr.emp_id
      GROUP BY d.dept_id, d.dept_name, d.dept_code, d.manager_name
      ORDER BY total_leave_requests DESC, d.dept_id ASC
    `;

    const { rows: departmentLeaveSummary } = await executeQuery(
      departmentLeaveSql,
      [],
      'Report 2: Leave Count and Approved Leave Days per Department using 3-table LEFT JOIN and GROUP BY'
    );

    // 3. Presentation-II Query A: Shift Adherence & Late Arrival Audit (4-Table INNER JOIN)
    const presentationQuery1Sql = `
      SELECT
        a.attendance_id,
        a.attendance_date,
        e.emp_id,
        e.first_name,
        e.last_name,
        d.dept_name,
        s.shift_name,
        s.start_time AS scheduled_start,
        s.grace_mins,
        a.check_in AS actual_check_in,
        a.check_out AS actual_check_out,
        a.status,
        a.remarks
      FROM Attendance a
      INNER JOIN Employee e ON a.emp_id = e.emp_id
      INNER JOIN Department d ON e.dept_id = d.dept_id
      INNER JOIN Shift s ON a.shift_id = s.shift_id
      WHERE a.status IN ('Late', 'Half-Day', 'Absent')
      ORDER BY a.attendance_date DESC, a.attendance_id DESC
    `;

    const { rows: shiftAdherenceExceptions } = await executeQuery(
      presentationQuery1Sql,
      [],
      'Presentation-II Query A: Multi-table JOIN identifying Late, Half-Day, and Absent shift exceptions'
    );

    // 4. Presentation-II Query B: Employee Leave Quota Utilization vs Max Annual Entitlement
    const presentationQuery2Sql = `
      SELECT
        e.emp_id,
        e.first_name,
        e.last_name,
        d.dept_name,
        lt.leave_name,
        lt.max_days_per_year AS annual_quota,
        COUNT(lr.leave_id) AS applications_submitted,
        COALESCE(SUM(CASE WHEN lr.status = 'Approved' THEN (DATEDIFF(lr.end_date, lr.start_date) + 1) ELSE 0 END), 0) AS days_utilized,
        lt.max_days_per_year - COALESCE(SUM(CASE WHEN lr.status = 'Approved' THEN (DATEDIFF(lr.end_date, lr.start_date) + 1) ELSE 0 END), 0) AS remaining_balance
      FROM Leave_Request lr
      INNER JOIN Employee e ON lr.emp_id = e.emp_id
      INNER JOIN Department d ON e.dept_id = d.dept_id
      INNER JOIN Leave_Type lt ON lr.leave_type_id = lt.leave_type_id
      GROUP BY e.emp_id, e.first_name, e.last_name, d.dept_name, lt.leave_type_id, lt.leave_name, lt.max_days_per_year
      ORDER BY days_utilized DESC, e.emp_id ASC
    `;

    const { rows: leaveQuotaUtilization, sqlLog } = await executeQuery(
      presentationQuery2Sql,
      [],
      'Presentation-II Query B: Employee Leave Quota Utilization & Remaining Balance calculation'
    );

    res.json({
      success: true,
      reports: {
        attendanceSummary: {
          title: 'Attendance Summary per Employee',
          sql: attendanceSummarySql.trim(),
          rows: attendanceSummary,
        },
        departmentLeaveSummary: {
          title: 'Leave Count & Approved Days per Department',
          sql: departmentLeaveSql.trim(),
          rows: departmentLeaveSummary,
        },
        shiftAdherenceExceptions: {
          title: 'Presentation-II Query 1: Shift Adherence & Late/Absence Audit (4-Table JOIN)',
          sql: presentationQuery1Sql.trim(),
          rows: shiftAdherenceExceptions,
        },
        leaveQuotaUtilization: {
          title: 'Presentation-II Query 2: Leave Quota Utilization & Remaining Balance',
          sql: presentationQuery2Sql.trim(),
          rows: leaveQuotaUtilization,
        },
      },
      sqlLog,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Error generating analytical reports',
      sqlLog: err.sqlLog,
    });
  }
});

/**
 * POST /api/reports/query
 * VIVA EXPLANATION:
 * Allows the student to paste and run any custom read-only `SELECT` query
 * (such as their specific Presentation-II query) live against the database
 * during their project demonstration.
 */
router.post('/query', async (req, res) => {
  try {
    const { sql } = req.body;
    if (!sql || !String(sql).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a SQL SELECT query to execute.',
      });
    }

    const trimmed = String(sql).trim();
    if (!/^(SELECT|WITH)\b/i.test(trimmed) || /;\s*(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE)\b/i.test(trimmed)) {
      return res.status(400).json({
        success: false,
        message: 'Security Policy: Only read-only SELECT / WITH analytical queries are permitted in the Presentation-II Query Runner.',
      });
    }

    const { rows, sqlLog } = await executeQuery(
      trimmed,
      [],
      'Custom Presentation-II SELECT Query executed from Reports Console'
    );

    res.json({
      success: true,
      data: rows,
      sqlLog,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: `SQL Execution Error: ${err.message}`,
      sqlLog: err.sqlLog,
    });
  }
});

export default router;
