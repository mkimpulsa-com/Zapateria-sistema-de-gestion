"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Store, QrCode, Copy, Check, ExternalLink, MessageCircle, Download, Printer,
  Sparkles, Tags, ShoppingBag, ShieldCheck, Share2, Info, ArrowRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [copiedChannel, setCopiedChannel] = useState<string | null>(null);
  const [qrMayorista, setQrMayorista] = useState<string>("");
  const [qrMinorista, setQrMinorista] = useState<string>("");
  const [origin, setOrigin] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const storeUid = uid || data?.settings?.uid || "";
  const businessName = data?.settings?.business_name || "Mi Zapatería";
  const whatsappNumber = data?.settings?.whatsapp || data?.settings?.phone || "";
  const wholesaleMinQty = data?.settings?.wholesale_min_qty && Number(data.settings.wholesale_min_qty) !== 6 ? Number(data.settings.wholesale_min_qty) : 12;
  const wholesaleTerms = data?.settings?.wholesale_terms || "Precios mayoristas desde el mínimo indicado.";
  const activeProducts = (data?.products || []).filter((p: any) => p.total_stock > 0);

  const mayoristaUrl = useMemo(() => {
    if (!origin || !storeUid) return "";
    return `${origin}/tienda?store=${encodeURIComponent(storeUid)}&tipo=mayorista`;
  }, [origin, storeUid]);

  const minoristaUrl = useMemo(() => {
    if (!origin || !storeUid) return "";
    return `${origin}/tienda?store=${encodeURIComponent(storeUid)}&tipo=minorista`;
  }, [origin, storeUid]);

  // Generar códigos QR para ambos canales
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
    if (minoristaUrl) {
      QRCode.toDataURL(minoristaUrl, {
        width: 320,
        margin: 2,
        color: { dark: "#0f2137", light: "#ffffff" },
      })
        .then(setQrMinorista)
        .catch(console.error);
    }
  }, [mayoristaUrl, minoristaUrl]);

  const copyToClipboard = (url: string, channel: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedChannel(channel);
    setToast(`Enlace de ${channel} copiado al portapapeles`);
    setTimeout(() => setCopiedChannel(null), 2500);
  };

  const shareViaWhatsApp = (url: string, isMayorista: boolean) => {
    const text = isMayorista
      ? `¡Hola! Te comparto nuestro catálogo de precios mayoristas de *${businessName}*:\n\n👉 ${url}\n\nPodés armar tu pedido eligiendo las cantidades deseadas y enviárnoslo directamente por acá.`
      : `¡Hola! Mirá los modelos disponibles en nuestra tienda de *${businessName}*:\n\n👉 ${url}\n\nPodes elegir tus favoritos y enviarnos tu pedido fácilmente por WhatsApp.`;

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
            body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; }
            .card { max-width: 480px; margin: 0 auto; border: 2px solid #0f2137; border-radius: 24px; padding: 32px; }
            h1 { font-size: 26px; margin-bottom: 4px; color: #0f2137; }
            p { color: #555; margin-top: 4px; }
            .badge { display: inline-block; background: #0f2137; color: white; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 13px; text-transform: uppercase; margin-bottom: 20px; }
            img { width: 280px; height: 280px; margin: 20px 0; }
            .hint { font-size: 14px; color: #777; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">${title}</div>
            <h1>${businessName}</h1>
            <p>${subtitle}</p>
            <img src="${dataUrl}" alt="QR" />
            <p class="hint">Escaneá con la cámara de tu celular para ingresar y realizar tu pedido.</p>
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); }
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
          <div className="flex items-center gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Store className="size-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tienda Online & Catálogos</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Compartí tus catálogos de venta con clientes mayoristas o minoristas y recibí los pedidos armados en tu WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 rounded-xl"
            onClick={() => setSection("configuracion")}
          >
            Configuración general
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-muted/30">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Calzados con Stock</p>
              <p className="mt-1 text-2xl font-black">{activeProducts.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Visibles en catálogo</p>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">
              <ShoppingBag className="size-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-muted/30">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mínimo Mayorista</p>
              <p className="mt-1 text-2xl font-black">{wholesaleMinQty} pares</p>
              <p className="mt-1 text-xs text-muted-foreground">Por pedido mayorista</p>
              <button
                type="button"
                onClick={() => setSection("settings")}
                className="mt-1 text-[11px] font-bold text-primary hover:underline block cursor-pointer"
              >
                Modificar regla →
              </button>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-950/40">
              <Tags className="size-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-muted/30">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recepción WhatsApp</p>
              <p className="mt-1 text-lg font-bold truncate max-w-[150px]" title={whatsappNumber || "Sin configurar"}>
                {whatsappNumber || "Sin configurar"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Recibe los pedidos</p>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
              <MessageCircle className="size-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-muted/30">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Canales Activos</p>
              <p className="mt-1 text-2xl font-black">2 Canales</p>
              <p className="mt-1 text-xs text-muted-foreground">Mayorista y Minorista</p>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/40">
              <Sparkles className="size-6" />
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

      {/* Channel Tabs */}
      <Tabs defaultValue="mayorista" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2 p-1 rounded-2xl bg-muted/70">
          <TabsTrigger value="mayorista" className="rounded-xl gap-2 font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Tags className="size-4 text-orange-500" />
            Catálogo Mayorista
          </TabsTrigger>
          <TabsTrigger value="minorista" className="rounded-xl gap-2 font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <ShoppingBag className="size-4 text-primary" />
            Catálogo Minorista
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CATÁLOGO MAYORISTA */}
        <TabsContent value="mayorista" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Shareable Link & Options */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border-0">
                      Precios Mayoristas Exclusivos
                    </Badge>
                  </div>
                  <CardTitle className="text-xl mt-1">Enlace Compartible Mayorista</CardTitle>
                  <CardDescription>
                    Compartí este enlace con revendedores, distribuidores o clientes mayoristas. Solo verán los precios mayoristas y podrán armar su pedido.
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
                      variant={copiedChannel === "mayorista" ? "secondary" : "outline"}
                      onClick={() => copyToClipboard(mayoristaUrl, "mayorista")}
                      className="h-11 shrink-0 gap-1.5 rounded-xl font-semibold"
                    >
                      {copiedChannel === "mayorista" ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                      {copiedChannel === "mayorista" ? "Copiado" : "Copiar"}
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Button
                      onClick={() => window.open(mayoristaUrl, "_blank")}
                      className="gap-2 rounded-xl bg-primary text-primary-foreground font-semibold"
                    >
                      <ExternalLink className="size-4" />
                      Ver como cliente
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => shareViaWhatsApp(mayoristaUrl, true)}
                      className="gap-2 rounded-xl border-emerald-500/50 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 font-semibold"
                    >
                      <MessageCircle className="size-4 text-emerald-600" />
                      Compartir por WhatsApp
                    </Button>
                  </div>

                  <div className="mt-4 rounded-xl border bg-muted/30 p-4 text-xs space-y-1.5 text-muted-foreground">
                    <p className="font-bold text-foreground">Reglas del Catálogo Mayorista:</p>
                    <p>• Los clientes visualizan exclusivamente los precios mayoristas definidos para cada calzado.</p>
                    <p>• Mínimo de compra requerido configurado: <strong>{wholesaleMinQty} pares</strong>.</p>
                    <p>• Al confirmar el pedido, el carrito se formatea y se envía a tu WhatsApp con el detalle por modelo y cantidad.</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* QR Code Panel */}
            <div className="lg:col-span-5">
              <Card className="border-0 shadow-sm text-center">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-center gap-2">
                    <QrCode className="size-5 text-orange-500" />
                    Código QR Mayorista
                  </CardTitle>
                  <CardDescription>
                    Ideal para imprimir en tarjetas o folletos para revendedores
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
                    Tus clientes pueden escanear este código con la cámara de su teléfono para ingresar directamente al catálogo.
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
        </TabsContent>

        {/* TAB 2: CATÁLOGO MINORISTA */}
        <TabsContent value="minorista" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Shareable Link & Options */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-0">
                      Venta al Público Minorista
                    </Badge>
                  </div>
                  <CardTitle className="text-xl mt-1">Enlace Compartible Minorista</CardTitle>
                  <CardDescription>
                    Compartí este enlace con tus clientes particulares o en tus redes sociales (Instagram, Facebook). Muestra precios de venta al público sin mínimo de pares.
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
                      variant={copiedChannel === "minorista" ? "secondary" : "outline"}
                      onClick={() => copyToClipboard(minoristaUrl, "minorista")}
                      className="h-11 shrink-0 gap-1.5 rounded-xl font-semibold"
                    >
                      {copiedChannel === "minorista" ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                      {copiedChannel === "minorista" ? "Copiado" : "Copiar"}
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Button
                      onClick={() => window.open(minoristaUrl, "_blank")}
                      className="gap-2 rounded-xl bg-primary text-primary-foreground font-semibold"
                    >
                      <ExternalLink className="size-4" />
                      Ver como cliente
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => shareViaWhatsApp(minoristaUrl, false)}
                      className="gap-2 rounded-xl border-emerald-500/50 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 font-semibold"
                    >
                      <MessageCircle className="size-4 text-emerald-600" />
                      Compartir por WhatsApp
                    </Button>
                  </div>

                  <div className="mt-4 rounded-xl border bg-muted/30 p-4 text-xs space-y-1.5 text-muted-foreground">
                    <p className="font-bold text-foreground">Reglas del Catálogo Minorista:</p>
                    <p>• Los clientes visualizan el precio de venta al público final (`retail_price`).</p>
                    <p>• Compra libre desde 1 par, sin mínimos de cantidad.</p>
                    <p>• El cliente puede elegir talle y coordinar entrega y pago directamente con vos por WhatsApp.</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* QR Code Panel */}
            <div className="lg:col-span-5">
              <Card className="border-0 shadow-sm text-center">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-center gap-2">
                    <QrCode className="size-5 text-primary" />
                    Código QR Minorista
                  </CardTitle>
                  <CardDescription>
                    Ideal para colocar en la vidriera o mostrador de tu local
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
                    Colocalo en la vidriera para que los transeúntes puedan escanearlo y consultar los modelos disponibles aun cuando el local esté cerrado.
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
                      onClick={() => printQr(qrMinorista, "Tienda Online", "Escaneá y mirá todos nuestros modelos disponibles")}
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
      </Tabs>
    </div>
  );
}
