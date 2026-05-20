export type PackageType = 'basic' | 'rsvp' | 'whatsapp';
export type WeddingStatus = 'draft' | 'unpaid' | 'paid' | 'published' | 'suspended';
export type PaymentStatus = 'unpaid' | 'paid' | 'manual_pending' | 'ref_pending';
export type RsvpStatus = 'yes' | 'no' | 'maybe' | '';
export type MealPreference = 'veg' | 'nonVeg' | 'jain' | '';
export type EventTextStyle = 'auto' | 'light' | 'dark';

export const packageDisplayLabels: Record<PackageType, string> = {
  basic: 'Nyota Classic',
  rsvp: 'Nyota Plus',
  whatsapp: 'Nyota Complete',
};

export const getPackageDisplayLabel = (packageType: PackageType) => {
  return packageDisplayLabels[packageType];
};

export const themeDisplayLabels: Record<string, string> = {
  'palace-door-opening': 'Palace Door Opening',
  'theme-2': 'Scroll Opening Invite',
};

export const getThemeDisplayLabel = (themeKey: string) => {
  return themeDisplayLabels[themeKey] ?? themeKey;
};

export interface WeddingEvent {
  id: string;
  eventKey?: string;
  eventVisualKey?: string;
  eventTextStyle?: EventTextStyle;
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

export interface WeddingGuest {
  id: string;
  guestName: string;
  phone: string;
  invitedCount: number;
  category: string;
  inviteCode: string;
  invitedEventIds: string[];
  mealPreference?: MealPreference;
}

export interface RsvpResponse {
  guestId: string;
  eventId: string;
  status: RsvpStatus;
  mealPreference: MealPreference;
  updatedAt?: string;
}

export interface StoredRsvpResponse extends RsvpResponse {
  weddingSlug: string;
  inviteCode: string;
  updatedAt: string;
}

export interface SampleWeddingData {
  wedding: {
    slug: string;
    packageType: PackageType;
    status: WeddingStatus;
    paymentStatus: PaymentStatus;
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
    nameQuestion: string;
    namePlaceholder: string;
    attendanceQuestion: string;
    phoneQuestion: string;
    phonePlaceholder: string;
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
    guests: WeddingGuest[];
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
      packageType: 'basic',
      status: 'published',
      paymentStatus: 'paid',
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
      nameQuestion: 'May we have your name?',
      namePlaceholder: 'First & Last Name',
      attendanceQuestion: 'Will you be celebrating with us?',
      phoneQuestion: 'Where can we reach you?',
      phonePlaceholder: 'Phone Number',
      responseOptions: {
        yes: 'Yes',
        no: 'Regretfully, no',
        maybe: 'Maybe',
      },
      mealPreferenceEnabled: true,
      mealOptions: {
        veg: 'Veg',
        nonVeg: 'Non-Veg',
        jain: 'Jain',
      },
      successMessage: ['Thank you.', 'We look forward to celebrating together.'],
      guests: [
        {
          id: 'guest-1',
          guestName: 'Ahmed Khan Family',
          phone: '+919999999999',
          invitedCount: 5,
          category: 'Groom Family',
          inviteCode: 'm1x9k2',
          invitedEventIds: ['mehendi', 'sangeet', 'wedding', 'reception'],
        },
      ],
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
      status: 'published',
      paymentStatus: 'paid',
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
      nameQuestion: 'May we have your name?',
      namePlaceholder: 'First & Last Name',
      attendanceQuestion: 'Will you be celebrating with us?',
      phoneQuestion: 'Where can we reach you?',
      phonePlaceholder: 'Phone Number',
      responseOptions: {
        yes: 'Yes',
        no: 'Regretfully, no',
        maybe: 'Maybe',
      },
      mealPreferenceEnabled: true,
      mealOptions: {
        veg: 'Veg',
        nonVeg: 'Non-Veg',
        jain: 'Jain',
      },
      successMessage: ['Thank you.', 'We look forward to celebrating together.'],
      guests: [
        {
          id: 'guest-1',
          guestName: 'Ahmed Khan Family',
          phone: '+919999999999',
          invitedCount: 5,
          category: 'Groom Family',
          inviteCode: 'g1x9k2',
          invitedEventIds: ['mehendi', 'wedding', 'reception'],
        },
        {
          id: 'guest-2',
          guestName: 'Fatima Sheikh',
          phone: '+918888888888',
          invitedCount: 1,
          category: 'Bride Friends',
          inviteCode: 's7p4q1',
          invitedEventIds: ['sangeet', 'wedding'],
        },
      ],
    },
    closing: {
      coupleDisplayName: 'Ali & Sara',
      closingLine: 'With love',
      ...sharedThemeMedia.closing,
    },
  },
];

export const defaultWeddingSlug = 'murtaza-lubna';
export const defaultDashboardWeddingSlug = 'ali-sara';
export const mockDashboardDraftStorageKey = 'shaadi-nyota-mock-dashboard-draft';
export const mockRsvpResponsesStorageKey = 'shaadi-nyota-mock-rsvp-responses';
export const mockAdminWeddingsStorageKey = 'shaadi-nyota-mock-admin-weddings';

export const getWeddingBySlug = (slug: string) => {
  return sampleWeddings.find((wedding) => wedding.wedding.slug === slug);
};

export const hasRsvpAccess = (wedding: SampleWeddingData) => {
  return wedding.wedding.packageType === 'rsvp' || wedding.wedding.packageType === 'whatsapp';
};

export const getGuestByInviteCode = (wedding: SampleWeddingData, inviteCode: string) => {
  return wedding.rsvp.guests.find((guest) => guest.inviteCode === inviteCode);
};

export const getEventsForGuest = (wedding: SampleWeddingData, guest: WeddingGuest) => {
  return wedding.events.filter((event) => guest.invitedEventIds.includes(event.id));
};

export const isPersonalizedInvitePath = (pathname: string) => {
  const parts = pathname.split('/').filter(Boolean);
  return parts.length === 3 && parts[1] === 'invite';
};

export const sampleWeddingData = getWeddingBySlug(defaultWeddingSlug) ?? sampleWeddings[0];
