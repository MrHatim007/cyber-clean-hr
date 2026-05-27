import { create } from 'zustand';
import type { EmployeeType, ConfigType, LeaveType, BackupType } from '../utils/schemas';
import { dataService, INITIAL_CONFIG } from '../services/dataService';

interface AppState {
  employees: EmployeeType[];
  config: ConfigType;
  activeTab: string;
  searchQuery: string;
  filterStatus: string;
  filterType: string;
  filterDept: string;
  loading: boolean;
  notification: string | null;
  previewFile: { url: string; name: string } | null;
  
  // Actions
  loadData: () => Promise<void>;
  updateConfig: (config: ConfigType) => Promise<void>;
  addEmployee: (employee: Omit<EmployeeType, 'id' | 'salary'> & { id?: string }) => Promise<void>;
  updateEmployee: (id: string, employee: Partial<EmployeeType>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  archiveEmployee: (id: string) => Promise<void>;
  restoreEmployee: (id: string) => Promise<void>;
  addLeaveDirectly: (employeeId: string, leave: Omit<LeaveType, 'id'>) => Promise<boolean>;
  deleteLeaveDirectly: (employeeId: string, leaveId: string) => Promise<void>;
  
  // State setters
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: string) => void;
  setFilterType: (type: string) => void;
  setFilterDept: (dept: string) => void;
  setActiveTab: (tab: string) => void;
  toggleLanguage: () => Promise<void>;
  showNotification: (msg: string) => void;
  importBackup: (backup: BackupType) => Promise<void>;
  setPreviewFile: (file: { url: string; name: string } | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  employees: [],
  config: INITIAL_CONFIG,
  activeTab: 'dashboard',
  searchQuery: '',
  filterStatus: 'all',
  filterType: 'all',
  filterDept: 'all',
  loading: true,
  notification: null,
  previewFile: null,

  setPreviewFile: (file) => set({ previewFile: file }),

  loadData: async () => {
    set({ loading: true });
    try {
      const employees = await dataService.getEmployees();
      const config = await dataService.getConfig();
      set({ employees, config, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  updateConfig: async (newConfig: ConfigType) => {
    try {
      await dataService.saveConfig(newConfig);
      set({ config: newConfig });
      get().showNotification(newConfig.language === 'ar' ? 'تم حفظ الإعدادات!' : 'Settings saved!');
    } catch {
      get().showNotification(get().config.language === 'ar' ? 'فشل حفظ الإعدادات!' : 'Failed to save settings!');
    }
  },

  addEmployee: async (empData) => {
    const baseSalary = Number(empData.baseSalary || 0);
    const allowances = Number(empData.allowances || 0);
    const salary = baseSalary + allowances;
    
    const newEmp: EmployeeType = {
      ...empData,
      id: empData.id || 'emp_' + Date.now().toString() + Math.random().toString(36).substr(2, 5),
      baseSalary,
      allowances,
      salary,
      isArchived: false,
      documents: empData.documents || [],
      leaves: empData.leaves || [],
    };

    const updatedEmployees = [...get().employees, newEmp];
    set({ employees: updatedEmployees });
    await dataService.saveEmployees(updatedEmployees);
    get().showNotification(get().config.language === 'ar' ? 'تمت إضافة الموظف بنجاح!' : 'Employee added successfully!');
  },

  updateEmployee: async (id, updatedFields) => {
    const updatedEmployees = get().employees.map(emp => {
      if (emp.id === id) {
        const baseSalary = Number(updatedFields.baseSalary ?? emp.baseSalary);
        const allowances = Number(updatedFields.allowances ?? emp.allowances);
        const salary = baseSalary + allowances;
        
        return {
          ...emp,
          ...updatedFields,
          baseSalary,
          allowances,
          salary,
        } as EmployeeType;
      }
      return emp;
    });

    set({ employees: updatedEmployees });
    await dataService.saveEmployees(updatedEmployees);
    get().showNotification(get().config.language === 'ar' ? 'تم تحديث بيانات الموظف!' : 'Employee updated successfully!');
  },

  deleteEmployee: async (id) => {
    const updatedEmployees = get().employees.filter(emp => emp.id !== id);
    set({ employees: updatedEmployees });
    await dataService.saveEmployees(updatedEmployees);
    get().showNotification(get().config.language === 'ar' ? 'تم حذف الموظف!' : 'Employee deleted!');
  },

  archiveEmployee: async (id) => {
    const updatedEmployees = get().employees.map(emp => 
      emp.id === id ? { ...emp, isArchived: true } : emp
    );
    set({ employees: updatedEmployees });
    await dataService.saveEmployees(updatedEmployees);
    get().showNotification(get().config.language === 'ar' ? 'تم نقل الموظف للأرشيف!' : 'Employee archived!');
  },

  restoreEmployee: async (id) => {
    const updatedEmployees = get().employees.map(emp => 
      emp.id === id ? { ...emp, isArchived: false } : emp
    );
    set({ employees: updatedEmployees });
    await dataService.saveEmployees(updatedEmployees);
    get().showNotification(get().config.language === 'ar' ? 'تمت استعادة الموظف للعمل!' : 'Employee restored to active!');
  },

  addLeaveDirectly: async (employeeId, leaveData) => {
    const newLeave: LeaveType = {
      ...leaveData,
      id: 'leave_' + Date.now().toString() + Math.random().toString(36).substr(2, 5),
    };

    let success = false;
    const updatedEmployees = get().employees.map(emp => {
      if (emp.id === employeeId) {
        success = true;
        return {
          ...emp,
          leaves: [...(emp.leaves || []), newLeave],
        };
      }
      return emp;
    });

    if (success) {
      set({ employees: updatedEmployees });
      await dataService.saveEmployees(updatedEmployees);
      get().showNotification(get().config.language === 'ar' ? 'تم تسجيل الإجازة بنجاح!' : 'Leave recorded successfully!');
      return true;
    }
    return false;
  },

  deleteLeaveDirectly: async (employeeId, leaveId) => {
    const updatedEmployees = get().employees.map(emp => {
      if (emp.id === employeeId) {
        return {
          ...emp,
          leaves: (emp.leaves || []).filter(l => l.id !== leaveId),
        };
      }
      return emp;
    });

    set({ employees: updatedEmployees });
    await dataService.saveEmployees(updatedEmployees);
    get().showNotification(get().config.language === 'ar' ? 'تم حذف الإجازة!' : 'Leave deleted!');
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setFilterType: (type) => set({ filterType: type }),
  setFilterDept: (dept) => set({ filterDept: dept }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  toggleLanguage: async () => {
    const nextLang = (get().config.language === 'ar' ? 'en' : 'ar') as 'ar' | 'en';
    const nextConfig = { ...get().config, language: nextLang };
    await dataService.saveConfig(nextConfig);
    set({ config: nextConfig });
  },

  showNotification: (msg) => {
    set({ notification: msg });
    setTimeout(() => {
      if (get().notification === msg) {
        set({ notification: null });
      }
    }, 4000);
  },

  importBackup: async (backup) => {
    set({ employees: backup.docs, config: backup.config });
    await dataService.saveEmployees(backup.docs);
    await dataService.saveConfig(backup.config);
    get().showNotification(backup.config.language === 'ar' ? 'تم استيراد البيانات بنجاح!' : 'Backup imported successfully!');
  },
}));
