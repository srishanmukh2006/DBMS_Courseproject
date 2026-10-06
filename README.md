# Design and Implementation of a Database Management System for Employee Attendance, Shift and Leave Management System

A full-stack Database Management System (DBMS) web application built with **Node.js**, **Express**, **MySQL (`mysql2/promise` connection pool)**, and **React + Tailwind CSS**.

---

## Project Architecture & Folder Structure

```text
├── backend/
│   ├── db.js                     # MySQL2 connection pool + parameterized SQL executor
│   ├── server.js                 # Express API server mounting all entity routes
│   ├── schema.sql                # Complete 3NF MySQL DDL (CREATE TABLE + PK/FK/CHECK + Seed Data)
│   └── routes/
│       ├── dashboard.js          # Live SQL KPI counts (Total Employees, Present Today, On Leave, Pending)
│       ├── departments.js        # CRUD for Department table (GET, POST, DELETE)
│       ├── employees.js          # CRUD for Employee table (GET, POST, DELETE)
│       ├── shifts.js             # CRUD for Shift table (GET, POST, DELETE)
│       ├── shiftAssignments.js   # CRUD for Shift_Assignment table (GET, POST, DELETE)
│       ├── attendance.js         # CRUD for Attendance table (GET, POST, DELETE)
│       ├── leaveTypes.js         # CRUD for Leave_Type table (GET, POST, DELETE)
│       ├── leaveRequests.js      # CRUD & Approval UPDATE for Leave_Request table
│       └── reports.js            # Presentation-II Analytical Queries & Custom SELECT Runner
├── frontend/
│   ├── DashboardLayout.tsx       # Sidebar navigation + Top Bar + Toast stack + SQL Console
│   ├── api.ts                    # Fetch client that captures live SQL execution logs
│   ├── types.ts                  # TypeScript interfaces for all 7 relational entities
│   ├── components/
│   │   ├── SqlConsolePanel.tsx   # Live "SQL Console / Last Executed Query" presentation bar
│   │   └── DeleteConfirmModal.tsx# Confirmation dialog displaying the exact DELETE statement
│   └── pages/
│       ├── DashboardPage.tsx     # Live KPIs, Today's Attendance Register, Pending Leave Queue
│       ├── MarkAttendancePage.tsx# Mark Attendance screen + Attendance joined table view
│       ├── LeaveManagementPage.tsx# Apply for Leave + Approve/Reject status workflow
│       ├── EntityCrudPages.tsx   # Dedicated CRUD screens for Department, Employee, Shift, Shift_Assignment, Leave_Type
│       ├── ReportsPage.tsx       # Presentation-II Queries + Employee & Department Summaries
│       └── VivaDocsPage.tsx      # Viva Defense Guide, REST API SQL Reference & DDL viewer
├── server.ts                     # Full-stack entry point serving Express API + Vite React UI on port 3000
├── .env.example                  # Template for DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT=3306
└── package.json                  # Project dependencies and start scripts
```

---

## Step-by-Step Setup Instructions

### 1. Install Node.js & MySQL Server
- Install **Node.js** (v18+ or v20+ LTS) from [nodejs.org](https://nodejs.org/).
- Install **MySQL Server 8.0+** (or MySQL Workbench / XAMPP).

### 2. Install Project Dependencies
Open a terminal in the project root directory and run:
```bash
npm install
```

### 3. Configure `.env` Database Credentials
Copy `.env.example` to `.env` and set your MySQL credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=employee_attendance_db
DB_PORT=3306
PORT=3000
```

### 4. Start MySQL & Import the Schema (If Database is Empty)
If your MySQL database does not already have the 7 tables created, run the included DDL script:
```bash
mysql -u root -p < backend/schema.sql
```

### 5. Run the Application
Start the full-stack server:
```bash
npm start
```
Then open **`http://localhost:3000`** in your browser.

---

## Complete List of REST API Endpoints & Executed SQL Queries

| HTTP Method | Endpoint | Target Table(s) | Parameterized SQL Query Executed |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard` | `Employee`, `Attendance`, `Leave_Request` | `SELECT (SELECT COUNT(*) FROM Employee) AS total_employees, (SELECT COUNT(*) FROM Attendance WHERE attendance_date = ? AND status IN ('Present','Late','Half-Day')) AS present_today, (SELECT COUNT(DISTINCT emp_id) FROM (...)) AS on_leave_today, (SELECT COUNT(*) FROM Leave_Request WHERE status = 'Pending') AS pending_leave_requests` |
| `GET` | `/api/departments` | `Department ⟕ Employee` | `SELECT d.dept_id, d.dept_name, d.dept_code, d.location, d.manager_name, COUNT(e.emp_id) AS employee_count FROM Department d LEFT JOIN Employee e ON d.dept_id = e.dept_id GROUP BY d.dept_id, d.dept_name, d.dept_code, d.location, d.manager_name ORDER BY d.dept_id ASC` |
| `POST` | `/api/departments` | `Department` | `INSERT INTO Department (dept_name, dept_code, location, manager_name) VALUES (?, ?, ?, ?)` |
| `DELETE` | `/api/departments/:id` | `Department` | `DELETE FROM Department WHERE dept_id = ?` |
| `GET` | `/api/employees` | `Employee ⋈ Department` | `SELECT e.emp_id, e.first_name, e.last_name, e.email, e.phone, e.hire_date, e.designation, e.dept_id, d.dept_name, d.dept_code FROM Employee e INNER JOIN Department d ON e.dept_id = d.dept_id ORDER BY e.emp_id ASC` |
| `POST` | `/api/employees` | `Employee` | `INSERT INTO Employee (first_name, last_name, email, phone, hire_date, designation, dept_id) VALUES (?, ?, ?, ?, ?, ?, ?)` |
| `PUT` | `/api/employees/:id` | `Employee` | `UPDATE Employee SET first_name = ?, last_name = ?, email = ?, phone = ?, hire_date = ?, designation = ?, dept_id = ? WHERE emp_id = ?` |
| `DELETE` | `/api/employees/:id` | `Employee` | `DELETE FROM Employee WHERE emp_id = ?` |
| `GET` | `/api/shifts` | `Shift ⟕ Shift_Assignment` | `SELECT s.shift_id, s.shift_name, s.start_time, s.end_time, s.grace_mins, COUNT(DISTINCT sa.assignment_id) AS assignment_count FROM Shift s LEFT JOIN Shift_Assignment sa ON s.shift_id = sa.shift_id GROUP BY s.shift_id, s.shift_name, s.start_time, s.end_time, s.grace_mins ORDER BY s.shift_id ASC` |
| `POST` | `/api/shifts` | `Shift` | `INSERT INTO Shift (shift_name, start_time, end_time, grace_mins) VALUES (?, ?, ?, ?)` |
| `DELETE` | `/api/shifts/:id` | `Shift` | `DELETE FROM Shift WHERE shift_id = ?` |
| `GET` | `/api/shift-assignments` | `Shift_Assignment ⋈ Employee ⋈ Shift` | `SELECT sa.assignment_id, sa.emp_id, e.first_name, e.last_name, d.dept_name, sa.shift_id, s.shift_name, s.start_time, s.end_time, sa.start_date, sa.end_date FROM Shift_Assignment sa INNER JOIN Employee e ON sa.emp_id = e.emp_id INNER JOIN Department d ON e.dept_id = d.dept_id INNER JOIN Shift s ON sa.shift_id = s.shift_id ORDER BY sa.start_date DESC` |
| `POST` | `/api/shift-assignments` | `Shift_Assignment` | `INSERT INTO Shift_Assignment (emp_id, shift_id, start_date, end_date) VALUES (?, ?, ?, ?)` |
| `DELETE` | `/api/shift-assignments/:id` | `Shift_Assignment` | `DELETE FROM Shift_Assignment WHERE assignment_id = ?` |
| `GET` | `/api/attendance` | `Attendance ⋈ Employee ⋈ Department ⋈ Shift` | `SELECT a.attendance_id, a.emp_id, e.first_name, e.last_name, d.dept_name, a.shift_id, s.shift_name, s.start_time, s.end_time, a.attendance_date, a.check_in, a.check_out, a.status, a.remarks FROM Attendance a INNER JOIN Employee e ON a.emp_id = e.emp_id INNER JOIN Department d ON e.dept_id = d.dept_id INNER JOIN Shift s ON a.shift_id = s.shift_id ORDER BY a.attendance_date DESC` |
| `POST` | `/api/attendance` | `Attendance` | `INSERT INTO Attendance (emp_id, shift_id, attendance_date, check_in, check_out, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)` |
| `DELETE` | `/api/attendance/:id` | `Attendance` | `DELETE FROM Attendance WHERE attendance_id = ?` |
| `GET` | `/api/leave-types` | `Leave_Type ⟕ Leave_Request` | `SELECT lt.leave_type_id, lt.leave_name, lt.max_days_per_year, lt.is_paid, lt.description, COUNT(lr.leave_id) AS request_count FROM Leave_Type lt LEFT JOIN Leave_Request lr ON lt.leave_type_id = lr.leave_type_id GROUP BY lt.leave_type_id, lt.leave_name, lt.max_days_per_year, lt.is_paid, lt.description ORDER BY lt.leave_type_id ASC` |
| `POST` | `/api/leave-types` | `Leave_Type` | `INSERT INTO Leave_Type (leave_name, max_days_per_year, is_paid, description) VALUES (?, ?, ?, ?)` |
| `DELETE` | `/api/leave-types/:id` | `Leave_Type` | `DELETE FROM Leave_Type WHERE leave_type_id = ?` |
| `GET` | `/api/leave-requests` | `Leave_Request ⋈ Employee ⋈ Leave_Type` | `SELECT lr.*, e.first_name, e.last_name, d.dept_name, lt.leave_name, lt.is_paid, (DATEDIFF(lr.end_date, lr.start_date) + 1) AS total_days FROM Leave_Request lr INNER JOIN Employee e ON lr.emp_id = e.emp_id INNER JOIN Department d ON e.dept_id = d.dept_id INNER JOIN Leave_Type lt ON lr.leave_type_id = lt.leave_type_id ORDER BY lr.leave_id DESC` |
| `POST` | `/api/leave-requests` | `Leave_Request` | `INSERT INTO Leave_Request (emp_id, leave_type_id, start_date, end_date, reason, status, applied_on) VALUES (?, ?, ?, ?, ?, ?, ?)` |
| `PUT` | `/api/leave-requests/:id/status` | `Leave_Request` | `UPDATE Leave_Request SET status = ? WHERE leave_id = ?` |
| `DELETE` | `/api/leave-requests/:id` | `Leave_Request` | `DELETE FROM Leave_Request WHERE leave_id = ?` |
| `GET` | `/api/reports` | Multi-Table Analytical Joins | Runs Attendance Summary per Employee, Leave Count per Department, Shift Adherence Audit, and Leave Quota Utilization |
| `POST` | `/api/reports/query` | Any Read-Only `SELECT` | Executes custom Presentation-II `SELECT` queries live during project evaluation |
