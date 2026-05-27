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

export type DocumentType = z.infer<typeof DocumentSchema>;
export type LeaveType = z.infer<typeof LeaveSchema>;
export type EmployeeType = z.infer<typeof EmployeeSchema>;
export type ConfigType = z.infer<typeof ConfigSchema>;
export type BackupType = z.infer<typeof BackupSchema>;
