"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { StoredInspection } from "../lib/storage/schema";
import { createSyncStore } from "../lib/sync/queue";

export function LocalInspectionDetail({ id }: { id: string }) {
  const [record, setRecord] = useState<StoredInspection | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void createSyncStore().listLocal()
      .then((records) => setRecord(records.find((candidate) => candidate.inspection.id === id) ?? null))
      .finally(() => setLoaded(true));
  }, [id]);

  if (!loaded) {
    return <section className="state-panel" role="status"><h1>Cargando detalle</h1></section>;
  }

  if (!record) {
    return (
      <section className="state-panel state-error" role="alert">
        <span className="state-icon" aria-hidden="true">!</span>
        <h1>Inspección no encontrada</h1>
        <p>No existe un registro sintético con el identificador solicitado.</p>
        <Link className="button-link" href="/inspecciones">Volver al listado</Link>
      </section>
    );
  }

  const { inspection } = record;
  return (
    <article className="detail-panel">
      <p className="eyebrow">Detalle · guardado en este dispositivo</p>
      <span className={`badge badge-${inspection.status}`}>{inspection.statusLabel}</span>
      <h1>{inspection.location}</h1>
      <p className="detail-summary">{inspection.summary}</p>
      <dl className="detail-list">
        <div><dt>Fecha</dt><dd>{inspection.date}</dd></div>
        <div><dt>Responsable</dt><dd>{inspection.inspector}</dd></div>
        <div><dt>Hallazgos</dt><dd>{inspection.findings}</dd></div>
        <div><dt>Sincronización</dt><dd>{record.syncStatus === "pending" ? "Pendiente" : "Sincronizada"}</dd></div>
        <div><dt>Identificador</dt><dd>{inspection.id}</dd></div>
      </dl>
      <Link className="text-link" href="/inspecciones">Volver al listado</Link>
    </article>
  );
}
