import React, { useState } from 'react';
import { BookOpen, Copy, Check, ShieldCheck, Database, Server } from 'lucide-react';

const API_ENDPOINTS_LIST = [
  {
    method: 'GET',
    endpoint: '/api/dashboard',
    table: 'Employee, Attendance, Leave_Request',
    sql: `SELECT (SELECT COUNT(*) FROM Employee) AS total_employees, (SELECT COUNT(*) FROM Attendance WHERE attendance_date = ? AND status IN ('Present','Late','Half-Day')) AS present_today, ...`,
    purpose: 'Live SQL aggregate KPI counts for Dashboard + Today Attendance & Pending Leaves.',
  },
  {
    method: 'GET',
    endpoint: '/api/departments',
    table: 'Department ⟕ Employee',
    sql: `SELECT d.dept_id, d.dept_name, d.dept_code, d.location, d.manager_name, COUNT(e.emp_id) AS employee_count FROM Department d LEFT JOIN Employee e ON d.dept_id = e.dept_id GROUP BY d.dept_id, ... ORDER BY d.dept_id ASC`,
    purpose: 'Lists all departments with employee headcount via LEFT JOIN.',
  },
  {
    method: 'POST',
    endpoint: '/api/departments',
    table: 'Department',
    sql: `INSERT INTO Department (dept_name, dept_code, location, manager_name) VALUES (?, ?, ?, ?)`,
    purpose: 'Inserts a new department using parameterized placeholders.',
  },
  {
    method: 'DELETE',
    endpoint: '/api/departments/:id',
    table: 'Department',
    sql: `DELETE FROM Department WHERE dept_id = ?`,
    purpose: 'Deletes a department by ID. Blocked by ON DELETE RESTRICT (errno 1451) if employees exist.',
  },
  {
    method: 'GET',
    endpoint: '/api/employees',
    table: 'Employee ⋈ Department',
    sql: `SELECT e.*, d.dept_name, d.dept_code FROM Employee e INNER JOIN Department d ON e.dept_id = d.dept_id ORDER BY e.emp_id ASC`,
    purpose: 'Lists all employees joined with their Department name and code.',
  },
  {
    method: 'POST',
    endpoint: '/api/employees',
    table: 'Employee',
    sql: `INSERT INTO Employee (first_name, last_name, email, phone, hire_date, designation, dept_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    purpose: 'Inserts a new employee linked to Department(dept_id).',
  },
  {
    method: 'PUT',
    endpoint: '/api/employees/:id',
    table: 'Employee',
    sql: `UPDATE Employee SET first_name = ?, last_name = ?, email = ?, phone = ?, hire_date = ?, designation = ?, dept_id = ? WHERE emp_id = ?`,
    purpose: 'Updates employee names, designation, contact details, hire date, and department by emp_id.',
  },
  {
    method: 'DELETE',
    endpoint: '/api/employees/:id',
    table: 'Employee',
    sql: `DELETE FROM Employee WHERE emp_id = ?`,
    purpose: 'Deletes an employee. Blocked by Foreign Key constraint if attendance/shift/leave records exist.',
  },
  {
    method: 'GET',
    endpoint: '/api/shifts',
    table: 'Shift ⟕ Shift_Assignment',
    sql: `SELECT s.*, COUNT(DISTINCT sa.assignment_id) AS assignment_count FROM Shift s LEFT JOIN Shift_Assignment sa ON s.shift_id = sa.shift_id GROUP BY s.shift_id, ...`,
    purpose: 'Lists all work shifts and active employee assignment counts.',
  },
  {
    method: 'POST',
    endpoint: '/api/shifts',
    table: 'Shift',
    sql: `INSERT INTO Shift (shift_name, start_time, end_time, grace_mins) VALUES (?, ?, ?, ?)`,
    purpose: 'Creates a new work shift with start/end time and grace period.',
  },
  {
    method: 'DELETE',
    endpoint: '/api/shifts/:id',
    table: 'Shift',
    sql: `DELETE FROM Shift WHERE shift_id = ?`,
    purpose: 'Deletes a shift by ID. Blocked if referenced in Shift_Assignment or Attendance.',
  },
  {
    method: 'GET',
    endpoint: '/api/shift-assignments',
    table: 'Shift_Assignment ⋈ Employee ⋈ Shift',
    sql: `SELECT sa.*, e.first_name, e.last_name, d.dept_name, s.shift_name, s.start_time, s.end_time FROM Shift_Assignment sa INNER JOIN Employee e ON sa.emp_id = e.emp_id INNER JOIN Department d ON e.dept_id = d.dept_id INNER JOIN Shift s ON sa.shift_id = s.shift_id`,
    purpose: 'Joined view of employee shift assignments with shift timings.',
  },
  {
    method: 'POST',
    endpoint: '/api/shift-assignments',
    table: 'Shift_Assignment',
    sql: `INSERT INTO Shift_Assignment (emp_id, shift_id, start_date, end_date) VALUES (?, ?, ?, ?)`,
    purpose: 'Assigns an employee to a shift for a validated date range (end_date >= start_date).',
  },
  {
    method: 'DELETE',
    endpoint: '/api/shift-assignments/:id',
    table: 'Shift_Assignment',
    sql: `DELETE FROM Shift_Assignment WHERE assignment_id = ?`,
    purpose: 'Deletes a shift assignment by assignment_id.',
  },
  {
    method: 'GET',
    endpoint: '/api/attendance',
    table: 'Attendance ⋈ Employee ⋈ Department ⋈ Shift',
    sql: `SELECT a.*, e.first_name, e.last_name, d.dept_name, s.shift_name, s.start_time, s.end_time FROM Attendance a INNER JOIN Employee e ON a.emp_id = e.emp_id INNER JOIN Department d ON e.dept_id = d.dept_id INNER JOIN Shift s ON a.shift_id = s.shift_id ORDER BY a.attendance_date DESC`,
    purpose: '4-table joined view of daily attendance records.',
  },
  {
    method: 'POST',
    endpoint: '/api/attendance',
    table: 'Attendance',
    sql: `INSERT INTO Attendance (emp_id, shift_id, attendance_date, check_in, check_out, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    purpose: 'Marks daily attendance. Enforces UNIQUE(emp_id, attendance_date).',
  },
  {
    method: 'DELETE',
    endpoint: '/api/attendance/:id',
    table: 'Attendance',
    sql: `DELETE FROM Attendance WHERE attendance_id = ?`,
    purpose: 'Deletes an attendance log by attendance_id.',
  },
  {
    method: 'GET',
    endpoint: '/api/leave-types',
    table: 'Leave_Type ⟕ Leave_Request',
    sql: `SELECT lt.*, COUNT(lr.leave_id) AS request_count FROM Leave_Type lt LEFT JOIN Leave_Request lr ON lt.leave_type_id = lr.leave_type_id GROUP BY lt.leave_type_id, ...`,
    purpose: 'Lists all leave types and count of linked leave applications.',
  },
  {
    method: 'POST',
    endpoint: '/api/leave-types',
    table: 'Leave_Type',
    sql: `INSERT INTO Leave_Type (leave_name, max_days_per_year, is_paid, description) VALUES (?, ?, ?, ?)`,
    purpose: 'Creates a new leave category with annual quota.',
  },
  {
    method: 'DELETE',
    endpoint: '/api/leave-types/:id',
    table: 'Leave_Type',
    sql: `DELETE FROM Leave_Type WHERE leave_type_id = ?`,
    purpose: 'Deletes a leave type. Blocked if referenced by any Leave_Request.',
  },
  {
    method: 'GET',
    endpoint: '/api/leave-requests',
    table: 'Leave_Request ⋈ Employee ⋈ Department ⋈ Leave_Type',
    sql: `SELECT lr.*, e.first_name, e.last_name, d.dept_name, lt.leave_name, (DATEDIFF(lr.end_date, lr.start_date) + 1) AS total_days FROM Leave_Request lr INNER JOIN Employee e ... INNER JOIN Leave_Type lt ...`,
    purpose: 'Joined view of leave applications with calculated duration in days.',
  },
  {
    method: 'POST',
    endpoint: '/api/leave-requests',
    table: 'Leave_Request',
    sql: `INSERT INTO Leave_Request (emp_id, leave_type_id, start_date, end_date, reason, status, applied_on) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    purpose: 'Submits a new leave application (validates end_date >= start_date).',
  },
  {
    method: 'PUT',
    endpoint: '/api/leave-requests/:id/status',
    table: 'Leave_Request',
    sql: `UPDATE Leave_Request SET status = ? WHERE leave_id = ?`,
    purpose: 'Approves or Rejects a leave request via parameterized UPDATE.',
  },
  {
    method: 'DELETE',
    endpoint: '/api/leave-requests/:id',
    table: 'Leave_Request',
    sql: `DELETE FROM Leave_Request WHERE leave_id = ?`,
    purpose: 'Deletes a leave request record by leave_id.',
  },
  {
    method: 'GET',
    endpoint: '/api/reports',
    table: 'Multi-Table Analytical Joins',
    sql: `SELECT e.emp_id, COUNT(a.attendance_id), SUM(CASE WHEN a.status='Present' THEN 1 ELSE 0 END) ... GROUP BY e.emp_id`,
    purpose: 'Executes Presentation-II analytical queries, employee attendance summary & department leave counts.',
  },
];

const DDL_SCHEMA = `CREATE DATABASE IF NOT EXISTS employee_attendance_db;
USE employee_attendance_db;

CREATE TABLE Department (
    dept_id INT AUTO_INCREMENT PRIMARY KEY,
    dept_name VARCHAR(100) NOT NULL UNIQUE,
    dept_code VARCHAR(20) NOT NULL UNIQUE,
    location VARCHAR(100) NOT NULL,
    manager_name VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE Employee (
    emp_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(60) NOT NULL,
    last_name VARCHAR(60) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    hire_date DATE NOT NULL,
    designation VARCHAR(80) NOT NULL,
    dept_id INT NOT NULL,
    CONSTRAINT fk_employee_dept FOREIGN KEY (dept_id)
        REFERENCES Department(dept_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Shift (
    shift_id INT AUTO_INCREMENT PRIMARY KEY,
    shift_name VARCHAR(60) NOT NULL UNIQUE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_mins INT NOT NULL DEFAULT 15,
    CONSTRAINT chk_grace_mins CHECK (grace_mins >= 0 AND grace_mins <= 120)
) ENGINE=InnoDB;

CREATE TABLE Shift_Assignment (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    emp_id INT NOT NULL,
    shift_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    CONSTRAINT fk_assign_emp FOREIGN KEY (emp_id)
        REFERENCES Employee(emp_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_assign_shift FOREIGN KEY (shift_id)
        REFERENCES Shift(shift_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_assign_dates CHECK (end_date >= start_date)
) ENGINE=InnoDB;

CREATE TABLE Attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    emp_id INT NOT NULL,
    shift_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    check_in TIME NULL,
    check_out TIME NULL,
    status ENUM('Present', 'Late', 'Half-Day', 'Absent', 'On Leave') NOT NULL DEFAULT 'Present',
    remarks VARCHAR(255) NULL,
    CONSTRAINT uq_emp_attendance_date UNIQUE (emp_id, attendance_date),
    CONSTRAINT fk_att_emp FOREIGN KEY (emp_id)
        REFERENCES Employee(emp_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_att_shift FOREIGN KEY (shift_id)
        REFERENCES Shift(shift_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Leave_Type (
    leave_type_id INT AUTO_INCREMENT PRIMARY KEY,
    leave_name VARCHAR(60) NOT NULL UNIQUE,
    max_days_per_year INT NOT NULL,
    is_paid TINYINT(1) NOT NULL DEFAULT 1,
    description VARCHAR(255) NOT NULL,
    CONSTRAINT chk_max_days CHECK (max_days_per_year > 0 AND max_days_per_year <= 365)
) ENGINE=InnoDB;

CREATE TABLE Leave_Request (
    leave_id INT AUTO_INCREMENT PRIMARY KEY,
    emp_id INT NOT NULL,
    leave_type_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
    applied_on DATE NOT NULL,
    CONSTRAINT fk_leave_emp FOREIGN KEY (emp_id)
        REFERENCES Employee(emp_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_leave_type FOREIGN KEY (leave_type_id)
        REFERENCES Leave_Type(leave_type_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_leave_dates CHECK (end_date >= start_date)
) ENGINE=InnoDB;`;

export const VivaDocsPage: React.FC = () => {
  const [copiedSchema, setCopiedSchema] = useState(false);

  const handleCopySchema = () => {
    navigator.clipboard.writeText(DDL_SCHEMA);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  const getMethodColor = (m: string) => {
    if (m === 'GET') return 'text-sky-700 font-bold';
    if (m === 'POST') return 'text-emerald-700 font-bold';
    if (m === 'PUT') return 'text-amber-700 font-bold';
    return 'text-rose-700 font-bold';
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Viva Examination Guide, REST API Endpoints & MySQL Schema
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Complete reference of all 24 REST API endpoints, parameterized SQL queries, 3NF normalization defense, and <span className="font-mono text-xs">CREATE TABLE</span> DDL statements.
        </p>
      </div>

      {/* 3 Viva Defense Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>1. SQL Injection Defense (Parameterized Queries)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Every route in <span className="font-mono">backend/routes/*.js</span> uses{' '}
            <span className="font-mono">pool.execute(sql, params)</span> with <span className="font-mono">?</span>{' '}
            placeholders. The MySQL server compiles the SQL syntax tree before binding user input as literal
            scalars, making SQL injection impossible.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
            <Database className="w-4 h-4 text-sky-600" />
            <span>2. Referential Integrity (ON DELETE RESTRICT)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Foreign keys on <span className="font-mono">Employee</span>, <span className="font-mono">Shift_Assignment</span>,{' '}
            <span className="font-mono">Attendance</span>, and <span className="font-mono">Leave_Request</span> use{' '}
            <span className="font-mono">ON DELETE RESTRICT</span>. Deleting a parent row that has child logs
            triggers MySQL <span className="font-mono">errno 1451</span>, caught and shown as a friendly toast.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
            <Server className="w-4 h-4 text-amber-600" />
            <span>3. 3rd Normal Form (3NF) & Connection Pooling</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            All 7 tables eliminate transitive dependencies: department attributes live only in{' '}
            <span className="font-mono">Department</span>, shift timings live only in{' '}
            <span className="font-mono">Shift</span>, and leave quotas live only in{' '}
            <span className="font-mono">Leave_Type</span>.
          </p>
        </div>
      </div>

      {/* COMPLETE REST API ENDPOINTS & SQL TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-slate-800" />
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              All REST API Endpoints (GET / POST / PUT / DELETE) & Exact SQL Executed
            </h2>
            <p className="text-xs text-slate-500">
              Organized in <span className="font-mono">/backend/routes/</span> and mounted in <span className="font-mono">/backend/server.js</span>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">REST Endpoint</th>
                <th className="py-3 px-4">Target Table(s)</th>
                <th className="py-3 px-4">Parameterized SQL Query</th>
                <th className="py-3 px-4">Viva Explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {API_ENDPOINTS_LIST.map((ep, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-4 font-mono">
                    <span className={getMethodColor(ep.method)}>{ep.method}</span>
                  </td>
                  <td className="py-2.5 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                    {ep.endpoint}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                    {ep.table}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-slate-800 max-w-md">
                    {ep.sql}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">{ep.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* COMPLETE MYSQL CREATE TABLE SCHEMA */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Complete MySQL 8.0 DDL Schema (<span className="font-mono text-sm">backend/schema.sql</span>)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Includes Primary Keys, Foreign Keys (<span className="font-mono">ON DELETE RESTRICT</span>), <span className="font-mono">UNIQUE</span> constraints, and <span className="font-mono">CHECK</span> constraints.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopySchema}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
          >
            {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSchema ? 'Copied DDL!' : 'Copy CREATE TABLE Statements'}</span>
          </button>
        </div>

        <pre className="p-5 bg-slate-950 text-sky-300 font-mono text-xs overflow-x-auto leading-relaxed">
          {DDL_SCHEMA}
        </pre>
      </div>
    </div>
  );
};
