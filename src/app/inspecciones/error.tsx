"use client";

import { useEffect } from "react";
import { AppShell } from "../../components/app-shell";

type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

// Límite de error del listado y del detalle: evita una pantalla en blanco si el render falla.
export default function InspectionsError({ error, reset }: RouteErrorProps) {
  useEffect(() => {
    console.error("Error al renderizar inspecciones", error);
  }, [error]);

  return (
    <AppShell>
      <main className="page-shell" id="contenido">
        <section className="state-panel state-error" role="alert">
          <h1>No pudimos cargar las inspecciones</h1>
          <p>Ocurrió un problema al mostrar esta pantalla. Tus inspecciones guardadas no se perdieron.</p>
          <button type="button" onClick={reset}>Reintentar</button>
        </section>
      </main>
    </AppShell>
  );
}
