import { useT } from '../i18n/index.jsx';

const LINKS = [
  { href: '/privacy.html', key: 'privacy' },
  {
    href: 'https://github.com/blast-dev-team/pinthat',
    key: 'github',
    external: true,
  },
  { href: 'mailto:el.lee@blast-team.com', key: 'contact' },
];

export default function Footer() {
  const { t } = useT();
  return (
    <footer className="w-full border-t border-outline-variant/40 bg-surface-container-low">
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-8 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="space-y-2 text-center md:text-left">
          <span className="font-headline font-bold text-on-surface text-lg">
            Pinthat
          </span>
          <p className="font-body text-xs uppercase tracking-widest text-on-surface-variant">
            {t('footer.tagline')}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          {LINKS.map((link) => (
            <a
              key={link.key}
              href={link.href}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noreferrer' : undefined}
              className="font-body text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
            >
              {t(`footer.links.${link.key}`)}
            </a>
          ))}
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 pb-8 flex justify-center">
        <p className="font-body text-xs tracking-wide text-on-surface-variant inline-flex items-center gap-1.5">
          <span
            className="material-symbols-outlined text-[14px] text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            favorite
          </span>
          {t('footer.builtBy')}
        </p>
      </div>
    </footer>
  );
}
