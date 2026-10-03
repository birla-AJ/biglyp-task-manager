export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="center-block" role="status" aria-live="polite">
      <div className="spinner" />
      <p className="muted">{label}</p>
    </div>
  );
}
