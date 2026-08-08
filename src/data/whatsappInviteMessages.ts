export const defaultWhatsAppInviteMessage = `Hi {guestName} 👋

With great joy, we invite you to celebrate the wedding of {coupleName}. 💍

Please open your personalized wedding invitation here:
{inviteLink}

We look forward to celebrating with you. ✨`;

export const whatsAppInviteVariables = [
  { token: '{guestName}', label: 'Guest name' },
  { token: '{coupleName}', label: 'Couple name' },
  { token: '{brideName}', label: 'Bride name' },
  { token: '{groomName}', label: 'Groom name' },
  { token: '{inviteLink}', label: 'Invite link' },
] as const;

const encodedEmojiRepairs = [
  ['\u00F0\u009F\u0091\u008B', '\u{1F44B}'],
  ['\u00F0\u0178\u2018\u2039', '\u{1F44B}'],
  ['\u00F0\u009F\u0092\u008D', '\u{1F48D}'],
  ['\u00F0\u0178\u2019\u008D', '\u{1F48D}'],
  ['\u00E2\u009C\u00A8', '\u2728'],
  ['\u00E2\u0153\u00A8', '\u2728'],
] as const;

const replacementCharacterVariants = ['\uFFFD', '\u00EF\u00BF\u00BD'] as const;
const unresolvedReplacementCharacterPattern = /\uFFFD|\u00EF\u00BF\u00BD/g;
const fallbackInviteEmojiSequence = ['\u{1F44B}', '\u{1F48D}', '\u2728'] as const;

export const normalizeWhatsAppInviteMessage = (message: string) => {
  const decodedMessage = encodedEmojiRepairs.reduce(
    (normalizedMessage, [encoded, emoji]) => normalizedMessage.replaceAll(encoded, emoji),
    message
  );

  return replacementCharacterVariants.reduce(
    (normalizedMessage, marker) => normalizedMessage
      .replaceAll(`{guestName} ${marker}`, `{guestName} \u{1F44B}`)
      .replaceAll(`{coupleName}. ${marker}`, `{coupleName}. \u{1F48D}`)
      .replaceAll(
        `celebrating with you. ${marker}`,
        `celebrating with you. \u2728`
      ),
    decodedMessage
  );
};

export const whatsAppInviteEmojis = ['💍', '✨', '🎉', '❤️', '🙏', '🌸'] as const;

export type WhatsAppInviteMessageValues = {
  guestName: string;
  coupleName: string;
  brideName: string;
  groomName: string;
  inviteLink: string;
};

export const renderWhatsAppInviteMessage = (
  template: string,
  values: WhatsAppInviteMessageValues
) => {
  const resolvedCoupleName = values.coupleName.trim()
    || [values.groomName.trim(), values.brideName.trim()].filter(Boolean).join(' & ')
    || 'the couple';
  const replacements: Record<string, string> = {
    '{guestName}': values.guestName,
    '{coupleName}': resolvedCoupleName,
    '{brideName}': values.brideName,
    '{groomName}': values.groomName,
    '{inviteLink}': values.inviteLink,
  };

  const renderedMessage = Object.entries(replacements).reduce(
    (message, [token, value]) => message.replaceAll(token, value),
    normalizeWhatsAppInviteMessage(template)
  );

  let replacementIndex = 0;
  return renderedMessage.replace(unresolvedReplacementCharacterPattern, () => (
    fallbackInviteEmojiSequence[replacementIndex++] ?? ''
  ));
};