import Link from "next/link";
import { AppShell } from "../../../components/app-shell";
import { inspections } from "../../../lib/data/inspections";

type InspectionDetailPageProps = {
  params: { id: string };
};

export default function InspectionDetailPage({ params }: InspectionDetailPageProps) {
  const inspection = inspections.find((record) => record.id === params.id);

  return (
    <AppShell>
      <main className="page-shell">
        {inspection ? (
          <article className="detail-panel">
            <p className="eyebrow">Detalle · renderizado en servidor</p>
            <span className={`badge badge-${inspection.status}`}>
              {inspection.statusLabel}
            </span>
            <h1>{inspection.location}</h1>
            <p className="detail-summary">{inspection.summary}</p>
            <dl className="detail-list">
              <div><dt>Fecha</dt><dd>{inspection.date}</dd></div>
              <div><dt>Responsable</dt><dd>{inspection.inspector}</dd></div>
              <div><dt>Hallazgos</dt><dd>{inspection.findings}</dd></div>
              <div><dt>Identificador</dt><dd>{inspection.id}</dd></div>
            </dl>
            <Link className="text-link" href="/inspecciones">Volver al listado</Link>
          </article>
        ) : (
          <section className="state-panel state-error" role="alert">
            <span className="state-icon" aria-hidden="true">!</span>
            <h1>Inspección no encontrada</h1>
            <p>No existe un registro sintético con el identificador solicitado.</p>
            <Link className="button-link" href="/inspecciones">Volver al listado</Link>
          </section>
        )}
      </main>
    </AppShell>
  );
}