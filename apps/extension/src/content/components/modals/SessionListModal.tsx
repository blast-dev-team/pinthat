import { useEffect, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { useStore } from '../../state/store';
import { useT } from '../../hooks/useT';
import {
  cleanOldSessions,
  getSessionsData,
  removeSession,
} from '../../features/sessions';
import type { SavedSession } from '../../types';

const STATUS_COLORS: Record<string, string> = {
  open: '#22c55e',
  reviewing: '#f59e0b',
  closed: '#64748b',
};

export function SessionListModal() {
  const setPopup = useStore((s) => s.setPopup);
  const loadSession = useStore((s) => s.loadSession);
  const showToast = useStore((s) => s.showToast);
  const t = useT();

  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const data = await getSessionsData();
    setSessions(data.sessions);
  };

  useEffect(() => {
    (async () => {
      const removed = await cleanOldSessions();
      if (removed > 0) {
        showToast(t('sessionAutoCleanup', { n: removed }));
      }
      await refresh();
      setLoading(false);
    })();
    // refresh shouldn't run on every t change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => setPopup(null);

  const onLoad = (s: SavedSession) => {
    loadSession(s.feedbacks, s.nextId);
    showToast(t('sessionLoaded', { name: s.name }));
    // loadSession also closes the popup via set({ popup: null })
  };

  const onDelete = async (s: SavedSession) => {
    if (!confirm(t('sessionDeleteConfirm', { name: s.name }))) return;
    await removeSession(s.id);
    await refresh();
  };

  const onReview = () => {
    showToast(t('reviewNotPorted'));
  };

  return (
    <div
      className="qa-settings-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="qa-settings-modal"
        style={{ width: 400, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="qa-settings-modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderOpen size={16} strokeWidth={2} />
            {t('sessionListTitle')}
          </h3>
        </div>
        <div
          className="qa-settings-modal-body"
          style={{ overflowY: 'auto', flex: 1 }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>...</div>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>
              {t('sessionEmpty')}
            </div>
          ) : (
            sessions.map((s) => {
              const date = s.createdAt ? s.createdAt.slice(0, 10) : '';
              const count = s.feedbacks ? s.feedbacks.length : 0;
              const statusColor = STATUS_COLORS[s.status] || '#64748b';
              return (
                <div
                  key={s.id}
                  style={{ padding: '12px 0', borderBottom: '1px solid #334155' }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#e2e8f0',
                      marginBottom: 4,
                    }}
                  >
                    ▸ {s.name}
                  </div>
                  <div
                    style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}
                  >
                    {t('sessionItemsCount', { n: count })} · {date} ·{' '}
                    <span style={{ color: statusColor }}>{s.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="qa-settings-change"
                      style={{ borderColor: '#3b82f6', color: '#3b82f6' }}
                      onClick={() => onLoad(s)}
                    >
                      {t('sessionLoadBtn')}
                    </button>
                    <button
                      className="qa-settings-change"
                      style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
                      onClick={onReview}
                    >
                      {t('sessionReviewBtn')}
                    </button>
                    <button
                      className="qa-settings-change"
                      style={{ borderColor: '#ef4444', color: '#ef4444' }}
                      onClick={() => onDelete(s)}
                    >
                      {t('delete')}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="qa-settings-modal-footer">
          <button className="qa-settings-btn-close" onClick={close}>
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
