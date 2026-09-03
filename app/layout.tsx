import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Control de Asistencia | Dirección de Gestión Escolar",
  description: "Sistema institucional de control de asistencia del personal",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <div className="institutional-bar" />
        {children}
      </body>
    </html>
  );
}
