/**
 * ============================================================================
 * FILE: backend/routes/leaveTypes.js
 * PURPOSE: CRUD Operations for the `Leave_Type` Table
 * ============================================================================
 * ENDPOINTS & SQL:
 *   1. GET    /api/leave-types     -> SELECT lt.*, COUNT(lr.leave_id) AS request_count FROM Leave_Type lt LEFT JOIN Leave_Request lr ...
 *   2. POST   /api/leave-types     -> INSERT INTO Leave_Type (leave_name, max_days_per_year, is_paid, description) VALUES (?, ?, ?, ?)
 *   3. DELETE /api/leave-types/:id -> DELETE FROM Leave_Type WHERE leave_type_id = ?
 * ============================================================================
 */

import express from 'express';
import { executeQuery } from '../db.js';

const router = express.Router();

/**
 * GET /api/leave-types
 * VIVA EXPLANATION:
 * Lists all Leave_Type rows along with the count of Leave_Request applications
 * referencing each type via LEFT JOIN.
 */
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT
        lt.leave_type_id,
        lt.leave_name,
        lt.max_days_per_year,
        lt.is_paid,
        lt.description,
        COUNT(lr.leave_id) AS request_count
      FROM Leave_Type lt
      LEFT JOIN Leave_Request lr ON lt.leave_type_id = lr.leave_type_id
      GROUP BY lt.leave_type_id, lt.leave_name, lt.max_days_per_year, lt.is_paid, lt.description
      ORDER BY lt.leave_type_id ASC
    `;
    const { rows, sqlLog } = await executeQuery(
      sql,
      [],
      'Fetch all Leave_Type categories with usage count via LEFT JOIN'
    );
    res.json({ success: true, data: rows, sqlLog });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Error fetching leave types',
      sqlLog: err.sqlLog,
    });
  }
});

/**
 * POST /api/leave-types
 * VIVA EXPLANATION:
 * Inserts a new Leave_Type category with annual quota `max_days_per_year` and
 * `is_paid` boolean flag.
 */
router.post('/', async (req, res) => {
  try {
    const { leave_name, max_days_per_year, is_paid, description } = req.body;

    if (!leave_name?.trim() || !max_days_per_year || !description?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Leave Name, Max Days Per Year, and Description are required.',
      });
    }

    const maxDays = Number(max_days_per_year);
    if (isNaN(maxDays) || maxDays <= 0 || maxDays > 365) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Max Days Per Year must be between 1 and 365.',
      });
    }

    const paidFlag = is_paid === false || is_paid === '0' || is_paid === 0 ? 0 : 1;

    const sql = `
      INSERT INTO Leave_Type (leave_name, max_days_per_year, is_paid, description)
      VALUES (?, ?, ?, ?)
    `;
    const params = [leave_name.trim(), maxDays, paidFlag, description.trim()];

    const { rows, sqlLog } = await executeQuery(
      sql,
      params,
      'Insert new Leave_Type row using parameterized query'
    );

    res.status(201).json({
      success: true,
      message: `Leave Type "${leave_name.trim()}" inserted successfully.`,
      insertId: rows.insertId,
      sqlLog,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate Entry: A leave type with this name already exists.',
        sqlLog: err.sqlLog,
      });
    }
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to insert leave type',
      sqlLog: err.sqlLog,
    });
  }
});

/**
 * DELETE /api/leave-types/:id
 * VIVA EXPLANATION:
 * Deletes a Leave_Type by `leave_type_id`. Blocked by Foreign Key constraint
 * (errno 1451) if any `Leave_Request` references this leave type.
 */
router.delete('/:id', async (req, res) => {
  try {
    const leaveTypeId = Number(req.params.id);
    if (!leaveTypeId) {
      return res.status(400).json({ success: false, message: 'Invalid leave type ID' });
    }

    const sql = `DELETE FROM Leave_Type WHERE leave_type_id = ?`;
    const { rows, sqlLog } = await executeQuery(
      sql,
      [leaveTypeId],
      `Delete Leave_Type record where leave_type_id = ${leaveTypeId}`
    );

    if (rows.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: `Leave Type #${leaveTypeId} not found.`,
        sqlLog,
      });
    }

    res.json({
      success: true,
      message: `Leave Type #${leaveTypeId} deleted successfully.`,
      sqlLog,
    });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
      return res.status(409).json({
        success: false,
        message:
          'This leave type is referenced by existing employee leave requests and cannot be deleted (Foreign Key Constraint).',
        sqlLog: err.sqlLog,
      });
    }
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete leave type',
      sqlLog: err.sqlLog,
    });
  }
});

export default router;
