import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../../state/store';
import { useT } from '../../hooks/useT';
import { generateMarkdown } from '../../features/markdown';

export function OutputModal() {
  const feedbacks = useStore((s) => s.feedbacks);
  const lang = useStore((s) => s.lang);
  const setPopup = useStore((s) => s.setPopup);
  const showToast = useStore((s) => s.showToast);
  const t = useT();
  const md = useMemo(() => generateMarkdown(feedbacks, lang), [feedbacks, lang]);

  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast(t('copyFailed'));
    }
  };

  const close = () => setPopup(null);

  return (
    <div
      className="qa-feedback-output-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="qa-feedback-output-modal">
        <div className="qa-feedback-output-modal-header">
          <h3>{t('outputTitle', { n: feedbacks.length })}</h3>
          <button onClick={close} aria-label={t('close')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="qa-feedback-output-pre">
          <pre>{md}</pre>
        </div>
        <div className="qa-feedback-output-actions">
          <button style={{ background: '#f1f5f9', color: '#475569' }} onClick={close}>{t('close')}</button>
          <button style={{ background: '#1e293b', color: '#fff' }} onClick={copy}>
            {copied ? t('copied') : t('copyToClipboard')}
          </button>
          <button
            style={{ background: '#24292f', color: '#fff', opacity: 0.5, cursor: 'not-allowed' }}
            disabled
            title={t('stubNotPorted', { name: 'GitHub Issue' })}
          >
            {t('githubIssue')}
          </button>
        </div>
      </div>
    </div>
  );
}
