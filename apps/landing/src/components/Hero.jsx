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
          <h1 className="text-6xl font-extrabold font-headline leading-[1.1] tracking-tight text-on-background whitespace-pre-line">
            {t('hero.titleBefore')}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-container">
              {t('hero.titleAccent')}
            </span>
            {t('hero.titleAfter')}
          </h1>
          <p className="text-xl text-on-surface-variant max-w-lg leading-relaxed whitespace-pre-line">
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
          </div>
        </div>
        <div className="lg:col-span-6 relative">
          <div className="relative z-10 rounded-xl overflow-hidden shadow-2xl shadow-primary/10 bg-surface-container-lowest p-2 border border-outline-variant/15">
            <video
              className="rounded-lg w-full"
              autoPlay
              loop
              muted
              playsInline
              src="/PinThatDemo.mp4"
            />
          </div>
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/5 blur-[100px] rounded-full -z-10"></div>
        </div>
      </div>
    </section>
  );
}
