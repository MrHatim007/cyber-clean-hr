import React, { useState } from 'react';
import { useAppStore } from '../store/store';
import { translations } from '../utils/translations';
import type { UserType } from '../utils/schemas';

export const UserManagement: React.FC = () => {
  const config = useAppStore(state => state.config);
  const users = useAppStore(state => state.users);
  const addUser = useAppStore(state => state.addUser);
  const deleteUser = useAppStore(state => state.deleteUser);
  const updateUser = useAppStore(state => state.updateUser);

  const t = translations[config.language];

  // State for Create User form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [newPermissions, setNewPermissions] = useState({
    canViewDashboard: true,
    canViewManagement: true,
    canEditManagement: false,
    canViewLeaves: true,
    canEditLeaves: false,
    canViewArchive: true,
    canEditArchive: false,
    canViewSettings: false,
  });

  // State for Editing User
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [editPermissions, setEditPermissions] = useState({
    canViewDashboard: true,
    canViewManagement: true,
    canEditManagement: false,
    canViewLeaves: true,
    canEditLeaves: false,
    canViewArchive: true,
    canEditArchive: false,
    canViewSettings: false,
  });

  // State for toggling password visibility in list
  const [showPasswordIds, setShowPasswordIds] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswordIds(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedUsername = newUsername.trim();
    if (trimmedUsername.length < 3) {
      alert(t.usernameError);
      return;
    }
    if (newPassword.length < 4) {
      alert(t.passwordError);
      return;
    }

    const newUser: UserType = {
      id: 'usr_' + Date.now().toString(),
      username: trimmedUsername,
      password: newPassword,
      role: newRole,
      permissions: newRole === 'admin' ? {
        canViewDashboard: true,
        canViewManagement: true,
        canEditManagement: true,
        canViewLeaves: true,
        canEditLeaves: true,
        canViewArchive: true,
        canEditArchive: true,
        canViewSettings: true,
      } : newPermissions
    };

    await addUser(newUser);

    // Reset Form
    setNewUsername('');
    setNewPassword('');
    setNewRole('user');
    setNewPermissions({
      canViewDashboard: true,
      canViewManagement: true,
      canEditManagement: false,
      canViewLeaves: true,
      canEditLeaves: false,
      canViewArchive: true,
      canEditArchive: false,
      canViewSettings: false,
    });
  };

  const handleStartEdit = (user: UserType) => {
    setEditingUserId(user.id);
    setEditPassword(user.password);
    setEditRole(user.role);
    setEditPermissions({
      canViewDashboard: user.permissions.canViewDashboard ?? true,
      canViewManagement: user.permissions.canViewManagement ?? true,
      canEditManagement: user.permissions.canEditManagement ?? false,
      canViewLeaves: user.permissions.canViewLeaves ?? true,
      canEditLeaves: user.permissions.canEditLeaves ?? false,
      canViewArchive: user.permissions.canViewArchive ?? true,
      canEditArchive: user.permissions.canEditArchive ?? false,
      canViewSettings: user.permissions.canViewSettings ?? false,
    });
  };

  const handleSaveEditSubmit = async (e: React.FormEvent, userId: string) => {
    e.preventDefault();
    if (editPassword.length < 4) {
      alert(t.passwordError);
      return;
    }

    const updatedPermissions = editRole === 'admin' ? {
      canViewDashboard: true,
      canViewManagement: true,
      canEditManagement: true,
      canViewLeaves: true,
      canEditLeaves: true,
      canViewArchive: true,
      canEditArchive: true,
      canViewSettings: true,
    } : editPermissions;

    if (updateUser) {
      await updateUser(userId, {
        password: editPassword,
        role: editRole,
        permissions: updatedPermissions
      });
      setEditingUserId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Overview stats header */}
      <div className="glass-panel p-6 rounded-[2.5rem] flex items-center justify-between gap-4 shadow-xl select-none">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyber-blue/15 rounded-2xl text-cyber-blue">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 animate-pulse-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{t.usersTab}</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              {config.language === 'ar' ? 'إجمالي الحسابات: ' : 'Total accounts: '} {users.length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Create User Form */}
        <div className="lg:col-span-5">
          <form onSubmit={handleCreateSubmit} className="glass-panel p-8 rounded-[3.5rem] shadow-xl space-y-6">
            <h4 className="text-md font-black text-cyber-blue select-none flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              {t.addUser}
            </h4>

            {/* Username */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block select-none">
                {t.username}
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                placeholder={config.language === 'ar' ? 'اسم المستخدم الجديد' : 'New username'}
                className="w-full bg-slate-950 border border-slate-900 rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-cyber-blue outline-none text-white transition-all shadow-inner"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block select-none">
                {t.password}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder={config.language === 'ar' ? 'كلمة المرور' : 'Password'}
                className="w-full bg-slate-950 border border-slate-900 rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-cyber-blue outline-none text-white transition-all shadow-inner"
                required
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block select-none">
                {t.role}
              </label>
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value as 'admin' | 'user')}
                className="w-full bg-slate-950 border border-slate-900 rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-cyber-blue outline-none text-white transition-all shadow-inner cursor-pointer"
              >
                <option value="user">{t.user}</option>
                <option value="admin">{t.admin}</option>
              </select>
            </div>

            {/* Access Permissions (If user) */}
            {newRole === 'user' && (
              <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in duration-200">
                <label className="text-xs font-black text-slate-300 block select-none">
                  {t.permissionsLabel}
                </label>
                <div className="space-y-3">
                  {Object.keys(newPermissions).map((permKey) => {
                    const key = permKey as keyof typeof newPermissions;
                    return (
                      <label key={key} className="flex items-center gap-3 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={newPermissions[key]}
                          onChange={e => setNewPermissions({ ...newPermissions, [key]: e.target.checked })}
                          className="w-4.5 h-4.5 rounded border-slate-900 bg-slate-950 text-cyber-blue focus:ring-cyber-blue cursor-pointer accent-cyber-blue"
                        />
                        <span>{t.permissions[key]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4.5 bg-cyber-blue text-slate-950 font-black rounded-2xl shadow-xl shadow-cyber-blue/15 hover:bg-cyan-500 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer outline-none active:scale-[0.98]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {t.addUser}
            </button>
          </form>
        </div>

        {/* Right Column: Users List & Live Editors */}
        <div className="lg:col-span-7 space-y-4">
          <h4 className="text-sm font-black text-indigo-400 select-none pl-2">
            {config.language === 'ar' ? 'الحسابات المسجلة وصلاحيات التعديل' : 'Registered Accounts & Edit Controls'}
          </h4>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
            {users.map(u => {
              const isEditing = editingUserId === u.id;

              return (
                <div
                  key={u.id}
                  className={`p-6 border rounded-[2.5rem] transition-all space-y-4 ${
                    isEditing 
                      ? 'bg-slate-950/60 border-cyber-blue/40 shadow-xl shadow-cyber-blue/5' 
                      : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                  }`}
                >
                  {/* User info line */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-white">{u.username}</span>
                        <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg ${
                          u.role === 'admin' 
                            ? 'bg-cyber-blue/10 text-cyber-blue border border-cyber-blue/20' 
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {u.role === 'admin' ? t.admin : t.user}
                        </span>
                      </div>
                      
                      {!isEditing && (
                        <div className="text-[11px] font-medium text-slate-500 flex items-center gap-2">
                          <span>{config.language === 'ar' ? 'كلمة المرور: ' : 'Password: '}</span>
                          <span className="font-mono text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-white/5 select-all">
                            {showPasswordIds[u.id] ? u.password : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(u.id)}
                            className="text-slate-400 hover:text-white transition-colors cursor-pointer focus:outline-none"
                            title={config.language === 'ar' ? 'إظهار/إخفاء' : 'Show/Hide'}
                          >
                            {showPasswordIds[u.id] ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 select-none">
                      {!isEditing ? (
                        <>
                          <button
                            onClick={() => handleStartEdit(u)}
                            className="px-3.5 py-2 text-xs font-black bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer outline-none"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            {t.edit}
                          </button>

                          {u.role !== 'admin' && (
                            <button
                              onClick={() => {
                                if (window.confirm(t.confirmUserDelete)) {
                                  deleteUser(u.id);
                                }
                              }}
                              className="px-3.5 py-2 text-xs font-black bg-cyber-rose/10 hover:bg-cyber-rose text-cyber-rose hover:text-white rounded-xl border border-cyber-rose/10 hover:border-cyber-rose/20 transition-all flex items-center gap-1.5 cursor-pointer outline-none"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              {t.delete}
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => setEditingUserId(null)}
                          className="px-3.5 py-2 text-xs font-black bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl border border-white/5 transition-all cursor-pointer outline-none"
                        >
                          {t.cancel}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Permissions tags (if view only) */}
                  {!isEditing && u.role === 'user' && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                      {Object.keys(u.permissions).map((permKey) => {
                        const key = permKey as keyof typeof u.permissions;
                        if (!u.permissions[key]) return null;
                        return (
                          <span key={key} className="px-2 py-0.5 text-[9px] font-bold bg-white/5 text-slate-400 rounded-md border border-white/5">
                            {t.permissions[key]}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Expanded Edit Form */}
                  {isEditing && (
                    <form onSubmit={(e) => handleSaveEditSubmit(e, u.id)} className="space-y-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
                      <h5 className="text-xs font-black text-cyber-blue select-none">
                        {t.editUser}
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Edit Password */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 block select-none">
                            {t.editPassword}
                          </label>
                          <input
                            type="password"
                            value={editPassword}
                            onChange={e => setEditPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-900 rounded-xl py-2 px-3.5 text-xs font-bold focus:border-cyber-blue outline-none text-white transition-all shadow-inner"
                            required
                          />
                        </div>

                        {/* Edit Role (Only if not default admin) */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 block select-none">
                            {t.role}
                          </label>
                          {u.id === 'admin-id' ? (
                            <input
                              type="text"
                              value={t.admin}
                              className="w-full bg-slate-900/60 border border-slate-900 rounded-xl py-2 px-3.5 text-xs font-bold text-slate-500 cursor-not-allowed outline-none"
                              disabled
                            />
                          ) : (
                            <select
                              value={editRole}
                              onChange={e => setEditRole(e.target.value as 'admin' | 'user')}
                              className="w-full bg-slate-950 border border-slate-900 rounded-xl py-2 px-3.5 text-xs font-bold focus:border-cyber-blue outline-none text-white transition-all shadow-inner cursor-pointer"
                            >
                              <option value="user">{t.user}</option>
                              <option value="admin">{t.admin}</option>
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Edit Access Permissions (If role is user) */}
                      {editRole === 'user' && (
                        <div className="space-y-3 pt-3 border-t border-white/5">
                          <label className="text-[10px] font-black text-slate-300 block select-none">
                            {t.editPermissions}
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {Object.keys(editPermissions).map((permKey) => {
                              const key = permKey as keyof typeof editPermissions;
                              return (
                                <label key={key} className="flex items-center gap-2 text-[11px] font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={editPermissions[key]}
                                    onChange={e => setEditPermissions({ ...editPermissions, [key]: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-900 bg-slate-950 text-cyber-blue focus:ring-cyber-blue cursor-pointer accent-cyber-blue"
                                  />
                                  <span>{t.permissions[key]}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="py-2.5 px-6 bg-cyber-blue text-slate-950 font-black rounded-xl shadow-lg hover:bg-cyan-500 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer outline-none"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {t.saveChanges}
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
