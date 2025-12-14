import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDF Export example",
  description: "Generador de PDF con @react-pdf/renderer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        {/* Evitar next/font: usar link simple o fuentes locales */}
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </head>
      <body style={{ fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" }}>
        {children}
      </body>
    </html>
  );
}
