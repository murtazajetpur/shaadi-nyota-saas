import type { WeddingEvent } from '../../data/sampleWeddingData';
import { getEventVisualByKey, getRecommendedVisualForEvent } from '../../data/eventVisuals';
import { theme2Assets } from './theme2Assets';

export const isTheme2Asset = (src: string) => {
  if (!src) return false;
  return src.includes('/assets/theme-2/');
};

export const isExternalAsset = (src: string) => {
  if (!src) return false;
  return /^(https?:|data:|blob:)/i.test(src);
};

export const getEventTheme2Image = (event: WeddingEvent) => {
  const selectedVisual = getEventVisualByKey(event.eventVisualKey);
  if (selectedVisual?.themeKey === 'theme-2') {
    return selectedVisual.imageSrc;
  }

  const recommendedVisual = getRecommendedVisualForEvent(event.eventName, event.eventKey, 'theme-2');
  if (recommendedVisual) {
    return recommendedVisual.imageSrc;
  }

  return theme2Assets.background;
};

export const getEventTheme2TextStyle = (event: WeddingEvent) => {
  if (event.eventTextStyle === 'light' || event.eventTextStyle === 'dark') {
    return event.eventTextStyle;
  }

  const selectedVisual = getEventVisualByKey(event.eventVisualKey);
  if (selectedVisual?.themeKey === 'theme-2') {
    return selectedVisual.defaultTextStyle;
  }

  const recommendedVisual = getRecommendedVisualForEvent(event.eventName, event.eventKey, 'theme-2');
  if (recommendedVisual) {
    return recommendedVisual.defaultTextStyle;
  }

  const visualKey = (event.eventKey ?? '').trim().toLowerCase();
  const key = `${visualKey} ${event.eventName}`.toLowerCase();
  return (
    key.includes('sangeet') ||
    key.includes('music') ||
    key.includes('dance') ||
    key.includes('qawwali') ||
    key.includes('carnival')
  ) ? 'light' : 'dark';
};

export const getEventTheme2Tone = (event: WeddingEvent) => {
  return getEventTheme2TextStyle(event) === 'light' ? 'dark' : 'light';
};

export const getTheme2CoupleImage = (src: string) => (
  isTheme2Asset(src) || isExternalAsset(src) ? src : theme2Assets.coupleBackground
);

export const toGoogleCalendarUrl = (event: WeddingEvent, coupleDisplayName: string) => {
  const text = event.calendarTitle || `${event.eventName} - ${coupleDisplayName}`;
  const details = event.calendarDescription || `Wedding celebration for ${coupleDisplayName}.`;
  const location = [event.venueName, event.city].filter(Boolean).join(', ');
  const start = event.date && event.startTime ? `${event.date} ${event.startTime}` : '';
  const parsed = start ? new Date(start) : null;

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
  }

  const end = new Date(parsed.getTime() + 2 * 60 * 60 * 1000);
  const format = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&dates=${format(parsed)}/${format(end)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
};
