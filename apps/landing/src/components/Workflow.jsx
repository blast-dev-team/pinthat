import { useT } from '../i18n/index.jsx';

const STEP_IMAGES = [
  '/step1.png',
  '/step2.png',
  '/step3.png',
  '/step4.png',
  '/step5.png',
];

export default function Workflow() {
  const { t } = useT();
  const steps = t('workflow.steps');
  return (
    <section id="workflow" className="py-32 bg-surface-container-low">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-4xl font-extrabold font-headline tracking-tight">
            {t('workflow.heading')}
          </h2>
          <p className="mt-4 text-on-surface-variant text-lg">
            {t('workflow.subheading')}
          </p>
        </div>

        <div className="flex flex-col gap-24">
          {steps.map((step, i) => {
            const isEven = i % 2 === 0;
            return (
              <div
                key={step.title}
                className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-10 md:gap-16`}
              >
                {/* Image */}
                <div className="w-full md:w-2/5 flex justify-center">
                  <div className="relative rounded-2xl overflow-hidden border border-outline-variant/15 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white max-w-sm">
                    <img
                      src={STEP_IMAGES[i]}
                      alt={step.title}
                      className="w-full h-auto object-contain"
                    />
                  </div>
                </div>

                {/* Text */}
                <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left">
                  <div className="w-10 h-10 bg-primary text-on-primary rounded-full flex items-center justify-center font-bold text-sm shadow-lg shadow-primary/20 mb-4">
                    {i + 1}
                  </div>
                  <h4 className="text-2xl font-bold font-headline mb-3">
                    {step.title}
                  </h4>
                  <p className="text-base text-on-surface-variant leading-relaxed max-w-md whitespace-pre-line">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
