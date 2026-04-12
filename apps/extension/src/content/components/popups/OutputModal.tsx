import { useMemo, useState } from 'react';
import { X, Download, Terminal } from 'lucide-react';
import { useStore } from '../../state/store';
import { useT } from '../../hooks/useT';
import { generateMarkdown } from '../../features/markdown';
import { circled } from '../../utils/dom';

export function OutputModal() {
  const feedbacks = useStore((s) => s.feedbacks);
  const lang = useStore((s) => s.lang);
  const setPopup = useStore((s) => s.setPopup);
  const showToast = useStore((s) => s.showToast);
  const resetFeedbacks = useStore((s) => s.resetFeedbacks);
  const t = useT();

  const [mode, setMode] = useState<'all' | 'single'>('all');
  const [selectedId, setSelectedId] = useState<number | null>(
    feedbacks.length > 0 ? feedbacks[0].id : null,
  );
  const [clearAfterExport, setClearAfterExport] = useState(false);
  const [promptWrap, setPromptWrap] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const activeFeedbacks = useMemo(() => {
    if (mode === 'all') return feedbacks;
    const fb = feedbacks.find((f) => f.id === selectedId);
    return fb ? [fb] : [];
  }, [mode, feedbacks, selectedId]);

  const md = useMemo(
    () => generateMarkdown(activeFeedbacks, lang),
    [activeFeedbacks, lang],
  );

  const exportText = useMemo(() => {
    if (!promptWrap) return md;
    return t('promptWrapPrefix') + md + t('promptWrapSuffix');
  }, [md, promptWrap, t]);

  const handleAfterExport = () => {
    if (clearAfterExport) {
      resetFeedbacks();
      setPopup(null);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      handleAfterExport();
    } catch {
      showToast(t('copyFailed'));
    }
  };

  const downloadMd = async () => {
    try {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const filename = `qa-feedback-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.md`;

      await chrome.runtime.sendMessage({
        action: 'download-md',
        content: exportText,
        filename,
      });
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 1500);
      handleAfterExport();
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
          <h3>{t('outputTitle', { n: activeFeedbacks.length })}</h3>
          <button onClick={close} aria-label={t('close')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Mode toggle + options */}
        <div className="qa-feedback-output-options">
          <div className="qa-feedback-output-mode-toggle">
            <button
              className={`qa-feedback-output-mode-btn${mode === 'all' ? ' active' : ''}`}
              onClick={() => setMode('all')}
            >
              {t('outputExportAll')}
            </button>
            <button
              className={`qa-feedback-output-mode-btn${mode === 'single' ? ' active' : ''}`}
              onClick={() => setMode('single')}
            >
              {t('outputExportSingle')}
            </button>
          </div>

          {mode === 'single' && feedbacks.length > 0 && (
            <div className="qa-feedback-output-single-list">
              {feedbacks.map((fb, i) => (
                <button
                  key={fb.id}
                  className={`qa-feedback-output-single-item${selectedId === fb.id ? ' active' : ''}`}
                  onClick={() => setSelectedId(fb.id)}
                >
                  <span className="qa-feedback-output-single-num">{circled(i + 1)}</span>
                  <span className="qa-feedback-output-single-label">
                    {fb.fbType ? `[${fb.fbType}] ` : ''}
                    {fb.tagName || fb.selector}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="qa-feedback-output-checkboxes">
            <label className="qa-feedback-output-clear-label">
              <input
                type="checkbox"
                checked={clearAfterExport}
                onChange={(e) => setClearAfterExport(e.target.checked)}
              />
              {t('outputClearAfterExport')}
            </label>
            <label className="qa-feedback-output-clear-label">
              <input
                type="checkbox"
                checked={promptWrap}
                onChange={(e) => setPromptWrap(e.target.checked)}
              />
              <Terminal size={13} strokeWidth={2} />
              {t('promptWrapLabel')}
            </label>
          </div>
        </div>

        <div className="qa-feedback-output-pre">
          <pre>{exportText}</pre>
        </div>

        <div className="qa-feedback-output-actions">
          <button className="qa-feedback-output-btn-close" onClick={close}>
            {t('close')}
          </button>
          <button className="qa-feedback-output-btn-download" onClick={downloadMd}>
            <Download size={14} strokeWidth={2} />
            {downloaded ? t('downloadMdDone') : t('downloadMd')}
          </button>
          <button className="qa-feedback-output-btn-copy" onClick={copy}>
            {copied ? t('copied') : t('copyToClipboard')}
          </button>
        </div>
      </div>
    </div>
  );
}
