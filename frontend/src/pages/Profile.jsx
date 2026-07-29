import { useState, useContext, useEffect } from 'react';
import { userAPI } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useAchievementUnlock } from '../context/AchievementUnlockContext';
import toast from 'react-hot-toast';
import './Profile.css';
import { useNavigate } from 'react-router-dom';
import ProfileSkeleton from '../components/profile/ProfileSkeleton';

// Standard SVG Icon properties
const iconProps = { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };

const LEVEL_TITLES = [
  '', 'Newcomer', 'Explorer', 'Learner', 'Developer',
  'Rising Star', 'Achiever', 'Expert', 'Master', 'Legend', 'SkillPulse Pro',
];

const Profile = () => {
  const { user, logout, updateUser, refreshUser } = useContext(AuthContext);
  const { announce } = useAchievementUnlock();
  const navigate = useNavigate();

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: user?.bio || '',
    location: user?.location || '',
    github: user?.github || '',
    linkedin: user?.linkedin || '',
  });

  const [passForm, setPassForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletingAcct, setDeletingAcct] = useState(false);
  const [richUser, setRichUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userAPI.getDashboard()
      .then(({ data }) => {
        setRichUser(data.user);
        updateUser(data.user);
      })
      .catch(() => toast.error('Failed to load profile stats'))
      .finally(() => setLoading(false));
  }, []);

  const displayUser = richUser || user || {};

  const pf = (key, val) => setProfileForm(f => ({ ...f, [key]: val }));
  const pw = (key, val) => setPassForm(f => ({ ...f, [key]: val }));

  const isValidUrl = (url) => !url || /^https?:\/\/.+/i.test(url);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) { toast.error('Name is required'); return; }
    if (!isValidUrl(profileForm.github)) { toast.error('GitHub link must start with http:// or https://'); return; }
    if (!isValidUrl(profileForm.linkedin)) { toast.error('LinkedIn link must start with http:// or https://'); return; }
    setSavingProfile(true);
    try {
      const { data } = await userAPI.updateProfile(profileForm);
      const merged = { ...displayUser, ...data.user };
      updateUser(merged);
      setRichUser(merged);   // <-- add this line
      toast.success('Profile updated!');
      if (data.newAchievements?.length) {
        announce(data.newAchievements);
        if (refreshUser) refreshUser();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally { setSavingProfile(false); }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (passForm.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSavingPass(true);
    try {
      await userAPI.changePassword({ currentPassword: passForm.currentPassword, newPassword: passForm.newPassword });
      toast.success('Password changed!');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setSavingPass(false); }
  };

  /*
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') { toast.error('Type DELETE to confirm'); return; }
    setDeletingAcct(true);
    try {
      await userAPI.deleteAccount();

      // Clear every account-scoped key cached in this browser. sp_token /
      // sp_user are handled by logout() below — these are the additional
      // app-state keys that would otherwise leak into whichever account
      // logs in next on this device. sp_theme is intentionally left alone —
      // it's a per-device preference, not account data.
      Object.keys(localStorage)
        .filter(k =>
          k.startsWith('sp_steps_') ||
          k.startsWith('sp_meta_') ||
          k === 'sp_career_agent_chat' ||
          k === 'sp_ai_learning_path' ||
          k === 'sp_target_career' ||
          k === 'sp_ats_result' ||
          k === 'sp_ats_target_role' ||
          k === 'sp_ats_show' ||
          k === 'sp_ats_job_description' ||
          k === 'sp_ats_keyword_match' ||
          k === 'sp_hide_match_explain'
        )
        .forEach(k => localStorage.removeItem(k));

      toast.success('Account deleted successfully');
      logout(); // properly clears sp_token/sp_user and resets auth state — no stale token left behind
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete account');
      setDeletingAcct(false);
    }
  };
  */

  const initials = (displayUser.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const level = displayUser.level || 1;
  const xp = displayUser.xp || 0;
  const xpToNext = displayUser.xpToNextLevel || 200;
  const xpPct = xpToNext > 0 ? Math.min(Math.round((xp / (xp + xpToNext)) * 100), 100) : 100;
  const lvTitle = LEVEL_TITLES[Math.min(level, 10)] || 'Pro';
  const skillCount = displayUser.skillCount || 0;
  const goalCount = displayUser.goalCount || 0;
  const achCount = displayUser.achievementCount || 0;

  if (loading) return <ProfileSkeleton />;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Manage your account and settings</p>
        </div>
      </div>

      <div className="profile-layout">

        <div className="profile-avatar-card">
          <div className="profile-avatar-ring">
            <div className="profile-avatar">{initials}</div>
          </div>
          <div className="profile-name">{displayUser.name || 'User'}</div>
          <div className="profile-email">{displayUser.email}</div>

          <div className="profile-level-section">
            <div className="profile-level-badge">
              <span className="plb-num">{level}</span>
              <span className="plb-title">{lvTitle}</span>
            </div>
            <div className="profile-level-row">
              <span className="profile-level-label">Level {level}</span>
              <span className="profile-xp-label">{xp} XP</span>
            </div>
            <div className="progress-bar" style={{ height: '7px' }}>
              <div className="progress-fill" style={{
                width: xpPct + '%',
                background: 'linear-gradient(90deg,#FF5A5A,#FF8B5A,#FFD45A)',
              }} />
            </div>
            <div className="profile-level-sub">{xpToNext} XP to Level {level + 1}</div>
          </div>

          <div className="profile-stats-grid">
            <div className="profile-mini-stat">
              <div className="profile-mini-val">{skillCount}</div>
              <div className="profile-mini-lbl">Skills</div>
            </div>
            <div className="profile-mini-stat">
              <div className="profile-mini-val">{goalCount}</div>
              <div className="profile-mini-lbl">Goals</div>
            </div>
            <div className="profile-mini-stat">
              <div className="profile-mini-val">{achCount}</div>
              <div className="profile-mini-lbl">Badges</div>
            </div>
          </div>

          {displayUser.location && (
            <div className="profile-location" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <svg {...iconProps} width="14" height="14" style={{ color: 'var(--text-muted)' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              {displayUser.location}
            </div>
          )}
          {displayUser.bio && <p className="profile-bio">{displayUser.bio}</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '1rem' }}>
            {displayUser.github && (
              <a href={displayUser.github} target="_blank" rel="noopener noreferrer" className="profile-social-link">
                <svg {...iconProps} width="14" height="14"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></svg>
                {displayUser.github.replace(/^https?:\/\//, '')}
              </a>
            )}
            {displayUser.linkedin && (
              <a href={displayUser.linkedin} target="_blank" rel="noopener noreferrer" className="profile-social-link">
                <svg {...iconProps} width="14" height="14"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
                {displayUser.linkedin.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>

          <div className="profile-member-since">
            Member since {new Date(displayUser.createdAt || Date.now()).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </div>
        </div>

        <div className="profile-settings">
          <div className="profile-tabs">
            <button className={'profile-tab' + (activeTab === 'profile' ? ' active' : '')} onClick={() => setActiveTab('profile')}>Edit Profile</button>
            <button className={'profile-tab' + (activeTab === 'password' ? ' active' : '')} onClick={() => setActiveTab('password')}>Change Password</button>
            {/* <button className={'profile-tab danger-tab' + (activeTab === 'danger' ? ' active' : '')} onClick={() => setActiveTab('danger')}>Delete Account</button> */}
          </div>

          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSave} className="profile-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input value={profileForm.name} onChange={e => pf('name', e.target.value)} placeholder="Your full name" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input value={profileForm.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Bio</label>
                <textarea value={profileForm.bio} onChange={e => pf('bio', e.target.value)} placeholder="Tell us about yourself and your career goals…" rows={3} style={{ resize: 'vertical' }} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input value={profileForm.location} onChange={e => pf('location', e.target.value)} placeholder="e.g. Pune, Maharashtra" />
                </div>
                <div className="form-group">
                  <label className="form-label">GitHub Profile URL</label>
                  <input value={profileForm.github} onChange={e => pf('github', e.target.value)} placeholder="https://github.com/yourusername" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">LinkedIn Profile URL</label>
                <input value={profileForm.linkedin} onChange={e => pf('linkedin', e.target.value)} placeholder="https://linkedin.com/in/yourusername" />
              </div>
              <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                {savingProfile ? 'Saving…' : 'Save Profile'}
              </button>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSave} className="profile-form">
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input type="password" value={passForm.currentPassword} onChange={e => pw('currentPassword', e.target.value)} placeholder="Enter current password" required />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" value={passForm.newPassword} onChange={e => pw('newPassword', e.target.value)} placeholder="Minimum 6 characters" required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input type="password" value={passForm.confirmPassword} onChange={e => pw('confirmPassword', e.target.value)} placeholder="Re-enter new password" required />
              </div>
              {passForm.newPassword.length > 0 && (
                <div className="pass-strength">
                  <div className="pass-strength-bar">
                    <div className="pass-strength-fill" style={{
                      width: Math.min(passForm.newPassword.length * 10, 100) + '%',
                      background: passForm.newPassword.length < 6 ? '#FF5A5A' : passForm.newPassword.length < 10 ? '#FFA95A' : '#10b981',
                    }} />
                  </div>
                  <span className="pass-strength-label">
                    {passForm.newPassword.length < 6 ? 'Too short' : passForm.newPassword.length < 10 ? 'Moderate' : 'Strong'}
                  </span>
                </div>
              )}
              <button type="submit" className="btn btn-primary" disabled={savingPass}>
                {savingPass ? 'Changing…' : 'Change Password'}
              </button>
            </form>
          )}

          {/* {activeTab === 'danger' && (
            <div className="profile-form">
              <div className="danger-zone-card">
                <div className="dz-icon">
                  <svg {...iconProps} width="32" height="32" stroke="var(--red)"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                </div>
                <div className="dz-title">Delete Account</div>
                <div className="dz-desc">
                  This will permanently delete your account including all skills, goals,
                  achievements and personal data. <strong>This cannot be undone.</strong>
                </div>
                <div className="dz-checklist">
                  <div className="dz-check-item"><svg {...iconProps} width="14" height="14" style={{ marginRight: '6px' }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> All skills and skill data</div>
                  <div className="dz-check-item"><svg {...iconProps} width="14" height="14" style={{ marginRight: '6px' }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> All goals and progress</div>
                  <div className="dz-check-item"><svg {...iconProps} width="14" height="14" style={{ marginRight: '6px' }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> All achievements and XP</div>
                  <div className="dz-check-item"><svg {...iconProps} width="14" height="14" style={{ marginRight: '6px' }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> Profile and account info</div>
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">
                    Type <strong style={{ color: 'var(--red)' }}>DELETE</strong> to confirm
                  </label>
                  <input value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    placeholder="Type DELETE here"
                    style={{ borderColor: deleteConfirm === 'DELETE' ? 'var(--red)' : '' }} />
                </div>
                <button className="btn btn-danger dz-delete-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  disabled={deletingAcct || deleteConfirm !== 'DELETE'}
                  onClick={handleDeleteAccount}>
                  {deletingAcct ? 'Deleting account…' : <><svg {...iconProps} width="16" height="16"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg> Permanently Delete My Account</>}
                </button>
              </div>
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
};

export default Profile;