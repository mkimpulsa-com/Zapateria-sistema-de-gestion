import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, writeBatch,
  runTransaction, deleteDoc, type DocumentData,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db, storage, firebaseConfig } from "@/lib/firebase";
import { compressImageFile } from "./image-compressor";

const now = () => new Date().toISOString();
const bool = (value: unknown, fallback=false) => value===undefined ? fallback : value===true||value===1||value==="1"||value==="true"||value==="on";
const text = (value: unknown, fallback="") => value===undefined ? fallback : String(value??"").trim();
const number = (value: unknown, fallback=0) => value===undefined ? fallback : Number(value)||0;

const defaultSettings = {
  business_name:"Mi Zapatería", branch_name:"Sucursal principal", tax_id:"", email:"", whatsapp:"", logo_url:"",
  receipt_type:"X", receipt_prefix:"X", next_receipt_number:1, currency:"ARS", secondary_currency:"BRL", exchange_rate_brl:250, default_channel:"minorista",
  payment_methods:"Efectivo,Transferencia,Tarjeta,Mercado Pago,Cuenta corriente", max_discount_percent:20, rounding_mode:"none",
  wholesale_min_qty:12, allow_mixed_sale:true, wholesale_terms:"Precios mayoristas desde el mínimo indicado.",
  low_stock_at:3, default_sizes:"35,36,37,38,39,40", allow_negative_stock:false, barcode_prefix:"",
  catalog_default_price:"retail", catalog_in_stock_only:true, catalog_show_barcode:true, catalog_contact:"",
  catalog_terms:"Precios sujetos a disponibilidad.", theme_default:"system", motion_level:"full", nav_density:"normal",
  scan_sound:true, camera_enabled:true, phone:"", address:"", updated_at:now(),
};

function requireFirebase(){if(!db)throw new Error("Firebase no está configurado.");return db;}
const withId=(snapshot:any)=>snapshot.docs.map((item:any)=>({id:item.id,...item.data()}));

export function getStoreUid(explicitUid?: string): string {
  const uid = explicitUid || auth?.currentUser?.uid;
  if (!uid) throw new Error("Debes iniciar sesión para operar el sistema.");
  return uid;
}

export function userCol(name: string, uid?: string) {
  const database = requireFirebase();
  const userId = getStoreUid(uid);
  return collection(database, "users", userId, name);
}

export function userDoc(name: string, id: string, uid?: string) {
  const database = requireFirebase();
  const userId = getStoreUid(uid);
  return doc(database, "users", userId, name, id);
}

export function userSettingsDoc(uid?: string) {
  return userDoc("settings", "main", uid);
}

async function ensureSeed(uid?: string) {
  const database = requireFirebase();
  const userId = getStoreUid(uid);
  const settingsRef = userSettingsDoc(userId);
  const snap = await getDoc(settingsRef);
  if (snap.exists()) return;

  // Inicialización limpia para nuevo usuario en producción:
  // Cada usuario comienza con su propio espacio aislado y configuraciones básicas
  const currentUser = auth?.currentUser;
  const initialBusinessName = currentUser?.displayName
    ? `Zapatería ${currentUser.displayName.split(" ")[0]}`
    : "Mi Zapatería";

  await setDoc(settingsRef, {
    ...defaultSettings,
    business_name: initialBusinessName,
    email: currentUser?.email || "",
    created_at: now(),
    updated_at: now(),
  });
}

export async function seedDemoData(uid?: string) {
  const database = requireFirebase();
  const userId = getStoreUid(uid);
  const batch = writeBatch(database);
  const products = [
    {id:"urban-street",sku:"URB-101",barcode:"7791000001013",name:"Urban Street",brand:"Nómade",category:"Zapatillas",color:"Blanco",gender:"Unisex",cost:38000,retail_price:69900,wholesale_price:57900,min_stock:3,image_url:"https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80",variants:[["36",2],["37",5],["38",4],["39",2],["40",1],["41",0]]},
    {id:"runner-pro",sku:"RUN-204",barcode:"7791000002041",name:"Runner Pro",brand:"Velox",category:"Deportivo",color:"Negro",gender:"Hombre",cost:46500,retail_price:84900,wholesale_price:71900,min_stock:3,image_url:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",variants:[["39",3],["40",4],["41",6],["42",4],["43",2],["44",1]]},
    {id:"bota-siena",sku:"BTA-330",barcode:"7791000003307",name:"Bota Siena",brand:"Terrana",category:"Botas",color:"Suela",gender:"Mujer",cost:52000,retail_price:94900,wholesale_price:79900,min_stock:2,image_url:"https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=600&auto=format&fit=crop&q=80",variants:[["35",2],["36",3],["37",3],["38",1],["39",0],["40",1]]},
    {id:"mini-flex",sku:"KID-086",barcode:"7791000000863",name:"Mini Flex",brand:"Pasitos",category:"Infantil",color:"Azul",gender:"Niños",cost:25000,retail_price:46900,wholesale_price:38900,min_stock:3,image_url:"https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=600&auto=format&fit=crop&q=80",variants:[["28",4],["29",3],["30",2],["31",1],["32",3],["33",2]]},
  ];
  for (const product of products) {
    const { id, variants, ...rest } = product;
    batch.set(userDoc("products", id, userId), {
      ...rest,
      active: true,
      created_at: now(),
      variants: variants.map(([size, stock]) => ({ id: `${id}-${size}`, size, stock })),
    });
  }
  batch.set(userDoc("customers", "maria-gonzalez", userId), { name: "María González", type: "minorista", phone: "3757 555-018", email: "", balance: 0, credit_limit: 0, created_at: now() });
  batch.set(userDoc("customers", "calzados-norte", userId), { name: "Calzados Norte", type: "mayorista", phone: "3757 555-221", email: "", balance: 125000, credit_limit: 500000, created_at: now() });
  batch.set(userDoc("suppliers", "distribuidora-andina", userId), { name: "Distribuidora Andina", contact: "Lucas", phone: "11 5555-1300", balance: 280000, created_at: now() });
  batch.set(userDoc("suppliers", "fabrica-sur", userId), { name: "Fábrica Sur", contact: "Carla", phone: "341 555-9090", balance: 0, created_at: now() });
  batch.set(userDoc("cashMovements", "saldo-apertura", userId), { type: "ingreso", category: "Aporte inicial", amount: 350000, description: "Saldo de apertura", reference: "", created_at: now() });
  await batch.commit();
}

export async function createCashierAccount({
  email,
  password,
  name,
  ownerUid,
  storeName,
}: {
  email: string;
  password: string;
  name: string;
  ownerUid: string;
  storeName: string;
}) {
  const secondaryAppName = "SecondaryStaffAuthApp";
  const existingApp = getApps().find((app) => app.name === secondaryAppName);
  const secondaryApp = existingApp || initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
    const cashierUid = cred.user.uid;
    await signOut(secondaryAuth);

    const staffData = {
      uid: cashierUid,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role: "cajera",
      storeId: ownerUid,
      storeName: storeName || "Zapatería",
      active: true,
      created_at: now(),
      created_by: ownerUid,
    };

    const database = requireFirebase();
    const batch = writeBatch(database);
    batch.set(doc(database, "staff_users", cashierUid), staffData);
    batch.set(userDoc("staff", cashierUid, ownerUid), staffData);
    await batch.commit();

    return staffData;
  } catch (error: any) {
    try {
      await signOut(secondaryAuth);
    } catch {}
    const code = String(error?.code || "");
    if (code.includes("email-already-in-use")) {
      throw new Error("Ese correo electrónico ya está registrado en Firebase.");
    } else if (code.includes("weak-password")) {
      throw new Error("La contraseña debe tener al menos 6 caracteres.");
    } else if (code.includes("invalid-email")) {
      throw new Error("El formato del correo electrónico no es válido.");
    }
    throw error;
  }
}

export async function toggleCashierStatus({
  cashierUid,
  ownerUid,
  active,
}: {
  cashierUid: string;
  ownerUid: string;
  active: boolean;
}) {
  const database = requireFirebase();
  const batch = writeBatch(database);
  batch.update(doc(database, "staff_users", cashierUid), { active, updated_at: now() });
  batch.update(userDoc("staff", cashierUid, ownerUid), { active, updated_at: now() });
  await batch.commit();
}

export async function deleteCashierAccount({
  cashierUid,
  ownerUid,
}: {
  cashierUid: string;
  ownerUid: string;
}) {
  const database = requireFirebase();
  const batch = writeBatch(database);
  batch.delete(doc(database, "staff_users", cashierUid));
  batch.delete(userDoc("staff", cashierUid, ownerUid));
  await batch.commit();
}

export async function loadStore(uid?: string) {
  const userId = getStoreUid(uid);
  await ensureSeed(userId);
  const [settingsSnap, productsSnap, customersSnap, suppliersSnap, salesSnap, movementsSnap, stockSnap, customerMovesSnap, supplierMovesSnap, bankAccountsSnap, bankMovesSnap, categoriesSnap, staffSnap] = await Promise.all([
    getDoc(userSettingsDoc(userId)),
    getDocs(userCol("products", userId)),
    getDocs(userCol("customers", userId)),
    getDocs(userCol("suppliers", userId)),
    getDocs(userCol("sales", userId)),
    getDocs(userCol("cashMovements", userId)),
    getDocs(userCol("stockMovements", userId)),
    getDocs(userCol("customerMovements", userId)),
    getDocs(userCol("supplierMovements", userId)),
    getDocs(userCol("bankAccounts", userId)),
    getDocs(userCol("bankMovements", userId)),
    getDocs(userCol("categories", userId)),
    getDocs(userCol("staff", userId)),
  ]);
  const rawSettings = settingsSnap.data() || {};
  const settings = { ...defaultSettings, ...rawSettings };
  if (!rawSettings.wholesale_min_qty || Number(rawSettings.wholesale_min_qty) === 6) {
    settings.wholesale_min_qty = 12;
  }
  const products = withId(productsSnap).filter((item:any)=>item.active!==false).map((item:any)=>({...item,variants:Array.isArray(item.variants)?item.variants:[],total_stock:(item.variants||[]).reduce((sum:number,variant:any)=>sum+Number(variant.stock||0),0)})).sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at)));
  const customers = withId(customersSnap).sort((a:any,b:any)=>String(a.name).localeCompare(String(b.name)));
  const suppliers = withId(suppliersSnap).sort((a:any,b:any)=>String(a.name).localeCompare(String(b.name)));
  const sales = withId(salesSnap).sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,50);
  const movements = withId(movementsSnap).sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,50);
  const stockMoves = withId(stockSnap).sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,30);
  const customerMoves = withId(customerMovesSnap).sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,100);
  const supplierMoves = withId(supplierMovesSnap).sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,100);
  const bankAccounts = withId(bankAccountsSnap).sort((a:any,b:any)=>String(a.name).localeCompare(String(b.name)));
  const bankMoves = withId(bankMovesSnap).sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,100);
  const staff = withId(staffSnap).sort((a:any,b:any)=>String(a.name||"").localeCompare(String(b.name||"")));

  let categories = withId(categoriesSnap);
  if (categories.length === 0) {
    const baseNames = ["Zapatillas", "Zapatos", "Botas", "Sandalias", "Pantuflas", "Deportivo", "Urbano", "Infantil"];
    const productCategories = products.map((p: any) => text(p.category)).filter(Boolean);
    const uniqueNames = Array.from(new Set([...baseNames, ...productCategories]));
    const batch = writeBatch(requireFirebase());
    const seededCategories: any[] = [];
    for (const catName of uniqueNames) {
      const docRef = doc(userCol("categories", userId));
      const catData = { name: catName, description: "", created_at: now() };
      batch.set(docRef, catData);
      seededCategories.push({ id: docRef.id, ...catData });
    }
    await batch.commit();
    categories = seededCategories;
  }
  categories.sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));

  const today = new Date().toISOString().slice(0,10);
  const todaySales = sales.filter((sale:any)=>String(sale.created_at).slice(0,10)===today);
  return {settings,products,customers,suppliers,sales,movements,stockMoves,customerMoves,supplierMoves,bankAccounts,bankMoves,categories,staff,stats:{
    revenueToday:todaySales.reduce((sum:number,sale:any)=>sum+Number(sale.total_ars||sale.total||0),0), salesToday:todaySales.length,
    stockValue:products.reduce((sum:number,product:any)=>sum+Number(product.cost||0)*Number(product.total_stock||0),0),
    cashBalance:movements.reduce((sum:number,movement:any)=>sum+(movement.type==="ingreso"?Number(movement.amount||0):-Number(movement.amount||0)),0),
    bankBalance:bankAccounts.filter((acc:any)=>acc.currency!=="BRL").reduce((sum:number,acc:any)=>sum+Number(acc.balance||0),0),
    bankBalanceBrl:bankAccounts.filter((acc:any)=>acc.currency==="BRL").reduce((sum:number,acc:any)=>sum+Number(acc.balance||0),0),
    lowStock:products.filter((product:any)=>Number(product.total_stock)<=Number(settings.low_stock_at||3)).length, productCount:products.length,
  }};
}

async function deleteCollection(name: string, uid?: string) {
  const database = requireFirebase();
  const userId = getStoreUid(uid);
  const snapshots = await getDocs(userCol(name, userId));
  for (let start = 0; start < snapshots.docs.length; start += 400) {
    const batch = writeBatch(database);
    snapshots.docs.slice(start, start + 400).forEach((item: any) => batch.delete(item.ref));
    await batch.commit();
  }
}

async function resetOperationalData(uid?: string) {
  const userId = getStoreUid(uid);
  for (const name of ["stockMovements","cashMovements","customerMovements","supplierMovements","bankAccounts","bankMovements","sales","products","customers","suppliers"]) {
    await deleteCollection(name, userId);
  }
  await updateDoc(userSettingsDoc(userId), { next_receipt_number: 1, updated_at: now() });
}

export async function createStoreBackup(uid?: string) {
  const userId = getStoreUid(uid);
  await ensureSeed(userId);
  const names = ["products","customers","suppliers","sales","cashMovements","stockMovements","customerMovements","supplierMovements","bankAccounts","bankMovements","categories"];
  const data: any = { settings: (await getDoc(userSettingsDoc(userId))).data() };
  for (const name of names) {
    data[name] = withId(await getDocs(userCol(name, userId)));
  }
  return { format: "zapateria-firebase-backup", version: 1, exportedAt: now(), data };
}

async function restoreBackup(backup: any, uid?: string) {
  const database = requireFirebase();
  const userId = getStoreUid(uid);
  if (backup?.format === "zapateria-backup") backup = convertLegacyBackup(backup);
  if (backup?.format !== "zapateria-firebase-backup" || !backup?.data?.settings) throw new Error("La copia no corresponde a una versión compatible del sistema.");
  const names = ["products","customers","suppliers","sales","cashMovements","stockMovements","customerMovements","supplierMovements","bankAccounts","bankMovements","categories"];
  const total = names.reduce((sum, name) => sum + (Array.isArray(backup.data[name]) ? backup.data[name].length : 0), 0);
  if (total > 5000) throw new Error("La copia supera el límite seguro de 5.000 registros.");
  await resetOperationalData(userId);
  await setDoc(userSettingsDoc(userId), { ...defaultSettings, ...backup.data.settings, updated_at: now() });
  for (const name of names) {
    const rows = Array.isArray(backup.data[name]) ? backup.data[name] : [];
    for (let start = 0; start < rows.length; start += 400) {
      const batch = writeBatch(database);
      for (const row of rows.slice(start, start + 400)) {
        const { id, ...values } = row;
        batch.set(userDoc(name, String(id), userId), values);
      }
      await batch.commit();
    }
  }
}

function convertLegacyBackup(legacy: any) {
  const source = legacy.data || {};
  const settings = Array.isArray(source.settings) ? source.settings[0] : source.settings;
  const variants = Array.isArray(source.product_variants) ? source.product_variants : [];
  const customers = Array.isArray(source.customers) ? source.customers : [];
  const customerNames = new Map(customers.map((customer: any) => [String(customer.id), customer.name]));
  const saleItems = Array.isArray(source.sale_items) ? source.sale_items : [];
  const products = (source.products || []).map((product: any) => ({
    ...product,
    id: String(product.id),
    active: Boolean(product.active),
    variants: variants.filter((variant: any) => String(variant.product_id) === String(product.id)).map((variant: any) => ({
      id: String(variant.id),
      size: String(variant.size),
      stock: Number(variant.stock) || 0,
    })),
  }));
  const sales = (source.sales || []).map((sale: any) => ({
    ...sale,
    id: String(sale.id),
    customer_id: sale.customer_id ? String(sale.customer_id) : null,
    customer_name: sale.customer_id ? customerNames.get(String(sale.customer_id)) || "Consumidor final" : "Consumidor final",
    items: saleItems.filter((item: any) => String(item.sale_id) === String(sale.id)).map((item: any) => ({
      ...item,
      id: String(item.id),
      product_id: String(item.product_id),
      variant_id: String(item.variant_id),
    })),
  }));
  const mapIds = (rows: any[] = []) => rows.map((row: any) => ({ ...row, id: String(row.id) }));
  return {
    format: "zapateria-firebase-backup",
    version: 1,
    exportedAt: now(),
    data: {
      settings: { ...defaultSettings, ...settings },
      products,
      customers: mapIds(customers),
      suppliers: mapIds(source.suppliers),
      sales,
      cashMovements: mapIds(source.cash_movements),
      stockMovements: mapIds(source.stock_movements),
    },
  };
}

export async function uploadBusinessLogo(file: File, uid?: string) {
  const userId = getStoreUid(uid);
  if (!storage) throw new Error("Iniciá sesión para subir el logo.");
  if (!file.type.startsWith("image/")) throw new Error("Seleccioná una imagen válida.");
  
  // Comprimir automáticamente el logo a WebP optimizado
  const { file: compressedLogo } = await compressImageFile(file, {
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.85,
    outputFormat: "image/webp",
  });

  const target = ref(storage, `branding/${userId}/logo-${Date.now()}.webp`);
  await uploadBytes(target, compressedLogo, { contentType: "image/webp" });
  return getDownloadURL(target);
}

export async function runStoreAction(body: any, uid?: string) {
  const database = requireFirebase();
  const userId = getStoreUid(uid);
  await ensureSeed(userId);
  const action = String(body.action || "");

  if (action === "create_product") {
    const name = text(body.name);
    if (!name) throw new Error("El nombre del modelo es obligatorio.");
    const skuRaw = text(body.sku);
    const barcodeRaw = text(body.barcode);
    const existing = withId(await getDocs(userCol("products", userId)));

    // Si se especifica SKU, verificar que no esté duplicado
    if (skuRaw && existing.some((item: any) => String(item.sku).toLowerCase() === skuRaw.toLowerCase())) {
      throw new Error("El SKU ingresado ya está en uso en otro modelo.");
    }

    // Si se especifica código de barras, verificar que no esté duplicado
    if (barcodeRaw && existing.some((item: any) => String(item.barcode) === barcodeRaw)) {
      throw new Error("El código de barras ingresado ya está en uso.");
    }

    // Autogenerar SKU si no se proporcionó
    const sku = skuRaw || `MOD-${Math.floor(1000 + Math.random() * 9000)}`;

    // Autogenerar código de barras numérico si no se proporcionó
    const barcode = barcodeRaw || `779${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    const target = doc(userCol("products", userId));

    // Procesar variantes con cantidad por talle
    let variantsList: Array<{ id: string; size: string; stock: number }> = [];
    if (Array.isArray(body.variants) && body.variants.length > 0) {
      variantsList = body.variants.map((v: any) => ({
        id: `${target.id}-${String(v.size).trim()}`,
        size: String(v.size).trim(),
        stock: Math.max(0, Number(v.stock) || 0),
      }));
    } else if (body.variantsJson) {
      try {
        const parsed = JSON.parse(body.variantsJson);
        if (Array.isArray(parsed)) {
          variantsList = parsed.map((v: any) => ({
            id: `${target.id}-${String(v.size).trim()}`,
            size: String(v.size).trim(),
            stock: Math.max(0, Number(v.stock) || 0),
          }));
        }
      } catch {}
    }

    if (variantsList.length === 0) {
      const sizes = text(body.sizes, "35,36,37,38,39,40").split(",").map(item => item.trim()).filter(Boolean);
      const stockPerSize = Math.max(0, number(body.initialStock, 0));
      variantsList = sizes.map(size => ({
        id: `${target.id}-${size}`,
        size,
        stock: stockPerSize,
      }));
    }

    await setDoc(target, {
      sku,
      barcode,
      name,
      brand: text(body.brand),
      category: text(body.category, "Calzado"),
      color: text(body.color),
      gender: text(body.gender, "Unisex"),
      cost: number(body.cost),
      retail_price: number(body.retailPrice),
      wholesale_price: number(body.wholesalePrice),
      min_stock: Math.max(0, number(body.minStock, 3)),
      image_url: text(body.imageUrl || body.image_url || body.image, ""),
      active: true,
      created_at: now(),
      variants: variantsList,
    });
  } else if (action === "edit_product") {
    const productId = String(body.productId || body.id || "").trim();
    if (!productId) throw new Error("ID de producto no especificado.");
    const productRef = userDoc("products", productId, userId);
    const existingSnap = await getDoc(productRef);
    if (!existingSnap.exists()) throw new Error("El producto no existe.");
    const current = existingSnap.data() as any;

    const name = text(body.name, current.name);
    if (!name) throw new Error("El nombre del modelo no puede estar vacío.");

    const skuRaw = text(body.sku, current.sku);
    const barcodeRaw = text(body.barcode, current.barcode);
    const allProducts = withId(await getDocs(userCol("products", userId)));

    if (skuRaw && allProducts.some((item: any) => String(item.id) !== productId && String(item.sku).toLowerCase() === skuRaw.toLowerCase())) {
      throw new Error("El SKU ingresado ya está asignado a otro modelo.");
    }
    if (barcodeRaw && allProducts.some((item: any) => String(item.id) !== productId && String(item.barcode) === barcodeRaw)) {
      throw new Error("El código de barras ya está asignado a otro modelo.");
    }

    let variantsList: Array<{ id: string; size: string; stock: number }> = current.variants || [];
    if (Array.isArray(body.variants) && body.variants.length > 0) {
      variantsList = body.variants.map((v: any) => ({
        id: v.id || `${productId}-${String(v.size).trim()}`,
        size: String(v.size).trim(),
        stock: Math.max(0, Number(v.stock) || 0),
      }));
    } else if (body.variantsJson) {
      try {
        const parsed = JSON.parse(body.variantsJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          variantsList = parsed.map((v: any) => ({
            id: v.id || `${productId}-${String(v.size).trim()}`,
            size: String(v.size).trim(),
            stock: Math.max(0, Number(v.stock) || 0),
          }));
        }
      } catch {}
    }

    await updateDoc(productRef, {
      name,
      brand: text(body.brand, current.brand),
      category: text(body.category, current.category || "Calzado"),
      color: text(body.color, current.color),
      gender: text(body.gender, current.gender || "Unisex"),
      sku: skuRaw || current.sku,
      barcode: barcodeRaw || current.barcode,
      cost: body.cost !== undefined ? number(body.cost) : current.cost,
      retail_price: body.retailPrice !== undefined ? number(body.retailPrice) : (body.retail_price !== undefined ? number(body.retail_price) : current.retail_price),
      wholesale_price: body.wholesalePrice !== undefined ? number(body.wholesalePrice) : (body.wholesale_price !== undefined ? number(body.wholesale_price) : current.wholesale_price),
      min_stock: body.minStock !== undefined ? Math.max(0, number(body.minStock)) : (body.min_stock !== undefined ? Math.max(0, number(body.min_stock)) : current.min_stock),
      image_url: body.imageUrl !== undefined ? text(body.imageUrl) : (body.image_url !== undefined ? text(body.image_url) : (current.image_url || "")),
      variants: variantsList,
      updated_at: now(),
    });
  } else if (action === "delete_product") {
    const productId = String(body.productId || body.id || "").trim();
    if (!productId) throw new Error("ID de producto no especificado.");
    const productRef = userDoc("products", productId, userId);
    await deleteDoc(productRef);
  } else if (action === "adjust_stock") {
    const products = withId(await getDocs(userCol("products", userId)));
    const product = products.find((item: any) => (item.variants || []).some((variant: any) => String(variant.id) === String(body.variantId)));
    if (!product) throw new Error("No se encontró el talle seleccionado.");
    const quantity = Number(body.quantity);
    const variant = (product.variants || []).find((item: any) => String(item.id) === String(body.variantId));
    if (!Number.isFinite(quantity) || Number(variant.stock) + quantity < 0) throw new Error("Ajuste de stock inválido.");
    await updateDoc(userDoc("products", product.id, userId), {
      variants: product.variants.map((item: any) => String(item.id) === String(body.variantId) ? { ...item, stock: Number(item.stock) + quantity } : item),
    });
    await addDoc(userCol("stockMovements", userId), {
      product_id: product.id,
      variant_id: variant.id,
      product_name: product.name,
      size: variant.size,
      type: quantity >= 0 ? "ingreso" : "egreso",
      quantity,
      note: text(body.note, "Ajuste manual"),
      created_at: now(),
    });
  } else if (action === "create_customer") {
    if (!text(body.name)) throw new Error("Ingresá el nombre o razón social del cliente.");
    const balance = number(body.balance, 0);
    const customerRef = await addDoc(userCol("customers", userId), {
      name: text(body.name),
      type: body.type === "mayorista" ? "mayorista" : "minorista",
      phone: text(body.phone),
      email: text(body.email),
      document: text(body.document || body.dni || body.cuit),
      address: text(body.address),
      city: text(body.city),
      balance,
      credit_limit: Math.max(0, number(body.creditLimit || body.credit_limit, 0)),
      notes: text(body.notes),
      created_at: now(),
      updated_at: now(),
    });
    if (balance !== 0) {
      await addDoc(userCol("customerMovements", userId), {
        customer_id: customerRef.id,
        customer_name: text(body.name),
        type: balance > 0 ? "cargo" : "pago",
        amount: Math.abs(balance),
        balance_before: 0,
        balance_after: balance,
        note: "Saldo inicial registrado al crear cliente",
        created_at: now(),
      });
    }
    const store = await loadStore(userId);
    (store as any).createdCustomer = {
      id: customerRef.id,
      name: text(body.name),
      type: body.type === "mayorista" ? "mayorista" : "minorista",
    };
    return store;
  } else if (action === "edit_customer") {
    const customerId = String(body.customerId || body.id || "").trim();
    if (!customerId) throw new Error("ID de cliente no especificado.");
    const customerRef = userDoc("customers", customerId, userId);
    const existingSnap = await getDoc(customerRef);
    if (!existingSnap.exists()) throw new Error("El cliente no existe.");
    const current = existingSnap.data() as any;

    const name = text(body.name, current.name);
    if (!name) throw new Error("El nombre no puede estar vacío.");

    await updateDoc(customerRef, {
      name,
      type: body.type === "mayorista" ? "mayorista" : "minorista",
      phone: body.phone !== undefined ? text(body.phone) : (current.phone || ""),
      email: body.email !== undefined ? text(body.email) : (current.email || ""),
      document: body.document !== undefined ? text(body.document) : (body.dni !== undefined ? text(body.dni) : (current.document || "")),
      address: body.address !== undefined ? text(body.address) : (current.address || ""),
      city: body.city !== undefined ? text(body.city) : (current.city || ""),
      credit_limit: body.creditLimit !== undefined ? Math.max(0, number(body.creditLimit)) : (body.credit_limit !== undefined ? Math.max(0, number(body.credit_limit)) : (current.credit_limit || 0)),
      notes: body.notes !== undefined ? text(body.notes) : (current.notes || ""),
      updated_at: now(),
    });
  } else if (action === "delete_customer") {
    const customerId = String(body.customerId || body.id || "").trim();
    if (!customerId) throw new Error("ID de cliente no especificado.");
    const customerRef = userDoc("customers", customerId, userId);
    await deleteDoc(customerRef);
  } else if (action === "adjust_customer_debt") {
    const customerId = String(body.customerId || body.id || "").trim();
    if (!customerId) throw new Error("ID de cliente no especificado.");
    const customerRef = userDoc("customers", customerId, userId);
    const existingSnap = await getDoc(customerRef);
    if (!existingSnap.exists()) throw new Error("El cliente no existe.");
    const customer = existingSnap.data() as any;

    const adjustType = String(body.type || "pago");
    const amount = Math.abs(number(body.amount));
    const currentBalance = number(customer.balance, 0);
    let newBalance = currentBalance;
    let effectiveAmount = amount;

    if (adjustType === "pago") {
      if (amount <= 0) throw new Error("El importe del cobro debe ser mayor a 0.");
      newBalance = currentBalance - amount;
      effectiveAmount = amount;
    } else if (adjustType === "cargo") {
      if (amount <= 0) throw new Error("El importe del cargo debe ser mayor a 0.");
      newBalance = currentBalance + amount;
      effectiveAmount = amount;
    } else if (adjustType === "ajuste_manual") {
      newBalance = number(body.newBalance !== undefined ? body.newBalance : body.amount);
      effectiveAmount = Math.abs(newBalance - currentBalance);
    }

    const note = text(body.note, adjustType === "pago" ? "Pago a cuenta de saldo" : (adjustType === "cargo" ? "Cargo en cuenta corriente" : "Ajuste manual de saldo"));
    const paymentMethod = text(body.paymentMethod, "Efectivo");
    const time = now();

    await updateDoc(customerRef, {
      balance: newBalance,
      updated_at: time,
    });

    await addDoc(userCol("customerMovements", userId), {
      customer_id: customerId,
      customer_name: customer.name,
      type: adjustType,
      amount: effectiveAmount,
      balance_before: currentBalance,
      balance_after: newBalance,
      payment_method: paymentMethod,
      note,
      created_at: time,
    });

    const registerCash = bool(body.registerCashMovement, true);
    if (adjustType === "pago" && registerCash && effectiveAmount > 0) {
      await addDoc(userCol("cashMovements", userId), {
        type: "ingreso",
        category: "Cobro cliente",
        amount: effectiveAmount,
        description: `Cobro cta. cte. - ${customer.name} (${paymentMethod})`,
        reference: text(body.reference, `Recibo cta. cte. ${customer.name}`),
        created_at: time,
      });
    }
  } else if (action === "create_supplier") {
    if (!text(body.name)) throw new Error("Ingresá el nombre o razón social del proveedor.");
    const balance = number(body.balance, 0);
    const supplierRef = await addDoc(userCol("suppliers", userId), {
      name: text(body.name),
      contact: text(body.contact),
      phone: text(body.phone),
      email: text(body.email),
      document: text(body.document || body.cuit),
      address: text(body.address),
      city: text(body.city),
      bank_info: text(body.bankInfo || body.bank_info || body.cbu || body.alias),
      category: text(body.category, "Calzado"),
      balance,
      notes: text(body.notes),
      created_at: now(),
      updated_at: now(),
    });
    if (balance !== 0) {
      await addDoc(userCol("supplierMovements", userId), {
        supplier_id: supplierRef.id,
        supplier_name: text(body.name),
        type: balance > 0 ? "cargo" : "pago",
        amount: Math.abs(balance),
        balance_before: 0,
        balance_after: balance,
        note: "Saldo inicial registrado al crear proveedor",
        created_at: now(),
      });
    }
  } else if (action === "edit_supplier") {
    const supplierId = String(body.supplierId || body.id || "").trim();
    if (!supplierId) throw new Error("ID de proveedor no especificado.");
    const supplierRef = userDoc("suppliers", supplierId, userId);
    const existingSnap = await getDoc(supplierRef);
    if (!existingSnap.exists()) throw new Error("El proveedor no existe.");
    const current = existingSnap.data() as any;

    const name = text(body.name, current.name);
    if (!name) throw new Error("El nombre no puede estar vacío.");

    await updateDoc(supplierRef, {
      name,
      contact: body.contact !== undefined ? text(body.contact) : (current.contact || ""),
      phone: body.phone !== undefined ? text(body.phone) : (current.phone || ""),
      email: body.email !== undefined ? text(body.email) : (current.email || ""),
      document: body.document !== undefined ? text(body.document) : (body.cuit !== undefined ? text(body.cuit) : (current.document || "")),
      address: body.address !== undefined ? text(body.address) : (current.address || ""),
      city: body.city !== undefined ? text(body.city) : (current.city || ""),
      bank_info: body.bankInfo !== undefined ? text(body.bankInfo) : (body.bank_info !== undefined ? text(body.bank_info) : (current.bank_info || "")),
      category: body.category !== undefined ? text(body.category) : (current.category || "Calzado"),
      notes: body.notes !== undefined ? text(body.notes) : (current.notes || ""),
      updated_at: now(),
    });
  } else if (action === "delete_supplier") {
    const supplierId = String(body.supplierId || body.id || "").trim();
    if (!supplierId) throw new Error("ID de proveedor no especificado.");
    const supplierRef = userDoc("suppliers", supplierId, userId);
    await deleteDoc(supplierRef);
  } else if (action === "adjust_supplier_debt") {
    const supplierId = String(body.supplierId || body.id || "").trim();
    if (!supplierId) throw new Error("ID de proveedor no especificado.");
    const supplierRef = userDoc("suppliers", supplierId, userId);
    const existingSnap = await getDoc(supplierRef);
    if (!existingSnap.exists()) throw new Error("El proveedor no existe.");
    const supplier = existingSnap.data() as any;

    const adjustType = String(body.type || "pago");
    const amount = Math.abs(number(body.amount));
    const currentBalance = number(supplier.balance, 0);
    let newBalance = currentBalance;
    let effectiveAmount = amount;

    if (adjustType === "pago") {
      if (amount <= 0) throw new Error("El importe del pago debe ser mayor a 0.");
      newBalance = currentBalance - amount;
      effectiveAmount = amount;
    } else if (adjustType === "cargo") {
      if (amount <= 0) throw new Error("El importe de la factura o cargo debe ser mayor a 0.");
      newBalance = currentBalance + amount;
      effectiveAmount = amount;
    } else if (adjustType === "ajuste_manual") {
      newBalance = number(body.newBalance !== undefined ? body.newBalance : body.amount);
      effectiveAmount = Math.abs(newBalance - currentBalance);
    }

    const note = text(body.note, adjustType === "pago" ? "Pago a cuenta de saldo" : (adjustType === "cargo" ? "Compra o factura en cuenta corriente" : "Ajuste manual de saldo"));
    const paymentMethod = text(body.paymentMethod, "Transferencia");
    const time = now();

    await updateDoc(supplierRef, {
      balance: newBalance,
      updated_at: time,
    });

    await addDoc(userCol("supplierMovements", userId), {
      supplier_id: supplierId,
      supplier_name: supplier.name,
      type: adjustType,
      amount: effectiveAmount,
      balance_before: currentBalance,
      balance_after: newBalance,
      payment_method: paymentMethod,
      note,
      created_at: time,
    });

    const registerCash = bool(body.registerCashMovement, true);
    if (adjustType === "pago" && registerCash && effectiveAmount > 0) {
      await addDoc(userCol("cashMovements", userId), {
        type: "egreso",
        category: "Pago a proveedor",
        amount: effectiveAmount,
        description: `Pago proveedor - ${supplier.name} (${paymentMethod})`,
        reference: text(body.reference, `Pago prov. ${supplier.name}`),
        created_at: time,
      });
    }
  } else if (action === "cash_movement") {
    if (!(number(body.amount) > 0)) throw new Error("Ingresá un importe válido.");
    await addDoc(userCol("cashMovements", userId), {
      type: body.type === "egreso" ? "egreso" : "ingreso",
      category: text(body.category, "General"),
      amount: number(body.amount),
      description: text(body.description),
      reference: text(body.reference),
      created_at: now(),
    });
  } else if (action === "update_cash_movement" || action === "edit_cash_movement") {
    const movementId = String(body.id || body.movementId || "");
    if (!movementId) throw new Error("Movimiento de caja no encontrado.");
    if (!(number(body.amount) > 0)) throw new Error("Ingresá un importe válido.");
    await updateDoc(userDoc("cashMovements", movementId, userId), {
      type: body.type === "egreso" ? "egreso" : "ingreso",
      category: text(body.category, "General"),
      amount: number(body.amount),
      description: text(body.description),
      reference: text(body.reference),
      updated_at: now(),
    });
  } else if (action === "delete_cash_movement") {
    const movementId = String(body.id || body.movementId || "");
    if (!movementId) throw new Error("Movimiento de caja no encontrado.");
    await deleteDoc(userDoc("cashMovements", movementId, userId));
  } else if (action === "create_bank_account") {
    const name = text(body.name);
    if (!name) throw new Error("Ingresá el nombre o alias de la cuenta bancaria.");
    const bankName = text(body.bankName || body.bank_name, "Banco / Entidad");
    const accountType = text(body.accountType || body.account_type, "corriente");
    const accountNumber = text(body.accountNumber || body.account_number || body.cbu || body.alias, "");
    const initialBalance = number(body.initialBalance !== undefined ? body.initialBalance : body.balance, 0);
    const notes = text(body.notes, "");
    const time = now();

    const currency = body.currency === "BRL" ? "BRL" : "ARS";

    const accountRef = await addDoc(userCol("bankAccounts", userId), {
      name,
      bank_name: bankName,
      account_type: accountType,
      account_number: accountNumber,
      balance: initialBalance,
      initial_balance: initialBalance,
      currency,
      notes,
      created_at: time,
      updated_at: time,
    });

    if (initialBalance !== 0) {
      await addDoc(userCol("bankMovements", userId), {
        account_id: accountRef.id,
        account_name: name,
        type: initialBalance > 0 ? "ingreso" : "egreso",
        category: "Saldo inicial",
        amount: Math.abs(initialBalance),
        currency,
        balance_before: 0,
        balance_after: initialBalance,
        reference: "Apertura",
        description: `Saldo inicial registrado al crear cuenta ${name}`,
        created_at: time,
      });
    }

    const store = await loadStore(userId);
    (store as any).createdBankAccount = {
      id: accountRef.id,
      name,
      bank_name: bankName,
      account_type: accountType,
      balance: initialBalance,
      currency,
    };
    return store;
  } else if (action === "edit_bank_account") {
    const accountId = String(body.accountId || body.id || "").trim();
    if (!accountId) throw new Error("ID de cuenta bancaria no especificado.");
    const accountRef = userDoc("bankAccounts", accountId, userId);
    const existingSnap = await getDoc(accountRef);
    if (!existingSnap.exists()) throw new Error("La cuenta bancaria no existe.");
    const current = existingSnap.data() as any;

    const name = text(body.name, current.name);
    if (!name) throw new Error("El nombre de la cuenta no puede estar vacío.");

    await updateDoc(accountRef, {
      name,
      bank_name: body.bankName !== undefined ? text(body.bankName) : (body.bank_name !== undefined ? text(body.bank_name) : current.bank_name),
      account_type: body.accountType !== undefined ? text(body.accountType) : (body.account_type !== undefined ? text(body.account_type) : current.account_type),
      account_number: body.accountNumber !== undefined ? text(body.accountNumber) : (body.account_number !== undefined ? text(body.account_number) : (current.account_number || "")),
      currency: body.currency !== undefined ? (body.currency === "BRL" ? "BRL" : "ARS") : (current.currency || "ARS"),
      notes: body.notes !== undefined ? text(body.notes) : (current.notes || ""),
      updated_at: now(),
    });
  } else if (action === "delete_bank_account") {
    const accountId = String(body.accountId || body.id || "").trim();
    if (!accountId) throw new Error("ID de cuenta bancaria no especificado.");
    const accountRef = userDoc("bankAccounts", accountId, userId);
    await deleteDoc(accountRef);
  } else if (action === "create_category") {
    const name = text(body.name);
    if (!name) throw new Error("El nombre de la categoría es obligatorio.");
    const existing = withId(await getDocs(userCol("categories", userId)));
    if (existing.some((c: any) => String(c.name).toLowerCase() === name.toLowerCase())) {
      throw new Error(`La categoría "${name}" ya existe.`);
    }
    const catRef = await addDoc(userCol("categories", userId), {
      name,
      description: text(body.description, ""),
      created_at: now(),
      updated_at: now(),
    });
    const store = await loadStore(userId);
    (store as any).createdCategory = {
      id: catRef.id,
      name,
      description: text(body.description, ""),
    };
    return store;
  } else if (action === "edit_category") {
    const categoryId = String(body.categoryId || body.id || "").trim();
    if (!categoryId) throw new Error("ID de categoría no especificado.");
    const name = text(body.name);
    if (!name) throw new Error("El nombre de la categoría no puede estar vacío.");

    const catRef = userDoc("categories", categoryId, userId);
    const snap = await getDoc(catRef);
    if (!snap.exists()) throw new Error("La categoría no existe.");
    const current = snap.data() as any;

    const existing = withId(await getDocs(userCol("categories", userId)));
    if (existing.some((c: any) => String(c.id) !== categoryId && String(c.name).toLowerCase() === name.toLowerCase())) {
      throw new Error(`Ya existe otra categoría con el nombre "${name}".`);
    }

    await updateDoc(catRef, {
      name,
      description: body.description !== undefined ? text(body.description) : (current.description || ""),
      updated_at: now(),
    });

    // Si cambió el nombre, sincronizar productos que tengan la categoría vieja
    if (current.name && current.name !== name) {
      const prodsSnap = await getDocs(userCol("products", userId));
      const batch = writeBatch(database);
      let count = 0;
      prodsSnap.docs.forEach((docItem: any) => {
        if (docItem.data().category === current.name) {
          batch.update(docItem.ref, { category: name, updated_at: now() });
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
    }
  } else if (action === "delete_category") {
    const categoryId = String(body.categoryId || body.id || "").trim();
    if (!categoryId) throw new Error("ID de categoría no especificado.");
    const catRef = userDoc("categories", categoryId, userId);
    await deleteDoc(catRef);
  } else if (action === "transfer_bank_balance") {
    const fromId = String(body.fromAccountId || "").trim();
    const toId = String(body.toAccountId || "").trim();
    const amount = number(body.amount, 0);
    const note = text(body.note || body.concept, "Transferencia entre cuentas");
    const reference = text(body.reference, "");

    if (!fromId || !toId) throw new Error("Debes seleccionar la cuenta de origen y destino.");
    if (fromId === toId) throw new Error("La cuenta de origen y destino no pueden ser la misma.");
    if (amount <= 0) throw new Error("El importe a transferir debe ser mayor a 0.");

    await runTransaction(database, async (transaction: any) => {
      const fromRef = userDoc("bankAccounts", fromId, userId);
      const toRef = userDoc("bankAccounts", toId, userId);

      const [fromSnap, toSnap] = await Promise.all([
        transaction.get(fromRef),
        transaction.get(toRef),
      ]);

      if (!fromSnap.exists()) throw new Error("La cuenta de origen no existe.");
      if (!toSnap.exists()) throw new Error("La cuenta de destino no existe.");

      const fromData = fromSnap.data() as any;
      const toData = toSnap.data() as any;

      const fromBalBefore = number(fromData.balance, 0);
      const toBalBefore = number(toData.balance, 0);

      if (fromBalBefore < amount) {
        throw new Error(`Saldo insuficiente en "${fromData.name}". Saldo disponible: $${fromBalBefore.toLocaleString("es-AR")}`);
      }

      const fromBalAfter = fromBalBefore - amount;
      const toBalAfter = toBalBefore + amount;
      const time = now();

      transaction.update(fromRef, { balance: fromBalAfter, updated_at: time });
      transaction.update(toRef, { balance: toBalAfter, updated_at: time });

      transaction.set(doc(userCol("bankMovements", userId)), {
        account_id: fromId,
        account_name: fromData.name,
        type: "egreso",
        category: "Transferencia enviada",
        amount,
        balance_before: fromBalBefore,
        balance_after: fromBalAfter,
        destination_account_id: toId,
        destination_account_name: toData.name,
        reference: reference || `Hacia ${toData.name}`,
        description: note ? `${note} (hacia ${toData.name})` : `Transferencia a ${toData.name}`,
        created_at: time,
      });

      transaction.set(doc(userCol("bankMovements", userId)), {
        account_id: toId,
        account_name: toData.name,
        type: "ingreso",
        category: "Transferencia recibida",
        amount,
        balance_before: toBalBefore,
        balance_after: toBalAfter,
        origin_account_id: fromId,
        origin_account_name: fromData.name,
        reference: reference || `Desde ${fromData.name}`,
        description: note ? `${note} (desde ${fromData.name})` : `Transferencia desde ${fromData.name}`,
        created_at: time,
      });
    });
  } else if (action === "save_settings") {
    const refSettings = userSettingsDoc(userId);
    const current = { ...defaultSettings, ...(await getDoc(refSettings)).data() };
    const map: any = {
      businessName: "business_name", branchName: "branch_name", taxId: "tax_id", email: "email", whatsapp: "whatsapp", logoUrl: "logo_url",
      phone: "phone", address: "address", receiptPrefix: "receipt_prefix", nextReceiptNumber: "next_receipt_number", defaultChannel: "default_channel",
      paymentMethods: "payment_methods", maxDiscountPercent: "max_discount_percent", roundingMode: "rounding_mode", wholesaleMinQty: "wholesale_min_qty",
      allowMixedSale: "allow_mixed_sale", wholesaleTerms: "wholesale_terms", lowStockAt: "low_stock_at", defaultSizes: "default_sizes",
      allowNegativeStock: "allow_negative_stock", barcodePrefix: "barcode_prefix", catalogDefaultPrice: "catalog_default_price",
      catalogInStockOnly: "catalog_in_stock_only", catalogShowBarcode: "catalog_show_barcode", catalogContact: "catalog_contact",
      catalogTerms: "catalog_terms", themeDefault: "theme_default", motionLevel: "motion_level", navDensity: "nav_density",
      scanSound: "scan_sound", cameraEnabled: "camera_enabled",
      exchangeRateBrl: "exchange_rate_brl",
    };
    const changes: any = { updated_at: now() };
    for (const [source, target] of Object.entries(map) as Array<[string, string]>) {
      if (body[source] !== undefined) changes[target] = body[source];
    }
    for (const key of ["allow_mixed_sale", "allow_negative_stock", "catalog_in_stock_only", "catalog_show_barcode", "scan_sound", "camera_enabled"]) {
      if (changes[key] !== undefined) changes[key] = bool(changes[key]);
    }
    for (const key of ["next_receipt_number", "max_discount_percent", "wholesale_min_qty", "low_stock_at", "exchange_rate_brl"]) {
      if (changes[key] !== undefined) changes[key] = number(changes[key]);
    }
    changes.receipt_prefix = changes.receipt_prefix === undefined ? current.receipt_prefix : text(changes.receipt_prefix, "X").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 8) || "X";
    await updateDoc(refSettings, changes);
  } else if (action === "create_sale") {
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) throw new Error("La venta no tiene productos.");
    const bankAccountId = String(body.bankAccountId || "").trim();
    const customerId = String(body.customerId || "").trim();

    let createdSaleData: any = null;
    await runTransaction(database, async (transaction: any) => {
      const settingsRef = userSettingsDoc(userId);
      const uniqueIds: string[] = Array.from(new Set<string>(items.map((item: any) => String(item.productId))));
      const productRefs = uniqueIds.map(id => userDoc("products", id, userId));
      const customerRef = customerId ? userDoc("customers", customerId, userId) : null;
      const bankAccountRef = bankAccountId ? userDoc("bankAccounts", bankAccountId, userId) : null;

      const [settingsSnapshot, bankAccountSnapshot, customerSnapshot, ...productSnapshots] = await Promise.all([
        transaction.get(settingsRef),
        bankAccountRef ? transaction.get(bankAccountRef) : null,
        customerRef ? transaction.get(customerRef) : null,
        ...productRefs.map(item => transaction.get(item)),
      ]);

      let bankAccountData: any = null;
      let bankAccountName = "Caja general";
      if (bankAccountSnapshot && bankAccountSnapshot.exists()) {
        bankAccountData = bankAccountSnapshot.data() as any;
        bankAccountName = bankAccountData.name || "Cuenta Bancaria";
      }

      let customerData: any = null;
      let customerName = "Consumidor final";
      if (customerSnapshot && customerSnapshot.exists()) {
        customerData = customerSnapshot.data() as any;
        customerName = customerData.name || "Cliente";
      }

      const settings = { ...defaultSettings, ...settingsSnapshot.data() };
      const products = new Map(productSnapshots.map(snapshot => [snapshot.id, { ...snapshot.data(), id: snapshot.id }]));
      let subtotal = 0;
      const checked: any[] = [];

      for (const item of items) {
        const product: any = products.get(String(item.productId));
        const variant = product?.variants?.find((entry: any) => String(entry.id) === String(item.variantId));
        const quantity = Math.max(1, Number(item.quantity) || 1);
        if (!product || !variant || (!settings.allow_negative_stock && Number(variant.stock) < quantity)) {
          throw new Error("Stock insuficiente para uno de los talles.");
        }
        const unitPrice = Number(item.unitPrice) || 0;
        subtotal += unitPrice * quantity;
        checked.push({ ...item, product, variant, quantity, unitPrice });
      }

      if (body.channel === "mayorista") {
        const minimum = Math.max(1, Number(settings.wholesale_min_qty && settings.wholesale_min_qty !== 6 ? settings.wholesale_min_qty : 12) || 12);
        const perProduct = new Map<string, number>();
        checked.forEach(item => perProduct.set(item.product.id, (perProduct.get(item.product.id) || 0) + item.quantity));
        const qualifies = settings.allow_mixed_sale ? checked.reduce((sum, item) => sum + item.quantity, 0) >= minimum : [...perProduct.values()].every(value => value >= minimum);
        if (!qualifies) throw new Error(`La venta mayorista requiere al menos ${minimum} pares${settings.allow_mixed_sale ? " en total" : " por modelo"}.`);
      }

      const discount = Math.max(0, Number(body.discount) || 0);
      const maxDiscountPercent = Number(settings.max_discount_percent) || 0;
      const maxDiscount = subtotal * (Math.min(100, maxDiscountPercent) / 100);
      if (maxDiscountPercent > 0 && discount > maxDiscount + 0.01) {
        throw new Error(`El descuento supera el máximo permitido de ${maxDiscountPercent}%.`);
      }

      const additionalCharge = Math.max(0, Number(body.additionalCharge || body.additional_charge || body.surcharge) || 0);
      const additionalChargeDescription = text(body.additionalChargeDescription || body.additional_charge_description || body.surchargeNote || "");
      const discountPercent = Number(body.discountPercent || body.discount_percent) || (subtotal > 0 ? (discount / subtotal) * 100 : 0);

      let total = Math.max(0, subtotal - discount + additionalCharge);
      const rounding = settings.rounding_mode === "100" ? 100 : settings.rounding_mode === "10" ? 10 : 0;
      if (rounding) total = Math.round(total / rounding) * rounding;

      const saleCurrency = body.currency === "BRL" ? "BRL" : "ARS";
      const exchangeRate = Math.max(0.01, Number(body.exchangeRate || settings.exchange_rate_brl || 250));
      const totalBrl = Math.round((total / exchangeRate) * 100) / 100;
      let paidAmountBrl = 0;
      let pendingAmountBrl = 0;
      let paidAmount = 0;
      let pendingAmount = 0;

      // Cálculo de pagos parciales y saldos pendientes
      if (saleCurrency === "BRL") {
        const rawPaidBrl = body.paidAmountBrl !== undefined ? Number(body.paidAmountBrl) : (body.paidAmount !== undefined ? Number(body.paidAmount) : totalBrl);
        paidAmountBrl = Math.max(0, isNaN(rawPaidBrl) ? totalBrl : rawPaidBrl);
        const paidEquivalentArs = Math.round(paidAmountBrl * exchangeRate);
        paidAmount = Math.min(total, paidEquivalentArs);
        pendingAmount = Math.max(0, total - paidAmount);
        pendingAmountBrl = Math.max(0, Math.round((totalBrl - paidAmountBrl) * 100) / 100);
      } else {
        const rawPaid = body.paidAmount !== undefined ? Number(body.paidAmount) : total;
        paidAmount = Math.max(0, Math.min(total, isNaN(rawPaid) ? total : rawPaid));
        pendingAmount = Math.max(0, total - paidAmount);
        paidAmountBrl = Math.round((paidAmount / exchangeRate) * 100) / 100;
        pendingAmountBrl = Math.round((pendingAmount / exchangeRate) * 100) / 100;
      }

      const saleStatus: "pagada" | "pago_parcial" | "con_deuda" =
        pendingAmount === 0 ? "pagada" : paidAmount > 0 ? "pago_parcial" : "con_deuda";

      const receiptNumber = Math.max(1, Number(settings.next_receipt_number) || 1);
      const receiptNo = `${settings.receipt_prefix || "X"}-${String(receiptNumber).padStart(8, "0")}`;
      const createdAt = now();

      for (const productRef of productRefs) {
        const product: any = products.get(productRef.id);
        const productItems = checked.filter(item => item.product.id === productRef.id);
        const variants = product.variants.map((variant: any) => {
          const sold = productItems.filter(item => String(item.variant.id) === String(variant.id)).reduce((sum, item) => sum + item.quantity, 0);
          return sold ? { ...variant, stock: Number(variant.stock) - sold } : variant;
        });
        transaction.update(productRef, { variants });
      }

      const saleRef = doc(userCol("sales", userId));

      const itemsDetailed = checked.map(item => ({
        product_id: item.product.id,
        variant_id: item.variant.id,
        name: item.product.name,
        brand: item.product.brand || "",
        sku: item.product.sku || "",
        size: item.variant.size,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.quantity * item.unitPrice,
      }));

      createdSaleData = {
        id: saleRef.id,
        receipt_no: receiptNo,
        customer_id: customerId,
        customer_name: customerName,
        customer_document: customerData?.document || "",
        customer_phone: customerData?.phone || "",
        customer_address: customerData?.address || "",
        customer_city: customerData?.city || "",
        customer_type: customerData?.type || (body.channel === "mayorista" ? "mayorista" : "minorista"),
        channel: body.channel === "mayorista" ? "mayorista" : "minorista",
        subtotal,
        discount,
        discount_percent: Math.round(discountPercent * 100) / 100,
        additional_charge: additionalCharge,
        additional_charge_description: additionalChargeDescription,
        currency: saleCurrency,
        exchange_rate: exchangeRate,
        total_brl: totalBrl,
        paid_amount_brl: paidAmountBrl,
        pending_amount_brl: pendingAmountBrl,
        debt_amount_brl: pendingAmountBrl,
        total_ars: total,
        paid_amount_ars: paidAmount,
        pending_amount_ars: pendingAmount,
        total: total,
        paid_amount: paidAmount,
        debt_amount: pendingAmount,
        pending_amount: pendingAmount,
        payment_method: text(body.paymentMethod, "Efectivo"),
        bank_account_id: bankAccountId,
        bank_account_name: bankAccountName,
        cashier_id: body.cashierId ? String(body.cashierId) : null,
        cashier_name: body.cashierName ? String(body.cashierName) : "Administrador",
        status: saleStatus,
        created_at: createdAt,
        items: itemsDetailed,
      };

      transaction.set(saleRef, createdSaleData);

      checked.forEach(item => transaction.set(doc(userCol("stockMovements", userId)), {
        product_id: item.product.id,
        variant_id: item.variant.id,
        product_name: item.product.name,
        size: item.variant.size,
        type: "venta",
        quantity: -item.quantity,
        note: receiptNo,
        created_at: createdAt,
      }));

      // El monto abonado ingresa a la cuenta bancaria seleccionada si fue provista
      const depositAmount = saleCurrency === "BRL" ? paidAmountBrl : paidAmount;
      if (depositAmount > 0) {
        if (bankAccountRef && bankAccountData) {
          const prevAccBal = number(bankAccountData.balance, 0);
          const nextAccBal = prevAccBal + depositAmount;
          transaction.update(bankAccountRef, {
            balance: nextAccBal,
            updated_at: createdAt,
          });

          transaction.set(doc(userCol("bankMovements", userId)), {
            account_id: bankAccountId,
            account_name: bankAccountName,
            type: "ingreso",
            category: "Venta",
            amount: depositAmount,
            currency: bankAccountData.currency || saleCurrency,
            exchange_rate: saleCurrency === "BRL" ? exchangeRate : 1,
            balance_before: prevAccBal,
            balance_after: nextAccBal,
            reference: receiptNo,
            description: `Venta comprobante ${receiptNo} (${saleStatus === "pago_parcial" ? "Cobro parcial" : "Cobro total"} - ${saleCurrency === "BRL" ? `R$ ${paidAmountBrl.toFixed(2)}` : `$${paidAmount}`} - ${body.paymentMethod || "Efectivo"})`,
            created_at: createdAt,
          });
        }

        // Siempre se registra el movimiento de caja para el arqueo / control
        transaction.set(doc(userCol("cashMovements", userId)), {
          type: "ingreso",
          category: "Venta",
          amount: paidAmount, // Consolidado en pesos ARS
          currency: saleCurrency,
          amount_currency: depositAmount,
          description: `Venta ${body.channel || "minorista"} (${saleCurrency === "BRL" ? `R$ ${paidAmountBrl.toFixed(2)} BRL (Equiv: $${paidAmount} ARS)` : `$${paidAmount} ARS`}) · ${bankAccountName}`,
          reference: receiptNo,
          created_at: createdAt,
        });
      }

      // El saldo pendiente (deuda) se acumula en la cuenta corriente del cliente (si hay cliente seleccionado)
      if (pendingAmount > 0) {
        if (!customerRef || !customerData) {
          throw new Error("Para ventas con saldo pendiente / deuda es obligatorio seleccionar un cliente registrado.");
        }
        const prevBal = number(customerData.balance, 0);
        const nextBal = prevBal + pendingAmount;
        transaction.update(customerRef, {
          balance: nextBal,
          updated_at: createdAt,
        });
        transaction.set(doc(userCol("customerMovements", userId)), {
          customer_id: customerId,
          customer_name: customerName,
          type: "cargo",
          amount: pendingAmount,
          balance_before: prevBal,
          balance_after: nextBal,
          payment_method: text(body.paymentMethod, "Cuenta corriente"),
          note: saleCurrency === "BRL"
            ? `Saldo pendiente venta ${receiptNo} (Total: R$ ${totalBrl.toFixed(2)}, Abonó: R$ ${paidAmountBrl.toFixed(2)}, Deuda: $${pendingAmount} ARS)`
            : (saleStatus === "pago_parcial"
              ? `Saldo pendiente venta ${receiptNo} (Total: $${total}, Abonó: $${paidAmount})`
              : `Deuda total venta ${receiptNo}`),
          receipt_no: receiptNo,
          sale_id: saleRef.id,
          created_at: createdAt,
        });
      }

      transaction.update(settingsRef, { next_receipt_number: receiptNumber + 1, updated_at: createdAt });
    });

    const store = await loadStore(userId);
    if (createdSaleData) {
      (store as any).createdSale = createdSaleData;
    }
    return store;
  } else if (action === "create_cashier") {
    const email = text(body.email).toLowerCase();
    const password = String(body.password || "");
    const name = text(body.name);
    if (!email || !password || !name) {
      throw new Error("Nombre, correo y contraseña son obligatorios.");
    }
    if (password.length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres.");
    }
    const storeSettings = (await getDoc(userSettingsDoc(userId))).data() || {};
    const storeName = storeSettings.business_name || "Mi Zapatería";
    await createCashierAccount({
      email,
      password,
      name,
      ownerUid: userId,
      storeName,
    });
  } else if (action === "toggle_cashier_status") {
    const cashierUid = String(body.cashierUid || "");
    const active = Boolean(body.active);
    if (!cashierUid) throw new Error("ID de cajera no especificado.");
    await toggleCashierStatus({ cashierUid, ownerUid: userId, active });
  } else if (action === "delete_cashier") {
    const cashierUid = String(body.cashierUid || "");
    if (!cashierUid) throw new Error("ID de cajera no especificado.");
    await deleteCashierAccount({ cashierUid, ownerUid: userId });
  } else if (action === "reset_database") {
    if (body.confirmation !== "ELIMINAR TODO") throw new Error("La frase de confirmación no coincide.");
    await resetOperationalData(userId);
  } else if (action === "import_backup") {
    if (body.confirmation !== "IMPORTAR COPIA") throw new Error("La restauración no fue confirmada.");
    await restoreBackup(body.backup, userId);
  } else if (action === "seed_demo_data") {
    await seedDemoData(userId);
  } else {
    throw new Error("Acción no reconocida.");
  }


  return loadStore(userId);
}

export async function uploadImageFile(file: File, folder = "products", uid?: string): Promise<string> {
  const userId = uid || auth?.currentUser?.uid || "general";
  
  // Comprimir y optimizar siempre antes de subir a Storage o guardar
  const { file: compressedFile, dataUrl } = await compressImageFile(file, {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.82,
    outputFormat: "image/webp",
  });

  if (storage && auth?.currentUser) {
    try {
      const cleanName = `${folder}/${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.webp`;
      const fileRef = ref(storage, cleanName);
      await uploadBytes(fileRef, compressedFile, { contentType: "image/webp" });
      return await getDownloadURL(fileRef);
    } catch (e) {
      console.warn("Firebase Storage no disponible o bloqueado por reglas, optimizando imagen en base64...", e);
    }
  }

  // Fallback liviano: dataUrl WebP ya comprimido
  return dataUrl;
}

export const uploadProductImage = (file: File, uid?: string) => uploadImageFile(file, "products", uid);

export async function loadPublicStore(storeUid: string) {
  const cleanUid = String(storeUid || "").trim();
  if (!cleanUid) throw new Error("Identificador de tienda no especificado.");
  const database = requireFirebase();
  const [settingsSnap, productsSnap] = await Promise.all([
    getDoc(doc(database, "users", cleanUid, "settings", "main")),
    getDocs(collection(database, "users", cleanUid, "products")),
  ]);

  const rawSettings = settingsSnap.exists() ? settingsSnap.data() : {};
  const settings = { ...defaultSettings, ...rawSettings };
  if (!rawSettings.wholesale_min_qty || Number(rawSettings.wholesale_min_qty) === 6) {
    settings.wholesale_min_qty = 12;
  }
  const products = withId(productsSnap)
    .filter((item: any) => item.active !== false)
    .map((item: any) => ({
      ...item,
      variants: Array.isArray(item.variants) ? item.variants : [],
      total_stock: (item.variants || []).reduce((sum: number, variant: any) => sum + Number(variant.stock || 0), 0),
    }))
    .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));

  return { settings, products, storeUid: cleanUid };
}

