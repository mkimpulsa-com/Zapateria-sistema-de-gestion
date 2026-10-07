"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive, ArrowDownLeft, ArrowRightLeft, ArrowUpRight, BarChart3, Barcode, Boxes, Building2,
  Camera, Check, CircleDollarSign, ClipboardList, Database, Download,
  FileText, FolderTree, Landmark, LayoutDashboard, Moon, PackagePlus, Pencil, Percent, Plus, Printer, ScanLine,
  Search, Settings, ShieldAlert, ShoppingBag, ShoppingCart, SlidersHorizontal, Store, Sun, Tags, Trash2, TrendingUp, Truck,
  Upload, UserPlus, UserRound, Users, Wallet, WalletCards, Monitor, Palette, Save, Volume2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { createStoreBackup, loadStore, runStoreAction, uploadBusinessLogo, subscribeStoreOrders, type StoreOrder } from "@/lib/store-service";
import { OrdersView } from "@/components/orders-view";
import { NewProductModal } from "@/components/new-product-modal";
import { EditProductModal } from "@/components/edit-product-modal";
import { AdjustProductStockModal } from "@/components/adjust-product-stock-modal";
import { NewCustomerModal } from "@/components/new-customer-modal";
import { EditCustomerModal } from "@/components/edit-customer-modal";
import { AdjustCustomerDebtModal } from "@/components/adjust-customer-debt-modal";
import { CustomerDetailModal } from "@/components/customer-detail-modal";
import { CustomersView } from "@/components/customers-view";
import { NewSupplierModal } from "@/components/new-supplier-modal";
import { EditSupplierModal } from "@/components/edit-supplier-modal";
import { AdjustSupplierDebtModal } from "@/components/adjust-supplier-debt-modal";
import { SupplierDetailModal } from "@/components/supplier-detail-modal";
import { SuppliersView } from "@/components/suppliers-view";
import { DashboardView } from "@/components/dashboard-view";
import { SaleInvoiceModal } from "@/components/sale-invoice-modal";
import { CashReceiptModal } from "@/components/cash-receipt-modal";
import { EditCashMovementModal } from "@/components/edit-cash-movement-modal";
import { NewBankAccountModal } from "@/components/new-bank-account-modal";
import { EditBankAccountModal } from "@/components/edit-bank-account-modal";
import { TransferBalanceModal } from "@/components/transfer-balance-modal";
import { BankAccountsView } from "@/components/bank-accounts-view";
import { BankAccountSelectField } from "@/components/bank-account-select-field";
import { WholesaleStoreAdmin } from "@/components/wholesale-store-admin";
import { CategoriesSettingsView } from "@/components/categories-settings-view";
import { ProductBarcodeModal } from "@/components/product-barcode-modal";
import { BarcodeView } from "@/components/barcode-view";
import { StaffSettingsView } from "@/components/staff-settings-view";
import { cleanBarcodeScan, isBarcodeMatch } from "@/lib/barcode";
import { formatMoney, formatNumber, convertAmount, getCurrencyEquivalents, CURRENCIES } from "@/lib/currency";

type Variant = { id:number; product_id:number; size:string; stock:number };
type Product = { id:number; sku:string; barcode:string; name:string; brand:string; category:string; color:string; gender:string; cost:number; retail_price:number; wholesale_price:number; min_stock:number; total_stock:number; image_url?:string; variants:Variant[] };
type Party = { id:number; name:string; type?:string; phone:string; email?:string; balance:number; credit_limit?:number; contact?:string; document?:string; city?:string; address?:string; notes?:string; created_at?:string; bank_info?:string; category?:string };
type Sale = { id:number; receipt_no:string; customer_id?:string; customer_name?:string; channel:string; total:number; paid_amount?:number; debt_amount?:number; pending_amount?:number; payment_method:string; status:string; created_at:string; bank_account_id?:string; bank_account_name?:string; subtotal?:number; discount?:number; discount_percent?:number; additional_charge?:number; additional_charge_description?:string; cashier_id?:string; cashier_name?:string; currency?:string };
type Movement = { id:number|string; type:"ingreso"|"egreso"; category:string; amount:number; description:string; reference:string; created_at:string };
type StoreData = { settings:any; products:Product[]; customers:Party[]; suppliers:Party[]; sales:Sale[]; movements:Movement[]; stockMoves:any[]; customerMoves:any[]; supplierMoves:any[]; bankAccounts:any[]; bankMoves:any[]; categories:any[]; staff?:any[]; stats:{revenueToday:number;salesToday:number;stockValue:number;cashBalance:number;bankBalance:number;bankBalanceArs?:number;bankBalanceBrl?:number;bankBalanceUsd?:number;lowStock:number;productCount:number} };
type CartItem = { productId:number; variantId:number; name:string; size:string; quantity:number; unitPrice:number; max:number };

const nav = [
  ["resumen", "Resumen", LayoutDashboard], ["ventas", "Punto de venta", ShoppingCart],
  ["pedidos", "Pedidos Web", ClipboardList],
  ["productos", "Productos", ShoppingBag], ["inventario", "Inventario", Boxes],
  ["clientes", "Clientes", Users], ["proveedores", "Proveedores", Truck],
  ["caja", "Caja e ingresos", WalletCards], ["tienda", "Tienda Online", Store],
  ["catalogos", "Catálogos", FileText],
  ["reportes", "Reportes", BarChart3], ["configuracion", "Configuración", Settings],
] as const;

const cashierNav = [
  ["ventas", "Punto de venta", ShoppingCart],
  ["pedidos", "Pedidos Web", ClipboardList],
  ["inventario", "Stock por talle", Boxes],
  ["caja", "Caja de turno", WalletCards],
  ["clientes", "Clientes", Users],
  ["catalogos", "Catálogos", FileText],
] as const;

const money = (value: number, curr = "BRL") => formatMoney(value, curr);
const date = (value:string) => new Intl.DateTimeFormat("es-AR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }).format(new Date(value));

function Field({ label, name, defaultValue, type="text", placeholder, required=false, step }: {label:string;name:string;defaultValue?:string|number;type?:string;placeholder?:string;required?:boolean;step?:string}) {
  return <label className="grid gap-1.5 text-sm font-medium"><span>{label}</span><Input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} required={required} step={step} /></label>;
}

function StatCard({ label, value, note, icon:Icon, tone="blue" }:any) {
  const tones:Record<string, string> = {
    blue: "clay-pill-blue",
    green: "clay-pill-green",
    coral: "clay-pill-coral",
    violet: "clay-pill-violet",
  };
  return (
    <Card className="gap-3 py-5 group">
      <CardContent className="flex items-start justify-between px-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{note}</p>
        </div>
        <span className={`clay-pill-3d size-12 shrink-0 ${tones[tone] || tones.blue}`}>
          <Icon className="size-5.5" strokeWidth={2.3} />
        </span>
      </CardContent>
    </Card>
  );
}

function SectionTitle({ eyebrow, title, text, action }:any) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">{eyebrow}</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>{text && <p className="mt-1 text-sm text-muted-foreground">{text}</p>}</div>{action}</div>;
}

function ModalForm({ open, onOpenChange, title, description, children, onSubmit, submit="Guardar" }:{open:boolean;onOpenChange:(v:boolean)=>void;title:string;description:string;children:any;onSubmit:(e:FormEvent<HTMLFormElement>)=>void;submit?:string}) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><form onSubmit={onSubmit} className="grid gap-4"><div className="grid gap-4 sm:grid-cols-2">{children}</div><div className="mt-2 flex justify-end gap-2"><Button type="button" variant="outline" onClick={()=>onOpenChange(false)}>Cancelar</Button><Button type="submit">{submit}</Button></div></form></DialogContent></Dialog>;
}

function BarcodeLabel({ value }:{value:string}) {
  return (
    <div className="flex flex-col items-center">
      <BarcodeView
        value={value}
        className="h-10 w-full max-w-56"
        height={36}
        width={1.6}
        margin={8}
      />
      <span className="mt-1 font-mono text-[11px] font-bold tracking-[.16em]">{value}</span>
    </div>
  );
}

export default function StoreApp({
  user,
  role = "admin",
  storeId,
  staffProfile,
}: {
  user?: any;
  role?: "admin" | "cajera";
  storeId?: string;
  staffProfile?: any;
}) {
  const isCashier = role === "cajera";
  const targetUid = storeId || user?.uid;
  const uid = targetUid;
  const [data,setData]=useState<StoreData|null>(null); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  const [section,setSection]=useState<string>(isCashier ? "ventas" : "resumen"); const [query,setQuery]=useState(""); const [dark,setDark]=useState(false);
  const [modal,setModal]=useState(""); const [toast,setToast]=useState(""); const [channel,setChannel]=useState<"mayorista"|"minorista">("minorista");
  const [adjustTarget,setAdjustTarget]=useState<{v:Variant;p:Product}|null>(null);
  const [editingProduct,setEditingProduct]=useState<Product|null>(null);
  const [adjustingProduct,setAdjustingProduct]=useState<Product|null>(null);
  const [deletingProduct,setDeletingProduct]=useState<Product|null>(null);
  const [editingCustomer,setEditingCustomer]=useState<any|null>(null);
  const [adjustingCustomer,setAdjustingCustomer]=useState<any|null>(null);
  const [viewingCustomer,setViewingCustomer]=useState<any|null>(null);
  const [deletingCustomer,setDeletingCustomer]=useState<any|null>(null);
  const [editingSupplier,setEditingSupplier]=useState<any|null>(null);
  const [adjustingSupplier,setAdjustingSupplier]=useState<any|null>(null);
  const [viewingSupplier,setViewingSupplier]=useState<any|null>(null);
  const [deletingSupplier,setDeletingSupplier]=useState<any|null>(null);
  const [editingCashMovement,setEditingCashMovement]=useState<any|null>(null);
  const [viewingCashMovement,setViewingCashMovement]=useState<any|null>(null);
  const [deletingCashMovement,setDeletingCashMovement]=useState<any|null>(null);
  const [editingBankAccount,setEditingBankAccount]=useState<any|null>(null);
  const [transferModalOpen,setTransferModalOpen]=useState(false);
  const [bankAccountId,setBankAccountId]=useState("");
  const [cart,setCart]=useState<CartItem[]>([]);
  const [discount,setDiscount]=useState(0);
  const [discountPercent,setDiscountPercent]=useState(0);
  const [additionalCharge,setAdditionalCharge]=useState(0);
  const [additionalChargeDescription,setAdditionalChargeDescription]=useState("");
  const [payment,setPayment]=useState("Efectivo");
  const [customerId,setCustomerId]=useState("");
  const [scan,setScan]=useState(""); const [catalogPrice,setCatalogPrice]=useState<"wholesale"|"retail"|"both">("both"); const [invoiceSale,setInvoiceSale]=useState<any|null>(null); const videoRef=useRef<HTMLVideoElement>(null);
  const [orders, setOrders] = useState<StoreOrder[]>([]);

  const load=async()=>{try{const storeData=await loadStore(uid) as StoreData;setData(storeData);if(!bankAccountId&&storeData?.bankAccounts?.length){setBankAccountId(String(storeData.bankAccounts[0].id));}setError("");}catch(e:any){setError(e.message||"No se pudo cargar");}};
  useEffect(()=>{load();},[uid]);

  // Sincronización en tiempo real de pedidos de clientes
  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeStoreOrders(
      uid,
      (liveOrders) => {
        setOrders(liveOrders);
      },
      (err) => {
        console.error("Error al sincronizar pedidos en vivo:", err);
      }
    );
    return () => unsub();
  }, [uid]);
  useEffect(()=>{document.documentElement.classList.toggle("dark",dark);},[dark]);
  useEffect(()=>{
    if(!data?.settings)return;
    const theme=data.settings.theme_default;
    if(theme==="dark")setDark(true);
    else if(theme==="light")setDark(false);
    else setDark(window.matchMedia?.("(prefers-color-scheme: dark)").matches??false);
    const defChannel = (data.settings.default_channel as "mayorista" | "minorista") || "minorista";
    setChannel(defChannel);
    setCatalogPrice((data.settings.catalog_default_price as any) || "both");
    const methods=String(data.settings.payment_methods||"Efectivo").split(",").map((x:string)=>x.trim()).filter(Boolean);
    if(methods.length&&!methods.includes(payment))setPayment(methods[0]);
  },[data?.settings?.theme_default,data?.settings?.default_channel,data?.settings?.catalog_default_price,data?.settings?.payment_methods]);
  useEffect(()=>{
    if(data?.bankAccounts?.length && (!bankAccountId || !data.bankAccounts.some((a:any)=>String(a.id)===String(bankAccountId)))){
      setBankAccountId(String(data.bankAccounts[0].id));
    }
  },[data?.bankAccounts]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(""),2600);return()=>clearTimeout(t);},[toast]);
  useEffect(()=>{
    const ctx=(document as any).modelContext;if(!ctx?.registerTool)return;const life=new AbortController();
    Promise.resolve(ctx.registerTool({name:"search_inventory",title:"Buscar inventario",description:"Busca productos por nombre, SKU, marca o código y devuelve stock por talle.",inputSchema:{type:"object",properties:{query:{type:"string"}},required:["query"],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:({query:q}:any)=>{const term=String(q).toLowerCase();return {products:(data?.products??[]).filter(p=>[p.name,p.sku,p.brand,p.barcode].join(" ").toLowerCase().includes(term)).slice(0,12).map(p=>({name:p.name,sku:p.sku,stock:p.total_stock,sizes:p.variants.filter(v=>v.stock>0).map(v=>`${v.size}:${v.stock}`)}))};}},{signal:life.signal})).catch(()=>{});
    Promise.resolve(ctx.registerTool({name:"start_new_sale",title:"Iniciar venta",description:"Abre el punto de venta (minorista o mayorista).",inputSchema:{type:"object",properties:{channel:{type:"string",enum:["minorista","mayorista"]}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:({channel:ch}:any)=>{if(ch==="mayorista"||ch==="minorista")setChannel(ch);setSection("ventas");return {status:"ready",channel:ch||channel};}},{signal:life.signal})).catch(()=>{});
    return()=>life.abort();
  },[data,channel]);

  const action=async(body:any,success:string)=>{setBusy(true);try{const nextData:any=await runStoreAction(body,uid);setData(nextData as StoreData);setToast(success);if(body.action!=="create_category")setModal("");if(nextData?.createdCustomer?.id){setCustomerId(String(nextData.createdCustomer.id));if(nextData.createdCustomer.type==="mayorista")setChannel("mayorista");}if(nextData?.createdBankAccount?.id){setBankAccountId(String(nextData.createdBankAccount.id));}return nextData;}catch(e:any){setToast(e.message||"No se pudo guardar");return false;}finally{setBusy(false);}};
  const fromForm=(e:FormEvent<HTMLFormElement>)=>Object.fromEntries(new FormData(e.currentTarget).entries());
  const filtered=useMemo(()=>{
    const q=cleanBarcodeScan(query).toLowerCase();
    return (data?.products??[]).filter(p=>!q||isBarcodeMatch(p.barcode, q)||[p.name,p.sku,p.barcode,p.brand,p.category,p.color].join(" ").toLowerCase().includes(q));
  },[data,query]);
  const cartTotal=Math.max(0, cart.reduce((s,i)=>s+i.unitPrice*i.quantity,0)-discount+(Number(additionalCharge)||0));
  const addVariant=(p:Product,v:Variant)=>{
    const allowNegative=Boolean(data?.settings?.allow_negative_stock);
    if(v.stock<=0&&!allowNegative)return;
    const price=channel==="mayorista"?p.wholesale_price:(p.retail_price || p.wholesale_price);
    setCart(c=>{
      const found=c.find(i=>i.variantId===v.id);
      const max=allowNegative?9999:v.stock;
      return found?c.map(i=>i.variantId===v.id?{...i,quantity:Math.min(i.quantity+1,max),max,unitPrice:price}:i):[...c,{productId:p.id,variantId:v.id,name:p.name,size:v.size,quantity:1,unitPrice:price,max}];
    });
    setToast(`${p.name} · talle ${v.size}`);
  };

  const handleChannelChange = (newChannel: "minorista" | "mayorista") => {
    setChannel(newChannel);
    setCart(prevCart =>
      prevCart.map(item => {
        const prod = data?.products.find(p => p.id === item.productId);
        if (!prod) return item;
        const newPrice = newChannel === "mayorista" ? prod.wholesale_price : (prod.retail_price || prod.wholesale_price);
        return { ...item, unitPrice: newPrice };
      })
    );
  };

  const handleOrderToSale = (order: StoreOrder) => {
    const newCartItems: CartItem[] = [];
    const allowNegative = Boolean(data?.settings?.allow_negative_stock);

    for (const item of order.items) {
      const prod = (data?.products || []).find(
        (p) => String(p.id) === String(item.productId) || p.name.toLowerCase() === item.name.toLowerCase()
      );
      let variant: Variant | undefined;
      if (prod) {
        if (item.variantId) {
          variant = prod.variants.find((v) => String(v.id) === String(item.variantId));
        }
        if (!variant && item.size) {
          variant = prod.variants.find((v) => String(v.size) === String(item.size));
        }
        if (!variant && prod.variants.length > 0) {
          variant = prod.variants[0];
        }
      }

      const varId = variant?.id || Number(item.variantId) || Number(Date.now().toString().slice(-6));
      const prodId = prod?.id || Number(item.productId) || 0;
      const maxStock = allowNegative ? 9999 : (variant?.stock ?? 99);

      newCartItems.push({
        productId: prodId,
        variantId: varId,
        name: item.name,
        size: item.size || variant?.size || "Estándar",
        quantity: item.qty,
        unitPrice: item.price,
        max: maxStock,
      });
    }

    setCart(newCartItems);
    setChannel(order.channel);

    // Si el cliente existe registrado, seleccionarlo
    const cleanOrderPhone = order.customerPhone.replace(/[^0-9]/g, "");
    const matchedCustomer = (data?.customers || []).find((c: any) =>
      (cleanOrderPhone && c.phone && c.phone.replace(/[^0-9]/g, "") === cleanOrderPhone) ||
      (c.name && order.customerName && c.name.toLowerCase().trim() === order.customerName.toLowerCase().trim())
    );
    if (matchedCustomer) {
      setCustomerId(String(matchedCustomer.id));
    }

    setSection("ventas");
    setToast(`Pedido ${order.orderNumber} cargado al Punto de Venta`);
  };

  const scanProduct = (code = scan) => {
    const value = cleanBarcodeScan(code);
    // Limpiar siempre de inmediato para evitar que el siguiente disparo de la pistola concatene códigos
    setScan("");
    if (!value) return;

    // 1. Coincidencia inteligente por código de barras (EAN-13, 12 vs 13 dígitos, UPC) o SKU
    let p = data?.products.find(p => isBarcodeMatch(p.barcode, value) || p.sku.toLowerCase() === value.toLowerCase());
    if (!p) {
      const matches = (data?.products || []).filter(item =>
        isBarcodeMatch(item.barcode, value) ||
        [item.name, item.sku, item.barcode, item.brand].join(" ").toLowerCase().includes(value.toLowerCase())
      );
      if (matches.length === 1) {
        p = matches[0];
      }
    }
    const v = p?.variants.find(v => v.stock > 0) || (data?.settings?.allow_negative_stock ? p?.variants[0] : undefined);
    if (p && v) {
      addVariant(p, v);
      if (data?.settings?.scan_sound) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioContextClass();
          const oscillator = ctx.createOscillator();
          const gain = ctx.createGain();
          oscillator.frequency.value = 880;
          gain.gain.value = 0.055;
          oscillator.connect(gain);
          gain.connect(ctx.destination);
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.09);
        } catch {}
      }
    } else if (p && !v) {
      setToast(`El producto "${p.name}" no tiene variantes con stock disponible`);
    } else {
      setToast(`Código "${value}" no encontrado`);
    }
  };
  const closeSale=async(paidAmountOverride?:number, options?: { discount?: number; discountPercent?: number; additionalCharge?: number; additionalChargeDescription?: string; currency?: "BRL" | "ARS" | "USD" | string; exchangeRate?: number; exchangeRateArs?: number; exchangeRateUsd?: number })=>{
    const finalDiscount = options?.discount !== undefined ? options.discount : discount;
    const finalDiscountPercent = options?.discountPercent !== undefined ? options.discountPercent : discountPercent;
    const finalAdditionalCharge = options?.additionalCharge !== undefined ? options.additionalCharge : additionalCharge;
    const finalAdditionalChargeDescription = options?.additionalChargeDescription !== undefined ? options.additionalChargeDescription : additionalChargeDescription;

    const res:any=await action({
      action:"create_sale",
      items:cart,
      discount: finalDiscount,
      discountPercent: finalDiscountPercent,
      additionalCharge: finalAdditionalCharge,
      additionalChargeDescription: finalAdditionalChargeDescription,
      paymentMethod:payment,
      customerId,
      channel: channel,
      bankAccountId,
      paidAmount: paidAmountOverride,
      cashierId: isCashier ? user?.uid : null,
      cashierName: isCashier ? (staffProfile?.name || user?.email || "Cajera") : "Administrador",
      currency: options?.currency || data?.settings?.currency || "BRL",
      exchangeRate: options?.exchangeRate,
      exchangeRateArs: options?.exchangeRateArs,
      exchangeRateUsd: options?.exchangeRateUsd,
    },"Venta registrada exitosamente");
    if(res){
      if(res.createdSale){
        setInvoiceSale(res.createdSale);
      }
      setCart([]);
      setDiscount(0);
      setDiscountPercent(0);
      setAdditionalCharge(0);
      setAdditionalChargeDescription("");
      setCustomerId("");
    }
  };

  useEffect(() => {
    if (isCashier && !cashierNav.some(([id]) => id === section)) {
      setSection("ventas");
    }
  }, [isCashier, section]);

  useEffect(()=>{if(modal!=="product")return;const frame=requestAnimationFrame(()=>{const input=document.querySelector<HTMLInputElement>('input[name="sizes"]');if(input)input.value=String(data?.settings?.default_sizes||"35,36,37,38,39,40");});return()=>cancelAnimationFrame(frame);},[modal,data?.settings?.default_sizes]);

  useEffect(()=>{ if(modal!=="scanner")return; let stream:MediaStream|undefined; let frame=0; let cancelled=false; (async()=>{try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play();}const Detector=(window as any).BarcodeDetector;if(!Detector)throw new Error("La cámara no admite lectura automática en este navegador.");const detector=new Detector({formats:["ean_13","ean_8","code_128","code_39"]});const tick=async()=>{if(cancelled||!videoRef.current)return;try{const codes=await detector.detect(videoRef.current);if(codes[0]?.rawValue){const value=cleanBarcodeScan(codes[0].rawValue);setScan("");setModal("");scanProduct(value);return;}}catch{}frame=requestAnimationFrame(tick);};tick();}catch(e:any){setToast(e.message||"No se pudo abrir la cámara");setModal("");}})();return()=>{cancelled=true;cancelAnimationFrame(frame);stream?.getTracks().forEach(t=>t.stop());}; },[modal]);

  if(!data && !error) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="text-center"><div className="mx-auto mb-4 size-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary"/><p className="text-sm text-muted-foreground">Preparando tu sistema…</p></div></div>;
  if(error) return <div className="flex min-h-screen items-center justify-center p-6"><Card className="max-w-md"><CardContent><h1 className="text-xl font-bold">No pudimos abrir el sistema</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button className="mt-5" onClick={load}>Reintentar</Button></CardContent></Card></div>;

  const business=data!.settings?.business_name||"CR MAYORISTA";
  const activeNavList = isCashier ? cashierNav : nav;
  const pageTitle=activeNavList.find(n=>n[0]===section)?.[1]||(isCashier ? "Punto de venta" : "Resumen");

  return <div className={`min-h-screen bg-background text-foreground ${data!.settings?.nav_density==="compact"?"nav-compact":""} ${data!.settings?.motion_level==="reduced"?"motion-reduced":""}`}>
    <header className="top-shell no-print sticky top-0 z-40">
      <div className="top-brandbar mx-auto flex min-h-20 max-w-[1800px] flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-7 lg:px-9">
        <button className="brand-block flex shrink-0 items-center gap-3 text-left" onClick={()=>setSection(isCashier ? "ventas" : "resumen")} aria-label="Ir al inicio">
          <span className="brand-orb grid size-11 place-items-center overflow-hidden rounded-2xl text-white">{data!.settings?.logo_url?<img src={data!.settings.logo_url} alt="" className="size-full object-contain"/>:<ShoppingBag className="size-6"/>}</span>
          <span className="hidden min-w-0 sm:block"><span className="block max-w-52 truncate text-base font-extrabold">{business}</span><span className="block text-xs text-muted-foreground">{data!.settings?.branch_name||"Sucursal principal"} · Minorista & Mayorista</span></span>
        </button>
        <span className="current-section hidden rounded-full px-3 py-1.5 text-xs font-bold xl:inline-flex">{pageTitle}</span>
        <div className="relative order-3 w-full sm:order-none sm:ml-auto sm:max-w-md"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input value={query} onChange={e=>setQuery(e.target.value)} className="h-11 rounded-xl bg-card pl-9" placeholder="Buscar producto, código, marca…"/></div>
        {isCashier ? (
          <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 shrink-0">
            <UserRound className="size-3.5 text-amber-600 dark:text-amber-400" />
            <span className="truncate max-w-[170px]">Cajera: {staffProfile?.name || user?.email}</span>
          </div>
        ) : (
          user?.email && (
            <div className="hidden lg:flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-1.5 border border-border/60 text-xs font-medium text-muted-foreground shrink-0">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="truncate max-w-[150px]" title={user.email}>{user.email}</span>
            </div>
          )
        )}
        <Button variant="outline" size="icon" className="ml-auto shrink-0 rounded-xl sm:ml-0" onClick={()=>setDark(!dark)} aria-label={dark?"Activar modo claro":"Activar modo noche"}>{dark?<Sun/>:<Moon/>}</Button>
        {!isCashier && (
          <Button
            variant={section === "tienda" ? "default" : "outline"}
            className={`hidden h-11 shrink-0 rounded-xl gap-2 font-bold sm:flex ${
              section === "tienda"
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                : "border-indigo-500/40 text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400"
            }`}
            onClick={() => setSection("tienda")}
          >
            <Store className="size-4" />
            Tienda Online
          </Button>
        )}
        <Button className="hidden h-11 shrink-0 rounded-xl bg-[#ff7a5c] hover:bg-[#e9684c] sm:flex" onClick={()=>setSection("ventas")}><Plus/>Nueva venta</Button>
      </div>
      <div className="top-nav-rail">
        <nav className="top-section-nav mx-auto flex max-w-[1800px] items-start gap-1.5 overflow-x-auto px-4 py-2.5 sm:gap-3.5 sm:px-7 lg:px-9 2xl:justify-center" aria-label="Secciones principales">
          {activeNavList.map(([id, label, Icon]) => {
            const pendingOrdersCount = id === "pedidos" ? orders.filter((o) => o.status === "pendiente").length : 0;
            return (
              <button
                key={id}
                data-nav-id={id}
                onClick={() => setSection(id)}
                aria-current={section === id ? "page" : undefined}
                className={`top-section-button relative flex shrink-0 flex-col items-center gap-2 px-2.5 py-1.5 text-xs font-bold ${
                  section === id ? "is-active" : ""
                }`}
              >
                <span className="section-icon relative shrink-0">
                  <Icon className="size-6 shrink-0" strokeWidth={2.3} />
                  {pendingOrdersCount > 0 && (
                    <span
                      title={`${pendingOrdersCount} pedidos pendientes`}
                      className="absolute -top-1.5 -right-2 flex size-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-xs animate-bounce"
                    >
                      {pendingOrdersCount}
                    </span>
                  )}
                </span>
                <span className="section-label">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>

      <main className="glass-grid min-h-[calc(100vh-148px)] p-4 sm:p-7 lg:p-9">
        {!isCashier && section==="resumen"&&<DashboardView data={data!} setSection={setSection} addVariant={addVariant} setModal={setModal}/>} 
        {section==="ventas"&&<SalesPOSConfigured data={data!} filtered={filtered} channel={channel} setChannel={handleChannelChange} cart={cart} setCart={setCart} addVariant={addVariant} scan={scan} setScan={setScan} scanProduct={scanProduct} setModal={setModal} discount={discount} setDiscount={setDiscount} discountPercent={discountPercent} setDiscountPercent={setDiscountPercent} additionalCharge={additionalCharge} setAdditionalCharge={setAdditionalCharge} additionalChargeDescription={additionalChargeDescription} setAdditionalChargeDescription={setAdditionalChargeDescription} payment={payment} setPayment={setPayment} customerId={customerId} setCustomerId={setCustomerId} bankAccountId={bankAccountId} setBankAccountId={setBankAccountId} cartTotal={cartTotal} closeSale={closeSale} busy={busy}/>}
        {section==="pedidos"&&<OrdersView orders={orders} storeUid={uid} currency={data?.settings?.currency || "BRL"} onSelectOrderForSale={handleOrderToSale} setToast={setToast}/>}
        {!isCashier && section==="productos"&&<Products data={data!} filtered={filtered} setModal={setModal} onEdit={(p:Product)=>setEditingProduct(p)} onAdjust={(p:Product)=>setAdjustingProduct(p)} onDelete={(p:Product)=>setDeletingProduct(p)}/>} 
        {section==="inventario"&&<Inventory data={data!} filtered={filtered} isCashier={isCashier} onAddToCart={(p:Product,v:Variant)=>{addVariant(p,v);setSection("ventas");setToast(`${p.name} (Talle ${v.size}) agregado a la venta`);}} adjust={(v:Variant,p:Product)=>{setAdjustTarget({v,p});setModal("stock");}}/>}
        {section==="clientes"&&<CustomersView customers={data!.customers} sales={data!.sales} customerMoves={data!.customerMoves||[]} isCashier={isCashier} onNewCustomer={()=>setModal("customer")} onEditCustomer={(c:any)=>setEditingCustomer(c)} onAdjustDebt={(c:any)=>setAdjustingCustomer(c)} onViewDetail={(c:any)=>setViewingCustomer(c)} onDeleteCustomer={(c:any)=>setDeletingCustomer(c)}/>} 
        {!isCashier && section==="proveedores"&&<SuppliersView suppliers={data!.suppliers} supplierMoves={data!.supplierMoves||[]} onNewSupplier={()=>setModal("supplier")} onEditSupplier={(s:any)=>setEditingSupplier(s)} onAdjustDebt={(s:any)=>setAdjustingSupplier(s)} onViewDetail={(s:any)=>setViewingSupplier(s)} onDeleteSupplier={(s:any)=>setDeletingSupplier(s)}/>} 
        {section==="caja"&&<Cash data={data!} isCashier={isCashier} setModal={setModal} onEdit={(m:any)=>setEditingCashMovement(m)} onDelete={(m:any)=>setDeletingCashMovement(m)} onViewReceipt={(m:any)=>setViewingCashMovement(m)} />} 
        {!isCashier && section==="tienda"&&<WholesaleStoreAdmin data={data!} uid={uid} setSection={setSection} setToast={setToast}/>}
        {section==="catalogos"&&<CatalogConfigured data={data!} products={filtered}/>}
        {!isCashier && section==="reportes"&&<Reports data={data!} onSelectSale={(s:any)=>setInvoiceSale(s)}/>} 
        {!isCashier && section==="configuracion"&&<SettingsCenter data={data!} onSave={action} busy={busy} dark={dark} setDark={setDark} setToast={setToast} uid={uid} setModal={setModal} onEditBankAccount={(acc:any)=>setEditingBankAccount(acc)} onTransferModal={()=>setTransferModalOpen(true)}/>}
      </main>

    <NewProductModal
      open={modal==="product"}
      onOpenChange={v=>!v&&setModal("")}
      settings={data?.settings}
      defaultSizes={data?.settings?.default_sizes}
      categories={data?.categories || []}
      onNewCategory={async (name: string) => {
        return await action({ action: "create_category", name }, `Categoría "${name}" creada exitosamente`);
      }}
      busy={busy}
      onSubmit={async (payload)=>{
        return await action({ action: "create_product", ...payload }, "Producto y curva de stock creados exitosamente");
      }}
    />
    <EditProductModal
      open={Boolean(editingProduct)}
      onOpenChange={v=>!v&&setEditingProduct(null)}
      settings={data?.settings}
      product={editingProduct}
      categories={data?.categories || []}
      busy={busy}
      onSubmit={async (payload)=>{
        const ok=await action(payload,"Producto actualizado correctamente");
        if(ok)setEditingProduct(null);
        return ok;
      }}
    />
    <AdjustProductStockModal
      open={Boolean(adjustingProduct)}
      onOpenChange={v=>!v&&setAdjustingProduct(null)}
      product={adjustingProduct}
      busy={busy}
      onSubmit={async (payload)=>{
        const ok=await action(payload,"Stock actualizado correctamente");
        if(ok)setAdjustingProduct(null);
        return ok;
      }}
    />
    <AlertDialog open={Boolean(deletingProduct)} onOpenChange={v=>!v&&setDeletingProduct(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este producto?</AlertDialogTitle>
          <AlertDialogDescription>
            Vas a eliminar <strong>{deletingProduct?.name}</strong> ({deletingProduct?.brand} · {deletingProduct?.color}). Esta acción quitará el modelo y su stock del catálogo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async ()=>{
              if(!deletingProduct)return;
              await action({action:"delete_product",productId:deletingProduct.id},"Producto eliminado");
              setDeletingProduct(null);
            }}
          >
            {busy?"Eliminando…":"Sí, eliminar producto"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <NewCustomerModal
      open={modal==="customer"}
      onOpenChange={v=>!v&&setModal("")}
      busy={busy}
      onSubmit={async (payload)=>{
        return await action(payload, "Cliente registrado exitosamente");
      }}
    />
    <EditCustomerModal
      customer={editingCustomer}
      open={Boolean(editingCustomer)}
      onOpenChange={v=>!v&&setEditingCustomer(null)}
      busy={busy}
      onSubmit={async (payload)=>{
        const ok=await action(payload, "Cliente actualizado correctamente");
        if(ok)setEditingCustomer(null);
        return ok;
      }}
    />
    <AdjustCustomerDebtModal
      customer={adjustingCustomer}
      open={Boolean(adjustingCustomer)}
      onOpenChange={v=>!v&&setAdjustingCustomer(null)}
      busy={busy}
      onSubmit={async (payload)=>{
        const ok=await action(payload, "Saldo actualizado exitosamente");
        if(ok)setAdjustingCustomer(null);
        return ok;
      }}
    />
    <CustomerDetailModal
      customer={viewingCustomer}
      open={Boolean(viewingCustomer)}
      onOpenChange={v=>!v&&setViewingCustomer(null)}
      sales={data?.sales || []}
      customerMoves={data?.customerMoves || []}
      onAdjustDebt={(c:any)=>setAdjustingCustomer(c)}
      onEdit={(c:any)=>setEditingCustomer(c)}
      onSelectSale={(s:any)=>setInvoiceSale(s)}
    />
    <SaleInvoiceModal
      open={Boolean(invoiceSale)}
      onOpenChange={v=>!v&&setInvoiceSale(null)}
      sale={invoiceSale}
      settings={data?.settings}
      onNewSale={()=>{
        setInvoiceSale(null);
        setSection("ventas");
      }}
    />
    <AlertDialog open={Boolean(deletingCustomer)} onOpenChange={v=>!v&&setDeletingCustomer(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este cliente?</AlertDialogTitle>
          <AlertDialogDescription>
            Vas a eliminar a <strong>{deletingCustomer?.name}</strong> ({deletingCustomer?.type || "minorista"}).
            {Number(deletingCustomer?.balance || 0) > 0 && (
              <span className="mt-2 block font-semibold text-destructive">
                ¡Atención! Este cliente registra un saldo adeudado de {money(Number(deletingCustomer.balance))}.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async ()=>{
              if(!deletingCustomer)return;
              await action({action:"delete_customer",customerId:deletingCustomer.id},"Cliente eliminado");
              setDeletingCustomer(null);
            }}
          >
            {busy?"Eliminando…":"Sí, eliminar cliente"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <NewSupplierModal
      open={modal==="supplier"}
      onOpenChange={v=>!v&&setModal("")}
      busy={busy}
      onSubmit={async (payload)=>{
        return await action(payload, "Proveedor registrado exitosamente");
      }}
    />
    <EditSupplierModal
      supplier={editingSupplier}
      open={Boolean(editingSupplier)}
      onOpenChange={v=>!v&&setEditingSupplier(null)}
      busy={busy}
      onSubmit={async (payload)=>{
        const ok=await action(payload, "Proveedor actualizado correctamente");
        if(ok) setEditingSupplier(null);
        return ok;
      }}
    />
    <AdjustSupplierDebtModal
      supplier={adjustingSupplier}
      open={Boolean(adjustingSupplier)}
      onOpenChange={v=>!v&&setAdjustingSupplier(null)}
      busy={busy}
      onSubmit={async (payload)=>{
        const ok=await action(payload, "Saldo actualizado exitosamente");
        if(ok) setAdjustingSupplier(null);
        return ok;
      }}
    />
    <SupplierDetailModal
      supplier={viewingSupplier}
      open={Boolean(viewingSupplier)}
      onOpenChange={v=>!v&&setViewingSupplier(null)}
      supplierMoves={data?.supplierMoves || []}
      onAdjustDebt={(s:any)=>setAdjustingSupplier(s)}
      onEdit={(s:any)=>setEditingSupplier(s)}
    />
    <AlertDialog open={Boolean(deletingSupplier)} onOpenChange={v=>!v&&setDeletingSupplier(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este proveedor?</AlertDialogTitle>
          <AlertDialogDescription>
            Vas a eliminar a <strong>{deletingSupplier?.name}</strong> ({deletingSupplier?.category || "General"}).
            {Number(deletingSupplier?.balance || 0) > 0 && (
              <span className="mt-2 block font-semibold text-destructive">
                ¡Atención! Se registra un saldo adeudado a este proveedor de {money(Number(deletingSupplier.balance))}.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async ()=>{
              if(!deletingSupplier)return;
              await action({action:"delete_supplier",supplierId:deletingSupplier.id},"Proveedor eliminado");
              setDeletingSupplier(null);
            }}
          >
            {busy?"Eliminando…":"Sí, eliminar proveedor"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <CashReceiptModal
      open={Boolean(viewingCashMovement)}
      onOpenChange={v => !v && setViewingCashMovement(null)}
      movement={viewingCashMovement}
      settings={data?.settings}
    />
    <EditCashMovementModal
      open={Boolean(editingCashMovement)}
      onOpenChange={v => !v && setEditingCashMovement(null)}
      movement={editingCashMovement}
      busy={busy}
      onSubmit={async (payload) => {
        const ok = await action(payload, "Movimiento de caja actualizado correctamente");
        if (ok) setEditingCashMovement(null);
        return Boolean(ok);
      }}
    />
    <AlertDialog open={Boolean(deletingCashMovement)} onOpenChange={v => !v && setDeletingCashMovement(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este movimiento de caja?</AlertDialogTitle>
          <AlertDialogDescription>
            Vas a eliminar el movimiento de {deletingCashMovement?.type === "ingreso" ? "ingreso" : "egreso"} por {money(deletingCashMovement?.amount || 0)} ({deletingCashMovement?.description || deletingCashMovement?.category}). Esta acción recalculará el saldo consolidado de caja.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async () => {
              if (!deletingCashMovement) return;
              await action({ action: "delete_cash_movement", id: deletingCashMovement.id }, "Movimiento de caja eliminado");
              setDeletingCashMovement(null);
            }}
          >
            {busy ? "Eliminando…" : "Sí, eliminar movimiento"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <ModalForm open={modal==="cash"} onOpenChange={v=>!v&&setModal("")} title="Movimiento de caja" description="Registrá un ingreso o egreso que no provenga de una venta." onSubmit={async e=>{e.preventDefault();await action({action:"cash_movement",...fromForm(e)},"Movimiento registrado");}}><label className="grid gap-1.5 text-sm font-medium"><span>Tipo</span><select name="type" className="h-9 rounded-md border bg-background px-3"><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option></select></label><Field label="Categoría" name="category" defaultValue="General"/><Field label="Importe" name="amount" type="number" required/><Field label="Referencia" name="reference"/><div className="sm:col-span-2"><Field label="Descripción" name="description"/></div></ModalForm>
    <NewBankAccountModal
      open={modal==="bank_account"}
      onOpenChange={v=>!v&&setModal("")}
      busy={busy}
      onSubmit={async (payload)=>{
        const res = await action(payload, "Cuenta bancaria registrada exitosamente");
        if (res?.createdBankAccount?.id) {
          setBankAccountId(String(res.createdBankAccount.id));
        }
        return res;
      }}
    />
    <EditBankAccountModal
      account={editingBankAccount}
      open={Boolean(editingBankAccount)}
      onOpenChange={v=>!v&&setEditingBankAccount(null)}
      busy={busy}
      onSubmit={async (payload)=>{
        const ok = await action(payload, "Cuenta bancaria actualizada correctamente");
        if (ok) setEditingBankAccount(null);
        return ok;
      }}
    />
    <TransferBalanceModal
      accounts={data?.bankAccounts || []}
      open={transferModalOpen}
      onOpenChange={setTransferModalOpen}
      settings={data?.settings}
      busy={busy}
      onSubmit={async (payload)=>{
        const ok = await action(payload, "Transferencia realizada con éxito");
        if (ok) setTransferModalOpen(false);
        return ok;
      }}
    />
    {toast&&<div className="clay-toast fixed bottom-5 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#0f2137] px-5 py-3 text-sm font-medium text-white shadow-2xl"><Check className="size-4 text-emerald-500"/>{toast}</div>}
  </div>;
}

function CustomerSelectField({
  customers,
  customerId,
  setCustomerId,
  onNewCustomer,
}: {
  customers: Party[];
  customerId: string;
  setCustomerId: (id: string) => void;
  onNewCustomer: () => void;
}) {
  const selected = customers.find((c: Party) => String(c.id) === String(customerId));
  const bal = Number(selected?.balance || 0);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <span>Cliente</span>
          <span className="text-muted-foreground font-normal text-[11px]">(opcional · Consumidor final)</span>
        </label>
        <button
          type="button"
          onClick={onNewCustomer}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer"
          title="Registrar un nuevo cliente en el sistema"
        >
          <UserPlus className="size-3.5" />
          + Nuevo cliente
        </button>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={customerId}
          onChange={(e) => {
            if (e.target.value === "__new__") {
              onNewCustomer();
            } else {
              setCustomerId(e.target.value);
            }
          }}
          className="h-9 w-full min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Consumidor final (por defecto)</option>
          <option value="__new__" className="font-semibold text-primary">
            ＋ Registrar nuevo cliente…
          </option>
          {customers.map((c: Party) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.type} {Number(c.balance || 0) > 0 ? `(Deuda: ${money(c.balance)})` : "(Al día)"}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0 gap-1.5 px-2.5 text-xs font-semibold border-border/80 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
          onClick={onNewCustomer}
          title="Registrar nuevo cliente"
        >
          <UserPlus className="size-3.5 text-primary" />
          <span className="hidden sm:inline">Nuevo</span>
        </Button>
      </div>

      {!selected && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
          * Obligatorio para registrar la venta y gestionar la cuenta corriente.
        </p>
      )}

      {selected && (
        <div className="mt-1.5 flex items-center justify-between rounded-xl border border-border/70 bg-muted/40 p-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="font-bold text-foreground truncate max-w-[130px]" title={selected.name}>
              {selected.name}
            </span>
            <Badge variant="outline" className="text-[10px] py-0 px-1 capitalize">
              {selected.type || "minorista"}
            </Badge>
            {bal > 0 ? (
              <span className="text-red-600 dark:text-red-400 font-bold text-[11px]">
                Deuda previa: {money(bal)}
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                Al día
              </span>
            )}
            {selected.phone && (
              <span className="text-muted-foreground text-[11px] truncate max-w-[100px]" title={selected.phone}>
                · {selected.phone}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCustomerId("")}
            className="size-5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted grid place-items-center transition shrink-0 ml-1 cursor-pointer"
            title="Cambiar cliente"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function SalesPOS({data,filtered,channel,setChannel,cart,setCart,addVariant,scan,setScan,scanProduct,setModal,discount,setDiscount,payment,setPayment,customerId,setCustomerId,cartTotal,closeSale,busy}:any){return <><SectionTitle eyebrow="Venta rápida" title="Punto de venta" text="Escaneá, elegí la variante y cobrá sin salir de la pantalla."/><div className="mb-5 grid gap-3 rounded-2xl border bg-card p-4 shadow-sm md:grid-cols-[1fr_auto_auto]"><div className="relative"><Barcode className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-primary"/><Input autoFocus className="h-12 pl-10" placeholder="Escaneá con lector USB/Bluetooth o escribí el código" value={scan} onChange={e=>{const val=e.target.value;if(val.includes("\n")||val.includes("\r")){scanProduct(val);}else{setScan(val);}}} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();scanProduct(scan);}}}/></div><Button variant="outline" className="h-12" onClick={()=>setModal("scanner")}><Camera/>Usar cámara</Button><div className="flex rounded-xl bg-muted p-1"><button onClick={()=>setChannel("minorista")} className={`rounded-lg px-4 text-sm font-semibold ${channel==="minorista"?"bg-card shadow":"text-muted-foreground"}`}>Minorista</button><button onClick={()=>setChannel("mayorista")} className={`rounded-lg px-4 text-sm font-semibold ${channel==="mayorista"?"bg-card shadow":"text-muted-foreground"}`}>Mayorista</button></div></div><div className="grid gap-6 xl:grid-cols-[1fr_390px]"><div className="grid content-start gap-4 sm:grid-cols-2 2xl:grid-cols-3">{filtered.map((p:Product)=><Card key={p.id} className="gap-3 border-0 py-0 shadow-sm overflow-hidden flex flex-col">{p.image_url?<div className="h-36 w-full overflow-hidden bg-muted/20"><img src={p.image_url} alt={p.name} className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"/></div>:<div className="h-20 w-full bg-gradient-to-r from-primary/5 via-muted/30 to-primary/5 flex items-center justify-center text-muted-foreground/40"><ShoppingBag className="size-7 opacity-50"/></div>}<CardContent className="px-4 pb-4 pt-2 flex-1 flex flex-col justify-between"><div><div className="mb-2 flex items-start justify-between gap-2"><div><p className="font-bold">{p.name}</p><p className="text-xs text-muted-foreground">{p.brand} · {p.sku}</p></div><Badge variant="outline">{p.total_stock} u.</Badge></div><p className="mb-3 text-xl font-extrabold text-primary">{money(channel==="mayorista"?p.wholesale_price:p.retail_price)}</p></div><div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Elegir variante</p><div className="flex flex-wrap gap-1.5">{p.variants.map(v=><Button key={v.id} variant="outline" size="xs" disabled={!v.stock} onClick={()=>addVariant(p,v)}>{v.size}<span className="text-[10px] text-muted-foreground">{v.stock}</span></Button>)}</div></div></CardContent></Card>)}</div><Card className="sticky top-24 h-fit gap-4 border-0 py-5 shadow-[0_14px_40px_rgb(15_33_55/12%)]"><CardHeader className="flex-row items-center justify-between px-5"><CardTitle className="flex items-center gap-2"><ShoppingCart className="size-5 text-primary"/>Venta actual</CardTitle><Badge>{cart.reduce((s:number,i:CartItem)=>s+i.quantity,0)} unidades</Badge></CardHeader><CardContent className="space-y-4 px-5"><div className="max-h-64 space-y-2 overflow-y-auto pr-1">{cart.length===0?<div className="rounded-2xl border border-dashed p-7 text-center text-sm text-muted-foreground">Escaneá un producto o elegí una variante para comenzar.</div>:cart.map((i:CartItem)=><div key={i.variantId} className="flex items-center gap-3 rounded-xl bg-muted/55 p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{i.name}</p><p className="text-xs text-muted-foreground">Variante {i.size} · {money(i.unitPrice)}</p></div><div className="flex items-center gap-1"><button className="size-7 rounded-lg border" onClick={()=>setCart((c:CartItem[])=>c.map(x=>x.variantId===i.variantId?{...x,quantity:Math.max(0,x.quantity-1)}:x).filter(x=>x.quantity>0))}>−</button><span className="w-6 text-center text-sm font-bold">{i.quantity}</span><button className="size-7 rounded-lg border" onClick={()=>setCart((c:CartItem[])=>c.map(x=>x.variantId===i.variantId?{...x,quantity:Math.min(x.max,x.quantity+1)}:x))}>+</button></div></div>)}</div><div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold">Descuento<Input type="number" value={discount} onChange={e=>setDiscount(Number(e.target.value)||0)} className="mt-1"/></label><label className="text-xs font-semibold">Medio de pago<select value={payment} onChange={e=>setPayment(e.target.value)} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option><option>Mercado Pago</option><option>Cuenta corriente</option></select></label></div><CustomerSelectField customers={data.customers} customerId={customerId} setCustomerId={setCustomerId} onNewCustomer={()=>setModal("customer")}/><div className="border-t pt-4"><div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal</span><span>{money(cartTotal+discount)}</span></div><div className="mt-2 flex items-end justify-between"><span className="font-semibold">Total</span><span className="text-3xl font-black tracking-tight">{money(cartTotal)}</span></div></div><Button className="h-12 w-full rounded-xl text-base" disabled={!cart.length||busy} onClick={closeSale}>{busy?"Procesando…":`Cobrar ${money(cartTotal)}`}</Button><p className="text-center text-xs text-muted-foreground">Genera comprobante X y descuenta el stock automáticamente.</p></CardContent></Card></div></>}

function Products({data,filtered,setModal,onEdit,onAdjust,onDelete}:any){
  const productsList = filtered || [];
  const totalPairs = productsList.reduce((sum: number, p: Product) => sum + (Number(p.total_stock) || 0), 0);
  const costStock = productsList.reduce((sum: number, p: Product) => sum + ((Number(p.cost) || 0) * (Number(p.total_stock) || 0)), 0);
  const wholesaleStock = productsList.reduce((sum: number, p: Product) => sum + ((Number(p.wholesale_price) || 0) * (Number(p.total_stock) || 0)), 0);
  const marginStock = Math.max(0, wholesaleStock - costStock);
  const marginPercent = wholesaleStock > 0 ? Math.round((marginStock / wholesaleStock) * 100) : 0;
  const isFiltered = Boolean(data?.products?.length && data.products.length !== productsList.length);

  return (
    <>
      <SectionTitle 
        eyebrow="Catálogo maestro" 
        title="Productos y Artículos Mayoristas" 
        text="Artículos generales, calzados, indumentaria, precios de venta por mayor y costos." 
        action={<Button onClick={()=>setModal("product")} className="bg-orange-600 hover:bg-orange-700 text-white font-semibold"><PackagePlus/>Nuevo producto</Button>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard 
          label="Stock al costo" 
          value={money(costStock)} 
          note={isFiltered ? `${totalPairs} unidades (${productsList.length} prod. filtrados)` : `${totalPairs} unidades en inventario`} 
          icon={Boxes} 
          tone="blue"
        />
        <StatCard 
          label="Stock valorizado mayorista" 
          value={money(wholesaleStock)} 
          note="Valor proyectado en venta mayorista" 
          icon={TrendingUp} 
          tone="green"
        />
        <StatCard 
          label="Margen mayorista en stock" 
          value={money(marginStock)} 
          note={`${marginPercent}% margen promedio mayorista`} 
          icon={Percent} 
          tone="violet"
        />
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="px-2 sm:px-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto / Artículo</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Stock / Variantes</TableHead>
                <TableHead>Precio Mayorista</TableHead>
                <TableHead>PVP Sugerido</TableHead>
                <TableHead>Margen</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p:Product)=>{
                const margin=p.wholesale_price?Math.round((p.wholesale_price-p.cost)/p.wholesale_price*100):0;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <ProductImage src={p.image_url} alt={p.name} />
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.brand} · {p.color} · {p.category}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-mono text-xs">{p.sku}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{p.barcode}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {p.variants.map(v=><Badge key={v.id} variant={v.stock?"secondary":"outline"}>{["Único", "Unico", "General"].includes(v.size) ? `${v.stock} u.` : `${v.size}: ${v.stock}`}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell className="font-extrabold text-orange-600 dark:text-orange-400">{money(p.wholesale_price)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.retail_price ? money(p.retail_price) : "—"}</TableCell>
                    <TableCell><Badge className="bg-emerald-100 text-emerald-800">{margin}%</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="outline" size="xs" className="h-8 gap-1 rounded-lg" onClick={()=>onAdjust(p)} title="Ajustar stock">
                          <Boxes className="size-3.5 text-amber-600"/>
                          <span className="hidden md:inline">Stock</span>
                        </Button>
                        <Button variant="outline" size="xs" className="h-8 gap-1 rounded-lg" onClick={()=>onEdit(p)} title="Editar producto">
                          <Pencil className="size-3.5 text-blue-600"/>
                          <span className="hidden md:inline">Editar</span>
                        </Button>
                        <Button variant="outline" size="xs" className="h-8 gap-1 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700" onClick={()=>onDelete(p)} title="Eliminar producto">
                          <Trash2 className="size-3.5"/>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

function Inventory({data,filtered,adjust,isCashier,onAddToCart}:any){
  return (
    <>
      <SectionTitle
        eyebrow={isCashier ? "Consulta de stock" : "Control de existencias"}
        title="Inventario y Existencias"
        text={isCashier ? "Consultá la disponibilidad por artículo o variante y precios de venta." : "Control de existencias por artículo y variante."}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p:Product)=>(
          <Card key={p.id} className="gap-4 border-0 py-5 shadow-sm">
            <CardHeader className="px-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <ProductImage src={p.image_url} alt={p.name} className="size-10 rounded-xl object-cover border shrink-0" />
                  <div>
                    <CardTitle>{p.name}</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">{p.sku} · {p.color}</p>
                    <p className="mt-1 text-sm font-black text-primary">{money(p.retail_price)}</p>
                  </div>
                </div>
                <Badge variant={p.total_stock<=p.min_stock?"destructive":"secondary"}>
                  {p.total_stock} u.
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 px-5">
              {p.variants.map((v:Variant)=>{
                const canSell = isCashier && v.stock > 0;
                return (
                  <button
                    key={v.id}
                    onClick={()=>{
                      if (isCashier) {
                        if (canSell && onAddToCart) onAddToCart(p, v);
                      } else {
                        adjust(v, p);
                      }
                    }}
                    disabled={isCashier && v.stock <= 0}
                    className={`rounded-xl border p-3 text-center transition ${
                      isCashier
                        ? canSell
                          ? "hover:-translate-y-0.5 hover:shadow hover:border-primary/50 cursor-pointer"
                          : "cursor-not-allowed opacity-50"
                        : "hover:-translate-y-0.5 hover:shadow cursor-pointer"
                    } ${
                      v.stock===0
                        ? "border-red-200 bg-red-50 dark:bg-red-950/20"
                        : v.stock<=2
                        ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20"
                        : "bg-card"
                    }`}
                    title={isCashier ? (canSell ? "Agregar al carrito de venta" : "Sin existencias") : "Ajustar stock"}
                  >
                    <p className="text-xs text-muted-foreground">{["Único", "Unico", "General"].includes(v.size) ? "Stock General" : "Variante"}</p>
                    <p className="text-lg font-bold">{["Único", "Unico", "General"].includes(v.size) ? "Total" : v.size}</p>
                    <p className="text-xs font-semibold">{v.stock} u.</p>
                    {isCashier && canSell && (
                      <span className="mt-1 block text-[10px] font-bold text-primary">+ Vender</span>
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function Parties({title,text,parties,kind,setModal}:any){return <><SectionTitle eyebrow="Relaciones comerciales" title={title} text={text} action={<Button onClick={()=>setModal(kind==="clientes"?"customer":"supplier")}><Plus/>Agregar</Button>}/><Card className="border-0 shadow-sm"><CardContent className="px-3 sm:px-5"><Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Tipo / contacto</TableHead><TableHead>Teléfono</TableHead><TableHead>Saldo</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>{parties.map((p:Party)=><TableRow key={p.id}><TableCell className="font-semibold">{p.name}</TableCell><TableCell className="capitalize">{p.type||p.contact||"—"}</TableCell><TableCell>{p.phone||"—"}</TableCell><TableCell className={p.balance>0?"font-semibold text-amber-600":"text-muted-foreground"}>{money(p.balance)}</TableCell><TableCell><Badge variant={p.balance>0?"secondary":"outline"}>{p.balance>0?"Pendiente":"Al día"}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card></>}

function Cash({data,setModal,onEdit,onDelete,onViewReceipt,isCashier}:any){
  const income=data.movements.filter((m:Movement)=>m.type==="ingreso").reduce((s:number,m:Movement)=>s+m.amount,0);
  const expenses=data.movements.filter((m:Movement)=>m.type==="egreso").reduce((s:number,m:Movement)=>s+m.amount,0);
  return <>
    <SectionTitle
      eyebrow={isCashier ? "Mostrador" : "Finanzas diarias"}
      title={isCashier ? "Caja de Turno" : "Caja, ingresos y egresos"}
      text={isCashier ? "Control del efectivo en caja y registro de ingresos de cambio o gastos menores de turno." : "Controlá el saldo real y cada movimiento de la sucursal."}
      action={<Button onClick={()=>setModal("cash")}><Plus/>Nuevo movimiento</Button>}
    />
    <div className="mb-6 grid gap-4 md:grid-cols-3">
      <StatCard label="Saldo en caja" value={money(data.stats.cashBalance)} note={isCashier ? "Efectivo disponible en caja" : "Caja consolidada"} icon={WalletCards} tone="blue"/>
      <StatCard label="Ingresos registrados" value={money(income)} note="Ventas y otros ingresos" icon={ArrowDownLeft} tone="green"/>
      <StatCard label="Egresos registrados" value={money(expenses)} note="Gastos y retiros" icon={ArrowUpRight} tone="coral"/>
    </div>
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>{isCashier ? "Movimientos de caja del turno" : "Libro de caja"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No hay movimientos registrados en caja todavía.
                </TableCell>
              </TableRow>
            ) : (
              data.movements.map((m:Movement)=>(
                <TableRow key={m.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs">{date(m.created_at)}</TableCell>
                  <TableCell>
                    <p className="font-semibold text-sm">{m.description||m.category}</p>
                    <p className="text-xs text-muted-foreground">{m.category}</p>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{m.reference||"—"}</TableCell>
                  <TableCell>
                    <Badge variant={m.type==="ingreso"?"secondary":"destructive"} className="capitalize">
                      {m.type}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-bold text-sm ${m.type==="ingreso"?"text-emerald-600 dark:text-emerald-400":"text-red-600 dark:text-red-400"}`}>
                    {m.type==="ingreso"?"+":"-"}{money(m.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="xs"
                        className="h-8 gap-1 rounded-lg text-xs"
                        onClick={()=>onViewReceipt&&onViewReceipt(m)}
                        title="Ver / Imprimir Comprobante de Caja"
                      >
                        <FileText className="size-3.5 text-primary"/>
                        <span className="hidden md:inline">Recibo</span>
                      </Button>
                      {!isCashier && (
                        <>
                          <Button
                            variant="outline"
                            size="xs"
                            className="h-8 gap-1 rounded-lg text-xs"
                            onClick={()=>onEdit&&onEdit(m)}
                            title="Editar movimiento"
                          >
                            <Pencil className="size-3.5 text-blue-600"/>
                            <span className="hidden md:inline">Editar</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            className="h-8 gap-1 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                            onClick={()=>onDelete&&onDelete(m)}
                            title="Eliminar movimiento"
                          >
                            <Trash2 className="size-3.5"/>
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </>;
}

function Catalog({data,products,price,setPrice}:any){return <div className="print-only-area"><div className="no-print"><SectionTitle eyebrow="Venta visual" title="Generador de catálogos" text="Elegí la lista de precios y compartí o imprimí los productos disponibles." action={<div className="flex gap-2"><Button variant="outline" onClick={()=>window.print()}><Printer/>Imprimir / PDF</Button></div>}/><div className="mb-6 flex items-center gap-2 rounded-2xl border bg-card p-2"><button onClick={()=>setPrice("retail")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${price==="retail"?"bg-primary text-primary-foreground":""}`}>Precio minorista</button><button onClick={()=>setPrice("wholesale")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${price==="wholesale"?"bg-primary text-primary-foreground":""}`}>Precio mayorista</button><Badge variant="outline" className="ml-auto">Solo productos con stock</Badge></div></div><div className="mb-7 hidden print:block"><h1 className="text-3xl font-bold">{data.settings?.business_name}</h1><p>{data.settings?.phone} · {data.settings?.address}</p><p className="mt-2 text-sm">Catálogo {price==="retail"?"minorista":"mayorista"}</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{products.filter((p:Product)=>p.total_stock>0).map((p:Product)=><Card key={p.id} className="print-card gap-3 overflow-hidden border-0 py-0 shadow-sm"><div className="flex h-28 items-center justify-center bg-gradient-to-br from-[#e8f0ff] to-[#fff0ec] text-[#0f2137]"><ShoppingBag className="size-14 opacity-70"/></div><CardContent className="px-5 pb-5"><div className="flex justify-between gap-3"><div><p className="text-lg font-bold">{p.name}</p><p className="text-xs text-muted-foreground">{p.brand} · {p.color}</p></div><p className="text-xl font-black text-primary">{money(price==="retail"?p.retail_price:p.wholesale_price)}</p></div><div className="my-4 flex flex-wrap gap-1.5">{p.variants.filter(v=>v.stock>0).map(v=><Badge key={v.id} variant="outline">{v.size}</Badge>)}</div><BarcodeLabel value={p.barcode}/></CardContent></Card>)}</div></div>}

function Reports({data,onSelectSale}:any){
  const max=Math.max(...data.products.map((p:Product)=>p.total_stock),1);
  const wholesale=data.sales.filter((s:Sale)=>s.channel==="mayorista").reduce((a:number,s:Sale)=>a+s.total,0);
  const retail=data.sales.filter((s:Sale)=>s.channel!=="mayorista").reduce((a:number,s:Sale)=>a+s.total,0);
  const totalPairs=data.sales.reduce((sum:number, s:Sale)=>{if(Array.isArray((s as any).items)){return sum+(s as any).items.reduce((acc:number,it:any)=>acc+Number(it.quantity||1),0);}return sum+1;},0);
  return <><SectionTitle eyebrow="Inteligencia del negocio" title="Reportes Comerciales" text="Indicadores de ventas minoristas y mayoristas, rotación de productos y margen comercial."/><div className="grid gap-6 lg:grid-cols-2"><Card className="border-0 shadow-sm"><CardHeader><CardTitle>Stock por producto</CardTitle></CardHeader><CardContent className="space-y-4">{data.products.map((p:Product)=><div key={p.id}><div className="mb-1 flex justify-between text-sm"><span className="font-medium">{p.name}</span><span>{p.total_stock} u.</span></div><div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:`${Math.max(4,p.total_stock/max*100)}%`}}/></div></div>)}</CardContent></Card><Card className="border-0 shadow-sm"><CardHeader><CardTitle>Rendimiento por Canal</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-orange-50 p-4 dark:bg-orange-950/30"><p className="text-xs text-muted-foreground font-semibold">Facturación Mayorista</p><p className="mt-1 text-xl font-black text-orange-600 dark:text-orange-400">{money(wholesale)}</p></div><div className="rounded-2xl bg-blue-50 p-4 dark:bg-blue-950/30"><p className="text-xs text-muted-foreground font-semibold">Facturación Minorista</p><p className="mt-1 text-xl font-black text-blue-600 dark:text-blue-400">{money(retail)}</p></div><div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/30"><p className="text-xs text-muted-foreground font-semibold">Unidades Vendidas</p><p className="mt-1 text-xl font-black text-emerald-600 dark:text-emerald-400">{totalPairs}</p></div><div className="rounded-2xl border p-4"><p className="text-xs text-muted-foreground font-semibold">Capital en mercadería</p><p className="mt-1 text-xl font-black">{money(data.stats.stockValue)}</p></div></div></CardContent></Card><Card className="border-0 shadow-sm lg:col-span-2"><CardHeader><CardTitle>Ventas recientes</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Comprobante</TableHead><TableHead>Fecha</TableHead><TableHead>Cliente</TableHead><TableHead>Canal</TableHead><TableHead>Pago</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Comprobante</TableHead></TableRow></TableHeader><TableBody>{data.sales.map((s:Sale)=><TableRow key={s.id} className="hover:bg-muted/30"><TableCell className="font-mono font-bold text-primary">{s.receipt_no}</TableCell><TableCell>{date(s.created_at)}</TableCell><TableCell>{s.customer_name||(s.channel==="mayorista"?"Cliente mayorista":"Consumidor final")}</TableCell><TableCell className={`capitalize font-semibold ${s.channel==="mayorista"?"text-orange-600 dark:text-orange-400":"text-primary"}`}>{s.channel||"Minorista"}</TableCell><TableCell>{s.payment_method}</TableCell><TableCell><span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${s.status==="pagada"?"bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40":s.status==="pago_parcial"?"bg-amber-50 text-amber-700 dark:bg-amber-950/40":"bg-red-50 text-red-700 dark:bg-red-950/40"}`}>{s.status==="pagada"?"Pagada":s.status==="pago_parcial"?"Pago Parcial":"Con Deuda"}</span></TableCell><TableCell className="text-right font-bold">{money(s.total)}</TableCell><TableCell className="text-right">{onSelectSale&&<Button variant="outline" size="xs" onClick={()=>onSelectSale(s)} className="h-7 gap-1 rounded-lg text-xs" title="Ver Factura X / Remito"><FileText className="size-3 text-primary"/>Factura X</Button>}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></div></>}

function SettingsPage({data,setModal}:any){
  const rows=[
    ["Nombre personalizable",data.settings?.business_name,Store],
    ["Sucursal","Única",Building2],
    ["Comprobantes","Tipo X · no fiscal",FileText],
    ["Moneda base",data.settings?.currency==="BRL"?"Reales brasileños (R$ BRL)":data.settings?.currency==="USD"?"Dólares (US$ USD)":"Pesos (ARS)",CircleDollarSign],
    ["Canal predeterminado",data.settings?.default_channel==="mayorista"?"Mayorista":"Minorista",Tags],
  ];
  return <><SectionTitle eyebrow="Administración" title="Configuración" text="Datos generales y reglas de operación del negocio." action={<Button onClick={()=>setModal("settings")}><Settings/>Editar datos</Button>}/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map(([label,value,Icon]:any)=><Card key={label} className="gap-3 border-0 py-5 shadow-sm"><CardContent className="flex items-center gap-4 px-5"><span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon/></span><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-bold">{value}</p></div></CardContent></Card>)}</div><Card className="mt-6 border-0 shadow-sm"><CardHeader><CardTitle>Capacidades activas</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{["Inventario por producto, modelo y variante","Lectores USB, Bluetooth y cámara","Precios minoristas y mayoristas","Caja con ingresos y egresos","Clientes y cuentas corrientes","Catálogo imprimible con códigos","Comprobantes internos X","Modo claro y nocturno","Historial de movimientos"].map(x=><div key={x} className="flex items-center gap-2 rounded-xl bg-muted/50 p-3 text-sm"><Check className="size-4 text-emerald-600"/>{x}</div>)}</CardContent></Card></>}

function SelectField({label,name,defaultValue,children}:{label:string;name:string;defaultValue?:string;children:any}) {
  return <label className="grid gap-1.5 text-sm font-medium"><span>{label}</span><select name={name} defaultValue={defaultValue} className="h-10 rounded-xl border bg-background px-3 text-sm">{children}</select></label>;
}

function TextAreaField({label,name,defaultValue,placeholder}:{label:string;name:string;defaultValue?:string;placeholder?:string}) {
  return <label className="grid gap-1.5 text-sm font-medium"><span>{label}</span><textarea name={name} defaultValue={defaultValue} placeholder={placeholder} className="min-h-24 resize-y rounded-xl border bg-background px-3 py-2 text-sm"/></label>;
}

function SettingToggle({name,label,description,defaultChecked}:{name:string;label:string;description:string;defaultChecked:boolean}) {
  const [checked,setChecked]=useState(defaultChecked);
  useEffect(()=>setChecked(defaultChecked),[defaultChecked]);
  return <div className="settings-toggle"><div><p className="text-sm font-bold">{label}</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p></div><input type="hidden" name={name} value={checked?"true":"false"}/><Switch checked={checked} onCheckedChange={setChecked} aria-label={label}/></div>;
}

function SettingsFormCard({title,description,icon:Icon,onSubmit,busy,children}:{title:string;description:string;icon:any;onSubmit:(e:FormEvent<HTMLFormElement>)=>void;busy:boolean;children:any}) {
  return <Card className="settings-panel border-0 shadow-sm"><CardHeader className="border-b"><div className="flex items-start gap-3"><span className="settings-panel-icon"><Icon className="size-5"/></span><div><CardTitle>{title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{description}</p></div></div></CardHeader><CardContent className="pt-1"><form onSubmit={onSubmit} className="grid gap-5"><div className="grid gap-4 md:grid-cols-2">{children}</div><div className="flex justify-end border-t pt-5"><Button type="submit" disabled={busy} className="rounded-xl"><Save/>{busy?"Guardando…":"Guardar cambios"}</Button></div></form></CardContent></Card>;
}

function ProductImage({ src, alt, className = "size-11 rounded-xl object-cover border shrink-0" }: { src?: string; alt?: string; className?: string }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className={`${className} bg-muted/60 border border-border/60 flex items-center justify-center text-muted-foreground/60 shrink-0`}>
        <ShoppingBag className="size-5" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt || ""}
      onError={() => setError(true)}
      className={className}
    />
  );
}

function SalesPOSConfigured({
  data,filtered,channel,setChannel,cart,setCart,addVariant,scan,setScan,scanProduct,setModal,
  discount,setDiscount,discountPercent,setDiscountPercent,
  additionalCharge,setAdditionalCharge,additionalChargeDescription,setAdditionalChargeDescription,
  payment,setPayment,customerId,setCustomerId,bankAccountId,setBankAccountId,closeSale,busy
}:any) {
  const allowNegative=Boolean(data.settings?.allow_negative_stock);
  const cameraEnabled=Boolean(data.settings?.camera_enabled);
  const methods=String(data.settings?.payment_methods||"Efectivo").split(",").map((item:string)=>item.trim()).filter(Boolean);
  const subtotal=cart.reduce((sum:number,item:CartItem)=>sum+item.unitPrice*item.quantity,0);
  const maxDiscountPercent=Number(data.settings?.max_discount_percent)||0;
  const maxDiscount=subtotal*(Math.min(100,maxDiscountPercent)/100);

  // Mantener descuento proporcional si cambia el subtotal y había descuento porcentual activo
  useEffect(() => {
    if (discountPercent > 0 && subtotal > 0) {
      const clampedPct = maxDiscountPercent > 0 ? Math.min(maxDiscountPercent, discountPercent) : Math.min(100, discountPercent);
      const calculatedAmt = Math.round((subtotal * clampedPct) / 100);
      setDiscount(calculatedAmt);
    } else if (subtotal === 0) {
      setDiscount(0);
      setDiscountPercent(0);
    }
  }, [subtotal, maxDiscountPercent]);

  const handlePercentChange = (pct: number) => {
    const validPct = Math.max(0, maxDiscountPercent > 0 ? Math.min(maxDiscountPercent, pct) : Math.min(100, pct));
    setDiscountPercent(validPct);
    const calculated = Math.round((subtotal * validPct) / 100);
    setDiscount(calculated);
  };

  const handleAmountChange = (amt: number) => {
    const maxAmt = maxDiscountPercent > 0 ? maxDiscount : subtotal;
    const validAmt = Math.max(0, Math.min(maxAmt, amt));
    setDiscount(validAmt);
    const pct = subtotal > 0 ? (validAmt / subtotal) * 100 : 0;
    setDiscountPercent(Math.round(pct * 10) / 10);
  };

  const chargeAmount = Math.max(0, Number(additionalCharge) || 0);
  const rawTotal = Math.max(0, subtotal - discount + chargeAmount);
  const rounding = data.settings?.rounding_mode === "100" ? 100 : data.settings?.rounding_mode === "10" ? 10 : 0;
  const displayTotal = rounding ? Math.round(rawTotal / rounding) * rounding : rawTotal;

  // Multi-moneda: Reales (R$ BRL) [Predeterminada], Pesos ($ ARS), Dólares (US$ USD)
  const defaultCurr = (data.settings?.currency || "BRL") as "BRL" | "ARS" | "USD";
  const [saleCurrency, setSaleCurrency] = useState<"BRL" | "ARS" | "USD">(defaultCurr);
  const rateArs = Number(data.settings?.exchange_rate_ars || data.settings?.exchange_rate_brl) || 250;
  const rateUsd = Number(data.settings?.exchange_rate_usd) || 5.70;

  // El total base está en Reales (BRL)
  const displayTotalBrl = displayTotal;
  const displayTotalArs = Math.round(displayTotal * rateArs);
  const displayTotalUsd = Math.round((displayTotal / rateUsd) * 100) / 100;

  const currentTotal = saleCurrency === "BRL" ? displayTotalBrl : (saleCurrency === "ARS" ? displayTotalArs : displayTotalUsd);

  const handleCurrencyChange = (newCur: "BRL" | "ARS" | "USD") => {
    setSaleCurrency(newCur);
    setIsCustomPaid(false);
    const matching = (data.bankAccounts || []).filter((a: any) => (a.currency || "BRL") === newCur);
    const currentAcc = (data.bankAccounts || []).find((a: any) => String(a.id) === String(bankAccountId));
    if (!currentAcc || (currentAcc.currency || "BRL") !== newCur) {
      if (matching.length > 0) {
        setBankAccountId(String(matching[0].id));
      } else {
        setBankAccountId("");
      }
    }
  };

  // Estado para monto abonado y cálculo de saldo pendiente / deuda
  const [paidInput, setPaidInput] = useState<string>("");
  const [isCustomPaid, setIsCustomPaid] = useState<boolean>(false);

  useEffect(() => {
    if (!isCustomPaid) {
      setPaidInput(saleCurrency === "BRL" ? String(displayTotalBrl) : (saleCurrency === "USD" ? String(displayTotalUsd) : String(displayTotalArs)));
    }
  }, [displayTotalBrl, displayTotalArs, displayTotalUsd, saleCurrency, isCustomPaid]);

  const parsedPaid = Number(paidInput);
  const paidAmount = isNaN(parsedPaid) ? 0 : Math.max(0, Math.min(currentTotal, parsedPaid));
  const pendingAmount = Math.max(0, Math.round((currentTotal - paidAmount) * 100) / 100);
  const saleStatus: "pagada" | "pago_parcial" | "con_deuda" =
    pendingAmount === 0 ? "pagada" : paidAmount > 0 ? "pago_parcial" : "con_deuda";

  const formatCurr = (val: number) => formatMoney(val, saleCurrency);

  const [showAllCatalog, setShowAllCatalog] = useState(false);
  const searchTrim = scan.trim().toLowerCase();
  const matchingProducts = useMemo(() => {
    if (!searchTrim) return [];
    return (data.products || []).filter((p: Product) =>
      [p.name, p.sku, p.barcode, p.brand, p.category, p.color].join(" ").toLowerCase().includes(searchTrim)
    );
  }, [data.products, searchTrim]);

  return <>
    <SectionTitle eyebrow="Venta rápida" title="Punto de venta" text="Escaneá, elegí el talle y cobrá sin salir de la pantalla."/>
    
    <div className="mb-5 grid gap-3 rounded-2xl border bg-card p-3 sm:p-4 shadow-sm md:grid-cols-[1fr_auto_auto_auto]">
      <div className="relative">
        <Barcode className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-primary"/>
        <Input
          autoFocus
          className="h-12 pl-10 pr-9 text-sm"
          placeholder="Escaneá con lector USB/Bluetooth o escribí código, modelo, marca..."
          value={scan}
          onChange={e => setScan(e.target.value)}
          onKeyDown={e => e.key === "Enter" && scanProduct()}
        />
        {scan && (
          <button
            type="button"
            onClick={() => setScan("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Borrar texto"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <Button
        variant="outline"
        className="h-12 gap-1.5"
        disabled={!cameraEnabled}
        onClick={() => setModal("scanner")}
      >
        <Camera className="size-4" />
        {cameraEnabled ? "Usar cámara" : "Cámara off"}
      </Button>

      <div className="flex items-center rounded-xl bg-muted/80 p-1 border border-border/50 h-12">
        <button
          type="button"
          onClick={() => setChannel("minorista")}
          className={`rounded-lg px-3.5 h-10 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
            channel === "minorista"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShoppingBag className="size-3.5" />
          Minorista
        </button>
        <button
          type="button"
          onClick={() => setChannel("mayorista")}
          className={`rounded-lg px-3.5 h-10 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
            channel === "mayorista"
              ? "bg-orange-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Tags className="size-3.5" />
          Mayorista
        </button>
      </div>

      <Button
        variant={showAllCatalog ? "default" : "outline"}
        className="h-12 gap-1.5"
        onClick={() => setShowAllCatalog(prev => !prev)}
      >
        <Boxes className="size-4" />
        {showAllCatalog ? "Ocultar catálogo" : "Ver catálogo"}
      </Button>
    </div>

    {channel === "mayorista" ? (
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50/80 px-4 py-3 text-sm text-orange-900 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200">
        <Tags className="size-4 text-orange-600 dark:text-orange-400 shrink-0"/>
        <span>Precios mayoristas aplicados · Venta directa por mayor sin mínimo de compra requerido.</span>
      </div>
    ) : (
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
        <ShoppingBag className="size-4 text-blue-600 dark:text-blue-400 shrink-0"/>
        <span>Precios minoristas al consumidor final · Venta unitaria libre sin mínimo de unidades.</span>
      </div>
    )}

    <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
      {/* Columna Principal Izquierda */}
      <div className="space-y-5">
        {/* Resultados de búsqueda en tiempo real si el usuario escribe en el buscador/escáner */}
        {searchTrim && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Search className="size-4 text-primary" />
                <h3 className="font-bold text-sm">
                  Productos encontrados para &ldquo;{scan}&rdquo;
                </h3>
                <Badge variant="outline" className="bg-background text-xs">
                  {matchingProducts.length} {matchingProducts.length === 1 ? "resultado" : "resultados"}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setScan("")}
                className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
                Cerrar búsqueda
              </Button>
            </div>

            {matchingProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-background/60 p-6 text-center text-sm text-muted-foreground">
                No se encontró ningún producto con &ldquo;{scan}&rdquo;. Podés escanear con el lector o{" "}
                <button
                  type="button"
                  onClick={() => setShowAllCatalog(true)}
                  className="font-bold text-primary underline underline-offset-2"
                >
                  ver todo el catálogo
                </button>.
              </div>
            ) : (
              <div className="grid content-start gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {matchingProducts.map((p: Product) => (
                  <Card key={p.id} className="gap-2 border bg-card py-0 shadow-sm overflow-hidden flex flex-col">
                    <ProductImage src={p.image_url} alt={p.name} className="h-28 w-full object-cover rounded-none border-b border-border/40" />
                    <CardContent className="px-3 pb-3 pt-2 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="mb-1 flex items-start justify-between gap-1.5">
                          <div className="min-w-0">
                            <p className="font-bold text-sm truncate">{p.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{p.brand} · {p.sku}</p>
                          </div>
                          <Badge variant="outline" className="shrink-0 text-[10px]">{p.total_stock} u.</Badge>
                        </div>
                        <div className="flex items-baseline gap-1.5 mb-2">
                          <p className={`text-lg font-extrabold ${channel === "mayorista" ? "text-orange-600 dark:text-orange-400" : "text-primary"}`}>
                            {money(channel === "mayorista" ? p.wholesale_price : (p.retail_price || p.wholesale_price))}
                          </p>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">{channel === "mayorista" ? "Mayorista" : "Minorista"}</span>
                          {channel === "mayorista" && p.retail_price > 0 && (
                            <span className="text-[11px] text-muted-foreground ml-auto">PVP: {money(p.retail_price)}</span>
                          )}
                          {channel === "minorista" && p.wholesale_price > 0 && (
                            <span className="text-[11px] text-muted-foreground ml-auto">May: {money(p.wholesale_price)}</span>
                          )}
                        </div>
                      </div>
                      <div>
                        {p.variants.length === 1 && ["Único", "Unico", "General", "Estándar"].includes(p.variants[0].size) ? (
                          <Button
                            className={`w-full h-8 text-xs font-bold gap-1 rounded-xl text-white ${channel === "mayorista" ? "bg-orange-600 hover:bg-orange-700" : "bg-primary hover:bg-primary/90"}`}
                            disabled={!allowNegative && !p.variants[0].stock}
                            onClick={() => addVariant(p, p.variants[0])}
                          >
                            <Plus className="size-3.5" /> Agregar (+1) · {p.variants[0].stock} u.
                          </Button>
                        ) : (
                          <>
                            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Elegir talle / variante
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {p.variants.map(v => (
                                <Button
                                  key={v.id}
                                  variant="outline"
                                  size="xs"
                                  disabled={!allowNegative && !v.stock}
                                  onClick={() => addVariant(p, v)}
                                  className="h-7 px-2 text-xs hover:border-primary hover:bg-primary/10"
                                >
                                  {v.size}
                                  <span className="ml-1 text-[10px] text-muted-foreground font-semibold">({v.stock})</span>
                                </Button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modo Catálogo Completo (Solo si se activa explícitamente) */}
        {showAllCatalog && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes className="size-4 text-primary" />
                <h3 className="font-bold text-sm">Catálogo completo de productos</h3>
                <Badge variant="outline">{filtered.length} productos</Badge>
              </div>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setShowAllCatalog(false)}
                className="text-xs h-7"
              >
                Volver a vista limpia de venta
              </Button>
            </div>
            <div className="grid content-start gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((p: Product) => (
                <Card key={p.id} className="gap-3 border-0 py-0 shadow-sm overflow-hidden flex flex-col">
                  <ProductImage src={p.image_url} alt={p.name} className="h-36 w-full object-cover rounded-none border-b border-border/40" />
                  <CardContent className="px-4 pb-4 pt-2 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.brand} · {p.sku}</p>
                        </div>
                        <Badge variant="outline">{p.total_stock} u.</Badge>
                      </div>
                      <div className="flex items-baseline gap-2 mb-3">
                        <p className={`text-xl font-black ${channel === "mayorista" ? "text-orange-600 dark:text-orange-400" : "text-primary"}`}>
                          {money(channel === "mayorista" ? p.wholesale_price : (p.retail_price || p.wholesale_price))}
                        </p>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">{channel === "mayorista" ? "Mayorista" : "Minorista"}</span>
                        {channel === "mayorista" && p.retail_price > 0 && (
                          <span className="text-xs text-muted-foreground ml-auto">PVP: {money(p.retail_price)}</span>
                        )}
                        {channel === "minorista" && p.wholesale_price > 0 && (
                          <span className="text-xs text-muted-foreground ml-auto">Mayorista: {money(p.wholesale_price)}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      {p.variants.length === 1 && ["Único", "Unico", "General", "Estándar"].includes(p.variants[0].size) ? (
                        <Button
                          className={`w-full h-8 text-xs font-bold gap-1 rounded-xl text-white ${channel === "mayorista" ? "bg-orange-600 hover:bg-orange-700" : "bg-primary hover:bg-primary/90"}`}
                          disabled={!allowNegative && !p.variants[0].stock}
                          onClick={() => addVariant(p, p.variants[0])}
                        >
                          <Plus className="size-3.5" /> Agregar al carrito · {p.variants[0].stock} u.
                        </Button>
                      ) : (
                        <>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Elegir variante</p>
                          <div className="flex flex-wrap gap-1.5">
                            {p.variants.map(v => (
                              <Button key={v.id} variant="outline" size="xs" disabled={!allowNegative && !v.stock} onClick={() => addVariant(p, v)}>
                                {v.size}<span className="text-[10px] text-muted-foreground">{v.stock}</span>
                              </Button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Vista Principal: Solo los productos que se van eligiendo o escaneando */}
        {!showAllCatalog && (
          <div>
            {cart.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
                      <ShoppingCart className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base leading-none">Productos en la venta</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {cart.reduce((sum: number, item: CartItem) => sum + item.quantity, 0)} unidades agregadas a esta venta
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      if (window.confirm("¿Querés vaciar todos los productos cargados a la venta actual?")) {
                        setCart([]);
                      }
                    }}
                    className="text-xs text-muted-foreground hover:text-destructive gap-1"
                  >
                    <Trash2 className="size-3.5" />
                    Vaciar venta
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {cart.map((item: CartItem) => {
                    const parent = (data.products || []).find((p: Product) => p.id === item.productId);
                    const itemTotal = item.unitPrice * item.quantity;
                    const currentVariant = parent?.variants?.find((v: Variant) => v.id === item.variantId);
                    const remainingStock = currentVariant ? currentVariant.stock : item.max;

                    return (
                      <Card
                        key={item.variantId}
                        className="overflow-hidden border bg-card shadow-xs hover:border-primary/40 transition-colors py-0"
                      >
                        <CardContent className="p-3.5 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* Información del Producto */}
                            <div className="flex items-center gap-3.5 min-w-0">
                              <ProductImage
                                src={parent?.image_url}
                                alt={item.name}
                                className="size-16 rounded-xl object-cover border border-border/60 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-base truncate">{item.name}</p>
                                  <Badge className="bg-primary text-primary-foreground font-black text-xs px-2.5 py-0.5">
                                    Variante {item.size}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {parent?.brand ? `${parent.brand} · ` : ""}{parent?.sku ? `SKU: ${parent.sku}` : ""}
                                  {parent?.barcode ? ` · Código: ${parent.barcode}` : ""}
                                </p>
                                <p className="text-xs font-semibold text-primary mt-1">
                                  {money(item.unitPrice)} c/u
                                  <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                                    (Stock disponible: {remainingStock} unidades)
                                  </span>
                                </p>
                              </div>
                            </div>

                            {/* Controles de Cantidad, Subtotal y Quitar */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                              <div className="flex items-center gap-1.5 bg-muted/60 rounded-xl p-1 border border-border/50">
                                <button
                                  type="button"
                                  className="size-8 rounded-lg bg-background border flex items-center justify-center font-bold text-sm hover:bg-muted transition-colors"
                                  onClick={() =>
                                    setCart((items: CartItem[]) =>
                                      items
                                        .map(x =>
                                          x.variantId === item.variantId
                                            ? { ...x, quantity: Math.max(0, x.quantity - 1) }
                                            : x
                                        )
                                        .filter(x => x.quantity > 0)
                                    )
                                  }
                                  title="Quitar 1 unidad"
                                >
                                  −
                                </button>
                                <span className="w-8 text-center text-sm font-extrabold">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  disabled={!allowNegative && item.quantity >= item.max}
                                  className="size-8 rounded-lg bg-background border flex items-center justify-center font-bold text-sm hover:bg-muted transition-colors disabled:opacity-35"
                                  onClick={() =>
                                    setCart((items: CartItem[]) =>
                                      items.map(x =>
                                        x.variantId === item.variantId
                                          ? { ...x, quantity: Math.min(x.max, x.quantity + 1) }
                                          : x
                                      )
                                    )
                                  }
                                  title="Sumar 1 unidad"
                                >
                                  +
                                </button>
                              </div>

                              <div className="text-right min-w-[90px]">
                                <p className="text-[11px] text-muted-foreground">Subtotal</p>
                                <p className="text-base font-black text-foreground">{money(itemTotal)}</p>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setCart((items: CartItem[]) =>
                                    items.filter(x => x.variantId !== item.variantId)
                                  )
                                }
                                className="size-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
                                title="Eliminar este producto de la venta"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>

                          {/* Atajo rápido para agregar otro talle del mismo modelo */}
                          {parent && parent.variants && parent.variants.length > 1 && (
                            <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] text-muted-foreground font-semibold">
                                + Sumar otra opción de este modelo:
                              </span>
                              {parent.variants
                                .filter((v: Variant) => v.id !== item.variantId && (allowNegative || v.stock > 0))
                                .map((v: Variant) => (
                                  <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => addVariant(parent, v)}
                                    className="text-[11px] px-2 py-0.5 rounded-md border bg-background hover:bg-primary/10 hover:border-primary/50 text-muted-foreground hover:text-foreground font-medium transition-colors"
                                    title={`Agregar talle ${v.size} (Stock: ${v.stock})`}
                                  >
                                    T.{v.size} <span className="text-[9px] opacity-70">({v.stock})</span>
                                  </button>
                                ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Estado inicial cuando la venta está vacía y no hay búsqueda activa */
              !searchTrim && (
                <Card className="border border-dashed bg-card/40 p-8 sm:p-12 text-center rounded-3xl shadow-none">
                  <CardContent className="p-0 max-w-md mx-auto space-y-4">
                    <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
                      <ScanLine className="size-10 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Punto de venta listo</h3>
                      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                        Pasá el lector de código de barras USB/Bluetooth sobre el producto o escribí el nombre o código arriba para agregarlo.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      {cameraEnabled && (
                        <Button variant="outline" className="rounded-xl" onClick={() => setModal("scanner")}>
                          <Camera className="size-4" />
                          Escanear con cámara
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => setShowAllCatalog(true)}
                      >
                        <Boxes className="size-4" />
                        Ver catálogo completo
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground/80 pt-2">
                      La pantalla mostrará exclusivamente los productos que vayas escaneando o eligiendo para esta venta.
                    </p>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        )}
      </div>

      {/* Columna Derecha: Resumen de Cobro y Operación */}
      <Card className="sticky top-24 h-fit gap-4 border-0 py-5 shadow-[0_14px_40px_rgb(15_33_55/12%)]">
        <CardHeader className="flex-row items-center justify-between px-5">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="size-5 text-primary"/>
            Resumen de cobro
          </CardTitle>
          <Badge>{cart.reduce((sum:number,item:CartItem)=>sum+item.quantity,0)} unidades</Badge>
        </CardHeader>
        <CardContent className="space-y-4 px-5">
          {cart.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-4 text-center text-xs text-muted-foreground">
              Sin productos cargados aún.
            </div>
          ) : (
            <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
              {cart.map((item: CartItem) => (
                <div key={item.variantId} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-muted/40">
                  <span className="truncate font-medium max-w-[190px]">
                    {item.name} <strong className="text-primary">T.{item.size}</strong> × {item.quantity}
                  </span>
                  <span className="font-mono font-bold shrink-0">{money(item.unitPrice * item.quantity)}</span>
                </div>
              ))}
            </div>
          )}

        {/* Descuento por % y margen en $ */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Percent className="size-3.5 text-primary" />
              Descuento aplicado
            </span>
            {discount > 0 && (
              <span className="text-xs font-bold text-emerald-600 font-mono">
                − {money(discount)} {discountPercent > 0 ? `(${Number(discountPercent).toFixed(1)}%)` : ""}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] font-semibold text-muted-foreground block">
              Descuento (%)
              <div className="relative mt-1">
                <Input
                  type="number"
                  min={0}
                  max={maxDiscountPercent > 0 ? maxDiscountPercent : 100}
                  step="any"
                  value={discountPercent || ""}
                  onChange={e => handlePercentChange(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="pr-6 h-9 text-xs font-semibold"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
              </div>
            </label>
            <label className="text-[11px] font-semibold text-muted-foreground block">
              Margen / Monto ($)
              <div className="relative mt-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">$</span>
                <Input
                  type="number"
                  min={0}
                  max={maxDiscountPercent > 0 ? maxDiscount : subtotal}
                  value={discount || ""}
                  onChange={e => handleAmountChange(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="pl-6 h-9 text-xs font-semibold"
                />
              </div>
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] text-muted-foreground mr-1">Promo:</span>
              {[0, 5, 10, 15, 20].map(pct => {
                if (maxDiscountPercent > 0 && pct > maxDiscountPercent) return null;
                const isActive = Math.abs(discountPercent - pct) < 0.1;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handlePercentChange(pct)}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                      isActive && (pct > 0 || (pct === 0 && discount === 0))
                        ? "bg-primary text-primary-foreground border-primary font-bold"
                        : "bg-background/80 hover:bg-muted text-muted-foreground border-border/60"
                    }`}
                  >
                    {pct === 0 ? "Sin desc." : `${pct}%`}
                  </button>
                );
              })}
            </div>
            {maxDiscountPercent > 0 && (
              <span className="text-[10px] text-muted-foreground">
                Máx {maxDiscountPercent}%
              </span>
            )}
          </div>
        </div>

        {/* Cargo adicional y descripción */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Plus className="size-3.5 text-primary" />
              Cargo adicional
            </span>
            {chargeAmount > 0 && (
              <span className="text-xs font-bold text-blue-600 font-mono">
                + {money(chargeAmount)}
              </span>
            )}
          </div>
          <div className="grid grid-cols-[115px_1fr] gap-2">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">$</span>
              <Input
                type="number"
                min={0}
                value={additionalCharge || ""}
                onChange={e => setAdditionalCharge(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0"
                className="pl-6 h-9 text-xs font-bold"
              />
            </div>
            <Input
              type="text"
              value={additionalChargeDescription}
              onChange={e => setAdditionalChargeDescription(e.target.value)}
              placeholder="Detalle: ej. Envío a domicilio, flete..."
              className="h-9 text-xs"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            <span className="text-[10px] text-muted-foreground mr-1">Rápidos:</span>
            {["Envío a domicilio", "Flete", "Embalaje", "Recargo tarjeta"].map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => setAdditionalChargeDescription(tag)}
                className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                  additionalChargeDescription === tag
                    ? "bg-primary text-primary-foreground border-primary font-bold"
                    : "bg-background/80 hover:bg-muted text-muted-foreground border-border/60"
                }`}
              >
                {tag}
              </button>
            ))}
            {additionalChargeDescription && (
              <button
                type="button"
                onClick={() => setAdditionalChargeDescription("")}
                className="text-[10px] text-destructive hover:underline ml-auto px-1"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Selector de Moneda de Cobro */}
        <div className="rounded-xl border border-border/80 bg-muted/30 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Landmark className="size-3.5 text-primary" />
              Moneda de cobro
            </span>
            <div className="flex rounded-lg bg-background border p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => handleCurrencyChange("BRL")}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                  saleCurrency === "BRL"
                    ? "bg-emerald-600 text-white shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🇧🇷 R$ BRL
              </button>
              <button
                type="button"
                onClick={() => handleCurrencyChange("ARS")}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                  saleCurrency === "ARS"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🇦🇷 $ ARS
              </button>
              <button
                type="button"
                onClick={() => handleCurrencyChange("USD")}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                  saleCurrency === "USD"
                    ? "bg-blue-600 text-white shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🇺🇸 US$ USD
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between rounded-lg bg-muted/60 border border-border/60 px-2.5 py-1.5 text-xs text-muted-foreground">
            {saleCurrency === "BRL" ? (
              <>
                <span>Base: <strong>1 R$ = ${rateArs.toLocaleString("es-AR")} ARS</strong> · 1 US$ = R$ {rateUsd.toFixed(2)}</span>
                <span className="font-extrabold text-foreground">{formatCurr(displayTotalBrl)}</span>
              </>
            ) : saleCurrency === "ARS" ? (
              <>
                <span>Cotización: <strong>1 R$ = ${rateArs.toLocaleString("es-AR")} ARS</strong></span>
                <span className="font-extrabold text-foreground">{formatCurr(displayTotalArs)}</span>
              </>
            ) : (
              <>
                <span>Cotización: <strong>1 US$ = R$ {rateUsd.toFixed(2)} BRL</strong></span>
                <span className="font-extrabold text-foreground">{formatCurr(displayTotalUsd)}</span>
              </>
            )}
          </div>
        </div>

        {/* Medio de pago */}
        <div>
          <label className="text-xs font-semibold block mb-1">Medio de pago</label>
          <select
            value={payment}
            onChange={e => setPayment(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
          >
            {methods.map((method: string) => (
              <option key={method}>{method}</option>
            ))}
          </select>
        </div>

        <BankAccountSelectField
          accounts={data.bankAccounts || []}
          bankAccountId={bankAccountId}
          setBankAccountId={setBankAccountId}
          onNewAccount={() => setModal("bank_account")}
          currency={saleCurrency}
        />
        <CustomerSelectField customers={data.customers} customerId={customerId} setCustomerId={setCustomerId} onNewCustomer={()=>setModal("customer")}/>

        <div className="border-t pt-4 space-y-1.5 text-xs sm:text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal mercadería</span>
            <span className="font-mono">{money(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>
                Descuento {discountPercent > 0 ? `(${Number(discountPercent).toFixed(1)}%)` : ""}
              </span>
              <span className="font-mono">− {money(discount)}</span>
            </div>
          )}
          {chargeAmount > 0 && (
            <div className="flex justify-between text-blue-600 font-semibold">
              <span className="truncate pr-2">
                Cargo Adicional {additionalChargeDescription ? `(${additionalChargeDescription})` : ""}
              </span>
              <span className="font-mono shrink-0">+ {money(chargeAmount)}</span>
            </div>
          )}
          <div className="mt-2 flex items-end justify-between border-t pt-2">
            <div>
              <span className="font-bold text-sm sm:text-base">Total a cobrar</span>
              <p className="text-[11px] text-muted-foreground font-medium">
                {saleCurrency === "BRL" ? (
                  <>Eq. ${displayTotalArs.toLocaleString("es-AR")} ARS · US$ {displayTotalUsd.toFixed(2)}</>
                ) : saleCurrency === "ARS" ? (
                  <>Eq. R$ {displayTotalBrl.toFixed(2)} BRL · US$ {displayTotalUsd.toFixed(2)}</>
                ) : (
                  <>Eq. R$ {displayTotalBrl.toFixed(2)} BRL · ${displayTotalArs.toLocaleString("es-AR")} ARS</>
                )}
              </p>
            </div>
            <div className="text-right">
              <span className={`text-3xl font-black tracking-tight ${
                saleCurrency === "BRL"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : saleCurrency === "USD"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-foreground"
              }`}>
                {formatCurr(currentTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Sección de Monto Abonado y Deuda Pendiente */}
        <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-foreground">
              Monto Abonado ({saleCurrency === "BRL" ? "R$ BRL" : saleCurrency === "USD" ? "US$ USD" : "$ ARS"}) <span className="text-destructive font-bold">*</span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setPaidInput(String(currentTotal));
                  setIsCustomPaid(false);
                }}
                className="text-[11px] font-semibold text-primary hover:underline px-1.5 py-0.5 rounded bg-primary/10"
              >
                100% Total
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaidInput("0");
                  setIsCustomPaid(true);
                }}
                className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline px-1.5 py-0.5 rounded bg-amber-500/10"
              >
                0 Deuda
              </button>
            </div>
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
              {saleCurrency === "BRL" ? "R$" : saleCurrency === "USD" ? "US$" : "$"}
            </span>
            <Input
              type="number"
              min={0}
              step={saleCurrency === "ARS" ? "1" : "0.01"}
              max={currentTotal}
              value={paidInput}
              onChange={(e) => {
                setIsCustomPaid(true);
                setPaidInput(e.target.value);
              }}
              placeholder="0"
              className="pl-12 font-bold text-base h-10"
            />
          </div>

          <div className="flex items-center justify-between pt-0.5 text-xs">
            <span className="text-muted-foreground font-medium">Estado de venta:</span>
            {saleStatus === "pagada" ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]">
                ✓ Pagada Totalmente
              </Badge>
            ) : saleStatus === "pago_parcial" ? (
              <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px]">
                ⚠ Pago Parcial
              </Badge>
            ) : (
              <Badge variant="destructive" className="font-bold text-[11px]">
                ⛔ Con Deuda Total
              </Badge>
            )}
          </div>

          {pendingAmount > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 p-2 text-xs">
              <span className="font-semibold text-amber-900 dark:text-amber-200">
                Saldo Pendiente (Deuda generada):
              </span>
              <span className="font-black text-amber-700 dark:text-amber-300 text-sm">
                {formatCurr(pendingAmount)}
                {saleCurrency !== "BRL" ? (
                  <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                    (Base: R$ {(saleCurrency === "ARS" ? pendingAmount / rateArs : pendingAmount * rateUsd).toFixed(2)})
                  </span>
                ) : (
                  <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                    (Eq. ${Math.round(pendingAmount * rateArs).toLocaleString("es-AR")} ARS)
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        <Button
          className={`h-12 w-full rounded-xl text-base font-bold shadow-md transition-all ${
            saleStatus === "pagada"
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : saleStatus === "pago_parcial"
              ? "bg-amber-600 hover:bg-amber-700 text-white"
              : "bg-slate-900 hover:bg-slate-800 text-white"
          }`}
          disabled={!cart.length || busy || (pendingAmount > 0 && !customerId)}
          onClick={() => closeSale(paidAmount, {
            discount,
            discountPercent,
            additionalCharge: chargeAmount,
            additionalChargeDescription,
            currency: saleCurrency,
            exchangeRateArs: rateArs,
            exchangeRateUsd: rateUsd,
          })}
        >
          {busy
            ? "Procesando…"
            : pendingAmount > 0 && !customerId
            ? "Seleccioná cliente para registrar deuda *"
            : paidAmount === 0 && pendingAmount > 0
            ? `Registrar a Deuda ${formatCurr(currentTotal)}`
            : pendingAmount > 0
            ? `Cobrar ${formatCurr(paidAmount)} (Deuda: ${formatCurr(pendingAmount)})`
            : `Cobrar ${formatCurr(currentTotal)}`}
        </Button>
        {pendingAmount > 0 && !customerId && cart.length > 0 && (
          <p className="text-center text-xs font-semibold text-destructive">
            * Para registrar una venta con saldo pendiente / deuda es obligatorio asignar un cliente registrado.
          </p>
        )}
        <p className="text-center text-xs text-muted-foreground">
          Genera comprobante {data.settings?.receipt_prefix||"X"} y descuenta el stock automáticamente.
        </p>
      </CardContent></Card>
    </div>
  </>;
}

function CatalogConfigured({ data, products }: any) {
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);
  const [catalogMode, setCatalogMode] = useState<"wholesale" | "retail" | "both">(
    (data.settings?.catalog_default_price as any) || "both"
  );
  const visibleProducts = data.settings?.catalog_in_stock_only
    ? products.filter((product: Product) => product.total_stock > 0)
    : products;

  return (
    <div className="print-only-area">
      <div className="no-print">
        <SectionTitle
          eyebrow="Catálogo Comercial"
          title="Generador de Catálogos"
          text="Compartí o imprimí los productos disponibles con precios minoristas, mayoristas o ambos."
          action={
            <Button variant="outline" onClick={() => window.print()} className="rounded-xl">
              <Printer /> Imprimir / PDF
            </Button>
          }
        />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-3">
          <div className="flex items-center gap-1.5 rounded-xl bg-muted p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setCatalogMode("wholesale")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                catalogMode === "wholesale"
                  ? "bg-orange-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Precios Mayoristas
            </button>
            <button
              type="button"
              onClick={() => setCatalogMode("retail")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                catalogMode === "retail"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Precios Minoristas
            </button>
            <button
              type="button"
              onClick={() => setCatalogMode("both")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                catalogMode === "both"
                  ? "bg-card text-foreground shadow-xs font-extrabold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Ambas Listas
            </button>
          </div>
          <Badge variant="outline" className="ml-auto">
            {data.settings?.catalog_in_stock_only ? "Solo con stock" : "Todos los productos"}
          </Badge>
        </div>
      </div>

      <div className="mb-7 hidden print:block">
        <div className="flex items-center gap-3">
          {data.settings?.logo_url && (
            <img src={data.settings.logo_url} alt="" className="size-14 rounded-xl object-contain" />
          )}
          <div>
            <h1 className="text-3xl font-bold">{data.settings?.business_name}</h1>
            <p>
              {data.settings?.catalog_contact ||
                [data.settings?.phone, data.settings?.whatsapp, data.settings?.address]
                  .filter(Boolean)
                  .join(" · ")}
            </p>
          </div>
        </div>
        <p className="mt-2 text-sm font-semibold">
          Catálogo Oficial · {catalogMode === "wholesale" ? "Precios Mayoristas" : (catalogMode === "retail" ? "Precios Minoristas" : "Lista de Precios")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleProducts.map((product: Product) => (
          <Card key={product.id} className="print-card gap-3 overflow-hidden border-0 py-0 shadow-sm flex flex-col justify-between">
            <div>
              <ProductImage
                src={product.image_url}
                alt={product.name}
                className="h-44 w-full object-cover rounded-none border-b border-border/30"
              />
              <CardContent className="px-5 pb-3 pt-3">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="text-lg font-bold">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.brand} · {product.color}
                    </p>
                  </div>
                  <div className="text-right">
                    {catalogMode === "wholesale" && (
                      <>
                        <p className="text-xl font-black text-orange-600 dark:text-orange-400">
                          {money(product.wholesale_price)}
                        </p>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Mayorista</span>
                      </>
                    )}
                    {catalogMode === "retail" && (
                      <>
                        <p className="text-xl font-black text-primary">
                          {money(product.retail_price || product.wholesale_price)}
                        </p>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Minorista / PVP</span>
                      </>
                    )}
                    {catalogMode === "both" && (
                      <>
                        <p className="text-lg font-black text-orange-600 dark:text-orange-400">
                          {money(product.wholesale_price)}
                        </p>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Mayorista</span>
                        {product.retail_price > 0 && (
                          <p className="text-xs font-semibold text-primary mt-0.5">
                            PVP: {money(product.retail_price)}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="my-4 flex flex-wrap gap-1.5">
                  {product.variants
                    .filter((v: Variant) => !data.settings?.catalog_in_stock_only || v.stock > 0)
                    .map((v: Variant) => (
                      <Badge key={v.id} variant="outline">
                        {v.size}
                      </Badge>
                    ))}
                </div>

                {data.settings?.catalog_show_barcode && (
                  <div
                    className="cursor-pointer transition-opacity hover:opacity-80"
                    onClick={() => setBarcodeProduct(product)}
                    title="Click para imprimir solo el código de barra"
                  >
                    <BarcodeLabel value={product.barcode} />
                  </div>
                )}
              </CardContent>
            </div>

            <div className="px-5 pb-4 pt-1 no-print">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBarcodeProduct(product)}
                className="h-8 w-full gap-2 rounded-xl text-xs font-semibold border-border/80 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                title="Imprimir solo la etiqueta de código de barra de este calzado"
              >
                <Barcode className="size-3.5 text-primary" />
                <span>Imprimir código de barra</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {data.settings?.catalog_terms && (
        <p className="mt-6 text-center text-xs text-muted-foreground">{data.settings.catalog_terms}</p>
      )}

      <ProductBarcodeModal
        open={Boolean(barcodeProduct)}
        onOpenChange={(v) => !v && setBarcodeProduct(null)}
        product={barcodeProduct}
        settings={data.settings}
      />
    </div>
  );
}

function SettingsCenter({data,onSave,busy,dark,setDark,setToast,uid,setModal,onEditBankAccount,onTransferModal}:any) {
  const settings=data.settings||{};
  const [resetOpen,setResetOpen]=useState(false);
  const [resetText,setResetText]=useState("");
  const [readerCode,setReaderCode]=useState("");
  const [readerResult,setReaderResult]=useState("");
  const fileRef=useRef<HTMLInputElement>(null);
  const logoRef=useRef<HTMLInputElement>(null);
  const [uploadingLogo,setUploadingLogo]=useState(false);
  const submitSettings=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();onSave({action:"save_settings",...Object.fromEntries(new FormData(event.currentTarget).entries())},"Configuración actualizada");};
  const downloadFile=(name:string,content:string,type:string)=>{const url=URL.createObjectURL(new Blob([content],{type}));const anchor=document.createElement("a");anchor.href=url;anchor.download=name;anchor.click();URL.revokeObjectURL(url);};
  const exportBackup=async()=>{try{const backup=await createStoreBackup(uid);downloadFile(`zapateria-firebase-respaldo-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(backup,null,2),"application/json");setToast("Respaldo descargado");}catch(error:any){setToast(error.message||"No se pudo exportar");}};
  const csv=(rows:any[])=>{if(!rows.length)return "";const columns=Object.keys(rows[0]);const quote=(value:any)=>`"${String(value??"").replaceAll('"','""')}"`;return [columns.map(quote).join(","),...rows.map(row=>columns.map(column=>quote(row[column])).join(","))].join("\n");};
  const exportCsv=(name:string,rows:any[])=>{downloadFile(`${name}-${new Date().toISOString().slice(0,10)}.csv`,csv(rows),"text/csv;charset=utf-8");setToast(`Archivo ${name} descargado`);};
  const importBackup=async(event:React.ChangeEvent<HTMLInputElement>)=>{const file=event.target.files?.[0];event.target.value="";if(!file)return;try{const backup=JSON.parse(await file.text());if(!window.confirm("Esta acción reemplazará todos los datos actuales por los de la copia. ¿Querés continuar?"))return;await onSave({action:"import_backup",confirmation:"IMPORTAR COPIA",backup},"Copia restaurada correctamente");}catch{setToast("El archivo seleccionado no es una copia válida");}};
  const uploadLogo=async(event:React.ChangeEvent<HTMLInputElement>)=>{const file=event.target.files?.[0];event.target.value="";if(!file)return;setUploadingLogo(true);try{const logoUrl=await uploadBusinessLogo(file,uid);await onSave({action:"save_settings",logoUrl},"Logo actualizado");}catch(error:any){setToast(error.message||"No se pudo subir el logo");}finally{setUploadingLogo(false);}};
  const testReader=()=>{const value=cleanBarcodeScan(readerCode);if(!value){setReaderResult("Escaneá o escribí un código para probar el lector.");return;}const product=data.products.find((item:Product)=>isBarcodeMatch(item.barcode, value)||item.sku.toLowerCase()===value.toLowerCase());setReaderResult(product?`Detectado: ${product.name} · ${product.total_stock} pares (Código: ${product.barcode})`:`El lector respondió con "${value}", pero no coincide con ningún producto registrado.`);};
  const testCamera=async()=>{try{const stream=await navigator.mediaDevices.getUserMedia({video:true});stream.getTracks().forEach(track=>track.stop());setToast("Cámara disponible y autorizada");}catch{setToast("No se pudo acceder a la cámara");}};
  return <>
    <SectionTitle eyebrow="Centro de control" title="Configuración" text="Administrá la sucursal, las reglas comerciales y la seguridad de los datos desde un solo lugar."/>
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[[Store,settings.business_name||"CR MAYORISTA",settings.branch_name||"Sucursal principal"],[FileText,`${settings.receipt_prefix||"X"}-${String(settings.next_receipt_number||1).padStart(8,"0")}`,"Próximo comprobante"],[Tags,Number(settings.wholesale_min_qty) > 1 ? `${settings.wholesale_min_qty} unidades` : "Sin mínimo (libre)","Condición mayorista"],[Database,`${data.products.length} productos`,`${data.sales.length} ventas recientes`]].map(([Icon,value,label]:any)=><Card key={label} className="settings-summary border-0 py-4 shadow-sm"><CardContent className="flex items-center gap-3 px-4"><span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary"><Icon className="size-4"/></span><div className="min-w-0"><p className="truncate font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>)}
    </div>
    <Tabs defaultValue="negocio" className="settings-center">
      <TabsList className="settings-tabs-list flex-wrap h-auto gap-1">
        <TabsTrigger value="negocio"><Store/>Negocio</TabsTrigger>
        <TabsTrigger value="personal"><Users className="size-4"/>Personal y Cajeras</TabsTrigger>
        <TabsTrigger value="categorias"><FolderTree/>Categorías</TabsTrigger>
        <TabsTrigger value="bancos"><Landmark/>Cuentas bancarias</TabsTrigger>
        <TabsTrigger value="ventas"><FileText/>Ventas</TabsTrigger>
        <TabsTrigger value="inventario"><Boxes/>Inventario</TabsTrigger>
        <TabsTrigger value="catalogo"><Tags/>Catálogo</TabsTrigger>
        <TabsTrigger value="lectores"><ScanLine/>Lectores</TabsTrigger>
        <TabsTrigger value="apariencia"><Palette/>Apariencia</TabsTrigger>
        <TabsTrigger value="datos"><Database/>Datos</TabsTrigger>
      </TabsList>
      <TabsContent value="negocio"><SettingsFormCard title="Identidad del negocio" description="Información de la única sucursal y datos que aparecerán en catálogos y comprobantes." icon={Store} onSubmit={submitSettings} busy={busy}><Field label="Nombre del negocio / empresa" name="businessName" defaultValue={settings.business_name} required/><Field label="Nombre de la sucursal" name="branchName" defaultValue={settings.branch_name}/><Field label="CUIT" name="taxId" defaultValue={settings.tax_id}/><Field label="Teléfono" name="phone" defaultValue={settings.phone}/><Field label="WhatsApp" name="whatsapp" defaultValue={settings.whatsapp}/><Field label="Correo electrónico" name="email" type="email" defaultValue={settings.email}/><Field label="Dirección" name="address" defaultValue={settings.address}/><Field label="URL del logo" name="logoUrl" defaultValue={settings.logo_url} placeholder="https://…"/><div className="md:col-span-2 flex flex-wrap items-center gap-3 rounded-2xl border bg-muted/30 p-4"><div className="min-w-0 flex-1"><p className="text-sm font-bold">Subir logo a Firebase Storage</p><p className="text-xs text-muted-foreground">PNG, JPG o WebP de hasta 5 MB.</p></div><input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={uploadLogo}/><Button type="button" variant="outline" disabled={uploadingLogo} onClick={()=>logoRef.current?.click()}><Upload/>{uploadingLogo?"Subiendo…":"Elegir imagen"}</Button></div></SettingsFormCard></TabsContent>
      <TabsContent value="personal">
        <StaffSettingsView
          staff={data.staff || []}
          onSave={onSave}
          busy={busy}
          storeName={settings.business_name}
        />
      </TabsContent>
      <TabsContent value="categorias">
        <CategoriesSettingsView
          categories={data.categories || []}
          products={data.products || []}
          onSave={onSave}
          busy={busy}
        />
      </TabsContent>
      <TabsContent value="bancos">
        <BankAccountsView
          accounts={data.bankAccounts || []}
          movements={data.bankMoves || []}
          onNewAccount={() => setModal("bank_account")}
          onEditAccount={(acc: any) => onEditBankAccount(acc)}
          onDeleteAccount={async (acc: any) => {
            await onSave({ action: "delete_bank_account", accountId: acc.id }, "Cuenta bancaria eliminada");
          }}
          onTransfer={onTransferModal}
        />
      </TabsContent>
      <TabsContent value="ventas"><SettingsFormCard title="Ventas, Monedas y Comprobantes X" description="Configurá la moneda base (Reales por defecto), cotizaciones en Pesos y Dólares, cobros y condiciones comerciales." icon={FileText} onSubmit={submitSettings} busy={busy}><SelectField label="Moneda base predeterminada" name="currency" defaultValue={settings.currency||"BRL"}><option value="BRL">🇧🇷 Reales Brasileños (R$ BRL) - Predeterminada</option><option value="ARS">🇦🇷 Pesos Argentinos ($ ARS)</option><option value="USD">🇺🇸 Dólares Estadounidenses (US$ USD)</option></SelectField><Field label="Cotización: 1 Real (R$ BRL) en Pesos ($ ARS)" name="exchangeRateArs" type="number" step="any" defaultValue={settings.exchange_rate_ars||settings.exchange_rate_brl||250} placeholder="Ej: 250"/><Field label="Cotización: 1 Dólar (US$ USD) en Reales (R$ BRL)" name="exchangeRateUsd" type="number" step="any" defaultValue={settings.exchange_rate_usd||5.70} placeholder="Ej: 5.70"/><input type="hidden" name="exchangeRateBrl" value={settings.exchange_rate_ars||settings.exchange_rate_brl||250} /><div className="md:col-span-2 rounded-xl bg-muted/40 border p-3 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2"><span>Paridades activas: <strong>1 R$ = ${Number(settings.exchange_rate_ars||settings.exchange_rate_brl||250).toLocaleString("es-AR")} ARS</strong> · <strong>1 US$ = R$ {Number(settings.exchange_rate_usd||5.70).toFixed(2)} BRL</strong> · <strong>1 US$ ≈ ${(Number(settings.exchange_rate_usd||5.70) * Number(settings.exchange_rate_ars||settings.exchange_rate_brl||250)).toLocaleString("es-AR")} ARS</strong></span><Badge variant="outline" className="font-mono text-[10px]">Multi-moneda CR</Badge></div><Field label="Prefijo del comprobante" name="receiptPrefix" defaultValue={settings.receipt_prefix||"X"}/><Field label="Próximo número" name="nextReceiptNumber" type="number" defaultValue={settings.next_receipt_number||1}/><SelectField label="Canal de venta predeterminado" name="defaultChannel" defaultValue={settings.default_channel||"minorista"}><option value="minorista">Minorista (Público general / Consumidor final)</option><option value="mayorista">Mayorista (Comercios y revendedores)</option></SelectField><Field label="Medios de pago separados por coma" name="paymentMethods" defaultValue={settings.payment_methods}/><Field label="Descuento máximo (%)" name="maxDiscountPercent" type="number" defaultValue={settings.max_discount_percent}/><SelectField label="Redondeo del total" name="roundingMode" defaultValue={settings.rounding_mode}><option value="none">Sin redondeo</option><option value="10">Al múltiplo de $10</option><option value="100">Al múltiplo de $100</option></SelectField><Field label="Mínimo mayorista (pares) - dejar en 0 para sin mínimo" name="wholesaleMinQty" type="number" defaultValue={settings.wholesale_min_qty ?? 0}/><SettingToggle name="allowMixedSale" label="Combinar modelos" description="Permite alcanzar el mínimo mayorista sumando distintos modelos." defaultChecked={Boolean(settings.allow_mixed_sale)}/><div className="md:col-span-2"><TextAreaField label="Condiciones mayoristas" name="wholesaleTerms" defaultValue={settings.wholesale_terms}/></div></SettingsFormCard></TabsContent>
      <TabsContent value="inventario"><SettingsFormCard title="Reglas de inventario" description="Definí alertas, talles habituales y el comportamiento cuando no hay existencias." icon={Boxes} onSubmit={submitSettings} busy={busy}><Field label="Alerta de stock mínimo" name="lowStockAt" type="number" defaultValue={settings.low_stock_at}/><Field label="Talles predeterminados" name="defaultSizes" defaultValue={settings.default_sizes}/><Field label="Prefijo para códigos propios" name="barcodePrefix" defaultValue={settings.barcode_prefix}/><SettingToggle name="allowNegativeStock" label="Permitir stock negativo" description="Habilita ventas aunque el talle figure sin existencias. Usalo con control." defaultChecked={Boolean(settings.allow_negative_stock)}/><div className="md:col-span-2 rounded-2xl border bg-muted/35 p-4"><p className="font-bold">Estado actual</p><div className="mt-3 grid gap-3 sm:grid-cols-3"><div><p className="text-2xl font-black">{data.stats.productCount}</p><p className="text-xs text-muted-foreground">Modelos activos</p></div><div><p className="text-2xl font-black">{data.stats.lowStock}</p><p className="text-xs text-muted-foreground">Alertas vigentes</p></div><div><p className="text-2xl font-black">{data.products.reduce((sum:number,p:Product)=>sum+p.total_stock,0)}</p><p className="text-xs text-muted-foreground">Pares registrados</p></div></div></div></SettingsFormCard></TabsContent>
      <TabsContent value="catalogo"><SettingsFormCard title="Catálogos comerciales" description="Elegí qué información se imprime y comparte con clientes." icon={Tags} onSubmit={submitSettings} busy={busy}><SelectField label="Lista de precios predeterminada en catálogos" name="catalogDefaultPrice" defaultValue={settings.catalog_default_price||"both"}><option value="wholesale">Solo Precios Mayoristas</option><option value="retail">Solo Precios Minoristas</option><option value="both">Ambas listas (Mayorista + PVP)</option></SelectField><Field label="Contacto visible" name="catalogContact" defaultValue={settings.catalog_contact} placeholder="WhatsApp, teléfono o Instagram"/><SettingToggle name="catalogInStockOnly" label="Solo productos con stock" description="Oculta automáticamente modelos agotados." defaultChecked={Boolean(settings.catalog_in_stock_only)}/><SettingToggle name="catalogShowBarcode" label="Mostrar códigos de barras" description="Incluye el código en cada ficha impresa." defaultChecked={Boolean(settings.catalog_show_barcode)}/><div className="md:col-span-2"><TextAreaField label="Condiciones al pie del catálogo" name="catalogTerms" defaultValue={settings.catalog_terms}/></div></SettingsFormCard></TabsContent>
      <TabsContent value="lectores"><SettingsFormCard title="Lectores y cámara" description="Configurá y verificá los dispositivos usados en el punto de venta." icon={ScanLine} onSubmit={submitSettings} busy={busy}><SettingToggle name="scanSound" label="Confirmación sonora" description="Reproduce un sonido breve al reconocer un código." defaultChecked={Boolean(settings.scan_sound)}/><SettingToggle name="cameraEnabled" label="Lector con cámara" description="Habilita el escaneo mediante la cámara del dispositivo." defaultChecked={Boolean(settings.camera_enabled)}/><div className="md:col-span-2 grid gap-3 rounded-2xl border bg-muted/30 p-4 md:grid-cols-[1fr_auto_auto]"><div><p className="mb-2 text-sm font-bold">Prueba de lector USB o Bluetooth</p><Input value={readerCode} onChange={e=>setReaderCode(e.target.value)} onKeyDown={e=>e.key==="Enter"&&testReader()} placeholder="Escaneá un código aquí"/><p className="mt-2 text-xs text-muted-foreground">{readerResult||"El lector debe escribir el código y enviar Enter."}</p></div><Button type="button" variant="outline" className="self-end" onClick={testReader}><ScanLine/>Probar lector</Button><Button type="button" variant="outline" className="self-end" onClick={testCamera}><Camera/>Probar cámara</Button></div></SettingsFormCard></TabsContent>
      <TabsContent value="apariencia"><SettingsFormCard title="Apariencia del sistema" description="Personalizá el modo visual sin cambiar los datos del negocio." icon={Palette} onSubmit={submitSettings} busy={busy}><SelectField label="Tema predeterminado" name="themeDefault" defaultValue={settings.theme_default}><option value="system">Según el dispositivo</option><option value="light">Modo claro</option><option value="dark">Modo noche</option></SelectField><SelectField label="Animaciones" name="motionLevel" defaultValue={settings.motion_level}><option value="full">Suaves y completas</option><option value="reduced">Movimiento reducido</option></SelectField><SelectField label="Tamaño de navegación" name="navDensity" defaultValue={settings.nav_density}><option value="normal">Normal</option><option value="compact">Compacta</option></SelectField><div className="flex items-end"><Button type="button" variant="outline" className="w-full" onClick={()=>setDark(!dark)}>{dark?<Sun/>:<Moon/>}Vista previa: {dark?"modo claro":"modo noche"}</Button></div></SettingsFormCard></TabsContent>
      <TabsContent value="datos"><Card className="settings-panel border-0 shadow-sm"><CardHeader className="border-b"><div className="flex items-start gap-3"><span className="settings-panel-icon"><Database className="size-5"/></span><div><CardTitle>Respaldo y seguridad de datos</CardTitle><p className="mt-1 text-sm text-muted-foreground">Descargá copias, exportá registros o restaurá el sistema de forma controlada.</p></div></div></CardHeader><CardContent className="space-y-6 pt-1"><div><p className="mb-3 font-bold">Copias y exportaciones</p><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={exportBackup}><Download/>Respaldo completo</Button><Button variant="outline" onClick={()=>exportCsv("productos",data.products)}><Download/>Productos CSV</Button><Button variant="outline" onClick={()=>exportCsv("ventas",data.sales)}><Download/>Ventas CSV</Button><Button variant="outline" onClick={()=>exportCsv("caja",data.movements)}><Download/>Caja CSV</Button><Button variant="outline" onClick={async()=>{ if(window.confirm("¿Querés cargar calzados y clientes de ejemplo para probar el sistema?")){ await onSave({action:"seed_demo_data"},"Datos de prueba cargados correctamente"); } }}><Boxes className="size-4"/>Cargar datos demo</Button></div></div><div className="grid gap-4 border-t pt-6 md:grid-cols-2"><div className="rounded-2xl border p-5"><Upload className="mb-3 size-7 text-primary"/><p className="font-bold">Restaurar una copia</p><p className="mt-1 text-sm text-muted-foreground">Reemplaza los datos actuales por los contenidos en un respaldo JSON del sistema.</p><input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={importBackup}/><Button variant="outline" className="mt-4" onClick={()=>fileRef.current?.click()}><Upload/>Seleccionar respaldo</Button></div><div className="rounded-2xl border border-red-200 bg-red-50/60 p-5 dark:border-red-900 dark:bg-red-950/20"><ShieldAlert className="mb-3 size-7 text-red-600"/><p className="font-bold text-red-700 dark:text-red-300">Restablecer base de datos</p><p className="mt-1 text-sm text-red-700/75 dark:text-red-300/75">Elimina productos, ventas, clientes, proveedores y movimientos. Conserva la configuración.</p><Button variant="destructive" className="mt-4" onClick={()=>setResetOpen(true)}><ShieldAlert/>Eliminar datos operativos</Button></div></div></CardContent></Card></TabsContent>
    </Tabs>
    <AlertDialog open={resetOpen} onOpenChange={setResetOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar todos los datos operativos?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Descargá un respaldo antes de continuar. Para confirmar, escribí <strong>ELIMINAR TODO</strong>.</AlertDialogDescription></AlertDialogHeader><Input value={resetText} onChange={e=>setResetText(e.target.value)} placeholder="ELIMINAR TODO"/><AlertDialogFooter><AlertDialogCancel onClick={()=>setResetText("")}>Cancelar</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={resetText!=="ELIMINAR TODO"||busy} onClick={async()=>{const ok=await onSave({action:"reset_database",confirmation:resetText},"Base de datos restablecida");if(ok){setResetOpen(false);setResetText("");}}}>Eliminar definitivamente</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
