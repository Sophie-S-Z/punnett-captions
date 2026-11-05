type LabLoaderProps = {
  label?: string;
  description?: string;
};

export function LabLoader({ label = "Loading…", description }: LabLoaderProps) {
  return <div className="lab-loader" role="status" aria-live="polite">
    <span className="loader-orbit" aria-hidden="true"><span /></span>
    <div><p>{label}</p>{description ? <span className="field-help">{description}</span> : null}</div>
  </div>;
}
