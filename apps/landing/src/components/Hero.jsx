import { startCheckout } from '../lib/checkout.js';
import { useT } from '../i18n/index.jsx';

export default function Hero() {
  const { t } = useT();
  return (
    <section className="relative pt-24 pb-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-16 items-center">
        <div className="lg:col-span-6 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-container/30 text-on-secondary-container rounded-full text-xs font-semibold tracking-wide uppercase">
            <span className="w-2 h-2 bg-primary rounded-full"></span>
            {t('hero.badge')}
          </div>
          <h1 className="text-6xl font-extrabold font-headline leading-[1.1] tracking-tight text-on-background">
            {t('hero.titleBefore')}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-container">
              {t('hero.titleAccent')}
            </span>
            {t('hero.titleAfter')}
          </h1>
          <p className="text-xl text-on-surface-variant max-w-lg leading-relaxed">
            {t('hero.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={startCheckout}
              className="bg-primary hover:bg-primary-container text-on-primary px-8 py-4 rounded font-headline font-bold text-lg transition-all active:scale-95 shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
            >
              <span className="material-symbols-outlined">extension</span>
              {t('hero.ctaPrimary')}
            </button>
            <a
              href="#workflow"
              className="bg-surface-container-low hover:bg-surface-container text-on-surface px-8 py-4 rounded font-headline font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">play_circle</span>
              {t('hero.ctaSecondary')}
            </a>
          </div>
        </div>
        <div className="lg:col-span-6 relative">
          <div className="relative z-10 rounded-xl overflow-hidden shadow-2xl shadow-primary/10 bg-surface-container-lowest p-2 border border-outline-variant/15">
            <div className="absolute top-4 right-4 z-20 w-48 bg-surface-container-lowest rounded-lg shadow-xl border border-outline-variant/40 p-4 transform translate-x-4 -translate-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                  <span className="material-symbols-outlined text-[14px] text-white">
                    pin_drop
                  </span>
                </div>
                <span className="text-xs font-bold">{t('hero.mockCardTitle')}</span>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full bg-surface-container rounded"></div>
                <div className="h-2 w-3/4 bg-surface-container rounded"></div>
                <button className="w-full py-1.5 bg-primary text-[10px] text-white rounded font-bold">
                  {t('hero.mockCopyPrompt')}
                </button>
              </div>
            </div>
            <div className="rounded-lg w-full aspect-[4/3] bg-gradient-to-br from-primary-fixed via-surface-container to-secondary-fixed flex items-center justify-center">
              <div className="bg-surface-container-lowest/85 backdrop-blur rounded-lg p-6 shadow-xl w-3/4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-surface-container-high rounded"></div>
                  <div className="h-3 w-5/6 bg-surface-container-high rounded"></div>
                  <div className="h-3 w-4/6 bg-primary/30 rounded ring-2 ring-primary ring-offset-2"></div>
                  <div className="h-3 w-3/4 bg-surface-container-high rounded"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/5 blur-[100px] rounded-full -z-10"></div>
        </div>
      </div>
    </section>
  );
}
