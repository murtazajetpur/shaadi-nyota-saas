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

  return Object.entries(replacements).reduce(
    (message, [token, value]) => message.replaceAll(token, value),
    template
  );
};