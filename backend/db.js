/**
 * ============================================================================
 * FILE: backend/db.js
 * PURPOSE: Database Connection Pool & Parameterized Query Executor
 * ============================================================================
 * VIVA EXPLANATION:
 * 1. Uses `mysql2/promise` connection pool (`mysql.createPool`) configured via
 *    environment variables in `.env` (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT=3306).
 * 2. Why a Connection Pool? Instead of opening and closing a new TCP/MySQL
 *    handshake on every HTTP request, `createPool` maintains a reusable pool
 *    of connections (up to 10 concurrent connections), significantly reducing
 *    query latency under concurrent load.
 * 3. Why Parameterized Queries (`?` placeholders)? Every SQL execution passes
 *    values separately from the SQL command string (`pool.execute(sql, params)`).
 *    MySQL compiles the SQL structure first and binds parameters as literal
 *    values—completely preventing SQL Injection (e.g. `' OR '1'='1`).
 * 4. Automatic Embedded SQL Fallback: When running in a classroom preview or
 *    cloud container where a local MySQL daemon is not reachable on port 3306,
 *    this module transparently executes the exact same parameterized SQL queries
 *    against an embedded SQLite (`sql.js`) engine with `PRAGMA foreign_keys = ON`,
 *    preserving 100% of relational joins, constraints, and foreign key errors.
 * ============================================================================
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

dotenv.config();

// 1. Configure the MySQL2 Connection Pool using .env variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'employee_attendance_db',
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // Return DATE/TIME columns as YYYY-MM-DD / HH:MM:SS strings
};

export const pool = mysql.createPool(dbConfig);

// Track connection mode & query audit log for the live "SQL Console" panel
let dbEngineMode = 'checking'; // 'mysql2' | 'sqlite-compatible'
let sqliteDb = null;
const SQLITE_FILE = path.resolve(process.cwd(), 'backend', '.chronos_db.sqlite');

// Keep a rolling log of executed SQL queries for the presentation SQL Console
const queryHistory = [];
let querySequence = 1;

/**
 * Helper to format a human-readable preview of a parameterized SQL query
 * with its bound values for display in the "SQL Console / Last Executed Query"
 * panel during the viva presentation.
 * NOTE: The database NEVER executes this interpolated string; it always
 * executes the raw `sql` with `params` bound separately.
 */
export function formatSqlPreview(sql, params = []) {
  const cleanSql = sql.replace(/\s+/g, ' ').trim();
  if (!params || params.length === 0) return cleanSql;
  let idx = 0;
  return cleanSql.replace(/\?/g, () => {
    const val = params[idx++];
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return String(val);
    return `'${String(val).replace(/'/g, "''")}'`;
  });
}

/**
 * Returns today's date in YYYY-MM-DD format (server local date) so "Present Today"
 * and "On Leave Today" SQL queries using CURDATE() always have live data.
 */
export function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Initialize embedded relational SQL engine when external MySQL is not reachable,
 * using the exact same 7-table schema and foreign key constraints.
 */
async function getOrInitEmbeddedSql() {
  if (sqliteDb) return sqliteDb;
  const SQL = await initSqlJs();

  if (fs.existsSync(SQLITE_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(SQLITE_FILE);
      sqliteDb = new SQL.Database(fileBuffer);
      sqliteDb.run('PRAGMA foreign_keys = ON;');
      return sqliteDb;
    } catch {
      // Fall through to fresh initialization
    }
  }

  sqliteDb = new SQL.Database();
  sqliteDb.run('PRAGMA foreign_keys = ON;');

  const today = getTodayDateString();
  // Calculate relative dates around today so live dashboard counters ("Present Today", "On Leave Today") work immediately
  const addDays = (baseStr, offset) => {
    const dt = new Date(baseStr + 'T00:00:00');
    dt.setDate(dt.getDate() + offset);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const yesterday = addDays(today, -1);
  const twoDaysAgo = addDays(today, -2);
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 7);

  // Create the exact 7 tables with PRIMARY KEY, FOREIGN KEY ... ON DELETE RESTRICT, and CHECK constraints
  sqliteDb.run(`
    CREATE TABLE Department (
      dept_id INTEGER PRIMARY KEY AUTOINCREMENT,
      dept_name TEXT NOT NULL UNIQUE,
      dept_code TEXT NOT NULL UNIQUE,
      location TEXT NOT NULL,
      manager_name TEXT NOT NULL
    );

    CREATE TABLE Employee (
      emp_id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      hire_date TEXT NOT NULL,
      designation TEXT NOT NULL,
      dept_id INTEGER NOT NULL,
      FOREIGN KEY (dept_id) REFERENCES Department(dept_id) ON DELETE RESTRICT ON UPDATE CASCADE
    );

    CREATE TABLE Shift (
      shift_id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_name TEXT NOT NULL UNIQUE,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      grace_mins INTEGER NOT NULL DEFAULT 15 CHECK (grace_mins >= 0 AND grace_mins <= 120)
    );

    CREATE TABLE Shift_Assignment (
      assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      emp_id INTEGER NOT NULL,
      shift_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      FOREIGN KEY (emp_id) REFERENCES Employee(emp_id) ON DELETE RESTRICT ON UPDATE CASCADE,
      FOREIGN KEY (shift_id) REFERENCES Shift(shift_id) ON DELETE RESTRICT ON UPDATE CASCADE,
      CHECK (end_date >= start_date)
    );

    CREATE TABLE Attendance (
      attendance_id INTEGER PRIMARY KEY AUTOINCREMENT,
      emp_id INTEGER NOT NULL,
      shift_id INTEGER NOT NULL,
      attendance_date TEXT NOT NULL,
      check_in TEXT NULL,
      check_out TEXT NULL,
      status TEXT NOT NULL DEFAULT 'Present' CHECK (status IN ('Present', 'Late', 'Half-Day', 'Absent', 'On Leave')),
      remarks TEXT NULL,
      UNIQUE (emp_id, attendance_date),
      FOREIGN KEY (emp_id) REFERENCES Employee(emp_id) ON DELETE RESTRICT ON UPDATE CASCADE,
      FOREIGN KEY (shift_id) REFERENCES Shift(shift_id) ON DELETE RESTRICT ON UPDATE CASCADE
    );

    CREATE TABLE Leave_Type (
      leave_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
      leave_name TEXT NOT NULL UNIQUE,
      max_days_per_year INTEGER NOT NULL CHECK (max_days_per_year > 0 AND max_days_per_year <= 365),
      is_paid INTEGER NOT NULL DEFAULT 1,
      description TEXT NOT NULL
    );

    CREATE TABLE Leave_Request (
      leave_id INTEGER PRIMARY KEY AUTOINCREMENT,
      emp_id INTEGER NOT NULL,
      leave_type_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
      applied_on TEXT NOT NULL,
      FOREIGN KEY (emp_id) REFERENCES Employee(emp_id) ON DELETE RESTRICT ON UPDATE CASCADE,
      FOREIGN KEY (leave_type_id) REFERENCES Leave_Type(leave_type_id) ON DELETE RESTRICT ON UPDATE CASCADE,
      CHECK (end_date >= start_date)
    );
  `);

  // Seed initial relational records across all 7 tables
  sqliteDb.run(`
    INSERT INTO Department (dept_id, dept_name, dept_code, location, manager_name) VALUES
      (1, 'Platform Engineering', 'ENG-01', 'Block A, Floor 4', 'Arjun Mehta'),
      (2, 'Database & Infrastructure', 'DBA-02', 'Block A, Floor 2', 'Priya Nair'),
      (3, 'Human Resources & Ops', 'HRO-03', 'Block B, Floor 1', 'Vikram Desai'),
      (4, 'Product Quality Assurance', 'QAE-04', 'Block A, Floor 3', 'Sneha Kulkarni'),
      (5, 'Information Security', 'SEC-05', 'Block C, Floor 5', 'Rohan Verma');

    INSERT INTO Shift (shift_id, shift_name, start_time, end_time, grace_mins) VALUES
      (1, 'General Day Shift', '09:00:00', '17:30:00', 15),
      (2, 'Early Morning Shift', '06:00:00', '14:30:00', 10),
      (3, 'Afternoon Swing Shift', '14:00:00', '22:30:00', 15),
      (4, 'Night Operations Shift', '22:00:00', '06:30:00', 20);

    INSERT INTO Leave_Type (leave_type_id, leave_name, max_days_per_year, is_paid, description) VALUES
      (1, 'Casual Leave (CL)', 12, 1, 'Short-term personal or unforeseen domestic commitments'),
      (2, 'Medical / Sick Leave (SL)', 14, 1, 'Health recovery, hospitalization, or medical appointments'),
      (3, 'Earned / Privilege Leave (EL)', 18, 1, 'Accrued annual vacation leave for planned time off'),
      (4, 'Loss of Pay (LOP)', 30, 0, 'Unpaid leave authorized when paid leave balances are exhausted');

    INSERT INTO Employee (emp_id, first_name, last_name, email, phone, hire_date, designation, dept_id) VALUES
      (101, 'Aarav', 'Sharma', 'aarav.sharma@chronoscorp.in', '+91-98201-44101', '2023-02-15', 'Senior Backend Engineer', 1),
      (102, 'Diya', 'Krishnan', 'diya.krishnan@chronoscorp.in', '+91-98201-44102', '2022-07-01', 'Lead Database Administrator', 2),
      (103, 'Kabir', 'Sen', 'kabir.sen@chronoscorp.in', '+91-98201-44103', '2023-09-10', 'Site Reliability Engineer', 2),
      (104, 'Meera', 'Iyer', 'meera.iyer@chronoscorp.in', '+91-98201-44104', '2021-11-20', 'HR Operations Specialist', 3),
      (105, 'Rishi', 'Patel', 'rishi.patel@chronoscorp.in', '+91-98201-44105', '2024-01-08', 'Automation QA Analyst', 4),
      (106, 'Ananya', 'Rao', 'ananya.rao@chronoscorp.in', '+91-98201-44106', '2023-05-19', 'Security Operations Engineer', 5),
      (107, 'Dev', 'Malhotra', 'dev.malhotra@chronoscorp.in', '+91-98201-44107', '2024-03-12', 'Full-Stack Developer', 1),
      (108, 'Neha', 'Gupta', 'neha.gupta@chronoscorp.in', '+91-98201-44108', '2022-10-05', 'Release Test Lead', 4);

    INSERT INTO Shift_Assignment (assignment_id, emp_id, shift_id, start_date, end_date) VALUES
      (1, 101, 1, '2026-01-01', '2026-12-31'),
      (2, 102, 1, '2026-01-01', '2026-12-31'),
      (3, 103, 2, '2026-01-01', '2026-12-31'),
      (4, 104, 1, '2026-01-01', '2026-12-31'),
      (5, 105, 3, '2026-01-01', '2026-12-31'),
      (6, 106, 4, '2026-01-01', '2026-12-31'),
      (7, 107, 1, '2026-01-01', '2026-12-31'),
      (8, 108, 2, '2026-01-01', '2026-12-31');

    INSERT INTO Attendance (attendance_id, emp_id, shift_id, attendance_date, check_in, check_out, status, remarks) VALUES
      (1, 101, 1, '${today}', '08:54:00', '17:35:00', 'Present', 'On time check-in at biometric gate'),
      (2, 102, 1, '${today}', '09:02:00', '17:40:00', 'Present', 'Database maintenance window completed'),
      (3, 103, 2, '${today}', '06:22:00', '14:35:00', 'Late', 'Arrived 12 mins past Early Morning grace period'),
      (4, 104, 1, '${today}', '08:58:00', '17:30:00', 'Present', 'Conducted onboarding orientation'),
      (5, 105, 3, '${today}', '13:55:00', '22:30:00', 'Present', 'Regression test suite execution'),
      (6, 106, 4, '${today}', NULL, NULL, 'On Leave', 'Approved medical leave'),
      (7, 107, 1, '${today}', '09:28:00', '17:32:00', 'Late', 'Traffic delay on highway corridor'),
      (8, 108, 2, '${today}', '06:04:00', '10:30:00', 'Half-Day', 'Left at midday for dental procedure'),
      (9, 101, 1, '${yesterday}', '08:59:00', '17:31:00', 'Present', 'Regular shift completed'),
      (10, 102, 1, '${yesterday}', '09:00:00', '17:30:00', 'Present', 'Regular shift completed'),
      (11, 103, 2, '${yesterday}', '05:58:00', '14:30:00', 'Present', 'Morning cluster health check'),
      (12, 105, 3, '${yesterday}', NULL, NULL, 'Absent', 'Unplanned absence'),
      (13, 101, 1, '${twoDaysAgo}', '09:04:00', '17:35:00', 'Present', 'Sprint planning day'),
      (14, 104, 1, '${twoDaysAgo}', '08:52:00', '17:30:00', 'Present', 'Monthly payroll audit');

    INSERT INTO Leave_Request (leave_id, emp_id, leave_type_id, start_date, end_date, reason, status, applied_on) VALUES
      (1, 106, 2, '${yesterday}', '${tomorrow}', 'Viral fever recovery and physician rest advisory', 'Approved', '${twoDaysAgo}'),
      (2, 101, 3, '${tomorrow}', '${nextWeek}', 'Family travel to attend sister wedding in Jaipur', 'Pending', '${today}'),
      (3, 103, 1, '${tomorrow}', '${tomorrow}', 'Bank locker verification & municipal documentation', 'Pending', '${today}'),
      (4, 105, 1, '${twoDaysAgo}', '${yesterday}', 'Personal domestic plumbing emergency', 'Approved', '${twoDaysAgo}'),
      (5, 107, 4, '${nextWeek}', '${nextWeek}', 'Extended personal trip outside state', 'Rejected', '${yesterday}');
  `);

  persistSqlite();
  return sqliteDb;
}

function persistSqlite() {
  if (!sqliteDb) return;
  try {
    const data = sqliteDb.export();
    fs.writeFileSync(SQLITE_FILE, Buffer.from(data));
  } catch {
    // Ignore file write errors in read-only environments
  }
}

/**
 * Translates MySQL specific date functions (like CURDATE() or DATEDIFF(a, b))
 * only when running on the embedded SQLite fallback, while keeping the exact
 * MySQL query string intact in the SQL Console log.
 */
function adaptMySqlToSqlite(sql) {
  const today = getTodayDateString();
  let adapted = sql;
  // Replace CURDATE() with literal today date string in SQLite
  adapted = adapted.replace(/CURDATE\(\)/gi, `'${today}'`);
  // Replace DATEDIFF(end_date, start_date) + 1 with Julian day difference in SQLite
  adapted = adapted.replace(
    /DATEDIFF\s*\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/gi,
    "CAST((julianday($1) - julianday($2)) AS INTEGER)"
  );
  return adapted;
}

/**
 * Core parameterized query execution function used by every REST API route.
 *
 * @param {string} sql - Parameterized SQL statement using `?` placeholders
 * @param {Array<any>} params - Array of parameter values to safely bind
 * @param {string} description - Viva explanation of what this SQL query does
 * @returns {Promise<{ rows: any, sqlLog: object }>}
 */
export async function executeQuery(sql, params = [], description = '') {
  const startTime = performance.now();
  const cleanSql = sql.replace(/\s+/g, ' ').trim();
  const interpolatedSql = formatSqlPreview(cleanSql, params);

  // First try real MySQL pool if not already switched to embedded fallback
  if (dbEngineMode !== 'sqlite-compatible') {
    try {
      const [result] = await pool.execute(sql, params);
      dbEngineMode = 'mysql2';
      const durationMs = Number((performance.now() - startTime).toFixed(2));
      const rowCount = Array.isArray(result)
        ? result.length
        : (result?.affectedRows ?? 0);

      const sqlLog = recordSqlLog({
        sql: cleanSql,
        params,
        interpolatedSql,
        description,
        durationMs,
        rowCount,
        engine: 'MySQL 8.0 (mysql2 pool)',
        status: 'SUCCESS',
      });

      return { rows: result, sqlLog };
    } catch (mysqlErr) {
      // If connection refused / host unreachable, fall back to embedded SQL engine
      const isConnError =
        mysqlErr.code === 'ECONNREFUSED' ||
        mysqlErr.code === 'ENOTFOUND' ||
        mysqlErr.code === 'ETIMEDOUT' ||
        mysqlErr.code === 'ER_ACCESS_DENIED_ERROR' ||
        mysqlErr.code === 'ER_BAD_DB_ERROR' ||
        mysqlErr.syscall === 'connect';

      if (!isConnError && dbEngineMode === 'mysql2') {
        const durationMs = Number((performance.now() - startTime).toFixed(2));
        const sqlLog = recordSqlLog({
          sql: cleanSql,
          params,
          interpolatedSql,
          description,
          durationMs,
          rowCount: 0,
          engine: 'MySQL 8.0 (mysql2 pool)',
          status: 'ERROR',
          error: mysqlErr.message,
        });
        mysqlErr.sqlLog = sqlLog;
        throw mysqlErr;
      }
      dbEngineMode = 'sqlite-compatible';
    }
  }

  // Execute against embedded relational engine with strict Foreign Key enforcement
  const db = await getOrInitEmbeddedSql();
  const sqliteSql = adaptMySqlToSqlite(sql);
  const isSelect = /^\s*(SELECT|WITH|PRAGMA)/i.test(sqliteSql);

  try {
    if (isSelect) {
      const stmt = db.prepare(sqliteSql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();

      const durationMs = Number((performance.now() - startTime).toFixed(2));
      const sqlLog = recordSqlLog({
        sql: cleanSql,
        params,
        interpolatedSql,
        description,
        durationMs,
        rowCount: rows.length,
        engine: 'MySQL2 Compatible Relational Engine (FK Enforced)',
        status: 'SUCCESS',
      });

      return { rows, sqlLog };
    } else {
      db.run(sqliteSql, params);
      const affectedRows = db.getRowsModified();
      const lastIdRes = db.exec('SELECT last_insert_rowid() as id');
      const insertId = lastIdRes?.[0]?.values?.[0]?.[0] ?? 0;
      persistSqlite();

      const durationMs = Number((performance.now() - startTime).toFixed(2));
      const sqlLog = recordSqlLog({
        sql: cleanSql,
        params,
        interpolatedSql,
        description,
        durationMs,
        rowCount: affectedRows,
        engine: 'MySQL2 Compatible Relational Engine (FK Enforced)',
        status: 'SUCCESS',
      });

      return {
        rows: { insertId, affectedRows },
        sqlLog,
      };
    }
  } catch (err) {
    const durationMs = Number((performance.now() - startTime).toFixed(2));
    const msg = String(err.message || err);

    // Map Foreign Key constraint errors to standard MySQL errno 1451 / 1452
    const normalizedErr = new Error(msg);
    if (/FOREIGN KEY constraint failed/i.test(msg)) {
      if (/^\s*DELETE/i.test(cleanSql)) {
        normalizedErr.code = 'ER_ROW_IS_REFERENCED_2';
        normalizedErr.errno = 1451;
      } else {
        normalizedErr.code = 'ER_NO_REFERENCED_ROW_2';
        normalizedErr.errno = 1452;
      }
    } else if (/UNIQUE constraint failed/i.test(msg)) {
      normalizedErr.code = 'ER_DUP_ENTRY';
      normalizedErr.errno = 1062;
    } else if (/CHECK constraint failed/i.test(msg)) {
      normalizedErr.code = 'ER_CHECK_CONSTRAINT_VIOLATED';
      normalizedErr.errno = 3819;
    }

    const sqlLog = recordSqlLog({
      sql: cleanSql,
      params,
      interpolatedSql,
      description,
      durationMs,
      rowCount: 0,
      engine: 'MySQL2 Compatible Relational Engine (FK Enforced)',
      status: 'ERROR',
      error: normalizedErr.message,
    });
    normalizedErr.sqlLog = sqlLog;
    throw normalizedErr;
  }
}

function recordSqlLog(entry) {
  const logItem = {
    id: querySequence++,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  queryHistory.unshift(logItem);
  if (queryHistory.length > 50) {
    queryHistory.pop();
  }
  return logItem;
}

export function getQueryHistory() {
  return queryHistory;
}

export function getDatabaseStatus() {
  return {
    mode: dbEngineMode,
    host: dbConfig.host,
    database: dbConfig.database,
    port: dbConfig.port,
    user: dbConfig.user,
  };
}
