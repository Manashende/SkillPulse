import { useEffect, useState } from 'react';
import { useAchievementUnlock } from "../../context/AchievementUnlockContext";
import './AchievementUnlockOverlay.css';

const RARITY_COLOR = { common: '#64748b', rare: '#3b82f6', epic: '#8b5cf6', legendary: '#f59e0b' };

const AchievementUnlockOverlay = () => {
  const { current, dismissCurrent } = useAchievementUnlock();
  const [xpCount, setXpCount] = useState(0);

  useEffect(() => {
    if (!current) return;
    setXpCount(0);
    const target = current.xpReward || 0;
    const duration = 900;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setXpCount(Math.round(target * progress));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [current]);

  if (!current) return null;
  const color = RARITY_COLOR[current.rarity] || RARITY_COLOR.common;

  return (
    <div className="au-backdrop">
      <div className="au-card" style={{ '--au-color': color }} onClick={e => e.stopPropagation()}>
        <button className="au-close-x" onClick={dismissCurrent} aria-label="Close">✕</button>
        <div className="au-burst" />
        <div className="au-icon">{current.icon || '★'}</div>
        <div className="au-label">Achievement Unlocked</div>
        <div className="au-title">{current.title}</div>
        <div className="au-desc">{current.description}</div>
        <div className="au-xp">+{xpCount} XP</div>
      </div>
    </div>
  );
};

export default AchievementUnlockOverlay;