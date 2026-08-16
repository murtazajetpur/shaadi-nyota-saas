import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/mobile';

const defaultGuestCountry: CountryCode = 'IN';
const indianMobilePattern = /^[6-9]\d{9}$/;
const repeatedDigitPattern = /^(\d)\1+$/;

export type GuestPhoneValidation = {
  canonicalPhone: string;
  whatsappDigits: string;
  country?: CountryCode;
  error: string;
};

const cleanSpreadsheetPrefix = (value: string) => value.trim().replace(/^'+(?=\s*\+?\d)/, '').trim();

const preparePhoneForParsing = (value: string) => {
  const cleaned = cleanSpreadsheetPrefix(value);
  const digits = cleaned.replace(/\D/g, '');

  if (!digits) return { candidate: '', digits };
  if (/^00/.test(cleaned)) return { candidate: `+${digits.slice(2)}`, digits: digits.slice(2) };
  if (cleaned.startsWith('+')) return { candidate: `+${digits}`, digits };

  // Accept the common Indian trunk prefix while keeping country-less numbers India-first.
  if (digits.length === 11 && digits.startsWith('0') && indianMobilePattern.test(digits.slice(1))) {
    return { candidate: digits.slice(1), digits: digits.slice(1) };
  }
  if (digits.length === 10) return { candidate: digits, digits };

  // More than 10 digits must include a country calling code. The plus sign itself is optional.
  return { candidate: `+${digits}`, digits };
};

export function validateGuestPhone(value: string): GuestPhoneValidation {
  const input = cleanSpreadsheetPrefix(value);
  if (!input) {
    return { canonicalPhone: '', whatsappDigits: '', error: 'Phone is required.' };
  }

  const { candidate, digits } = preparePhoneForParsing(input);
  if (!candidate || digits.length < 8 || digits.length > 15 || repeatedDigitPattern.test(digits)) {
    return {
      canonicalPhone: '',
      whatsappDigits: '',
      error: 'Enter a valid mobile number. Indian numbers may omit +91; other numbers need their country code.',
    };
  }

  const parsed = candidate.startsWith('+')
    ? parsePhoneNumberFromString(candidate)
    : parsePhoneNumberFromString(candidate, defaultGuestCountry);

  if (!parsed?.isValid()) {
    return {
      canonicalPhone: '',
      whatsappDigits: '',
      error: 'Enter a valid mobile number. Indian numbers may omit +91; other numbers need their country code.',
    };
  }

  if (parsed.country === 'IN' && !indianMobilePattern.test(parsed.nationalNumber)) {
    return {
      canonicalPhone: '',
      whatsappDigits: '',
      error: 'Indian mobile numbers must contain 10 digits and start with 6, 7, 8, or 9.',
    };
  }

  return {
    canonicalPhone: parsed.number,
    whatsappDigits: parsed.number.slice(1),
    country: parsed.country,
    error: '',
  };
}

export const normalizeGuestPhone = (value: string) => validateGuestPhone(value).canonicalPhone;

export const getGuestPhoneIdentity = (value: string) => {
  const normalized = normalizeGuestPhone(value);
  return (normalized || value).replace(/\D/g, '');
};
