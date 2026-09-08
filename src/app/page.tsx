import { AppShell } from "../components/app-shell";
import { inspections } from "../lib/data/inspections";

type PageProps = {
  searchParams?: { estado?: string };
};

function EmptyState() {
  return (
    <div className="state-panel" role="status">
      <span className="state-icon" aria-hidden="true">-</span>
      <h2>No hay inspecciones</h2>
      <p>No se encontraron registros para mostrar en este momento.</p>
      <a className="text-link" href="/">Volver al inicio</a>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="state-panel state-error" role="alert">
      <span className="state-icon" aria-hidden="true">!</span>
      <h2>No pudimos cargar las inspecciones</h2>
      <p>La consulta no está disponible. Intenta nuevamente desde el inicio.</p>
      <a className="button-link" href="/">Reintentar</a>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="state-panel" role="status" aria-live="polite">
      <span className="loader" aria-hidden="true" />
      <h2>Cargando inspecciones</h2>
      <p>Estamos preparando los registros sintéticos.</p>
    </div>
  );
}

function InspectionList() {
  return (
    <div className="inspection-grid">
      {inspections.map((inspection) => (
        <article className="inspection-card" key={inspection.id}>
          <div className="card-topline">
            <span className={`badge badge-${inspection.status}`}>{inspection.statusLabel}</span>
            <span className="muted">{inspection.date}</span>
          </div>
          <h3>{inspection.location}</h3>
          <p>{inspection.summary}</p>
          <dl>
            <div>
              <dt>Responsable</dt>
              <dd>{inspection.inspector}</dd>
            </div>
            <div>
              <dt>Hallazgos</dt>
              <dd>{inspection.findings}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

export default function HomePage({ searchParams }: PageProps) {
  const state = searchParams?.estado;

  return (
    <AppShell>
      <main className="page-shell">
        <header className="hero">
          <p className="eyebrow">Proyecto integrador · Semana 2</p>
          <h1>Inspecciones de laboratorio</h1>
          <p className="lead">
            Un shell instalable para consultar mantenimiento con conectividad intermitente.
            Los datos mostrados son sintéticos.
          </p>
          <span className="status">Shell listo para instalar · Sin conexión offline todavía</span>
        </header>

        <section aria-labelledby="inspections-heading" className="content-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Datos de demostración</p>
              <h2 id="inspections-heading">Inspecciones recientes</h2>
            </div>
            <span className="count">{inspections.length} registros</span>
          </div>

          {state === "cargando" && <LoadingState />}
          {state === "error" && <ErrorState />}
          {state === "vacio" && <EmptyState />}
          {!state && <InspectionList />}
        </section>
      </main>
    </AppShell>
  );
}
