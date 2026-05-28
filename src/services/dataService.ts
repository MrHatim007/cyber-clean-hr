import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db, isPlaceholder } from '../firebaseConfig';
import type { EmployeeType, ConfigType, UserType, LeaveRequestType } from '../utils/schemas';

export interface IDataService {
  getEmployees(): Promise<EmployeeType[]>;
  saveEmployee(employee: EmployeeType): Promise<void>;
  deleteEmployee(id: string): Promise<void>;
  getConfig(): Promise<ConfigType>;
  saveConfig(config: ConfigType): Promise<void>;
  getUsers(): Promise<UserType[]>;
  saveUser(user: UserType): Promise<void>;
  deleteUser(id: string): Promise<void>;
  getLeaveRequests(): Promise<LeaveRequestType[]>;
  saveLeaveRequest(request: LeaveRequestType): Promise<void>;
  deleteLeaveRequest(id: string): Promise<void>;
}

const STORAGE_KEY_DOCS = 'pro_doc_system_v3_data';
const STORAGE_KEY_CONFIG = 'pro_doc_system_v3_config';
const STORAGE_KEY_USERS = 'pro_doc_system_v3_users';

const INITIAL_CONFIG: ConfigType = {
  threshold: 30,
  language: 'ar',
  docTypes: ['جواز سفر', 'هوية', 'إقامة', 'رخصة قيادة', 'تأمين', 'سجل تجاري'],
  departments: ['الموارد البشرية', 'المالية', 'الإدارة', 'التشغيل', 'تقنية المعلومات'],
};

const DEFAULT_ADMIN: UserType = {
  id: 'admin-id',
  username: 'admin',
  password: 'admin',
  role: 'admin',
  permissions: {
    canViewDashboard: true,
    canViewManagement: true,
    canEditManagement: true,
    canViewLeaves: true,
    canEditLeaves: true,
    canViewArchive: true,
    canEditArchive: true,
    canViewSettings: true,
  }
};

// 1. LocalStorage Fallback Implementation
export class LocalStorageDataService implements IDataService {
  private getLocalEmployees(): EmployeeType[] {
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

  private saveLocalEmployees(employees: EmployeeType[]) {
    localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(employees));
  }

  private getLocalUsers(): UserType[] {
    const saved = localStorage.getItem(STORAGE_KEY_USERS);
    if (!saved) return [DEFAULT_ADMIN];
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) return [DEFAULT_ADMIN];
      return parsed;
    } catch {
      return [DEFAULT_ADMIN];
    }
  }

  private saveLocalUsers(users: UserType[]) {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  }

  async getEmployees(): Promise<EmployeeType[]> {
    return this.getLocalEmployees();
  }

  async saveEmployee(employee: EmployeeType): Promise<void> {
    const emps = this.getLocalEmployees();
    const idx = emps.findIndex(e => e.id === employee.id);
    if (idx !== -1) {
      emps[idx] = employee;
    } else {
      emps.push(employee);
    }
    this.saveLocalEmployees(emps);
  }

  async deleteEmployee(id: string): Promise<void> {
    const emps = this.getLocalEmployees().filter(e => e.id !== id);
    this.saveLocalEmployees(emps);
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

  async getUsers(): Promise<UserType[]> {
    const users = this.getLocalUsers();
    const hasAdmin = users.some(u => u.role === 'admin' || u.username === 'admin');
    if (!hasAdmin) {
      users.unshift(DEFAULT_ADMIN);
      this.saveLocalUsers(users);
    }
    return users;
  }

  async saveUser(user: UserType): Promise<void> {
    const users = this.getLocalUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    this.saveLocalUsers(users);
  }

  async deleteUser(id: string): Promise<void> {
    const users = this.getLocalUsers().filter(u => u.id !== id);
    this.saveLocalUsers(users);
  }

  private getLocalLeaveRequests(): LeaveRequestType[] {
    const saved = localStorage.getItem('pro_doc_system_v3_leave_requests');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }

  private saveLocalLeaveRequests(requests: LeaveRequestType[]) {
    localStorage.setItem('pro_doc_system_v3_leave_requests', JSON.stringify(requests));
  }

  async getLeaveRequests(): Promise<LeaveRequestType[]> {
    return this.getLocalLeaveRequests();
  }

  async saveLeaveRequest(request: LeaveRequestType): Promise<void> {
    const requests = this.getLocalLeaveRequests();
    const idx = requests.findIndex(r => r.id === request.id);
    if (idx !== -1) {
      requests[idx] = request;
    } else {
      requests.push(request);
    }
    this.saveLocalLeaveRequests(requests);
  }

  async deleteLeaveRequest(id: string): Promise<void> {
    const requests = this.getLocalLeaveRequests().filter(r => r.id !== id);
    this.saveLocalLeaveRequests(requests);
  }
}

// 2. Firebase Firestore Production Implementation
export class FirestoreDataService implements IDataService {
  async getEmployees(): Promise<EmployeeType[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'employees'));
      const list: EmployeeType[] = [];
      querySnapshot.forEach((doc) => {
        const item = doc.data() as any;
        const baseSalary = parseFloat(item.baseSalary || item.salary || '0');
        const allowances = parseFloat(item.allowances || '0');
        const salary = baseSalary + allowances;

        list.push({
          id: doc.id,
          employeeId: item.employeeId || '',
          employeeName: item.employeeName || '',
          department: item.department || '',
          baseSalary,
          allowances,
          salary,
          startDate: item.startDate || '',
          isArchived: !!item.isArchived,
          documents: item.documents || [],
          leaves: item.leaves || [],
        });
      });
      return list;
    } catch (err) {
      console.error("Firestore getEmployees error, falling back to empty list:", err);
      return [];
    }
  }

  async saveEmployee(employee: EmployeeType): Promise<void> {
    try {
      await setDoc(doc(db, 'employees', employee.id), employee);
    } catch (err) {
      console.error("Firestore saveEmployee error:", err);
    }
  }

  async deleteEmployee(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'employees', id));
    } catch (err) {
      console.error("Firestore deleteEmployee error:", err);
    }
  }

  async getConfig(): Promise<ConfigType> {
    try {
      const configDoc = await getDoc(doc(db, 'config', 'global_config'));
      if (configDoc.exists()) {
        return configDoc.data() as ConfigType;
      }
      await setDoc(doc(db, 'config', 'global_config'), INITIAL_CONFIG);
      return INITIAL_CONFIG;
    } catch (err) {
      console.error("Firestore getConfig error:", err);
      return INITIAL_CONFIG;
    }
  }

  async saveConfig(config: ConfigType): Promise<void> {
    try {
      await setDoc(doc(db, 'config', 'global_config'), config);
    } catch (err) {
      console.error("Firestore saveConfig error:", err);
    }
  }

  async getUsers(): Promise<UserType[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const list: UserType[] = [];
      querySnapshot.forEach((doc) => {
        list.push(doc.data() as UserType);
      });

      if (list.length === 0) {
        await setDoc(doc(db, 'users', DEFAULT_ADMIN.id), DEFAULT_ADMIN);
        return [DEFAULT_ADMIN];
      }

      const hasAdmin = list.some(u => u.role === 'admin' || u.username === 'admin');
      if (!hasAdmin) {
        await setDoc(doc(db, 'users', DEFAULT_ADMIN.id), DEFAULT_ADMIN);
        list.unshift(DEFAULT_ADMIN);
      }

      return list;
    } catch (err) {
      console.error("Firestore getUsers error:", err);
      return [DEFAULT_ADMIN];
    }
  }

  async saveUser(user: UserType): Promise<void> {
    try {
      await setDoc(doc(db, 'users', user.id), user);
    } catch (err) {
      console.error("Firestore saveUser error:", err);
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (err) {
      console.error("Firestore deleteUser error:", err);
    }
  }

  async getLeaveRequests(): Promise<LeaveRequestType[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'leave_requests'));
      const list: LeaveRequestType[] = [];
      querySnapshot.forEach((doc) => {
        list.push(doc.data() as LeaveRequestType);
      });
      return list;
    } catch (err) {
      console.error("Firestore getLeaveRequests error:", err);
      return [];
    }
  }

  async saveLeaveRequest(request: LeaveRequestType): Promise<void> {
    try {
      await setDoc(doc(db, 'leave_requests', request.id), request);
    } catch (err) {
      console.error("Firestore saveLeaveRequest error:", err);
    }
  }

  async deleteLeaveRequest(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'leave_requests', id));
    } catch (err) {
      console.error("Firestore deleteLeaveRequest error:", err);
    }
  }
}

// Instantiate correct data service based on configuration state
export const dataService: IDataService = isPlaceholder 
  ? new LocalStorageDataService() 
  : new FirestoreDataService();

export { INITIAL_CONFIG };
