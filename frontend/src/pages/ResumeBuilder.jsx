import { useState, useContext, useEffect, useLayoutEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { skillAPI, goalAPI, resumeAPI } from '../services/api';
import { callGemini, safeParseJSON } from '../utils/gemini';
import toast from 'react-hot-toast';
import './ResumeBuilder.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ResumeBuilderSkeleton from '../components/resume/ResumeBuilderSkeleton';

const LEVEL_NAMES = ['', 'Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert'];

const TEMPLATES = [
  { id: 'modern', label: 'Modern', accent: '#FF8B5A' },
  { id: 'minimal', label: 'Minimal', accent: '#1e1a16' },
  { id: 'creative', label: 'Creative', accent: '#8b5cf6' },
];

const emptyExp = () => ({ company: '', role: '', duration: '', description: '' });
const emptyEdu = () => ({ institution: '', degree: '', year: '', cgpa: '' });
const emptyProj = () => ({ name: '', tech: '', description: '', url: '' });

// A4 height minus 1.5cm top+bottom padding, converted to pixels at 96dpi
const A4_CONTENT_HEIGHT_PX = (297 - 30) * (96 / 25.4);

// ── Gemini ATS Scorer ──────────────────────────────────────────────────────────
const scoreResumeWithAI = async (resumeText, targetRole, jobDescription) => {
  const prompt =
    'You are an ATS (Applicant Tracking System) expert and career coach.\n\n' +
    'Analyse this resume for the role: "' + (targetRole || 'Software Engineer') + '"\n\n' +
    (jobDescription?.trim()
      ? 'Ground your analysis specifically against this job description rather than general assumptions:\n' + jobDescription + '\n\n'
      : '') +
    'RESUME:\n' + resumeText + '\n\n' +
    'Return ONLY this JSON (no markdown, no backticks):\n' +
    '{\n' +
    '  "overallScore": 72,\n' +
    '  "atsScore": 68,\n' +
    '  "readabilityScore": 80,\n' +
    '  "keywordsScore": 65,\n' +
    '  "impactScore": 70,\n' +
    '  "grade": "B",\n' +
    '  "summary": "One sentence overall assessment",\n' +
    '  "strengths": ["strength 1", "strength 2", "strength 3"],\n' +
    '  "improvements": [\n' +
    '    {"issue": "short issue title", "fix": "specific actionable fix suggestion"},\n' +
    '    {"issue": "short issue title", "fix": "specific actionable fix suggestion"},\n' +
    '    {"issue": "short issue title", "fix": "specific actionable fix suggestion"}\n' +
    '  ]\n' +
    '}\n\n' +
    'Score 0-100. Be honest and specific for Indian job market.';

  const text = await callGemini(prompt, { temperature: 0.3, maxOutputTokens: 8192 });
  const parsed = safeParseJSON(text);
  if (!parsed) throw new Error('AI returned an invalid response — please try again');
  return parsed;
};

// Build plain text version of resume for AI
const buildResumeText = (form, skills, completedGoals) => {
  const lines = [];
  lines.push(form.name || 'Candidate');
  if (form.email) lines.push(form.email);
  if (form.phone) lines.push(form.phone);
  if (form.location) lines.push(form.location);
  if (form.github) lines.push('GitHub: github.com/' + form.github);
  if (form.linkedin) lines.push('LinkedIn: linkedin.com/in/' + form.linkedin);
  lines.push('');
  if (form.summary) { lines.push('SUMMARY'); lines.push(form.summary); lines.push(''); }
  const exps = form.experiences.filter(e => e.company || e.role);
  if (exps.length) {
    lines.push('EXPERIENCE');
    exps.forEach(e => {
      lines.push(e.role + ' at ' + e.company + ' (' + e.duration + ')');
      if (e.description) lines.push(e.description);
    });
    lines.push('');
  }
  const projs = form.projects.filter(p => p.name);
  if (projs.length) {
    lines.push('PROJECTS');
    projs.forEach(p => {
      lines.push(p.name + ' (' + p.tech + ')');
      if (p.description) lines.push(p.description);
    });
    lines.push('');
  }
  const edus = form.education.filter(e => e.institution || e.degree);
  if (edus.length) {
    lines.push('EDUCATION');
    edus.forEach(e => lines.push(e.degree + ' - ' + e.institution + ' ' + e.year + ' CGPA:' + e.cgpa));
    lines.push('');
  }
  const filteredSkills = skills.filter(s => s.level >= form.minSkillLevel);
  if (form.includeSkills && filteredSkills.length) {
    lines.push('SKILLS');
    lines.push(filteredSkills.map(s => s.name).join(', '));
    lines.push('');
  }
  const certs = form.certifications.filter(c => c.trim());
  if (certs.length) { lines.push('CERTIFICATIONS'); certs.forEach(c => lines.push(c)); }
  return lines.join('\n');
};

const STOPWORDS = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'will', 'your', 'you', 'are', 'our', 'not', 'all', 'any', 'can', 'has', 'but', 'who', 'what', 'when', 'where', 'how', 'their', 'they', 'into', 'more', 'than', 'then', 'only', 'also', 'such', 'both', 'each', 'other', 'some', 'most', 'over', 'under', 'while', 'across', 'using', 'used', 'use']);

const normalizeToken = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const levenshtein = (a, b) => {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
};

// General structural rules — no per-word curation needed, generalizes to any term
const tokensMatch = (rawA, rawB) => {
  const a = normalizeToken(rawA);
  const b = normalizeToken(rawB);
  if (!a || !b) return false;
  if (a === b) return true;

  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];

  // Short prefix/suffix difference — catches Node/NodeJS, React/ReactJS,
  // Postgres/PostgreSQL — but rejects Java/JavaScript (too long a difference)
  if (shorter.length >= 2 && longer.startsWith(shorter) && longer.length - shorter.length <= 3) return true;
  if (shorter.length >= 3 && longer.endsWith(shorter) && longer.length - shorter.length <= 3) return true;

  // Typo tolerance — only for longer words, to avoid short words matching too loosely
  if (Math.min(a.length, b.length) >= 6 && levenshtein(a, b) <= 1) return true;

  return false;
};

const extractKeywords = (text) => {
  const words = (text || '').toLowerCase().match(/[a-z][a-z0-9+.#/-]{2,}/g) || [];
  const freq = {};
  words.forEach(w => {
    if (STOPWORDS.has(w)) return;
    freq[w] = (freq[w] || 0) + 1;
  });
  return Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 25);
};

const computeKeywordMatch = (resumeText, jobDescription) => {
  if (!jobDescription || !jobDescription.trim()) return null;
  const jdKeywords = extractKeywords(jobDescription);
  const resumeWords = (resumeText || '').toLowerCase().match(/[a-z][a-z0-9+.#/-]{2,}/g) || [];

  const matched = [];
  const missing = [];
  jdKeywords.forEach(k => {
    const found = resumeWords.some(rw => tokensMatch(k, rw));
    (found ? matched : missing).push(k);
  });

  const matchPercent = jdKeywords.length ? Math.round((matched.length / jdKeywords.length) * 100) : 0;
  return {
    matchPercent,
    matched: matched.slice(0, 15),
    missing: missing.slice(0, 15),
    totalKeywords: jdKeywords.length,
  };
};

const parseProfileLink = (value, domain, prefixPath = '') => {
  if (!value) return null;
  const trimmed = value.trim();
  let handle = trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      handle = u.pathname.replace(/^\/+|\/+$/g, '');
    } catch {
      handle = trimmed;
    }
  }
  const cleanHandle = handle.replace(new RegExp(`^${prefixPath}`, 'i'), '');
  return {
    href: `https://${domain}/${prefixPath}${cleanHandle}`,
    label: `${domain}/${prefixPath}${cleanHandle}`,
  };
};

const ScoreRing = ({ score, label, color, size = 80 }) => {
  const r = size / 2 - 7;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-strong)" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={'rotate(-90 ' + size / 2 + ' ' + size / 2 + ')'}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
          fontSize={size < 70 ? "12" : "16"} fontWeight="800" fill={color}>
          {score}
        </text>
      </svg>
      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.25rem' }}>{label}</div>
    </div>
  );
};

const ResumeBuilder = () => {
  const { user } = useContext(AuthContext);
  const [skills, setSkills] = useState([]);
  const [goals, setGoals] = useState([]);
  const [template, setTemplate] = useState('modern');
  const [activeSection, setActiveSection] = useState('personal');
  const [printing, setPrinting] = useState(false);
  const [scoring, setScoring] = useState(false);

  // ── ATS state persisted across navigation ──
  // Without this, clicking to another page and back wiped out the whole
  // score the moment ResumeBuilder unmounted — same problem Learning Hub's
  // AI path had before it got localStorage persistence.
  const [atsResult, setAtsResult] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sp_ats_result')) || null; } catch { return null; }
  });
  const [targetRole, setTargetRole] = useState(() => {
    return localStorage.getItem('sp_ats_target_role') || '';
  });
  const [showATS, setShowATS] = useState(() => {
    return localStorage.getItem('sp_ats_show') === 'true';
  });
  const [saveStatus, setSaveStatus] = useState(''); // '' | 'saving' | 'saved'
  const [resumeLoaded, setResumeLoaded] = useState(false);
  const [jobDescription, setJobDescription] = useState(() => {
    return localStorage.getItem('sp_ats_job_description') || '';
  });
  const [keywordMatch, setKeywordMatch] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sp_ats_keyword_match')) || null; } catch { return null; }
  });

  // Pagination — real WYSIWYG measurement, not a guessed page count
  const blockRefs = useRef({});
  const [pages, setPages] = useState([]);

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    location: user?.location || '',
    github: user?.github || '',
    linkedin: user?.linkedin || '',
    summary: '',
    experiences: [emptyExp()],
    education: [emptyEdu()],
    projects: [emptyProj()],
    certifications: [''],
    includeSkills: true,
    includeGoals: false,
    minSkillLevel: 1,
  });

  useEffect(() => {
    skillAPI.getAll().then(({ data }) => setSkills(data.skills || [])).catch(() => { });
    goalAPI.getAll().then(({ data }) => setGoals(data.goals || [])).catch(() => { });

    resumeAPI.get()
      .then(({ data }) => {
        if (data.resume) {
          setTemplate(data.resume.template || 'modern');
          setTargetRole(data.resume.targetRole || '');
          setForm(f => ({ ...f, ...data.resume.formData }));
        }
      })
      .catch(() => { })
      .finally(() => setResumeLoaded(true));
  }, []);

  useEffect(() => {
    if (!resumeLoaded) return; // don't save before the initial fetch completes — would overwrite saved data with defaults
    setSaveStatus('saving');
    const timeout = setTimeout(() => {
      resumeAPI.save({ template, targetRole, formData: form })
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus(''));
    }, 1200);
    return () => clearTimeout(timeout);
  }, [form, template, targetRole, resumeLoaded]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const updateArr = (k, i, field, v) => { const a = [...form[k]]; a[i] = { ...a[i], [field]: v }; set(k, a); };
  const addArr = (k, empty) => set(k, [...form[k], empty]);
  const removeArr = (k, i) => set(k, form[k].filter((_, j) => j !== i));

  const filteredSkills = skills.filter(s => s.level >= form.minSkillLevel);
  const completedGoals = goals.filter(g => g.status === 'done');
  const accentColor = TEMPLATES.find(t => t.id === template)?.accent || '#FF8B5A';

  const SECTIONS = [
    { key: 'personal', label: 'Personal' },
    { key: 'summary', label: 'Summary' },
    { key: 'experience', label: 'Experience' },
    { key: 'education', label: 'Education' },
    { key: 'projects', label: 'Projects' },
    { key: 'skills', label: 'Skills' },
    { key: 'extras', label: 'Extras' },
  ];

  const handleDownloadPDF = async () => {
    setPrinting(true);
    try {
      const pageElements = document.querySelectorAll('#resume-preview .resume-page');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

      for (let i = 0; i < pageElements.length; i++) {
        const clone = pageElements[i].cloneNode(true);
        const pageNumEl = clone.querySelector('.resume-page-number');
        if (pageNumEl) pageNumEl.remove();
        clone.style.boxShadow = 'none';
        clone.style.margin = '0';
        clone.style.transform = 'none';
        clone.style.zoom = '1'; // the responsive preview's zoom is viewport-width-driven,
        // so without this the PDF would inherit whatever zoom applies to the device it's
        // downloaded from — this guarantees the PDF is always true, full A4 size

        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-99999px';
        container.style.top = '0';
        container.appendChild(clone);
        document.body.appendChild(container);

        const canvas = await html2canvas(clone, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.98);

        document.body.removeChild(container);

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeightInPdf = (imgProps.height * pdfWidth) / imgProps.width;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(imgHeightInPdf, pdfHeight));
      }

      const filenameBase = (form.name || 'resume').trim().replace(/\s+/g, '_');
      pdf.save(`${filenameBase}_Resume.pdf`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF — please try again');
    } finally {
      setPrinting(false);
    }
  };

  const handleATSScore = async () => {
    const resumeText = buildResumeText(form, skills, completedGoals);
    if (resumeText.length < 100) { toast.error('Fill in more resume details before scoring'); return; }
    setScoring(true); setShowATS(true); setAtsResult(null);
    localStorage.setItem('sp_ats_show', 'true');
    try {
      const km = computeKeywordMatch(resumeText, jobDescription);
      setKeywordMatch(km);
      localStorage.setItem('sp_ats_keyword_match', JSON.stringify(km));
      const result = await scoreResumeWithAI(resumeText, targetRole, jobDescription);
      setAtsResult(result);
      localStorage.setItem('sp_ats_result', JSON.stringify(result));
      toast.success('ATS analysis complete!');
    } catch (err) {
      toast.error('AI scoring failed: ' + err.message);
      setShowATS(false);
      localStorage.setItem('sp_ats_show', 'false');
    } finally { setScoring(false); }
  };

  const handleClearATS = () => {
    setAtsResult(null);
    setKeywordMatch(null);
    setShowATS(false);
    localStorage.removeItem('sp_ats_result');
    localStorage.removeItem('sp_ats_keyword_match');
    localStorage.setItem('sp_ats_show', 'false');
    // Deliberately leaving sp_ats_target_role / sp_ats_job_description alone —
    // those are inputs, not results, and clearing the score shouldn't force
    // someone to retype the role/JD they were scoring against.
  };

  const gradeColor = (g) => {
    if (g === 'A+' || g === 'A') return '#10b981';
    if (g === 'B+' || g === 'B') return '#FFA95A';
    return '#FF5A5A';
  };

  // ── Section blocks for the live-paginated preview ──────────────────────────
  const sectionBlocks = [
    {
      key: 'header',
      render: () => (
        <div className="rp-header">
          <div className="rp-name">{form.name || 'Your Name'}</div>
          <div className="rp-contact">
            {form.email && <span>✉ {form.email}</span>}
            {form.phone && <span>📞 {form.phone}</span>}
            {form.location && <span>📍 {form.location}</span>}
            {form.github && (() => {
              const gh = parseProfileLink(form.github, 'github.com');
              return <a href={gh.href} target="_blank" rel="noopener noreferrer" className="rp-contact-link">⌥ {gh.label}</a>;
            })()}
            {form.linkedin && (() => {
              const li = parseProfileLink(form.linkedin, 'linkedin.com', 'in/');
              return <a href={li.href} target="_blank" rel="noopener noreferrer" className="rp-contact-link">in {li.label}</a>;
            })()}
          </div>
        </div>
      ),
    },
    form.summary && {
      key: 'summary',
      render: () => (
        <div className="rp-section rp-section-summary">
          <div className="rp-section-title">Summary</div>
          <p className="rp-summary">{form.summary}</p>
        </div>
      ),
    },
    form.experiences.some(e => e.company || e.role) && {
      key: 'experience',
      render: () => (
        <div className="rp-section rp-section-experience">
          <div className="rp-section-title">Experience</div>
          {form.experiences.filter(e => e.company || e.role).map((exp, i) => (
            <div key={i} className="rp-item">
              <div className="rp-item-header">
                <div>
                  <div className="rp-item-title">{exp.role || 'Role'}</div>
                  <div className="rp-item-sub">{exp.company}</div>
                </div>
                {exp.duration && <div className="rp-item-date">{exp.duration}</div>}
              </div>
              {exp.description && (
                <div className="rp-item-desc">
                  {exp.description.split('\n').filter(l => l.trim()).map((line, li) => (
                    <div key={li} className="rp-bullet">{line.startsWith('•') ? line : '• ' + line}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ),
    },
    form.projects.some(p => p.name) && {
      key: 'projects',
      render: () => (
        <div className="rp-section rp-section-projects">
          <div className="rp-section-title">Projects</div>
          {form.projects.filter(p => p.name).map((proj, i) => (
            <div key={i} className="rp-item">
              <div className="rp-item-header">
                <div>
                  <div className="rp-item-title">
                    {proj.name}
                    {proj.tech && <span className="rp-tech"> · {proj.tech}</span>}
                  </div>
                  {proj.url && <div className="rp-url">{proj.url}</div>}
                </div>
              </div>
              {proj.description && (
                <div className="rp-item-desc">
                  {proj.description.split('\n').filter(l => l.trim()).map((line, li) => (
                    <div key={li} className="rp-bullet">{line.startsWith('•') ? line : '• ' + line}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ),
    },
    form.education.some(e => e.institution || e.degree) && {
      key: 'education',
      render: () => (
        <div className="rp-section rp-section-education">
          <div className="rp-section-title">Education</div>
          {form.education.filter(e => e.institution || e.degree).map((edu, i) => (
            <div key={i} className="rp-item">
              <div className="rp-item-header">
                <div>
                  <div className="rp-item-title">{edu.degree || 'Degree'}</div>
                  <div className="rp-item-sub">{edu.institution}</div>
                </div>
                <div className="rp-item-date-col">
                  {edu.year && <div className="rp-item-date">{edu.year}</div>}
                  {edu.cgpa && <div className="rp-item-cgpa">CGPA: {edu.cgpa}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    form.includeSkills && filteredSkills.length > 0 && {
      key: 'skills',
      render: () => (
        <div className="rp-section rp-section-skills">
          <div className="rp-section-title">Technical Skills</div>
          <div className="rp-skills-wrap">
            {Object.entries(
              filteredSkills.reduce((acc, s) => { if (!acc[s.category]) acc[s.category] = []; acc[s.category].push(s); return acc; }, {})
            ).map(([cat, catSkills]) => (
              <div key={cat} className="rp-skill-row">
                <span className="rp-skill-cat">{cat}:</span>
                <span className="rp-skill-list">{catSkills.map(s => s.name).join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    form.certifications.some(c => c.trim()) && {
      key: 'certs',
      render: () => (
        <div className="rp-section rp-section-certs">
          <div className="rp-section-title">Certifications</div>
          {form.certifications.filter(c => c.trim()).map((cert, i) => (
            <div key={i} className="rp-bullet">{cert.trim().startsWith('•') ? cert : '• ' + cert}</div>
          ))}
        </div>
      ),
    },
    form.includeGoals && completedGoals.length > 0 && {
      key: 'goals',
      render: () => (
        <div className="rp-section rp-section-goals">
          <div className="rp-section-title">Career Goals Achieved</div>
          {completedGoals.map((goal, i) => (
            <div key={i} className="rp-bullet">• {goal.title}</div>
          ))}
        </div>
      ),
    },
  ].filter(Boolean);

  // Measure real rendered heights and bin-pack sections into A4-height pages
  useLayoutEffect(() => {
    const heights = sectionBlocks.map(b => ({
      key: b.key,
      height: blockRefs.current[b.key]?.offsetHeight || 0,
    }));

    const grouped = [[]];
    let currentHeight = 0;
    heights.forEach(({ key, height }) => {
      if (currentHeight + height > A4_CONTENT_HEIGHT_PX && grouped[grouped.length - 1].length > 0) {
        grouped.push([]);
        currentHeight = 0;
      }
      grouped[grouped.length - 1].push(key);
      currentHeight += height;
    });

    setPages(grouped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, template, filteredSkills.length, completedGoals.length]);

  if (!resumeLoaded) return <ResumeBuilderSkeleton />;

  return (
    <div className="resume-builder">
      {/* Editor */}
      <div className="resume-editor-outer">
        <div className="resume-editor">
          <div className="resume-editor-header">
            <h2 className="resume-editor-title">Resume Builder</h2>
            <p className="resume-editor-sub">Fill details — preview updates live · AI scores your ATS compatibility</p>
            {saveStatus && (
              <div className={'resume-save-indicator' + (saveStatus === 'saved' ? ' saved' : '')}>
                {saveStatus === 'saving' ? 'Saving…' : '✓ Saved'}
              </div>
            )}
          </div>

          {/* Template */}
          <div className="resume-template-row">
            <div className="resume-template-label">Template</div>
            <div className="resume-template-btns">
              {TEMPLATES.map(t => (
                <button key={t.id}
                  className={'resume-template-btn' + (template === t.id ? ' active' : '')}
                  style={{ '--ta': t.accent }}
                  onClick={() => setTemplate(t.id)}>
                  <div className="template-swatch" style={{ background: t.accent }} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section nav */}
          <div className="resume-section-nav">
            {SECTIONS.map(s => (
              <button key={s.key}
                className={'resume-sec-btn' + (activeSection === s.key ? ' active' : '')}
                onClick={() => setActiveSection(s.key)}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Personal */}
          {activeSection === 'personal' && (
            <div className="resume-form-section">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your full name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 9999999999" />
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="City, State" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">GitHub Profile URL</label>
                  <input value={form.github} onChange={e => set('github', e.target.value)} placeholder="Enter your profile URL" />
                </div>
                <div className="form-group">
                  <label className="form-label">LinkedIn Profile URL</label>
                  <input value={form.linkedin} onChange={e => set('linkedin', e.target.value)} placeholder="Enter your profile URL" />
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          {activeSection === 'summary' && (
            <div className="resume-form-section">
              <div className="form-group">
                <label className="form-label">Professional Summary</label>
                <textarea value={form.summary} onChange={e => set('summary', e.target.value)}
                  placeholder="2-3 sentences about your skills, experience and career goals…"
                  rows={5} style={{ resize: 'vertical' }} />
              </div>
              <div className="resume-tip">
                💡 Mention your top 3 skills, any internships or projects, and what role you are targeting.
              </div>
            </div>
          )}

          {/* Experience */}
          {activeSection === 'experience' && (
            <div className="resume-form-section">
              {form.experiences.map((exp, i) => (
                <div key={i} className="resume-item-card">
                  <div className="resume-item-header">
                    <span className="resume-item-num">Experience {i + 1}</span>
                    {form.experiences.length > 1 && (
                      <button className="resume-item-remove" onClick={() => removeArr('experiences', i)}>✕ Remove</button>
                    )}
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Company</label>
                      <input value={exp.company} onChange={e => updateArr('experiences', i, 'company', e.target.value)} placeholder="Company name" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Role</label>
                      <input value={exp.role} onChange={e => updateArr('experiences', i, 'role', e.target.value)} placeholder="Software Engineer Intern" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duration</label>
                    <input value={exp.duration} onChange={e => updateArr('experiences', i, 'duration', e.target.value)} placeholder="Jun 2024 – Aug 2024" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description (use bullet points)</label>
                    <textarea value={exp.description}
                      onChange={e => updateArr('experiences', i, 'description', e.target.value)}
                      placeholder="• Built REST APIs&#10;• Improved performance by 30%&#10;• Worked with 5 developers"
                      rows={4} style={{ resize: 'vertical' }} />
                  </div>
                </div>
              ))}
              <button className="resume-add-item-btn" onClick={() => addArr('experiences', emptyExp())}>+ Add Experience</button>
            </div>
          )}

          {/* Education */}
          {activeSection === 'education' && (
            <div className="resume-form-section">
              {form.education.map((edu, i) => (
                <div key={i} className="resume-item-card">
                  <div className="resume-item-header">
                    <span className="resume-item-num">Education {i + 1}</span>
                    {form.education.length > 1 && (
                      <button className="resume-item-remove" onClick={() => removeArr('education', i)}>✕ Remove</button>
                    )}
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Institution</label>
                      <input value={edu.institution} onChange={e => updateArr('education', i, 'institution', e.target.value)} placeholder="VIT Pune" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Degree</label>
                      <input value={edu.degree} onChange={e => updateArr('education', i, 'degree', e.target.value)} placeholder="B.Tech Computer Science" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Year</label>
                      <input value={edu.year} onChange={e => updateArr('education', i, 'year', e.target.value)} placeholder="2022 – 2026" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CGPA</label>
                      <input value={edu.cgpa} onChange={e => updateArr('education', i, 'cgpa', e.target.value)} placeholder="8.5 / 10" />
                    </div>
                  </div>
                </div>
              ))}
              <button className="resume-add-item-btn" onClick={() => addArr('education', emptyEdu())}>+ Add Education</button>
            </div>
          )}

          {/* Projects */}
          {activeSection === 'projects' && (
            <div className="resume-form-section">
              {form.projects.map((proj, i) => (
                <div key={i} className="resume-item-card">
                  <div className="resume-item-header">
                    <span className="resume-item-num">Project {i + 1}</span>
                    {form.projects.length > 1 && (
                      <button className="resume-item-remove" onClick={() => removeArr('projects', i)}>✕ Remove</button>
                    )}
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Project Name</label>
                      <input value={proj.name} onChange={e => updateArr('projects', i, 'name', e.target.value)} placeholder="SkillPulse" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tech Stack</label>
                      <input value={proj.tech} onChange={e => updateArr('projects', i, 'tech', e.target.value)} placeholder="React, Node.js, MongoDB" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea value={proj.description}
                      onChange={e => updateArr('projects', i, 'description', e.target.value)}
                      placeholder="• What it does&#10;• Key features&#10;• Impact"
                      rows={3} style={{ resize: 'vertical' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GitHub / Live URL</label>
                    <input value={proj.url} onChange={e => updateArr('projects', i, 'url', e.target.value)} placeholder="https://github.com/…" />
                  </div>
                </div>
              ))}
              <button className="resume-add-item-btn" onClick={() => addArr('projects', emptyProj())}>+ Add Project</button>
            </div>
          )}

          {/* Skills */}
          {activeSection === 'skills' && (
            <div className="resume-form-section">
              <label className="resume-toggle-label">
                <input type="checkbox" checked={form.includeSkills} onChange={e => set('includeSkills', e.target.checked)} />
                Include skills from Skill Map
              </label>
              {form.includeSkills && (
                <>
                  <div className="form-group" style={{ marginTop: '0.875rem' }}>
                    <label className="form-label">Minimum skill level to include</label>
                    <div className="resume-level-slider-row">
                      <input type="range" min="1" max="5" value={form.minSkillLevel}
                        onChange={e => set('minSkillLevel', Number(e.target.value))}
                        className="goal-progress-slider" style={{ flex: 1 }} />
                      <span className="resume-level-val">Lv.{form.minSkillLevel}+ ({filteredSkills.length} skills)</span>
                    </div>
                  </div>
                  <div className="resume-skills-tags">
                    {filteredSkills.map(s => (
                      <span key={s._id} className="resume-skill-tag">
                        {s.name} <span style={{ opacity: 0.6 }}>({LEVEL_NAMES[s.level]})</span>
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Extras */}
          {activeSection === 'extras' && (
            <div className="resume-form-section">
              <div className="form-group">
                <label className="form-label">Certifications</label>
                {form.certifications.map((cert, i) => (
                  <div key={i} className="resume-cert-row">
                    <input value={cert}
                      onChange={e => { const a = [...form.certifications]; a[i] = e.target.value; set('certifications', a); }}
                      placeholder="AWS Cloud Practitioner — 2024" />
                    {form.certifications.length > 1 && (
                      <button className="resume-item-remove"
                        onClick={() => set('certifications', form.certifications.filter((_, j) => j !== i))}>✕</button>
                    )}
                  </div>
                ))}
                <button className="resume-add-item-btn" style={{ marginTop: '0.5rem' }}
                  onClick={() => set('certifications', [...form.certifications, ''])}>+ Add Certification</button>
              </div>
              <label className="resume-toggle-label" style={{ marginTop: '0.875rem' }}>
                <input type="checkbox" checked={form.includeGoals} onChange={e => set('includeGoals', e.target.checked)} />
                Include completed goals ({completedGoals.length} available)
              </label>
            </div>
          )}

          {/* ATS Score section */}
          <div className="ats-score-section">
            <div className="ats-score-header">
              <div>
                <div className="ats-score-title">✨ AI ATS Score</div>
                <div className="ats-score-sub">
                  Overall score, ATS/Readability/Impact are AI-estimated signals, not a guarantee from any specific company's ATS software — use them directionally.
                  {' '}Paste a job description above for a genuinely verified keyword match.
                </div>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">Job Description (optional, but makes scoring far more accurate)</label>
              <textarea
                value={jobDescription}
                onChange={e => { setJobDescription(e.target.value); localStorage.setItem('sp_ats_job_description', e.target.value); }}
                placeholder="Paste the actual job posting here for a grounded, verifiable keyword match…"
                rows={3}
                style={{ resize: 'vertical', fontSize: '0.82rem' }}
              />
            </div>
            <div className="ats-target-row">
              <input value={targetRole} onChange={e => { setTargetRole(e.target.value); localStorage.setItem('sp_ats_target_role', e.target.value); }}
                placeholder="Target role e.g. Full Stack Developer, Data Analyst…"
                className="ats-target-input" />
              <button className={'ats-score-btn' + (scoring ? ' loading' : '')}
                onClick={handleATSScore} disabled={scoring}>
                {scoring ? <><span className="ats-spinner" />Analysing…</> : '✨ Score My Resume'}
              </button>
              {atsResult && !scoring && (
                <button className="ats-clear-btn" onClick={handleClearATS}>
                  ✕ Clear
                </button>
              )}
            </div>

            {/* ATS Results */}
            {showATS && (
              <div className="ats-results">
                {scoring ? (
                  <div className="ats-loading">
                    <div className="spinner" />
                    <p>AI is reading your resume…</p>
                  </div>
                ) : atsResult ? (
                  <>
                    {/* Score rings */}
                    <div className="ats-score-rings">
                      <div className="ats-overall">
                        <ScoreRing score={atsResult.overallScore} label="Overall" size={90}
                          color={atsResult.overallScore >= 70 ? '#10b981' : atsResult.overallScore >= 50 ? '#FFA95A' : '#FF5A5A'} />
                        <div className="ats-grade" style={{ color: gradeColor(atsResult.grade) }}>
                          Grade: {atsResult.grade}
                        </div>
                      </div>
                      <div className="ats-sub-rings">
                        <ScoreRing score={atsResult.atsScore} label="ATS" size={62} color="#3b82f6" />
                        <ScoreRing score={atsResult.keywordsScore} label="Keywords" size={62} color="#8b5cf6" />
                        <ScoreRing score={atsResult.readabilityScore} label="Readability" size={62} color="#10b981" />
                        <ScoreRing score={atsResult.impactScore} label="Impact" size={62} color="#f59e0b" />
                      </div>
                    </div>

                    <p className="ats-summary">{atsResult.summary}</p>

                    {/* Strengths */}
                    {atsResult.strengths?.length > 0 && (
                      <div className="ats-block">
                        <div className="ats-block-title ats-green">✓ Strengths</div>
                        {atsResult.strengths.map((s, i) => (
                          <div key={i} className="ats-strength-item">✓ {s}</div>
                        ))}
                      </div>
                    )}

                    {/* Improvements */}
                    {atsResult.improvements?.length > 0 && (
                      <div className="ats-block">
                        <div className="ats-block-title ats-red">⚠ Improvements Needed</div>
                        {atsResult.improvements.map((imp, i) => (
                          <div key={i} className="ats-improvement-item">
                            <div className="ats-issue">⚠ {imp.issue}</div>
                            <div className="ats-fix">→ {imp.fix}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Keywords */}
                    {keywordMatch && (
                      <div className="ats-block">
                        <div className="ats-block-title" style={{ color: 'var(--text)' }}>
                          ✓ Verified Keyword Match <span style={{ fontWeight: 500, color: 'var(--text-muted)', textTransform: 'none' }}>— computed directly against your pasted job description, not AI-guessed</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: keywordMatch.matchPercent >= 60 ? '#059669' : '#FF5A5A', marginBottom: '0.5rem' }}>
                          {keywordMatch.matchPercent}% of job description keywords found in your resume
                        </div>
                        <div className="ats-keywords-row">
                          {keywordMatch.matched.length > 0 && (
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', marginBottom: '0.3rem' }}>Found</div>
                              <div className="ats-keyword-tags">
                                {keywordMatch.matched.map((k, i) => <span key={i} className="ats-kw-found">{k}</span>)}
                              </div>
                            </div>
                          )}
                          {keywordMatch.missing.length > 0 && (
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--red)', marginBottom: '0.3rem' }}>Missing</div>
                              <div className="ats-keyword-tags">
                                {keywordMatch.missing.map((k, i) => <span key={i} className="ats-kw-missing">{k}</span>)}
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                          Matches spelling and punctuation variants automatically (e.g. Node/NodeJS). Full-word synonyms and abbreviations (e.g. "OOP" vs "Object-Oriented Programming") aren't detected — this stays deterministic rather than guessing.
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </div>

          {/* Print */}
          <div className="resume-print-row">
            <button className="btn btn-primary resume-print-btn" onClick={handleDownloadPDF} disabled={printing}>
              {printing ? '⏳ Generating PDF…' : '⬇ Download Resume'}
            </button>
          </div>
        </div>
      </div>

      {/* Preview — real WYSIWYG, paginated to match actual print output */}
      <div className="resume-preview-wrap">
        <div className="resume-preview-label">Live Preview</div>
        <div id="resume-preview">
          {(pages.length ? pages : [sectionBlocks.map(b => b.key)]).map((keys, pageIdx) => (
            <div
              className="resume-page-scale-wrap"
              key={pageIdx}
            >
              <div
                className={'resume-page resume-' + template}
                style={{ '--accent': accentColor }}
              >
                {keys.map(k => (
                  <div key={k} ref={el => (blockRefs.current[k] = el)} className="resume-block">
                    {sectionBlocks.find(b => b.key === k)?.render()}
                  </div>
                ))}
                <div className="resume-page-number">
                  Page {pageIdx + 1}{pages.length > 1 ? ` of ${pages.length}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResumeBuilder;