import { useEffect, useState } from 'react';
import { careerAPI, marketAPI } from '../services/api';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useAchievementUnlock } from '../context/AchievementUnlockContext';
import toast from 'react-hot-toast';
import './Careers.css';
import CareersSkeleton from '../components/careers/CareersSkeleton';

const iconProps = { viewBox: "0 0 24 24", width: "20", height: "20", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };

const CATEGORIES = ['All', 'Engineering', 'Design', 'Data', 'DevOps', 'Mobile', 'Management'];

const DEMAND_COLOR = {
  'very high': { bg: '#fff0f0', color: '#FF5A5A', label: 'Very High Demand' },
  'high': { bg: '#fff8ee', color: '#FFA95A', label: 'High Demand' },
  'medium': { bg: '#fffbee', color: '#FFD45A', label: 'Medium Demand' },
  'low': { bg: 'var(--bg-2)', color: 'var(--text-muted)', label: 'Low Demand' },
};

const CATEGORY_ICONS = {
  Engineering: <svg {...iconProps}><rect x="4" y="4" width="16" height="16" rx="2" ry="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></svg>,
  Design: <svg {...iconProps}><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></svg>,
  Data: <svg {...iconProps}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>,
  DevOps: <svg {...iconProps}><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>,
  Mobile: <svg {...iconProps}><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>,
  Management: <svg {...iconProps}><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>,
};

const formatSalary = (amount) => {
  if (!amount) return null;
  if (amount >= 100000) return '₹' + (amount / 100000).toFixed(1) + 'L';
  if (amount >= 1000) return '₹' + (amount / 1000).toFixed(0) + 'K';
  return '₹' + amount;
};

const MatchRing = ({ percent, size }) => {
  const sz = size || 80;
  const color = percent >= 80 ? '#10b981' : percent >= 50 ? '#FFA95A' : '#FF5A5A';
  const r = (sz / 2) - 7;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const half = sz / 2;
  const fs = sz < 70 ? '11' : '14';
  return (
    <svg width={sz} height={sz} viewBox={'0 0 ' + sz + ' ' + sz}>
      <circle cx={half} cy={half} r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
      <circle
        cx={half} cy={half} r={r} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={'rotate(-90 ' + half + ' ' + half + ')'}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text
        x={half} y={half}
        textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={fs} fontWeight="800"
      >
        {percent}%
      </text>
    </svg>
  );
};

const CareerModal = ({ career, onClose }) => {
  const [liveJobs, setLiveJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [jobCount, setJobCount] = useState(null);
  const [jobsPage, setJobsPage] = useState(1);
  const [visibleCount, setVisibleCount] = useState(8);
  const [activeTab, setActiveTab] = useState('skills');
  const [liveSalary, setLiveSalary] = useState(null);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryError, setSalaryError] = useState(false);

  useEffect(() => {
    if (!career) return;
    setActiveTab('skills');
    setLiveJobs([]);
    setJobCount(null);
    setJobsPage(1);
    setVisibleCount(8);

    // Explore results already come with salary attached from the same
    // backend call — no need to re-fetch (it'd just hit the cache anyway,
    // but this avoids the pointless round trip entirely).
    if (career.isExploreResult && career.salary) {
      setLiveSalary(career.salary);
      setSalaryError(false);
      setSalaryLoading(false);
      return;
    }

    setLiveSalary(null);
    setSalaryError(false);
    setSalaryLoading(true);

    marketAPI.getSalary(career.title, career.category)
      .then(({ data }) => setLiveSalary(data))
      .catch(() => setSalaryError(true))
      .finally(() => setSalaryLoading(false));
  }, [career]);

  const fetchLiveJobs = async () => {
    if (liveJobs.length > 0) { setActiveTab('jobs'); return; }
    setActiveTab('jobs');
    setJobsLoading(true);
    try {
      const { data } = await marketAPI.getLiveJobs(career.title, 1);
      setLiveJobs(data.jobs || []);
      setJobCount(data.count || 0);
      setJobsPage(1);
      setVisibleCount(8);
    } catch (_err) {
      toast.error('Could not fetch live jobs — check your Adzuna API key');
    } finally {
      setJobsLoading(false);
    }
  };

  const handleShowMore = async () => {
    // Reveal already-fetched jobs first — this costs nothing, no API call
    if (visibleCount < liveJobs.length) {
      setVisibleCount((v) => Math.min(v + 8, liveJobs.length));
      return;
    }
    // Local batch exhausted — only now fetch the next page from Adzuna
    if (jobCount !== null && liveJobs.length >= jobCount) return;
    setLoadingMore(true);
    try {
      const nextPage = jobsPage + 1;
      const { data } = await marketAPI.getLiveJobs(career.title, nextPage);
      setLiveJobs((prev) => [...prev, ...(data.jobs || [])]);
      setVisibleCount((v) => v + 8);
      setJobsPage(nextPage);
    } catch (_err) {
      toast.error('Could not load more jobs');
    } finally {
      setLoadingMore(false);
    }
  };


  if (!career) return null;

  const matchClr = career.matchPercent >= 80 ? 'var(--success-text)' : career.matchPercent >= 50 ? 'var(--amber)' : 'var(--red)';

  const StatusMessage = () => {
    if (career.matchPercent >= 80) return <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="10" /></svg> You are ready to apply!</span>;
    if (career.matchPercent >= 50) return <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="10" /></svg> Almost there</span>;
    return <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="10" /></svg> Keep building skills</span>;
  };

  return (
    <div className="career-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="career-modal">

        <div className="cmodal-header">
          <div className="cmodal-header-left">
            <div className="cmodal-icon">{CATEGORY_ICONS[career.category] || <svg {...iconProps}><circle cx="12" cy="12" r="10" /></svg>}</div>
            <div>
              <div className="cmodal-category">
                {career.category}
                {career.isExploreResult && <span className="ai-estimate-tag">AI Estimated</span>}
              </div>
              <div className="cmodal-title">{career.title}</div>
            </div>
          </div>
          <button className="cmodal-close" onClick={onClose}><svg {...iconProps}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
        </div>

        <div className="cmodal-stats-row">
          <div className="cmodal-match-box">
            <MatchRing percent={career.matchPercent} size={90} />
            <div>
              <div className="cmodal-match-title">Your Match</div>
              <div className="cmodal-match-status" style={{ color: matchClr }}><StatusMessage /></div>
            </div>
          </div>
          <div className="cmodal-info-grid">
            <div className="cmodal-info-box">
              <div className="cmodal-info-label">Salary Range (India)</div>
              {salaryLoading ? (
                <div className="salary-skeleton" />
              ) : salaryError || !liveSalary ? (
                <div className="cmodal-info-value" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Live data unavailable
                </div>
              ) : (
                <div className="cmodal-info-value">
                  {formatSalary(liveSalary.salaryMin)} – {formatSalary(liveSalary.salaryMax)}
                </div>
              )}
              <div className="cmodal-info-sub">
                {liveSalary ? `${liveSalary.listingCount} live listings today` : 'per year • Indian market'}
              </div>
            </div>
            <div className="cmodal-info-box">
              <div className="cmodal-info-label">
                Market Demand
                {liveSalary?.demandPeerCount > 0 && (
                  <span
                    className="info-tooltip-trigger"
                    data-tooltip={`${liveSalary.totalMatchingCount} open roles here vs. a typical ${liveSalary.demandPeerMedian} among ${liveSalary.demandPeerCount} other ${career.category} role${liveSalary.demandPeerCount > 1 ? 's' : ''} you've viewed`}
                  >
                    <svg {...iconProps} width="13" height="13"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                  </span>
                )}
              </div>
              {salaryLoading ? (
                <div className="salary-skeleton" />
              ) : salaryError || !liveSalary?.demandLevel ? (
                <div className="cmodal-info-value" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Live data unavailable
                </div>
              ) : (
                <div className="cmodal-info-value" style={{ color: (DEMAND_COLOR[liveSalary.demandLevel] || DEMAND_COLOR.medium).color }}>
                  {(DEMAND_COLOR[liveSalary.demandLevel] || DEMAND_COLOR.medium).label}
                </div>
              )}
              <div className="cmodal-info-sub">
                {liveSalary?.totalMatchingCount != null ? `${liveSalary.totalMatchingCount} open roles right now` : 'Based on current listings'}
              </div>
            </div>
            <div className="cmodal-info-box">
              <div className="cmodal-info-label">Required Skills</div>
              <div className="cmodal-info-value">{career.requiredSkills ? career.requiredSkills.length : 0}</div>
              <div className="cmodal-info-sub">to qualify for this role</div>
            </div>
            <div className="cmodal-info-box">
              <div className="cmodal-info-label">Skills Met</div>
              <div className="cmodal-info-value" style={{ color: '#059669' }}>
                {career.matchedSkills ? career.matchedSkills.length : 0} / {career.requiredSkills ? career.requiredSkills.length : 0}
              </div>
              <div className="cmodal-info-sub">from your skill map</div>
            </div>
          </div>
        </div>

        {career.description && <p className="cmodal-desc">{career.description}</p>}

        <div className="cmodal-tabs">
          <button
            className={activeTab === 'skills' ? 'cmodal-tab active' : 'cmodal-tab'}
            onClick={() => setActiveTab('skills')}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><svg {...iconProps} width="16" height="16"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> Skill Gap Analysis</span>
          </button>
          <button
            className={activeTab === 'jobs' ? 'cmodal-tab active' : 'cmodal-tab'}
            onClick={fetchLiveJobs}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><svg {...iconProps} width="16" height="16"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg> Live Jobs in India</span>
            {jobCount !== null && (
              <span className="cmodal-tab-count">{jobCount.toLocaleString()}+ openings</span>
            )}
          </button>
        </div>

        {activeTab === 'skills' && (
          <div className="cmodal-skills-row">
            <div className="cmodal-skills-col">
              <div className="cmodal-skills-heading matched-heading">
                <svg {...iconProps} width="16" height="16" style={{ marginRight: '6px' }}><polyline points="20 6 9 17 4 12" /></svg> Skills you have ({career.matchedSkills ? career.matchedSkills.length : 0})
              </div>
              {career.matchedSkills && career.matchedSkills.length > 0
                ? career.matchedSkills.map((s) => (
                  <div key={s.name} className="cmodal-skill matched">
                    <div className="cmodal-skill-top">
                      <span className="cmodal-skill-name">{s.name}</span>
                      <span className="cmodal-skill-badge matched-badge">Lv.{s.userLevel} <svg {...iconProps} width="12" height="12"><polyline points="20 6 9 17 4 12" /></svg></span>
                    </div>
                    <div className="cmodal-skill-bar">
                      <div className="cmodal-skill-fill matched-fill" style={{ width: (s.userLevel / 5 * 100) + '%' }} />
                    </div>
                    <div className="cmodal-skill-sub">Need Lv.{s.minLevel} — you have Lv.{s.userLevel}</div>
                  </div>
                ))
                : <div className="cmodal-empty">No matching skills yet — add skills in Skill Map</div>
              }
            </div>
            <div className="cmodal-skills-col">
              <div className="cmodal-skills-heading missing-heading">
                <svg {...iconProps} width="16" height="16" style={{ marginRight: '6px' }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> Skills to develop ({career.missingSkills ? career.missingSkills.length : 0})
              </div>
              {career.missingSkills && career.missingSkills.length > 0
                ? career.missingSkills.map((s) => (
                  <div key={s.name} className="cmodal-skill missing">
                    <div className="cmodal-skill-top">
                      <span className="cmodal-skill-name">{s.name}</span>
                      <span className="cmodal-skill-badge missing-badge">
                        {s.userLevel > 0 ? 'Lv.' + s.userLevel : 'Not added'}
                      </span>
                    </div>
                    <div className="cmodal-skill-bar">
                      <div className="cmodal-skill-fill missing-fill" style={{ width: (s.userLevel / 5 * 100) + '%' }} />
                      <div className="cmodal-skill-need-marker" style={{ left: (s.minLevel / 5 * 100) + '%' }} />
                    </div>
                    <div className="cmodal-skill-sub">
                      {s.userLevel > 0
                        ? 'You have Lv.' + s.userLevel + ' — need Lv.' + s.minLevel
                        : 'Need to reach Lv.' + s.minLevel}
                    </div>
                  </div>
                ))
                : <div className="cmodal-empty">🎉 You meet all skill requirements!</div>
              }
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="cmodal-jobs-section">
            {jobsLoading ? (
              <div className="jobs-loading">
                <div className="spinner" />
                <p>Fetching live jobs from India…</p>
              </div>
            ) : liveJobs.length === 0 ? (
              <div className="cmodal-empty">
                No live jobs found. Check your Adzuna API key in backend/.env
              </div>
            ) : (
              <div>
                <div className="jobs-header-row">
                  <span className="jobs-count-text">
                    Showing {liveJobs.length} of {jobCount ? jobCount.toLocaleString() : '0'}+ live openings in India
                  </span>
                  <span className="jobs-source">Powered by Adzuna</span>
                </div>
                <div className="jobs-list">
                  {liveJobs.slice(0, visibleCount).map((job, i) => (
                    <a key={i} href={job.url} target="_blank" rel="noopener noreferrer" className="job-card">
                      <div className="job-card-left">
                        <div className="job-company-icon">
                          {job.company ? job.company[0].toUpperCase() : '?'}
                        </div>
                        <div>
                          <div className="job-title">{job.title}</div>
                          <div className="job-company">{job.company || 'Company not listed'}</div>
                          <div className="job-location">
                            <svg {...iconProps} width="14" height="14" style={{ marginRight: '4px', verticalAlign: '-2px' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                            {job.location || 'India'}
                          </div>
                        </div>
                      </div>
                      <div className="job-card-right">
                        {job.salary_min ? (
                          <div className="job-salary">
                            <svg {...iconProps} width="14" height="14" style={{ marginRight: '4px', verticalAlign: '-2px' }}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                            {formatSalary(job.salary_min)} – {formatSalary(job.salary_max)}
                          </div>
                        ) : (
                          <div className="job-salary-na">Salary not listed</div>
                        )}
                        <div className="job-posted">
                          {job.posted
                            ? new Date(job.posted).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                            : 'Recently'}
                        </div>
                        <div className="job-apply-btn">Apply &rarr;</div>
                      </div>
                    </a>
                  ))}
                </div>
                {(visibleCount < liveJobs.length || (jobCount !== null && liveJobs.length < jobCount)) && (
                  <button
                    className="jobs-show-more-btn"
                    onClick={handleShowMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading…' : 'Show more jobs'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="cmodal-footer-note">
          <svg {...iconProps} width="14" height="14" style={{ marginRight: '6px', verticalAlign: '-2px' }}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" /></svg>
          Salary and job data calculated live from current <strong>Adzuna</strong> listings in India — updated in real time.
        </div>

      </div>
    </div>
  );
};

const Careers = () => {
  const [matches, setMatches] = useState([]);
  const { announce } = useAchievementUnlock();
  const { refreshUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('All');
  const [sortBy, setSortBy] = useState('match');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [exploreQuery, setExploreQuery] = useState('');
  const [exploring, setExploring] = useState(false);
  const [showMatchExplain, setShowMatchExplain] = useState(
    () => localStorage.getItem('sp_hide_match_explain') !== 'true'
  );

  const dismissMatchExplain = () => {
    localStorage.setItem('sp_hide_match_explain', 'true');
    setShowMatchExplain(false);
  };

  const handleExplore = async (e) => {
    e.preventDefault();
    const title = exploreQuery.trim();
    if (!title || exploring) return;
    setExploring(true);
    try {
      const { data } = await careerAPI.explore(title);
      setModal({
        _id: `explore-${Date.now()}`,
        title: data.title,
        category: data.category,
        description: null,
        matchPercent: data.matchPercent,
        matchedSkills: data.matchedSkills,
        missingSkills: data.missingSkills,
        requiredSkills: data.requiredSkills,
        salary: data.salary,
        isExploreResult: true,
      });
      if (data.newAchievements?.length) {
        announce(data.newAchievements);
        refreshUser();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not find data for that role right now');
    } finally {
      setExploring(false);
    }
  };

  useEffect(() => {
    careerAPI.getMatches()
      .then(({ data }) => {
        setMatches(data.matches);
        if (data.newAchievements?.length) {
          announce(data.newAchievements);
          refreshUser();
        }
      })
      .catch(() => toast.error('Failed to load careers'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setModal(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const filtered = matches
    .filter((m) => filterCat === 'All' || m.category === filterCat)
    .filter((m) => !search || m.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'match') return b.matchPercent - a.matchPercent;
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return 0;
    });

  const readyCount = matches.filter((m) => m.matchPercent >= 80).length;
  const avgMatch = matches.length
    ? Math.round(matches.reduce((s, m) => s + m.matchPercent, 0) / matches.length) : 0;
  const topMatch = matches[0];

  if (loading) {
    return <CareersSkeleton />;
  }

  const StatusLabel = ({ percent }) => {
    if (percent >= 80) return <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="10" /></svg> Ready</span>;
    if (percent >= 50) return <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="10" /></svg> Almost</span>;
    return <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="10" /></svg> Learning</span>;
  };

  return (
    <div className="page-content">

      <div className="page-header">
        <div>
          <h1 className="page-title">Career Paths</h1>
          <p className="page-subtitle">Click any card to see your skill gap analysis</p>
        </div>
      </div>

      <div className="career-summary">
        {[
          { icon: <svg {...iconProps}><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>, bg: 'var(--danger-bg)', color: 'var(--red)', value: matches.length, label: 'Career Paths' },
          { icon: <svg {...iconProps}><polyline points="20 6 9 17 4 12" /></svg>, bg: 'var(--success-strong-bg)', color: 'var(--success-text)', value: readyCount, label: '80%+ Match' },
          { icon: <svg {...iconProps}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>, bg: 'var(--primary-bg)', color: 'var(--amber)', value: avgMatch + '%', label: 'Avg Match' },
          {
            icon: <svg {...iconProps}><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>, bg: 'var(--warning-bg)', color: 'var(--gold)',
            value: topMatch ? topMatch.matchPercent + '%' : '—',
            label: topMatch ? topMatch.title : 'Best Match'
          },
        ].map((s) => (
          <div className="career-stat-card" key={s.label}>
            <div className="career-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div>
              <div className="career-stat-value">{s.value}</div>
              <div className="career-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {showMatchExplain && (
        <div className="match-explain">
          <span className="match-explain-icon">
            <svg {...iconProps} width="24" height="24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
          </span>
          <div style={{ flex: 1 }}>
            <div className="match-explain-title">How career matching works</div>
            <div className="match-explain-text">
              Each career requires specific skills at minimum proficiency levels.
              Your match % = skills you already meet divided by total required.
              Click any card to see your full skill gap and live job openings.
            </div>
          </div>
          <button className="match-explain-dismiss" onClick={dismissMatchExplain} aria-label="Dismiss">
            <svg {...iconProps} width="16" height="16"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      )}

      <div className="career-explore-bar">
        <div className="career-explore-icon">
          <svg {...iconProps} width="20" height="20"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
        </div>
        <div className="career-explore-text">
          <div className="career-explore-title">Explore any career, not just the ones above</div>
          <div className="career-explore-sub">Type a role — we'll pull live salary, live demand, and AI-estimated skill requirements for it</div>
        </div>
        <form className="career-explore-form" onSubmit={handleExplore}>
          <input
            className="career-explore-input"
            value={exploreQuery}
            onChange={(e) => setExploreQuery(e.target.value)}
            placeholder="e.g. Blockchain Developer, Cloud Architect…"
          />
          <button className="career-explore-btn" type="submit" disabled={exploring}>
            {exploring ? 'Exploring…' : 'Explore'}
          </button>
        </form>
      </div>

      <div className="career-filters">
        <div className="career-search-wrap">
          <span className="search-icon">
            <svg {...iconProps} width="16" height="16"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </span>
          <input
            className="career-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search careers…"
          />
        </div>
        <div className="filter-tabs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={filterCat === cat ? 'filter-tab active' : 'filter-tab'}
              onClick={() => setFilterCat(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <select className="career-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="match">Best Match</option>
          <option value="title">A – Z</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg {...iconProps} width="40" height="40"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </div>
            <h3>No careers found</h3>
            <p>Try a different filter or search term</p>
          </div>
        </div>
      ) : (
        <div className="careers-grid">
          {filtered.map((career) => {
            const barBg = career.matchPercent >= 80
              ? 'linear-gradient(90deg,#059669,#10b981)'
              : career.matchPercent >= 50
                ? 'linear-gradient(90deg,#FF8B5A,#FFD45A)'
                : 'linear-gradient(90deg,#FF5A5A,#FF8B5A)';
            return (
              <div key={career._id} className="career-card" onClick={() => setModal(career)}>
                <div className="career-card-header">
                  <div className="career-icon">{CATEGORY_ICONS[career.category] || <svg {...iconProps}><circle cx="12" cy="12" r="10" /></svg>}</div>
                  <MatchRing percent={career.matchPercent} size={64} />
                </div>
                <div className="career-title">{career.title}</div>
                <div className="career-meta">
                  <span className="category-badge">{career.category}</span>
                </div>
                <p className="career-desc">{career.description}</p>
                <div className="career-match-bar-wrap">
                  <div className="career-match-bar">
                    <div className="career-match-fill" style={{ width: career.matchPercent + '%', background: barBg }} />
                  </div>
                  <span className="career-match-status"><StatusLabel percent={career.matchPercent} /></span>
                </div>
                <div className="career-view-detail">Tap to view live salary &amp; demand &rarr;</div>
              </div>
            );
          })}
        </div>
      )}

      <CareerModal career={modal} onClose={() => setModal(null)} />

    </div>
  );
};

export default Careers;