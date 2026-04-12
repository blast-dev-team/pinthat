import { startCheckout } from '../lib/checkout.js';
import { useT } from '../i18n/index.jsx';

export default function FinalCTA() {
  const { t } = useT();
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-gradient-to-br from-primary to-primary-container rounded-[2rem] p-12 md:p-24 text-center text-on-primary relative overflow-hidden">
          <div className="relative z-10 space-y-10">
            <h2 className="text-4xl md:text-6xl font-extrabold font-headline tracking-tight max-w-4xl mx-auto leading-tight">
              {t('finalCTA.heading')}
            </h2>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <button
                onClick={startCheckout}
                className="bg-white text-primary px-10 py-5 rounded font-headline font-bold text-xl hover:bg-on-primary-container transition-all active:scale-95 shadow-2xl flex items-center gap-3"
              >
                <span className="material-symbols-outlined">extension</span>
                {t('finalCTA.cta')}
              </button>
            </div>
          </div>
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg
              className="w-full h-full"
              viewBox="0 0 800 400"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 200 Q 200 100 400 200 T 800 200"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M0 250 Q 200 150 400 250 T 800 250"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M0 150 Q 200 50 400 150 T 800 150"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
