import { supabase } from './supabaseClient';
import { WEDDING_MEDIA_BUCKET } from './weddingMedia';

interface AdminDeleteWeddingRpcResult {
  success?: boolean;
  slug?: string;
  storage_paths?: unknown;
}

const isStringArray = (value: unknown): value is string[] => (
  Array.isArray(value) && value.every((item) => typeof item === 'string')
);

const isMissingDeleteRpc = (message: string) => {
  const normalized = message.toLowerCase();
  return normalized.includes('admin_delete_wedding') && (
    normalized.includes('schema cache') ||
    normalized.includes('could not find the function') ||
    normalized.includes('does not exist')
  );
};

export async function deleteAdminWedding(weddingId: string, confirmationSlug: string) {
  if (!supabase) {
    return { error: 'Supabase is not configured.', detail: '', storageWarning: '' };
  }

  let rpcResult;
  try {
    rpcResult = await supabase.rpc('admin_delete_wedding', {
      target_wedding_id: weddingId,
      confirmation_slug: confirmationSlug,
    });
  } catch (requestError) {
    return {
      error: 'The delete request could not be completed. Please check your connection and try again.',
      detail: requestError instanceof Error ? requestError.message : String(requestError),
      storageWarning: '',
    };
  }

  const { data, error } = rpcResult;

  if (error) {
    return {
      error: isMissingDeleteRpc(error.message)
        ? 'Admin wedding deletion is not configured yet. Run supabase/add_admin_delete_wedding.sql and try again.'
        : 'The wedding could not be deleted. No wedding data was changed.',
      detail: error.message,
      storageWarning: '',
    };
  }

  const result = (data ?? {}) as AdminDeleteWeddingRpcResult;
  if (!result.success) {
    return {
      error: 'The wedding could not be deleted. No wedding data was changed.',
      detail: 'The delete operation returned an unexpected response.',
      storageWarning: '',
    };
  }

  const storagePaths = isStringArray(result.storage_paths)
    ? [...new Set(result.storage_paths.filter(Boolean))]
    : [];
  let storageWarning = '';

  if (storagePaths.length) {
    try {
      const { error: storageError } = await supabase.storage
        .from(WEDDING_MEDIA_BUCKET)
        .remove(storagePaths);
      if (storageError) {
        storageWarning = `The wedding was deleted, but uploaded file cleanup needs attention: ${storageError.message}`;
      }
    } catch (storageError) {
      storageWarning = `The wedding was deleted, but uploaded file cleanup needs attention: ${storageError instanceof Error ? storageError.message : String(storageError)}`;
    }
  }

  return { error: '', detail: '', storageWarning };
}
