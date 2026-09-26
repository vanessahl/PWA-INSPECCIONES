"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { LoadingState } from "../../components/loading-state";
import { inspections, type Inspection } from "../../lib/data/inspections";

type ListState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "empty" }
  | { status: "ready"; records: Inspection[] };

export default function InspectionsPage() {
  const [state, setState] = useState<ListState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    const search = new URLSearchParams(window.location.search);

    Promise.resolve()
      .then(() => {
        if (search.get("estado") === "error") {
          throw new Error("La consulta sintética no está disponible.");
        }
        return search.get("estado") === "vacio" ? [] : inspections;
      })
      .then((records) => {
        if (!active) return;
        setState(records.length ? { status: "ready", records } : { status: "empty" });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell>
      <main className="page-shell">
        <header className="page-heading">
          <p className="eyebrow">Listado · renderizado en cliente</p>
          <h1>Inspecciones recientes</h1>
          <p>Registros sintéticos de mantenimiento de laboratorios.</p>
        </header>

        {state.status === "loading" && <LoadingState />}
        {state.status === "error" && (
          <section className="state-panel state-error" role="alert">
            <span className="state-icon" aria-hidden="true">!</span>
            <h2>No pudimos cargar las inspecciones</h2>
            <p>La consulta no está disponible. Intenta nuevamente.</p>
            <a className="button-link" href="/inspecciones">Reintentar</a>
          </section>
        )}
        {state.status === "empty" && (
          <section className="state-panel" role="status">
            <h2>No hay inspecciones</h2>
            <p>No se encontraron registros para mostrar.</p>
          </section>
        )}
        {state.status === "ready" && (
          <>
            <p className="count" aria-live="polite">{state.records.length} registros</p>
            <div className="inspection-grid">
              {state.records.map((inspection) => (
                <article className="inspection-card" key={inspection.id}>
                  <div className="card-topline">
                    <span className={`badge badge-${inspection.status}`}>
                      {inspection.statusLabel}
                    </span>
                    <time className="muted" dateTime={inspection.date}>
                      {inspection.date}
                    </time>
                  </div>
                  <h2>{inspection.location}</h2>
                  <p>{inspection.summary}</p>
                  <dl>
                    <div><dt>Responsable</dt><dd>{inspection.inspector}</dd></div>
                    <div><dt>Hallazgos</dt><dd>{inspection.findings}</dd></div>
                  </dl>
                  <Link className="text-link" href={`/inspecciones/${inspection.id}`}>
                    Ver detalle
                  </Link>
                </article>
              ))}
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}