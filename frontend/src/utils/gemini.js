// frontend/src/utils/gemini.js
//
// The API key no longer lives here. All Gemini calls are proxied through
// the backend's /api/ai/generate route (backend/services/geminiService.js),
// which holds the retry + model-fallback logic that used to live in this
// file. Function signatures are unchanged on purpose — every page that
// imports callGemini/safeParseJSON from here keeps working without
// modification.

import { aiAPI } from '../services/api';

/**
 * Call Gemini via the backend proxy. Same signature as before:
 * callGemini(prompt, { temperature, maxOutputTokens }).
 */
export const callGemini = async (prompt, options = {}) => {
  const { temperature = 0.4, maxOutputTokens = 2500 } = options;

  const { data } = await aiAPI.generate(prompt, { temperature, maxOutputTokens });

  if (!data?.success || !data.text) {
    throw new Error(data?.message || 'Gemini AI services are currently rotating. Please try again in a few seconds.');
  }

  return data.text;
};

// Unchanged — parsing still happens client-side since different pages
// consume the JSON differently.
export const safeParseJSON = (raw) => {
  if (!raw) return null;

  try {
    return JSON.parse(raw.replace(/```json|```/gi, '').trim());
  } catch {}

  const start = raw.indexOf('{');
  if (start !== -1) {
    let depth = 0, end = -1;
    for (let i = start; i < raw.length; i++) {
      if      (raw[i] === '{') depth++;
      else if (raw[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) {
      try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
    }

    // --- TRUNCATION RECOVERY ---
    let partial = raw.slice(start);

    // Fix 1: Auto-close unclosed strings
    let quoteCount = 0;
    for (let i = 0; i < partial.length; i++) {
      if (partial[i] === '"' && (i === 0 || partial[i-1] !== '\\')) quoteCount++;
    }
    if (quoteCount % 2 !== 0) partial += '"';

    // Fix 2: Count missing braces/brackets
    let openBraces = 0, closeBraces = 0, openBrackets = 0, closeBrackets = 0;
    for (const ch of partial) {
      if (ch === '{') openBraces++;   if (ch === '}') closeBraces++;
      if (ch === '[') openBrackets++; if (ch === ']') closeBrackets++;
    }

    // Fix 3: Strip trailing commas
    let fixed = partial.replace(/,\s*$/, '').replace(/,\s*"[^"]*$/, '');

    // Fix 4: Append missing closures
    for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']';
    for (let i = 0; i < openBraces   - closeBraces;   i++) fixed += '}';

    try { return JSON.parse(fixed); } catch (e) { console.error("Recovery failed for:", fixed); }
  }

  return null;
};