/**
 * ============================================================================
 * FILE: backend/routes/shiftAssignments.js
 * PURPOSE: CRUD Operations for the `Shift_Assignment` Table
 * ============================================================================
 * ENDPOINTS & SQL:
 *   1. GET    /api/shift-assignments     -> SELECT sa.*, e.first_name, e.last_name, d.dept_name, s.shift_name, s.start_time, s.end_time FROM Shift_Assignment sa INNER JOIN Employee e ... INNER JOIN Shift s ...
 *   2. POST   /api/shift-assignments     -> INSERT INTO Shift_Assignment (emp_id, shift_id, start_date, end_date) VALUES (?, ?, ?, ?)
 *   3. DELETE /api/shift-assignments/:id -> DELETE FROM Shift_Assignment WHERE assignment_id = ?
 * ============================================================================
 */

import express from 'express';
import { executeQuery } from '../db.js';

const router = express.Router();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/shift-assignments
 * VIVA EXPLANATION:
 * Joins `Shift_Assignment` with `Employee`, `Department`, and `Shift` so the
 * table view displays employee name, department, shift name, and shift timings
 * alongside the assignment start_date and end_date.
 */
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT
        sa.assignment_id,
        sa.emp_id,
        e.first_name,
        e.last_name,
        d.dept_name,
        sa.shift_id,
        s.shift_name,
        s.start_time,
        s.end_time,
        sa.start_date,
        sa.end_date
      FROM Shift_Assignment sa
      INNER JOIN Employee e ON sa.emp_id = e.emp_id
      INNER JOIN Department d ON e.dept_id = d.dept_id
      INNER JOIN Shift s ON sa.shift_id = s.shift_id
      ORDER BY sa.start_date DESC, sa.assignment_id DESC
    `;
    const { rows, sqlLog } = await executeQuery(
      sql,
      [],
      'Fetch all Shift_Assignment rows joined with Employee, Department, and Shift'
    );
    res.json({ success: true, data: rows, sqlLog });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Error fetching shift assignments',
      sqlLog: err.sqlLog,
    });
  }
});

/**
 * POST /api/shift-assignments
 * VIVA EXPLANATION:
 * Assigns an employee (`emp_id` FK) to a shift (`shift_id` FK) from `start_date`
 * to `end_date`. Enforces both application-level and SQL CHECK constraint that
 * `end_date >= start_date`.
 */
router.post('/', async (req, res) => {
  try {
    const { emp_id, shift_id, start_date, end_date } = req.body;

    if (!emp_id || !shift_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Employee, Shift, Start Date, and End Date are all required.',
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

    const sql = `
      INSERT INTO Shift_Assignment (emp_id, shift_id, start_date, end_date)
      VALUES (?, ?, ?, ?)
    `;
    const params = [Number(emp_id), Number(shift_id), start_date, end_date];

    const { rows, sqlLog } = await executeQuery(
      sql,
      params,
      'Insert new Shift_Assignment row linking Employee and Shift'
    );

    res.status(201).json({
      success: true,
      message: 'Shift assignment created successfully.',
      insertId: rows.insertId,
      sqlLog,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to create shift assignment',
      sqlLog: err.sqlLog,
    });
  }
});

/**
 * DELETE /api/shift-assignments/:id
 * VIVA EXPLANATION:
 * Deletes a shift assignment row by primary key `assignment_id = ?`.
 */
router.delete('/:id', async (req, res) => {
  try {
    const assignmentId = Number(req.params.id);
    if (!assignmentId) {
      return res.status(400).json({ success: false, message: 'Invalid assignment ID' });
    }

    const sql = `DELETE FROM Shift_Assignment WHERE assignment_id = ?`;
    const { rows, sqlLog } = await executeQuery(
      sql,
      [assignmentId],
      `Delete Shift_Assignment record where assignment_id = ${assignmentId}`
    );

    if (rows.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: `Shift Assignment #${assignmentId} not found.`,
        sqlLog,
      });
    }

    res.json({
      success: true,
      message: `Shift Assignment #${assignmentId} deleted successfully.`,
      sqlLog,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete shift assignment',
      sqlLog: err.sqlLog,
    });
  }
});

export default router;
