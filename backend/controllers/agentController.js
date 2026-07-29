const Skill = require('../models/Skill');
const Goal = require('../models/Goal');
const Career = require('../models/Career');
const { callGeminiWithTools, callGemini, safeParseJSON } = require('../services/geminiService');
const { getLiveJobsPage } = require('../services/jobsService');
const AgentChat = require('../models/AgentChat');

// Tool schema Gemini evaluates natively against the user's message — no
// prompt-hacked JSON parsing, no regex gatekeeper. The model returns
// structured functionCall parts (zero, one, or several) based on its own
// judgment of relevance, guided by these descriptions.
const AGENT_TOOLS = [
    {
        name: 'search_jobs',
        description:
            'Search live job listings in India for a specific job title. Only call this when the user clearly asks about jobs, hiring, companies, or open roles, AND has stated (in this message or earlier in the conversation) which role or job title they mean. If no specific role is stated anywhere in the conversation, do not call this tool — ask the user what role they are interested in instead.',
        parameters: {
            type: 'OBJECT',
            properties: {
                job_title: { type: 'STRING', description: 'The job title to search for, e.g. "React Developer"' },
            },
            required: ['job_title'],
        },
    },
    {
        name: 'find_courses',
        description:
            'Find YouTube tutorials for specific skills. Only call this when the user clearly asks for courses, tutorials, videos, or learning resources.',
        parameters: {
            type: 'OBJECT',
            properties: {
                skills: { type: 'ARRAY', items: { type: 'STRING' }, description: 'List of skills to find tutorials for' },
            },
            required: ['skills'],
        },
    },
    {
        name: 'build_roadmap',
        description:
            'Build a structured multi-phase learning roadmap toward a target career role. Only call this when the user clearly asks for a plan, roadmap, timeline, or wants to become "ready" for a role by a certain time, AND a specific target role is identifiable from the conversation or is a reasonable open-ended request (e.g. "what should I focus on next"). If the user\'s request is role-specific but no role has been stated anywhere yet, ask what role they mean instead of guessing.',
        parameters: {
            type: 'OBJECT',
            properties: {
                target_role: { type: 'STRING', description: 'The career role to build a roadmap toward' },
            },
            required: ['target_role'],
        },
    },
    {
        name: 'create_goals',
        description:
            "Propose 2-4 specific, actionable goal titles (concrete milestones, not one vague restatement) to add to the user's goal tracker. Only call this when the user clearly asks to create, add, or save goals.",
        parameters: {
            type: 'OBJECT',
            properties: {
                goal_titles: {
                    type: 'ARRAY',
                    items: { type: 'STRING' },
                    description: '2-4 specific, actionable goal titles',
                },
            },
            required: ['goal_titles'],
        },
    },
    {

        name: 'analyze_profile',
        description:
            "Surface the user's skill strengths and gaps versus a target career role. If the user names a specific role, pass it as target_role. If no specific role is mentioned anywhere in the conversation, omit target_role and this will fall back to the user's overall top career match. Only call this when the user clearly asks for an analysis, comparison, or their strengths/weaknesses.",
        parameters: {
            type: 'OBJECT',
            properties: {
                target_role: { type: 'STRING', description: 'The specific career role to analyze against, if the user named one' },
            },
        },
    },
];

async function fetchYouTube(query, maxResults = 2) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return [];
    try {
        const url =
            'https://www.googleapis.com/youtube/v3/search' +
            '?part=snippet&type=video&videoCategoryId=27&relevanceLanguage=en' +
            '&q=' + encodeURIComponent(query + ' tutorial course') +
            '&maxResults=' + maxResults +
            '&order=relevance&key=' + apiKey;
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.items || []).map(item => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
            url: 'https://www.youtube.com/watch?v=' + item.id.videoId,
        }));
    } catch {
        console.error('[fetchYouTube] request failed:', e.message);
        return [];
    }
}

async function buildRoadmapPhases(targetRole, skillGaps) {
    const prompt = [
        'Create a 90-day learning roadmap for an Indian student targeting the career: ' + targetRole,
        '',
        'For reference, the student has separately self-reported these programming/tech skill gaps: ' + (skillGaps.join(', ') || 'none listed') + '.',
        'These are ONLY relevant if ' + targetRole + ' is itself a software/programming/tech role.',
        'If ' + targetRole + ' is unrelated to programming (e.g. a finance, medical, legal, creative, or other non-tech career), you must COMPLETELY IGNORE this skill list. Do not mention any programming languages, frameworks, or databases anywhere in the roadmap. Base the roadmap entirely on the real, standard requirements for becoming a ' + targetRole + ', in India.',
        '',
        'CRITICAL: You MUST output exactly 3 phases.',
        'Keep the "focus" description under 10 words. Keep each task under 6 words.',
        'Return ONLY valid JSON in this exact format:',
        '{ "phases": [' +
        '{ "name": "Phase 1", "weeks": "1-4", "focus": "...", "tasks": ["Task 1","Task 2"] },' +
        '{ "name": "Phase 2", "weeks": "5-8", "focus": "...", "tasks": ["Task 1","Task 2"] },' +
        '{ "name": "Phase 3", "weeks": "9-12", "focus": "...", "tasks": ["Task 1","Task 2"] }' +
        '] }',
    ].join('\n');

    const raw = await callGemini(prompt, { temperature: 0.3, maxOutputTokens: 2000 });
    const parsed = safeParseJSON(raw);
    return parsed?.phases ? parsed : null;
}

// POST /api/agent/run
const runAgent = async (req, res) => {
    try {
        const userMsg = (req.body.message || '').trim();
        const rawHistory = Array.isArray(req.body.history) ? req.body.history : [];
        // Cap to the last 10 turns (5 exchanges) — keeps latency/cost bounded
        // and stays well under Gemini's context window, while still giving
        // enough recent context to resolve follow-up answers correctly.
        const history = rawHistory.slice(-10);

        if (!userMsg) {
            return res.status(400).json({ success: false, message: 'message is required' });
        }

        // Skip the profile fetch entirely for trivial greetings/small talk —
        // no point running 3 DB queries (and showing "Profile Analyser: Done")
        // for a message that never needed profile context.
        const isTrivialGreeting = /^((hi|hey|hello|yo|sup|hii+|good\s?(morning|evening|afternoon))[\s!.,]*)+$/i.test(userMsg);
        
        let skills = [], goals = [], matches = [];
        let skillMap = {};
        let topCareer = null;
        let weakSkills = [];
        let strongSkills = [];

        if (!isTrivialGreeting) {
            const [skillDocs, goalDocs, careerDocs] = await Promise.all([
                Skill.find({ user: req.user._id }),
                Goal.find({ user: req.user._id }),
                Career.find({}),
            ]);
            skills = skillDocs;
            goals = goalDocs;

            skillMap = {};
            skills.forEach(s => { skillMap[s.name.toLowerCase()] = s.level; });

            matches = careerDocs
                .map(career => {
                    const required = career.requiredSkills || [];
                    if (!required.length) return { ...career.toObject(), matchPercent: 0 };
                    let totalWeight = 0, earnedWeight = 0;
                    required.forEach(r => {
                        const w = r.weight || 1;
                        totalWeight += w;
                        if ((skillMap[r.name.toLowerCase()] || 0) >= r.minLevel) earnedWeight += w;
                    });
                    return { ...career.toObject(), matchPercent: Math.round((earnedWeight / totalWeight) * 100) };
                })
                .sort((a, b) => b.matchPercent - a.matchPercent);

            topCareer = matches[0];
            weakSkills = skills.filter(s => s.level < 3);
            strongSkills = skills.filter(s => s.level >= 3);
        }

        const contextPrompt =
            'User request: "' + userMsg + '"\n' +
            'Strong skills: ' + (strongSkills.slice(0, 6).map(s => s.name).join(', ') || 'none') + '\n' +
            'Weak skills: ' + (weakSkills.slice(0, 4).map(s => s.name).join(', ') || 'none') + '\n' +
            'Top career match: ' + (topCareer ? topCareer.title + ' (' + topCareer.matchPercent + '% match)' : 'none') + '\n\n' +
            'You are a career advisor agent for an Indian engineering student. Decide which tools, if any, ' +
            'are relevant to this specific request — call none for a greeting or vague question. ' +
            'IMPORTANT: If a tool needs a specific piece of information to be useful (e.g. a job title, a target career/role) ' +
            'and the user has not stated it anywhere in this conversation, do NOT guess or silently substitute the "Top career match" ' +
            'or any other default. Instead, call no tools this turn and ask the user a short, specific clarifying question for ' +
            'exactly the missing detail. Only fall back to the top career match if the user is explicitly asking for a general, ' +
            'open-ended suggestion (e.g. "what should I do next?") rather than a tool that requires a specific target. ' +
            'Also write a short, friendly 1-2 sentence reply acknowledging their request.';

        const { functionCalls, text } = await callGeminiWithTools(contextPrompt, AGENT_TOOLS, { temperature: 0.2 }, history);

        let liveJobs = [];
        let courseMap = {};
        let roadmap = null;
        let pendingGoals = [];
        let keyGaps = [];
        let strengths = [];
        let jobSearchFailed = false;
        let courseSearchFailed = false;
        let targetRole = topCareer ? topCareer.title : 'Software Developer';

        for (const call of functionCalls) {
            const args = call.args || {};

            if (call.name === 'search_jobs') {
                targetRole = args.job_title || targetRole;
                try {
                    const result = await getLiveJobsPage(args.job_title || targetRole, 1);
                    liveJobs = result?.jobs || [];
                } catch (e) {
                    console.error('Agent job search failed:', e.message);
                    jobSearchFailed = true;
                }
            }

            if (call.name === 'find_courses') {
                const skillsToSearch = (args.skills || []).slice(0, 2);
                const results = await Promise.all(skillsToSearch.map(async (skill) => {
                    const videos = await fetchYouTube(skill);
                    return { skill, videos };
                }));
                results.forEach(({ skill, videos }) => {
                    if (videos.length) courseMap[skill] = videos;
                    else courseSearchFailed = true;
                });
            }

            if (call.name === 'build_roadmap') {
                targetRole = args.target_role || targetRole;
                roadmap = await buildRoadmapPhases(targetRole, weakSkills.map(s => s.name));
            }

            if (call.name === 'create_goals') {
                const existingTitles = new Set(goals.map(g => g.title.toLowerCase().trim()));
                pendingGoals = (args.goal_titles || [])
                    .filter(t => !existingTitles.has(String(t).toLowerCase().trim()))
                    .slice(0, 4);
            }

            if (call.name === 'analyze_profile') {
                const roleName = args.target_role || targetRole;
                const roleCareer = matches.find(c => c.title.toLowerCase() === roleName.toLowerCase())
                    || matches.find(c => c.title.toLowerCase().includes(roleName.toLowerCase()));

                if (roleCareer && roleCareer.requiredSkills?.length) {
                    // Real per-role gap analysis — checks this specific role's
                    // required skills against the user's actual levels, instead of
                    // a role-agnostic global weak/strong skill dump.
                    strengths = roleCareer.requiredSkills
                        .filter(r => (skillMap[r.name.toLowerCase()] || 0) >= r.minLevel)
                        .map(r => r.name);
                    keyGaps = roleCareer.requiredSkills
                        .filter(r => (skillMap[r.name.toLowerCase()] || 0) < r.minLevel)
                        .map(r => r.name);
                    targetRole = roleCareer.title;
                } else {
                    // No matching career record for the named role — fall back to
                    // the general profile view rather than fabricating role-specific data.
                    strengths = strongSkills.slice(0, 5).map(s => s.name);
                    keyGaps = weakSkills.slice(0, 5).map(s => s.name);
                }
            }
        }

        let advice =
            text?.trim() ||
            (functionCalls.length === 0
                ? "I'm here to help with your career — ask me about jobs, courses, roadmaps, skill gaps, or goals."
                : 'Here you go!');

        if (jobSearchFailed) {
            advice += ' (Note: the live job search didn\'t return anything right now — this may be a temporary API issue, not necessarily zero openings.)';
        }
        if (courseSearchFailed) {
            advice += ' (Note: I couldn\'t find tutorials for one or more of those topics right now — try rephrasing or check back shortly.)';
        }

        res.json({
            success: true,
            advice,
            targetRole,
            keyGaps,
            strengths,
            liveJobs,
            courseMap,
            roadmap,
            pendingGoals,
            profileAnalyzed: !isTrivialGreeting,
        });
    } catch (err) {
        console.error('Agent error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/agent/history
const getHistory = async (req, res) => {
    try {
        const chat = await AgentChat.findOne({ user: req.user._id });
        res.json({ success: true, messages: chat?.messages || [] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// PUT /api/agent/history
const saveHistory = async (req, res) => {
    try {
        const messages = Array.isArray(req.body.messages) ? req.body.messages : [];
        const chat = await AgentChat.findOneAndUpdate(
            { user: req.user._id },
            { messages },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.json({ success: true, messages: chat.messages });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// DELETE /api/agent/history
const clearHistory = async (req, res) => {
    try {
        await AgentChat.findOneAndUpdate(
            { user: req.user._id },
            { messages: [] },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { runAgent, getHistory, saveHistory, clearHistory };