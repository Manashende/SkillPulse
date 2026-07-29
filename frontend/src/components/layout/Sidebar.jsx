import { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import './Sidebar.css';

// Reusable base props for all icons to ensure perfect uniformity
const iconProps = {
  viewBox: "0 0 24 24",
  width: "20",
  height: "20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
};

const NAV_ITEMS = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: <svg {...iconProps}><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg>
  },
  {
    path: '/skills',
    label: 'Skill Map',
    icon: <svg {...iconProps}><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>
  },
  {
    path: '/careers',
    label: 'Career Paths',
    icon: <svg {...iconProps}><path d="M3 19a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M19 7a2 2 0 1 0 0 -4a2 2 0 0 0 0 4z" /><path d="M11 19h5.5a3.5 3.5 0 0 0 0 -7h-8a3.5 3.5 0 0 1 0 -7h4.5" /></svg>
  },
  {
    path: '/goals',
    label: 'Goal Tracker',
    icon: <svg {...iconProps}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
  },
  {
    path: '/learning',
    label: 'Learning Hub',
    icon: <svg {...iconProps}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
  },
  {
    path: '/resume',
    label: 'Resume Builder',
    icon: <svg {...iconProps}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
  },
  {
    path: '/agent',
    label: 'AI Career Agent',
    icon: <svg {...iconProps}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
  },
  {
    path: '/achievements',
    label: 'Achievements',
    icon: <svg {...iconProps}><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>
  },
  {
    path: '/profile',
    label: 'Profile',
    icon: <svg {...iconProps}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
  },

];

const Sidebar = ({ className = '', onNavigate, onClose, collapsed, onToggleCollapse }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const level = user?.level || 1;
  const xp = user?.xp || 0;
  const [displayXp, setDisplayXp] = useState(xp);
  const prevXp = useRef(xp);

  useEffect(() => {
    if (xp === prevXp.current) return;
    const start = prevXp.current;
    const end = xp;
    const duration = 800;
    const startTime = performance.now();

    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setDisplayXp(Math.round(start + (end - start) * progress));
      if (progress < 1) requestAnimationFrame(step);
      else prevXp.current = end;
    };
    requestAnimationFrame(step);
  }, [xp]);
  const xpToNext = user?.xpToNextLevel || 200;
  const xpPct = xpToNext > 0 ? Math.min(Math.round((xp / (xp + xpToNext)) * 100), 100) : 100;
  const initials = (user?.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const LEVEL_TITLES = [
    '', 'Newcomer', 'Explorer', 'Learner', 'Developer',
    'Rising Star', 'Achiever', 'Expert', 'Master', 'Legend', 'SkillPulse Pro',
  ];
  const levelTitle = LEVEL_TITLES[Math.min(level, 10)] || 'Pro';

  return (
    <aside className={'sidebar' + (className ? ' ' + className : '') + (collapsed ? ' collapsed' : '')}>
      {/* Close button — mobile drawer only, hidden on desktop via CSS */}
      <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu" title="Close menu">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Brand — click to collapse/expand, desktop only */}
      <button
        className="sidebar-brand"
        onClick={() => { if (window.innerWidth > 768) onToggleCollapse?.(); }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <img src="/skillpulse-logo.png" alt="SkillPulse" className="brand-icon" />
        <div className="brand-text">
          <div className="brand-name">SkillPulse</div>
          <div className="brand-sub">Career Growth Suite</div>
        </div>
      </button>

      {/* User card */}
      <div className="sidebar-user">
        <div className="sidebar-avatar">{initials}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{user?.name || 'User'}</div>
          <div className="sidebar-user-level">Level {level} · {displayXp} XP</div>
          <div className="sidebar-xp-bar">
            <div className="sidebar-xp-fill" style={{ width: xpPct + '%' }} />
          </div>
          <div className="sidebar-xp-label">Progress to Lv.{level + 1}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => onNavigate?.()}
            title={item.label}
            className={({ isActive }) => 'sidebar-nav-item' + (isActive ? ' active' : '')}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            <span className="sidebar-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={handleLogout} title="Logout">
          <span className="sidebar-nav-icon">
            {/* Upgraded Logout Icon */}
            <svg {...iconProps}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          </span>
          <span className="sidebar-logout-label">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;