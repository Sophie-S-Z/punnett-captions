type ProgressFeedbackProps = {
  label?: string;
  description?: string;
};

export function ProgressFeedback({ label = "Loading…", description }: ProgressFeedbackProps) {
  return <div className="app-loader" role="status" aria-live="polite">
    <span className="loader-orbit" aria-hidden="true"><span /></span>
    <div><p>{label}</p>{description ? <span className="field-help">{description}</span> : null}</div>
  </div>;
}
