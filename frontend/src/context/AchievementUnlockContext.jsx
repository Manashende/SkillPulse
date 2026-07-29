import { createContext, useContext, useState, useCallback } from 'react';

const AchievementUnlockContext = createContext(null);

export const AchievementUnlockProvider = ({ children }) => {
  const [queue, setQueue] = useState([]);

  const announce = useCallback((achievements) => {
    if (!achievements?.length) return;
    setQueue(prev => [...prev, ...achievements]);
  }, []);

  const dismissCurrent = useCallback(() => {
    setQueue(prev => prev.slice(1));
  }, []);

  return (
    <AchievementUnlockContext.Provider value={{ current: queue[0] || null, announce, dismissCurrent }}>
      {children}
    </AchievementUnlockContext.Provider>
  );
};

export const useAchievementUnlock = () => useContext(AchievementUnlockContext);