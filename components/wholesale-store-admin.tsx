"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  Store, QrCode, Copy, Check, ExternalLink, MessageCircle, Download, Printer,
  Sparkles, Tags, ShoppingBag, Info
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface WholesaleStoreAdminProps {
  data: any;
  uid?: string;
  setSection: (section: string) => void;
  setToast: (msg: string) => void;
}

export function WholesaleStoreAdmin({
  data,
  uid,
  setSection,
  setToast,
}: WholesaleStoreAdminProps) {
  const [copied, setCopied] = useState<boolean>(false);
  const [qrMayorista, setQrMayorista] = useState<string>("");
  const [origin, setOrigin] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const storeUid = uid || data?.settings?.uid || "";
  const businessName = data?.settings?.business_name || "CR MAYORISTA";
  const whatsappNumber = data?.settings?.whatsapp || data?.settings?.phone || "";
  const wholesaleMinQty = data?.settings?.wholesale_min_qty && Number(data.settings.wholesale_min_qty) !== 6 ? Number(data.settings.wholesale_min_qty) : 12;
  const wholesaleTerms = data?.settings?.wholesale_terms || "Precios mayoristas desde el mínimo indicado.";
  const activeProducts = (data?.products || []).filter((p: any) => p.total_stock > 0);

  const mayoristaUrl = useMemo(() => {
    if (!origin || !storeUid) return "";
    return `${origin}/tienda?store=${encodeURIComponent(storeUid)}`;
  }, [origin, storeUid]);

  // Generar código QR para el catálogo mayorista
  useEffect(() => {
    if (mayoristaUrl) {
      QRCode.toDataURL(mayoristaUrl, {
        width: 320,
        margin: 2,
        color: { dark: "#0f2137", light: "#ffffff" },
      })
        .then(setQrMayorista)
        .catch(console.error);
    }
  }, [mayoristaUrl]);

  const copyToClipboard = (url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setToast("Enlace del catálogo mayorista copiado al portapapeles");
    setTimeout(() => setCopied(false), 2500);
  };

  const shareViaWhatsApp = (url: string) => {
    const text = `¡Hola! Te comparto nuestro catálogo de precios mayoristas de *${businessName}*:\n\n👉 ${url}\n\nPodés armar tu pedido eligiendo curvas y cantidades deseadas para enviárnoslo directamente por acá.`;
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, "_blank");
  };

  const downloadQr = (dataUrl: string, filename: string) => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${filename}.png`;
    a.click();
    setToast("Código QR descargado");
  };

  const printQr = (dataUrl: string, title: string, subtitle: string) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - ${businessName}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 95vh;
              margin: 0;
              padding: 24px;
              color: #0f2137;
              text-align: center;
            }
            .card {
              border: 3px solid #0f2137;
              border-radius: 28px;
              padding: 40px 32px;
              max-width: 440px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.08);
            }
            h1 {
              font-size: 26px;
              font-weight: 800;
              margin: 0 0 6px 0;
              letter-spacing: -0.5px;
            }
            .badge {
              display: inline-block;
              background: #f97316;
              color: white;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
              padding: 4px 12px;
              border-radius: 999px;
              margin-bottom: 18px;
            }
            .qr-img {
              width: 260px;
              height: 260px;
              margin: 12px 0 18px 0;
              border-radius: 12px;
            }
            p.sub {
              font-size: 14px;
              color: #475569;
              margin: 0 0 18px 0;
              line-height: 1.4;
            }
            .footer-info {
              border-top: 1px dashed #cbd5e1;
              padding-top: 16px;
              font-size: 12px;
              color: #64748b;
            }
            @media print {
              body { padding: 0; }
              .card { box-shadow: none; border-width: 2px; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">Venta Mayorista Exclusiva</span>
            <h1>${businessName}</h1>
            <p class="sub">${subtitle}</p>
            <img src="${dataUrl}" class="qr-img" alt="QR Mayorista" />
            <div class="footer-info">
              <p style="margin: 0 0 4px 0; font-weight: bold; color: #0f2137;">Mínimo mayorista: ${wholesaleMinQty} unidades</p>
              <p style="margin: 0;">Escaneá con la cámara de tu celular</p>
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="clay-pill-3d clay-pill-rose size-11 shrink-0">
              <Store className="size-6" strokeWidth={2.3} />
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-foreground">Catálogo & Tienda Mayorista</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Compartí tu catálogo de venta mayorista con revendedores o clientes comerciales y recibí los pedidos armados en tu WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 rounded-xl font-semibold"
            onClick={() => setSection("configuracion")}
          >
            Configuración general
          </Button>
        </div>
      </div>

      {/* Overview Cards 3D Claymorphism */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="group">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Productos con Stock</p>
              <p className="mt-1.5 text-2xl font-black tracking-tight">{activeProducts.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Disponibles al por mayor</p>
            </div>
            <span className="clay-pill-3d clay-pill-blue size-13 shrink-0">
              <ShoppingBag className="size-6" strokeWidth={2.3} />
            </span>
          </CardContent>
        </Card>

        <Card className="group">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mínimo Mayorista</p>
              <p className="mt-1.5 text-2xl font-black tracking-tight">{wholesaleMinQty} unidades</p>
              <p className="mt-1 text-xs text-muted-foreground">Por pedido mayorista</p>
              <button
                type="button"
                onClick={() => setSection("configuracion")}
                className="mt-1 text-[11px] font-bold text-primary hover:underline block cursor-pointer"
              >
                Modificar regla →
              </button>
            </div>
            <span className="clay-pill-3d clay-pill-coral size-13 shrink-0">
              <Tags className="size-6" strokeWidth={2.3} />
            </span>
          </CardContent>
        </Card>

        <Card className="group">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recepción WhatsApp</p>
              <p className="mt-1.5 text-lg font-black tracking-tight truncate max-w-[150px]" title={whatsappNumber || "Sin configurar"}>
                {whatsappNumber || "Sin configurar"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Recibe los pedidos mayoristas</p>
            </div>
            <span className="clay-pill-3d clay-pill-green size-13 shrink-0">
              <MessageCircle className="size-6" strokeWidth={2.3} />
            </span>
          </CardContent>
        </Card>

        <Card className="group">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Modalidad Activa</p>
              <p className="mt-1.5 text-2xl font-black tracking-tight">Mayorista</p>
              <p className="mt-1 text-xs text-muted-foreground">100% Mayorista exclusivo</p>
            </div>
            <span className="clay-pill-3d clay-pill-amber size-13 shrink-0">
              <Sparkles className="size-6" strokeWidth={2.3} />
            </span>
          </CardContent>
        </Card>
      </div>

      {!whatsappNumber && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <Info className="size-5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <span className="font-bold">Aviso importante:</span> Aún no configuraste un número de WhatsApp o teléfono en <strong>Configuración → Negocio</strong>. Los clientes podrán armar el pedido pero necesitan tu número para enviártelo.
          </div>
          <Button size="sm" variant="outline" onClick={() => setSection("configuracion")} className="shrink-0 border-amber-400">
            Configurar número
          </Button>
        </div>
      )}

      {/* Main Mayorista Sharing & QR Section */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Shareable Link & Options */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border-0 font-bold">
                  Precios Mayoristas Exclusivos
                </Badge>
              </div>
              <CardTitle className="text-xl mt-1 font-black">Enlace Compartible del Catálogo Mayorista</CardTitle>
              <CardDescription>
                Compartí este enlace con revendedores, distribuidores o comercios. Verán los precios por mayor y podrán armar su pedido cumpliendo el mínimo de unidades.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={mayoristaUrl}
                  className="font-mono text-xs bg-muted/40 h-11 rounded-xl"
                />
                <Button
                  variant={copied ? "secondary" : "outline"}
                  onClick={() => copyToClipboard(mayoristaUrl)}
                  className="h-11 shrink-0 gap-1.5 rounded-xl font-semibold"
                >
                  {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button
                  onClick={() => window.open(mayoristaUrl, "_blank")}
                  className="gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                >
                  <ExternalLink className="size-4" />
                  Ver catálogo online
                </Button>
                <Button
                  variant="outline"
                  onClick={() => shareViaWhatsApp(mayoristaUrl)}
                  className="gap-2 rounded-xl border-emerald-500/50 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 font-semibold"
                >
                  <MessageCircle className="size-4 text-emerald-600" />
                  Compartir por WhatsApp
                </Button>
              </div>

              <div className="mt-4 rounded-xl border bg-muted/30 p-4 text-xs space-y-1.5 text-muted-foreground">
                <p className="font-bold text-foreground">Reglas del Catálogo Mayorista:</p>
                <p>• Los clientes visualizan exclusivamente los precios mayoristas definidos para cada producto.</p>
                <p>• Mínimo de compra requerido configurado: <strong>{wholesaleMinQty} unidades</strong>.</p>
                <p>• Al confirmar el pedido, el carrito se formatea y se envía a tu WhatsApp con el detalle por producto, variante y cantidad.</p>
                <p>• Condición configurada: <em>"{wholesaleTerms}"</em></p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* QR Code Panel */}
        <div className="lg:col-span-5">
          <Card className="text-center">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-center gap-2 font-bold">
                <span className="clay-pill-3d clay-pill-coral size-8 inline-grid shrink-0">
                  <QrCode className="size-4.5" strokeWidth={2.3} />
                </span>
                Código QR Mayorista
              </CardTitle>
              <CardDescription>
                Ideal para imprimir en folletos, tarjetas de visita o enviar a clientes comerciales
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              {qrMayorista ? (
                <div className="p-3 bg-white rounded-2xl border shadow-sm inline-block">
                  <img src={qrMayorista} alt="QR Mayorista" className="size-48 rounded-lg" />
                </div>
              ) : (
                <div className="size-48 grid place-items-center rounded-2xl border border-dashed bg-muted">
                  Generando QR…
                </div>
              )}

              <p className="text-xs text-muted-foreground max-w-xs">
                Tus clientes mayoristas pueden escanear este código con la cámara de su teléfono para ingresar directamente al catálogo y realizar pedidos.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 w-full pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadQr(qrMayorista, `qr-mayorista-${businessName.toLowerCase().replace(/\s+/g, "-")}`)}
                  className="gap-1.5 rounded-xl text-xs"
                  disabled={!qrMayorista}
                >
                  <Download className="size-3.5" />
                  Descargar PNG
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => printQr(qrMayorista, "Catálogo Mayorista", "Escaneá y armá tu pedido con precios mayoristas")}
                  className="gap-1.5 rounded-xl text-xs"
                  disabled={!qrMayorista}
                >
                  <Printer className="size-3.5" />
                  Imprimir cartel QR
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
