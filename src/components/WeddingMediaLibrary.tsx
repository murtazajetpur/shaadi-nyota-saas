import type { WeddingMediaAsset } from '../lib/weddingMedia';
import './WeddingMediaLibrary.css';
import {
  WEDDING_MEDIA_ACCEPT_ATTRIBUTE,
  WEDDING_MEDIA_MAX_ITEMS,
  WEDDING_MEDIA_MAX_TOTAL_BYTES,
  getWeddingMediaUsageBytes,
} from '../lib/weddingMedia';

const formatStorage = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(0.1, bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function WeddingMediaLibrary({
  assets,
  pendingRemovalIds = new Set<string>(),
  selectedSrc,
  isUploading,
  isLoading = false,
  setupRequired = false,
  disabled = false,
  previewShape = 'portrait',
  onUpload,
  onSelect,
  onDelete,
  isInUse,
}: {
  assets: WeddingMediaAsset[];
  pendingRemovalIds?: ReadonlySet<string>;
  selectedSrc?: string;
  isUploading: boolean;
  isLoading?: boolean;
  setupRequired?: boolean;
  disabled?: boolean;
  previewShape?: 'portrait' | 'landscape' | 'flexible';
  onUpload: (file: File) => void;
  onSelect: (asset: WeddingMediaAsset) => void;
  onDelete: (asset: WeddingMediaAsset) => void;
  isInUse: (asset: WeddingMediaAsset) => boolean;
}) {
  const usageBytes = getWeddingMediaUsageBytes(assets);
  const visibleAssets = assets.filter((asset) => !pendingRemovalIds.has(asset.id));
  const atItemLimit = assets.length >= WEDDING_MEDIA_MAX_ITEMS;
  const atStorageLimit = usageBytes >= WEDDING_MEDIA_MAX_TOTAL_BYTES;
  const uploadDisabled = disabled || isUploading || setupRequired || atItemLimit || atStorageLimit;

  return (
    <div className={`wedding-media-library wedding-media-library-${previewShape}`}>
      <div className="wedding-media-library-header">
        <div>
          <strong>My uploads</strong>
          <span>Reuse an uploaded image in any compatible section.</span>
        </div>
        <div className="wedding-media-usage" aria-label="Wedding media usage">
          <span>{assets.length} / {WEDDING_MEDIA_MAX_ITEMS} images</span>
          <span>{formatStorage(usageBytes)} / {formatStorage(WEDDING_MEDIA_MAX_TOTAL_BYTES)}</span>
        </div>
      </div>

      <label className={`wedding-media-upload ${uploadDisabled ? 'disabled' : ''}`}>
        <span>{isUploading ? 'Optimizing and uploading...' : 'Upload image'}</span>
        <small>JPG, PNG or WebP, up to 5 MB</small>
        <input
          type="file"
          accept={WEDDING_MEDIA_ACCEPT_ATTRIBUTE}
          disabled={uploadDisabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(file);
            event.target.value = '';
          }}
        />
      </label>

      {setupRequired && (
        <p className="wedding-media-note error">Run the wedding media Supabase migration before uploading images.</p>
      )}
      {!setupRequired && (atItemLimit || atStorageLimit) && (
        <p className="wedding-media-note">Remove an upload before adding another image.</p>
      )}
      {isLoading && <p className="wedding-media-note">Loading your uploaded images...</p>}
      {!isLoading && visibleAssets.length === 0 && pendingRemovalIds.size === 0 && (
        <p className="wedding-media-note">No custom images uploaded yet.</p>
      )}

      {pendingRemovalIds.size > 0 && (
        <p className="wedding-media-note">Image removal will complete when you save the wedding.</p>
      )}
      {visibleAssets.length > 0 && (
        <div className="wedding-media-grid">
          {visibleAssets.map((asset) => {
            const inUse = isInUse(asset);
            return (
              <article className={`wedding-media-card ${selectedSrc === asset.publicUrl ? 'selected' : ''}`} key={asset.id}>
                <button className="wedding-media-select" type="button" onClick={() => onSelect(asset)}>
                  <img src={asset.thumbnailUrl || asset.publicUrl} alt="" loading="lazy" decoding="async" />
                  <span>{asset.originalFilename || 'Uploaded image'}</span>
                </button>
                <button
                  className="wedding-media-remove"
                  type="button"
                  aria-label={`Remove ${asset.originalFilename || 'uploaded image'}`}
                  title={inUse ? 'Remove from every section and the media library' : 'Remove from media library'}
                  onClick={() => onDelete(asset)}
                >
                  &times;
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
