import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type { WeddingEvent } from '../data/sampleWeddingData';
import {
  deleteSupabaseOpenInvitation,
  loadSupabaseOpenInvitations,
  regenerateSupabaseOpenInvitationCode,
  saveSupabaseOpenInvitation,
  type OpenInvitation,
  type OpenInvitationDraft,
} from '../lib/supabaseWeddingData';
import './OpenInvitationsPanel.css';

interface OpenInvitationsPanelProps {
  weddingId?: string;
  weddingSlug: string;
  events: WeddingEvent[];
  dataClient?: SupabaseClient;
}

const emptyDraft = (): OpenInvitationDraft => ({
  label: '',
  category: '',
  isActive: true,
  maxPartySize: 20,
  showInviteeCount: true,
  mealPreferenceEnabled: true,
  expiresAt: null,
  eventIds: [],
});

const toDateTimeLocal = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60_000));
  return localDate.toISOString().slice(0, 16);
};

const toIsoDate = (value: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const getInvitationStatus = (invitation: OpenInvitation) => {
  if (!invitation.isActive) return 'Paused';
  if (invitation.expiresAt && new Date(invitation.expiresAt).getTime() <= Date.now()) return 'Expired';
  return 'Active';
};

export default function OpenInvitationsPanel({
  weddingId,
  weddingSlug,
  events,
  dataClient,
}: OpenInvitationsPanelProps) {
  const [invitations, setInvitations] = useState<OpenInvitation[]>([]);
  const [draft, setDraft] = useState<OpenInvitationDraft | null>(null);
  const [useExpiry, setUseExpiry] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(weddingId));
  const [isSaving, setIsSaving] = useState(false);
  const [busyInvitationId, setBusyInvitationId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const invitationById = useMemo(
    () => new Map(invitations.map((invitation) => [invitation.id, invitation])),
    [invitations]
  );

  const refreshInvitations = useCallback(async () => {
    if (!weddingId) {
      setInvitations([]);
      setIsLoading(false);
      return false;
    }

    setIsLoading(true);
    const result = await loadSupabaseOpenInvitations(weddingId, { client: dataClient });
    setIsLoading(false);
    if (result.error) {
      setError(result.error);
      return false;
    }

    setInvitations(result.invitations);
    setError('');
    return true;
  }, [dataClient, weddingId]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      void refreshInvitations();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [refreshInvitations]);

  const startCreate = () => {
    setDraft(emptyDraft());
    setUseExpiry(false);
    setError('');
    setNotice('');
  };

  const startEdit = (invitation: OpenInvitation) => {
    setDraft({
      id: invitation.id,
      label: invitation.label,
      category: invitation.category,
      isActive: invitation.isActive,
      maxPartySize: invitation.maxPartySize,
      showInviteeCount: invitation.showInviteeCount,
      mealPreferenceEnabled: invitation.mealPreferenceEnabled,
      expiresAt: invitation.expiresAt,
      eventIds: [...invitation.eventIds],
    });
    setUseExpiry(Boolean(invitation.expiresAt));
    setError('');
    setNotice('');
  };

  const toggleEvent = (eventId: string) => {
    setDraft((current) => {
      if (!current) return current;
      const eventIds = current.eventIds.includes(eventId)
        ? current.eventIds.filter((id) => id !== eventId)
        : [...current.eventIds, eventId];
      return { ...current, eventIds };
    });
  };

  const saveDraft = async () => {
    if (!weddingId || !draft) return;
    if (!draft.label.trim()) {
      setError('Enter a name for this Open Invitation.');
      return;
    }
    if (draft.eventIds.length === 0) {
      setError('Select at least one event for this Open Invitation.');
      return;
    }
    if (useExpiry && !draft.expiresAt) {
      setError('Choose an expiry date and time.');
      return;
    }

    setIsSaving(true);
    setError('');
    setNotice('');
    const result = await saveSupabaseOpenInvitation(weddingId, {
      ...draft,
      expiresAt: useExpiry ? draft.expiresAt : null,
    }, { client: dataClient });
    setIsSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    const refreshed = await refreshInvitations();
    if (refreshed) {
      setDraft(null);
      setNotice(draft.id ? 'Open Invitation updated.' : 'Open Invitation created.');
    }
  };

  const updateStatus = async (invitation: OpenInvitation) => {
    if (!weddingId) return;
    setBusyInvitationId(invitation.id);
    setError('');
    setNotice('');
    const result = await saveSupabaseOpenInvitation(weddingId, {
      id: invitation.id,
      label: invitation.label,
      category: invitation.category,
      isActive: !invitation.isActive,
      maxPartySize: invitation.maxPartySize,
      showInviteeCount: invitation.showInviteeCount,
      mealPreferenceEnabled: invitation.mealPreferenceEnabled,
      expiresAt: invitation.expiresAt,
      eventIds: invitation.eventIds,
    }, { client: dataClient });
    setBusyInvitationId('');
    if (result.error) {
      setError(result.error);
      return;
    }
    await refreshInvitations();
    setNotice(invitation.isActive ? 'Open Invitation paused.' : 'Open Invitation activated.');
  };

  const regenerateCode = async (invitation: OpenInvitation) => {
    if (!weddingId) return;
    const confirmed = window.confirm('Create a new link? The current Open Invitation link will stop working immediately.');
    if (!confirmed) return;

    setBusyInvitationId(invitation.id);
    setError('');
    setNotice('');
    const result = await regenerateSupabaseOpenInvitationCode(weddingId, invitation.id, { client: dataClient });
    setBusyInvitationId('');
    if (result.error) {
      setError(result.error);
      return;
    }
    await refreshInvitations();
    setNotice('A new Open Invitation link was created.');
  };

  const removeInvitation = async (invitation: OpenInvitation) => {
    if (!weddingId) return;
    const confirmed = window.confirm('Delete this Open Invitation? Submitted guests and their RSVP responses will be kept.');
    if (!confirmed) return;

    setBusyInvitationId(invitation.id);
    setError('');
    setNotice('');
    const result = await deleteSupabaseOpenInvitation(weddingId, invitation.id, { client: dataClient });
    setBusyInvitationId('');
    if (result.error) {
      setError(result.error);
      return;
    }
    if (draft?.id === invitation.id) setDraft(null);
    await refreshInvitations();
    setNotice('Open Invitation deleted. Existing guest and RSVP records were kept.');
  };

  const copyLink = async (invitation: OpenInvitation) => {
    const url = `${window.location.origin}/${weddingSlug}/open/${invitation.inviteCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice('Open Invitation link copied.');
      setError('');
    } catch {
      setError('Could not copy the link. Select and copy it manually.');
    }
  };

  if (!weddingId) {
    return (
      <div className="open-invitations-empty">
        <Link2 size={22} aria-hidden="true" />
        <p>Open Invitations require a saved Supabase wedding.</p>
      </div>
    );
  }

  return (
    <div className="open-invitations">
      <div className="open-invitations-intro">
        <div>
          <h3>Reusable links for groups</h3>
          <p>Create one link for a team, friends group, or wider audience. Each response becomes a normal guest with a personal invite link and RSVP history.</p>
        </div>
        {!draft && (
          <button className="dashboard-primary-btn" type="button" onClick={startCreate} disabled={events.length === 0}>
            <Plus size={18} aria-hidden="true" />
            Create open invitation
          </button>
        )}
      </div>

      {notice && <div className="open-invitations-notice" role="status"><CheckCircle2 size={18} aria-hidden="true" />{notice}</div>}
      {error && <div className="open-invitations-error" role="alert">{error}</div>}

      {draft && (
        <section className="open-invitation-editor" aria-label={draft.id ? 'Edit Open Invitation' : 'Create Open Invitation'}>
          <div className="open-invitation-editor-heading">
            <div>
              <span>{draft.id ? 'Edit link' : 'New link'}</span>
              <h3>{draft.id ? invitationById.get(draft.id)?.label ?? 'Open Invitation' : 'Open Invitation details'}</h3>
            </div>
            <button type="button" className="open-invitation-text-button" onClick={() => setDraft(null)}>Cancel</button>
          </div>

          <div className="open-invitation-form-grid">
            <label className="dashboard-field">
              <span>Invitation name</span>
              <input value={draft.label} maxLength={80} placeholder="Friends group" onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
              <small>Only visible in your dashboard.</small>
            </label>
            <label className="dashboard-field">
              <span>Guest category</span>
              <input value={draft.category} maxLength={80} placeholder="Friends" onChange={(event) => setDraft({ ...draft, category: event.target.value })} />
              <small>Applied to guests who respond through this link.</small>
            </label>
            {draft.showInviteeCount && (
              <label className="dashboard-field">
                <span>Maximum group size</span>
                <select value={draft.maxPartySize} onChange={(event) => setDraft({ ...draft, maxPartySize: Number(event.target.value) })}>
                  {Array.from({ length: 20 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}
                </select>
                <small>The largest group one respondent can register.</small>
              </label>
            )}
          </div>

          <fieldset className="open-invitation-event-fieldset">
            <legend>Invited events</legend>
            <p>Guests will see and answer every selected event.</p>
            <div className="open-invitation-event-grid">
              {events.map((event) => (
                <label key={event.id}>
                  <input type="checkbox" checked={draft.eventIds.includes(event.id)} onChange={() => toggleEvent(event.id)} />
                  <span>{event.eventName || 'Untitled event'}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="open-invitation-rules">
            <label className={`open-invitation-toggle${draft.showInviteeCount ? ' is-enabled' : ''}`}>
              <span><strong>Show invitee count</strong><small>Show the count on the invitation and let respondents choose how many people are included. When off, each RSVP represents one person.</small></span>
              <input type="checkbox" role="switch" checked={draft.showInviteeCount} onChange={(event) => setDraft({ ...draft, showInviteeCount: event.target.checked })} />
            </label>
            <label className={`open-invitation-toggle${draft.mealPreferenceEnabled ? ' is-enabled' : ''}`}>
              <span><strong>Ask for meal preference</strong><small>Controls the meal question for this Open Invitation only.</small></span>
              <input type="checkbox" role="switch" checked={draft.mealPreferenceEnabled} onChange={(event) => setDraft({ ...draft, mealPreferenceEnabled: event.target.checked })} />
            </label>
            <label className={`open-invitation-toggle${useExpiry ? ' is-enabled' : ''}`}>
              <span><strong>Add an expiry date</strong><small>The link stops accepting responses after this time.</small></span>
              <input type="checkbox" role="switch" checked={useExpiry} onChange={(event) => setUseExpiry(event.target.checked)} />
            </label>
            {useExpiry && (
              <label className="dashboard-field open-invitation-rule-input">
                <span>Expires at</span>
                <input type="datetime-local" value={toDateTimeLocal(draft.expiresAt)} onChange={(event) => setDraft({ ...draft, expiresAt: toIsoDate(event.target.value) })} />
              </label>
            )}
          </div>

          <div className="open-invitation-editor-actions">
            <button className="dashboard-primary-btn" type="button" disabled={isSaving} onClick={() => void saveDraft()}>{isSaving ? 'Saving...' : draft.id ? 'Save link' : 'Create link'}</button>
            <button className="dashboard-primary-btn secondary" type="button" disabled={isSaving} onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </section>
      )}

      {isLoading && <p className="open-invitations-loading" role="status">Loading Open Invitations...</p>}
      {!isLoading && invitations.length === 0 && !draft && (
        <div className="open-invitations-empty">
          <Link2 size={24} aria-hidden="true" />
          <h3>No open links yet</h3>
          <p>Create a reusable invitation link when you do not know each recipient in advance.</p>
        </div>
      )}

      {!isLoading && invitations.length > 0 && (
        <div className="open-invitation-list">
          {invitations.map((invitation) => {
            const url = `${window.location.origin}/${weddingSlug}/open/${invitation.inviteCode}`;
            const status = getInvitationStatus(invitation);
            const eventNames = invitation.eventIds.map((eventId) => events.find((event) => event.id === eventId)?.eventName).filter(Boolean).join(', ');
            const busy = busyInvitationId === invitation.id;
            return (
              <article className="open-invitation-row" key={invitation.id}>
                <div className="open-invitation-row-heading">
                  <div>
                    <span className={`open-invitation-status status-${status.toLowerCase()}`}>{status}</span>
                    <h3>{invitation.label}</h3>
                    <p>{eventNames || 'No events selected'}</p>
                  </div>
                  <button type="button" className="open-invitation-icon-button" onClick={() => startEdit(invitation)} aria-label={`Edit ${invitation.label}`} title="Edit"><Pencil size={18} aria-hidden="true" /></button>
                </div>
                <div className="open-invitation-metrics">
                  <span><strong>{invitation.responseCount}</strong> responses</span>
                  <span><strong>{invitation.registeredPeople}</strong> registered people</span>
                  <span><strong>{invitation.showInviteeCount ? 'Shown' : 'Hidden'}</strong> invitee count</span>
                  <span><strong>{invitation.showInviteeCount ? invitation.maxPartySize : 1}</strong> maximum per response</span>
                  <span><strong>{invitation.mealPreferenceEnabled ? 'On' : 'Off'}</strong> meal preference</span>
                </div>
                <div className="open-invitation-link">
                  <code>{url}</code>
                  <button type="button" onClick={() => void copyLink(invitation)}><Copy size={16} aria-hidden="true" />Copy</button>
                  <a href={url} target="_blank" rel="noreferrer"><ExternalLink size={16} aria-hidden="true" />Preview</a>
                </div>
                <div className="open-invitation-row-actions">
                  <button type="button" disabled={busy} onClick={() => void updateStatus(invitation)}>
                    {invitation.isActive ? 'Pause link' : 'Activate link'}
                  </button>
                  <button type="button" disabled={busy} onClick={() => void regenerateCode(invitation)}>
                    <RefreshCw size={16} aria-hidden="true" />
                    New link
                  </button>
                  <button className="danger" type="button" disabled={busy} onClick={() => void removeInvitation(invitation)}>
                    <Trash2 size={16} aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
