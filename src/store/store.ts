import { create } from 'zustand';
import type { EmployeeType, ConfigType, LeaveType, BackupType, UserType } from '../utils/schemas';
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
  highlightedEmployeeId: string | null;
  currentUser: UserType | null;
  users: UserType[];
  
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
  
  // Authentication Actions
  loginUser: (username: string, password: string) => Promise<boolean>;
  logoutUser: () => void;
  addUser: (user: UserType) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updateUser: (id: string, updatedFields: Partial<UserType>) => Promise<void>;
  
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
  setHighlightedEmployeeId: (id: string | null) => void;
}

const STORAGE_KEY_SESSION = 'pro_doc_system_v3_session';

const getInitialTab = (): string => {
  if (typeof window === 'undefined') return 'dashboard';
  const hash = window.location.hash.replace('#/', '');
  const allowed = ['dashboard', 'management', 'leaves', 'archive', 'settings'];
  return allowed.includes(hash) ? hash : 'dashboard';
};

export const useAppStore = create<AppState>((set, get) => ({
  employees: [],
  config: INITIAL_CONFIG,
  activeTab: getInitialTab(),
  searchQuery: '',
  filterStatus: 'all',
  filterType: 'all',
  filterDept: 'all',
  loading: true,
  notification: null,
  previewFile: null,
  highlightedEmployeeId: null,
  currentUser: null,
  users: [],

  setPreviewFile: (file) => set({ previewFile: file }),
  setHighlightedEmployeeId: (id) => set({ highlightedEmployeeId: id }),

  loadData: async () => {
    set({ loading: true });
    try {
      const employees = await dataService.getEmployees();
      const config = await dataService.getConfig();
      const users = await dataService.getUsers();
      
      let currentUser: UserType | null = null;
      const savedSession = localStorage.getItem(STORAGE_KEY_SESSION);
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          const found = users.find(u => u.id === parsed.id && u.username === parsed.username);
          if (found) {
            currentUser = found;
          }
        } catch {
          // ignore
        }
      }
      
      set({ employees, config, users, currentUser, loading: false });
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
          isArchived: updatedFields.isArchived ?? emp.isArchived,
          documents: updatedFields.documents ?? emp.documents,
          leaves: updatedFields.leaves ?? emp.leaves,
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

  loginUser: async (username, password) => {
    const users = get().users;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      set({ currentUser: user });
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
      get().showNotification(get().config.language === 'ar' ? 'تم تسجيل الدخول بنجاح!' : 'Logged in successfully!');
      return true;
    }
    get().showNotification(get().config.language === 'ar' ? 'اسم المستخدم أو كلمة المرور غير صحيحة!' : 'Invalid username or password!');
    return false;
  },

  logoutUser: () => {
    set({ currentUser: null, activeTab: 'dashboard' });
    localStorage.removeItem(STORAGE_KEY_SESSION);
    if (typeof window !== 'undefined') {
      window.location.hash = '#/dashboard';
    }
    get().showNotification(get().config.language === 'ar' ? 'تم تسجيل الخروج!' : 'Logged out!');
  },

  addUser: async (newUser) => {
    const updatedUsers = [...get().users, newUser];
    set({ users: updatedUsers });
    await dataService.saveUsers(updatedUsers);
    get().showNotification(get().config.language === 'ar' ? 'تم إضافة المستخدم بنجاح!' : 'User added successfully!');
  },

  deleteUser: async (id) => {
    const adminUser = get().users.find(u => u.role === 'admin');
    if (adminUser?.id === id) {
      get().showNotification(get().config.language === 'ar' ? 'لا يمكن حذف حساب المسؤول الافتراضي للنظام!' : 'Default Admin account cannot be deleted!');
      return;
    }
    const updatedUsers = get().users.filter(u => u.id !== id);
    set({ users: updatedUsers });
    await dataService.saveUsers(updatedUsers);
    
    if (get().currentUser?.id === id) {
      get().logoutUser();
    } else {
      get().showNotification(get().config.language === 'ar' ? 'تم حذف حساب المستخدم!' : 'User account deleted!');
    }
  },

  updateUser: async (id, updatedFields) => {
    const updatedUsers = get().users.map(u => {
      if (u.id === id) {
        return {
          ...u,
          ...updatedFields,
          permissions: {
            ...u.permissions,
            ...updatedFields.permissions
          }
        } as UserType;
      }
      return u;
    });

    set({ users: updatedUsers });
    await dataService.saveUsers(updatedUsers);

    // Sync session if the current user profile was edited
    const cur = get().currentUser;
    if (cur && cur.id === id) {
      const updatedCur = updatedUsers.find(u => u.id === id) || null;
      set({ currentUser: updatedCur });
      if (updatedCur) {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(updatedCur));
      }
    }

    get().showNotification(
      get().config.language === 'ar' 
        ? 'تم تحديث حساب المستخدم بنجاح!' 
        : 'User account updated successfully!'
    );
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setFilterType: (type) => set({ filterType: type }),
  setFilterDept: (dept) => set({ filterDept: dept }),
  setActiveTab: (tab) => {
    set({ activeTab: tab });
    if (typeof window !== 'undefined') {
      window.location.hash = '#/' + tab;
    }
  },

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
