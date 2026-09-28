"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loadPublicStore } from "@/lib/store-service";
import { PublicStore } from "@/components/public-store";
import { Store, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

function TiendaView() {
  const searchParams = useSearchParams();
  const [storeUid, setStoreUid] = useState<string>("");
  const [channel, setChannel] = useState<"mayorista" | "minorista">("mayorista");
  const [storeData, setStoreData] = useState<{ settings: any; products: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // Read params from searchParams or fallback to window.location
    let uid = searchParams.get("store") || searchParams.get("uid") || searchParams.get("id");
    let tipo = searchParams.get("tipo") || searchParams.get("channel");

    if (!uid && typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      uid = urlParams.get("store") || urlParams.get("uid") || urlParams.get("id");
      tipo = urlParams.get("tipo") || urlParams.get("channel");
    }

    const cleanUid = String(uid || "").trim();
    const cleanChannel: "mayorista" | "minorista" =
      tipo === "minorista" || tipo === "retail" ? "minorista" : "mayorista";

    setStoreUid(cleanUid);
    setChannel(cleanChannel);

    if (!cleanUid) {
      setError("No se indicó el identificador de la zapatería en el enlace (parámetro ?store=...).");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    loadPublicStore(cleanUid)
      .then((res) => {
        setStoreData({ settings: res.settings, products: res.products });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error cargando tienda:", err);
        setError("No se pudo cargar el catálogo de la zapatería. Verificá que el enlace sea correcto.");
        setLoading(false);
      });
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-600 animate-pulse">
            <Store className="w-7 h-7 animate-bounce" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Cargando catálogo...</h3>
            <p className="text-sm text-slate-500 mt-1">Conectando con el inventario de la zapatería</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !storeData) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 p-6">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Catálogo no disponible</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {error || "No encontramos los datos de esta zapatería."}
          </p>
          <div className="pt-2">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="gap-2 rounded-xl"
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PublicStore
      settings={storeData.settings}
      products={storeData.products}
      channel={channel}
      storeUid={storeUid}
    />
  );
}

export default function TiendaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center bg-slate-50">
          <div className="size-10 animate-spin rounded-full border-4 border-indigo-600/20 border-t-indigo-600" />
        </div>
      }
    >
      <TiendaView />
    </Suspense>
  );
}
