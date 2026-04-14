import { startCheckout } from '../lib/checkout.js';
import logoUrl from '../assets/pinthat_logo.svg';
import { useT } from '../i18n/index.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';

export default function Header() {
  const { t } = useT();
  return (
    <header className="fixed top-4 w-full z-50 px-4 pointer-events-none">
      <nav className="max-w-4xl mx-auto pointer-events-auto bg-surface-container-lowest/70 backdrop-blur-xl rounded-full border border-outline-variant/30 shadow-lg shadow-primary/5 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <a href="#" className="flex items-center gap-2">
            <img src={logoUrl} alt="Pinthat" className="w-7 h-7" />
            <span className="text-xl font-bold tracking-tighter text-primary font-headline">
              Pinthat
            </span>
          </a>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button
            onClick={startCheckout}
            className="bg-primary hover:bg-primary-container text-on-primary px-4 py-1.5 rounded-full font-headline font-semibold text-xs transition-all active:scale-95 shadow-md shadow-primary/10"
          >
            {t('nav.cta')}
          </button>
        </div>
      </nav>
    </header>
  );
}
