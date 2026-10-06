/**
 * ============================================================================
 * FILE: backend/routes/attendance.js
 * PURPOSE: CRUD Operations for the `Attendance` Table & Mark Attendance Screen
 * ============================================================================
 * ENDPOINTS & SQL:
 *   1. GET    /api/attendance     -> SELECT a.*, e.first_name, e.last_name, d.dept_name, s.shift_name, s.start_time, s.end_time FROM Attendance a INNER JOIN Employee e ... INNER JOIN Shift s ...
 *   2. POST   /api/attendance     -> INSERT INTO Attendance (emp_id, shift_id, attendance_date, check_in, check_out, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)
 *   3. DELETE /api/attendance/:id -> DELETE FROM Attendance WHERE attendance_id = ?
 * ============================================================================
 */

import express from 'express';
import { executeQuery } from '../db.js';

const router = express.Router();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUSES = ['Present', 'Late', 'Half-Day', 'Absent', 'On Leave'];

/**
 * GET /api/attendance
 * VIVA EXPLANATION:
 * Performs a 4-table INNER JOIN (`Attendance` -> `Employee` -> `Department` and
 * `Attendance` -> `Shift`) so each attendance row shows the employee's full
 * name, department, assigned shift name, shift timings, check-in, check-out,
 * and attendance status.
 */
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT
        a.attendance_id,
        a.emp_id,
        e.first_name,
        e.last_name,
        d.dept_name,
        a.shift_id,
        s.shift_name,
        s.start_time,
        s.end_time,
        a.attendance_date,
        a.check_in,
        a.check_out,
        a.status,
        a.remarks
      FROM Attendance a
      INNER JOIN Employee e ON a.emp_id = e.emp_id
      INNER JOIN Department d ON e.dept_id = d.dept_id
      INNER JOIN Shift s ON a.shift_id = s.shift_id
      ORDER BY a.attendance_date DESC, a.attendance_id DESC
    `;
    const { rows, sqlLog } = await executeQuery(
      sql,
      [],
      'Fetch Attendance records joined with Employee, Department, and Shift'
    );
    res.json({ success: true, data: rows, sqlLog });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Error fetching attendance records',
      sqlLog: err.sqlLog,
    });
  }
});

/**
 * POST /api/attendance
 * VIVA EXPLANATION:
 * Marks attendance for an employee on a specific `attendance_date`.
 * Enforces UNIQUE(emp_id, attendance_date) constraint so the same employee
 * cannot have duplicate attendance logs on the same date.
 */
router.post('/', async (req, res) => {
  try {
    const { emp_id, shift_id, attendance_date, check_in, check_out, status, remarks } = req.body;

    if (!emp_id || !shift_id || !attendance_date || !status) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Employee, Shift, Attendance Date, and Status are required.',
      });
    }

    if (!DATE_REGEX.test(attendance_date)) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Attendance Date must be in YYYY-MM-DD format.',
      });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Validation Error: Status must be one of ${VALID_STATUSES.join(', ')}.`,
      });
    }

    const normalizeTime = (t) => {
      if (!t || !String(t).trim()) return null;
      const trimmed = String(t).trim();
      return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
    };

    const cleanIn = normalizeTime(check_in);
    const cleanOut = normalizeTime(check_out);

    const sql = `
      INSERT INTO Attendance (emp_id, shift_id, attendance_date, check_in, check_out, status, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      Number(emp_id),
      Number(shift_id),
      attendance_date,
      cleanIn,
      cleanOut,
      status,
      remarks?.trim() || null,
    ];

    const { rows, sqlLog } = await executeQuery(
      sql,
      params,
      'Insert new Attendance record using parameterized query'
    );

    res.status(201).json({
      success: true,
      message: `Attendance logged for Employee #${emp_id} on ${attendance_date} (${status}).`,
      insertId: rows.insertId,
      sqlLog,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      return res.status(409).json({
        success: false,
        message:
          'Duplicate Attendance Entry: Attendance for this employee on the selected date is already recorded (UNIQUE constraint uq_emp_attendance_date).',
        sqlLog: err.sqlLog,
      });
    }
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to mark attendance',
      sqlLog: err.sqlLog,
    });
  }
});

/**
 * DELETE /api/attendance/:id
 * VIVA EXPLANATION:
 * Deletes an attendance record by primary key `attendance_id = ?`.
 */
router.delete('/:id', async (req, res) => {
  try {
    const attendanceId = Number(req.params.id);
    if (!attendanceId) {
      return res.status(400).json({ success: false, message: 'Invalid attendance ID' });
    }

    const sql = `DELETE FROM Attendance WHERE attendance_id = ?`;
    const { rows, sqlLog } = await executeQuery(
      sql,
      [attendanceId],
      `Delete Attendance record where attendance_id = ${attendanceId}`
    );

    if (rows.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: `Attendance record #${attendanceId} not found.`,
        sqlLog,
      });
    }

    res.json({
      success: true,
      message: `Attendance record #${attendanceId} deleted successfully.`,
      sqlLog,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete attendance record',
      sqlLog: err.sqlLog,
    });
  }
});

export default router;
