import { z } from 'zod';

export const DocumentSchema = z.object({
  id: z.string(),
  docType: z.string().min(1, 'Type is required'),
  specificDocNumber: z.string().min(1, 'Document number is required'),
  startDate: z.string().min(1, 'Start date is required'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  notes: z.string().optional().default(''),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
});

export const LeaveSchema = z.object({
  id: z.string(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  notes: z.string().optional().default(''),
});

export const EmployeeSchema = z.object({
  id: z.string(),
  employeeId: z.string().min(1, 'Employee ID is required'),
  employeeName: z.string().min(1, 'Employee Name is required'),
  department: z.string().min(1, 'Department is required'),
  baseSalary: z.coerce.number().min(0, 'Base salary must be positive'),
  allowances: z.coerce.number().min(0, 'Allowances must be positive'),
  salary: z.coerce.number().min(0).optional(),
  startDate: z.string().min(1, 'Hire date is required'),
  isArchived: z.boolean().default(false),
  documents: z.array(DocumentSchema).default([]),
  leaves: z.array(LeaveSchema).default([]),
});

export const ConfigSchema = z.object({
  threshold: z.number().min(1),
  language: z.enum(['ar', 'en']),
  docTypes: z.array(z.string()),
  departments: z.array(z.string()),
});

export const BackupSchema = z.object({
  docs: z.array(EmployeeSchema),
  config: ConfigSchema,
});

export const UserPermissionsSchema = z.object({
  canViewDashboard: z.boolean().default(true),
  canViewManagement: z.boolean().default(true),
  canEditManagement: z.boolean().default(false),
  canViewLeaves: z.boolean().default(true),
  canEditLeaves: z.boolean().default(false),
  canViewArchive: z.boolean().default(true),
  canEditArchive: z.boolean().default(false),
  canViewSettings: z.boolean().default(false),
});

export const UserSchema = z.object({
  id: z.string(),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  role: z.enum(['admin', 'user']),
  permissions: UserPermissionsSchema,
});

export const LeaveRequestSchema = z.object({
  id: z.string(),
  userId: z.string(),
  username: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  notes: z.string().optional().default(''),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  createdAt: z.string(),
});

export type DocumentType = z.infer<typeof DocumentSchema>;
export type LeaveType = z.infer<typeof LeaveSchema>;
export type EmployeeType = z.infer<typeof EmployeeSchema>;
export type ConfigType = z.infer<typeof ConfigSchema>;
export type BackupType = z.infer<typeof BackupSchema>;
export type UserType = z.infer<typeof UserSchema>;
export type LeaveRequestType = z.infer<typeof LeaveRequestSchema>;
