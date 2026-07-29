export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};
export const daysUntil = (date) => {
  if (!date) return null;
  return Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
};
export const levelLabel = (level) => {
  const labels = { 1: 'Beginner', 2: 'Elementary', 3: 'Intermediate', 4: 'Advanced', 5: 'Expert' };
  return labels[level] || 'Unknown';
};
export const levelColor = (level) => {
  const colors = { 1: 'level-1', 2: 'level-2', 3: 'level-3', 4: 'level-4', 5: 'level-5' };
  return colors[level] || 'level-1';
};
export const matchColor = (pct) => {
  if (pct >= 80) return 'var(--success)';
  if (pct >= 50) return 'var(--warning)';
  return 'var(--danger)';
};
export const priorityColor = (priority) => {
  const map = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)' };
  return map[priority] || 'var(--text-muted)';
};
export const xpProgress = (xp) => {
  const level = Math.floor(xp / 500) + 1;
  const currentXP = xp % 500;
  const percent = Math.round((currentXP / 500) * 100);
  return { level, currentXP, percent };
};
export const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
export const truncate = (str, len = 60) =>
  str?.length > len ? str.slice(0, len) + '…' : str;