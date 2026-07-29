import { useEffect, useState } from 'react';
import { goalAPI } from '../services/api';
import { callGemini, safeParseJSON } from '../utils/gemini';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useAchievementUnlock } from '../context/AchievementUnlockContext';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';
import './Goals.css';
import GoalsSkeleton from '../components/goals/GoalsSkeleton';

// Reusable SVG config for perfect uniformity
const iconProps = { viewBox: "0 0 24 24", width: "18", height: "18", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };

const PRIORITIES = ['low', 'medium', 'high'];
const PRIORITY_CONFIG = {
    low: { label: 'Low', color: '#10b981', bg: '#ecfdf5' },
    medium: { label: 'Medium', color: '#FFA95A', bg: '#fff8ee' },
    high: { label: 'High', color: '#FF5A5A', bg: '#fff0f0' },
};
const STATUS_CONFIG = {
    'todo': { label: 'To Do', color: '#94a3b8', bg: '#f8fafc', icon: <svg {...iconProps}><circle cx="12" cy="12" r="10" /></svg> },
    'in-progress': { label: 'In Progress', color: '#FFA95A', bg: '#fff8ee', icon: <svg {...iconProps}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
    'done': { label: 'Done', color: '#10b981', bg: '#ecfdf5', icon: <svg {...iconProps}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> },
};
const STEP_COLORS = ['#FF5A5A', '#FF8B5A', '#FFA95A', '#FFD45A', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getLocalYMD = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const emptyForm = { title: '', description: '', linkedSkill: '', priority: 'medium', deadline: '', steps: [{ text: '', estimatedDays: 1 }, { text: '', estimatedDays: 1 }, { text: '', estimatedDays: 1 }] };

const getLegacySteps = (id) => { try { return JSON.parse(localStorage.getItem('sp_steps_' + id)); } catch { return null; } };
const getLegacyMeta = (id) => { try { return JSON.parse(localStorage.getItem('sp_meta_' + id)); } catch { return null; } };

const defaultSteps = (goal) => [
    { text: 'Start working on ' + goal.title, estimatedDays: 1, resources: [], done: false },
    { text: 'Make significant progress', estimatedDays: 2, resources: [], done: false },
    { text: 'Complete ' + goal.title, estimatedDays: 1, resources: [], done: false },
];

const calcFromSteps = (steps) => {
    if (!steps || !steps.length) return { status: 'todo', progress: 0 };
    const done = steps.filter(s => s.done).length;
    return {
        progress: Math.round((done / steps.length) * 100),
        status: done === 0 ? 'todo' : done === steps.length ? 'done' : 'in-progress',
    };
};

const generateRoadmap = async (title, skill, priority, description, deadline) => {
    const today = new Date().toISOString().slice(0, 10);
    const prompt =
        'You are a career advisor for Indian engineering students.\n\n' +
        'Goal: "' + title + '"\n' +
        (skill ? 'Skill: ' + skill + '\n' : '') +
        (description ? 'Description: ' + description + '\n' : '') +
        'Priority: ' + priority + '\n' +
        'Today: ' + today + '\n' +
        (deadline ? 'User deadline: ' + deadline + '\n' : 'No deadline given — you must suggest one.\n') +
        '\nReturn ONLY this JSON (no markdown, no backticks, no extra text):\n' +
        '{\n' +
        '  "suggestedDeadline": "YYYY-MM-DD",\n' +
        '  "deadlineReason": "One sentence why this timeline is realistic for a student",\n' +
        '  "steps": [\n' +
        '    {\n' +
        '      "text": "Specific actionable step title",\n' +
        '      "estimatedDays": 2,\n' +
        '      "resources": [\n' +
        '        {"type":"article","title":"Resource name","url":"https://..."},\n' +
        '        {"type":"video","title":"YouTube tutorial name","url":"https://www.youtube.com/results?search_query=topic+tutorial"},\n' +
        '        {"type":"website","title":"Official docs name","url":"https://..."}\n' +
        '      ]\n' +
        '    }\n' +
        '  ]\n' +
        '}\n\n' +
        'Rules:\n' +
        '- Generate 6-8 steps, each specific, progressive, actionable\n' +
        '- estimatedDays: 1-7 per step (realistic for student)\n' +
        (deadline
            ? '- Map all steps to fit within user deadline ' + deadline + '. If too tight, warn in deadlineReason but still make steps achievable.\n'
            : '- suggestedDeadline = today plus total of all estimatedDays\n') +
        '- YouTube URLs: use https://www.youtube.com/results?search_query= with + separated keywords\n' +
        '- Keep resource titles under 60 characters\n' +
        '- Provide only 2 resources per step maximum (1 video + 1 article or website)\n' +
        '- ONLY return the JSON object. Nothing else.';

    const text = await callGemini(prompt, { temperature: 0.7, maxOutputTokens: 8192 });
    const obj = safeParseJSON(text);

    if (!obj || !obj.steps || !Array.isArray(obj.steps)) {
        throw new Error('AI returned an invalid response — please try again');
    }

    return {
        suggestedDeadline: obj.suggestedDeadline || '',
        deadlineReason: obj.deadlineReason || '',
        steps: obj.steps.map(s => ({
            text: String(s.text),
            estimatedDays: Number(s.estimatedDays) || 1,
            resources: Array.isArray(s.resources) ? s.resources : [],
            done: false,
        })),
    };
};

const GoalCalendar = ({ steps, startDate }) => {
    const init = () => {
        // Appending T00:00:00 forces local parsing
        const d = startDate ? new Date(startDate + 'T00:00:00') : new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    };
    const [month, setMonth] = useState(init);

    const dateMap = {};
    let cursor = startDate ? new Date(startDate + 'T00:00:00') : new Date();
    cursor.setHours(0, 0, 0, 0);

    steps.forEach((step, i) => {
        const key = getLocalYMD(cursor); // Replaced toISOString()
        if (!dateMap[key]) dateMap[key] = [];
        dateMap[key].push({ step, index: i });
        cursor.setDate(cursor.getDate() + (step.estimatedDays || 1));
    });

    const yr = month.getFullYear();
    const mo = month.getMonth();
    const first = new Date(yr, mo, 1).getDay();
    const days = new Date(yr, mo + 1, 0).getDate();
    const today = getLocalYMD(); // Replaced toISOString()

    const cells = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);

    const [tooltip, setTooltip] = useState(null);

    return (
        <div className="goal-calendar">
            <div className="cal-nav-row">
                <button className="cal-nav-btn" onClick={() => setMonth(new Date(yr, mo - 1, 1))}>
                    <svg {...iconProps} width="16" height="16"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <span className="cal-month-label">{MONTH_NAMES[mo]} {yr}</span>
                <button className="cal-nav-btn" onClick={() => setMonth(new Date(yr, mo + 1, 1))}>
                    <svg {...iconProps} width="16" height="16"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
            </div>

            <div className="cal-weekdays">
                {DAY_NAMES.map(d => <div key={d} className="cal-weekday">{d}</div>)}
            </div>

            <div className="cal-grid">
                {cells.map((day, i) => {
                    if (!day) return <div key={'e' + i} className="cal-cell cal-empty" />;
                    const ds = yr + '-' + String(mo + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
                    const info = dateMap[ds];
                    const isT = ds === today;
                    return (
                        <div key={ds}
                            className={'cal-cell' + (isT ? ' cal-today' : '') + (info ? ' cal-has-task' : '')}
                            onClick={() => info && setTooltip(tooltip === ds ? null : ds)}
                        >
                            <span className={'cal-day-num' + (isT ? ' cal-today-num' : '')}>{day}</span>
                            {info && (
                                <div className="cal-dots">
                                    {info.slice(0, 2).map((item, di) => (
                                        <div key={di} className="cal-dot"
                                            style={{ background: STEP_COLORS[item.index % STEP_COLORS.length] }} />
                                    ))}
                                </div>
                            )}
                            {info && tooltip === ds && (
                                <div className="cal-tooltip">
                                    {info.map((item, ti) => (
                                        <div key={ti} className="cal-tooltip-item">
                                            <div className="cal-tooltip-dot"
                                                style={{ background: STEP_COLORS[item.index % STEP_COLORS.length] }} />
                                            <span>Step {item.index + 1}: {item.step.text.slice(0, 40)}{item.step.text.length > 40 ? '…' : ''}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="cal-legend-title">Task Schedule</div>
            <div className="cal-legend">
                {steps.map((step, i) => {
                    let cur = startDate ? new Date(startDate) : new Date();
                    cur.setHours(0, 0, 0, 0);
                    for (let j = 0; j < i; j++) cur.setDate(cur.getDate() + (steps[j].estimatedDays || 1));
                    const ds = getLocalYMD(cur);
                    const end = new Date(cur);
                    end.setDate(end.getDate() + (step.estimatedDays || 1) - 1);
                    const endDs = getLocalYMD(end);
                    return (
                        <div key={i} className={'cal-legend-row' + (step.done ? ' cal-legend-done' : '')}>
                            <div className="cal-legend-color" style={{ background: STEP_COLORS[i % STEP_COLORS.length] }} />
                            <div className="cal-legend-body">
                                <div className="cal-legend-step">Step {i + 1}: {step.text}</div>
                                <div className="cal-legend-dates">
                                    {ds === endDs ? ds : ds + ' → ' + endDs}
                                    {' · '}{step.estimatedDays} day{step.estimatedDays > 1 ? 's' : ''}
                                    {step.done && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', marginLeft: '4px' }}><svg {...iconProps} width="12" height="12"><polyline points="20 6 9 17 4 12" /></svg> Done</span>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const JourneyModal = ({ goal, onClose, onToggleStep }) => {
    const [tab, setTab] = useState('roadmap');
    const [expandedIdx, setExpanded] = useState(null);
    if (!goal) return null;

    const steps = goal.steps || [];

    const RESOURCE_STYLE = {
        article: { icon: <svg {...iconProps} width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>, color: '#3b82f6', label: 'Article' },
        video: { icon: <svg {...iconProps} width="16" height="16"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg>, color: '#FF5A5A', label: 'YouTube' },
        website: { icon: <svg {...iconProps} width="16" height="16"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>, color: '#10b981', label: 'Website' },
    };

    return (
        <div className="journey-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="journey-modal">

                <div className="journey-header">
                    <div className="journey-header-left">
                        <div className="journey-header-sub" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg {...iconProps} width="14" height="14" color="var(--orange)"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                            AI-Powered Goal Journey
                        </div>
                        <div className="journey-header-title">{goal.title}</div>
                    </div>
                    <button className="journey-close" onClick={onClose}><svg {...iconProps}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                </div>

                <div className="journey-stats-row">
                    <div className="journey-ring-wrap">
                        <svg width="84" height="84" viewBox="0 0 84 84">
                            <circle cx="42" cy="42" r="35" fill="none" stroke="var(--border)" strokeWidth="6" />
                            <circle cx="42" cy="42" r="35" fill="none"
                                stroke={goal.status === 'done' ? '#10b981' : goal.status === 'in-progress' ? '#FFA95A' : '#94a3b8'}
                                strokeWidth="6"
                                strokeDasharray={2 * Math.PI * 35}
                                strokeDashoffset={2 * Math.PI * 35 * (1 - goal.progress / 100)}
                                strokeLinecap="round" transform="rotate(-90 42 42)"
                                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                            />
                            <text x="42" y="39" textAnchor="middle" dominantBaseline="central"
                                fontSize="14" fontWeight="800"
                                fill={goal.status === 'done' ? '#10b981' : goal.status === 'in-progress' ? '#FFA95A' : '#94a3b8'}>
                                {goal.progress}%
                            </text>
                            <text x="42" y="53" textAnchor="middle" fontSize="8" fill="var(--text-muted)">complete</text>
                        </svg>
                    </div>
                    <div className="journey-meta-grid">
                        <div className="journey-meta-box">
                            <div className="journey-meta-label">Status</div>
                            <div className="journey-meta-value" style={{ color: STATUS_CONFIG[goal.status]?.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {STATUS_CONFIG[goal.status]?.icon}
                                {STATUS_CONFIG[goal.status]?.label}
                            </div>
                        </div>
                        <div className="journey-meta-box">
                            <div className="journey-meta-label">Priority</div>
                            <div className="journey-meta-value" style={{ color: PRIORITY_CONFIG[goal.priority]?.color }}>
                                {PRIORITY_CONFIG[goal.priority]?.label}
                            </div>
                        </div>
                        <div className="journey-meta-box">
                            <div className="journey-meta-label">Steps Done</div>
                            <div className="journey-meta-value">
                                {steps.filter(s => s.done).length} / {steps.length}
                            </div>
                        </div>
                        <div className="journey-meta-box">
                            <div className="journey-meta-label">Deadline</div>
                            <div className="journey-meta-value" style={{ fontSize: '0.82rem' }}>
                                {goal.deadline
                                    ? new Date(goal.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                    : goal.aiDeadline
                                        ? new Date(goal.aiDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' (AI)'
                                        : 'No deadline'}
                            </div>
                        </div>
                    </div>
                </div>

                {goal.aiDeadlineReason && (
                    <div className="ai-deadline-banner">
                        <span className="ai-deadline-icon"><svg {...iconProps} width="16" height="16"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></svg></span>
                        <span className="ai-deadline-text">{goal.aiDeadlineReason}</span>
                    </div>
                )}

                {goal.description && <p className="journey-desc">{goal.description}</p>}

                <div className="journey-tabs">
                    <button className={'journey-tab' + (tab === 'roadmap' ? ' active' : '')} onClick={() => setTab('roadmap')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg {...iconProps} width="16" height="16"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></svg> Roadmap
                    </button>
                    <button className={'journey-tab' + (tab === 'calendar' ? ' active' : '')} onClick={() => setTab('calendar')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg {...iconProps} width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> Schedule
                    </button>
                </div>

                {tab === 'roadmap' && (
                    <div className="journey-track">
                        {steps.map((step, i) => {
                            const isLast = i === steps.length - 1;
                            const prevDone = i === 0 || steps[i - 1].done;
                            const locked = !prevDone && !step.done;
                            const expanded = expandedIdx === i;
                            const rs = step.resources || [];

                            return (
                                <div key={i} className="train-stop">
                                    {!isLast && <div className={'train-line' + (step.done ? ' done' : '')} />}

                                    <div className={'train-dot' + (step.done ? ' done' : locked ? ' locked' : ' active')}
                                        onClick={() => !locked && onToggleStep(goal, i)}>
                                        {step.done ? <svg {...iconProps} width="12" height="12"><polyline points="20 6 9 17 4 12" /></svg> : i + 1}
                                    </div>

                                    <div className={'train-content' + (step.done ? ' done' : locked ? ' locked' : '') + (expanded ? ' expanded' : '')}>
                                        <div className="train-step-header" onClick={() => setExpanded(expanded ? null : i)}>
                                            <div className="train-step-header-left">
                                                <div className="train-step-text">{step.text}</div>
                                                <div className="train-step-meta-row">
                                                    {step.estimatedDays > 0 && (
                                                        <span className="step-time-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <svg {...iconProps} width="12" height="12"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> ~{step.estimatedDays} day{step.estimatedDays > 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                    <span className={'train-step-status' + (step.done ? ' done-status' : locked ? ' locked-status' : '')}>
                                                        {step.done ? <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg {...iconProps} width="12" height="12"><polyline points="20 6 9 17 4 12" /></svg> Completed</span>
                                                            : locked ? <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg {...iconProps} width="12" height="12"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> Complete previous step first</span>
                                                                : <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg {...iconProps} width="12" height="12"><circle cx="12" cy="12" r="10" /></svg> Tap dot or button to mark done</span>}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="train-step-header-right">
                                                {rs.length > 0 && (
                                                    <span className="resources-badge">{rs.length} resources</span>
                                                )}
                                                <span className="expand-chevron">
                                                    {expanded ? <svg {...iconProps} width="16" height="16"><polyline points="18 15 12 9 6 15" /></svg> : <svg {...iconProps} width="16" height="16"><polyline points="6 9 12 15 18 9" /></svg>}
                                                </span>
                                            </div>
                                        </div>

                                        {expanded && (
                                            <div className="step-expanded">
                                                {rs.length > 0 ? (
                                                    <div className="step-resources-section">
                                                        <div className="step-resources-heading" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <svg {...iconProps} width="16" height="16"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg> Learning Resources
                                                        </div>
                                                        <div className="step-resources-list">
                                                            {rs.map((r, ri) => {
                                                                const rs_style = RESOURCE_STYLE[r.type] || RESOURCE_STYLE.website;
                                                                return (
                                                                    <a key={ri} href={r.url} target="_blank" rel="noopener noreferrer" className="resource-link-card">
                                                                        <div className="resource-link-icon" style={{ background: rs_style.color + '18', color: rs_style.color }}>
                                                                            {rs_style.icon}
                                                                        </div>
                                                                        <div className="resource-link-body">
                                                                            <div className="resource-link-title">{r.title}</div>
                                                                            <div className="resource-link-type" style={{ color: rs_style.color }}>{rs_style.label}</div>
                                                                        </div>
                                                                        <div className="resource-link-arrow"><svg {...iconProps} width="16" height="16"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></div>
                                                                    </a>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="step-no-resources">
                                                        No resources yet — regenerate with AI to get articles and YouTube links
                                                    </div>
                                                )}

                                                {!step.done && !locked && (
                                                    <button className="step-complete-btn" onClick={() => { onToggleStep(goal, i); setExpanded(null); }}>
                                                        <svg {...iconProps} width="16" height="16"><polyline points="20 6 9 17 4 12" /></svg> Mark Step {i + 1} as Complete
                                                    </button>
                                                )}
                                                {step.done && (
                                                    <button className="step-undo-btn" onClick={() => { onToggleStep(goal, i); }}>
                                                        <svg {...iconProps} width="16" height="16"><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg> Undo — Mark as Incomplete
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        <div className="train-destination">
                            <div className={'train-dest-icon' + (goal.status === 'done' ? ' reached' : '')}>
                                {goal.status === 'done' ? <svg {...iconProps}><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg> : <svg {...iconProps}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>}
                            </div>
                            <div className="train-dest-text">
                                {goal.status === 'done' ? 'Goal Achieved! Congratulations!' : 'Destination: ' + goal.title}
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'calendar' && (
                    <div className="journey-calendar-wrap">
                        {steps.some(s => s.estimatedDays > 0) ? (
                            <GoalCalendar steps={steps} startDate={goal.startDate || getLocalYMD()} />
                        ) : (
                            <div className="calendar-empty-state">
                                <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                                    <svg {...iconProps} width="48" height="48" strokeWidth="1"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                </div>
                                <p>Regenerate your roadmap with AI to get a visual schedule with dates assigned to each step.</p>
                            </div>
                        )}
                    </div>
                )}

                {goal.status === 'done' && (
                    <div className="journey-completed-banner">
                        <svg {...iconProps} width="20" height="20" style={{ marginRight: '8px' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg> Congratulations! You completed this goal!
                    </div>
                )}
            </div>
        </div>
    );
};

const Goals = () => {
    const [goals, setGoals] = useState([]);
    const { refreshUser } = useContext(AuthContext);
    const { announce } = useAchievementUnlock();
    const [loading, setLoading] = useState(true);
    const [addModal, setAddModal] = useState(false);
    const [editGoal, setEditGoal] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [aiError, setAiError] = useState('');
    const [pendingAI, setPendingAI] = useState(null);
    const [journeyGoal, setJourneyGoal] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [filter, setFilter] = useState('all');

    // One-time upgrade path: if a goal has no DB-backed steps yet but has old
    // localStorage data, push that data up to the DB once, then it's done —
    // every future load reads from the DB and localStorage is never touched again.
    const migrateLegacyGoal = async (goal) => {
        if (goal.steps && goal.steps.length > 0) return null; // already DB-backed

        const localSteps = getLegacySteps(goal._id);
        const localMeta = getLegacyMeta(goal._id);
        if (!localSteps && !localMeta) return null; // nothing to migrate

        const payload = {
            startDate: localMeta?.startDate || (goal.createdAt ? getLocalYMD(new Date(goal.createdAt)) : getLocalYMD()),
        };
        if (localSteps && localSteps.length) payload.steps = localSteps;
        if (localMeta?.aiDeadline) payload.aiDeadline = localMeta.aiDeadline;
        if (localMeta?.aiDeadlineReason) payload.aiDeadlineReason = localMeta.aiDeadlineReason;

        try {
            const { data } = await goalAPI.update(goal._id, payload);
            localStorage.removeItem('sp_steps_' + goal._id);
            localStorage.removeItem('sp_meta_' + goal._id);
            return data.goal;
        } catch {
            return null; // leave localStorage alone — retry migration next load
        }
    };

    const fetchGoals = async () => {
        try {
            const { data } = await goalAPI.getAll();
            const migrated = await Promise.all(data.goals.map(async g => (await migrateLegacyGoal(g)) || g));
            const enriched = migrated.map(g => ({
                ...g,
                steps: (g.steps && g.steps.length > 0) ? g.steps : defaultSteps(g),
                startDate: g.startDate || (g.createdAt ? getLocalYMD(new Date(g.createdAt)) : getLocalYMD()),
            }));
            setGoals(enriched);
        } catch { toast.error('Failed to load goals'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchGoals(); }, []);

    const openAdd = () => {
        setEditGoal(null); setForm(emptyForm);
        setAiError(''); setPendingAI(null); setAddModal(true);
    };

    const openEdit = (goal, e) => {
        e.stopPropagation();
        setEditGoal(goal);
        setForm({
            title: goal.title,
            description: goal.description || '',
            linkedSkill: goal.linkedSkill || '',
            priority: goal.priority,
            deadline: goal.deadline ? goal.deadline.slice(0, 10) : '',
            steps: (goal.steps || []).map(s => typeof s === 'string' ? { text: s, estimatedDays: 1 } : { text: s.text, estimatedDays: s.estimatedDays || 1 }),
        });
        setAiError(''); setPendingAI(null); setAddModal(true);
    };

    const handleGenerateAI = async () => {
        if (!form.title.trim()) { toast.error('Enter a goal title first'); return; }
        setGenerating(true); setAiError(''); setPendingAI(null);
        try {
            const result = await generateRoadmap(form.title, form.linkedSkill, form.priority, form.description, form.deadline);
            setPendingAI(result);
            setForm(f => ({ ...f, steps: result.steps.map(s => ({ text: s.text, estimatedDays: s.estimatedDays || 1 })), deadline: f.deadline || result.suggestedDeadline }));
            toast.success(`AI roadmap ready — ${result.steps.length} steps with resources!`);
        } catch (err) {
            setAiError('AI failed: ' + (err.message || 'Please try again in a moment'));
        } finally { setGenerating(false); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) { toast.error('Title is required'); return; }
        const cleanSteps = form.steps.filter(s => String(s.text).trim() !== '');
        if (!cleanSteps.length) { toast.error('Add at least one step'); return; }
        setSaving(true);

        const aiSteps = pendingAI?.steps || [];
        const richSteps = cleanSteps.map((s, i) => {
            const ai = aiSteps.find(a => a.text === s.text) || aiSteps[i];
            const old = editGoal?.steps?.[i];
            return {
                text: s.text,
                estimatedDays: Number(s.estimatedDays) || 1, // the user's edited value always wins now
                resources: ai?.resources || old?.resources || [],
                done: old?.done || false,
            };
        });

        const metaPayload = pendingAI
            ? { aiDeadline: pendingAI.suggestedDeadline, aiDeadlineReason: pendingAI.deadlineReason }
            : {};

        try {
            if (editGoal) {
                // No startDate here on purpose — leaving it out of the payload
                // means Mongoose doesn't touch the existing stored value.
                const { data } = await goalAPI.update(editGoal._id, {
                    title: form.title, description: form.description, linkedSkill: form.linkedSkill,
                    priority: form.priority, deadline: form.deadline || null,
                    steps: richSteps, ...metaPayload,
                });
                if (data.newAchievements?.length) announce(data.newAchievements);
                if (data.newAchievements?.length) refreshUser();
                toast.success('Goal updated!');
            } else {
                const { data } = await goalAPI.create({
                    title: form.title, description: form.description, linkedSkill: form.linkedSkill,
                    priority: form.priority, deadline: form.deadline || null, status: 'todo', progress: 0,
                    steps: richSteps, startDate: getLocalYMD(), ...metaPayload,
                });
                if (data.newAchievements?.length) announce(data.newAchievements);
                if (data.newAchievements?.length) refreshUser();
                toast.success('Goal created!');
            }
            setAddModal(false); setPendingAI(null); fetchGoals();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        try {
            await goalAPI.delete(id);
            localStorage.removeItem('sp_steps_' + id);
            localStorage.removeItem('sp_meta_' + id);
            if (journeyGoal?._id === id) setJourneyGoal(null);
            toast.success('Goal deleted'); fetchGoals();
        } catch { toast.error('Failed to delete'); }
        setDeleteId(null);
    };

    const toggleStep = async (goal, idx) => {
        const steps = goal.steps || [];
        if (idx > 0 && !steps[idx - 1].done && !steps[idx].done) {
            toast.error('Complete the previous step first!'); return;
        }
        const updated = steps.map((s, i) => i === idx ? { ...s, done: !s.done } : s);
        const { status, progress } = calcFromSteps(updated);
        try {
            const { data } = await goalAPI.update(goal._id, { steps: updated, status, progress });
            if (status === 'done') toast.success('Goal completed! Well done!');
            if (data.newAchievements?.length) announce(data.newAchievements);
            if (data.newAchievements?.length) refreshUser();
        } catch {
            toast.error('Failed to save progress — please try again');
            return; // don't update local state on failure, to avoid drifting from the DB
        }
        const next = { ...goal, steps: updated, status, progress };
        setGoals(prev => prev.map(g => g._id === goal._id ? next : g));
        if (journeyGoal?._id === goal._id) setJourneyGoal(next);
    };

    const daysUntil = d => !d ? null : Math.ceil((new Date(d) - new Date()) / 86400000);
    const formatDate = d => !d ? null : new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    const filtered = goals.filter(g => filter === 'all' || g.status === filter);
    const stats = {
        total: goals.length,
        todo: goals.filter(g => g.status === 'todo').length,
        ip: goals.filter(g => g.status === 'in-progress').length,
        done: goals.filter(g => g.status === 'done').length,
    };

    if (loading) return <GoalsSkeleton />;

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Goal Tracker</h1>
                    <p className="page-subtitle">AI roadmaps with resources, smart deadlines and visual schedule</p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>
                    <svg {...iconProps}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> Add Goal
                </button>
            </div>

            <div className="goals-stats">
                {[
                    { icon: <svg {...iconProps}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>, bg: '#fff0f0', color: '#FF5A5A', value: stats.total, label: 'Total Goals', f: 'all' },
                    { icon: <svg {...iconProps}><circle cx="12" cy="12" r="10" /></svg>, bg: '#f8fafc', color: '#94a3b8', value: stats.todo, label: 'To Do', f: 'todo' },
                    { icon: <svg {...iconProps}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>, bg: '#fff8ee', color: '#FFA95A', value: stats.ip, label: 'In Progress', f: 'in-progress' },
                    { icon: <svg {...iconProps}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>, bg: '#ecfdf5', color: '#10b981', value: stats.done, label: 'Completed', f: 'done' },
                ].map(s => (
                    <div key={s.f} className={'goal-stat-card' + (filter === s.f ? ' active-stat' : '')} onClick={() => setFilter(s.f)}>
                        <div className="goal-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                        <div>
                            <div className="goal-stat-value">{s.value}</div>
                            <div className="goal-stat-label">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {goals.length === 0 && (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon"><svg {...iconProps} width="40" height="40"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg></div>
                        <h3>No goals yet</h3>
                        <p>Add a goal — Gemini AI will generate a personalized roadmap with resources and a visual schedule</p>
                        <button className="btn btn-primary mt-2" onClick={openAdd}>+ Add First Goal</button>
                    </div>
                </div>
            )}

            {filtered.length > 0 && (
                <div className="goals-grid">
                    {filtered.map(goal => {
                        const pr = PRIORITY_CONFIG[goal.priority];
                        const sc = STATUS_CONFIG[goal.status];
                        const days = daysUntil(goal.deadline);
                        const overdue = days !== null && days < 0 && goal.status !== 'done';
                        const doneS = (goal.steps || []).filter(s => s.done).length;
                        const totalS = (goal.steps || []).length;
                        const hasRes = (goal.steps || []).some(s => s.resources && s.resources.length > 0);
                        return (
                            <div key={goal._id} className={'goal-card-new' + (goal.status === 'done' ? ' done' : '')} onClick={() => setJourneyGoal(goal)}>
                                <div className="goal-card-bar" style={{ background: pr.color }} />
                                <div className="goal-card-inner">
                                    <div className="goal-card-head">
                                        <div className="goal-card-name">{goal.title}</div>
                                        <div className="goal-card-actions">
                                            {hasRes && <span className="goal-ai-tag" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg {...iconProps} width="12" height="12"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg> AI</span>}
                                            <button className="goal-icon-btn edit" onClick={e => openEdit(goal, e)}>
                                                <svg {...iconProps} width="14" height="14"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                                            </button>
                                            <button className="goal-icon-btn del" onClick={e => { e.stopPropagation(); setDeleteId(goal._id); }}>
                                                <svg {...iconProps} width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="goal-card-badges">
                                        <span className="goal-badge" style={{ background: sc.bg, color: sc.color, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            {sc.icon} {sc.label}
                                        </span>
                                        <span className="goal-badge" style={{ background: pr.bg, color: pr.color }}>{pr.label} Priority</span>
                                        {goal.linkedSkill && (
                                            <span className="goal-badge" style={{ background: 'var(--primary-bg)', color: 'var(--orange)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                <svg {...iconProps} width="12" height="12"><polygon points="12 2 2 7 2 17 12 22 22 17 22 7 12 2" /></svg> {goal.linkedSkill}
                                            </span>
                                        )}
                                    </div>
                                    {goal.description && <p className="goal-card-note">{goal.description}</p>}
                                    <div className="goal-steps-mini">
                                        <div className="goal-steps-mini-top">
                                            <span>Steps completed</span>
                                            <span style={{ fontWeight: 700, color: 'var(--orange)' }}>{doneS}/{totalS}</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: totalS > 0 ? (doneS / totalS * 100) + '%' : '0%' }} />
                                        </div>
                                    </div>
                                    {goal.deadline && (
                                        <div className={'goal-deadline-tag' + (overdue ? ' overdue' : days !== null && days <= 3 ? ' urgent' : '')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                            {goal.status === 'done' ? <><svg {...iconProps} width="14" height="14"><polyline points="20 6 9 17 4 12" /></svg> Completed</>
                                                : overdue ? <><svg {...iconProps} width="14" height="14"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> Overdue by {Math.abs(days)}d</>
                                                    : days === 0 ? <><svg {...iconProps} width="14" height="14"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg> Due today!</>
                                                        : days <= 3 ? <><svg {...iconProps} width="14" height="14"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg> {days}d left</>
                                                            : <><svg {...iconProps} width="14" height="14"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> {formatDate(goal.deadline)}</>}
                                        </div>
                                    )}
                                    <div className="goal-card-footer">
                                        <span className="goal-click-hint">Click to view journey &rarr;</span>
                                        <span className="goal-progress-pct">{goal.progress}%</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {filtered.length === 0 && goals.length > 0 && (
                <div className="card"><div className="empty-state">
                    <div className="empty-state-icon"><svg {...iconProps} width="40" height="40"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg></div>
                    <h3>No goals in this category</h3>
                    <p>Try a different filter above</p>
                </div></div>
            )}

            <JourneyModal goal={journeyGoal} onClose={() => setJourneyGoal(null)} onToggleStep={toggleStep} />

            <Modal isOpen={addModal} onClose={() => setAddModal(false)} title={editGoal ? 'Edit Goal' : 'Create New Goal'}
                footer={
                    <>
                        <button className="btn btn-ghost" onClick={() => setAddModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.title.trim()}>
                            {saving ? 'Saving…' : editGoal ? 'Save Changes' : 'Create Goal'}
                        </button>
                    </>
                }>
                <form onSubmit={handleSave}>
                    <div className="form-group">
                        <label className="form-label">Goal Title</label>
                        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Learn MERN Stack…" required autoFocus />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description (optional)</label>
                        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What does success look like?" rows={2} style={{ resize: 'vertical' }} />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Priority</label>
                            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Linked Skill</label>
                            <input value={form.linkedSkill} onChange={e => setForm({ ...form, linkedSkill: e.target.value })} placeholder="e.g. React, Python…" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">
                            Deadline <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.4rem', fontSize: '0.8rem' }}>(optional — AI suggests one if left blank)</span>
                        </label>
                        <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} min={new Date().toISOString().slice(0, 10)} />
                    </div>

                    <div className="ai-generate-section">
                        <div className="ai-section-header">
                            <div className="ai-section-icon">
                                <svg {...iconProps} width="24" height="24"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                            </div>
                            <div>
                                <div className="ai-section-title">Gemini AI Roadmap Generator</div>
                                <div className="ai-section-sub">Creates personalized steps with articles, YouTube tutorials, and a visual calendar schedule</div>
                            </div>
                        </div>
                        {pendingAI && (
                            <div className="ai-success-banner" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <svg {...iconProps} width="16" height="16"><polyline points="20 6 9 17 4 12" /></svg> AI generated {pendingAI.steps.length} steps
                                {pendingAI.deadlineReason && ' & timeline'}
                            </div>
                        )}
                        <button type="button" className={'ai-generate-btn' + (generating ? ' ai-loading' : '')} onClick={handleGenerateAI} disabled={generating || !form.title.trim()}>
                            {generating ? <><span className="ai-spin-dot" />Generating your roadmap…</> : pendingAI ? '↻ Regenerate AI Roadmap' : '✨ Generate AI Roadmap'}
                        </button>
                        {aiError && <div className="ai-error-msg">{aiError}</div>}
                    </div>

                    <div className="form-group">
                        <div className="steps-label-row">
                            <label className="form-label" style={{ margin: 0 }}>Journey Steps</label>
                            <span className="steps-count-pill">{form.steps.filter(s => String(s.text).trim()).length} steps</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.3rem 0 0.75rem' }}>Progress auto-calculates as you tick steps. Set how many days each step should take — this drives the Schedule calendar.</p>
                        {form.steps.map((step, i) => (
                            <div key={i} className="step-row">
                                <div className="step-row-num" style={{ background: STEP_COLORS[i % STEP_COLORS.length] }}>{i + 1}</div>
                                <input
                                    value={step.text}
                                    onChange={e => { const u = [...form.steps]; u[i] = { ...u[i], text: e.target.value }; setForm({ ...form, steps: u }); }}
                                    placeholder={'Step ' + (i + 1) + '…'}
                                />
                                <div className="step-row-days" title="Days for this step">
                                    <input
                                        type="number" min="1" max="60"
                                        value={step.estimatedDays}
                                        onChange={e => {
                                            const v = Math.max(1, Math.min(60, Number(e.target.value) || 1));
                                            const u = [...form.steps]; u[i] = { ...u[i], estimatedDays: v };
                                            setForm({ ...form, steps: u });
                                        }}
                                        className="step-row-days-input"
                                    />
                                    <span className="step-row-days-label">day{step.estimatedDays !== 1 ? 's' : ''}</span>
                                </div>
                                {form.steps.length > 1 && (
                                    <button type="button" className="step-row-remove" onClick={() => setForm({ ...form, steps: form.steps.filter((_, j) => j !== i) })}>
                                        <svg {...iconProps} width="14" height="14"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                    </button>
                                )}
                            </div>
                        ))}
                        <button type="button" className="step-add-btn" onClick={() => setForm({ ...form, steps: [...form.steps, { text: '', estimatedDays: 1 }] })}>
                            <svg {...iconProps} width="16" height="16" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> Add Step Manually
                        </button>
                    </div>
                </form>
            </Modal>

            {deleteId && (
                <div className="journey-overlay" onClick={() => setDeleteId(null)}>
                    <div className="delete-confirm-card" onClick={e => e.stopPropagation()}>
                        <div className="delete-confirm-icon">
                            <svg {...iconProps} width="32" height="32" stroke="var(--red)"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                        </div>
                        <h3>Delete this goal?</h3>
                        <p>All steps and AI roadmap data will be permanently deleted.</p>
                        <div className="delete-confirm-btns">
                            <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
                            <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Goals;