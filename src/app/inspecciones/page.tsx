"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
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
import { getCurrentLocation, type SyntheticLocation } from "../../lib/device/geolocation";
import { notifyInspectionChange } from "../../lib/notifications/client";
import {
  cameraFailureReason,
  requestCameraStream,
  stopCameraStream,
  validateEvidenceFile
} from "../../lib/device/camera";

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
  const [evidenceName, setEvidenceName] = useState("");
  const [locationCapture, setLocationCapture] = useState<SyntheticLocation | null>(null);
  const [capabilityNotice, setCapabilityNotice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
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

    const localId = globalThis.crypto?.randomUUID?.()
      ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const record: Inspection = {
      id: `local-${localId}`,
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
      setEvidenceName("");
      setLocationCapture(null);

      if (navigator.onLine) {
        const summary = await syncPending(store, createHttpSyncTransport());
        setLocalRecords(await store.listLocal());
        const message = summary.synced
          ? "Inspección guardada y sincronizada."
          : "Inspección guardada localmente; se reintentará cuando haya conexión.";
        setSyncNotice(message);
        if (summary.synced) {
          await notifyInspectionChange("Inspección sincronizada", { body: "El registro sintético se sincronizó correctamente." }, () => {
            setSyncNotice(`${message} Aviso mostrado dentro de la aplicación.`);
          });
        }
      } else {
        setSyncNotice("Inspección guardada en este dispositivo; pendiente de conexión.");
      }
    } catch {
      setSyncNotice("No se pudo guardar la inspección en este dispositivo. Revisa los datos e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleEvidenceChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const evidence = validateEvidenceFile(file);
    if (!evidence) {
      setEvidenceName("");
      setCapabilityNotice("La evidencia debe ser una imagen JPEG, PNG o WebP de máximo 5 MiB.");
      event.target.value = "";
      return;
    }
    setEvidenceName(evidence.name);
    setCapabilityNotice("Evidencia sintética adjunta de forma opcional.");
  };

  const handleLocationRequest = async () => {
    setCapabilityNotice("Solicitando ubicación opcional…");
    const result = await getCurrentLocation();
    if (result.ok) {
      setLocationCapture(result.location);
      setCapabilityNotice("Ubicación opcional capturada con precisión limitada.");
    } else {
      setLocationCapture(null);
      const message = result.reason === "insecure-context"
        ? "La ubicación requiere HTTPS cuando se accede desde la IP del celular."
        : result.reason === "permission-denied"
          ? "Se rechazó el permiso de ubicación; puedes guardar la inspección sin ella."
          : "No se capturó ubicación; puedes guardar la inspección sin ella.";
      setCapabilityNotice(message);
    }
  };

  const handleCameraRequest = async () => {
    setCapabilityNotice("Solicitando permiso para usar la cámara…");
    try {
      const stream = await requestCameraStream();
      if (!stream) {
        setCapabilityNotice("No se concedió el permiso de cámara; puedes seleccionar un archivo.");
        return;
      }
      stopCameraStream(stream);
      setCapabilityNotice("Permiso de cámara concedido. Selecciona o toma la fotografía.");
      cameraInputRef.current?.click();
    } catch (error) {
      const reason = cameraFailureReason(error);
      setCapabilityNotice(
        reason === "permission-denied"
          ? "Se rechazó el permiso de cámara; puedes seleccionar un archivo."
          : "La cámara no está disponible; puedes seleccionar un archivo."
      );
    }
  };

  const handleFileRequest = async () => {
    setCapabilityNotice("Solicitando permiso antes de seleccionar la evidencia…");
    try {
      const stream = await requestCameraStream();
      if (!stream) {
        setCapabilityNotice("No se concedió el permiso; no se abrió el selector de evidencia.");
        return;
      }
      stopCameraStream(stream);
      setCapabilityNotice("Permiso concedido. Ahora selecciona una imagen.");
      fileInputRef.current?.click();
    } catch (error) {
      const reason = cameraFailureReason(error);
      setCapabilityNotice(
        reason === "permission-denied"
          ? "Se rechazó el permiso; no se abrió el selector de evidencia."
          : "No fue posible solicitar el permiso; inténtalo nuevamente."
      );
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
            <div className="capability-actions">
              <span className="capability-label">Evidencia opcional</span>
              <div className="capability-buttons">
                <button className="button-link button-secondary" type="button"
                  onClick={() => void handleFileRequest()}>
                  Seleccionar archivo
                </button>
                <button className="button-link button-secondary" type="button"
                  onClick={() => void handleCameraRequest()}>
                  Tomar foto
                </button>
              </div>
              <input ref={fileInputRef} accept="image/jpeg,image/png,image/webp" className="visually-hidden"
                type="file" onChange={handleEvidenceChange} />
              <input ref={cameraInputRef} accept="image/jpeg,image/png,image/webp" capture="environment"
                className="visually-hidden" type="file" onChange={handleEvidenceChange} />
            </div>
            <div className="capability-actions">
              <span className="capability-label">Ubicación opcional</span>
              <button className="button-link button-secondary" type="button" onClick={() => void handleLocationRequest()}>
                {locationCapture ? "Actualizar ubicación" : "Usar ubicación"}
              </button>
            </div>
            <button className="button-link" disabled={saving} type="submit">
              {saving ? "Guardando…" : "Guardar inspección"}
            </button>
          </form>
          {evidenceName && <p className="capability-note">Evidencia seleccionada: {evidenceName}</p>}
          {locationCapture && <p className="capability-note">Ubicación sintética capturada: precisión aproximada de {Math.round(locationCapture.accuracy)} m.</p>}
          {capabilityNotice && <p className="sync-notice" aria-live="polite">{capabilityNotice}</p>}
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
                  <Link className="text-link" href={`/inspecciones/${inspection.id}`}>
                    Ver detalle
                  </Link>
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