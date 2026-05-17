export type PackageType = 'basic' | 'rsvp' | 'whatsapp';

export interface WeddingEvent {
  id: string;
  eventName: string;
  date: string;
  startTime: string;
  venueName: string;
  city: string;
  mapsUrl: string;
  dressCode: string;
  foregroundImageSrc: string;
  backgroundImageSrc: string;
  calendarTitle: string;
  calendarDescription: string;
}

export const sampleWeddingData = {
  wedding: {
    slug: 'priya-rahul',
    packageType: 'rsvp' as PackageType,
    themeKey: 'palace-door-opening',
    pageTitle: 'Shaadi Nyota',
  },
  hero: {
    revealCtaText: 'Tap to Reveal',
    scrollHintText: '',
    videoSrc: '/assets/hero-v1.mp4',
    posterSrc: '/assets/hero-poster-v1.jpeg',
    revealImageSrc: '/assets/Ganesha Image.png',
    revealImageAlt: 'Lord Ganesha',
    revealImageShowAtSeconds: 5.0,
    heroFadeAtSeconds: 7.95,
  },
  music: {
    audioSrc: '/assets/din-shangda-audio.mp3',
    title: 'Din Shagna Da',
  },
  couple: {
    enabled: true,
    brideName: 'Priya',
    groomName: 'Rahul',
    displayName: 'Priya & Rahul',
    introLine: 'are getting married',
    blessingLine: '',
    backgroundImageSrc: '/assets/second section old.png',
  },
  events: [
    {
      id: 'haldi',
      eventName: 'Haldi',
      date: '28th December 2026',
      startTime: '10:00 AM',
      venueName: 'Taj Mahal Palace',
      city: 'Mumbai',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Taj%20Mahal%20Palace%20Mumbai',
      dressCode: '',
      foregroundImageSrc: '/assets/haldi.png',
      backgroundImageSrc: '/assets/haldi-bg.png',
      calendarTitle: 'Priya & Rahul Haldi',
      calendarDescription: 'Haldi ceremony for Priya and Rahul.',
    },
    {
      id: 'mehendi',
      eventName: 'Mehendi',
      date: '28th December 2026',
      startTime: '4:00 PM',
      venueName: 'Taj Mahal Palace',
      city: 'Mumbai',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Taj%20Mahal%20Palace%20Mumbai',
      dressCode: '',
      foregroundImageSrc: '/assets/mehendi.png',
      backgroundImageSrc: '/assets/mehendi-bg.png',
      calendarTitle: 'Priya & Rahul Mehendi',
      calendarDescription: 'Mehendi ceremony for Priya and Rahul.',
    },
    {
      id: 'sangeet',
      eventName: 'Sangeet',
      date: '29th December 2026',
      startTime: '7:00 PM',
      venueName: 'Taj Mahal Palace',
      city: 'Mumbai',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Taj%20Mahal%20Palace%20Mumbai',
      dressCode: '',
      foregroundImageSrc: '/assets/sangeet.png',
      backgroundImageSrc: '/assets/sangeet-bg.png',
      calendarTitle: 'Priya & Rahul Sangeet',
      calendarDescription: 'Sangeet celebration for Priya and Rahul.',
    },
    {
      id: 'wedding',
      eventName: 'Wedding',
      date: '30th December 2026',
      startTime: '9:00 AM',
      venueName: 'Taj Mahal Palace',
      city: 'Mumbai',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Taj%20Mahal%20Palace%20Mumbai',
      dressCode: '',
      foregroundImageSrc: '/assets/wedding.png',
      backgroundImageSrc: '/assets/wedding-bg.png',
      calendarTitle: 'Priya & Rahul Wedding',
      calendarDescription: 'Wedding ceremony for Priya and Rahul.',
    },
    {
      id: 'reception',
      eventName: 'Reception',
      date: '31st December 2026',
      startTime: '7:00 PM',
      venueName: 'Taj Mahal Palace',
      city: 'Mumbai',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Taj%20Mahal%20Palace%20Mumbai',
      dressCode: '',
      foregroundImageSrc: '/assets/reception.png',
      backgroundImageSrc: '/assets/reception-bg.png',
      calendarTitle: 'Priya & Rahul Reception',
      calendarDescription: 'Reception celebration for Priya and Rahul.',
    },
  ] satisfies WeddingEvent[],
  rsvp: {
    enabled: true,
    title: 'Will you be joining us?',
    subtitle: '',
    responseOptions: {
      yes: 'Yes',
      no: 'Regretfully, no',
      maybe: 'Maybe',
    },
    mealPreferenceEnabled: false,
    mealOptions: {
      veg: 'Veg',
      nonVeg: 'Non-Veg',
      jain: 'Jain',
    },
    successMessage: ['Thank you.', 'We look forward to celebrating together.'],
  },
  closing: {
    coupleDisplayName: 'Priya & Rahul',
    closingLine: 'With love',
    carouselImages: [
      '/assets/carousel1.png',
      '/assets/carousel2.png',
      '/assets/carousel3.png',
    ],
    frameImageSrc: '/assets/heart-frame.png',
  },
};

export type SampleWeddingData = typeof sampleWeddingData;
