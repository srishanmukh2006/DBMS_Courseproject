/**
 * ============================================================================
 * FILE: backend/routes/departments.js
 * PURPOSE: CRUD Operations for the `Department` Table
 * ============================================================================
 * ENDPOINTS & SQL:
 *   1. GET    /api/departments     -> SELECT d.*, COUNT(e.emp_id) FROM Department d LEFT JOIN Employee e ...
 *   2. POST   /api/departments     -> INSERT INTO Department (dept_name, dept_code, location, manager_name) VALUES (?, ?, ?, ?)
 *   3. DELETE /api/departments/:id -> DELETE FROM Department WHERE dept_id = ?
 * ============================================================================
 */

import express from 'express';
import { executeQuery } from '../db.js';

const router = express.Router();

/**
 * GET /api/departments
 * VIVA EXPLANATION:
 * Retrieves all departments along with a dynamic employee headcount using a
 * LEFT JOIN with Employee and GROUP BY Department columns. Using LEFT JOIN
 * ensures newly inserted departments with 0 employees still appear in the view.
 */
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT
        d.dept_id,
        d.dept_name,
        d.dept_code,
        d.location,
        d.manager_name,
        COUNT(e.emp_id) AS employee_count
      FROM Department d
      LEFT JOIN Employee e ON d.dept_id = e.dept_id
      GROUP BY d.dept_id, d.dept_name, d.dept_code, d.location, d.manager_name
      ORDER BY d.dept_id ASC
    `;
    const { rows, sqlLog } = await executeQuery(
      sql,
      [],
      'Retrieve all departments with employee headcount via LEFT JOIN and GROUP BY'
    );
    res.json({ success: true, data: rows, sqlLog });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Error fetching departments',
      sqlLog: err.sqlLog,
    });
  }
});

/**
 * POST /api/departments
 * VIVA EXPLANATION:
 * Inserts a new department record using parameterized placeholders (?, ?, ?, ?).
 * Validates that dept_name, dept_code, location, and manager_name are non-empty.
 */
router.post('/', async (req, res) => {
  try {
    const { dept_name, dept_code, location, manager_name } = req.body;

    if (!dept_name?.trim() || !dept_code?.trim() || !location?.trim() || !manager_name?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Department Name, Code, Location, and Manager Name are all required.',
      });
    }

    const sql = `
      INSERT INTO Department (dept_name, dept_code, location, manager_name)
      VALUES (?, ?, ?, ?)
    `;
    const params = [
      dept_name.trim(),
      dept_code.trim().toUpperCase(),
      location.trim(),
      manager_name.trim(),
    ];

    const { rows, sqlLog } = await executeQuery(
      sql,
      params,
      'Insert a new Department row using parameterized query'
    );

    res.status(201).json({
      success: true,
      message: `Department "${dept_name.trim()}" inserted successfully.`,
      insertId: rows.insertId,
      sqlLog,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate Entry: A department with this Name or Code already exists.',
        sqlLog: err.sqlLog,
      });
    }
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to insert department',
      sqlLog: err.sqlLog,
    });
  }
});

/**
 * DELETE /api/departments/:id
 * VIVA EXPLANATION:
 * Attempts to delete a department by primary key (dept_id = ?).
 * Because Employee(dept_id) has FOREIGN KEY ... ON DELETE RESTRICT, MySQL throws
 * errno 1451 (ER_ROW_IS_REFERENCED_2) if any Employee belongs to this department.
 * We catch this and return a user-friendly referential integrity message.
 */
router.delete('/:id', async (req, res) => {
  try {
    const deptId = Number(req.params.id);
    if (!deptId) {
      return res.status(400).json({ success: false, message: 'Invalid department ID' });
    }

    const sql = `DELETE FROM Department WHERE dept_id = ?`;
    const { rows, sqlLog } = await executeQuery(
      sql,
      [deptId],
      `Delete Department record where dept_id = ${deptId}`
    );

    if (rows.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: `Department #${deptId} not found.`,
        sqlLog,
      });
    }

    res.json({
      success: true,
      message: `Department #${deptId} deleted successfully.`,
      sqlLog,
    });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
      return res.status(409).json({
        success: false,
        message:
          'Foreign Key Constraint (ON DELETE RESTRICT): This department has assigned employees and cannot be deleted. Reassign or remove its employees first.',
        sqlLog: err.sqlLog,
      });
    }
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete department',
      sqlLog: err.sqlLog,
    });
  }
});

export default router;
