export interface SqlLogEntry {
  id: number;
  timestamp: string;
  sql: string;
  params: any[];
  interpolatedSql: string;
  description: string;
  durationMs: number;
  rowCount: number;
  engine: string;
  status: 'SUCCESS' | 'ERROR';
  error?: string;
}

export interface Department {
  dept_id: number;
  dept_name: string;
  dept_code: string;
  location: string;
  manager_name: string;
  employee_count?: number;
}

export interface Employee {
  emp_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  hire_date: string;
  designation: string;
  dept_id: number;
  dept_name?: string;
  dept_code?: string;
}

export interface Shift {
  shift_id: number;
  shift_name: string;
  start_time: string;
  end_time: string;
  grace_mins: number;
  assignment_count?: number;
}

export interface ShiftAssignment {
  assignment_id: number;
  emp_id: number;
  first_name: string;
  last_name: string;
  dept_name: string;
  shift_id: number;
  shift_name: string;
  start_time: string;
  end_time: string;
  start_date: string;
  end_date: string;
}

export interface AttendanceRecord {
  attendance_id: number;
  emp_id: number;
  first_name: string;
  last_name: string;
  dept_name: string;
  shift_id: number;
  shift_name: string;
  start_time: string;
  end_time: string;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  status: 'Present' | 'Late' | 'Half-Day' | 'Absent' | 'On Leave';
  remarks: string | null;
}

export interface LeaveType {
  leave_type_id: number;
  leave_name: string;
  max_days_per_year: number;
  is_paid: number | boolean;
  description: string;
  request_count?: number;
}

export interface LeaveRequest {
  leave_id: number;
  emp_id: number;
  first_name: string;
  last_name: string;
  dept_name: string;
  leave_type_id: number;
  leave_name: string;
  is_paid: number;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  applied_on: string;
}

export interface DashboardKPIs {
  total_employees: number;
  total_departments: number;
  total_shifts: number;
  present_today: number;
  on_leave_today: number;
  pending_leave_requests: number;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error';
  title: string;
  message: string;
  sqlPreview?: string;
}

export type ModulePageId =
  | 'dashboard'
  | 'mark-attendance'
  | 'leave-management'
  | 'departments'
  | 'employees'
  | 'shifts'
  | 'shift-assignments'
  | 'leave-types'
  | 'reports'
  | 'viva-docs';
