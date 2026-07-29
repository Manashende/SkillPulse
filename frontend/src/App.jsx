import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { AchievementUnlockProvider } from './context/AchievementUnlockContext';
import AchievementUnlockOverlay from './components/achievements/AchievementUnlockOverlay';
import ProtectedRoute from './components/common/ProtectedRoute';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Skills from './pages/Skills';
import Careers from './pages/Careers';
import Goals from './pages/Goals';
import Learning from './pages/Learning';
import Resume from './pages/ResumeBuilder';
import Achievements from './pages/Achievements';
import Profile from './pages/Profile';
import CareerAgent from './pages/CareerAgent';

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sp_sidebar_collapsed') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem('sp_sidebar_collapsed', collapsed); } catch { }
  }, [collapsed]);

  return (
    <div className="app-layout" style={collapsed ? { '--sidebar-w': '64px' } : undefined}>
      <Sidebar
        className={sidebarOpen ? 'open' : ''}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
        onNavigate={() => setSidebarOpen(false)}
        onClose={() => setSidebarOpen(false)}
      />
      {sidebarOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 }} onClick={() => setSidebarOpen(false)} />}
      <div className="main-content">
        <Header onMenuToggle={() => setSidebarOpen(o => !o)} />
        <Routes>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="skills" element={<Skills />} />
          <Route path="careers" element={<Careers />} />
          <Route path="goals" element={<Goals />} />
          <Route path="learning" element={<Learning />} />
          <Route path="resume" element={<Resume />} />
          <Route path="/agent" element={<CareerAgent />} />
          <Route path="achievements" element={<Achievements />} />
          <Route path="profile" element={<Profile />} />
        </Routes>
      </div>
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AchievementUnlockProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <AchievementUnlockOverlay />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/*" element={<AppLayout />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AchievementUnlockProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;