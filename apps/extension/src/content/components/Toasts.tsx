import { useStore } from '../state/store';

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <>
      {toasts.map((t, i) => (
        <div
          key={t.id}
          className="qa-feedback-toast"
          style={{ top: 20 + i * 42 }}
        >
          {t.message}
        </div>
      ))}
    </>
  );
}
