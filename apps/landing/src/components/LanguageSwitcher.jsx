import { useT } from '../i18n/index.jsx';

const LABELS = {
  en: 'EN',
  ko: 'KO',
};

export default function LanguageSwitcher() {
  const { lang, setLang, supported } = useT();

  return (
    <div
      className="flex items-center gap-0.5 bg-surface-container-low/70 rounded-full p-0.5 border border-outline-variant/30"
      role="group"
      aria-label="Language"
    >
      {supported.map((code) => {
        const active = code === lang;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={active}
            className={
              'px-2.5 py-1 rounded-full font-headline font-semibold text-[11px] tracking-wide transition-all ' +
              (active
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-primary')
            }
          >
            {LABELS[code] || code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
