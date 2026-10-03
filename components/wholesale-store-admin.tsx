"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  Store, QrCode, Copy, Check, ExternalLink, MessageCircle, Download, Printer,
  Sparkles, Tags, ShoppingBag, Info, Users
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [copiedMinorista, setCopiedMinorista] = useState<boolean>(false);
  const [copiedMayorista, setCopiedMayorista] = useState<boolean>(false);
  const [qrMinorista, setQrMinorista] = useState<string>("");
  const [qrMayorista, setQrMayorista] = useState<string>("");
  const [origin, setOrigin] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const storeUid = uid || data?.settings?.uid || "";
  const businessName = data?.settings?.business_name || "CR CALZADOS";
  const whatsappNumber = data?.settings?.whatsapp || data?.settings?.phone || "";
  const wholesaleMinQty = data?.settings?.wholesale_min_qty && Number(data.settings.wholesale_min_qty) !== 6 ? Number(data.settings.wholesale_min_qty) : 12;
  const wholesaleTerms = data?.settings?.wholesale_terms || "Precios mayoristas desde el mínimo indicado.";
  const activeProducts = (data?.products || []).filter((p: any) => p.total_stock > 0);

  const minoristaUrl = useMemo(() => {
    if (!origin || !storeUid) return "";
    return `${origin}/tienda?store=${encodeURIComponent(storeUid)}&channel=minorista`;
  }, [origin, storeUid]);

  const mayoristaUrl = useMemo(() => {
    if (!origin || !storeUid) return "";
    return `${origin}/tienda?store=${encodeURIComponent(storeUid)}&channel=mayorista`;
  }, [origin, storeUid]);

  // Generar códigos QR
  useEffect(() => {
    if (minoristaUrl) {
      QRCode.toDataURL(minoristaUrl, {
        width: 320,
        margin: 2,
        color: { dark: "#1e1b4b", light: "#ffffff" },
      })
        .then(setQrMinorista)
        .catch(console.error);
    }
  }, [minoristaUrl]);

  useEffect(() => {
    if (mayoristaUrl) {
      QRCode.toDataURL(mayoristaUrl, {
        width: 320,
        margin: 2,
        color: { dark: "#431407", light: "#ffffff" },
      })
        .then(setQrMayorista)
        .catch(console.error);
    }
  }, [mayoristaUrl]);

  const copyToClipboard = (url: string, type: "minorista" | "mayorista") => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    if (type === "minorista") {
      setCopiedMinorista(true);
      setTimeout(() => setCopiedMinorista(false), 2500);
    } else {
      setCopiedMayorista(true);
      setTimeout(() => setCopiedMayorista(false), 2500);
    }
    setToast(`Enlace de la tienda ${type} copiado al portapapeles`);
  };

  const shareViaWhatsApp = (url: string, type: "minorista" | "mayorista") => {
    let text = "";
    if (type === "minorista") {
      text = `¡Hola! Te comparto nuestro catálogo y tienda online de *${businessName}*:\n\n👉 ${url}\n\nPodés ver todos los modelos disponibles en stock con fotos y precios por unidad, y hacernos tu pedido directamente.`;
    } else {
      text = `¡Hola! Te comparto nuestro catálogo de precios mayoristas de *${businessName}*:\n\n👉 ${url}\n\nPodés armar tu pedido eligiendo curvas y cantidades deseadas (mínimo ${wholesaleMinQty} unidades) para enviárnoslo directamente por acá.`;
    }
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

  const printQr = (dataUrl: string, title: string, subtitle: string, footerNote: string) => {
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
              background: #4f46e5;
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
            <span class="badge">${title}</span>
            <h1>${businessName}</h1>
            <p class="sub">${subtitle}</p>
            <img src="${dataUrl}" class="qr-img" alt="QR" />
            <div class="footer-info">
              <p style="margin: 0 0 4px 0; font-weight: bold; color: #0f2137;">${footerNote}</p>
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
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-foreground">Catálogo & Tiendas Online</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Compartí tu tienda minorista (venta al público por unidad) o tienda mayorista (por volumen) y recibí los pedidos directos en tu WhatsApp.
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
              <p className="mt-1 text-xs text-muted-foreground">En catálogo online</p>
            </div>
            <span className="clay-pill-3d clay-pill-blue size-13 shrink-0">
              <ShoppingBag className="size-6" strokeWidth={2.3} />
            </span>
          </CardContent>
        </Card>

        <Card className="group">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tienda Minorista</p>
              <p className="mt-1.5 text-2xl font-black tracking-tight text-indigo-600">Activa</p>
              <p className="mt-1 text-xs text-muted-foreground">Venta desde 1 unidad</p>
            </div>
            <span className="clay-pill-3d clay-pill-violet size-13 shrink-0">
              <Users className="size-6" strokeWidth={2.3} />
            </span>
          </CardContent>
        </Card>

        <Card className="group">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mínimo Mayorista</p>
              <p className="mt-1.5 text-2xl font-black tracking-tight">{wholesaleMinQty} unidades</p>
              <p className="mt-1 text-xs text-muted-foreground">Regla para revendedores</p>
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
              <p className="mt-1 text-xs text-muted-foreground">Destino de pedidos online</p>
            </div>
            <span className="clay-pill-3d clay-pill-green size-13 shrink-0">
              <MessageCircle className="size-6" strokeWidth={2.3} />
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

      {/* Tabs for Minorista and Mayorista Stores */}
      <Tabs defaultValue="minorista" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md h-12 p-1 bg-muted/60 rounded-2xl">
          <TabsTrigger value="minorista" className="rounded-xl font-bold gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <ShoppingBag className="size-4" />
            Tienda Minorista
          </TabsTrigger>
          <TabsTrigger value="mayorista" className="rounded-xl font-bold gap-2 data-[state=active]:bg-amber-600 data-[state=active]:text-white">
            <Sparkles className="size-4" />
            Tienda Mayorista
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: TIENDA MINORISTA */}
        <TabsContent value="minorista" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border-0 font-bold">
                      Venta al Público General (Por Unidad)
                    </Badge>
                  </div>
                  <CardTitle className="text-xl mt-1 font-black">Enlace de la Tienda Minorista</CardTitle>
                  <CardDescription>
                    Compartí este enlace en tus redes sociales (Instagram, TikTok, Facebook), bio o estados de WhatsApp. Tus clientes podrán ver los precios por unidad y hacer pedidos individuales.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={minoristaUrl}
                      className="font-mono text-xs bg-muted/40 h-11 rounded-xl"
                    />
                    <Button
                      variant={copiedMinorista ? "secondary" : "outline"}
                      onClick={() => copyToClipboard(minoristaUrl, "minorista")}
                      className="h-11 shrink-0 gap-1.5 rounded-xl font-semibold"
                    >
                      {copiedMinorista ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                      {copiedMinorista ? "Copiado" : "Copiar"}
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Button
                      onClick={() => window.open(minoristaUrl, "_blank")}
                      className="gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                    >
                      <ExternalLink className="size-4" />
                      Ver tienda minorista
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => shareViaWhatsApp(minoristaUrl, "minorista")}
                      className="gap-2 rounded-xl border-emerald-500/50 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 font-semibold"
                    >
                      <MessageCircle className="size-4 text-emerald-600" />
                      Compartir por WhatsApp
                    </Button>
                  </div>

                  <div className="mt-4 rounded-xl border bg-muted/30 p-4 text-xs space-y-1.5 text-muted-foreground">
                    <p className="font-bold text-foreground">Características del Catálogo Minorista:</p>
                    <p>• Muestra los precios de venta al público (PVP / retail).</p>
                    <p>• Los clientes pueden elegir desde 1 sola unidad de cualquier modelo.</p>
                    <p>• El cliente envía su pedido completo y sus datos de entrega directo a tu WhatsApp.</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* QR Minorista */}
            <div className="lg:col-span-5">
              <Card className="text-center">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-center gap-2 font-bold">
                    <span className="clay-pill-3d clay-pill-violet size-8 inline-grid shrink-0">
                      <QrCode className="size-4.5" strokeWidth={2.3} />
                    </span>
                    Código QR Minorista
                  </CardTitle>
                  <CardDescription>
                    Para exhibir en mostrador, vidriera, bolsas o folletería al público
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-4">
                  {qrMinorista ? (
                    <div className="p-3 bg-white rounded-2xl border shadow-sm inline-block">
                      <img src={qrMinorista} alt="QR Minorista" className="size-48 rounded-lg" />
                    </div>
                  ) : (
                    <div className="size-48 grid place-items-center rounded-2xl border border-dashed bg-muted">
                      Generando QR…
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground max-w-xs">
                    Tus clientes pueden escanear este QR para ver el catálogo y comprar directo desde su celular.
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2 w-full pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadQr(qrMinorista, `qr-minorista-${businessName.toLowerCase().replace(/\s+/g, "-")}`)}
                      className="gap-1.5 rounded-xl text-xs"
                      disabled={!qrMinorista}
                    >
                      <Download className="size-3.5" />
                      Descargar PNG
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => printQr(qrMinorista, "Tienda Online Minorista", "Escaneá con tu celular y mirá todos los modelos en stock", "Venta directa por unidad")}
                      className="gap-1.5 rounded-xl text-xs"
                      disabled={!qrMinorista}
                    >
                      <Printer className="size-3.5" />
                      Imprimir cartel QR
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: TIENDA MAYORISTA */}
        <TabsContent value="mayorista" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border-0 font-bold">
                      Precios Mayoristas Exclusivos
                    </Badge>
                  </div>
                  <CardTitle className="text-xl mt-1 font-black">Enlace del Catálogo Mayorista</CardTitle>
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
                      variant={copiedMayorista ? "secondary" : "outline"}
                      onClick={() => copyToClipboard(mayoristaUrl, "mayorista")}
                      className="h-11 shrink-0 gap-1.5 rounded-xl font-semibold"
                    >
                      {copiedMayorista ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                      {copiedMayorista ? "Copiado" : "Copiar"}
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Button
                      onClick={() => window.open(mayoristaUrl, "_blank")}
                      className="gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                    >
                      <ExternalLink className="size-4" />
                      Ver catálogo mayorista
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => shareViaWhatsApp(mayoristaUrl, "mayorista")}
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

            {/* QR Mayorista */}
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
                    Tus clientes mayoristas pueden escanear este código con la cámara de su teléfono para ingresar directamente al catálogo y realizar pedidos por volumen.
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
                      onClick={() => printQr(qrMayorista, "Catálogo Mayorista", "Escaneá y armá tu pedido con precios mayoristas", `Mínimo mayorista: ${wholesaleMinQty} unidades`)}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
