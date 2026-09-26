type LoadingStateProps = {
  message?: string;
};

export function LoadingState({
  message = "Cargando inspecciones...",
}: LoadingStateProps) {
  return (
    <div className="state-panel" role="status" aria-live="polite">
      <span className="loader" aria-hidden="true" />
      <h2>{message}</h2>
      <p>Estamos preparando los registros sintéticos.</p>
    </div>
  );
}