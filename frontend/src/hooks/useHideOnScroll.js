import { useState, useEffect } from 'react';

export const useHideOnScroll = (threshold = 15) => {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          if (currentScrollY <= 0) {
            setIsHidden(false);
            lastScrollY = currentScrollY;
            ticking = false;
            return;
          }

          if (Math.abs(currentScrollY - lastScrollY) < threshold) {
            ticking = false;
            return;
          }

          if (currentScrollY > lastScrollY) {
            setIsHidden(true); 
          } else {
            setIsHidden(false);
          }

          lastScrollY = currentScrollY;
          ticking = false;
        });
        
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return isHidden;
};