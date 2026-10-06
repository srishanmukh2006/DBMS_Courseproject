-- ============================================================================
-- DBMS COURSE PROJECT:
-- "Design and Implementation of a Database Management System for Employee
--  Attendance, Shift and Leave Management System"
-- ============================================================================
-- Target RDBMS : MySQL 8.0+
-- Normalization: 3rd Normal Form (3NF)
-- Referential Integrity: ON DELETE RESTRICT on all Foreign Keys to demonstrate
--                        constraint enforcement in the application UI.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS employee_attendance_db;
USE employee_attendance_db;

-- ----------------------------------------------------------------------------
-- 1. DEPARTMENT TABLE
-- Stores organizational departments and their locations.
-- ----------------------------------------------------------------------------
CREATE TABLE Department (
    dept_id INT AUTO_INCREMENT PRIMARY KEY,
    dept_name VARCHAR(100) NOT NULL UNIQUE,
    dept_code VARCHAR(20) NOT NULL UNIQUE,
    location VARCHAR(100) NOT NULL,
    manager_name VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2. EMPLOYEE TABLE
-- Stores employee master records. References Department(dept_id).
-- ON DELETE RESTRICT prevents deleting a department that still has employees.
-- ----------------------------------------------------------------------------
CREATE TABLE Employee (
    emp_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(60) NOT NULL,
    last_name VARCHAR(60) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    hire_date DATE NOT NULL,
    designation VARCHAR(80) NOT NULL,
    dept_id INT NOT NULL,
    CONSTRAINT fk_employee_dept
        FOREIGN KEY (dept_id) REFERENCES Department(dept_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 3. SHIFT TABLE
-- Defines standard work shifts (Morning, General, Evening, Night) & timings.
-- ----------------------------------------------------------------------------
CREATE TABLE Shift (
    shift_id INT AUTO_INCREMENT PRIMARY KEY,
    shift_name VARCHAR(60) NOT NULL UNIQUE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_mins INT NOT NULL DEFAULT 15,
    CONSTRAINT chk_grace_mins CHECK (grace_mins >= 0 AND grace_mins <= 120)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4. SHIFT_ASSIGNMENT TABLE
-- Maps Employees to Shifts for a specific date range (start_date to end_date).
-- Enforces end_date >= start_date check constraint.
-- ----------------------------------------------------------------------------
CREATE TABLE Shift_Assignment (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    emp_id INT NOT NULL,
    shift_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    CONSTRAINT fk_assign_emp
        FOREIGN KEY (emp_id) REFERENCES Employee(emp_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_assign_shift
        FOREIGN KEY (shift_id) REFERENCES Shift(shift_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_assign_dates
        CHECK (end_date >= start_date)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 5. ATTENDANCE TABLE
-- Stores daily employee attendance logs with check-in, check-out, and status.
-- Unique constraint (emp_id, attendance_date) prevents duplicate daily logs.
-- ----------------------------------------------------------------------------
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
    CONSTRAINT fk_att_emp
        FOREIGN KEY (emp_id) REFERENCES Employee(emp_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_att_shift
        FOREIGN KEY (shift_id) REFERENCES Shift(shift_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 6. LEAVE_TYPE TABLE
-- Master table of leave categories (Casual, Sick, Earned, Paternity/Maternity).
-- ----------------------------------------------------------------------------
CREATE TABLE Leave_Type (
    leave_type_id INT AUTO_INCREMENT PRIMARY KEY,
    leave_name VARCHAR(60) NOT NULL UNIQUE,
    max_days_per_year INT NOT NULL,
    is_paid TINYINT(1) NOT NULL DEFAULT 1,
    description VARCHAR(255) NOT NULL,
    CONSTRAINT chk_max_days CHECK (max_days_per_year > 0 AND max_days_per_year <= 365)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 7. LEAVE_REQUEST TABLE
-- Tracks employee leave applications and approval workflow (Pending/Approved/Rejected).
-- Enforces end_date >= start_date check constraint.
-- ----------------------------------------------------------------------------
CREATE TABLE Leave_Request (
    leave_id INT AUTO_INCREMENT PRIMARY KEY,
    emp_id INT NOT NULL,
    leave_type_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
    applied_on DATE NOT NULL,
    CONSTRAINT fk_leave_emp
        FOREIGN KEY (emp_id) REFERENCES Employee(emp_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_leave_type
        FOREIGN KEY (leave_type_id) REFERENCES Leave_Type(leave_type_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_leave_dates
        CHECK (end_date >= start_date)
) ENGINE=InnoDB;

-- ============================================================================
-- INITIAL SEED DATA FOR VIVA & DEMONSTRATION
-- ============================================================================

INSERT INTO Department (dept_id, dept_name, dept_code, location, manager_name) VALUES
(1, 'Platform Engineering', 'ENG-01', 'Block A, Floor 4', 'Arjun Mehta'),
(2, 'Database & Infrastructure', 'DBA-02', 'Block A, Floor 2', 'Priya Nair'),
(3, 'Human Resources & Ops', 'HRO-03', 'Block B, Floor 1', 'VikramDesai'),
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
