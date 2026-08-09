import { supabase } from './supabaseClient';

export const WEDDING_MEDIA_BUCKET = 'wedding-assets';
export const WEDDING_MEDIA_MAX_ITEMS = 15;
export const WEDDING_MEDIA_MAX_TOTAL_BYTES = 50 * 1024 * 1024;
export const WEDDING_MEDIA_MAX_SOURCE_BYTES = 5 * 1024 * 1024;
export const WEDDING_MEDIA_ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const WEDDING_MEDIA_ACCEPT_ATTRIBUTE = 'image/jpeg,image/png,image/webp';

export type WeddingMediaSection =
  | 'opening-reveal'
  | 'our-story'
  | 'events'
  | 'rsvp'
  | 'closing-gallery'
  | 'whatsapp'
  | 'shared';

export interface WeddingMediaAsset {
  id: string;
  weddingId: string;
  storagePath: string;
  publicUrl: string;
  thumbnailPath: string;
  thumbnailUrl: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  thumbnailSizeBytes: number;
  width: number;
  height: number;
  initialSection: WeddingMediaSection;
  createdAt: string;
}

interface WeddingMediaRow {
  id: string;
  wedding_id: string;
  storage_path: string;
  public_url: string;
  thumbnail_path: string;
  thumbnail_url: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  thumbnail_size_bytes: number;
  width: number;
  height: number;
  initial_section: WeddingMediaSection;
  created_at: string;
}

interface ProcessedWeddingImage {
  imageBlob: Blob;
  thumbnailBlob: Blob;
  width: number;
  height: number;
  extension: string;
}

const mediaSetupMessage = 'Custom image uploads need the wedding media migration. Run supabase/add_wedding_media_library.sql and try again.';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return String(error ?? '');
};

const isMissingMediaTableError = (message: string) => {
  const normalized = message.toLowerCase();
  return normalized.includes('wedding_media') && (
    normalized.includes('schema cache') ||
    normalized.includes('does not exist') ||
    normalized.includes('could not find the table')
  );
};

const mapWeddingMediaRow = (row: WeddingMediaRow): WeddingMediaAsset => ({
  id: row.id,
  weddingId: row.wedding_id,
  storagePath: row.storage_path,
  publicUrl: row.public_url,
  thumbnailPath: row.thumbnail_path,
  thumbnailUrl: row.thumbnail_url,
  originalFilename: row.original_filename,
  mimeType: row.mime_type,
  sizeBytes: Number(row.size_bytes) || 0,
  thumbnailSizeBytes: Number(row.thumbnail_size_bytes) || 0,
  width: Number(row.width) || 0,
  height: Number(row.height) || 0,
  initialSection: row.initial_section,
  createdAt: row.created_at,
});

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) => new Promise<Blob>((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error('Could not optimize this image. Please try another file.'));
  }, 'image/webp', quality);
});

const loadImage = async (file: File) => {
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (context: CanvasRenderingContext2D, width: number, height: number) => context.drawImage(bitmap, 0, 0, width, height),
      close: () => bitmap.close(),
    };
  }

  const objectUrl = URL.createObjectURL(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Could not read this image. Please try a JPG, PNG, or WebP file.'));
    element.src = objectUrl;
  });
  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    draw: (context: CanvasRenderingContext2D, width: number, height: number) => context.drawImage(image, 0, 0, width, height),
    close: () => URL.revokeObjectURL(objectUrl),
  };
};

const getContainedSize = (width: number, height: number, maxWidth: number, maxHeight: number) => {
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const renderImageBlob = async (
  image: Awaited<ReturnType<typeof loadImage>>,
  maxWidth: number,
  maxHeight: number,
  quality: number
) => {
  const size = getContainedSize(image.width, image.height, maxWidth, maxHeight);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image optimization is unavailable in this browser.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  image.draw(context, size.width, size.height);
  return { blob: await canvasToBlob(canvas, quality), ...size };
};

export const processWeddingImage = async (file: File): Promise<ProcessedWeddingImage> => {
  if (!WEDDING_MEDIA_ACCEPTED_TYPES.has(file.type)) {
    throw new Error('Please upload a JPG, PNG, or WebP image.');
  }
  if (file.size > WEDDING_MEDIA_MAX_SOURCE_BYTES) {
    throw new Error('Please upload an image smaller than 5 MB.');
  }

  const image = await loadImage(file);
  try {
    if (!image.width || !image.height) throw new Error('This image has invalid dimensions.');
    const optimized = await renderImageBlob(image, 1440, 2000, 0.82);
    const thumbnail = await renderImageBlob(image, 360, 640, 0.74);
    return {
      imageBlob: optimized.blob,
      thumbnailBlob: thumbnail.blob,
      width: optimized.width,
      height: optimized.height,
      extension: optimized.blob.type === 'image/webp' ? 'webp' : 'png',
    };
  } finally {
    image.close();
  }
};

export const loadWeddingMedia = async (weddingId: string) => {
  if (!supabase) return { assets: [] as WeddingMediaAsset[], error: 'Supabase is not configured.', setupRequired: false };
  const { data, error } = await supabase
    .from('wedding_media')
    .select('*')
    .eq('wedding_id', weddingId)
    .order('created_at', { ascending: false });

  if (error) {
    const setupRequired = isMissingMediaTableError(error.message);
    return {
      assets: [] as WeddingMediaAsset[],
      error: setupRequired ? mediaSetupMessage : 'Could not load your uploaded images.',
      detail: error.message,
      setupRequired,
    };
  }

  return {
    assets: ((data ?? []) as WeddingMediaRow[]).map(mapWeddingMediaRow),
    error: '',
    detail: '',
    setupRequired: false,
  };
};

export const uploadWeddingMedia = async ({
  weddingId,
  file,
  section,
}: {
  weddingId: string;
  file: File;
  section: WeddingMediaSection;
}) => {
  const client = supabase;
  if (!client) return { asset: null, error: 'Supabase is not configured.', detail: '' };

  let processed: ProcessedWeddingImage;
  try {
    processed = await processWeddingImage(file);
  } catch (error) {
    return { asset: null, error: error instanceof Error ? error.message : 'Could not process this image.', detail: '' };
  }

  const mediaId = crypto.randomUUID();
  const basePath = `weddings/${weddingId}/media/${mediaId}`;
  const storagePath = `${basePath}/image.${processed.extension}`;
  const thumbnailPath = `${basePath}/thumbnail.${processed.extension}`;
  const uploadedPaths: string[] = [];

  const uploadObject = async (path: string, blob: Blob) => {
    const { error } = await client.storage.from(WEDDING_MEDIA_BUCKET).upload(path, blob, {
      cacheControl: '31536000',
      contentType: blob.type,
      upsert: false,
    });
    if (error) throw error;
    uploadedPaths.push(path);
  };

  try {
    await uploadObject(storagePath, processed.imageBlob);
    await uploadObject(thumbnailPath, processed.thumbnailBlob);
    const publicUrl = client.storage.from(WEDDING_MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl;
    const thumbnailUrl = client.storage.from(WEDDING_MEDIA_BUCKET).getPublicUrl(thumbnailPath).data.publicUrl;
    const { data, error } = await client
      .from('wedding_media')
      .insert({
        id: mediaId,
        wedding_id: weddingId,
        storage_path: storagePath,
        public_url: publicUrl,
        thumbnail_path: thumbnailPath,
        thumbnail_url: thumbnailUrl,
        original_filename: file.name,
        mime_type: processed.imageBlob.type,
        size_bytes: processed.imageBlob.size,
        thumbnail_size_bytes: processed.thumbnailBlob.size,
        width: processed.width,
        height: processed.height,
        initial_section: section,
      })
      .select('*')
      .single();

    if (error) throw error;
    return { asset: mapWeddingMediaRow(data as WeddingMediaRow), error: '', detail: '' };
  } catch (error) {
    if (uploadedPaths.length) await client.storage.from(WEDDING_MEDIA_BUCKET).remove(uploadedPaths);
    const detail = getErrorMessage(error);
    const normalized = detail.toLowerCase();
    const friendlyError = isMissingMediaTableError(detail)
      ? mediaSetupMessage
      : normalized.includes('media limit') || normalized.includes('storage limit')
        ? detail
        : normalized.includes('bucket')
          ? 'Image upload is not configured. Create the public wedding-assets bucket and run the media-library migration.'
          : 'Could not upload this image. Please try again.';
    return { asset: null, error: friendlyError, detail };
  }
};

export const deleteWeddingMedia = async (asset: WeddingMediaAsset) => {
  if (!supabase) return { error: 'Supabase is not configured.', detail: '' };
  const { error } = await supabase
    .from('wedding_media')
    .delete()
    .eq('id', asset.id)
    .eq('wedding_id', asset.weddingId);
  if (error) return { error: 'Could not remove this image from your library.', detail: error.message };

  const { error: storageError } = await supabase.storage
    .from(WEDDING_MEDIA_BUCKET)
    .remove([asset.storagePath, asset.thumbnailPath].filter(Boolean));
  return storageError
    ? { error: 'The image was removed from your library, but storage cleanup needs attention.', detail: storageError.message }
    : { error: '', detail: '' };
};

export const getWeddingMediaUsageBytes = (assets: WeddingMediaAsset[]) => assets.reduce(
  (total, asset) => total + asset.sizeBytes + asset.thumbnailSizeBytes,
  0
);
