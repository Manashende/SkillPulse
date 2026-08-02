import { useState, useContext, useRef, useEffect } from 'react';
import { agentAPI, goalAPI } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './CareerAgent.css';
import CareerAgentSkeleton from '../components/agent/CareerAgentSkeleton';

import { callGemini, safeParseJSON } from '../utils/gemini';

const iconProps = { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };

const TOOLS = [
  { key: 'analyseProfile', name: 'Profile Analyser', icon: <svg {...iconProps}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>, color: '#FF8B5A', desc: 'Reads your skills, goals & matches' },
  { key: 'findSkillGaps', name: 'Gap Detective', icon: <svg {...iconProps}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>, color: '#FF5A5A', desc: 'Identifies skill gaps for target role' },
  { key: 'searchJobs', name: 'Job Scout', icon: <svg {...iconProps}><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>, color: '#3b82f6', desc: 'Live Indian jobs via Adzuna API' },
  { key: 'fetchCourses', name: 'Course Finder', icon: <svg {...iconProps}><polygon points="5 3 19 12 5 21 5 3" /></svg>, color: '#8b5cf6', desc: 'Live YouTube tutorials for your gaps' },
  { key: 'buildRoadmap', name: 'Roadmap Builder', icon: <svg {...iconProps}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>, color: '#10b981', desc: 'Personalised 90-day action plan' },
  { key: 'createGoals', name: 'Goal Creator', icon: <svg {...iconProps}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>, color: '#f59e0b', desc: 'Auto-saves goals to Goal Tracker' },
];

const SUGGESTED = [
  { icon: <svg {...iconProps}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>, text: 'Make me job-ready for Full Stack Developer in 3 months', cat: 'Career Plan' },
  { icon: <svg {...iconProps}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>, text: 'Analyse my skill gaps and what to learn next', cat: 'Gap Analysis' },
  { icon: <svg {...iconProps}><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>, text: 'Find me jobs for Full Stack developer.', cat: 'Job Search' },
  { icon: <svg {...iconProps}><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></svg>, text: 'Build me a 90-day study roadmap to boost my career', cat: 'Roadmap' },
  { icon: <svg {...iconProps}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>, text: 'Create goals in my tracker for becoming a Data Scientist', cat: 'Auto Goals' },
  { icon: <svg {...iconProps}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>, text: 'Compare my profile with what Indian tech companies need', cat: 'Market Fit' },
];

const CareerAgent = () => {
  const { user, refreshUser } = useContext(AuthContext);

  const [messages, setMessages] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [stepStatus, setStepStatus] = useState({});
  const [toolsOpen, setToolsOpen] = useState(false);
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [creatingGoals, setCreatingGoals] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesRef = useRef(null);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(null);

  // Load from the DB on mount. If nothing's there yet, migrate any old
  // localStorage chat once, then never read localStorage again.
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const { data } = await agentAPI.getHistory();
        let serverMessages = data.messages || [];

        if (serverMessages.length === 0) {
          try {
            const legacy = JSON.parse(localStorage.getItem('sp_career_agent_chat') || 'null');
            if (Array.isArray(legacy) && legacy.length > 0) {
              await agentAPI.saveHistory(legacy);
              serverMessages = legacy;
            }
          } catch { /* ignore malformed legacy data */ }
          localStorage.removeItem('sp_career_agent_chat');
        }
        setMessages(serverMessages);
      } catch {
        toast.error('Failed to load chat history');
      } finally {
        setHistoryLoaded(true);
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    if (!historyLoaded) return; // don't save before the initial fetch completes — would overwrite saved history with []
    agentAPI.saveHistory(messages).catch(() => { });
  }, [messages, historyLoaded]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isRunning]);

  useEffect(() => {
    if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
  }, [historyLoaded]);  

  const setStep = (key, status) => setStepStatus(p => ({ ...p, [key]: status }));
  const addMsg = (msg) => setMessages(p => [...p, msg]);

  const [selectedGoals, setSelectedGoals] = useState({}); // { [msgIndex]: Set of selected goal indices }

  const toggleGoalSelect = (msgIndex, goalIdx, totalCount) => {
    setSelectedGoals(prev => {
      const current = new Set(prev[msgIndex] ?? Array.from({ length: totalCount }, (_, i) => i));
      if (current.has(goalIdx)) current.delete(goalIdx);
      else current.add(goalIdx);
      return { ...prev, [msgIndex]: current };
    });
  };

  const generateGoalSteps = async (title) => {
    const prompt =
      'You are a career advisor for Indian engineering students.\n\n' +
      'Goal: "' + title + '"\n\n' +
      'Return ONLY this JSON (no markdown, no backticks, no extra text):\n' +
      '{\n' +
      '  "steps": [\n' +
      '    {\n' +
      '      "text": "Specific actionable step title",\n' +
      '      "estimatedDays": 2,\n' +
      '      "resources": [\n' +
      '        {"type":"article","title":"Resource name","url":"https://..."},\n' +
      '        {"type":"video","title":"YouTube tutorial name","url":"https://www.youtube.com/results?search_query=topic+tutorial"}\n' +
      '      ]\n' +
      '    }\n' +
      '  ]\n' +
      '}\n\n' +
      'Rules:\n' +
      '- Break the goal into 5-7 specific, progressive, actionable steps — never vague placeholders like "Start working" or "Make progress"\n' +
      '- estimatedDays: 1-7 per step, scaled realistically to the actual scope of this specific goal — a small goal like "Learn Git basics" needs far fewer total days than a large one like "Become a Full Stack Developer"\n' +
      '- YouTube URLs: use https://www.youtube.com/results?search_query= with + separated keywords\n' +
      '- Provide max 2 resources per step\n' +
      '- ONLY return the JSON object. Nothing else.';

    const raw = await callGemini(prompt, { temperature: 0.6, maxOutputTokens: 3000 });
    const parsed = safeParseJSON(raw);
    if (!parsed?.steps?.length) return null;
    return parsed.steps.map(s => ({
      text: String(s.text),
      estimatedDays: Number(s.estimatedDays) || 1,
      resources: Array.isArray(s.resources) ? s.resources : [],
      done: false,
    }));
  };

  const confirmCreateGoals = async (msgIndex, titles) => {
    setCreatingGoals(true);
    const results = await Promise.allSettled(titles.map(async (title) => {
      const { data } = await goalAPI.create({ title, status: 'todo', priority: 'high', progress: 0 });
      // Generate a real roadmap instead of letting Goals.jsx fall back to the
      // generic 3-step placeholder — same localStorage key format Goals.jsx
      // already reads from (sp_steps_<goalId>), so this shows up correctly.
      try {
        const steps = await generateGoalSteps(title);
        if (steps && data?.goal?._id) {
          await goalAPI.update(data.goal._id, { steps });
        }
      } catch (stepErr) {
        console.error('Step generation failed for "' + title + '":', stepErr.message);
        // Non-fatal — the goal itself is still created either way
      }
      return title;
    }));

    const created = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failed = titles.filter(t => !created.includes(t));

    if (created.length && refreshUser) refreshUser();
    setMessages(prev => prev.map((m, i) =>
      i === msgIndex ? { ...m, pendingGoals: [], createdGoals: created } : m
    ));
    setSelectedGoals(prev => { const next = { ...prev }; delete next[msgIndex]; return next; });
    setCreatingGoals(false);

    if (created.length) toast.success(`Added ${created.length} goal${created.length > 1 ? 's' : ''} with full roadmaps!`);
    if (failed.length) toast.error(`Couldn't add ${failed.length} goal${failed.length > 1 ? 's' : ''} — check browser console`);
  };

  const dismissPendingGoals = (msgIndex) => {
    setMessages(prev => prev.map((m, i) =>
      i === msgIndex ? { ...m, pendingGoals: [] } : m
    ));
    setSelectedGoals(prev => { const next = { ...prev }; delete next[msgIndex]; return next; });
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear your chat history?")) {
      setMessages([]);
      agentAPI.clearHistory().catch(() => { });
      localStorage.removeItem('sp_career_agent_chat'); // harmless if already gone
    }
  };

  const runAgent = async (userMsg) => {
    if (!userMsg.trim() || isRunning) return;
    setIsRunning(true);
    setStepStatus({});
    setToolsOpen(false);
    setPromptsOpen(false);
    addMsg({ role: 'user', content: userMsg });

    try {
      const history = messages
        .filter(m => m.role === 'user' || m.role === 'agent')
        .map(m => ({ role: m.role, content: m.content }));

      const { data } = await agentAPI.run(userMsg, history);
      // Orchestration now happens server-side in one call, so we can't track
      // real-time per-tool progress. Mark relevant steps 'done' based on
      // which fields came back in the response.
      if (data.profileAnalyzed) setStep('analyseProfile', 'done');
      if (data.keyGaps?.length || data.strengths?.length) setStep('findSkillGaps', 'done');
      if (data.liveJobs?.length) setStep('searchJobs', 'done');
      if (data.courseMap && Object.keys(data.courseMap).length) setStep('fetchCourses', 'done');
      if (data.roadmap?.phases?.length) setStep('buildRoadmap', 'done');
      if (data.pendingGoals?.length) setStep('createGoals', 'done');

      addMsg({
        role: 'agent',
        content: data.advice,
        targetRole: data.targetRole,
        keyGaps: data.keyGaps || [],
        strengths: data.strengths || [],
        liveJobs: data.liveJobs || [],
        courseMap: data.courseMap || {},
        roadmap: data.roadmap || null,
        pendingGoals: data.pendingGoals || [],
      });
    } catch (err) {
      console.error('Agent error:', err);
      addMsg({ role: 'agent', content: '⚠ ' + (err.response?.data?.message || err.message), error: true });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSend = () => {
    if (input.trim() && !isRunning) { runAgent(input); setInput(''); }
  };

  const activeStepsCount = TOOLS.filter(t => stepStatus[t.key] && stepStatus[t.key] !== 'idle').length;

  if (!historyLoaded) return <CareerAgentSkeleton />;

  return (
    <div className="ca-page">

      {/* ── Header ── */}
      <div
        ref={headerRef}
        className="ca-header"
        style={headerHeight ? { '--ca-header-h': headerHeight + 'px' } : undefined}
      >
        <div className="ca-header-text">
          <h1 className="ca-title">AI Career Agent</h1>
          <p className="ca-subtitle">
            Analyses your profile · Searches live jobs · Finds courses · Builds roadmaps · Creates goals
          </p>
        </div>
        <div className="ca-header-actions">
          <div className={'ca-status' + (isRunning ? ' running' : '')}>
            <div className="ca-status-dot" />
            {isRunning ? 'Running…' : 'Ready'}
          </div>
          {messages.length > 0 && !isRunning && (
            <button onClick={handleClearHistory} className="ca-clear-btn" title="Clear Chat History">
              <svg {...iconProps}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg> Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* ── Chat container ── */}
      <div className="ca-container">

        {/* Messages area */}
        <div className="ca-messages" ref={messagesRef}>

          {/* Welcome */}
          {messages.length === 0 && !isRunning && (
            <div className="ca-welcome">
              <div className="ca-welcome-emoji" style={{ color: 'var(--orange)', display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <svg {...iconProps} width="48" height="48"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
              </div>
              <div className="ca-welcome-title">Meet your AI Career Agent</div>
              <div className="ca-welcome-desc">
                I autonomously run 6 tools — Profile Analyser, Gap Detective, Job Scout, Course Finder,
                Roadmap Builder, and Goal Creator — all triggered from a single message.
              </div>
              <div className="ca-welcome-grid">
                {SUGGESTED.map((s, i) => (
                  <button key={i} className="ca-sug-card"
                    onClick={() => runAgent(s.text)}>
                    <span className="ca-sug-emoji" style={{ color: 'var(--orange)' }}>{s.icon}</span>
                    <div>
                      <div className="ca-sug-cat">{s.cat}</div>
                      <div className="ca-sug-text">{s.text}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg, i) => (
            <div key={i} className={'ca-msg ca-msg-' + msg.role}>
              {msg.role === 'user' ? (
                <div className="ca-user-bubble">{msg.content}</div>
              ) : (
                <div className="ca-agent-msg">
                  <div className="ca-agent-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg {...iconProps} width="14" height="14"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg> AI Career Agent
                  </div>
                  <div className="ca-agent-text">{msg.content}</div>

                  {!msg.error && <>
                    {/* Strengths + Gaps */}
                    {(msg.strengths?.length > 0 || msg.keyGaps?.length > 0) && (
                      <div className="ca-analysis">
                        {msg.strengths?.length > 0 && (
                          <div className="ca-analysis-box ca-green">
                            <div className="ca-box-title" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg {...iconProps} width="12" height="12"><polyline points="20 6 9 17 4 12" /></svg> Strengths</div>
                            {msg.strengths.map((s, si) => <div key={si} className="ca-box-row" style={{ display: 'flex', gap: '4px' }}><svg {...iconProps} width="12" height="12" style={{ flexShrink: 0, marginTop: '2px' }}><polyline points="20 6 9 17 4 12" /></svg> {s}</div>)}
                          </div>
                        )}
                        {msg.keyGaps?.length > 0 && (
                          <div className="ca-analysis-box ca-red">
                            <div className="ca-box-title" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg {...iconProps} width="12" height="12"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> Gaps to Fill</div>
                            {msg.keyGaps.map((g, gi) => <div key={gi} className="ca-box-row" style={{ display: 'flex', gap: '4px' }}><svg {...iconProps} width="12" height="12" style={{ flexShrink: 0, marginTop: '2px' }}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg> {g}</div>)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Jobs */}
                    {msg.liveJobs?.length > 0 && (
                      <div className="ca-result-section">
                        <div className="ca-result-title">
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><svg {...iconProps}><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg> Live Jobs for {msg.targetRole}</span>
                          <span className="ca-live-tag">Live · Adzuna</span>
                        </div>
                        {msg.liveJobs.slice(0, 4).map((job, ji) => (
                          <a key={ji} href={job.url} target="_blank" rel="noopener noreferrer"
                            className="ca-job">
                            <div className="ca-job-avatar">{job.company?.[0]?.toUpperCase() || '?'}</div>
                            <div className="ca-job-info">
                              <div className="ca-job-title">{job.title}</div>
                              <div className="ca-job-sub">{job.company} · {job.location || 'India'}</div>
                            </div>
                            <div className="ca-job-meta">
                              {job.salary_min
                                ? <div className="ca-job-pay">₹{(job.salary_min / 100000).toFixed(1)}L–{(job.salary_max / 100000).toFixed(1)}L</div>
                                : <div className="ca-job-pay" style={{ opacity: 0.6 }}>Negotiable</div>}
                              <div className="ca-job-cta">Apply →</div>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Courses */}
                    {Object.keys(msg.courseMap || {}).length > 0 && (
                      <div className="ca-result-section">
                        <div className="ca-result-title">
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><svg {...iconProps}><polygon points="5 3 19 12 5 21 5 3" /></svg> YouTube Tutorials</span>
                          <span className="ca-live-tag">Live · YouTube API</span>
                        </div>
                        {Object.entries(msg.courseMap).map(([skill, videos]) =>
                          videos?.length > 0 && (
                            <div key={skill} className="ca-course-grp">
                              <div className="ca-course-skill">{skill}</div>
                              <div className="ca-course-row">
                                {videos.map((v, vi) => (
                                  <a key={vi} href={v.url} target="_blank" rel="noopener noreferrer"
                                    className="ca-video">
                                    {v.thumbnail && <img src={v.thumbnail} alt="" className="ca-video-img" />}
                                    <div className="ca-video-info">
                                      <div className="ca-video-title">{v.title}</div>
                                      <div className="ca-video-ch" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg {...iconProps} width="10" height="10"><polygon points="5 3 19 12 5 21 5 3" /></svg> {v.channel}</div>
                                    </div>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {/* Roadmap */}
                    {msg.roadmap?.phases?.length > 0 && (
                      <div className="ca-result-section">
                        <div className="ca-result-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg {...iconProps}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> 90-Day Roadmap
                        </div>
                        <div className="ca-roadmap">
                          {msg.roadmap.phases.map((ph, pi) => (
                            <div key={pi} className="ca-phase">
                              <div className="ca-phase-hdr">
                                <div className="ca-phase-num">{pi + 1}</div>
                                <div>
                                  <div className="ca-phase-name">{ph.name}</div>
                                  <div className="ca-phase-wk">Weeks {ph.weeks}</div>
                                </div>
                              </div>
                              <div className="ca-phase-focus">{ph.focus}</div>
                              {ph.tasks?.map((t, ti) => <div key={ti} className="ca-phase-task">• {t}</div>)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Goals awaiting confirmation — nothing written yet */}
                    {msg.pendingGoals?.length > 0 && (() => {
                      const selected = selectedGoals[i] ?? new Set(msg.pendingGoals.map((_, gi) => gi));
                      const selectedTitles = msg.pendingGoals.filter((_, gi) => selected.has(gi));
                      return (
                        <div className="ca-result-section">
                          <div className="ca-result-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg {...iconProps} style={{ color: '#f59e0b' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> Suggested Goals — pick which to add
                          </div>
                          <div style={{ marginBottom: '0.5rem' }}>
                            {msg.pendingGoals.map((g, gi) => (
                              <label key={gi} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.4rem 0.6rem', cursor: 'pointer', borderRadius: '8px' }}>
                                <input
                                  type="checkbox"
                                  checked={selected.has(gi)}
                                  onChange={() => toggleGoalSelect(i, gi, msg.pendingGoals.length)}
                                  style={{ width: '16px', height: '16px', accentColor: 'var(--orange)', cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{g}</span>
                              </label>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => confirmCreateGoals(i, selectedTitles)}
                              disabled={selectedTitles.length === 0 || creatingGoals}
                              style={{ padding: '0.4rem 0.9rem', background: (selectedTitles.length && !creatingGoals) ? 'linear-gradient(135deg,#FF5A5A,#FF8B5A)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: (selectedTitles.length && !creatingGoals) ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              {creatingGoals ? (
                                <>Building roadmaps…</>
                              ) : (
                                <><svg {...iconProps} width="14" height="14"><polyline points="20 6 9 17 4 12" /></svg> Add {selectedTitles.length || ''} Goal{selectedTitles.length !== 1 ? 's' : ''} to Tracker</>
                              )}
                            </button>
                            <button
                              onClick={() => dismissPendingGoals(i)}
                              disabled={creatingGoals}
                              style={{ padding: '0.4rem 0.9rem', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                              Not now
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Created goals */}
                    {msg.createdGoals?.length > 0 && (
                      <div className="ca-result-section">
                        <div className="ca-result-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg {...iconProps} style={{ color: '#10b981' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> Goals Added to Tracker
                        </div>
                        {msg.createdGoals.map((g, gi) => (
                          <div key={gi} className="ca-goal-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: '6px' }}>
                            <svg {...iconProps} width="12" height="12"><polyline points="20 6 9 17 4 12" /></svg> {g}
                          </div>
                        ))}
                        <div className="ca-goals-note">Open Goal Tracker in the sidebar to see these!</div>
                      </div>
                    )}
                  </>}
                </div>
              )}
            </div>
          ))}

          {/* Running steps */}
          {isRunning && (
            <div className="ca-thinking">
              <div className="ca-thinking-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg {...iconProps} width="12" height="12"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg> Agent working…</div>
              <div className="ca-steps">
                {TOOLS.map(tool => {
                  const s = stepStatus[tool.key];
                  if (!s) return null;
                  return (
                    <div key={tool.key} className={'ca-step ca-step-' + s}>
                      <div className="ca-step-dot" style={{ borderColor: tool.color, color: tool.color }}>
                        {s === 'done' && <svg {...iconProps} width="12" height="12"><polyline points="20 6 9 17 4 12" /></svg>}
                        {s === 'active' && <span className="ca-step-spin" />}
                        {s === 'idle' && <div style={{ transform: 'scale(0.7)' }}>{tool.icon}</div>}
                      </div>
                      <div className="ca-step-name" style={{ color: s === 'done' ? tool.color : undefined }}>
                        {tool.name}
                        {s === 'active' && <span className="ca-step-lbl"> · Running…</span>}
                        {s === 'done' && <span className="ca-step-lbl"> · Done</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Expandable Tools + Prompts tray above input ── */}
        {(toolsOpen || promptsOpen) && (
          <div className="ca-tray">
            {toolsOpen && (
              <div className="ca-tray-content">
                <div className="ca-tray-heading" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg {...iconProps}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                  Agent Tools — runs automatically based on your prompt
                </div>
                <div className="ca-tray-tools">
                  {TOOLS.map(tool => {
                    const s = stepStatus[tool.key] || 'idle';
                    return (
                      <div key={tool.key} className={'ca-tray-tool ca-tray-' + s}>
                        <div className="ca-tray-icon" style={{ color: tool.color }}>
                          {s === 'done' ? <svg {...iconProps}><polyline points="20 6 9 17 4 12" /></svg> :
                            s === 'active' ? <span className="ca-step-spin" /> :
                              tool.icon}
                        </div>
                        <div>
                          <div className="ca-tray-name">{tool.name}</div>
                          <div className="ca-tray-desc">{tool.desc}</div>
                        </div>
                        {s === 'done' && <span className="ca-tray-done" style={{ color: tool.color }}>Done</span>}
                        {s === 'active' && <span className="ca-tray-done" style={{ color: '#FFA95A' }}>Active</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {promptsOpen && (
              <div className="ca-tray-content">
                <div className="ca-tray-heading" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg {...iconProps} color="var(--orange)"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                  Quick Prompts — click to send instantly
                </div>
                <div className="ca-tray-prompts">
                  {SUGGESTED.map((s, i) => (
                    <button key={i} className="ca-tray-prompt"
                      onClick={() => { setPromptsOpen(false); runAgent(s.text); }}>
                      <span style={{ color: 'var(--orange)' }}>{s.icon}</span>
                      <div>
                        <div className="ca-tray-prompt-cat">{s.cat}</div>
                        <div className="ca-tray-prompt-text">{s.text}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Input bar ── */}
        <div className="ca-inputbar">
          <div className="ca-inputbar-btns">
            <button
              className={'ca-toggle-btn' + (toolsOpen ? ' active' : '')}
              onClick={() => { setToolsOpen(p => !p); setPromptsOpen(false); }}
              title="View agent tools"
            >
              <span className="ca-toggle-icon"><svg {...iconProps}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg></span>
              Tools
              {activeStepsCount > 0 && (
                <span className="ca-badge">{activeStepsCount}</span>
              )}
            </button>
            <button
              className={'ca-toggle-btn' + (promptsOpen ? ' active' : '')}
              onClick={() => { setPromptsOpen(p => !p); setToolsOpen(false); }}
              title="Quick prompt suggestions"
            >
              <span className="ca-toggle-icon"><svg {...iconProps}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg></span>
              Prompts
            </button>
          </div>

          <div className="ca-inputrow">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && !isRunning) {
                  e.preventDefault(); handleSend();
                }
              }}
              placeholder="Ask me anything… e.g. 'Make me job-ready for Data Scientist in 2 months'"
              className="ca-textarea"
              disabled={isRunning}
              rows={2}
            />
            <button
              className="ca-send"
              onClick={handleSend}
              disabled={isRunning || !input.trim()}
            >
              {isRunning ? <span className="ca-send-spin" /> : <svg {...iconProps}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>}
            </button>
          </div>
          <div className="ca-hint">
            Enter to send · Shift+Enter new line · <svg {...iconProps} width="10" height="10" style={{ verticalAlign: '-1px' }}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg> Tools shows what the agent is doing
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareerAgent;