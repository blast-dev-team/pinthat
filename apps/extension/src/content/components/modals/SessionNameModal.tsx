import { useEffect, useRef, useState } from 'react';
import { Save } from 'lucide-react';
import { useStore } from '../../state/store';
import { useT } from '../../hooks/useT';
import { addSession } from '../../features/sessions';

export function SessionNameModal() {
  const feedbacks = useStore((s) => s.feedbacks);
  const nextId = useStore((s) => s.nextId);
  const setPopup = useStore((s) => s.setPopup);
  const showToast = useStore((s) => s.showToast);
  const t = useT();

  const inputRef = useRef<HTMLInputElement>(null);

  const defaultName = (() => {
    const pageName = location.pathname.split('/').pop() || 'index.html';
    const today = new Date().toISOString().slice(0, 10);
    return `${pageName} — ${today}`;
  })();

  const [name, setName] = useState(defaultName);

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  }, []);

  const close = () => setPopup(null);

  const save = async () => {
    const finalName = name.trim() || defaultName;
    // Strip the live el reference (it's not in the type, but defensive).
    const sanitized = feedbacks.map((fb) => ({ ...fb }));
    await addSession(finalName, sanitized, nextId);
    showToast(t('sessionSaved'));
    close();
  };

  return (
    <div
      className="qa-settings-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="qa-settings-modal" style={{ width: 340 }}>
        <div className="qa-settings-modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Save size={16} strokeWidth={2} />
            {t('sessionSaveTitle')}
          </h3>
        </div>
        <div className="qa-settings-modal-body">
          <div style={{ marginBottom: 12, fontSize: 13, color: '#94a3b8' }}>
            {t('sessionSaveDesc', { n: feedbacks.length })}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={name}
            placeholder={t('sessionNamePlaceholder')}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') close();
            }}
            style={{
              width: '100%',
              padding: 10,
              border: '1px solid #475569',
              borderRadius: 8,
              background: '#0f172a',
              color: '#e2e8f0',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
        </div>
        <div className="qa-settings-modal-footer">
          <button className="qa-settings-btn-close" onClick={close}>
            {t('cancel')}
          </button>
          <button className="qa-settings-btn-save" onClick={save}>
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
