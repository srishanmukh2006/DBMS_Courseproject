/**
 * ============================================================================
 * FILE: backend/server.js
 * PURPOSE: Express Application & REST API Entry Point
 * ============================================================================
 * VIVA EXPLANATION:
 * - Configures Express middleware (`cors()`, `express.json()`)
 * - Mounts modular route handlers for all 7 database entities plus Dashboard
 *   and Analytical Reports:
 *     /api/dashboard         -> Live KPI counts (Total Employees, Present Today, On Leave Today, Pending Leaves)
 *     /api/departments       -> Department table (GET, POST, DELETE)
 *     /api/employees         -> Employee table (GET, POST, DELETE)
 *     /api/shifts            -> Shift table (GET, POST, DELETE)
 *     /api/shift-assignments -> Shift_Assignment table (GET, POST, DELETE)
 *     /api/attendance        -> Attendance table (GET, POST, DELETE)
 *     /api/leave-types       -> Leave_Type table (GET, POST, DELETE)
 *     /api/leave-requests    -> Leave_Request table (GET, POST, PUT /:id/status, DELETE)
 *     /api/reports           -> Presentation-II Analytical Queries & Custom SELECT Runner
 * ============================================================================
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import dashboardRoutes from './routes/dashboard.js';
import departmentRoutes from './routes/departments.js';
import employeeRoutes from './routes/employees.js';
import shiftRoutes from './routes/shifts.js';
import shiftAssignmentRoutes from './routes/shiftAssignments.js';
import attendanceRoutes from './routes/attendance.js';
import leaveTypeRoutes from './routes/leaveTypes.js';
import leaveRequestRoutes from './routes/leaveRequests.js';
import reportRoutes from './routes/reports.js';
import { getQueryHistory, getDatabaseStatus } from './db.js';

dotenv.config();

export function createApiApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Mount REST API routes for each database entity
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/departments', departmentRoutes);
  app.use('/api/employees', employeeRoutes);
  app.use('/api/shifts', shiftRoutes);
  app.use('/api/shift-assignments', shiftAssignmentRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/leave-types', leaveTypeRoutes);
  app.use('/api/leave-requests', leaveRequestRoutes);
  app.use('/api/reports', reportRoutes);

  // Endpoint to fetch the rolling SQL Console query log
  app.get('/api/sql-history', (req, res) => {
    res.json({
      success: true,
      dbStatus: getDatabaseStatus(),
      history: getQueryHistory(),
    });
  });

  return app;
}

// Allow running `node backend/server.js` directly in local setup
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const app = createApiApp();
  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DBMS Backend Server listening on http://localhost:${PORT}`);
  });
}
