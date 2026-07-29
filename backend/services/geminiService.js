// backend/services/geminiService.js
//
// Multi-key pool + failover on top of the original retry/model-fallback
// logic. GEMINI_API_KEYS holds a comma-separated list of 2-3 keys; falls
// back to the single GEMINI_API_KEY var if that's all that's set, so this
// is a non-breaking upgrade — no .env change required to keep working.

const ApiKeyStatus = require('../models/ApiKeyStatus');
const { sendKeyFailureAlert } = require('../utils/emailAlert');

// const PRIMARY_MODEL  = 'gemini-2.5-flash';
// const FALLBACK_MODEL = 'gemini-2.5-flash-lite';
const PRIMARY_MODEL  = 'gemini-3.6-flash';
const FALLBACK_MODEL = 'gemini-3.5-flash-lite';

const BASE_URL       = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_RETRIES    = 3;
const BASE_DELAY_MS  = 2000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- Key pool -----------------------------------------------------------
const KEY_LIST = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean);

if (KEY_LIST.length === 0) {
  console.error('[Gemini] No API keys configured — set GEMINI_API_KEYS (comma-separated) or GEMINI_API_KEY');
}

// "Dead for the rest of this process" set. Fast, no DB round-trip needed
// to decide whether to skip a key. The durable history (for alerting /
// a future status view) lives in ApiKeyStatus, written alongside this.
const deadKeys = new Set();
let cursor = 0; // round-robins the starting point so load isn't always hammering key 0

const maskKey = (key) => (key ? `...${key.slice(-4)}` : 'unknown');

const nextAvailableKeyIndex = () => {
  if (deadKeys.size >= KEY_LIST.length) return null;
  for (let i = 0; i < KEY_LIST.length; i++) {
    const idx = (cursor + i) % KEY_LIST.length;
    if (!deadKeys.has(idx)) return idx;
  }
  return null;
};

const markKeyDead = async (index, reason) => {
  if (deadKeys.has(index)) return; // already recorded this process run
  deadKeys.add(index);
  cursor = (index + 1) % KEY_LIST.length;
  console.error(`[Gemini] Key ${maskKey(KEY_LIST[index])} (index ${index}) marked dead: ${reason}`);

  try {
    const status = await ApiKeyStatus.findOneAndUpdate(
      { keyIndex: index },
      {
        $set: {
          status: 'dead',
          keyMasked: maskKey(KEY_LIST[index]),
          lastFailureAt: new Date(),
          lastFailureReason: reason,
        },
        $inc: { failureCount: 1 },
      },
      { upsert: true, new: true }
    );

    // At most one alert per key per calendar day — a burst of requests
    // hitting the same dead key shouldn't spam the inbox.
    const today = new Date().toDateString();
    const lastAlertDay = status.lastAlertAt ? new Date(status.lastAlertAt).toDateString() : null;
    if (lastAlertDay !== today) {
      await sendKeyFailureAlert({
        keyMasked: maskKey(KEY_LIST[index]),
        reason,
        deadCount: deadKeys.size,
        totalKeys: KEY_LIST.length,
      });
      status.lastAlertAt = new Date();
      await status.save();
    }
  } catch (dbErr) {
    console.error('[Gemini] Failed to persist key status:', dbErr.message);
  }
};

// A quota/auth-type error means the key itself is the problem — retrying
// it won't help, so it should trigger rotation rather than the existing
// transient-error (503/500) retry loop.
const isKeyExhaustedError = (status, errMsg = '') => {
  if (status === 429 || status === 403) return true;
  if (status === 400 && /API key not valid|API_KEY_INVALID/i.test(errMsg)) return true;
  return false;
};

class RotateKeyError extends Error {
  constructor(message) {
    super(message);
    this.rotateKey = true;
  }
}

/**
 * Runs makeRequest(apiKey) against the pool, rotating to the next live key
 * whenever a request throws RotateKeyError. Throws the "temporarily
 * unavailable" message only once every key in the pool has failed.
 */
const withKeyFailover = async (makeRequest) => {
  if (KEY_LIST.length === 0) {
    throw new Error('AI features are temporarily unavailable right now — please try again later.');
  }

  let attempts = 0;
  while (attempts < KEY_LIST.length) {
    const keyIndex = nextAvailableKeyIndex();
    if (keyIndex === null) break;

    try {
      return await makeRequest(KEY_LIST[keyIndex], keyIndex);
    } catch (err) {
      if (err.rotateKey) {
        await markKeyDead(keyIndex, err.message);
        attempts++;
        continue;
      }
      throw err;
    }
  }

  throw new Error('AI features are temporarily unavailable right now — please try again later.');
};

// --- callGemini -----------------------------------------------------------
const callGemini = async (prompt, options = {}) => {
  const { temperature = 0.4, maxOutputTokens = 2500, thinkingLevel = 'low' } = options;

  const generationConfig = { temperature, maxOutputTokens };
  // Gemini 3.x models (3.5/3.6 Flash, Flash-Lite) use thinkingLevel — a string
  // enum ("minimal"/"low"/"medium"/"high") — instead of 2.5's numeric
  // thinkingBudget. They also can't fully disable thinking, so "low" is the
  // closest equivalent to what thinkingBudget: 0 used to do: keep responses
  // fast and avoid burning the token budget on invisible reasoning for
  // structured, no-deep-reasoning-needed outputs like ours. Pass
  // thinkingLevel: null to omit the field entirely and let the model default.
  if (thinkingLevel !== null) {
    generationConfig.thinkingConfig = { thinkingLevel };
  }

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig,
  });

  const models = [PRIMARY_MODEL, FALLBACK_MODEL];

  return withKeyFailover(async (apiKey) => {
    for (let mIndex = 0; mIndex < models.length; mIndex++) {
      const model = models[mIndex];
      const url = `${BASE_URL}/${model}:generateContent?key=${apiKey}`;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
          });
          
          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (!text) throw new Error('Empty response');
            return text;
          }

          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${res.status}`;

          if (isKeyExhaustedError(res.status, errMsg)) {
            // Quota errors are usually per-model, not per-key — try the
            // fallback model on this SAME key before giving up on it
            // entirely and rotating to the next key in the pool.
            if (mIndex < models.length - 1) {
              console.warn(`[Gemini] ${model} quota exhausted on this key, trying ${models[mIndex + 1]}...`);
              break; // exits the retry loop, falls through to the next model in the outer for-loop
            }
            throw new RotateKeyError(errMsg);
          }

          if (res.status === 503 || res.status >= 500) {
            if (attempt < MAX_RETRIES) {
              const wait = BASE_DELAY_MS * Math.pow(2, attempt - 1);
              console.warn(`[Gemini] ${model} busy. Retrying in ${wait / 1000}s...`);
              await sleep(wait);
              continue;
            }
            console.warn(`[Gemini] ${model} retries exhausted. Trying fallback...`);
            break;
          }

          if (res.status === 404 || res.status === 400) {
            console.error(`[Gemini] Model ${model} is unavailable (${res.status}): ${errMsg}`);
            break;
          }

          throw new Error(errMsg);

        } catch (err) {
          if (err.rotateKey) throw err; // bubble up to withKeyFailover
          if (err.message === 'Empty response' || err.name === 'TypeError') {
            if (attempt < MAX_RETRIES) {
              await sleep(BASE_DELAY_MS);
              continue;
            }
          }
          break;
        }
      }
    }
    throw new Error('Gemini AI services are currently rotating. Please try again in a few seconds.');
  });
};

const safeParseJSON = (raw) => {
  if (!raw) return null;

  try {
    return JSON.parse(raw.replace(/```json|```/gi, '').trim());
  } catch {}

  const start = raw.indexOf('{');
  if (start !== -1) {
    let depth = 0, end = -1;
    for (let i = start; i < raw.length; i++) {
      if (raw[i] === '{') depth++;
      else if (raw[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) {
      try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
    }

    let partial = raw.slice(start);

    let quoteCount = 0;
    for (let i = 0; i < partial.length; i++) {
      if (partial[i] === '"' && (i === 0 || partial[i - 1] !== '\\')) quoteCount++;
    }
    if (quoteCount % 2 !== 0) partial += '"';

    let openBraces = 0, closeBraces = 0, openBrackets = 0, closeBrackets = 0;
    for (const ch of partial) {
      if (ch === '{') openBraces++; if (ch === '}') closeBraces++;
      if (ch === '[') openBrackets++; if (ch === ']') closeBrackets++;
    }

    let fixed = partial.replace(/,\s*$/, '').replace(/,\s*"[^"]*$/, '');

    for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']';
    for (let i = 0; i < openBraces - closeBraces; i++) fixed += '}';

    try { return JSON.parse(fixed); } catch (e) { console.error('Recovery failed for:', fixed); }
  }

  return null;
};

/**
 * Native Gemini function calling — lets the model itself decide which
 * tools are relevant to a request, returning structured functionCall
 * parts instead of hand-written JSON we'd have to parse and hope
 * matches our schema.
 */
const callGeminiWithTools = async (prompt, tools, options = {}, history = []) => {
  const { temperature = 0.2 } = options;

  const historyContents = history
    .filter(h => h && h.content)
    .map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }],
    }));

  const contents = [...historyContents, { role: 'user', parts: [{ text: prompt }] }];

  const body = JSON.stringify({
    contents,
    tools: [{ functionDeclarations: tools }],
    toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
    generationConfig: { temperature },
  });

  const models = [PRIMARY_MODEL, FALLBACK_MODEL];

  return withKeyFailover(async (apiKey) => {
    for (let mIndex = 0; mIndex < models.length; mIndex++) {
      const model = models[mIndex];
      const url = `${BASE_URL}/${model}:generateContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (res.ok) {
        const data = await res.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        const functionCalls = parts.filter(p => p.functionCall).map(p => p.functionCall);
        const text = parts.filter(p => p.text).map(p => p.text).join(' ');
        return { functionCalls, text };
      }

      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error?.message || `Gemini error ${res.status}`;

      if (isKeyExhaustedError(res.status, errMsg)) {
        // Same reasoning as callGemini — try the fallback model on this
        // same key before rotating to the next key in the pool.
        if (mIndex < models.length - 1) {
          console.warn(`[Gemini] ${model} quota exhausted on this key, trying ${models[mIndex + 1]}...`);
          continue;
        }
        throw new RotateKeyError(errMsg);
      }

      throw new Error(errMsg);
    }
  });
};

// Exposed for an optional status endpoint (e.g. GET /api/system/ai-status)
// so you can see pool health without digging through server logs.
const getKeyPoolStatus = () => ({
  totalKeys: KEY_LIST.length,
  liveKeys: KEY_LIST.length - deadKeys.size,
  deadKeys: Array.from(deadKeys).map(i => maskKey(KEY_LIST[i])),
});

module.exports = { callGemini, safeParseJSON, callGeminiWithTools, getKeyPoolStatus };