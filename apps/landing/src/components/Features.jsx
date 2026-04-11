import { useT } from '../i18n/index.jsx';

export default function Features() {
  const { t } = useT();
  return (
    <section id="features" className="py-32 bg-surface">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-20 text-center max-w-3xl mx-auto">
          <h2 className="text-4xl font-extrabold font-headline tracking-tight mb-6">
            {t('features.heading')}
          </h2>
          <p className="text-lg text-on-surface-variant">
            {t('features.subheading')}
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Feature Card 1 */}
          <div className="md:col-span-2 p-10 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 flex flex-col justify-between group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
            <div className="space-y-6">
              <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-3xl">
                  ads_click
                </span>
              </div>
              <h3 className="text-2xl font-bold font-headline">
                {t('features.card1.title')}
              </h3>
              <p className="text-on-surface-variant leading-relaxed max-w-md">
                {t('features.card1.desc')}
              </p>
            </div>
            <div className="mt-12 rounded-lg overflow-hidden border border-outline-variant/10 bg-surface-container-low aspect-[16/6] flex items-center justify-center">
              <div className="grid grid-cols-5 gap-3 p-6 w-full max-w-md">
                <div className="aspect-square bg-primary/20 rounded"></div>
                <div className="aspect-square bg-primary rounded ring-4 ring-primary/30"></div>
                <div className="aspect-square bg-primary/20 rounded"></div>
                <div className="aspect-square bg-primary/20 rounded"></div>
                <div className="aspect-square bg-primary/20 rounded"></div>
              </div>
            </div>
          </div>
          {/* Feature Card 2 */}
          <div className="p-10 bg-primary rounded-xl flex flex-col justify-between text-on-primary shadow-xl shadow-primary/20">
            <div className="space-y-6">
              <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">
                  psychology
                </span>
              </div>
              <h3 className="text-2xl font-bold font-headline">
                {t('features.card2.title')}
              </h3>
              <p className="text-on-primary/80 leading-relaxed">
                {t('features.card2.desc')}
              </p>
            </div>
            <div className="mt-8 space-y-3">
              <div className="h-2 w-full bg-white/20 rounded-full"></div>
              <div className="h-2 w-2/3 bg-white/20 rounded-full"></div>
              <div className="h-2 w-4/5 bg-white/20 rounded-full"></div>
            </div>
          </div>
          {/* Feature Card 3 */}
          <div className="p-10 bg-surface-container-low rounded-xl border border-outline-variant/10 space-y-6">
            <div className="w-14 h-14 bg-tertiary/10 rounded-lg flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-3xl">brush</span>
            </div>
            <h3 className="text-2xl font-bold font-headline">
              {t('features.card3.title')}
            </h3>
            <p className="text-on-surface-variant leading-relaxed">
              {t('features.card3.desc')}
            </p>
          </div>
          {/* Feature Card 4 */}
          <div className="md:col-span-2 p-10 bg-surface-container-lowest rounded-xl border border-outline-variant/10 flex items-center gap-10">
            <div className="w-1/2 space-y-4">
              <h3 className="text-2xl font-bold font-headline">
                {t('features.card4.title')}
              </h3>
              <p className="text-on-surface-variant leading-relaxed">
                {t('features.card4.desc')}
              </p>
            </div>
            <div className="w-1/2 bg-surface-container-low rounded-lg p-4">
              <div className="grid grid-cols-4 gap-2">
                <div className="aspect-square bg-primary-fixed rounded"></div>
                <div className="aspect-square bg-outline-variant/30 rounded"></div>
                <div className="aspect-square bg-outline-variant/30 rounded"></div>
                <div className="aspect-square bg-primary-fixed rounded"></div>
                <div className="aspect-square bg-outline-variant/30 rounded"></div>
                <div className="aspect-square bg-tertiary-fixed rounded"></div>
                <div className="aspect-square bg-outline-variant/30 rounded"></div>
                <div className="aspect-square bg-outline-variant/30 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
