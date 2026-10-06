/**
 * ============================================================================
 * FILE: backend/routes/employees.js
 * PURPOSE: CRUD Operations for the `Employee` Table
 * ============================================================================
 * ENDPOINTS & SQL:
 *   1. GET    /api/employees     -> SELECT e.*, d.dept_name, d.dept_code FROM Employee e INNER JOIN Department d ON e.dept_id = d.dept_id
 *   2. POST   /api/employees     -> INSERT INTO Employee (first_name, last_name, email, phone, hire_date, designation, dept_id) VALUES (?, ?, ?, ?, ?, ?, ?)
 *   3. DELETE /api/employees/:id -> DELETE FROM Employee WHERE emp_id = ?
 * ============================================================================
 */

import express from 'express';
import { executeQuery } from '../db.js';

const router = express.Router();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/employees
 * VIVA EXPLANATION:
 * Performs an INNER JOIN between Employee and Department on `dept_id` so the UI
 * displays both the employee attributes and their human-readable department name.
 */
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT
        e.emp_id,
        e.first_name,
        e.last_name,
        e.email,
        e.phone,
        e.hire_date,
        e.designation,
        e.dept_id,
        d.dept_name,
        d.dept_code
      FROM Employee e
      INNER JOIN Department d ON e.dept_id = d.dept_id
      ORDER BY e.emp_id ASC
    `;
    const { rows, sqlLog } = await executeQuery(
      sql,
      [],
      'Fetch all employees joined with Department table (INNER JOIN on dept_id)'
    );
    res.json({ success: true, data: rows, sqlLog });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Error fetching employees',
      sqlLog: err.sqlLog,
    });
  }
});

/**
 * POST /api/employees
 * VIVA EXPLANATION:
 * Inserts a new Employee record with foreign key `dept_id` selected from the
 * Department dropdown. Validates required fields and YYYY-MM-DD hire_date format.
 */
router.post('/', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, hire_date, designation, dept_id } = req.body;

    if (
      !first_name?.trim() ||
      !last_name?.trim() ||
      !email?.trim() ||
      !phone?.trim() ||
      !hire_date ||
      !designation?.trim() ||
      !dept_id
    ) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: All employee fields (Name, Email, Phone, Hire Date, Designation, Department) are required.',
      });
    }

    if (!DATE_REGEX.test(hire_date)) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Hire Date must be in YYYY-MM-DD format.',
      });
    }

    const sql = `
      INSERT INTO Employee (first_name, last_name, email, phone, hire_date, designation, dept_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      first_name.trim(),
      last_name.trim(),
      email.trim().toLowerCase(),
      phone.trim(),
      hire_date,
      designation.trim(),
      Number(dept_id),
    ];

    const { rows, sqlLog } = await executeQuery(
      sql,
      params,
      'Insert new Employee row with foreign key dept_id'
    );

    res.status(201).json({
      success: true,
      message: `Employee "${first_name.trim()} ${last_name.trim()}" inserted successfully.`,
      insertId: rows.insertId,
      sqlLog,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate Entry: An employee with this email address already exists.',
        sqlLog: err.sqlLog,
      });
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
      return res.status(400).json({
        success: false,
        message: 'Foreign Key Error: Selected Department ID does not exist.',
        sqlLog: err.sqlLog,
      });
    }
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to insert employee',
      sqlLog: err.sqlLog,
    });
  }
});

/**
 * PUT /api/employees/:id
 * VIVA EXPLANATION:
 * Updates employee details (first_name, last_name, email, phone, hire_date, designation, dept_id)
 * by primary key (emp_id = ?). Uses a parameterized query to prevent SQL injection.
 * Validates required fields, date format, and checks that the department exists.
 */
router.put('/:id', async (req, res) => {
  try {
    const empId = Number(req.params.id);
    if (!empId) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID' });
    }

    const { first_name, last_name, email, phone, hire_date, designation, dept_id } = req.body;

    if (
      !first_name?.trim() ||
      !last_name?.trim() ||
      !email?.trim() ||
      !phone?.trim() ||
      !hire_date ||
      !designation?.trim() ||
      !dept_id
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Validation Error: All employee fields (Name, Email, Phone, Hire Date, Designation, Department) are required.',
      });
    }

    if (!DATE_REGEX.test(hire_date)) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Hire Date must be in YYYY-MM-DD format.',
      });
    }

    const sql = `
      UPDATE Employee
      SET first_name = ?, last_name = ?, email = ?, phone = ?, hire_date = ?, designation = ?, dept_id = ?
      WHERE emp_id = ?
    `;
    const params = [
      first_name.trim(),
      last_name.trim(),
      email.trim().toLowerCase(),
      phone.trim(),
      hire_date,
      designation.trim(),
      Number(dept_id),
      empId,
    ];

    const { rows, sqlLog } = await executeQuery(
      sql,
      params,
      `Update Employee #${empId} details using parameterized UPDATE query`
    );

    if (rows.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: `Employee #${empId} not found.`,
        sqlLog,
      });
    }

    res.json({
      success: true,
      message: `Employee #${empId} (${first_name.trim()} ${last_name.trim()}) updated successfully.`,
      sqlLog,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate Entry: Another employee with this email address already exists.',
        sqlLog: err.sqlLog,
      });
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
      return res.status(400).json({
        success: false,
        message: 'Foreign Key Error: Selected Department ID does not exist.',
        sqlLog: err.sqlLog,
      });
    }
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to update employee details',
      sqlLog: err.sqlLog,
    });
  }
});

/**
 * DELETE /api/employees/:id
 * VIVA EXPLANATION:
 * Deletes an employee by `emp_id`. If the employee is referenced in
 * `Attendance`, `Shift_Assignment`, or `Leave_Request`, the database blocks
 * deletion via FOREIGN KEY ... ON DELETE RESTRICT (errno 1451) and returns a
 * clear, user-friendly explanation.
 */
router.delete('/:id', async (req, res) => {
  try {
    const empId = Number(req.params.id);
    if (!empId) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID' });
    }

    const sql = `DELETE FROM Employee WHERE emp_id = ?`;
    const { rows, sqlLog } = await executeQuery(
      sql,
      [empId],
      `Delete Employee record where emp_id = ${empId}`
    );

    if (rows.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: `Employee #${empId} not found.`,
        sqlLog,
      });
    }

    res.json({
      success: true,
      message: `Employee #${empId} deleted successfully.`,
      sqlLog,
    });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
      return res.status(409).json({
        success: false,
        message:
          'This employee has attendance, shift assignment, or leave records and cannot be deleted (Foreign Key Constraint ON DELETE RESTRICT).',
        sqlLog: err.sqlLog,
      });
    }
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete employee',
      sqlLog: err.sqlLog,
    });
  }
});

export default router;
