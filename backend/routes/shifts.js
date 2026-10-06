/**
 * ============================================================================
 * FILE: backend/routes/shifts.js
 * PURPOSE: CRUD Operations for the `Shift` Table
 * ============================================================================
 * ENDPOINTS & SQL:
 *   1. GET    /api/shifts     -> SELECT s.*, COUNT(DISTINCT sa.emp_id) AS assigned_count FROM Shift s LEFT JOIN Shift_Assignment sa ...
 *   2. POST   /api/shifts     -> INSERT INTO Shift (shift_name, start_time, end_time, grace_mins) VALUES (?, ?, ?, ?)
 *   3. DELETE /api/shifts/:id -> DELETE FROM Shift WHERE shift_id = ?
 * ============================================================================
 */

import express from 'express';
import { executeQuery } from '../db.js';

const router = express.Router();

/**
 * GET /api/shifts
 * VIVA EXPLANATION:
 * Lists all work shifts and counts how many employees are assigned to each shift
 * using LEFT JOIN on Shift_Assignment.
 */
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT
        s.shift_id,
        s.shift_name,
        s.start_time,
        s.end_time,
        s.grace_mins,
        COUNT(DISTINCT sa.assignment_id) AS assignment_count
      FROM Shift s
      LEFT JOIN Shift_Assignment sa ON s.shift_id = sa.shift_id
      GROUP BY s.shift_id, s.shift_name, s.start_time, s.end_time, s.grace_mins
      ORDER BY s.shift_id ASC
    `;
    const { rows, sqlLog } = await executeQuery(
      sql,
      [],
      'Fetch all Shifts with active Shift_Assignment count via LEFT JOIN'
    );
    res.json({ success: true, data: rows, sqlLog });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Error fetching shifts',
      sqlLog: err.sqlLog,
    });
  }
});

/**
 * POST /api/shifts
 * VIVA EXPLANATION:
 * Inserts a new work shift with start_time, end_time, and grace_mins.
 */
router.post('/', async (req, res) => {
  try {
    const { shift_name, start_time, end_time, grace_mins } = req.body;

    if (!shift_name?.trim() || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Shift Name, Start Time, and End Time are required.',
      });
    }

    const graceVal = grace_mins !== undefined && grace_mins !== '' ? Number(grace_mins) : 15;
    if (isNaN(graceVal) || graceVal < 0 || graceVal > 120) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Grace Period must be between 0 and 120 minutes.',
      });
    }

    const normalizeTime = (t) => (t.length === 5 ? `${t}:00` : t);

    const sql = `
      INSERT INTO Shift (shift_name, start_time, end_time, grace_mins)
      VALUES (?, ?, ?, ?)
    `;
    const params = [
      shift_name.trim(),
      normalizeTime(start_time.trim()),
      normalizeTime(end_time.trim()),
      graceVal,
    ];

    const { rows, sqlLog } = await executeQuery(
      sql,
      params,
      'Insert new Shift record using parameterized query'
    );

    res.status(201).json({
      success: true,
      message: `Shift "${shift_name.trim()}" inserted successfully.`,
      insertId: rows.insertId,
      sqlLog,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate Entry: A shift with this name already exists.',
        sqlLog: err.sqlLog,
      });
    }
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to insert shift',
      sqlLog: err.sqlLog,
    });
  }
});

/**
 * DELETE /api/shifts/:id
 * VIVA EXPLANATION:
 * Deletes a Shift by `shift_id`. Blocked by Foreign Key constraint if the shift
 * is referenced in `Shift_Assignment` or `Attendance`.
 */
router.delete('/:id', async (req, res) => {
  try {
    const shiftId = Number(req.params.id);
    if (!shiftId) {
      return res.status(400).json({ success: false, message: 'Invalid shift ID' });
    }

    const sql = `DELETE FROM Shift WHERE shift_id = ?`;
    const { rows, sqlLog } = await executeQuery(
      sql,
      [shiftId],
      `Delete Shift record where shift_id = ${shiftId}`
    );

    if (rows.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: `Shift #${shiftId} not found.`,
        sqlLog,
      });
    }

    res.json({
      success: true,
      message: `Shift #${shiftId} deleted successfully.`,
      sqlLog,
    });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
      return res.status(409).json({
        success: false,
        message:
          'This shift is referenced in employee shift assignments or attendance records and cannot be deleted (Foreign Key Constraint).',
        sqlLog: err.sqlLog,
      });
    }
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete shift',
      sqlLog: err.sqlLog,
    });
  }
});

export default router;
