import type { EmployeeType, ConfigType } from '../utils/schemas';

export interface IDataService {
  getEmployees(): Promise<EmployeeType[]>;
  saveEmployees(employees: EmployeeType[]): Promise<void>;
  getConfig(): Promise<ConfigType>;
  saveConfig(config: ConfigType): Promise<void>;
}

const STORAGE_KEY_DOCS = 'pro_doc_system_v3_data';
const STORAGE_KEY_CONFIG = 'pro_doc_system_v3_config';

const INITIAL_CONFIG: ConfigType = {
  threshold: 30,
  language: 'ar',
  docTypes: ['جواز سفر', 'هوية', 'إقامة', 'رخصة قيادة', 'تأمين', 'سجل تجاري'],
  departments: ['الموارد البشرية', 'المالية', 'الإدارة', 'التشغيل', 'تقنية المعلومات'],
};

export class LocalStorageDataService implements IDataService {
  async getEmployees(): Promise<EmployeeType[]> {
    const saved = localStorage.getItem(STORAGE_KEY_DOCS);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return parsed.map((item: any) => {
        const baseSalary = parseFloat(item.baseSalary || item.salary || '0');
        const allowances = parseFloat(item.allowances || '0');
        const salary = baseSalary + allowances;

        return {
          id: item.id || Date.now().toString() + Math.random().toString(),
          employeeId: item.employeeId || item.docNumber || '',
          employeeName: item.employeeName || item.holderName || '',
          department: item.department || '',
          baseSalary,
          allowances,
          salary,
          startDate: item.startDate || '',
          isArchived: !!item.isArchived,
          documents: item.documents || [],
          leaves: item.leaves || [],
        };
      });
    } catch {
      return [];
    }
  }

  async saveEmployees(employees: EmployeeType[]): Promise<void> {
    localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(employees));
  }

  async getConfig(): Promise<ConfigType> {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!saved) return INITIAL_CONFIG;
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_CONFIG;
    }
  }

  async saveConfig(config: ConfigType): Promise<void> {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  }
}

export const dataService: IDataService = new LocalStorageDataService();
export { INITIAL_CONFIG };
