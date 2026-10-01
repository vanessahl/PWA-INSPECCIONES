"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { AppShell } from "../../components/app-shell";
import { LoadingState } from "../../components/loading-state";
import { inspections, type Inspection } from "../../lib/data/inspections";
import {
  createHttpSyncTransport,
  createSyncStore,
  enqueueInspection,
  registerOnlineSync,
  syncPending
} from "../../lib/sync/queue";
import type { StoredInspection } from "../../lib/storage/schema";

type ListState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "empty" }
  | { status: "ready"; records: Inspection[] };

export default function InspectionsPage() {
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [localRecords, setLocalRecords] = useState<StoredInspection[]>([]);
  const [syncNotice, setSyncNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(false);
  const [draft, setDraft] = useState({
    location: "",
    date: "",
    inspector: "Técnica A",
    status: "ok" as Inspection["status"],
    findings: "0",
    summary: ""
  });

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

  useEffect(() => {
    let active = true;
    setOnline(navigator.onLine);
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    const store = createSyncStore();
    const refreshLocal = async () => {
      const records = await store.listLocal();
      if (active) setLocalRecords(records);
    };
    void refreshLocal().catch(() => {
      if (active) setSyncNotice("No fue posible abrir el almacenamiento local en este navegador.");
    });

    const stopSync = registerOnlineSync(store, createHttpSyncTransport(), {
      onComplete: (summary) => {
        if (!active || summary.synced === 0) return;
        setSyncNotice(`Se sincronizaron ${summary.synced} inspecciones.`);
        void refreshLocal();
      },
      onError: () => {
        if (active) setSyncNotice("No se pudo contactar el servidor de demostración. Se conserva la inspección local.");
      }
    });

    return () => {
      active = false;
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      stopSync();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSyncNotice("");

    const record: Inspection = {
      id: `local-${crypto.randomUUID()}`,
      ...draft,
      findings: Number(draft.findings),
      statusLabel: draft.status === "attention" ? "Requiere atención" : "Sin incidencias"
    };

    try {
      const store = createSyncStore();
      const added = await enqueueInspection(store, record);
      if (!added) throw new Error("La inspección ya existe en el almacenamiento local.");
      setLocalRecords(await store.listLocal());
      setDraft({ ...draft, location: "", date: "", findings: "0", summary: "" });

      if (navigator.onLine) {
        const summary = await syncPending(store, createHttpSyncTransport());
        setLocalRecords(await store.listLocal());
        setSyncNotice(summary.synced
          ? "Inspección guardada y sincronizada."
          : "Inspección guardada localmente; se reintentará cuando haya conexión.");
      } else {
        setSyncNotice("Inspección guardada en este dispositivo; pendiente de conexión.");
      }
    } catch {
      setSyncNotice("No se pudo guardar la inspección en este dispositivo. Revisa los datos e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const records = state.status === "ready"
    ? [
        ...state.records,
        ...localRecords
          .filter(({ inspection }) => !state.records.some((record) => record.id === inspection.id))
          .map(({ inspection }) => inspection)
      ]
    : [];

  return (
    <AppShell>
      <main className="page-shell">
        <header className="page-heading">
          <p className="eyebrow">Listado · renderizado en cliente</p>
          <h1>Inspecciones recientes</h1>
          <p>Registros sintéticos de mantenimiento de laboratorios.</p>
        </header>

        <section className="sync-form-section" aria-labelledby="new-inspection-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Captura local</p>
              <h2 id="new-inspection-heading">Nueva inspección</h2>
            </div>
            <span className="connection-status" role="status">
              {online ? "Con conexión" : "Sin conexión"}
            </span>
          </div>
          <form className="sync-form" onSubmit={handleSubmit}>
            <label>
              Laboratorio
              <input required maxLength={100} value={draft.location}
                onChange={(event) => setDraft({ ...draft, location: event.target.value })} />
            </label>
            <label>
              Fecha
              <input required type="date" value={draft.date}
                onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
            </label>
            <label>
              Responsable sintético
              <select value={draft.inspector}
                onChange={(event) => setDraft({ ...draft, inspector: event.target.value })}>
                <option>Técnica A</option>
                <option>Técnico B</option>
                <option>Técnica C</option>
              </select>
            </label>
            <label>
              Estado
              <select value={draft.status}
                onChange={(event) => setDraft({ ...draft, status: event.target.value as Inspection["status"] })}>
                <option value="ok">Sin incidencias</option>
                <option value="attention">Requiere atención</option>
              </select>
            </label>
            <label>
              Hallazgos
              <input required min="0" step="1" type="number" value={draft.findings}
                onChange={(event) => setDraft({ ...draft, findings: event.target.value })} />
            </label>
            <label className="form-wide">
              Resumen
              <textarea required maxLength={500} rows={3} value={draft.summary}
                onChange={(event) => setDraft({ ...draft, summary: event.target.value })} />
            </label>
            <button className="button-link" disabled={saving} type="submit">
              {saving ? "Guardando…" : "Guardar inspección"}
            </button>
          </form>
          {syncNotice && <p className="sync-notice" aria-live="polite">{syncNotice}</p>}
        </section>

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
            <p className="count" aria-live="polite">{records.length} registros</p>
            <div className="inspection-grid">
              {records.map((inspection) => {
                const localRecord = localRecords.find((record) => record.inspection.id === inspection.id);
                return (
                <article className="inspection-card" key={inspection.id}>
                  <div className="card-topline">
                    <span className={`badge badge-${inspection.status}`}>
                      {inspection.statusLabel}
                    </span>
                    <time className="muted" dateTime={inspection.date}>
                      {inspection.date}
                    </time>
                  </div>
                  {localRecord && (
                    <p className={localRecord.syncStatus === "pending" ? "sync-pending" : "sync-complete"}>
                      {localRecord.syncStatus === "pending" ? "Pendiente de sincronizar" : "Sincronizada"}
                    </p>
                  )}
                  <h2>{inspection.location}</h2>
                  <p>{inspection.summary}</p>
                  <dl>
                    <div><dt>Responsable</dt><dd>{inspection.inspector}</dd></div>
                    <div><dt>Hallazgos</dt><dd>{inspection.findings}</dd></div>
                  </dl>
                  {localRecord ? (
                    <span className="muted">Registro guardado en este dispositivo</span>
                  ) : (
                    <Link className="text-link" href={`/inspecciones/${inspection.id}`}>
                      Ver detalle
                    </Link>
                  )}
                </article>
                );
              })}
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}