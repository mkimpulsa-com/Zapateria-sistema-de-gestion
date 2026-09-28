# Gestión de Zapatería — Firebase + Antigravity

Sistema de gestión para una zapatería de una sola sucursal, preparado para trabajar con Firebase.

## Incluye

- Panel principal y reportes.
- Punto de venta minorista y mayorista.
- Comprobantes internos tipo X con numeración automática.
- Productos, códigos de barras y stock por talle.
- Clientes, proveedores, caja, ingresos y egresos.
- Catálogos minoristas y mayoristas imprimibles.
- Configuración completa del negocio.
- Copias de seguridad JSON y exportaciones CSV.
- Firebase Authentication con correo y contraseña.
- Firestore como base de datos.
- Firebase Storage para el logo del negocio.
- Reglas de seguridad incluidas.
- Exportación estática compatible con Firebase Hosting.

## 1. Abrir en Antigravity

1. Descomprimí este archivo.
2. Abrí la carpeta completa como proyecto en Antigravity.
3. Pedile a Antigravity: **“Instalá las dependencias y configurá este proyecto con mis credenciales de Firebase sin cambiar la interfaz.”**
4. Ejecutá `npm install`.

## 2. Preparar Firebase

En Firebase Console creá o seleccioná un proyecto y activá:

1. **Authentication → Sign-in method → Email/Password**.
2. **Firestore Database** en modo producción.
3. **Storage**.
4. **Project settings → Your apps → Web app**.

Copiá los datos de configuración de la aplicación Web.

## 3. Variables de entorno

Copiá `.env.example` como `.env.local` y completá:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_ALLOW_SIGNUP=true
```

Estas variables identifican la aplicación Web de Firebase. La seguridad real se controla con Authentication y las reglas incluidas.

## 4. Probar localmente

```bash
npm run dev
```

Abrí `http://localhost:3000`. La primera vez elegí **Crear cuenta inicial**. Al entrar, el sistema crea automáticamente la configuración y los datos demostrativos iniciales. Después de crear el administrador, cambiá `NEXT_PUBLIC_ALLOW_SIGNUP=false` y volvé a desplegar para ocultar el registro público.

## 5. Publicar reglas y Hosting

Instalá Firebase CLI si todavía no está disponible:

```bash
npm install -g firebase-tools
firebase login
```

Copiá `.firebaserc.example` como `.firebaserc` y reemplazá `REEMPLAZAR_CON_PROJECT_ID`.

Publicá reglas:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Generá la aplicación y publicala:

```bash
npm run build
firebase deploy --only hosting
```

## Estructura de Firestore

| Colección | Contenido |
|---|---|
| `settings/main` | Datos del negocio y reglas operativas |
| `products` | Productos y variantes de talle embebidas |
| `customers` | Clientes minoristas y mayoristas |
| `suppliers` | Proveedores |
| `sales` | Ventas y artículos vendidos |
| `cashMovements` | Ingresos y egresos |
| `stockMovements` | Historial de movimientos de stock |

## Seguridad

- Firestore requiere un usuario autenticado para leer o modificar datos.
- Storage acepta únicamente imágenes autenticadas de hasta 5 MB dentro de la carpeta del usuario.
- Antes de usar el sistema con datos reales, creá la cuenta administradora y luego podés desactivar temporalmente el registro público desde el código o desde tu flujo administrativo.
- Descargá un respaldo desde **Configuración → Datos** antes de importar o eliminar información.

## Nota sobre el sistema anterior

Esta edición no utiliza Cloudflare D1 ni APIs del entorno anterior. Todo el estado operativo se administra directamente con Firebase para facilitar su edición y despliegue desde Antigravity.

El importador también reconoce el respaldo JSON descargado desde la versión anterior. Podés usar **Configuración → Datos → Restaurar una copia** para migrar productos, clientes, proveedores, ventas, caja y stock a Firebase.
