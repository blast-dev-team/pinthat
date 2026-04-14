import { useT } from '../i18n/index.jsx';

const LOGOS = [
  { name: 'Claude', src: '/claude_logo.jpeg' },
  { name: 'ChatGPT', src: '/gpt.webp' },
  { name: 'Google', src: '/google_antigravity_logo.jpeg' },
];

export default function SocialProof() {
  const { t } = useT();
  return (
    <section className="py-12 bg-surface-container-low">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <p className="text-sm font-label font-medium uppercase tracking-widest text-on-surface-variant mb-10">
          {t('socialProof.heading')}
        </p>
        <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24">
          {LOGOS.map(({ name, src }) => (
            <img
              key={name}
              src={src}
              alt={name}
              className="h-8 object-contain opacity-70 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-200"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
