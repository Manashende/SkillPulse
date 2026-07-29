import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../services/api';
import { useState, useEffect, useRef } from 'react';
import { useHideOnScroll } from '../../hooks/useHideOnScroll';
import './Header.css';

const pageTitles = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Your career growth at a glance' },
  '/skills': { title: 'Skill Map', subtitle: 'Manage and visualize your skills' },
  '/careers': { title: 'Career Paths', subtitle: 'Explore roles matched to your skills' },
  '/goals': { title: 'Goal Tracker', subtitle: 'Set goals and track your progress' },
  '/learning': { title: 'Learning Hub', subtitle: 'Curated resources for skill growth' },
  '/resume': { title: 'Resume Builder', subtitle: 'Generate your resume from your profile' },
  '/achievements': { title: 'Achievements', subtitle: 'Your badges and milestones' },
  '/profile': { title: 'Profile', subtitle: 'Manage your account and preferences' },
};

const Header = ({ onMenuToggle }) => {
  const { pathname } = useLocation();
  const { user, updateUser } = useAuth();
  const page = pageTitles[pathname] || { title: 'SkillPulse', subtitle: '' };

  const isHidden = useHideOnScroll(15);

  // Theme is a per-device preference, stored purely in localStorage —
  // no backend sync, no user account involvement.
  const [localTheme, setLocalTheme] = useState(() => {
    try {
      return localStorage.getItem('sp_theme') || 'light';
    } catch {
      return 'light';
    }
  });

  // Keep the DOM attribute in sync whenever localTheme changes.
  // (index.html's inline script already set this correctly on first
  // paint, before React mounts, so there's no flash — this just keeps
  // it in sync for the rest of the session.)
  useEffect(() => {
    if (localTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [localTheme]);

  const toggleTheme = () => {
    const newTheme = localTheme === 'dark' ? 'light' : 'dark';
    setLocalTheme(newTheme);
    try {
      localStorage.setItem('sp_theme', newTheme);
    } catch { }
  };

  return (
    <header className={'topbar' + (isHidden ? ' topbar-hidden' : '')}>
      <button className="mobile-menu-btn" onClick={onMenuToggle}>
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <div className="topbar-left">
        <h1 className="topbar-title">{page.title}</h1>
        {page.subtitle && <p className="topbar-subtitle">{page.subtitle}</p>}
      </div>

      <div className="topbar-right">
        {/* Make sure to use localTheme here to determine which icon to show */}
        <button className="theme-toggle" onClick={toggleTheme} title={localTheme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}>
          {localTheme === 'dark' ? (
            // Sun Icon (Currently Dark, click to go Light)
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          ) : (
            // Moon Icon (Currently Light, click to go Dark)
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;