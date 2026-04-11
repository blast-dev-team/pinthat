import { startCheckout } from '../lib/checkout.js';
import { useT } from '../i18n/index.jsx';

export default function Pricing() {
  const { t } = useT();
  const features = t('pricing.features');
  return (
    <section id="pricing" className="py-32 bg-surface">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-label font-semibold uppercase tracking-widest text-primary mb-3">
            {t('pricing.eyebrow')}
          </p>
          <h2 className="text-5xl font-extrabold font-headline tracking-tight text-on-background">
            {t('pricing.heading')}
          </h2>
          <p className="mt-5 text-lg text-on-surface-variant">
            {t('pricing.subheading')}
          </p>
        </div>

        <div className="relative bg-surface-container-lowest rounded-[2rem] border border-outline-variant/30 shadow-xl shadow-primary/5 p-10 md:p-14 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/5 blur-[100px] rounded-full pointer-events-none"></div>

          <div className="relative flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-fixed text-on-primary-fixed-variant rounded-full text-xs font-semibold tracking-wide uppercase mb-6">
              <span className="w-2 h-2 bg-primary rounded-full"></span>
              {t('pricing.badge')}
            </div>

            <h3 className="text-2xl font-bold font-headline text-on-surface mb-2">
              {t('pricing.planName')}
            </h3>
            <p className="text-on-surface-variant mb-8 max-w-md">
              {t('pricing.planTagline')}
            </p>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-7xl font-extrabold font-headline tracking-tight text-on-background">
                $10
              </span>
              <span className="text-lg text-on-surface-variant font-medium">
                {t('pricing.priceSuffix')}
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mb-10">
              {t('pricing.priceNote')}
            </p>

            <ul className="w-full max-w-md space-y-3 mb-10 text-left">
              {features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3 text-on-surface"
                >
                  <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                    check_circle
                  </span>
                  <span className="text-base leading-relaxed">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={startCheckout}
              className="w-full max-w-md bg-primary hover:bg-primary-container text-on-primary px-8 py-4 rounded font-headline font-bold text-lg transition-all active:scale-95 shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
            >
              {t('pricing.cta')}
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>

            <p className="mt-5 text-xs text-on-surface-variant">
              {t('pricing.secure')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
