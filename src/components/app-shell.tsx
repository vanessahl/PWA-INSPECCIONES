import Link from "next/link";

type AppShellProps = {
  children: React.ReactNode;
};

const stateLinks = [
  { href: "/?estado=cargando", label: "Carga" },
  { href: "/?estado=error", label: "Error" },
  { href: "/?estado=vacio", label: "Sin datos" }
];

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand" href="/" aria-label="Ir al inicio de Inspecciones">
          <span className="brand-mark" aria-hidden="true">I</span>
          <span>Inspecciones</span>
        </Link>
        <nav aria-label="Navegación principal" className="app-nav">
          <Link href="/">Inicio</Link>
          {stateLinks.map((link) => (
            <Link href={link.href} key={link.href}>{link.label}</Link>
          ))}
        </nav>
      </header>
      {children}
      <footer className="app-footer">
        <span>Aplicaciones Web Progresivas</span>
        <span>Datos sintéticos para demostración</span>
      </footer>
    </div>
  );
}
