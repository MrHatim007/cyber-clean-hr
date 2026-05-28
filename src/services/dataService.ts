import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { db, isPlaceholder } from '../firebaseConfig';
import type { EmployeeType, ConfigType, UserType } from '../utils/schemas';

export interface IDataService {
  getEmployees(): Promise<EmployeeType[]>;
  saveEmployees(employees: EmployeeType[]): Promise<void>;
  getConfig(): Promise<ConfigType>;
  saveConfig(config: ConfigType): Promise<void>;
  getUsers(): Promise<UserType[]>;
  saveUsers(users: UserType[]): Promise<void>;
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

  async getUsers(): Promise<UserType[]> {
    const saved = localStorage.getItem(STORAGE_KEY_USERS);
    if (!saved) {
      const seedUsers = [DEFAULT_ADMIN];
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(seedUsers));
      return seedUsers;
    }
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        const seedUsers = [DEFAULT_ADMIN];
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(seedUsers));
        return seedUsers;
      }
      const hasAdmin = parsed.some((u: any) => u.role === 'admin' || u.username === 'admin');
      if (!hasAdmin) {
        parsed.unshift(DEFAULT_ADMIN);
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      const seedUsers = [DEFAULT_ADMIN];
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(seedUsers));
      return seedUsers;
    }
  }

  async saveUsers(users: UserType[]): Promise<void> {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
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

  async saveEmployees(employees: EmployeeType[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Get all existing documents from collection
      const snapshot = await getDocs(collection(db, 'employees'));
      const existingIds = snapshot.docs.map(doc => doc.id);
      const newIds = employees.map(emp => emp.id);

      // Delete employees no longer present
      existingIds.forEach(id => {
        if (!newIds.includes(id)) {
          batch.delete(doc(db, 'employees', id));
        }
      });

      // Write/Set updated employees
      employees.forEach(emp => {
        batch.set(doc(db, 'employees', emp.id), emp);
      });

      await batch.commit();
    } catch (err) {
      console.error("Firestore saveEmployees error:", err);
    }
  }

  async getConfig(): Promise<ConfigType> {
    try {
      const configDoc = await getDoc(doc(db, 'config', 'global_config'));
      if (configDoc.exists()) {
        return configDoc.data() as ConfigType;
      }
      // Seed initial config to firestore if it doesn't exist
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
        // Seed default admin
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

  async saveUsers(users: UserType[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      const snapshot = await getDocs(collection(db, 'users'));
      const existingIds = snapshot.docs.map(doc => doc.id);
      const newIds = users.map(u => u.id);

      existingIds.forEach(id => {
        if (!newIds.includes(id)) {
          batch.delete(doc(db, 'users', id));
        }
      });

      users.forEach(u => {
        batch.set(doc(db, 'users', u.id), u);
      });

      await batch.commit();
    } catch (err) {
      console.error("Firestore saveUsers error:", err);
    }
  }
}

// Instantiate correct data service based on configuration state
export const dataService: IDataService = isPlaceholder 
  ? new LocalStorageDataService() 
  : new FirestoreDataService();

export { INITIAL_CONFIG };
