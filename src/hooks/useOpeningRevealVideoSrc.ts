import { useEffect, useState } from 'react';
import { getOpeningRevealVideoSrcForViewport } from '../data/openingRevealVideoVariants';

const getViewportSize = () => ({
  width: typeof window === 'undefined' ? 0 : window.innerWidth,
  height: typeof window === 'undefined' ? 0 : window.innerHeight,
});

export const useOpeningRevealVideoSrc = (videoSrc?: string | null) => {
  const [viewportSize, setViewportSize] = useState(getViewportSize);

  useEffect(() => {
    const updateViewportSize = () => setViewportSize(getViewportSize());
    updateViewportSize();
    window.addEventListener('resize', updateViewportSize);
    window.addEventListener('orientationchange', updateViewportSize);
    return () => {
      window.removeEventListener('resize', updateViewportSize);
      window.removeEventListener('orientationchange', updateViewportSize);
    };
  }, []);

  return getOpeningRevealVideoSrcForViewport(videoSrc, viewportSize.width, viewportSize.height);
};
