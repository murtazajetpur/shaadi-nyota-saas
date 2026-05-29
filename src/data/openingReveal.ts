export const openingRevealCrossfadeSeconds = 1.35;

export const getOpeningRevealCrossfadeProgress = (
  currentTime: number,
  duration: number,
) => {
  if (!Number.isFinite(duration) || duration <= 0) return 0;

  const fadeStart = Math.max(0, duration - openingRevealCrossfadeSeconds);
  return Math.min(1, Math.max(0, (currentTime - fadeStart) / openingRevealCrossfadeSeconds));
};
