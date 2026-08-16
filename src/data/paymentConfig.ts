import {
  activePackageTypes,
  getPackageDisplayLabel,
  type PackageType,
  type PaymentStatus,
} from './sampleWeddingData';

export const WHATSAPP_PAYMENT_CONTACT = '919833189788';

export type PackageDetail = {
  priceLabel: string;
  summary: string;
  features: string[];
  isPurchasable: boolean;
};

export const packageDetails: Record<PackageType, PackageDetail> = {
  basic: {
    priceLabel: '₹1,000',
    summary: 'Wedding website with template-based design, editable sections, and a public shareable invite link.',
    features: [
      'Wedding website',
      'Template-based design',
      'Opening/reveal section',
      'Our Story section',
      'Event details',
      'Closing/gallery section',
      'Shareable invite link',
      'Basic dashboard editing',
    ],
    isPurchasable: true,
  },
  rsvp: {
    priceLabel: '₹5,000',
    summary: 'Wedding website plus RSVP management, guest lists, personalized links, and response tracking.',
    features: [
      'Everything in Basic',
      'RSVP form',
      'Guest list management',
      'Personalized invite links',
      'Event-wise guest invites',
      'RSVP response tracking',
    ],
    isPurchasable: true,
  },
  whatsapp: {
    priceLabel: '₹5,000',
    summary: 'Wedding website plus RSVP management, guest lists, personalized links, and response tracking.',
    features: [
      'Everything in Basic',
      'RSVP form',
      'Guest list management',
      'Personalized invite links',
      'Event-wise guest invites',
      'RSVP response tracking',
    ],
    isPurchasable: false,
  },
};

export const activePackageOptions = activePackageTypes.map((packageType) => ({
  value: packageType,
  label: getPackageDisplayLabel(packageType),
  ...packageDetails[packageType],
}));

export const paymentConfig = {
  instructions: [
    'To complete your website setup, please contact us on WhatsApp and we will share the UPI/payment details.',
    'Once payment is completed, click Request Verification.',
    'Our team will verify the payment and make your website live within 24-48 hours.',
  ],
  paymentNote: 'Use the WhatsApp link above for payment support and upgrade requests.',
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  unpaid: 'Payment is pending',
  manual_pending: 'Verification Requested',
  ref_pending: 'Reference verification pending',
  paid: 'Payment verified',
};

export const paymentStatusDescriptions: Record<PaymentStatus, string> = {
  unpaid: 'Payment is pending. Please complete the manual payment to activate your selected plan.',
  manual_pending: 'Verification request submitted. We will review your payment and make the website live within 24-48 hours.',
  ref_pending: 'Our team is checking the shared payment reference.',
  paid: 'Payment verified. Your plan is active.',
};

export const buildPaymentWhatsAppUrl = (message: string) => (
  `https://wa.me/${WHATSAPP_PAYMENT_CONTACT}?text=${encodeURIComponent(message)}`
);

export type PaymentWhatsAppContext = {
  email?: string | null;
  slug?: string;
  websiteUrl?: string;
  brideName?: string;
  groomName?: string;
  coupleDisplayName?: string;
  packageType?: PackageType;
};

const formatContextLine = (label: string, value?: string | null) => {
  const cleanValue = value?.trim();
  return cleanValue ? `${label}: ${cleanValue}` : undefined;
};

const buildWeddingContextLines = (context: PaymentWhatsAppContext = {}) => ([
  formatContextLine('Email', context.email),
  formatContextLine('Website address', context.slug),
  formatContextLine('Website URL', context.websiteUrl),
  formatContextLine('Couple display name', context.coupleDisplayName),
  formatContextLine('Bride name', context.brideName),
  formatContextLine('Groom name', context.groomName),
  formatContextLine('Selected plan', context.packageType ? getPackageDisplayLabel(context.packageType) : undefined),
].filter(Boolean) as string[]);

export const buildManualPaymentWhatsAppUrl = (context?: PaymentWhatsAppContext) => buildPaymentWhatsAppUrl(
  [
    'Hi Shaadi Nyota team, I want to complete the manual payment for my wedding website.',
    '',
    ...buildWeddingContextLines(context),
  ].join('\n')
);

export const buildRsvpUpgradeWhatsAppUrl = (context?: PaymentWhatsAppContext) => buildPaymentWhatsAppUrl(
  [
    'Hi Shaadi Nyota team, I want to upgrade my wedding website to the Pro plan.',
    '',
    ...buildWeddingContextLines(context),
  ].join('\n')
);
