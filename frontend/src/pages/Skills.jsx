import { useEffect, useState } from 'react';
import { Radar } from 'react-chartjs-2';
import {
    Chart as ChartJS, RadialLinearScale, PointElement,
    LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { skillAPI } from '../services/api';
import { levelLabel, levelColor } from '../utils/helpers';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import { useAchievementUnlock } from '../context/AchievementUnlockContext';
import toast from 'react-hot-toast';
import './Skills.css';
import SkillsSkeleton from '../components/skills/SkillsSkeleton';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const iconProps = { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };

const CATEGORIES = ['Frontend', 'Backend', 'Database', 'DevOps', 'Mobile', 'Design', 'Data Science', 'Soft Skills', 'Other'];

const LEVELS = [
    { value: 1, label: 'Beginner', desc: 'Just starting out', color: '#94a3b8' },
    { value: 2, label: 'Elementary', desc: 'Basic understanding', color: '#FF5A5A' },
    { value: 3, label: 'Intermediate', desc: 'Can work independently', color: '#FF8B5A' },
    { value: 4, label: 'Advanced', desc: 'Strong expertise', color: '#FFA95A' },
    { value: 5, label: 'Expert', desc: 'Can teach & lead', color: '#FFD45A' },
];

const levelToColor = (avg) => {
    const rounded = Math.min(5, Math.max(1, Math.round(avg || 1)));
    return LEVELS[rounded - 1].color;
};

const emptyForm = { name: '', category: 'Frontend', level: 3, notes: '' };

const Skills = () => {
    const [skills, setSkills] = useState([]);
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editSkill, setEditSkill] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [filterCat, setFilterCat] = useState('All');
    const [view, setView] = useState('grid');
    const [search, setSearch] = useState('');
    const [inputMode, setInputMode] = useState('preset');
    const [presetSkills, setPresetSkills] = useState({});
    const [showRadarInfo, setShowRadarInfo] = useState(false);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 640);

    const { announce } = useAchievementUnlock();
    const { refreshUser } = useContext(AuthContext);

    const fetchSkills = async () => {
        try {
            const [s, st] = await Promise.all([skillAPI.getAll(), skillAPI.getStats()]);
            setSkills(s.data.skills);
            setStats(st.data.stats);
        } catch { toast.error('Failed to load skills'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchSkills(); }, []);

    const [presetsLoaded, setPresetsLoaded] = useState(false);

    useEffect(() => {
        skillAPI.getPresets()
            .then(({ data }) => setPresetSkills(data.presets || {}))
            .catch((err) => console.error('Failed to load skill presets:', err.message))
            .finally(() => setPresetsLoaded(true));
    }, []);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const openAdd = () => {
        setEditSkill(null);
        setForm(emptyForm);
        setSearch('');
        setInputMode('preset');
        setModalOpen(true);
    };

    const openEdit = (skill) => {
        setEditSkill(skill);
        setForm({ name: skill.name, category: skill.category, level: skill.level, notes: skill.notes || '' });
        setInputMode('manual');
        setModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { toast.error('Please enter a skill name'); return; }
        setSaving(true);
        try {
            if (editSkill) {
                const { data } = await skillAPI.update(editSkill._id, form);
                setSkills(prev => prev.map(s => s._id === editSkill._id ? data.skill : s));
                toast.success('Skill updated!');
                if (data.newAchievements?.length) announce(data.newAchievements);
                if (data.newAchievements?.length) refreshUser();
            } else {
                const { data } = await skillAPI.add(form);
                setSkills(prev => [data.skill, ...prev]);
                toast.success('Skill added!');
                if (data.newAchievements?.length) announce(data.newAchievements);
                if (data.newAchievements?.length) refreshUser();
            }
            setModalOpen(false);
            skillAPI.getStats().then(r => setStats(r.data.stats));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save');
        } finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this skill?')) return;
        try {
            await skillAPI.delete(id);
            setSkills(prev => prev.filter(s => s._id !== id));
            skillAPI.getStats().then(r => setStats(r.data.stats));
            toast.success('Skill deleted');
        } catch { toast.error('Failed to delete'); }
    };

    const selectPreset = (name) => {
        setForm(f => ({ ...f, name }));
        setInputMode('manual');
    };

    const filtered = filterCat === 'All'
        ? skills
        : skills.filter(s => s.category === filterCat);

    const presetsForCategory = (presetSkills[form.category] || [])
        .filter(p => !skills.find(s => s.name.toLowerCase() === p.toLowerCase()))
        .filter(p => search === '' || p.toLowerCase().includes(search.toLowerCase()));

    const radarData = {
        labels: stats.map(s => s._id),
        datasets: [{
            label: 'Avg Level',
            data: stats.map(s => Math.round(s.avgLevel * 10) / 10),
            backgroundColor: 'rgba(255,139,90,0.15)',
            borderColor: '#FF8B5A',
            pointBackgroundColor: '#FF5A5A',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            borderWidth: 2,
        }],
    };

    const radarOptions = {
        layout: {
            padding: { top: 8, bottom: 8, left: 14, right: 14 }
        },
        scales: {
            r: {
                min: 0, max: 5,
                ticks: { stepSize: 1, font: { size: isMobile ? 9 : 11 }, backdropColor: 'transparent' },
                pointLabels: {
                    font: { size: isMobile ? 10 : 12, weight: '600' },
                    color: (ctx) => levelToColor(stats[ctx.index]?.avgLevel),
                },
                grid: { lineWidth: 1.9, color: 'rgba(255,139,90,0.39)' },
                angleLines: { lineWidth: 1.5, color: 'rgba(255,139,90,0.2)' },
            },
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1e293b',
                padding: 10,
                cornerRadius: 6,
                titleFont: { weight: '700' },
                bodyFont: { size: 12 },
                callbacks: {
                    title: (items) => items[0]?.label || '',
                    label: (item) => {
                        const stat = stats[item.dataIndex];
                        const avg = Math.round((stat?.avgLevel || 0) * 10) / 10;
                        const count = stat?.count || 0;
                        return `Avg Level: ${avg}/5 · ${count} skill${count !== 1 ? 's' : ''}`;
                    },
                },
            },
        },
        elements: {
            point: { hitRadius: 14, hoverRadius: 7 },
        },
        responsive: true,
        maintainAspectRatio: false,
    };

    if (loading) return <SkillsSkeleton />;

    return (
        <div className="page-content">

            <div className="page-header">
                <div>
                    <h1 className="page-title">Skill Map</h1>
                    <p className="page-subtitle">{skills.length} skill{skills.length !== 1 ? 's' : ''} across {stats.length} categories</p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>
                    <svg {...iconProps}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> Add Skill
                </button>
            </div>

            <div className="skills-top">
                <div className="card skills-radar-card">
                    <div className="card-header">
                        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Skills Radar
                            <span className="radar-info-wrap">
                                <button
                                    type="button"
                                    className="radar-info-btn"
                                    onClick={() => setShowRadarInfo(v => !v)}
                                    aria-label="How the Skill Radar works"
                                >
                                    <svg {...iconProps} width="14" height="14"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                                </button>
                                {showRadarInfo && (
                                    <>
                                        <div className="radar-info-backdrop" onClick={() => setShowRadarInfo(false)} />
                                        <div className="radar-info-popover">
                                            <div className="radar-info-title">How the Skill Radar works</div>
                                            <div className="radar-info-text">
                                                Each axis is a skill category. The further a point sits from the centre, the higher your average proficiency there (scale 1–5). A larger shape means broader expertise.
                                            </div>
                                        </div>
                                    </>
                                )}
                            </span>
                        </span>
                        <span className="badge badge-primary">{skills.length} total</span>
                    </div>
                    {stats.length >= 3
                        ? (
                            <>
                                <div className="radar-wrap"><Radar data={radarData} options={radarOptions} /></div>
                                <div className="radar-caption">Scale: 1 (Beginner) – 5 (Expert) · Tap a point for exact values</div>
                            </>
                        )
                        : <div className="empty-state">
                            <div className="empty-state-icon"><svg {...iconProps} width="40" height="40"><polygon points="12 2 2 7 2 17 12 22 22 17 22 7 12 2" /></svg></div>
                            <h3>Add skills in 3+ categories</h3>
                            <p>Your radar chart appears once you have skills in at least 3 different categories</p>
                        </div>
                    }
                </div>

                <div className="card">
                    <div className="card-header"><span className="card-title">By Category</span></div>
                    {stats.length === 0
                        ? <div className="empty-state"><div className="empty-state-icon"><svg {...iconProps} width="40" height="40"><polygon points="12 2 2 7 2 17 12 22 22 17 22 7 12 2" /></svg></div><p>No skills yet — add some!</p></div>
                        : <div className="breakdown-list">
                            {stats.map(s => (
                                <div key={s._id} className="breakdown-row">
                                    <div className="breakdown-info">
                                        <span className="breakdown-cat">{s._id}</span>
                                        <span className="breakdown-count">{s.count} skill{s.count > 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="breakdown-bar-wrap">
                                        <div className="breakdown-bar">
                                            <div className="breakdown-fill" style={{ width: `${(s.avgLevel / 5) * 100}%` }} />
                                        </div>
                                        <span className="breakdown-level">{Math.round(s.avgLevel * 10) / 10}/5</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    }
                </div>
            </div>

            <div className="skills-filter-bar">
                <div className="filter-tabs">
                    {['All', ...CATEGORIES].map(cat => (
                        <button
                            key={cat}
                            className={`filter-tab${filterCat === cat ? ' active' : ''}`}
                            onClick={() => setFilterCat(cat)}
                        >
                            {cat}
                            {cat !== 'All' && skills.filter(s => s.category === cat).length > 0 &&
                                <span className="filter-count">{skills.filter(s => s.category === cat).length}</span>
                            }
                            {cat === 'All' && <span className="filter-count">{skills.length}</span>}
                        </button>
                    ))}
                </div>
                <div className="view-toggle">
                    <button className={`view-btn${view === 'grid' ? ' active' : ''}`} onClick={() => setView('grid')}>
                        <svg {...iconProps}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                    </button>
                    <button className={`view-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}>
                        <svg {...iconProps}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                    </button>
                </div>
            </div>

            {filtered.length === 0
                ? <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon"><svg {...iconProps} width="40" height="40"><polygon points="12 2 2 7 2 17 12 22 22 17 22 7 12 2" /></svg></div>
                        <h3>{filterCat === 'All' ? 'No skills yet' : `No ${filterCat} skills`}</h3>
                        <p>Add your first skill to start building your profile</p>
                        <button className="btn btn-primary mt-2" onClick={openAdd}>+ Add Skill</button>
                    </div>
                </div>
                : <div className={view === 'grid' ? 'skills-grid' : 'skills-list'}>
                    {filtered.map(skill => (
                        <div key={skill._id} className={`skill-card${view === 'list' ? ' skill-card-list' : ''}`}>
                            <div className="skill-card-top">
                                <div className="skill-name">{skill.name}</div>
                                <div className="skill-actions">
                                    <button className="skill-action-btn edit" onClick={() => openEdit(skill)}>
                                        <svg {...iconProps} width="14" height="14"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                                    </button>
                                    <button className="skill-action-btn delete" onClick={() => handleDelete(skill._id)}>
                                        <svg {...iconProps} width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                    </button>
                                </div>
                            </div>
                            <div className="skill-meta">
                                <span className="badge badge-primary">{skill.category}</span>
                                <span className={`badge ${levelColor(skill.level)}`}>{levelLabel(skill.level)}</span>
                            </div>
                            <div className="skill-level-row">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <div key={n} className={`level-dot${n <= skill.level ? ' filled' : ''}`}
                                        style={n <= skill.level ? { background: LEVELS[skill.level - 1].color } : {}}
                                    />
                                ))}
                                <span className="level-label-text">{levelLabel(skill.level)}</span>
                            </div>
                            {skill.notes && <p className="skill-notes">{skill.notes}</p>}
                        </div>
                    ))}
                </div>
            }

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editSkill ? `Edit — ${editSkill.name}` : 'Add New Skill'}
                footer={
                    <>
                        <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
                            {saving ? 'Saving…' : editSkill ? 'Save Changes' : 'Add Skill'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSave}>
                    <div className="form-group">
                        <label className="form-label">Category</label>
                        <select
                            value={form.category}
                            onChange={e => { setForm({ ...form, category: e.target.value, name: '' }); setSearch(''); setInputMode('preset'); }}
                        >
                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>

                    {!editSkill && (
                        <div className="input-mode-toggle">
                            <button type="button" className={`mode-btn${inputMode === 'preset' ? ' active' : ''}`} onClick={() => setInputMode('preset')}>
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    <svg {...iconProps}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg> Pick from list
                                </span>
                            </button>
                            <button type="button" className={`mode-btn${inputMode === 'manual' ? ' active' : ''}`} onClick={() => setInputMode('manual')}>
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    <svg {...iconProps}><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg> Type manually
                                </span>
                            </button>
                        </div>
                    )}

                    {inputMode === 'preset' && !editSkill && (
                        <div className="form-group">
                            <label className="form-label">Popular {form.category} Skills</label>
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={`Search ${form.category} skills…`}
                                style={{ marginBottom: '0.625rem' }}
                            />
                            <div className="preset-grid">
                                {presetsForCategory.length === 0
                                    ? <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.5rem' }}>
                                        {!presetsLoaded
                                            ? 'Loading presets…'
                                            : search
                                                ? 'No matches — try typing manually'
                                                : (presetSkills[form.category]?.length || 0) === 0
                                                    ? "Couldn't load presets — try typing manually"
                                                    : 'All skills in this category already added!'}
                                    </p>
                                    : presetsForCategory.map(name => (
                                        <button
                                            key={name}
                                            type="button"
                                            className={`preset-btn${form.name === name ? ' selected' : ''}`}
                                            onClick={() => selectPreset(name)}
                                        >
                                            {name}
                                        </button>
                                    ))
                                }
                            </div>
                            {form.name && (
                                <div className="selected-skill-preview">
                                    Selected: <strong>{form.name}</strong>
                                    <button type="button" onClick={() => setForm(f => ({ ...f, name: '' }))} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', marginLeft: '0.5rem', color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
                                        <svg {...iconProps} width="12" height="12"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> clear
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {(inputMode === 'manual' || editSkill) && (
                        <div className="form-group">
                            <label className="form-label">Skill Name</label>
                            <input
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g. React, Python, Figma…"
                                required
                                autoFocus
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Your Proficiency Level</label>
                        <div className="level-slider-wrap">
                            <input
                                type="range"
                                min="1" max="5" step="1"
                                value={form.level}
                                onChange={e => setForm({ ...form, level: Number(e.target.value) })}
                                className="level-slider"
                                style={{ '--fill': `${((form.level - 1) / 4) * 100}%` }}
                            />
                            <div className="level-slider-labels">
                                {LEVELS.map(l => (
                                    <span
                                        key={l.value}
                                        className={`slider-label${form.level === l.value ? ' active' : ''}`}
                                        style={form.level === l.value ? { color: l.color } : {}}
                                    >
                                        {l.label}
                                    </span>
                                ))}
                            </div>
                            <div className="level-slider-preview" style={{ borderColor: LEVELS[form.level - 1].color, background: LEVELS[form.level - 1].color + '15' }}>
                                <span className="level-preview-num" style={{ background: LEVELS[form.level - 1].color }}>{form.level}</span>
                                <div>
                                    <div className="level-preview-label" style={{ color: LEVELS[form.level - 1].color }}>{LEVELS[form.level - 1].label}</div>
                                    <div className="level-preview-desc">{LEVELS[form.level - 1].desc}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notes (optional)</label>
                        <textarea
                            value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                            placeholder="Any context, goals, or resources for this skill…"
                            rows={2}
                            style={{ resize: 'vertical' }}
                        />
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Skills;