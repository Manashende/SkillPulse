import { useEffect, useState, useContext } from 'react';
import { achievementAPI } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Achievements.css';
import AchievementsSkeleton from '../components/achievements/AchievementsSkeleton';

// Standard SVG config for perfect uniformity
const iconProps = { viewBox: "0 0 24 24", width: "20", height: "20", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };

const RARITY = {
  common:    { label:'Common',    color:'#64748b', bg:'#f1f5f9', glow:'rgba(100,116,139,0.2)', stars:1 },
  rare:      { label:'Rare',      color:'#3b82f6', bg:'#dbeafe', glow:'rgba(59,130,246,0.3)',  stars:2 },
  epic:      { label:'Epic',      color:'#8b5cf6', bg:'#ede9fe', glow:'rgba(139,92,246,0.35)', stars:3 },
  legendary: { label:'Legendary', color:'#f59e0b', bg:'#fef3c7', glow:'rgba(245,158,11,0.4)', stars:4 },
};

const CATEGORY = {
  skills:  { label:'Skills',  color:'#FF8B5A', icon: <svg {...iconProps}><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg> },
  goals:   { label:'Goals',   color:'#10b981', icon: <svg {...iconProps}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
  career:  { label:'Career',  color:'#3b82f6', icon: <svg {...iconProps}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
  profile: { label:'Profile', color:'#8b5cf6', icon: <svg {...iconProps}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  special: { label:'Special', color:'#f59e0b', icon: <svg {...iconProps}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
};

const XP_LEVELS = [
  { xp:0,     level:1,  label:'Newcomer'      },
  { xp:200,   level:2,  label:'Explorer'      },
  { xp:500,   level:3,  label:'Learner'       },
  { xp:1000,  level:4,  label:'Developer'     },
  { xp:1800,  level:5,  label:'Rising Star'   },
  { xp:3000,  level:6,  label:'Achiever'      },
  { xp:4500,  level:7,  label:'Expert'        },
  { xp:6500,  level:8,  label:'Master'        },
  { xp:9000,  level:9,  label:'Legend'        },
  { xp:12000, level:10, label:'SkillPulse Pro'},
];

const Stars = ({ count, color }) => (
  <span className="ach-stars" style={{ display: 'flex', gap: '2px' }}>
    {[0,1,2,3].map(i => (
      <svg key={i} viewBox="0 0 24 24" width="10" height="10" fill={i < count ? color : 'none'} stroke={i < count ? color : '#cbd5e1'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ))}
  </span>
);

const Achievements = () => {
  const { user } = useContext(AuthContext);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [view, setView]                 = useState('grid');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRarity, setFilterRarity] = useState('all');
  const [filterCat,    setFilterCat]    = useState('all');
  const [selected,     setSelected]     = useState(null);

  useEffect(() => {
    achievementAPI.getAll()
      .then(({ data }) => setAchievements(data.achievements || []))
      .catch(() => toast.error('Failed to load achievements'))
      .finally(() => setLoading(false));
  }, []);

  const earned = achievements.filter(a => a.earned);
  const pct    = achievements.length > 0 ? Math.round(earned.length / achievements.length * 100) : 0;

  const totalXP = user?.xp || 0;

  const curLv  = XP_LEVELS.reduce((lv, m) => totalXP >= m.xp ? m : lv, XP_LEVELS[0]);
  const nextLv = XP_LEVELS.find(m => m.xp > totalXP) || XP_LEVELS[XP_LEVELS.length - 1];
  const lvPct  = nextLv.xp > curLv.xp
    ? Math.round((totalXP - curLv.xp) / (nextLv.xp - curLv.xp) * 100)
    : 100;

  const filtered = achievements.filter(a => {
    if (filterStatus === 'earned'  && !a.earned)              return false;
    if (filterStatus === 'locked'  &&  a.earned)              return false;
    if (filterRarity !== 'all'     && a.rarity   !== filterRarity) return false;
    if (filterCat    !== 'all'     && a.category !== filterCat)    return false;
    return true;
  });

  const timeline = [...earned]
    .filter(a => a.earnedAt)
    .sort((a, b) => new Date(a.earnedAt) - new Date(b.earnedAt));

  if (loading) return <AchievementsSkeleton />;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Achievements</h1>
          <p className="page-subtitle">Your milestones, XP journey and badge collection</p>
        </div>
      </div>

      {/* XP Level Banner */}
      <div className="xp-banner">
        <div className="xp-banner-left">
          <div className="xp-badge-circle">
            <div className="xp-badge-num">{curLv.level}</div>
            <div className="xp-badge-lbl">LVL</div>
          </div>
          <div>
            <div className="xp-banner-name">{curLv.label}</div>
            <div className="xp-banner-sub">
              {totalXP} XP earned &nbsp;·&nbsp; {nextLv.xp - totalXP} XP to {nextLv.label}
            </div>
          </div>
        </div>
        <div className="xp-banner-right">
          <div className="xp-track">
            <div className="xp-track-fill" style={{ width: lvPct + '%' }} />
          </div>
          <div className="xp-track-labels">
            <span>Lv.{curLv.level}</span>
            <span>{lvPct}%</span>
            <span>Lv.{nextLv.level}</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="ach-summary">
        <div className="ach-sum-card">
          <div className="ach-sum-icon" style={{ background:'#fffbee', color:'#f59e0b' }}>
              <svg {...iconProps} fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div>
            <div className="ach-sum-val">{earned.length}<span className="ach-sum-of">/{achievements.length}</span></div>
            <div className="ach-sum-lbl">Earned</div>
          </div>
        </div>
        <div className="ach-sum-card">
          <div className="ach-sum-icon" style={{ background:'#fff0f0', color:'#FF5A5A' }}>
              <svg {...iconProps} fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <div>
            <div className="ach-sum-val">{totalXP}</div>
            <div className="ach-sum-lbl">Total XP</div>
          </div>
        </div>
        <div className="ach-sum-card">
          <div className="ach-sum-icon" style={{ background:'#ecfdf5', color:'#10b981' }}>
              <svg {...iconProps} fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
          </div>
          <div>
            <div className="ach-sum-val">{pct}%</div>
            <div className="ach-sum-lbl">Completion</div>
          </div>
        </div>
        {Object.entries(RARITY).map(([key, cfg]) => {
          const e = earned.filter(a => a.rarity === key).length;
          const t = achievements.filter(a => a.rarity === key).length;
          return (
            <div key={key} className="ach-rarity-box"
              style={{ borderColor: e > 0 ? cfg.color : 'var(--border)' }}>
              <Stars count={cfg.stars} color={cfg.color} />
              <div className="ach-rarity-lbl" style={{ color: cfg.color }}>{cfg.label}</div>
              <div className="ach-rarity-cnt">{e}/{t}</div>
            </div>
          );
        })}
      </div>

      {/* View + filters */}
      <div className="ach-toolbar">
        <div className="ach-view-btns">
          {[
            { key:'grid',     icon: <svg {...iconProps} width="16" height="16"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>, label:'Grid'    },
            { key:'showcase', icon: <svg {...iconProps} width="16" height="16"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>, label:'Showcase' },
            { key:'timeline', icon: <svg {...iconProps} width="16" height="16"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, label:'Timeline' },
          ].map(v => (
            <button key={v.key}
              className={'ach-view-btn' + (view === v.key ? ' active' : '')}
              onClick={() => setView(v.key)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>
        {view === 'grid' && (
          <div className="ach-filters">
            <select className="ach-sel" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="earned">Earned</option>
              <option value="locked">Locked</option>
            </select>
            <select className="ach-sel" value={filterRarity} onChange={e => setFilterRarity(e.target.value)}>
              <option value="all">All Rarities</option>
              {Object.entries(RARITY).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="ach-sel" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* GRID VIEW */}
      {view === 'grid' && (
        filtered.length === 0
          ? <div className="card"><div className="empty-state">
              <div className="empty-state-icon"><svg {...iconProps} width="40" height="40"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
              <h3>No achievements match this filter</h3>
            </div></div>
          : <div className="ach-grid">
              {filtered.map(ach => {
                const r = RARITY[ach.rarity]    || RARITY.common;
                const c = CATEGORY[ach.category] || CATEGORY.special;
                return (
                  <div key={ach.key}
                    className={'ach-card' + (ach.earned ? ' earned' : ' locked')}
                    style={{ '--glow': r.glow }}
                    onClick={() => setSelected(ach)}>
                    <div className="ach-topbar" style={{ background: ach.earned ? r.color : 'var(--border)' }} />
                    {ach.earned && ach.rarity === 'legendary' && <div className="ach-shine" />}
                    <div className="ach-icon-wrap">
                      <div className="ach-icon" style={{
                        background: ach.earned ? r.bg : '#f1f5f9',
                        color:      ach.earned ? r.color : '#94a3b8',
                        boxShadow:  ach.earned ? '0 0 18px ' + r.glow : 'none',
                      }}>
                        {c.icon}
                      </div>
                      {!ach.earned && <div className="ach-lock"><svg {...iconProps} width="14" height="14" fill="#64748b"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>}
                    </div>
                    <div className="ach-body">
                      <div className="ach-name" style={{ color: ach.earned ? 'var(--text)' : 'var(--text-muted)' }}>
                        {ach.title}
                      </div>
                      <div className="ach-desc">{ach.description}</div>
                    </div>
                    <div className="ach-foot">
                      <div className="ach-foot-left">
                        <Stars count={r.stars} color={ach.earned ? r.color : '#e2e8f0'} />
                        <span className="ach-pill" style={{ background:r.bg, color:r.color, opacity:ach.earned?1:0.6 }}>
                          {r.label}
                        </span>
                      </div>
                      <span className="ach-xp">+{ach.xpReward} XP</span>
                    </div>
                    {ach.earned && ach.earnedAt && (
                      <div className="ach-earned-on" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg {...iconProps} width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg> {new Date(ach.earnedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                      </div>
                    )}
                    {!ach.earned && <div className="ach-tap-hint">Tap to see how to unlock &rarr;</div>}
                  </div>
                );
              })}
            </div>
      )}

      {/* SHOWCASE VIEW */}
      {view === 'showcase' && (
        earned.length === 0
          ? <div className="card"><div className="empty-state">
              <div className="empty-state-icon"><svg {...iconProps} width="40" height="40"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
              <h3>No achievements earned yet</h3>
              <p>Add skills and complete goals to earn your first badge!</p>
            </div></div>
          : <>
              <div className="showcase-intro">
                You have earned <strong>{earned.length}</strong> achievement{earned.length>1?'s':''} worth{' '}
                <strong>{totalXP} total XP</strong> — here is your badge collection!
              </div>
              <div className="showcase-grid">
                {[...earned]
                  .sort((a,b) => { const o={legendary:0,epic:1,rare:2,common:3}; return (o[a.rarity]||3)-(o[b.rarity]||3); })
                  .map(ach => {
                    const r = RARITY[ach.rarity]    || RARITY.common;
                    const c = CATEGORY[ach.category] || CATEGORY.special;
                    return (
                      <div key={ach.key} className="showcase-card"
                        style={{ '--glow':r.glow, '--color':r.color }}
                        onClick={() => setSelected(ach)}>
                        <div className="showcase-glow" />
                        <div className="showcase-icon"
                          style={{ background:r.bg, color:r.color, boxShadow:'0 0 28px '+r.glow }}>
                          {c.icon}
                        </div>
                        <div className="showcase-name">{ach.title}</div>
                        <div className="showcase-desc">{ach.description}</div>
                        <div className="showcase-meta">
                          <Stars count={r.stars} color={r.color} />
                          <span className="ach-xp">+{ach.xpReward} XP</span>
                        </div>
                        {ach.earnedAt && (
                          <div className="showcase-date">
                            {new Date(ach.earnedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </>
      )}

      {/* TIMELINE VIEW */}
      {view === 'timeline' && (
        timeline.length === 0
          ? <div className="card"><div className="empty-state">
              <div className="empty-state-icon"><svg {...iconProps} width="40" height="40"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
              <h3>No timeline yet</h3>
              <p>Earn achievements to build your journey timeline!</p>
            </div></div>
          : <div className="ach-timeline">
              <div className="timeline-intro">Your achievement journey from the very beginning</div>
              {timeline.map((ach, i) => {
                const r   = RARITY[ach.rarity]    || RARITY.common;
                const c   = CATEGORY[ach.category] || CATEGORY.special;
                const rxp = timeline.slice(0,i+1).reduce((s,a)=>s+(a.xpReward||0),0);
                return (
                  <div key={ach.key} className="tl-item" onClick={() => setSelected(ach)}>
                    <div className="tl-left">
                      <div className="tl-dot" style={{ background:r.bg, borderColor:r.color, color:r.color }}>
                        {c.icon}
                      </div>
                      {i < timeline.length-1 && <div className="tl-line" />}
                    </div>
                    <div className="tl-card">
                      <div className="tl-card-top">
                        <div>
                          <div className="tl-title">{ach.title}</div>
                          <div className="tl-desc">{ach.description}</div>
                        </div>
                        <div className="tl-xp" style={{ color:r.color }}>+{ach.xpReward} XP</div>
                      </div>
                      <div className="tl-meta">
                        <span className="tl-date">
                          {new Date(ach.earnedAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}
                        </span>
                        <span className="tl-running">Total: {rxp} XP</span>
                        <span className="tl-rarity-dot" style={{ background:r.color }} />
                        <span style={{ fontSize:'0.72rem', color:r.color, fontWeight:700 }}>{r.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="tl-future">
                <div className="tl-future-icon"><svg {...iconProps} width="20" height="20"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></div>
                <span>{achievements.length - earned.length} more achievement{achievements.length-earned.length!==1?'s':''} to unlock</span>
              </div>
            </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="ach-modal-bg" onClick={() => setSelected(null)}>
          <div className="ach-modal" onClick={e => e.stopPropagation()}>
            <button className="ach-modal-x" onClick={() => setSelected(null)}><svg {...iconProps}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            {(() => {
              const r = RARITY[selected.rarity]    || RARITY.common;
              const c = CATEGORY[selected.category] || CATEGORY.special;
              return (
                <>
                  <div className="ach-modal-icon"
                    style={{ background:r.bg, color:r.color, boxShadow:'0 0 40px '+r.glow }}>
                    {c.icon}
                  </div>
                  <Stars count={r.stars} color={r.color} />
                  <div className="ach-modal-title">{selected.title}</div>
                  <div className="ach-modal-desc">{selected.description}</div>
                  <div className="ach-modal-grid">
                    <div className="ach-modal-box">
                      <div className="ach-modal-lbl">Rarity</div>
                      <div className="ach-modal-val" style={{ color:r.color }}>{r.label}</div>
                    </div>
                    <div className="ach-modal-box">
                      <div className="ach-modal-lbl">Category</div>
                      <div className="ach-modal-val" style={{ color:c.color, display: 'flex', alignItems: 'center', gap: '6px' }}>{c.icon} {c.label}</div>
                    </div>
                    <div className="ach-modal-box">
                      <div className="ach-modal-lbl">XP Reward</div>
                      <div className="ach-modal-val" style={{ color:'var(--orange)' }}>+{selected.xpReward} XP</div>
                    </div>
                    <div className="ach-modal-box">
                      <div className="ach-modal-lbl">Status</div>
                      <div className="ach-modal-val" style={{ color: selected.earned?'#10b981':'#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {selected.earned ? <><svg {...iconProps} width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg> Earned</> : <><svg {...iconProps} width="16" height="16"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Locked</>}
                      </div>
                    </div>
                  </div>
                  {selected.earned && selected.earnedAt && (
                    <div className="ach-modal-earned" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                      <svg {...iconProps} width="18" height="18"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Earned on {new Date(selected.earnedAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}
                    </div>
                  )}
                  {!selected.earned && (
                    <div className="ach-modal-locked" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                      <svg {...iconProps} width="18" height="18"><path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/><path d="M20.5 10A1.5 1.5 0 0 0 22 8.5v-5A1.5 1.5 0 0 0 20.5 2h-4a1.5 1.5 0 0 0-1.5 1.5v5C15 9.33 15.67 10 16.5 10h4z"/><path d="M8.5 10C7.67 10 7 9.33 7 8.5v-5C7 2.67 7.67 2 8.5 2s1.5.67 1.5 1.5v5C10 9.33 9.33 10 8.5 10z"/><path d="M2.5 10A1.5 1.5 0 0 0 4 8.5v-5A1.5 1.5 0 0 0 2.5 2h-1A1.5 1.5 0 0 0 0 3.5v5C0 9.33.67 10 1.5 10h1z"/><path d="M12 12c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z"/></svg> Keep working on your {CATEGORY[selected.category]?.label||'skills'} to unlock this!
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Achievements;