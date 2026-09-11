import { AppShell } from "../components/app-shell";
import { inspections } from "../lib/data/inspections";

type PageProps = {
  searchParams?: { estado?: string };
};

function EmptyState() {
  return (
    <div
      className="state-panel"
      role="status"
      style={{
        textAlign: "center",
        padding: "48px 24px",
        borderRadius: "16px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
      }}
    >
      <span
        className="state-icon"
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "#e2e8f0",
          color: "#64748b",
          fontSize: "24px",
          fontWeight: "bold",
        }}
      >
        -
      </span>

      <h2 style={{ marginTop: "16px", color: "#1e293b" }}>
        No hay inspecciones
      </h2>

      <p style={{ color: "#64748b", marginBottom: "20px" }}>
        No se encontraron registros para mostrar en este momento.
      </p>

      <a className="text-link" href="/">
        Volver al inicio
      </a>
    </div>
  );
}

function ErrorState() {
  return (
    <div
      className="state-panel state-error"
      role="alert"
      style={{
        textAlign: "center",
        padding: "48px 24px",
        borderRadius: "16px",
        background: "#fff7f7",
        border: "1px solid #fecaca",
      }}
    >
      <span
        className="state-icon"
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "#fee2e2",
          color: "#dc2626",
          fontSize: "24px",
          fontWeight: "bold",
        }}
      >
        !
      </span>

      <h2 style={{ marginTop: "16px", color: "#991b1b" }}>
        No pudimos cargar las inspecciones
      </h2>

      <p style={{ color: "#7f1d1d", marginBottom: "20px" }}>
        La consulta no está disponible. Intenta nuevamente desde el inicio.
      </p>

      <a className="button-link" href="/">
        Reintentar
      </a>
    </div>
  );
}

function LoadingState() {
  return (
    <div
      className="state-panel"
      role="status"
      aria-live="polite"
      style={{
        textAlign: "center",
        padding: "48px 24px",
        borderRadius: "16px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
      }}
    >
      <span
        className="loader"
        aria-hidden="true"
        style={{
          display: "inline-block",
          width: "42px",
          height: "42px",
          border: "4px solid #dbeafe",
          borderTopColor: "#2563eb",
          borderRadius: "50%",
        }}
      />

      <h2 style={{ marginTop: "16px", color: "#1e293b" }}>
        Cargando inspecciones
      </h2>

      <p style={{ color: "#64748b" }}>
        Estamos preparando los registros sintéticos.
      </p>
    </div>
  );
}

function InspectionList() {
  return (
    <div
      className="inspection-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "20px",
      }}
    >
      {inspections.map((inspection) => (
        <article
          className="inspection-card"
          key={inspection.id}
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "22px",
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
        >
          <div
            className="card-topline"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <span className={`badge badge-${inspection.status}`}>
              {inspection.statusLabel}
            </span>

            <span
              className="muted"
              style={{
                fontSize: "13px",
                color: "#64748b",
              }}
            >
              {inspection.date}
            </span>
          </div>

          <h3
            style={{
              margin: "0 0 8px",
              color: "#1e3a5f",
              fontSize: "20px",
              fontWeight: "700",
            }}
          >
            {inspection.location}
          </h3>

          <p
            style={{
              margin: "0 0 20px",
              color: "#64748b",
              lineHeight: "1.6",
            }}
          >
            {inspection.summary}
          </p>

          <dl
            style={{
              display: "grid",
              gap: "12px",
              margin: 0,
              paddingTop: "16px",
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <dt
                style={{
                  color: "#64748b",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Responsable
              </dt>

              <dd
                style={{
                  margin: 0,
                  color: "#1e293b",
                  fontSize: "14px",
                  fontWeight: "600",
                  textAlign: "right",
                }}
              >
                {inspection.inspector}
              </dd>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <dt
                style={{
                  color: "#64748b",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Hallazgos
              </dt>

              <dd
                style={{
                  margin: 0,
                  color: "#1e3a5f",
                  fontSize: "14px",
                  fontWeight: "700",
                  textAlign: "right",
                }}
              >
                {inspection.findings}
              </dd>
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
        <header
          className="hero"
          style={{
            background:
              "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
            borderRadius: "20px",
            padding: "36px",
            color: "#ffffff",
            marginBottom: "32px",
            boxShadow: "0 10px 30px rgba(30, 58, 95, 0.18)",
          }}
        >
          <p
            className="eyebrow"
            style={{
              marginBottom: "10px",
              color: "#bfdbfe",
              fontSize: "13px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Proyecto integrador · Semana 2
          </p>

          <h1
            style={{
              margin: "0 0 12px",
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: "800",
            }}
          >
            Inspecciones de laboratorio
          </h1>

          <p
            className="lead"
            style={{
              maxWidth: "720px",
              margin: "0 0 20px",
              color: "#dbeafe",
              lineHeight: "1.7",
            }}
          >
            Un shell instalable para consultar mantenimiento con conectividad
            intermitente. Los datos mostrados son sintéticos.
          </p>

          <span
            className="status"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 14px",
              borderRadius: "999px",
              background: "rgba(255, 255, 255, 0.14)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            ● Shell listo para instalar · Sin conexión offline todavía
          </span>
        </header>

        <section
          aria-labelledby="inspections-heading"
          className="content-section"
        >
          <div
            className="section-heading"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "20px",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                className="eyebrow"
                style={{
                  margin: "0 0 4px",
                  color: "#2563eb",
                  fontSize: "13px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Datos de demostración
              </p>

              <h2
                id="inspections-heading"
                style={{
                  margin: 0,
                  color: "#1e293b",
                  fontSize: "26px",
                  fontWeight: "800",
                }}
              >
                Inspecciones recientes
              </h2>
            </div>

            <span
              className="count"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "8px 14px",
                borderRadius: "999px",
                background: "#eff6ff",
                color: "#1d4ed8",
                fontSize: "14px",
                fontWeight: "700",
              }}
            >
              {inspections.length} registros
            </span>
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