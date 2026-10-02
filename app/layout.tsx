import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CR MAYORISTA - Sistema de Gestión",
  description: "Ventas mayoristas, inventario por variantes, caja, cuentas corrientes y catálogo online.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
