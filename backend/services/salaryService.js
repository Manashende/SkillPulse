const axios = require('axios');
const SalaryCache = require('../models/SalaryCache');

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;
const CACHE_TTL_HOURS = 24;
const PEER_DATA_MAX_AGE_DAYS = 30; // how old cached peer counts can be and still count
const MIN_PEERS_FOR_RELATIVE_DEMAND = 1; // even 1 real peer beats a guessed absolute number

/**
 * Returns live-calculated salary range + demand level for a job title,
 * backed by a MongoDB cache so we don't hit Adzuna's rate limit on every load.
 *
 * Demand is calculated RELATIVE to other cached careers in the same category,
 * not from an absolute listing-count threshold — a raw count like "3000 jobs"
 * means something different for "Software Engineer" (a broad, common title)
 * than for "Machine Learning Engineer" (a narrower one), so ranking against
 * category peers is a much fairer signal than a fixed cutoff.
 *
 * @param {string} jobTitle   e.g. "Full Stack Developer"
 * @param {string} category   e.g. "Engineering" — used to rank demand against peers
 * @param {string} country    Adzuna country code, e.g. "in" for India
 */
async function calculateLiveSalary(jobTitle, category = null, country = 'in') {
  const cacheKey = `${jobTitle.toLowerCase().trim()}_${country}`;
  const cached = await SalaryCache.findOne({ key: cacheKey });

  if (cached && isFresh(cached.fetchedAt)) {
    return formatResult(cached, 'cache');
  }

  try {
    const { data } = await axios.get(
      `https://api.adzuna.com/v1/api/jobs/${country}/search/1`,
      {
        params: {
          app_id: ADZUNA_APP_ID,
          app_key: ADZUNA_APP_KEY,
          what: jobTitle,
          results_per_page: 20
        }
      }
    );

    const jobs = data.results || [];
    const salaried = jobs.filter(j => j.salary_min && j.salary_max);
    const totalMatchingCount = data.count || 0;
    const demand = await getRelativeDemandLevel(category, totalMatchingCount, cacheKey);

    if (salaried.length === 0) {
      // No salary data in this batch, but we may still have a demand count worth caching
      if (cached) return formatResult(cached, 'cache-stale-fallback');
      if (totalMatchingCount > 0) {
        const partial = {
          key: cacheKey,
          jobTitle,
          category,
          salaryMin: null,
          salaryMax: null,
          listingCount: jobs.length,
          totalMatchingCount,
          demandLevel: demand.level,
          demandPeerMedian: demand.peerMedian,
          demandPeerCount: demand.peerCount,
          fetchedAt: new Date()
        };
        await SalaryCache.findOneAndUpdate({ key: cacheKey }, partial, { upsert: true, new: true });
        return formatResult(partial, 'live');
      }
      return null;
    }

    const result = {
      key: cacheKey,
      jobTitle,
      category,
      salaryMin: Math.round(median(salaried.map(j => j.salary_min))),
      salaryMax: Math.round(median(salaried.map(j => j.salary_max))),
      listingCount: jobs.length,
      totalMatchingCount,
      demandLevel: demand.level,
      demandPeerMedian: demand.peerMedian,
      demandPeerCount: demand.peerCount,
      fetchedAt: new Date()
    };

    await SalaryCache.findOneAndUpdate({ key: cacheKey }, result, {
      upsert: true,
      new: true
    });

    return formatResult(result, 'live');
  } catch (err) {
    console.error(`Adzuna fetch failed for "${jobTitle}":`, err.message);
    // Adzuna down or quota hit — degrade gracefully instead of erroring out
    if (cached) return formatResult(cached, 'cache-stale-fallback');
    return null;
  }
}

/**
 * Ranks a career's listing count against other cached careers in the same
 * category (fetched within the last PEER_DATA_MAX_AGE_DAYS), using the
 * ratio between this count and the peer median. This is more stable than
 * quartile ranking when only a few peers are cached (common early on, or
 * for small/niche categories) — a quartile split needs a real distribution
 * to mean anything, whereas "1.6x the typical peer" is meaningful even
 * when compared against just one other cached role.
 *
 * Falls back to a widened absolute scale only if there is truly zero peer
 * data yet (e.g. the very first career ever viewed in a category).
 */
async function getRelativeDemandLevel(category, count, excludeKey) {
  if (!category) return { level: getAbsoluteFallbackDemand(count), peerMedian: null, peerCount: 0 };

  const cutoff = new Date(Date.now() - PEER_DATA_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  const peers = await SalaryCache.find({
    category,
    key: { $ne: excludeKey },
    totalMatchingCount: { $exists: true, $ne: null },
    fetchedAt: { $gte: cutoff }
  }).select('totalMatchingCount');

  const peerCounts = peers.map(p => p.totalMatchingCount).filter(c => c != null);

  if (peerCounts.length < MIN_PEERS_FOR_RELATIVE_DEMAND) {
    // Genuinely no peer data cached yet for this category — bootstrap with
    // the absolute fallback. As soon as even one more career in this
    // category gets viewed, both entries switch to real relative ranking.
    return { level: getAbsoluteFallbackDemand(count), peerMedian: null, peerCount: peerCounts.length };
  }

  const peerMedian = median(peerCounts);
  if (!peerMedian) {
    return { level: getAbsoluteFallbackDemand(count), peerMedian: null, peerCount: peerCounts.length };
  }

  const ratio = count / peerMedian;
  let level;
  if (ratio >= 1.5) level = 'very high';
  else if (ratio >= 1.0) level = 'high';
  else if (ratio >= 0.5) level = 'medium';
  else level = 'low';

  return { level, peerMedian: Math.round(peerMedian), peerCount: peerCounts.length };
}

/**
 * Used only when there isn't enough peer data yet to rank relatively.
 * Wider bands than a naive guess, calibrated for Adzuna India's realistic
 * scale (thousands, not hundreds) — a floor, not the primary mechanism.
 */
function getAbsoluteFallbackDemand(count) {
  if (count > 2000) return 'very high';
  if (count > 500)  return 'high';
  if (count > 100)  return 'medium';
  return 'low';
}

function median(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function isFresh(fetchedAt) {
  const hoursSince = (Date.now() - new Date(fetchedAt).getTime()) / (1000 * 60 * 60);
  return hoursSince < CACHE_TTL_HOURS;
}

function formatResult(data, source) {
  return {
    salaryMin: data.salaryMin,
    salaryMax: data.salaryMax,
    listingCount: data.listingCount,
    totalMatchingCount: data.totalMatchingCount,
    demandLevel: data.demandLevel,
    demandPeerMedian: data.demandPeerMedian,
    demandPeerCount: data.demandPeerCount,
    fetchedAt: data.fetchedAt,
    source // "live" | "cache" | "cache-stale-fallback"
  };
}

module.exports = { calculateLiveSalary };