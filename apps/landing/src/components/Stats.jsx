import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/index.jsx';

const MOCK_BASE_USERS = 1247;
const MOCK_BASE_REVENUE = 12470;

function useCountUp(target, duration = 1500) {
  const [value, setValue] = useState(0);
  const startRef = useRef(null);

  useEffect(() => {
    let frame;
    const from = value;
    const delta = target - from;
    startRef.current = null;

    const step = (ts) => {
      if (startRef.current === null) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + delta * eased);
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}

export default function Stats() {
  const { t } = useT();
  const [users, setUsers] = useState(MOCK_BASE_USERS);
  const [revenue, setRevenue] = useState(MOCK_BASE_REVENUE);

  useEffect(() => {
    const id = setInterval(() => {
      const newUsers = Math.floor(Math.random() * 3) + 1;
      setUsers((u) => u + newUsers);
      setRevenue((r) => r + newUsers * 10);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const animatedUsers = useCountUp(users);
  const animatedRevenue = useCountUp(revenue);

  return (
    <section className="py-24 bg-surface-container-lowest">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-fixed text-on-primary-fixed-variant rounded-full text-xs font-semibold tracking-wide uppercase mb-4">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping"></span>
              <span className="relative inline-flex w-2 h-2 bg-primary rounded-full"></span>
            </span>
            {t('stats.badge')}
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold font-headline tracking-tight text-on-background">
            {t('stats.heading')}
          </h2>
          <p className="mt-4 text-lg text-on-surface-variant">
            {t('stats.subheading')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="relative bg-surface-container-lowest rounded-[2rem] border border-outline-variant/30 shadow-xl shadow-primary/5 p-10 overflow-hidden">
            <div className="absolute -top-16 -right-16 w-56 h-56 bg-primary/5 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="relative">
              <div className="flex items-center gap-2 text-on-surface-variant mb-3">
                <span className="material-symbols-outlined text-primary text-[20px]">group</span>
                <span className="text-sm font-label font-semibold uppercase tracking-widest">
                  {t('stats.usersLabel')}
                </span>
              </div>
              <div className="text-6xl font-extrabold font-headline tracking-tight text-on-background tabular-nums">
                {Math.floor(animatedUsers).toLocaleString('en-US')}
              </div>
              <p className="mt-3 text-sm text-on-surface-variant">
                {t('stats.usersNote')}
              </p>
            </div>
          </div>

          <div className="relative bg-surface-container-lowest rounded-[2rem] border border-outline-variant/30 shadow-xl shadow-primary/5 p-10 overflow-hidden">
            <div className="absolute -top-16 -right-16 w-56 h-56 bg-primary/5 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="relative">
              <div className="flex items-center gap-2 text-on-surface-variant mb-3">
                <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
                <span className="text-sm font-label font-semibold uppercase tracking-widest">
                  {t('stats.revenueLabel')}
                </span>
              </div>
              <div className="text-6xl font-extrabold font-headline tracking-tight text-on-background tabular-nums">
                ${Math.floor(animatedRevenue).toLocaleString('en-US')}
              </div>
              <p className="mt-3 text-sm text-on-surface-variant">
                {t('stats.revenueNote')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
