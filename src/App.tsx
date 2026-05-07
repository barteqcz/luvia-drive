import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Folder, 
  FolderPlus,
  File, 
  Upload, 
  Download, 
  Share2, 
  Trash2, 
  Edit2,
  LogOut, 
  Users, 
  Plus, 
  Search,
  HardDrive,
  ShieldCheck,
  ChevronRight,
  Cloud,
  Copy,
  Check,
  Clock,
  X,
  UploadCloud,
  Sun,
  Moon,
  RotateCcw,
  History,
  Trash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Styles & Helpers ---

const formatSize = (bytes: number) => {
  if (bytes === -1) return 'Unlimited';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  quota: number;
}

interface FileItem {
  name: string;
  size: number;
  type: 'directory' | 'file';
  updatedAt: string;
}

interface TrashItem {
  id: string;
  original_name: string;
  size: number;
  deleted_at: string;
}

// --- Components ---

const ThemeToggle = ({ theme, toggle }: { theme: 'light' | 'dark', toggle: () => void }) => (
  <button
    onClick={toggle}
    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 transition-all active:scale-95"
    title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
  >
    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
  </button>
);

const Modal = ({ children, onClose, title }: { children: React.ReactNode, onClose: () => void, title?: string }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    onClick={onClose}
  >
    <motion.div 
      initial={{ scale: 0.95, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.95, opacity: 0, y: 20 }}
      onClick={(e) => e.stopPropagation()}
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden border border-gray-100 dark:border-slate-700"
    >
      {title && (
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-400 dark:text-slate-500 transition-colors">
            <X size={18} />
          </button>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </motion.div>
  </motion.div>
);

const AlertModal = ({ message, type = 'error', onClose }: { message: string, type?: 'error' | 'success', onClose: () => void }) => (
  <Modal onClose={onClose}>
    <div className="flex flex-col items-center text-center">
      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center mb-4",
        type === 'error' ? "bg-red-50 dark:bg-red-900/20 text-red-500" : "bg-green-50 dark:bg-green-900/20 text-green-500"
      )}>
        {type === 'error' ? <ShieldCheck size={24} /> : <Check size={24} />}
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
        {type === 'error' ? 'Notice' : 'Success'}
      </h3>
      <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">{message}</p>
      <Button 
        onClick={onClose}
        className={cn(
          "w-full justify-center",
          type === 'error' ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100" : "bg-green-600 text-white hover:bg-green-700"
        )}
      >
        {type === 'error' ? 'Dismiss' : 'OK'}
      </Button>
    </div>
  </Modal>
);

const ConfirmModal = ({ message, onConfirm, onCancel }: { message: string, onConfirm: () => void, onCancel: () => void }) => (
  <Modal onClose={onCancel}>
    <div className="flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center mb-4">
        <Trash2 size={24} />
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Are you sure?</h3>
      <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">{message}</p>
      <div className="flex gap-3 w-full">
        <Button onClick={onCancel} className="flex-1 justify-center bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600">
          Cancel
        </Button>
        <Button onClick={onConfirm} className="flex-1 justify-center bg-red-600 text-white hover:bg-red-700">
          Confirm
        </Button>
      </div>
    </div>
  </Modal>
);

const Button = ({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button 
    className={cn(
      "px-4 py-2 rounded-lg font-medium transition-all active:scale-95 flex items-center gap-2",
      "disabled:opacity-50 disabled:pointer-events-none",
      className
    )}
    {...props}
  />
);

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm", className)}>
    {children}
  </div>
);

// --- Pages ---

const SetupPage = ({ onComplete, theme, toggleTheme }: { onComplete: () => void, theme: 'light' | 'dark', toggleTheme: () => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/setup/register', { username, password });
      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] dark:bg-slate-900 p-4 relative transition-colors">
      <div className="fixed sm:absolute top-4 sm:top-8 right-4 sm:right-8 z-50">
        <ThemeToggle theme={theme} toggle={toggleTheme} />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 shadow-xl dark:bg-slate-800 dark:border-slate-700">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
              <ShieldCheck className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">Welcome to Luvia Drive</h1>
            <p className="text-gray-400 mt-2 text-sm leading-relaxed">Initialize your administrator account to get started with your secure storage.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest block mb-2 leading-none">Admin Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand/20 dark:focus:ring-brand/90 transition-all"
                placeholder="e.g. admin"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest block mb-2 leading-none">Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand/20 dark:focus:ring-brand/90 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-sm text-center font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/40 italic transition-colors">
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-white hover:bg-brand-hover py-3.5 justify-center shadow-md"
            >
              {loading ? 'Setting up...' : 'Create Admin Account'}
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

const LoginPage = ({ onLogin, theme, toggleTheme }: { onLogin: (user: User) => void, theme: 'light' | 'dark', toggleTheme: () => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/login', { username, password });
      onLogin(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] dark:bg-slate-900 p-4 sm:p-6 relative transition-colors">
      <div className="fixed sm:absolute top-4 sm:top-8 right-4 sm:right-8 z-50">
        <ThemeToggle theme={theme} toggle={toggleTheme} />
      </div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 dark:bg-slate-800 dark:border-slate-700">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center text-white mb-4 shadow-md">
              <HardDrive size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-sans tracking-tight transition-colors">Luvia Drive</h1>
            <p className="text-gray-500 dark:text-slate-400 mt-1">Sign in to your secure account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1 leading-none">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand outline-none dark:text-white transition-all"
                placeholder="Enter username"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1 leading-none">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand outline-none dark:text-white transition-all"
                placeholder="Enter password"
                required
              />
            </div>
            {error && <p className="text-sm text-red-500 text-center font-medium">{error}</p>}
            <Button 
              type="submit" 
              className="w-full bg-brand text-white hover:bg-brand-hover justify-center py-3 mt-2"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700 text-center text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest">
            <p>Luvia Drive System &copy; 2026</p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

const Dashboard = ({ user, theme, toggleTheme }: { user: User, theme: 'light' | 'dark', toggleTheme: () => void }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [view, setView] = useState<'files' | 'trash'>('files');
  const [currentPath, setCurrentPath] = useState('');
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<{ used: number, quota: number }>({ used: 0, quota: user?.quota ?? 10737418240 });
  const [searchQuery, setSearchQuery] = useState('');
  const [shareTarget, setShareTarget] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'error' | 'success' } | null>(null);
  const [uploadState, setUploadState] = useState<{ progress: number, active: boolean, completed: boolean, fileName: string } | null>(null);
  const navigate = useNavigate();

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const [{ data: filesData }, { data: usageData }] = await Promise.all([
        axios.get('/api/files', { params: { path: currentPath } }),
        axios.get('/api/usage')
      ]);
      setFiles(filesData);
      setUsage(usageData);
    } catch (_err) {
      console.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/trash');
      setTrashItems(data);
    } catch (_err) {
      console.error('Failed to fetch trash');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.quota !== undefined) {
      setUsage(prev => ({ ...prev, quota: user.quota }));
    }
  }, [user]);

  useEffect(() => {
    if (view === 'files') fetchFiles();
    else fetchTrash();
  }, [view, currentPath]);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    setView('files');
  };

  const breadcrumbs = currentPath.split('/').filter(Boolean);
  const getBreadcrumbPath = (index: number) => {
    return breadcrumbs.slice(0, index + 1).join('/');
  };

  const handleCreateFolder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newFolderName.trim()) return;
    
    setIsCreatingFolder(true);
    try {
      await axios.post('/api/files/mkdir', {
        name: newFolderName,
        path: currentPath
      });
      setNewFolderName('');
      setIsCreateFolderModalOpen(false);
      fetchFiles();
      setNotification({ message: 'Folder created', type: 'success' });
    } catch (err: any) {
      setNotification({ message: err.response?.data?.error || 'Failed to create folder', type: 'error' });
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await axios.post(`/api/trash/restore/${id}`);
      fetchTrash();
      setNotification({ message: 'File restored successfully', type: 'success' });
    } catch (_err) {
      setNotification({ message: 'Restore failed', type: 'error' });
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await axios.delete('/api/trash/empty');
      fetchTrash();
      setNotification({ message: 'Trash emptied', type: 'success' });
    } catch (_err) {
      setNotification({ message: 'Emptying trash failed', type: 'error' });
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      await axios.delete(`/api/trash/${id}`);
      fetchTrash();
      setNotification({ message: 'Permanently deleted', type: 'success' });
    } catch (_err) {
      setNotification({ message: 'Failed to delete permanently', type: 'error' });
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const filesToUpload = Array.from(e.target.files) as File[];
    
    const name = filesToUpload.length > 1 ? `${filesToUpload.length} files` : (filesToUpload[0] as File).name;
    setUploadState({ progress: 0, active: true, completed: false, fileName: name });

    const formData = new FormData();
    filesToUpload.forEach((f: File) => formData.append('files', f));

    try {
      await axios.post(`/api/files/upload?path=${encodeURIComponent(currentPath)}`, formData, {
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || progressEvent.loaded));
          setUploadState(prev => prev ? { ...prev, progress: percent } : null);
        }
      });
      fetchFiles();
      setUploadState(prev => prev ? { ...prev, progress: 100, completed: true } : null);
      
      setTimeout(() => {
        setUploadState(null);
      }, 4000);
    } catch (_err) {
      setNotification({ message: 'Upload failed', type: 'error' });
      setUploadState(null);
    }
  };

  const handleDownload = (name: string) => {
    const fullPath = currentPath ? `${currentPath}/${name}` : name;
    window.location.href = `/api/files/download/${encodeURIComponent(fullPath)}`;
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const fullPath = currentPath ? `${currentPath}/${confirmDelete}` : confirmDelete;
    setConfirmDelete(null);
    try {
      await axios.delete(`/api/files/${encodeURIComponent(fullPath)}`);
      fetchFiles();
      setNotification({ message: 'File deleted successfully', type: 'success' });
    } catch (_err) {
      setNotification({ message: 'Delete failed', type: 'error' });
    }
  };

  const handleShare = (name: string) => {
    const fullPath = currentPath ? `${currentPath}/${name}` : name;
    setShareTarget(fullPath);
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col h-screen bg-[#F9FAFB] dark:bg-slate-900 transition-colors">
      {/* Modals */}
      <AnimatePresence mode="wait">
        {shareTarget && (
          <ShareModal 
            fileName={shareTarget} 
            onClose={() => setShareTarget(null)} 
          />
        )}
        {confirmDelete && (
          <ConfirmModal 
            message={`Are you sure you want to delete ${confirmDelete}? This action cannot be undone.`}
            onConfirm={handleDelete}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
        {notification && (
          <AlertModal 
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {uploadState && (
          <div className="fixed bottom-6 right-6 z-[100]">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 p-4 w-72"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 truncate pr-4">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    uploadState.completed ? "bg-green-50 dark:bg-green-900/20 text-green-600" : "bg-brand/10 dark:bg-brand/90 text-brand"
                  )}>
                    {uploadState.completed ? <Check size={18} /> : <UploadCloud size={18} className="animate-bounce" />}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{uploadState.fileName}</p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                      {uploadState.completed ? 'Finished' : `Uploading... ${uploadState.progress}%`}
                    </p>
                  </div>
                </div>
                {uploadState.completed && <Check className="text-green-500" size={16} />}
              </div>
              
              <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadState.progress}%` }}
                  className={cn(
                    "h-full transition-all duration-300",
                    uploadState.completed ? "bg-green-500" : "bg-brand"
                  )}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Navbar */}
      <header className="h-16 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800 flex items-center px-4 sm:px-6 shrink-0 z-10 transition-colors">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-full max-w-sm">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 transition-colors group-focus-within:text-brand" size={16} />
              <input 
                type="text" 
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-gray-100 dark:bg-slate-900 dark:text-white border-none rounded-lg focus:ring-2 focus:ring-brand transition-all outline-none text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 ml-auto">
          <ThemeToggle theme={theme} toggle={toggleTheme} />
          
          <div className="flex items-center gap-1 sm:gap-4 ml-1 sm:ml-2">
            {user.role === 'admin' && (
              <button 
                className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-semibold flex items-center gap-2"
                onClick={() => navigate('/admin')}
                title="Admin Panel"
              >
                <ShieldCheck size={18} />
                <span className="hidden md:inline">Admin</span>
              </button>
            )}
            <div className="flex items-center gap-2 sm:gap-3 sm:pl-4 sm:border-l border-gray-200 dark:border-slate-700">
              <div className="text-right hidden lg:block">
                <p className="text-sm font-semibold leading-none dark:text-white">{user.username}</p>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-widest font-bold mt-1">{user.role}</p>
              </div>
              <button 
                onClick={() => { axios.post('/api/logout').then(() => window.location.reload()); }}
                className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-500 transition-colors"
                title="Log out"
              >
                <LogOut size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Mini */}
        <aside className="w-16 sm:w-20 border-r border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800 flex flex-col items-center py-6 gap-6 shrink-0 transition-colors">
          <button 
            onClick={() => setView('files')}
            className={cn(
              "p-3 rounded-xl transition-all active:scale-95",
              view === 'files' ? "bg-brand text-white" : "text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-700"
            )}
            title="My Files"
          >
            <Folder size={24} fill={view === 'files' ? "currentColor" : "none"} />
          </button>
          <button 
            onClick={() => setView('trash')}
            className={cn(
              "p-3 rounded-xl transition-all active:scale-95 group relative",
              view === 'trash' ? "bg-red-600 text-white" : "text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-700 font-bold"
            )}
            title="Bin"
          >
            <div className="relative">
              <Trash size={24} fill={view === 'trash' ? "currentColor" : "none"} />
              {trashItems.length > 0 && view !== 'trash' && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-slate-800 rounded-full" />
              )}
            </div>
          </button>
        </aside>

        <main className="flex-1 overflow-hidden flex flex-col p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                {view === 'files' ? 'My Files' : 'Bin'}
              </h2>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
                <button 
                  onClick={() => handleNavigate('')}
                  className="hover:text-brand transition-colors"
                >
                  Home
                </button>
                {view === 'files' ? (
                  breadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={idx}>
                      <ChevronRight size={12} className="shrink-0" />
                      <button 
                        onClick={() => handleNavigate(getBreadcrumbPath(idx))}
                        className="hover:text-brand transition-colors truncate max-w-[100px]"
                      >
                        {crumb}
                      </button>
                    </React.Fragment>
                  ))
                ) : (
                  <>
                    <ChevronRight size={12} />
                    <span>Bin</span>
                  </>
                )}
              </div>
            </div>
<div className="flex flex-col md:flex-row md:items-center gap-4 w-full md:w-auto">
  
  {view === 'files' ? (
    <>
      {/* Storage section: Above buttons on mobile */}
      <div className="flex flex-col items-start md:items-end w-full md:w-auto">
        <div className="flex items-center gap-2 mb-1.5">
          <Cloud size={14} className="text-brand" />
          <span className="text-xs font-bold text-gray-600 dark:text-slate-300">Storage Used</span>
          <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">
            ({Math.min(100, usage.quota > 0 ? (usage.used / usage.quota) * 100 : 0).toFixed(1)}%)
          </span>
        </div>
        <div className="w-full md:w-48 h-1.5 bg-gray-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-1000",
              usage.quota === -1 ? "bg-brand/80" : (usage.quota > 0 && usage.used / usage.quota > 0.9 ? "bg-red-500" : "bg-brand")
            )}
            style={{ width: usage.quota === -1 ? '100%' : (usage.quota > 0 ? `${Math.min(100, (usage.used / usage.quota) * 100)}%` : '0%') }}
          />
        </div>
        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 font-medium italic">
          {formatSize(usage.used)} of {usage.quota === -1 ? 'Unlimited' : formatSize(usage.quota)} used
        </p>
      </div>

      {/* Buttons: Fixed height (h-11) ensures they match exactly */}
      <div className="flex items-center gap-2 w-full md:w-auto">
        <label className="flex-1 md:flex-none h-11 bg-brand text-white px-6 rounded-xl font-semibold cursor-pointer hover:bg-brand-hover transition-all flex items-center justify-center gap-2 active:scale-95 text-sm">
          <Upload size={18} />
          <span>Upload Files</span>
          <input type="file" multiple className="hidden" onChange={handleUpload} />
        </label>
        
        <button 
          onClick={() => setIsCreateFolderModalOpen(true)}
          className="h-11 px-4 bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-xl font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <FolderPlus size={18} />
          <span className="hidden sm:inline">New Folder</span>
        </button>
      </div>
    </>
  ) : (
    /* Trash Bin button - also use h-11 for consistency */
    <button
      onClick={handleEmptyTrash}
      className="h-11 px-6 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all flex items-center gap-2 active:scale-95 text-sm"
    >
      <Trash2 size={18} />
      Empty Trash
    </button>
  )}
</div>
          </div>

          {/* Space for additional mobile elements if needed */}


          <Card className="flex-1 flex flex-col dark:bg-slate-800 dark:border-slate-700 overflow-hidden relative">
            {view === 'trash' && (
              <div className="bg-amber-50 dark:bg-amber-900/10 px-6 py-3 border-b border-amber-100 dark:border-amber-900/30 flex items-center gap-2 text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest">
                <History size={14} />
                Items in the bin are deleted automatically after 30 days
              </div>
            )}
            <div className={cn(
              "hidden sm:grid gap-4 px-6 py-3 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest",
              view === 'files' ? "grid-cols-[1fr_120px_180px_120px]" : "grid-cols-[1fr_120px_180px_150px]"
            )}>
              <div>Name</div>
              <div>Size</div>
              <div>{view === 'files' ? 'Modified' : 'Deleted'}</div>
              <div className="text-right">Actions</div>
            </div>

          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {loading ? (
                <div className="p-12 text-center text-gray-400 dark:text-slate-500">Loading contents...</div>
              ) : view === 'files' ? (
                filteredFiles.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 dark:text-slate-500">
                    <Folder size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No files found here</p>
                  </div>
                ) : (
                  filteredFiles.map((file) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={file.name}
                      onClick={() => file.type === 'directory' ? handleNavigate(currentPath ? `${currentPath}/${file.name}` : file.name) : null}
                      className={cn(
                        "flex flex-col sm:grid sm:grid-cols-[1fr_120px_180px_120px] gap-2 sm:gap-4 px-4 sm:px-6 py-4 border-b border-gray-50 dark:border-slate-700/50 hover:bg-brand/10 dark:hover:bg-brand/90 transition-colors group cursor-default",
                        file.type === 'directory' && "cursor-pointer"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {file.type === 'directory' ? (
                          <Folder className="text-yellow-500 shrink-0" size={20} fill="currentColor" fillOpacity={0.2} />
                        ) : (
                          <File className="text-brand shrink-0" size={20} />
                        )}
                        <span className="font-medium text-gray-700 dark:text-slate-200 truncate flex-1">{file.name}</span>
                        
                        {/* Mobile Actions */}
                        <div className="flex items-center gap-1 sm:hidden">
                          {file.type === 'file' ? (
                            <button onClick={(e) => { e.stopPropagation(); handleDownload(file.name); }} className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-brand">
                              <Download size={16} />
                            </button>
                          ) : null}
                          <button onClick={(e) => { e.stopPropagation(); handleShare(file.name); }} className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-brand">
                            <Share2 size={16} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(file.name); }} className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-600">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 sm:gap-0">
                        <div className="flex items-center text-xs sm:text-sm text-gray-500 dark:text-slate-400 font-mono">
                          <span className="sm:hidden font-bold mr-2 text-[10px] uppercase tracking-wider text-gray-300">Size:</span>
                          {file.type === 'file' ? formatSize(file.size) : '--'}
                        </div>
                        <div className="flex items-center text-xs sm:text-sm text-gray-400 dark:text-slate-500 ml-auto sm:ml-0">
                          <span className="sm:hidden font-bold mr-2 text-[10px] uppercase tracking-wider text-gray-300">Date:</span>
                          {new Date(file.updatedAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Desktop Actions */}
                      <div className="hidden sm:flex items-center justify-end gap-1">
                        {file.type === 'file' ? (
                          <button onClick={(e) => { e.stopPropagation(); handleDownload(file.name); }} className="p-2 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-lg text-gray-400 dark:text-slate-500 hover:text-brand dark:hover:text-brand/80 transition-all opacity-0 group-hover:opacity-100">
                            <Download size={18} />
                          </button>
                        ) : null}
                        <button onClick={(e) => { e.stopPropagation(); handleShare(file.name); }} className="p-2 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-lg text-gray-400 dark:text-slate-500 hover:text-brand dark:hover:text-brand/80 transition-all opacity-0 group-hover:opacity-100">
                          <Share2 size={18} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(file.name); }} className="p-2 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-lg text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )
              ) : (
                trashItems.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 dark:text-slate-500">
                    <Trash size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Bin is empty</p>
                  </div>
                ) : (
                  trashItems.map((item) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={item.id}
                      className="flex flex-col sm:grid sm:grid-cols-[1fr_120px_180px_150px] gap-2 sm:gap-4 px-4 sm:px-6 py-4 border-b border-gray-50 dark:border-slate-700/50 hover:bg-red-50/20 dark:hover:bg-red-900/10 transition-colors group cursor-default"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <File className="text-gray-400 dark:text-slate-600 shrink-0" size={20} />
                        <span className="font-medium text-gray-700 dark:text-slate-200 truncate flex-1">{item.original_name}</span>
                      </div>
                      
                      <div className="flex items-center gap-4 sm:gap-0">
                        <div className="flex items-center text-xs sm:text-sm text-gray-500 dark:text-slate-400 font-mono">
                          <span className="sm:hidden font-bold mr-2 text-[10px] uppercase tracking-wider text-gray-300">Size:</span>
                          {formatSize(item.size)}
                        </div>
                        <div className="flex items-center text-xs sm:text-sm text-gray-400 dark:text-slate-500 ml-auto sm:ml-0">
                          <span className="sm:hidden font-bold mr-2 text-[10px] uppercase tracking-wider text-gray-300">Deleted:</span>
                          {new Date(item.deleted_at).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="hidden sm:flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleRestore(item.id)} 
                          className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-500 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          <RotateCcw size={14} />
                          Restore
                        </button>
                        <button 
                          onClick={() => handlePermanentDelete(item.id)} 
                          className="p-2 text-gray-300 dark:text-slate-600 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      {/* Mobile Restore */}
                      <div className="sm:hidden flex gap-2">
                        <button onClick={() => handleRestore(item.id)} className="flex-1 py-2 bg-green-50 text-green-600 text-xs font-bold rounded-lg">Restore</button>
                        <button onClick={() => handlePermanentDelete(item.id)} className="flex-1 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg">Delete Forever</button>
                      </div>
                    </motion.div>
                  ))
                )
              )}
            </AnimatePresence>
          </div>
        </Card>
      </main>

      {/* New Folder Modal */}
      <AnimatePresence>
        {isCreateFolderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateFolderModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">New Folder</h3>
                  <button 
                    onClick={() => setIsCreateFolderModalOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleCreateFolder}>
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-2">Folder Name</label>
                    <div className="relative">
                      <Folder className="absolute left-4 top-1/2 -translate-y-1/2 text-brand" size={18} />
                      <input 
                        autoFocus
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="My Documents"
                        className="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setIsCreateFolderModalOpen(false)}
                      className="flex-1 py-3 border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingFolder || !newFolderName.trim()}
                      className="flex-1 py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-hover shadow-lg shadow-brand/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                    >
                      {isCreatingFolder ? 'Creating...' : 'Create Folder'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  </div>
  );
};

const AdminPanel = ({ user, theme, toggleTheme }: { user: User, theme: 'light' | 'dark', toggleTheme: () => void }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'user'|'admin'>('user');
  const [newQuota, setNewQuota] = useState('10'); // GB
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<'user'|'admin'>('user');
  const [notification, setNotification] = useState<{ message: string, type: 'error' | 'success' } | null>(null);
  const [userToDelete, setUserToDelete] = useState<{id: string, username: string} | null>(null);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get('/api/admin/users');
      setUsers(data);
    } catch (_err) {
      console.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const quotaBytes = isUnlimited ? -1 : parseFloat(newQuota) * 1024 * 1024 * 1024;
      await axios.post('/api/admin/users', { 
        username: newUsername, 
        password: newPassword, 
        role: newRole,
        quota: quotaBytes
      });
      setNewUsername('');
      setNewPassword('');
      fetchUsers();
      setNotification({ message: 'User created successfully', type: 'success' });
    } catch (err: any) {
      setNotification({ message: err.response?.data?.error || 'Failed to create user', type: 'error' });
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const quotaBytes = isUnlimited ? -1 : parseFloat(newQuota) * 1024 * 1024 * 1024;
      await axios.patch(`/api/admin/users/${editingUser.id}`, { 
        quota: quotaBytes,
        role: editRole
      });
      setEditingUser(null);
      fetchUsers();
      setNotification({ message: 'User updated successfully', type: 'success' });
    } catch (err: any) {
      setNotification({ message: err.response?.data?.error || 'Failed to update user', type: 'error' });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await axios.delete(`/api/admin/users/${userToDelete.id}`);
      fetchUsers();
      setNotification({ message: `User ${userToDelete.username} removed`, type: 'success' });
    } catch (err: any) {
      setNotification({ message: err.response?.data?.error || 'Failed to delete user', type: 'error' });
    } finally {
      setUserToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-slate-900 p-4 sm:p-8 transition-colors relative">
      <div className="fixed sm:absolute top-4 sm:top-8 right-4 sm:right-8 z-50">
        <ThemeToggle theme={theme} toggle={toggleTheme} />
      </div>

        <AnimatePresence>
          {notification && (
            <AlertModal 
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification(null)}
            />
          )}
          {userToDelete && (
            <ConfirmModal 
              message={`Are you sure you want to remove user "${userToDelete.username}"? Their access will be revoked immediately.`}
              onConfirm={handleDeleteUser}
              onCancel={() => setUserToDelete(null)}
            />
          )}
          {editingUser && (
            <Modal title="Edit User" onClose={() => setEditingUser(null)}>
              <form onSubmit={handleUpdateUser} className="space-y-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">Modify details for <b>{editingUser.username}</b></p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 leading-none">Access Role</label>
                      <select 
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as any)}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand transition-all"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 leading-none">Storage Quota</label>
                      <div className="flex gap-2 mb-2">
                        <input 
                          type="number" 
                          value={newQuota}
                          onChange={(e) => setNewQuota(e.target.value)}
                          disabled={isUnlimited}
                          className="flex-1 px-4 py-2 bg-gray-50 dark:bg-slate-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand disabled:opacity-50 transition-all"
                          placeholder="e.g. 10"
                          step="0.1"
                          min="0.1"
                        />
                        <div className="flex items-center px-3 bg-gray-100 dark:bg-slate-700 rounded-lg text-gray-500 font-bold text-xs uppercase tracking-widest">GB</div>
                      </div>
                      
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={cn(
                          "w-10 h-6 rounded-full transition-all relative",
                          isUnlimited ? "bg-brand" : "bg-gray-200 dark:bg-slate-700"
                        )}>
                          <input type="checkbox" className="hidden" checked={isUnlimited} onChange={(e) => setIsUnlimited(e.target.checked)} />
                          <div className={cn(
                            "w-4 h-4 rounded-full bg-white absolute top-1 transition-all shadow-sm",
                            isUnlimited ? "left-5" : "left-1"
                          )} />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Unlimited Storage</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-2">
                  <Button type="button" onClick={() => setEditingUser(null)} className="flex-1 justify-center bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">Cancel</Button>
                  <Button type="submit" className="flex-1 justify-center bg-brand text-white hover:bg-brand-hover shadow-md">Save Changes</Button>
                </div>
              </form>
            </Modal>
          )}
        </AnimatePresence>
      <div className="max-w-6xl mx-auto sm:pt-0 pt-12">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button 
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-colors text-gray-600 dark:text-slate-400"
            >
              <ChevronRight className="rotate-180" size={20} />
            </button>
            <h2 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white transition-colors">User Management</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <Card className="p-5 sm:p-6 h-fit dark:bg-slate-800 dark:border-slate-700">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 dark:text-white">
              <Plus size={20} className="text-brand" />
              Add User
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 leading-none">Username</label>
                <input 
                  type="text" 
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 leading-none">Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 leading-none">Role</label>
                <select 
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand transition-all"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 leading-none">Disk Quota (GB)</label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={newQuota}
                      onChange={(e) => setNewQuota(e.target.value)}
                      disabled={isUnlimited}
                      className="flex-1 px-4 py-2 bg-gray-50 dark:bg-slate-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand disabled:opacity-50 transition-all"
                      placeholder="e.g. 10"
                      step="0.1"
                    />
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={cn(
                      "w-10 h-6 rounded-full transition-all relative",
                      isUnlimited ? "bg-brand" : "bg-gray-200 dark:bg-slate-700"
                    )}>
                      <input type="checkbox" className="hidden" checked={isUnlimited} onChange={(e) => setIsUnlimited(e.target.checked)} />
                      <div className={cn(
                        "w-4 h-4 rounded-full bg-white absolute top-1 transition-all shadow-sm",
                        isUnlimited ? "left-5" : "left-1"
                      )} />
                    </div>
                    <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Unlimited</span>
                  </label>
                </div>
              </div>
              <Button type="submit" className="w-full bg-brand text-white hover:bg-brand-hover justify-center mt-2 shadow-md py-3 active:scale-95 transition-all">
                Create User
              </Button>
            </form>
          </Card>

          <Card className="lg:col-span-2 dark:bg-slate-800 dark:border-slate-700 flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2 text-gray-600 dark:text-slate-300">
                <Users size={18} />
                Registered Users
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] sm:min-w-0">
                <thead>
                  <tr className="text-left text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest bg-gray-50/50 dark:bg-slate-900/30">
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Quota</th>
                    <th className="px-6 py-4 hidden sm:table-cell">Joined</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-700 dark:text-slate-200">{u.username}</div>
                        <div className="sm:hidden text-[10px] text-gray-400 mt-0.5">
                          {new Date((u as any).created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                          u.role === 'admin' ? "bg-purple-100 dark:bg-purple-900/20 text-purple-600" : "bg-brand/10 dark:bg-brand/90 text-brand"
                        )}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs font-mono text-gray-500 dark:text-slate-400">
                          {formatSize(u.quota)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400 dark:text-slate-500 hidden sm:table-cell">
                        {new Date((u as any).created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => {
                              setNewQuota(u.quota === -1 ? '10' : (u.quota / (1024*1024*1024)).toString());
                              setIsUnlimited(u.quota === -1);
                              setEditRole(u.role);
                              setEditingUser(u);
                            }}
                            className="p-2 hover:bg-brand/10 dark:hover:bg-brand/90 rounded-lg text-gray-400 dark:text-slate-500 hover:text-brand transition-colors"
                            title="Edit User"
                          >
                            <Edit2 size={18} />
                          </button>
                          {user.id !== u.id && (
                            <button 
                              onClick={() => setUserToDelete({ id: u.id, username: u.username })}
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-400 dark:text-slate-500 hover:text-red-500 transition-colors"
                              title="Delete User"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && !loading && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400 dark:text-slate-500 font-medium italic">No users found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const ShareModal = ({ fileName, onClose }: { fileName: string, onClose: () => void }) => {
  const [expiryType, setExpiryType] = useState<'time' | 'downloads' | 'none'>('none');
  const [expiresAfter, setExpiresAfter] = useState('never');
  const [downloadLimit, setDownloadLimit] = useState(0); // 0 means unlimited
  const [shareLink, setShareLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const createShare = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post('/api/files/share', { 
        name: fileName,
        expiresAfter: expiryType === 'time' ? expiresAfter : 'never',
        downloadLimit: expiryType === 'downloads' ? downloadLimit : 0
      });
      setShareLink(window.location.origin + data.share_link);
    } catch (_err: any) {
      setShareLink('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_err) {
      const input = document.getElementById('share-link-input') as HTMLInputElement;
      input?.select();
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-slate-700 transition-colors"
      >
        <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white transition-colors">Share File</h3>
            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1 truncate max-w-[280px]">{fileName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-400 dark:text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {shareLink === 'error' ? (
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center mb-4">
                <ShieldCheck size={24} />
              </div>
              <p className="text-gray-900 dark:text-white font-bold mb-1 transition-colors">Creation Failed</p>
              <p className="text-gray-500 dark:text-slate-400 text-sm mb-6 leading-none">We couldn't generate the share link. Please try again.</p>
              <Button onClick={() => setShareLink('')} className="w-full justify-center bg-gray-900 dark:bg-slate-700 text-white dark:text-white hover:bg-gray-800">
                Try Again
              </Button>
            </div>
          ) : !shareLink ? (
            <>
              <div className="space-y-4">
                <div className="flex p-1 bg-gray-100 dark:bg-slate-900 rounded-xl transition-colors">
                  <button 
                    onClick={() => setExpiryType('none')}
                    className={cn(
                      "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                      expiryType === 'none' ? "bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm" : "text-gray-400 dark:text-slate-600"
                    )}
                  >
                    Unlimited
                  </button>
                  <button 
                    onClick={() => {
                      setExpiryType('time');
                      if (expiresAfter === 'never') setExpiresAfter('24');
                    }}
                    className={cn(
                      "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                      expiryType === 'time' ? "bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm" : "text-gray-400 dark:text-slate-600"
                    )}
                  >
                    By Time
                  </button>
                  <button 
                    onClick={() => {
                      setExpiryType('downloads');
                      if (downloadLimit === 0) setDownloadLimit(1);
                    }}
                    className={cn(
                      "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                      expiryType === 'downloads' ? "bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm" : "text-gray-400 dark:text-slate-600"
                    )}
                  >
                    By Downloads
                  </button>
                </div>

                {expiryType === 'time' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest block mb-2 leading-none">
                      Expiration Time
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: '1 Hour', value: '1' },
                        { label: '1 Day', value: '24' },
                        { label: '7 Days', value: '168' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setExpiresAfter(opt.value)}
                          className={cn(
                            "px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1 transition-all",
                            expiresAfter === opt.value 
                              ? "bg-brand/10 dark:bg-brand/90 border-brand/20 dark:border-brand/40 text-brand dark:text-brand shadow-sm" 
                              : "bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-200 dark:hover:border-slate-600"
                          )}
                        >
                          <Clock size={12} />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {expiryType === 'downloads' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest block mb-2 leading-none">
                      Download Limit
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Once', value: 1 },
                        { label: '5 Times', value: 5 },
                        { label: '10 Times', value: 10 },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setDownloadLimit(opt.value)}
                          className={cn(
                            "px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center",
                            downloadLimit === opt.value 
                              ? "bg-brand/10 dark:bg-brand/90 border-brand/20 dark:border-brand/40 text-brand dark:text-brand shadow-sm" 
                              : "bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-200 dark:hover:border-slate-600"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {expiryType === 'none' && (
                  <div className="py-4 text-center">
                    <p className="text-sm text-gray-400 dark:text-slate-500 font-medium italic">This link will never expire and has no download limits.</p>
                  </div>
                )}
              </div>

              <Button 
                onClick={createShare}
                disabled={loading}
                className="w-full bg-brand text-white hover:bg-brand-hover py-3 justify-center shadow-md transition-transform active:scale-95"
              >
                {loading ? 'Creating Link...' : 'Generate Share Link'}
              </Button>
            </>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-xl flex items-center gap-3 text-green-700 dark:text-green-400 text-sm font-medium">
                <div className="p-1.5 bg-green-100 dark:bg-green-900/40 rounded-full shrink-0">
                  <Check size={16} />
                </div>
                <span>Link generated successfully!</span>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest block mb-1 leading-none">
                  Share Link
                </label>
                <div className="flex gap-2">
                  <input 
                    id="share-link-input"
                    type="text" 
                    readOnly 
                    value={shareLink}
                    className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-gray-600 dark:text-slate-300 font-mono outline-none"
                  />
                  <button 
                    onClick={handleCopy}
                    className={cn(
                      "p-3 rounded-xl transition-all flex items-center justify-center w-12 h-12 shrink-0 shadow-sm",
                      copied ? "bg-green-500 text-white" : "bg-brand text-white hover:bg-brand-hover"
                    )}
                  >
                    {copied ? <Check size={20} /> : <Copy size={20} />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  onClick={onClose}
                  className="w-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 justify-center py-3"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const SharePage = ({ theme, toggleTheme }: { theme: 'light' | 'dark', toggleTheme: () => void }) => {
  const { token } = useParams();
  const [file, setFile] = useState<{ name: string; size: number, is_directory: boolean } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/share/info/${token}`)
      .then(({ data }) => setFile(data))
      .catch((_err) => setError(_err.response?.data?.error || 'Link expired or invalid'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#F9FAFB] dark:bg-slate-900 transition-colors text-gray-400 dark:text-slate-500 font-medium italic">
      Loading shared content...
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] dark:bg-slate-900 transition-colors p-4 sm:p-6 relative">
      <div className="fixed sm:absolute top-4 sm:top-8 right-4 sm:right-8 z-50">
        <ThemeToggle theme={theme} toggle={toggleTheme} />
      </div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md text-center"
      >
        <Card className="p-6 sm:p-10 flex flex-col items-center dark:bg-slate-800 dark:border-slate-700">
          <div className={cn(
            "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-6 transition-transform hover:scale-110",
            file?.is_directory ? "bg-yellow-50 dark:bg-yellow-900/10 text-yellow-600 dark:text-yellow-400" : "bg-brand/10 dark:bg-brand/90 text-brand"
          )}>
            {file?.is_directory ? (
              <>
                <Folder size={32} className="sm:hidden" />
                <Folder size={40} className="hidden sm:block" />
              </>
            ) : (
              <>
                <File size={32} className="sm:hidden" />
                <File size={40} className="hidden sm:block" />
              </>
            )}
          </div>
          
          {error ? (
            <div className="space-y-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white transition-colors">Shared Link Unavailable</h2>
              <p className="text-sm sm:text-base text-gray-500 dark:text-slate-400 leading-relaxed font-normal">{error}</p>
              <div className="pt-4">
                <Button className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 h-10 sm:h-11 px-6 sm:px-8 text-sm" onClick={() => window.location.href = '/'}>
                  Go to Homepage
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1 truncate w-full px-4 transition-colors" title={file?.name}>
                {file?.name}
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 dark:text-slate-500 mb-6 sm:mb-8 font-medium">
                {file?.is_directory ? 'Estimated Zip ' : ''}Size: {file ? formatSize(file.size) : '0 B'}
              </p>
              
              <Button 
                onClick={() => window.location.href = `/api/share/download/${token}`}
                className="w-full bg-brand text-white hover:bg-brand-hover justify-center py-3.5 sm:py-4 text-base sm:text-lg shadow-md transition-transform active:scale-95"
              >
                <Download size={20} className="sm:w-5 sm:h-5" />
                {file?.is_directory ? 'Download Folder (.zip)' : 'Download File'}
              </Button>
            </>
          )}

          <div className="mt-8 sm:mt-10 pt-6 border-t border-gray-100 dark:border-slate-700 w-full flex items-center justify-center gap-2 text-gray-400 dark:text-slate-500 text-sm">
            <HardDrive size={16} />
            <span className="font-bold tracking-tight">Luvia Drive</span>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

// --- App Entry ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 
             (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const checkStatus = async () => {
    try {
      const setupRes = await axios.get('/api/setup/status');
      if (setupRes.data.needsSetup) {
        setNeedsSetup(true);
        setInitializing(false);
        return;
      }

      setNeedsSetup(false);
      const { data } = await axios.get('/api/me');
      setUser(data);
    } catch (_err) {
      setUser(null);
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  if (initializing) return (
    <div className="h-screen flex items-center justify-center bg-[#F9FAFB] dark:bg-slate-900 transition-colors">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 dark:text-slate-500 font-medium animate-pulse">Loading secure space...</p>
      </div>
    </div>
  );

  if (needsSetup) {
    return (
      <Routes>
        <Route path="*" element={<SetupPage onComplete={checkStatus} theme={theme} toggleTheme={toggleTheme} />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage onLogin={setUser} theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/s/:token" element={<SharePage theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/" element={user ? <Dashboard user={user} theme={theme} toggleTheme={toggleTheme} /> : <Navigate to="/login" />} />
      <Route path="/admin" element={user?.role === 'admin' ? <AdminPanel user={user} theme={theme} toggleTheme={toggleTheme} /> : <Navigate to="/" />} />
    </Routes>
  );
}
