import { resolveAssetPath } from './assetRegistry';

export const tallOpeningRevealAspectRatioMax = 0.48;

const tallOpeningRevealVideoBySrc: Record<string, string> = {
  '/assets/hero-v1.mp4': '/assets/opening-reveal/envelope/videos/opening-envelope-video-1x2.mp4',
  '/assets/opening-reveal/envelope/videos/opening-envelope-video.mp4': '/assets/opening-reveal/envelope/videos/opening-envelope-video-1x2.mp4',
  '/assets/opening-reveal/envelope/videos/opening-envelope-video-optimized.mp4': '/assets/opening-reveal/envelope/videos/opening-envelope-video-1x2.mp4',
  '/assets/theme-2/main-hero-video.mp4': '/assets/opening-reveal/scroll/videos/opening-scroll-video-1x2.mp4',
  '/assets/opening-reveal/scroll/videos/opening-scroll-video.mp4': '/assets/opening-reveal/scroll/videos/opening-scroll-video-1x2.mp4',
  '/assets/opening-reveal/scroll/videos/opening-scroll-video-optimized.mp4': '/assets/opening-reveal/scroll/videos/opening-scroll-video-1x2.mp4',
  '/assets/opening-reveal/palace-door/videos/opening-palace-door-video-01.mp4': '/assets/opening-reveal/palace-door/videos/opening-palace-door-video-1x2.mp4',
  '/assets/opening-reveal/palace-door/videos/opening-palace-door-video-01-optimized.mp4': '/assets/opening-reveal/palace-door/videos/opening-palace-door-video-1x2.mp4',
};

export const shouldUseTallOpeningRevealVideo = (width: number, height: number) => {
  if (!width || !height) return false;
  return width / height <= tallOpeningRevealAspectRatioMax;
};

export const getTallOpeningRevealVideoSrc = (videoSrc?: string | null) => {
  if (!videoSrc) return '';
  const resolvedSrc = resolveAssetPath(videoSrc);
  return tallOpeningRevealVideoBySrc[resolvedSrc] ?? tallOpeningRevealVideoBySrc[videoSrc] ?? '';
};

export const getOpeningRevealVideoSrcForViewport = (
  videoSrc: string | undefined | null,
  width: number,
  height: number,
) => {
  const resolvedSrc = resolveAssetPath(videoSrc);
  if (!shouldUseTallOpeningRevealVideo(width, height)) return resolvedSrc;
  return getTallOpeningRevealVideoSrc(videoSrc) || resolvedSrc;
};
