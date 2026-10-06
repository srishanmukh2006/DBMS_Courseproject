/**
 * ============================================================================
 * FILE: backend/routes/leaveRequests.js
 * PURPOSE: CRUD & Approval Operations for the `Leave_Request` Table
 * ============================================================================
 * ENDPOINTS & SQL:
 *   1. GET    /api/leave-requests            -> SELECT lr.*, e.first_name, e.last_name, d.dept_name, lt.leave_name, lt.is_paid, (DATEDIFF(lr.end_date, lr.start_date) + 1) AS total_days ...
 *   2. POST   /api/leave-requests            -> INSERT INTO Leave_Request (emp_id, leave_type_id, start_date, end_date, reason, status, applied_on) VALUES (?, ?, ?, ?, ?, ?, ?)
 *   3. PUT    /api/leave-requests/:id/status -> UPDATE Leave_Request SET status = ? WHERE leave_id = ?
 *   4. DELETE /api/leave-requests/:id        -> DELETE FROM Leave_Request WHERE leave_id = ?
 * ============================================================================
 */

import express from 'express';
import { executeQuery, getTodayDateString } from '../db.js';

const router = express.Router();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUSES = ['Pending', 'Approved', 'Rejected'];

/**
 * GET /api/leave-requests
 * VIVA EXPLANATION:
 * Joins `Leave_Request` with `Employee`, `Department`, and `Leave_Type` and
 * computes `total_days` in SQL using `DATEDIFF(lr.end_date, lr.start_date) + 1`.
 */
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT
        lr.leave_id,
        lr.emp_id,
        e.first_name,
        e.last_name,
        d.dept_name,
        lr.leave_type_id,
        lt.leave_name,
        lt.is_paid,
        lr.start_date,
        lr.end_date,
        (DATEDIFF(lr.end_date, lr.start_date) + 1) AS total_days,
        lr.reason,
        lr.status,
        lr.applied_on
      FROM Leave_Request lr
      INNER JOIN Employee e ON lr.emp_id = e.emp_id
      INNER JOIN Department d ON e.dept_id = d.dept_id
      INNER JOIN Leave_Type lt ON lr.leave_type_id = lt.leave_type_id
      ORDER BY lr.leave_id DESC
    `;
    const { rows, sqlLog } = await executeQuery(
      sql,
      [],
      'Fetch Leave_Request records joined with Employee, Department, and Leave_Type'
    );
    res.json({ success: true, data: rows, sqlLog });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Error fetching leave requests',
      sqlLog: err.sqlLog,
    });
  }
});

/**
 * POST /api/leave-requests
 * VIVA EXPLANATION:
 * Submits a new Leave_Request. Validates required foreign keys (`emp_id`,
 * `leave_type_id`), date format (`YYYY-MM-DD`), and `end_date >= start_date`.
 */
router.post('/', async (req, res) => {
  try {
    const { emp_id, leave_type_id, start_date, end_date, reason, status, applied_on } = req.body;

    if (!emp_id || !leave_type_id || !start_date || !end_date || !reason?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Employee, Leave Type, Start Date, End Date, and Reason are all required.',
      });
    }

    if (!DATE_REGEX.test(start_date) || !DATE_REGEX.test(end_date)) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Start Date and End Date must be in YYYY-MM-DD format.',
      });
    }

    if (end_date < start_date) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: End Date must be greater than or equal to Start Date (end_date >= start_date).',
      });
    }

    const reqStatus = status && VALID_STATUSES.includes(status) ? status : 'Pending';
    const appliedDate = applied_on && DATE_REGEX.test(applied_on) ? applied_on : getTodayDateString();

    const sql = `
      INSERT INTO Leave_Request (emp_id, leave_type_id, start_date, end_date, reason, status, applied_on)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      Number(emp_id),
      Number(leave_type_id),
      start_date,
      end_date,
      reason.trim(),
      reqStatus,
      appliedDate,
    ];

    const { rows, sqlLog } = await executeQuery(
      sql,
      params,
      'Insert new Leave_Request application using parameterized query'
    );

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully.',
      insertId: rows.insertId,
      sqlLog,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to submit leave request',
      sqlLog: err.sqlLog,
    });
  }
});

/**
 * PUT /api/leave-requests/:id/status
 * VIVA EXPLANATION:
 * Executes a parameterized UPDATE query (`UPDATE Leave_Request SET status = ? WHERE leave_id = ?`)
 * when an administrator clicks Approve or Reject on the Leave Management screen.
 */
router.put('/:id/status', async (req, res) => {
  try {
    const leaveId = Number(req.params.id);
    const { status } = req.body;

    if (!leaveId || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Valid leave_id and status (Approved, Rejected, or Pending) are required.',
      });
    }

    const sql = `UPDATE Leave_Request SET status = ? WHERE leave_id = ?`;
    const { rows, sqlLog } = await executeQuery(
      sql,
      [status, leaveId],
      `Update Leave_Request #${leaveId} status to '${status}'`
    );

    if (rows.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: `Leave Request #${leaveId} not found.`,
        sqlLog,
      });
    }

    res.json({
      success: true,
      message: `Leave Request #${leaveId} marked as ${status}.`,
      sqlLog,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to update leave request status',
      sqlLog: err.sqlLog,
    });
  }
});

/**
 * DELETE /api/leave-requests/:id
 * VIVA EXPLANATION:
 * Deletes a leave request record by primary key `leave_id = ?`.
 */
router.delete('/:id', async (req, res) => {
  try {
    const leaveId = Number(req.params.id);
    if (!leaveId) {
      return res.status(400).json({ success: false, message: 'Invalid leave request ID' });
    }

    const sql = `DELETE FROM Leave_Request WHERE leave_id = ?`;
    const { rows, sqlLog } = await executeQuery(
      sql,
      [leaveId],
      `Delete Leave_Request record where leave_id = ${leaveId}`
    );

    if (rows.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: `Leave Request #${leaveId} not found.`,
        sqlLog,
      });
    }

    res.json({
      success: true,
      message: `Leave Request #${leaveId} deleted successfully.`,
      sqlLog,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete leave request',
      sqlLog: err.sqlLog,
    });
  }
});

export default router;
