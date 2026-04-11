import { useT } from '../i18n/index.jsx';

export default function Workflow() {
  const { t } = useT();
  const steps = t('workflow.steps');
  return (
    <section id="workflow" className="py-32 bg-surface-container-low">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-24">
          <h2 className="text-4xl font-extrabold font-headline tracking-tight">
            {t('workflow.heading')}
          </h2>
          <p className="mt-4 text-on-surface-variant text-lg">
            {t('workflow.subheading')}
          </p>
        </div>
        <div className="grid lg:grid-cols-5 md:grid-cols-3 sm:grid-cols-2 gap-8 relative">
          <div className="hidden lg:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-primary/5 via-primary/20 to-primary/5 -z-0"></div>

          {steps.map((step, i) => (
            <div
              key={step.title}
              className="relative z-10 bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/10 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-primary text-on-primary rounded-full flex items-center justify-center font-bold mb-6 text-xl shadow-lg shadow-primary/20">
                {i + 1}
              </div>
              <h4 className="text-lg font-bold font-headline mb-3">
                {step.title}
              </h4>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
