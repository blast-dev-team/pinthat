import { useT } from '../i18n/index.jsx';

const LOGOS = ['Claude', 'Cursor', 'ChatGPT', 'GitHub Copilot'];

export default function SocialProof() {
  const { t } = useT();
  return (
    <section className="py-12 bg-surface-container-low">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <p className="text-sm font-label font-medium uppercase tracking-widest text-on-surface-variant mb-10">
          {t('socialProof.heading')}
        </p>
        <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 text-on-surface-variant">
          {LOGOS.map((name) => (
            <span
              key={name}
              className="font-headline font-bold text-xl tracking-tight"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
