import { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { skillAPI, goalAPI, careerAPI, learningAPI } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { callGemini, safeParseJSON } from '../utils/gemini';
import API from '../services/api';
import toast from 'react-hot-toast';
import './Learning.css';
import LearningSkeleton from '../components/learning/LearningSkeleton';

const iconProps = { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };

const LEVEL_NAMES = ['', 'Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert'];

const PLATFORM_RESOURCES = {
  Frontend: [
    { title: 'The Odin Project', url: 'https://www.theodinproject.com', type: 'free', platform: 'Web', desc: 'Best free full-stack curriculum with real projects' },
    { title: 'React Official Docs', url: 'https://react.dev/learn', type: 'free', platform: 'React.dev', desc: 'Official interactive React tutorial' },
    { title: 'JavaScript30', url: 'https://javascript30.com', type: 'free', platform: 'Web', desc: '30 vanilla JS projects in 30 days — no frameworks' },
    { title: 'freeCodeCamp Web Design', url: 'https://www.freecodecamp.org/learn/2022/responsive-web-design', type: 'free', platform: 'freeCodeCamp', desc: 'HTML + CSS certification — completely free' },
  ],
  Backend: [
    { title: 'Node.js Official Docs', url: 'https://nodejs.org/en/learn', type: 'free', platform: 'Node.js', desc: 'Official Node.js learning guide' },
    { title: 'Backend Roadmap', url: 'https://roadmap.sh/backend', type: 'free', platform: 'Roadmap.sh', desc: 'Complete backend developer roadmap with resources' },
  ],
  Database: [
    { title: 'MongoDB University', url: 'https://learn.mongodb.com', type: 'free', platform: 'MongoDB', desc: 'Official MongoDB courses — basics to advanced' },
    { title: 'SQL Tutorial — Mode', url: 'https://mode.com/sql-tutorial', type: 'free', platform: 'Mode', desc: 'Interactive SQL tutorial with a real database' },
  ],
  DevOps: [
    { title: 'Docker Official Docs', url: 'https://docs.docker.com/get-started', type: 'free', platform: 'Docker', desc: 'Official Docker get started guide' },
    { title: 'DevOps Roadmap', url: 'https://roadmap.sh/devops', type: 'free', platform: 'Roadmap.sh', desc: 'Complete DevOps roadmap with resources' },
  ],
  'Data Science': [
    { title: 'Kaggle Learn', url: 'https://www.kaggle.com/learn', type: 'free', platform: 'Kaggle', desc: 'Free micro-courses — Python, ML, SQL, Deep Learning' },
    { title: 'fast.ai', url: 'https://course.fast.ai', type: 'free', platform: 'fast.ai', desc: 'Practical Deep Learning — completely free' },
  ],
  DSA: [
    { title: "Striver's A2Z DSA Sheet", url: 'https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2', type: 'free', platform: 'TakeUForward', desc: '#1 DSA sheet for Indian placements — 450+ problems' },
    { title: 'NeetCode 150', url: 'https://neetcode.io/practice', type: 'free', platform: 'NeetCode', desc: 'Curated LeetCode patterns with video explanations' },
  ],
  Mobile: [
    { title: 'React Native Docs', url: 'https://reactnative.dev/docs/getting-started', type: 'free', platform: 'React Native', desc: 'Official React Native guide' },
    { title: 'Flutter Codelabs', url: 'https://docs.flutter.dev/get-started/codelab', type: 'free', platform: 'Flutter', desc: 'Google official Flutter codelab' },
  ],
  Design: [
    { title: 'Figma Learn', url: 'https://www.figma.com/resources/learn-design', type: 'free', platform: 'Figma', desc: 'Official Figma tutorials and design courses' },
    { title: 'Laws of UX', url: 'https://lawsofux.com', type: 'free', platform: 'Web', desc: 'Key UX principles — free interactive reference' },
  ],
};

const buildQuery = (name, cat, level) => {
  const ctx = level <= 2 ? 'beginner' : level <= 3 ? 'intermediate' : 'advanced';
  return { 'Data Science': name + ' ' + ctx + ' data science python', DevOps: name + ' ' + ctx + ' devops', DSA: name + ' data structures ' + ctx }[cat]
    || (name + ' ' + ctx + ' tutorial 2024');
};

/* ─── Inline Video Player Modal ─────────────────────────────────────────────── */
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const VideoPlayerModal = ({ video, onClose }) => {
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState('hd720');
  const iframeRef = useRef(null);

  const embedUrl =
    'https://www.youtube.com/embed/' + video.videoId +
    '?autoplay=1&rel=0&modestbranding=1&enablejsapi=1' +
    '&vq=' + quality +
    '&fs=1&cc_load_policy=0&iv_load_policy=3';

  const setPlaybackRate = (rate) => {
    setSpeed(rate);
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [rate] }),
        '*'
      );
    } catch { }
  };

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="yt-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="yt-modal">
        <div className="yt-modal-topbar">
          <div className="yt-modal-title">{video.title}</div>
          <button className="yt-modal-close" onClick={onClose} title="Close (Esc)">✕</button>
        </div>

        <div className="yt-player-wrap">
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="yt-iframe"
          />
        </div>

        <div className="yt-modal-controls">
          <div className="yt-modal-info">
            <div className="yt-modal-channel" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg {...iconProps} width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg> {video.channel}
            </div>
            {video.description && (
              <div className="yt-modal-desc">{video.description?.slice(0, 120)}{video.description?.length > 120 ? '…' : ''}</div>
            )}
          </div>

          <div className="yt-modal-actions">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
              <span className="yt-speed-label">Speed</span>
              {SPEEDS.map(s => (
                <button
                  key={s}
                  className={'yt-speed-btn' + (speed === s ? ' active' : '')}
                  onClick={() => setPlaybackRate(s)}
                >
                  {s}×
                </button>
              ))}
            </div>

            <div className="yt-quality-wrap">
              <span className="yt-quality-label">Quality</span>
              <select
                className="yt-quality-select"
                value={quality}
                onChange={e => setQuality(e.target.value)}
                title="Note: YouTube controls final quality"
              >
                <option value="highres">4K</option>
                <option value="hd1080">1080p</option>
                <option value="hd720">720p HD</option>
                <option value="large">480p</option>
                <option value="medium">360p</option>
                <option value="small">240p</option>
              </select>
            </div>

            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="yt-open-link"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              YouTube <svg {...iconProps} width="14" height="14"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Video Card ─────────────────────────────────────────────────────────────── */
const VideoCard = ({ video, onPlay }) => (
  <div className="yt-video-card" onClick={() => onPlay(video)}>
    <div className="yt-thumb-wrap">
      {video.thumbnail
        ? <img src={video.thumbnail} alt={video.title} className="yt-thumb-img" />
        : <div className="yt-thumb-placeholder"><svg {...iconProps} width="24" height="24"><polygon points="5 3 19 12 5 21 5 3" /></svg></div>
      }
      <div className="yt-play-btn">
        <div className="yt-play-icon" />
      </div>
    </div>
    <div className="yt-video-info">
      <div className="yt-video-title">{video.title}</div>
      <div className="yt-video-channel">{video.channel}</div>
      <div className="yt-video-date">
        {new Date(video.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </div>
    </div>
  </div>
);

/* ─── Main Component ─────────────────────────────────────────────────────────── */
const Learning = () => {
  const [skills, setSkills] = useState([]);
  const [goals, setGoals] = useState([]);
  const [careers, setCareers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personalized');

  const [playingVideo, setPlayingVideo] = useState(null);

  const [ytResults, setYtResults] = useState({});
  const [ytLoading, setYtLoading] = useState({});
  const [ytError, setYtError] = useState({});
  const [resourceQuery, setResourceQuery] = useState('');
  const [resourceResults, setResourceResults] = useState(null);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceError, setResourceError] = useState('');

  // ── LOCAL STORAGE PERSISTENCE FOR AI PATH ──
  const [aiPath, setAiPath] = useState(() => {
    try {
      const saved = localStorage.getItem('sp_ai_learning_path');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [targetCareer, setTargetCareer] = useState(() => {
    return localStorage.getItem('sp_target_career') || '';
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const [searchText, setSearchText] = useState('');
  const [searchCat, setSearchCat] = useState('All');
  const [ytBrowse, setYtBrowse] = useState([]);
  const [browseLoading, setBrowseLoading] = useState(false);

  const resultRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [sk, gl, cr] = await Promise.all([
          skillAPI.getAll(),
          goalAPI.getAll(),
          careerAPI.getMatches(),
        ]);
        setSkills(sk.data.skills || []);
        setGoals(gl.data.goals || []);
        setCareers(cr.data.matches || []);
      } catch { }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // Removed auto-scroll on mount so the user isn't suddenly thrown down the page
  // We will only call scroll if we are actively generating
  const scrollToResults = () => {
    if (resultRef.current) {
      setTimeout(() => {
        resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const fetchYouTube = useCallback(async (skill) => {
    const key = skill.name;
    if (ytResults[key] || ytLoading[key]) return;
    setYtLoading(p => ({ ...p, [key]: true }));
    try {
      const q = buildQuery(skill.name, skill.category, skill.level);
      const { data } = await API.get('/learning/youtube?q=' + encodeURIComponent(q) + '&maxResults=4');
      setYtResults(p => ({ ...p, [key]: data.items || [] }));
    } catch (err) {
      setYtError(p => ({ ...p, [key]: err.response?.data?.message || 'Failed to load videos' }));
    } finally {
      setYtLoading(p => ({ ...p, [key]: false }));
    }
  }, [ytResults, ytLoading]);

  const handleResourceSearch = async (e) => {
    e?.preventDefault();
    const topic = resourceQuery.trim();
    if (!topic || resourceLoading) return;
    setResourceLoading(true);
    setResourceError('');
    try {
      const { data } = await learningAPI.getResources(topic);
      setResourceResults({ topic: data.category, resources: data.resources });
    } catch (err) {
      setResourceError(err.response?.data?.message || 'Could not fetch resources for that topic');
    } finally {
      setResourceLoading(false);
    }
  };

  const handleGeneratePath = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const weakSkills = skills.filter(s => s.level < 3).map(s => s.name + ' (Lv.' + s.level + ')');
      const doneGoals = goals.filter(g => g.status === 'done').map(g => g.title);
      const activeGoals = goals.filter(g => g.status !== 'done').map(g => g.title);
      const topCareer = careers?.[0];

      const prompt =
        'You are a career advisor for Indian engineering students.\n\n' +
        'Student profile:\n' +
        '- Skills below Intermediate: ' + (weakSkills.join(', ') || 'none') + '\n' +
        '- Active goals: ' + (activeGoals.join(', ') || 'none') + '\n' +
        '- Completed goals: ' + (doneGoals.join(', ') || 'none') + '\n' +
        '- Best career match: ' + (topCareer?.title || 'not yet analysed') + ' (' + (topCareer?.matchPercent || 0) + '% match)\n' +
        '- Target role: ' + (targetCareer || topCareer?.title || 'software developer') + '\n\n' +
        'Return ONLY this JSON (no markdown, no backticks, no explanation):\n' +
        '{"summary":"2-sentence personalised overview","weeklyPlan":[{"week":1,"focus":"Topic","skills":["skill1"],"dailyHours":2,"milestone":"What they achieve"},{"week":2,"focus":"Topic","skills":["skill1"],"dailyHours":2,"milestone":"What they achieve"},{"week":3,"focus":"Topic","skills":["skill1"],"dailyHours":2,"milestone":"What they achieve"},{"week":4,"focus":"Topic","skills":["skill1"],"dailyHours":2,"milestone":"What they achieve"}],"prioritySkills":["skill1","skill2","skill3"],"estimatedJobReadyWeeks":12,"motivationalNote":"Short encouraging message"}';

      const raw = await callGemini(prompt, { temperature: 0.7, maxOutputTokens: 2500 });
      const parsed = safeParseJSON(raw);
      if (!parsed || !parsed.weeklyPlan) throw new Error('AI returned incomplete data. Please try again.');

      // Save state AND local storage so it persists
      setAiPath(parsed);
      localStorage.setItem('sp_ai_learning_path', JSON.stringify(parsed));

      toast.success('Learning path generated!');
      scrollToResults();
    } catch (err) {
      console.error(err);
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleClearPath = () => {
    setAiPath(null);
    localStorage.removeItem('sp_ai_learning_path');
  };

  const handleBrowseSearch = async () => {
    if (!searchText.trim()) return;
    setBrowseLoading(true);
    try {
      const q = searchCat !== 'All' ? searchCat + ' ' + searchText : searchText;
      const { data } = await API.get('/learning/youtube?q=' + encodeURIComponent(q) + '&maxResults=12');
      setYtBrowse(data.items || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Search failed — check YOUTUBE_API_KEY in backend/.env');
    } finally { setBrowseLoading(false); }
  };

  const weakSkills = skills.filter(s => s.level < 3);
  const strongSkills = skills.filter(s => s.level >= 4);
  const topCareer = careers[0];

  if (loading) return <LearningSkeleton />;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Learning Hub</h1>
          <p className="page-subtitle">Live YouTube tutorials · AI-personalized path · Curated resources</p>
        </div>
      </div>

      <div className="learning-tabs">
        {[
          { key: 'personalized', label: <><svg {...iconProps}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg> My Learning Path</> },
          { key: 'skill-gaps', label: <><svg {...iconProps}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg> Skill Gap Courses</> },
          { key: 'browse', label: <><svg {...iconProps}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg> Search Courses</> },
          { key: 'resources', label: <><svg {...iconProps}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg> Resources Library</> },
        ].map(t => (
          <button key={t.key}
            className={'learning-tab' + (activeTab === t.key ? ' active' : '')}
            onClick={() => setActiveTab(t.key)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════ TAB 1 — My Learning Path ══════ */}
      {activeTab === 'personalized' && (
        <div>
          <div className="lp-profile-row">
            {[
              { icon: <svg {...iconProps} width="24" height="24"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>, color: 'var(--orange)', value: skills.length, label: 'Skills' },
              { icon: <svg {...iconProps} width="24" height="24"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>, color: '#FF5A5A', value: weakSkills.length, label: 'Need Improvement' },
              { icon: <svg {...iconProps} width="24" height="24"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>, color: '#10b981', value: strongSkills.length, label: 'Strong Skills' },
              { icon: <svg {...iconProps} width="24" height="24"><circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>, color: '#3b82f6', value: topCareer ? topCareer.matchPercent + '%' : '—', label: topCareer ? topCareer.title : 'Top Match' },
            ].map(s => (
              <div key={s.label} className="lp-profile-card">
                <div className="lp-profile-icon" style={{ color: s.color }}>{s.icon}</div>
                <div className="lp-profile-val">{s.value}</div>
                <div className="lp-profile-lbl">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="lp-ai-section">
            <div className="lp-ai-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg {...iconProps} color="var(--orange)"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
              AI-Generated Learning Path
            </div>
            <div className="lp-ai-sub">
              Gemini AI analyses your skills, goals, and career matches to create a personalised week-by-week study plan
            </div>
            <div className="lp-ai-input-row">
              <input
                value={targetCareer}
                onChange={e => {
                  setTargetCareer(e.target.value);
                  localStorage.setItem('sp_target_career', e.target.value); // Save to persistence
                }}
                onKeyDown={e => e.key === 'Enter' && !aiLoading && handleGeneratePath()}
                placeholder="Target role (optional) — e.g. Full Stack Developer, Data Scientist…"
                className="lp-target-input"
                disabled={aiLoading}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className={'lp-generate-btn' + (aiLoading ? ' loading' : '')}
                  onClick={handleGeneratePath}
                  disabled={aiLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {aiLoading ? <><span className="ai-spin-dot" />Generating…</> : <><svg {...iconProps}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg> Generate My Path</>}
                </button>
                {aiPath && (
                  <button
                    onClick={handleClearPath}
                    style={{ padding: '0 1rem', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
                  >
                    ✕ Clear
                  </button>
                )}
              </div>
            </div>
            {aiError && (
              <div className="lp-ai-error" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg {...iconProps} width="16" height="16"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                <strong>Error:</strong> {aiError}
              </div>
            )}
            {aiLoading && (
              <div className="lp-ai-loading-msg">
                <div className="spinner" style={{ width: '24px', height: '24px' }} />
                <span>Gemini AI is building your personalised learning path…</span>
              </div>
            )}
          </div>

          {/* ─── AI PATH RESULT ─── */}
          {aiPath && (
            <div className="lp-result-outer" ref={resultRef}>
              <div className="lp-result-heading">
                <span className="lp-result-heading-icon">
                  <svg {...iconProps} width="24" height="24" color="var(--orange)"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                </span>
                Your Personalised Learning Path
              </div>

              <div className="lp-result-summary">{aiPath.summary}</div>

              {aiPath.motivationalNote && (
                <div className="lp-motivational" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg {...iconProps} width="20" height="20" style={{ color: 'var(--orange)' }}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
                  {aiPath.motivationalNote}
                </div>
              )}

              <div className="lp-result-numbers">
                <div className="lp-result-num-item">
                  <div className="lp-result-num-val">{aiPath.estimatedJobReadyWeeks || '—'}</div>
                  <div className="lp-result-num-lbl">Weeks to Job-Ready</div>
                </div>
                <div className="lp-result-num-divider" />
                <div className="lp-result-num-item">
                  <div className="lp-result-num-val">{aiPath.weeklyPlan?.length || 4}</div>
                  <div className="lp-result-num-lbl">Week Plan</div>
                </div>
                <div className="lp-result-num-divider" />
                <div className="lp-result-num-item">
                  <div className="lp-result-num-val">{aiPath.prioritySkills?.length || 0}</div>
                  <div className="lp-result-num-lbl">Priority Skills</div>
                </div>
                <div className="lp-result-num-divider" />
                <div className="lp-result-num-item">
                  <div className="lp-result-num-val">{aiPath.weeklyPlan?.[0]?.dailyHours || '—'}h</div>
                  <div className="lp-result-num-lbl">Daily Hours</div>
                </div>
              </div>

              {aiPath.prioritySkills?.length > 0 && (
                <div className="lp-section-block">
                  <div className="lp-section-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg {...iconProps} width="18" height="18" style={{ color: 'var(--red)' }}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg> Learn These First
                  </div>
                  <div className="lp-priority-list">
                    {aiPath.prioritySkills.map((s, i) => (
                      <div key={i} className="lp-priority-item">
                        <span className="lp-priority-num">{i + 1}</span>
                        <span className="lp-priority-name">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiPath.weeklyPlan?.length > 0 && (
                <div className="lp-section-block">
                  <div className="lp-section-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg {...iconProps} width="18" height="18"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> Week-by-Week Study Plan
                  </div>
                  <div className="lp-weeks-grid">
                    {aiPath.weeklyPlan.map((week, i) => (
                      <div key={i} className="lp-week-card">
                        <div className="lp-week-top">
                          <div className="lp-week-badge">Week {week.week}</div>
                          <div className="lp-week-hours" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <svg {...iconProps} width="14" height="14"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> {week.dailyHours}h / day
                          </div>
                        </div>
                        <div className="lp-week-focus">{week.focus}</div>
                        {week.skills?.length > 0 && (
                          <div className="lp-week-skills">
                            {week.skills.map((s, si) => (
                              <span key={si} className="lp-week-skill">{s}</span>
                            ))}
                          </div>
                        )}
                        <div className="lp-week-milestone" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="lp-milestone-tick"><svg {...iconProps} width="12" height="12"><polyline points="20 6 9 17 4 12" /></svg></span>
                          {week.milestone}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════ TAB 2 — Skill Gap Courses ══════ */}
      {activeTab === 'skill-gaps' && (
        <div>
          {weakSkills.length === 0 ? (
            <div className="learning-banner">
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'var(--primary-bg)', color: 'var(--orange)', borderRadius: '8px' }}>
                <svg {...iconProps} width="18" height="18"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              </span>
              <div>
                <div className="learning-banner-title">All skills at Intermediate or above!</div>
                <div className="learning-banner-sub">Use Search Courses to explore advanced topics.</div>
              </div>
            </div>
          ) : (
            <div className="learning-banner">
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'var(--primary-bg)', color: 'var(--orange)', borderRadius: '8px' }}>
                <svg {...iconProps} width="18" height="18"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
              </span>
              <div>
                <div className="learning-banner-title">
                  {weakSkills.length} skill{weakSkills.length > 1 ? 's' : ''} to improve — click Load Courses to watch tutorials right here
                </div>
                <div className="learning-banner-sub">
                  videos play inline on SkillPulse with speed controls, quality selector and fullscreen
                </div>
              </div>
            </div>
          )}

          {weakSkills.map(skill => (
            <div key={skill._id} className="sg-card">
              <div className="sg-card-header">
                <div>
                  <div className="sg-skill-name">{skill.name}</div>
                  <div className="sg-meta">
                    <span className="sg-level-badge">
                      {LEVEL_NAMES[skill.level] || 'Beginner'} &rarr; {LEVEL_NAMES[(skill.level || 0) + 1] || 'Expert'}
                    </span>
                    <span className="sg-cat-badge">{skill.category}</span>
                  </div>
                </div>
                {!ytResults[skill.name] && !ytLoading[skill.name] && (
                  <button className="sg-load-btn" onClick={() => fetchYouTube(skill)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg {...iconProps} width="16" height="16"><polygon points="5 3 19 12 5 21 5 3" /></svg> Load YouTube Courses
                  </button>
                )}
              </div>
              {ytLoading[skill.name] && (
                <div className="sg-yt-loading"><div className="spinner" /><span>Fetching from YouTube Data API…</span></div>
              )}
              {ytError[skill.name] && (
                <div className="sg-yt-error" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg {...iconProps} width="16" height="16"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> {ytError[skill.name]}
                </div>
              )}
              {ytResults[skill.name] && (
                <div className="sg-yt-results">
                  <div className="sg-yt-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg {...iconProps} width="16" height="16" style={{ color: 'var(--red)' }}><path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" /></svg> Live from YouTube · {ytResults[skill.name].length} tutorials · Click to watch here with speed controls
                  </div>
                  <div className="sg-videos-grid">
                    {ytResults[skill.name].map(video => (
                      <VideoCard key={video.videoId} video={video} onPlay={setPlayingVideo} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ══════ TAB 3 — Search Courses ══════ */}
      {activeTab === 'browse' && (
        <div>
          <div className="browse-hero">
            <div className="browse-hero-title">Search YouTube Courses in Real Time</div>
            <div className="browse-hero-sub">Videos play inline with speed control and fullscreen</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.75rem' }}>
              {['All', 'Frontend', 'Backend', 'DSA', 'Data Science', 'DevOps', 'Mobile', 'Design'].map(cat => (
                <button key={cat}
                  className={'filter-tab' + (searchCat === cat ? ' active' : '')}
                  onClick={() => setSearchCat(cat)}>
                  {cat}
                </button>
              ))}
            </div>
            <div className="browse-input-row">
              <input
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBrowseSearch()}
                placeholder="Search e.g. React hooks, Docker Kubernetes, Python ML…"
                className="browse-input"
              />
              <button
                className={'browse-search-btn' + (browseLoading ? ' loading' : '')}
                onClick={handleBrowseSearch}
                disabled={browseLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {browseLoading ? <><span className="ai-spin-dot" />Searching…</> : <><svg {...iconProps}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg> Search YouTube</>}
              </button>
            </div>
          </div>

          {ytBrowse.length > 0 && (
            <>
              <div className="browse-results-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg {...iconProps} width="16" height="16" style={{ color: 'var(--red)' }}><path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" /></svg> {ytBrowse.length} live results · Click any video to watch here on SkillPulse
              </div>
              <div className="browse-videos-grid">
                {ytBrowse.map(video => (
                  <VideoCard key={video.videoId} video={video} onPlay={setPlayingVideo} />
                ))}
              </div>
            </>
          )}
          {ytBrowse.length === 0 && !browseLoading && (
            <div className="browse-empty">
              <div style={{ marginBottom: '0.75rem', color: 'var(--text-muted)' }}><svg {...iconProps} width="48" height="48" strokeWidth="1"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg></div>
              <p>Search any topic above to fetch live YouTube tutorials</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                Try: "React hooks tutorial", "Docker beginner", "Python data science", "DSA arrays"
              </p>
            </div>
          )}
        </div>
      )}

      {/* ══════ TAB 4 — Resources Library ══════ */}
      {activeTab === 'resources' && (
        <div>
          <div className="resource-search-bar">
            <div className="resource-search-icon">
              <svg {...iconProps} width="20" height="20"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </div>
            <div className="resource-search-text">
              <div className="resource-search-title">Search for anything you want to learn</div>
              <div className="resource-search-sub">e.g. "GraphQL", "System Design", "Redux Toolkit"</div>
            </div>
            <form className="resource-search-form" onSubmit={handleResourceSearch}>
              <input
                className="resource-search-input"
                value={resourceQuery}
                onChange={e => setResourceQuery(e.target.value)}
                placeholder="e.g. GraphQL, System Design…"
                disabled={resourceLoading}
              />
              <button className="resource-search-btn" type="submit" disabled={resourceLoading}>
                {resourceLoading ? 'Searching…' : 'Search'}
              </button>
            </form>
          </div>

          {resourceError && (
            <div className="lp-ai-error" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1rem' }}>
              <svg {...iconProps} width="16" height="16"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              {resourceError}
            </div>
          )}

          {resourceLoading && (
            <div className="resource-category-section">
              <div className="resource-cards-row">
                {[1, 2, 3, 4].map(i => <div key={i} className="resource-card-skeleton" />)}
              </div>
            </div>
          )}

          {resourceResults && !resourceLoading && (
            <div className="resource-category-section">
              <div className="resource-cat-title">Results for "{resourceResults.topic}"</div>
              <div className="resource-cards-row">
                {resourceResults.resources.map((r, i) => (
                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="resource-link-card">
                    <div className="rlc-top">
                      <span className="rlc-free-badge" style={{
                        background: r.type === 'free' ? 'var(--success-strong-bg)' : 'var(--primary-bg)',
                        color: r.type === 'free' ? 'var(--success-text)' : 'var(--orange)',
                      }}>
                        {r.type === 'free' ? 'Free' : 'Paid'}
                      </span>
                      <span className="rlc-platform">{r.platform}</span>
                    </div>
                    <div className="rlc-title">{r.title}</div>
                    <div className="rlc-desc">{r.desc}</div>
                    <div className="rlc-visit" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Visit <svg {...iconProps} width="14" height="14"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {Object.entries(PLATFORM_RESOURCES).map(([cat, resources]) => (
            <div key={cat} className="resource-category-section">
              <div className="resource-cat-title">{cat}</div>
              <div className="resource-cards-row">
                {resources.map((r, i) => (
                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="resource-link-card">
                    <div className="rlc-top">
                      <span className="rlc-free-badge" style={{
                        background: r.type === 'free' ? 'var(--success-strong-bg)' : 'var(--primary-bg)',
                        color: r.type === 'free' ? 'var(--success-text)' : 'var(--orange)',
                      }}>
                        {r.type === 'free' ? 'Free' : 'Paid'}
                      </span>
                      <span className="rlc-platform">{r.platform}</span>
                    </div>
                    <div className="rlc-title">{r.title}</div>
                    <div className="rlc-desc">{r.desc}</div>
                    <div className="rlc-visit" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Visit <svg {...iconProps} width="14" height="14"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════ Inline YouTube Player ══════ */}
      {playingVideo && (
        <VideoPlayerModal
          video={playingVideo}
          onClose={() => setPlayingVideo(null)}
        />
      )}
    </div>
  );
};

export default Learning;