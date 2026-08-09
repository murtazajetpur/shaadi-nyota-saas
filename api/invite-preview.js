import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const defaultPreviewImage = '/assets/brand/shaadi-nyota-logo.png';

const firstQueryValue = (value) => Array.isArray(value) ? value[0] : value;

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const getRequestOrigin = (request) => {
  const configuredHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const forwardedHost = firstQueryValue(request.headers['x-forwarded-host']);
  const candidateHost = configuredHost || forwardedHost || request.headers.host || 'www.shaadinyota.com';
  const host = /^[a-z0-9.-]+(?::\d+)?$/i.test(candidateHost) ? candidateHost : 'www.shaadinyota.com';
  const protocol = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
  return `${protocol}://${host}`;
};

const toAbsoluteUrl = (value, origin) => {
  if (!value) return `${origin}${defaultPreviewImage}`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${origin}${value.startsWith('/') ? value : `/${value}`}`;
};

const getInvitePreviewSettings = async (slug, inviteCode) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_public_invite_by_code`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      authorization: `Bearer ${supabaseAnonKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ wedding_slug: slug, invite_code: inviteCode }),
  });

  if (!response.ok) return null;
  return response.json();
};

const injectPreviewMeta = (html, metadata) => {
  const cleanedHtml = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, '')
    .replace(/<meta\s+(?:property|name)=["'](?:og|twitter):[^"']+["'][^>]*>/gi, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');

  const tags = [
    `<title>${escapeHtml(metadata.title)}</title>`,
    `<meta name="description" content="${escapeHtml(metadata.description)}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Shaadi Nyota">',
    `<meta property="og:title" content="${escapeHtml(metadata.title)}">`,
    `<meta property="og:description" content="${escapeHtml(metadata.description)}">`,
    `<meta property="og:image" content="${escapeHtml(metadata.imageUrl)}">`,
    `<meta property="og:url" content="${escapeHtml(metadata.canonicalUrl)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeHtml(metadata.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(metadata.description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(metadata.imageUrl)}">`,
    `<link rel="canonical" href="${escapeHtml(metadata.canonicalUrl)}">`,
  ].join('\n  ');

  return cleanedHtml.replace('<head>', `<head>\n  ${tags}`);
};

export default async function handler(request, response) {
  const slug = firstQueryValue(request.query.slug)?.trim().toLowerCase();
  const inviteCode = firstQueryValue(request.query.guestCode)?.trim();
  if (!slug || !inviteCode || !/^[a-z0-9-]+$/.test(slug) || !/^[a-zA-Z0-9_-]+$/.test(inviteCode)) {
    return response.status(400).send('Invalid invitation link.');
  }

  let html;
  try {
    html = await readFile(join(process.cwd(), 'dist', 'index.html'), 'utf8');
  } catch {
    return response.status(500).send('Could not load the invitation website.');
  }

  let payload = null;
  try {
    payload = await getInvitePreviewSettings(slug, inviteCode);
  } catch {
    payload = null;
  }

  const wedding = payload?.wedding;
  const settings = payload?.settings;
  const coupleName = wedding?.display_name
    || [wedding?.groom_name, wedding?.bride_name].filter(Boolean).join(' & ')
    || 'Wedding';
  const title = settings?.whatsapp_preview_title?.trim()
    || wedding?.page_title?.trim()
    || `${coupleName} Invitation`;
  const description = settings?.whatsapp_preview_description?.trim()
    || `You are invited to celebrate ${coupleName}. Open your personalized wedding invitation.`;
  const origin = getRequestOrigin(request);
  const imageUrl = toAbsoluteUrl(
    settings?.whatsapp_preview_image_src || settings?.hero_reveal_image_src,
    origin
  );
  const canonicalUrl = `${origin}/${encodeURIComponent(slug)}/invite/${encodeURIComponent(inviteCode)}`;
  const output = injectPreviewMeta(html, { title, description, imageUrl, canonicalUrl });

  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
  return response.status(200).send(output);
}
