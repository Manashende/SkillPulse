const express = require('express');
const { protect } = require('../middleware/auth');
const { callGemini, safeParseJSON } = require('../services/geminiService');
const { aiRateLimiter, aiHourlyLimiter } = require('../middleware/aiRateLimit');
const ResourcesCache = require('../models/ResourcesCache');
const router = express.Router();

router.use(protect);

const RESOURCES_CACHE_TTL_DAYS = 45; // learning platforms don't change week to week

// GET /api/learning/youtube?q=React+tutorial&maxResults=6
router.get('/youtube', async (req, res) => {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, message: 'YOUTUBE_API_KEY not configured in .env' });
    const q          = req.query.q          || 'programming tutorial';
    const maxResults = req.query.maxResults  || 6;
    const url = 'https://www.googleapis.com/youtube/v3/search' +
      '?part=snippet' +
      '&type=video' +
      '&videoCategoryId=27' +   // Education category
      '&relevanceLanguage=en' +
      '&q=' + encodeURIComponent(q + ' tutorial course') +
      '&maxResults=' + maxResults +
      '&order=relevance' +
      '&key=' + apiKey;
    const response = await fetch(url);
    if (!response.ok) {
      const err = await response.json();
      return res.status(400).json({ success: false, message: err.error?.message || 'YouTube API error' });
    }
    const data  = await response.json();
    const items = (data.items || []).map(item => ({
      videoId:     item.id.videoId,
      title:       item.snippet.title,
      channel:     item.snippet.channelTitle,
      description: item.snippet.description,
      thumbnail:   item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      publishedAt: item.snippet.publishedAt,
      url:         'https://www.youtube.com/watch?v=' + item.id.videoId,
    }));
    res.json({ success: true, query: q, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const VIDEO_DOMAINS = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com'];

function isVideoUrl(url = '') {
  return VIDEO_DOMAINS.some(domain => url.includes(domain));
}

// Gemini can generate a URL that looks right but doesn't actually resolve —
// it isn't browsing the web, it's pattern-matching from training data. This
// verifies each link actually loads before we cache or show it to anyone.
async function isUrlAlive(url, timeoutMs = 4000) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
    clearTimeout(timeout);
    return res.status < 400;
  } catch {
    return false;
  }
}

// GET /api/learning/resources/:category
// Returns AI-curated learning resources for a category, cached so Gemini
// isn't called on every page load. Falls back to a stale cache (if any)
// rather than erroring out if Gemini is temporarily unavailable.
router.get('/resources/:category', aiRateLimiter, aiHourlyLimiter, async (req, res) => {
  try {
    const category = req.params.category;
    const cacheKey = category.toLowerCase().trim();

    let cached = await ResourcesCache.findOne({ key: cacheKey });
    const isFresh =
      cached &&
      Date.now() - new Date(cached.fetchedAt).getTime() < RESOURCES_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

    if (isFresh) {
      return res.json({
        success: true,
        category,
        resources: cached.resources.map(r => ({ ...r.toObject(), type: r.resourceType, resourceType: undefined })),
        source: 'cache'
      });
    }

    const prompt =
      `List the 4 best current, free TEXT-BASED learning resources for "${category}" for ` +
      `engineering students preparing for jobs in India. Only include reading material — ` +
      `official documentation, articles, written tutorials, or interactive text-based courses. ` +
      `Do NOT include YouTube videos, video playlists, or any video-only content — this app ` +
      `already has a separate live video search feature. Only include well-known, official, ` +
      `or widely recognized platforms — do not invent URLs or platforms you are not confident ` +
      `exist. Respond ONLY with valid JSON, no markdown, no explanation, in this exact shape:\n` +
      `{"resources": [{"title": "<name>", "url": "<real https url>", "platform": "<platform name>", "type": "free or paid", "desc": "<one sentence, under 100 characters>"}]}`;

    const raw = await callGemini(prompt, { temperature: 0.3, maxOutputTokens: 600 });
    const parsed = safeParseJSON(raw);

    if (!parsed || !Array.isArray(parsed.resources) || parsed.resources.length === 0) {
      if (cached) {
        return res.json({
          success: true,
          category,
          resources: cached.resources.map(r => ({ ...r.toObject(), type: r.resourceType, resourceType: undefined })),
          source: 'cache-stale-fallback'
        });
      }
      return res.status(502).json({ success: false, message: 'Could not generate resources right now' });
    }

    // Defense in depth: drop any video links even if the prompt constraint
    // was ignored, then verify every remaining URL actually resolves before
    // caching or showing it to anyone.
    const candidates = parsed.resources.filter(r => r.url && !isVideoUrl(r.url));
    const aliveChecks = await Promise.all(candidates.map(r => isUrlAlive(r.url)));
    const verified = candidates.filter((_, i) => aliveChecks[i]);

    if (verified.length === 0) {
      if (cached) {
        return res.json({
          success: true,
          category,
          resources: cached.resources.map(r => ({ ...r.toObject(), type: r.resourceType, resourceType: undefined })),
          source: 'cache-stale-fallback'
        });
      }
      return res.status(502).json({ success: false, message: 'Could not verify any live resources for this topic — try a different search term' });
    }

    // Map Gemini's "type" field to our stored "resourceType" to avoid the
    // Mongoose reserved-word collision (see model file for the full story)
    const toStore = verified.map(r => ({
      title: r.title,
      url: r.url,
      platform: r.platform,
      resourceType: r.type,
      desc: r.desc
    }));

    cached = await ResourcesCache.findOneAndUpdate(
      { key: cacheKey },
      { key: cacheKey, category, resources: toStore, fetchedAt: new Date() },
      { upsert: true, returnDocument: 'after' }
    );

    res.json({
      success: true,
      category,
      resources: cached.resources.map(r => ({ ...r.toObject(), type: r.resourceType, resourceType: undefined })),
      source: 'live'
    });
  } catch (err) {
    console.error('Learning resources error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;