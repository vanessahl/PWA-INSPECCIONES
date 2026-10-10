import Link from "next/link";
import { AppShell } from "../../../components/app-shell";
import { inspections } from "../../../lib/data/inspections";
import { LocalInspectionDetail } from "../../../components/local-inspection-detail";

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
          <div aria-label="Inspección no encontrada" role="alert">
            <LocalInspectionDetail id={params.id} />
          </div>
        )}
      </main>
    </AppShell>
  );
}