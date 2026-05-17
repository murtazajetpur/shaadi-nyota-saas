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

export interface SampleWeddingData {
  wedding: {
    slug: string;
    packageType: PackageType;
    themeKey: string;
    pageTitle: string;
  };
  hero: {
    revealCtaText: string;
    scrollHintText: string;
    videoSrc: string;
    posterSrc: string;
    revealImageSrc: string;
    revealImageAlt: string;
    revealImageShowAtSeconds: number;
    heroFadeAtSeconds: number;
  };
  music: {
    audioSrc: string;
    title: string;
  };
  couple: {
    enabled: boolean;
    brideName: string;
    groomName: string;
    displayName: string;
    introLine: string;
    blessingLine: string;
    backgroundImageSrc: string;
  };
  events: WeddingEvent[];
  rsvp: {
    enabled: boolean;
    title: string;
    subtitle: string;
    responseOptions: {
      yes: string;
      no: string;
      maybe: string;
    };
    mealPreferenceEnabled: boolean;
    mealOptions: {
      veg: string;
      nonVeg: string;
      jain: string;
    };
    successMessage: string[];
  };
  closing: {
    coupleDisplayName: string;
    closingLine: string;
    carouselImages: string[];
    frameImageSrc: string;
  };
}

const sharedThemeMedia = {
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
  coupleBackgroundImageSrc: '/assets/second section old.png',
  eventMedia: {
    haldi: {
      foregroundImageSrc: '/assets/haldi.png',
      backgroundImageSrc: '/assets/haldi-bg.png',
    },
    mehendi: {
      foregroundImageSrc: '/assets/mehendi.png',
      backgroundImageSrc: '/assets/mehendi-bg.png',
    },
    sangeet: {
      foregroundImageSrc: '/assets/sangeet.png',
      backgroundImageSrc: '/assets/sangeet-bg.png',
    },
    wedding: {
      foregroundImageSrc: '/assets/wedding.png',
      backgroundImageSrc: '/assets/wedding-bg.png',
    },
    reception: {
      foregroundImageSrc: '/assets/reception.png',
      backgroundImageSrc: '/assets/reception-bg.png',
    },
  },
  closing: {
    carouselImages: [
      '/assets/carousel1.png',
      '/assets/carousel2.png',
      '/assets/carousel3.png',
    ],
    frameImageSrc: '/assets/heart-frame.png',
  },
};

const tajMahalPalaceMapsUrl = 'https://www.google.com/maps/search/?api=1&query=Taj%20Mahal%20Palace%20Mumbai';
const royalPalmMapsUrl = 'https://www.google.com/maps/search/?api=1&query=Royal%20Palm%20Jaipur';

export const sampleWeddings: SampleWeddingData[] = [
  {
    wedding: {
      slug: 'murtaza-lubna',
      packageType: 'rsvp',
      themeKey: 'palace-door-opening',
      pageTitle: 'Murtaza & Lubna | Shaadi Nyota',
    },
    hero: sharedThemeMedia.hero,
    music: sharedThemeMedia.music,
    couple: {
      enabled: true,
      brideName: 'Lubna',
      groomName: 'Murtaza',
      displayName: 'Murtaza & Lubna',
      introLine: 'are getting married',
      blessingLine: '',
      backgroundImageSrc: sharedThemeMedia.coupleBackgroundImageSrc,
    },
    events: [
      {
        id: 'haldi',
        eventName: 'Haldi',
        date: '28th December 2026',
        startTime: '10:00 AM',
        venueName: 'Taj Mahal Palace',
        city: 'Mumbai',
        mapsUrl: tajMahalPalaceMapsUrl,
        dressCode: '',
        ...sharedThemeMedia.eventMedia.haldi,
        calendarTitle: 'Murtaza & Lubna Haldi',
        calendarDescription: 'Haldi ceremony for Murtaza and Lubna.',
      },
      {
        id: 'mehendi',
        eventName: 'Mehendi',
        date: '28th December 2026',
        startTime: '4:00 PM',
        venueName: 'Taj Mahal Palace',
        city: 'Mumbai',
        mapsUrl: tajMahalPalaceMapsUrl,
        dressCode: '',
        ...sharedThemeMedia.eventMedia.mehendi,
        calendarTitle: 'Murtaza & Lubna Mehendi',
        calendarDescription: 'Mehendi ceremony for Murtaza and Lubna.',
      },
      {
        id: 'sangeet',
        eventName: 'Sangeet',
        date: '29th December 2026',
        startTime: '7:00 PM',
        venueName: 'Taj Mahal Palace',
        city: 'Mumbai',
        mapsUrl: tajMahalPalaceMapsUrl,
        dressCode: '',
        ...sharedThemeMedia.eventMedia.sangeet,
        calendarTitle: 'Murtaza & Lubna Sangeet',
        calendarDescription: 'Sangeet celebration for Murtaza and Lubna.',
      },
      {
        id: 'wedding',
        eventName: 'Wedding',
        date: '30th December 2026',
        startTime: '9:00 AM',
        venueName: 'Taj Mahal Palace',
        city: 'Mumbai',
        mapsUrl: tajMahalPalaceMapsUrl,
        dressCode: '',
        ...sharedThemeMedia.eventMedia.wedding,
        calendarTitle: 'Murtaza & Lubna Wedding',
        calendarDescription: 'Wedding ceremony for Murtaza and Lubna.',
      },
      {
        id: 'reception',
        eventName: 'Reception',
        date: '31st December 2026',
        startTime: '7:00 PM',
        venueName: 'Taj Mahal Palace',
        city: 'Mumbai',
        mapsUrl: tajMahalPalaceMapsUrl,
        dressCode: '',
        ...sharedThemeMedia.eventMedia.reception,
        calendarTitle: 'Murtaza & Lubna Reception',
        calendarDescription: 'Reception celebration for Murtaza and Lubna.',
      },
    ],
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
      coupleDisplayName: 'Murtaza & Lubna',
      closingLine: 'With love',
      ...sharedThemeMedia.closing,
    },
  },
  {
    wedding: {
      slug: 'ali-sara',
      packageType: 'rsvp',
      themeKey: 'palace-door-opening',
      pageTitle: 'Ali & Sara | Shaadi Nyota',
    },
    hero: sharedThemeMedia.hero,
    music: sharedThemeMedia.music,
    couple: {
      enabled: true,
      brideName: 'Sara',
      groomName: 'Ali',
      displayName: 'Ali & Sara',
      introLine: 'are getting married',
      blessingLine: '',
      backgroundImageSrc: sharedThemeMedia.coupleBackgroundImageSrc,
    },
    events: [
      {
        id: 'haldi',
        eventName: 'Haldi',
        date: '12th February 2027',
        startTime: '11:00 AM',
        venueName: 'Royal Palm',
        city: 'Jaipur',
        mapsUrl: royalPalmMapsUrl,
        dressCode: '',
        ...sharedThemeMedia.eventMedia.haldi,
        calendarTitle: 'Ali & Sara Haldi',
        calendarDescription: 'Haldi ceremony for Ali and Sara.',
      },
      {
        id: 'mehendi',
        eventName: 'Mehendi',
        date: '12th February 2027',
        startTime: '5:00 PM',
        venueName: 'Royal Palm',
        city: 'Jaipur',
        mapsUrl: royalPalmMapsUrl,
        dressCode: '',
        ...sharedThemeMedia.eventMedia.mehendi,
        calendarTitle: 'Ali & Sara Mehendi',
        calendarDescription: 'Mehendi ceremony for Ali and Sara.',
      },
      {
        id: 'sangeet',
        eventName: 'Sangeet',
        date: '13th February 2027',
        startTime: '8:00 PM',
        venueName: 'Royal Palm',
        city: 'Jaipur',
        mapsUrl: royalPalmMapsUrl,
        dressCode: '',
        ...sharedThemeMedia.eventMedia.sangeet,
        calendarTitle: 'Ali & Sara Sangeet',
        calendarDescription: 'Sangeet celebration for Ali and Sara.',
      },
      {
        id: 'wedding',
        eventName: 'Nikaah',
        date: '14th February 2027',
        startTime: '10:30 AM',
        venueName: 'Royal Palm',
        city: 'Jaipur',
        mapsUrl: royalPalmMapsUrl,
        dressCode: '',
        ...sharedThemeMedia.eventMedia.wedding,
        calendarTitle: 'Ali & Sara Nikaah',
        calendarDescription: 'Nikaah ceremony for Ali and Sara.',
      },
      {
        id: 'reception',
        eventName: 'Reception',
        date: '14th February 2027',
        startTime: '7:30 PM',
        venueName: 'Royal Palm',
        city: 'Jaipur',
        mapsUrl: royalPalmMapsUrl,
        dressCode: '',
        ...sharedThemeMedia.eventMedia.reception,
        calendarTitle: 'Ali & Sara Reception',
        calendarDescription: 'Reception celebration for Ali and Sara.',
      },
    ],
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
      coupleDisplayName: 'Ali & Sara',
      closingLine: 'With love',
      ...sharedThemeMedia.closing,
    },
  },
];

export const defaultWeddingSlug = 'murtaza-lubna';

export const getWeddingBySlug = (slug: string) => {
  return sampleWeddings.find((wedding) => wedding.wedding.slug === slug);
};

export const sampleWeddingData = getWeddingBySlug(defaultWeddingSlug) ?? sampleWeddings[0];
