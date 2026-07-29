import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { userAPI, skillAPI, goalAPI, achievementAPI, careerAPI } from '../services/api';
import { Radar, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, RadialLinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend, ArcElement, CategoryScale, LinearScale, BarElement,
} from 'chart.js';
import { useAchievementUnlock } from '../context/AchievementUnlockContext';
import toast from 'react-hot-toast';
import './Dashboard.css';
import DashboardSkeleton from '../components/dashboard/DashboardSkeleton';

ChartJS.register(
  RadialLinearScale, PointElement, LineElement, Filler,
  Tooltip, Legend, ArcElement, CategoryScale, LinearScale, BarElement
);

const iconProps = { viewBox: "0 0 24 24", width: "20", height: "20", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };

const LEVEL_TITLES = [
  '', 'Newcomer', 'Explorer', 'Learner', 'Developer',
  'Rising Star', 'Achiever', 'Expert', 'Master', 'Legend', 'SkillPulse Pro',
];

const QUICK_ACTIONS = [
  { icon: <svg {...iconProps}><polygon points="12 2 2 7 2 17 12 22 22 17 22 7 12 2" /></svg>, label: 'Add Skill', path: '/skills', color: '#FF8B5A', bg: '#fff5f0' },
  { icon: <svg {...iconProps}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>, label: 'New Goal', path: '/goals', color: '#10b981', bg: '#f0fdf4' },
  { icon: <svg {...iconProps}><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>, label: 'Career Paths', path: '/careers', color: '#3b82f6', bg: '#eff6ff' },
  { icon: <svg {...iconProps}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>, label: 'Resume', path: '/resume', color: '#8b5cf6', bg: '#f5f3ff' },
  { icon: <svg {...iconProps}><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>, label: 'Achievements', path: '/achievements', color: '#f59e0b', bg: '#fffbeb' },
  { icon: <svg {...iconProps}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>, label: 'Learning Hub', path: '/learning', color: '#FF5A5A', bg: '#fff0f0' },
];

const LEVEL_COLORS = ['#94a3b8', '#FF5A5A', '#FF8B5A', '#FFA95A', '#FFD45A'];
const levelToColor = (avg) => LEVEL_COLORS[Math.min(4, Math.max(0, Math.round(avg || 1) - 1))];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user: ctxUser, updateUser, refreshUser } = useContext(AuthContext);
  const { announce } = useAchievementUnlock();
  const [stats, setStats] = useState(null);
  const [skills, setSkills] = useState([]);
  const [goals, setGoals] = useState({ kanban: { todo: [], 'in-progress': [], done: [] } });
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [careerMatches, setCareerMatches] = useState([]);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 640);
  const [showRadarInfo, setShowRadarInfo] = useState(false);
  const [chartKey, setChartKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, skillsRes, goalsRes, achRes, careerRes] = await Promise.all([
          userAPI.getDashboard(),
          skillAPI.getAll(),
          goalAPI.getAll(),
          achievementAPI.getAll(),
          careerAPI.getMatches(),
        ]);
        setStats(statsRes.data);
        setSkills(skillsRes.data.skills || []);
        setGoals(goalsRes.data);
        setAchievements(achRes.data.achievements || []);
        setCareerMatches(careerRes.data.matches || []);
        if (statsRes.data?.user) updateUser(statsRes.data.user);
        if (careerRes.data.newAchievements?.length) {
          announce(careerRes.data.newAchievements);
          refreshUser();
        }
      } catch {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Detect browser zoom changes (no native browser event for this — matchMedia
  // on devicePixelRatio is the standard trick) and force chart remount, since
  // Chart.js caches canvas resolution at the zoom level it first rendered at.
  useEffect(() => {
    let media;
    const watchZoom = () => {
      if (media) media.removeEventListener('change', onZoomChange);
      media = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      media.addEventListener('change', onZoomChange);
    };
    const onZoomChange = () => {
      setChartKey(k => k + 1);
      watchZoom(); // re-arm for the next zoom change
    };
    watchZoom();
    return () => { if (media) media.removeEventListener('change', onZoomChange); };
  }, []);

  if (loading) return <DashboardSkeleton />;

  const user = stats?.user || ctxUser || {};
  const level = user.level || 1;
  const xp = user.xp || 0;
  const xpToNext = user.xpToNextLevel || 200;
  const xpPct = xpToNext > 0 ? Math.min(Math.round((xp / (xp + xpToNext)) * 100), 100) : 100;
  const levelTitle = LEVEL_TITLES[Math.min(level, 10)] || 'Pro';
  const earnedAchs = achievements.filter(a => a.earned);
  const recentAchs = earnedAchs.slice(0, 4);
  const topMatch = careerMatches[0];

  const todoCount = goals.kanban?.todo?.length || 0;
  const ipCount = goals.kanban?.['in-progress']?.length || 0;
  const doneCount = goals.kanban?.done?.length || 0;

  const catMap = {};
  skills.forEach(s => {
    if (!catMap[s.category]) catMap[s.category] = { sum: 0, cnt: 0 };
    catMap[s.category].sum += s.level;
    catMap[s.category].cnt++;
  });
  const radarLabels = Object.keys(catMap).sort();
  const radarData = radarLabels.map(c => parseFloat((catMap[c].sum / catMap[c].cnt).toFixed(1)));
  const radarCounts = radarLabels.map(c => catMap[c].cnt);
  const topSkills = [...skills].sort((a, b) => b.level - a.level).slice(0, 8);

  const RARITY_COLORS = { common: '#64748b', rare: '#3b82f6', epic: '#8b5cf6', legendary: '#f59e0b' };

  return (
    <div className="page-content">
      <div className="dash-welcome">
        <div className="dash-welcome-left">
          <div className="dash-welcome-greeting">
            Welcome back, <span className="dash-name">{user.name?.split(' ')[0] || 'User'}</span>
          </div>
          <div className="dash-welcome-sub">{levelTitle} · Level {level} · {xp} XP</div>
          <div className="dash-xp-bar-wrap">
            <div className="dash-xp-bar">
              <div className="dash-xp-fill" style={{ width: xpPct + '%' }} />
            </div>
            <span className="dash-xp-label">{xpToNext} XP to Lv.{level + 1}</span>
          </div>
        </div>
        <div className="dash-welcome-stats">
          {[
            { value: skills.length, label: 'Skills', color: '#FF8B5A' },
            { value: doneCount, label: 'Goals Done', color: '#10b981' },
            { value: earnedAchs.length, label: 'Badges', color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="dash-hero-stat">
              <div className="dash-hero-val" style={{ color: s.color }}>{s.value}</div>
              <div className="dash-hero-lbl">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {topMatch && (
        <div className="dash-career-highlight" onClick={() => navigate('/careers')}>
          <div className="dash-career-highlight-icon">
            <svg {...iconProps} width="22" height="22"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>
          </div>
          <div className="dash-career-highlight-body">
            <div className="dash-career-highlight-title">
              You're <strong>{topMatch.matchPercent}%</strong> matched to <strong>{topMatch.title}</strong>
            </div>
            <div className="dash-career-highlight-sub">See live salary, demand, and your full skill gap &rarr;</div>
          </div>
          <svg width="52" height="52" viewBox="0 0 52 52" style={{ flexShrink: 0 }}>
            <circle cx="26" cy="26" r="21" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="5" />
            <circle cx="26" cy="26" r="21" fill="none" stroke="#fff" strokeWidth="5"
              strokeDasharray={2 * Math.PI * 21}
              strokeDashoffset={2 * Math.PI * 21 * (1 - topMatch.matchPercent / 100)}
              strokeLinecap="round" transform="rotate(-90 26 26)" />
            <text x="26" y="31" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff">{topMatch.matchPercent}%</text>
          </svg>
        </div>
      )}

      <div className="dash-stat-cards">
        {[
          { icon: <svg {...iconProps}><polygon points="12 2 2 7 2 17 12 22 22 17 22 7 12 2" /></svg>, label: 'Total Skills', value: skills.length, bg: '#fff5f0', color: '#FF8B5A' },
          { icon: <svg {...iconProps}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>, label: 'Active Goals', value: todoCount + ipCount, bg: '#f0fdf4', color: '#10b981' },
          { icon: <svg {...iconProps}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>, label: 'Goals Completed', value: doneCount, bg: '#ecfdf5', color: '#059669' },
          { icon: <svg {...iconProps}><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>, label: 'Achievements', value: earnedAchs.length + '/' + achievements.length, bg: '#fffbeb', color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="dash-stat-card">
            <div className="dash-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div>
              <div className="dash-stat-val">{s.value}</div>
              <div className="dash-stat-lbl">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-charts-row">
        <div className="dash-chart-card">
          <div className="dash-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            Skill Profile
            <span className="radar-info-wrap">
              <button type="button" className="radar-info-btn" onClick={() => setShowRadarInfo(v => !v)} aria-label="How this chart works">
                <svg {...iconProps} width="14" height="14"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
              </button>
              {showRadarInfo && (
                <>
                  <div className="radar-info-backdrop" onClick={() => setShowRadarInfo(false)} />
                  <div className="radar-info-popover">
                    <div className="radar-info-title">How this chart works</div>
                    <div className="radar-info-text">Each axis is a skill category. The further a point sits from the centre, the higher your average proficiency there (scale 1–5).</div>
                  </div>
                </>
              )}
            </span>
          </div>
          {radarLabels.length >= 3 ? (
            <div className="dash-radar-container" style={isMobile ? { height: 220 } : undefined}>
              <Radar
                key={'radar-' + chartKey}
                data={{
                  labels: radarLabels,
                  datasets: [{
                    label: 'Avg Level',
                    data: radarData,
                    backgroundColor: 'rgba(255, 139, 90, 0.25)',
                    borderColor: '#FF5A5A',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#FF5A5A',
                    pointBorderWidth: 2.5,
                    pointRadius: 4,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#362d15',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 3,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  layout: {
                    padding: { top: 8, bottom: 8, left: 14, right: 14 }
                  },
                  scales: {
                    r: {
                      min: 0, max: 5,
                      ticks: { display: false, stepSize: 1 },
                      grid: { color: 'rgba(255, 139, 90, 0.4)', lineWidth: 1.9, circular: false },
                      angleLines: { color: 'rgba(255, 139, 90, 0.2)', lineWidth: 1.8 },
                      pointLabels: {
                        display: true,
                        color: (ctx) => levelToColor(radarData[ctx.index]),
                        font: { size: isMobile ? 10 : 12, weight: '700', family: "'Inter', sans-serif" },
                        padding: 18,
                      },
                    },
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(30, 26, 22, 0.95)',
                      titleColor: '#FFD45A',
                      bodyFont: { size: 13, weight: 'bold' },
                      padding: 10, cornerRadius: 8, displayColors: false,
                      callbacks: {
                        label: ctx => ` Level: ${ctx.raw}/5 · ${radarCounts[ctx.dataIndex]} skill${radarCounts[ctx.dataIndex] !== 1 ? 's' : ''}`,
                      },
                    },
                  },
                  elements: { point: { hitRadius: 14 } },
                }}
              />
            </div>
          ) : (
            <div className="dash-empty-chart">
              <p>Add skills in 3+ categories to see your radar</p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/skills')}>Add Skills &rarr;</button>
            </div>
          )}
        </div>

        <div className="dash-chart-card">
          <div className="dash-card-title">Goal Progress</div>
          {todoCount + ipCount + doneCount > 0 ? (
            <>
              <div className="dash-doughnut-container">
                <Doughnut
                  key={'doughnut-' + chartKey}
                  data={{
                    labels: ['To Do', 'In Progress', 'Done'],
                    datasets: [{
                      data: [todoCount, ipCount, doneCount],
                      backgroundColor: ['#f1f5f9', '#FFA95A', '#10b981'],
                      borderColor: ['#e2e8f0', '#FF8B5A', '#059669'],
                      borderWidth: 2, hoverOffset: 8,
                    }],
                  }}
                  options={{
                    responsive: true, maintainAspectRatio: true, cutout: '68%',
                    plugins: { legend: { position: 'bottom', labels: { padding: 12, font: { size: 11 } } } },
                  }}
                />
              </div>
              <div className="dash-goal-summary">
                <span className="dash-goal-pill todo">{todoCount} Todo</span>
                <span className="dash-goal-pill ip">{ipCount} Active</span>
                <span className="dash-goal-pill done">{doneCount} Done</span>
              </div>
            </>
          ) : (
            <div className="dash-empty-chart">
              <p>No goals yet — set your first goal!</p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/goals')}>Add Goal &rarr;</button>
            </div>
          )}
        </div>

        <div className="dash-chart-card">
          <div className="dash-card-title">Top Skills</div>
          {topSkills.length > 0 ? (
            <div className="dash-bar-container" style={{ height: Math.max(170, topSkills.length * 34) }}>
              <Bar
                key={'bar-' + chartKey}
                data={{
                  labels: topSkills.map(s => s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name),
                  datasets: [{
                    label: 'Level',
                    data: topSkills.map(s => s.level),
                    backgroundColor: topSkills.map((_, i) => ['#FF5A5A', '#FF8B5A', '#FFA95A', '#FFD45A', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'][i % 8]),
                    borderRadius: 6, borderSkipped: false,
                  }],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                  scales: {
                    x: { min: 0, max: 5, ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' } },
                    y: { grid: { display: false }, ticks: { font: { size: 11 } } },
                  },
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
          ) : (
            <div className="dash-empty-chart">
              <p>Add skills to see your chart</p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/skills')}>Add Skills &rarr;</button>
            </div>
          )}
        </div>
      </div>

      <div className="dash-bottom-row">
        <div className="dash-section-card">
          <div className="dash-section-header">
            <div className="dash-card-title">Recent Achievements</div>
            <button className="dash-view-all" onClick={() => navigate('/achievements')}>View all &rarr;</button>
          </div>
          {recentAchs.length === 0 ? (
            <div className="dash-empty-mini"><p>No achievements yet — keep going!</p></div>
          ) : (
            <div className="dash-ach-list">
              {recentAchs.map(a => {
                const rc = RARITY_COLORS[a.rarity] || '#64748b';
                return (
                  <div key={a.key || a._id} className="dash-ach-item">
                    <div className="dash-ach-icon" style={{ background: rc + '18', color: rc }}>
                      <svg {...iconProps} width="16" height="16"><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>
                    </div>
                    <div className="dash-ach-body">
                      <div className="dash-ach-title">{a.title}</div>
                      <div className="dash-ach-desc">{a.description}</div>
                    </div>
                    <div className="dash-ach-xp" style={{ color: rc }}>+{a.xpReward} XP</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="dash-section-card">
          <div className="dash-section-header">
            <div className="dash-card-title">Quick Actions</div>
          </div>
          <div className="dash-quick-grid">
            {QUICK_ACTIONS.map(qa => (
              <button key={qa.label} className="dash-quick-btn" onClick={() => navigate(qa.path)}>
                <div className="dash-quick-icon" style={{ background: qa.bg, color: qa.color }}>
                  {qa.icon}
                </div>
                <span className="dash-quick-label">{qa.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {(ipCount > 0 || todoCount > 0) && (
        <div className="dash-section-card" style={{ marginTop: '1.25rem' }}>
          <div className="dash-section-header">
            <div className="dash-card-title">Active Goals</div>
            <button className="dash-view-all" onClick={() => navigate('/goals')}>View all &rarr;</button>
          </div>
          <div className="dash-goals-list">
            {[...(goals.kanban?.['in-progress'] || []), ...(goals.kanban?.todo || [])]
              .slice(0, 4)
              .map(goal => (
                <div key={goal._id} className="dash-goal-item" onClick={() => navigate('/goals')}>
                  <div className="dash-goal-left">
                    <div className="dash-goal-name">{goal.title}</div>
                    <div className="dash-goal-meta">
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: goal.status === 'in-progress' ? '#FFA95A' : '#94a3b8', fontWeight: 700, fontSize: '0.75rem' }}>
                        {goal.status === 'in-progress' ?
                          <><svg {...iconProps} width="12" height="12"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> In Progress</> :
                          <><svg {...iconProps} width="12" height="12"><circle cx="12" cy="12" r="10" /></svg> To Do</>
                        }
                      </span>
                      {goal.linkedSkill && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}> · {goal.linkedSkill}</span>
                      )}
                    </div>
                  </div>
                  <div className="dash-goal-right">
                    <div className="progress-bar" style={{ width: '100px', height: '6px' }}>
                      <div className="progress-fill" style={{ width: (goal.progress || 0) + '%' }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--orange)' }}>
                      {goal.progress || 0}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;