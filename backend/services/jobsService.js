const JobsCache = require('../models/JobsCache');

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;
const RESULTS_PER_PAGE = 20; // fetch a bigger batch per call so "show more" is mostly free
const CACHE_TTL_HOURS = 2; // jobs churn faster than salary medians, so a shorter TTL

/**
 * Returns a page of live job listings for a title, cached to avoid
 * re-hitting Adzuna every time a user reopens the same career's Jobs tab.
 *
 * @param {string} jobTitle
 * @param {number} page      1-indexed page number
 * @param {string} country
 */
async function getLiveJobsPage(jobTitle, page = 1, country = 'in') {
  const cacheKey = `${jobTitle.toLowerCase().trim()}_${country}_page${page}`;
  const cached = await JobsCache.findOne({ key: cacheKey });

  if (cached && isFresh(cached.fetchedAt)) {
    return formatResult(cached, 'cache');
  }

  try {
    const url =
      `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}` +
      `?app_id=${ADZUNA_APP_ID}` +
      `&app_key=${ADZUNA_APP_KEY}` +
      `&what=${encodeURIComponent(jobTitle)}` +
      `&where=India` +
      `&results_per_page=${RESULTS_PER_PAGE}` +
      `&sort_by=relevance` +
      `&content-type=application/json`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.exception) {
      if (cached) return formatResult(cached, 'cache-stale-fallback');
      throw new Error(data.exception);
    }

    const jobs = (data.results || []).map(j => ({
      title: j.title,
      company: j.company?.display_name || null,
      location: j.location?.display_name || 'India',
      salary_min: j.salary_min || null,
      salary_max: j.salary_max || null,
      url: j.redirect_url,
      posted: j.created,
      description: j.description ? j.description.slice(0, 120) + '…' : ''
    }));

    const result = {
      key: cacheKey,
      jobTitle,
      page,
      jobs,
      totalCount: data.count || 0,
      fetchedAt: new Date()
    };

    await JobsCache.findOneAndUpdate({ key: cacheKey }, result, {
      upsert: true,
      new: true
    });

    return formatResult(result, 'live');
  } catch (err) {
    console.error(`Adzuna jobs fetch failed for "${jobTitle}" page ${page}:`, err.message);
    if (cached) return formatResult(cached, 'cache-stale-fallback');
    return null;
  }
}

function isFresh(fetchedAt) {
  const hoursSince = (Date.now() - new Date(fetchedAt).getTime()) / (1000 * 60 * 60);
  return hoursSince < CACHE_TTL_HOURS;
}

function formatResult(data, source) {
  return {
    jobs: data.jobs,
    totalCount: data.totalCount,
    page: data.page,
    fetchedAt: data.fetchedAt,
    source
  };
}

module.exports = { getLiveJobsPage };