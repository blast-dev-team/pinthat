import { X, Trash2 } from 'lucide-react';
import { useStore } from '../../state/store';
import { useT } from '../../hooks/useT';

/**
 * Shows the list of currently-pinned feedback elements (the "selected
 * elements" in the panel). Click a row to open that feedback's edit popup,
 * or use the trash icon to remove it.
 */
export function SelectedListPopup() {
  const feedbacks = useStore((s) => s.feedbacks);
  const setPopup = useStore((s) => s.setPopup);
  const removeFeedback = useStore((s) => s.removeFeedback);
  const t = useT();

  const close = () => setPopup(null);

  return (
    <div
      className="qa-feedback-output-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="qa-feedback-output-modal"
        style={{ maxWidth: 480, maxHeight: '70vh' }}
      >
        <div className="qa-feedback-output-modal-header">
          <h3>
            {t('btnSelectedListTitle')} ({feedbacks.length})
          </h3>
          <button onClick={close} aria-label={t('close')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="qa-feedback-output-pre" style={{ padding: '8px 12px' }}>
          {feedbacks.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: 'var(--qa-muted)',
                padding: '24px 0',
                fontSize: 13,
              }}
            >
              {t('btnSelectedListEmpty')}
            </div>
          ) : (
            <ul className="qa-selected-list">
              {feedbacks.map((fb, idx) => (
                <li key={fb.id} className="qa-selected-item">
                  <button
                    className="qa-selected-item-main"
                    onClick={() => setPopup({ kind: 'edit', feedbackId: fb.id })}
                  >
                    <span className="qa-selected-item-index">{idx + 1}</span>
                    <span className="qa-selected-item-body">
                      <span className="qa-selected-item-type">{fb.fbType}</span>
                      <span className="qa-selected-item-sel">{fb.selector}</span>
                      {fb.feedback && (
                        <span className="qa-selected-item-fb">{fb.feedback}</span>
                      )}
                    </span>
                  </button>
                  <button
                    className="qa-selected-item-del"
                    onClick={() => removeFeedback(fb.id)}
                    aria-label={t('delete')}
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
