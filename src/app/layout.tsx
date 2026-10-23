import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "../lib/pwa/register-service-worker";

export const metadata: Metadata = {
  title: "Inspecciones de laboratorio",
  description: "Shell instalable para inspecciones sintéticas de laboratorio",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#172b62"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX">
      <body>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}

