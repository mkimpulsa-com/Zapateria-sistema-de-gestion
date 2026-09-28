"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  LogIn,
  MailCheck,
  ShoppingBag,
  UserPlus,
} from "lucide-react";
import StoreApp from "@/app/store-app";
import TiendaPage from "@/app/tienda/page";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FirebaseShell() {
  const allowSignup = process.env.NEXT_PUBLIC_ALLOW_SIGNUP === "true";
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "cajera">("admin");
  const [storeId, setStoreId] = useState<string>("");
  const [staffProfile, setStaffProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [isPublicStore, setIsPublicStore] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.has("store") || sp.has("tienda") || sp.has("catalogo")) {
        setIsPublicStore(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, async (current: User | null) => {
      if (!current) {
        setUser(null);
        setUserRole("admin");
        setStoreId("");
        setStaffProfile(null);
        setLoading(false);
        return;
      }
      try {
        if (db) {
          const staffSnap = await getDoc(doc(db, "staff_users", current.uid));
          if (staffSnap.exists()) {
            const staffData = staffSnap.data();
            if (staffData.active === false) {
              await signOut(auth!);
              setUser(null);
              setError("Esta cuenta de cajera ha sido desactivada por el administrador.");
              setLoading(false);
              return;
            }
            setUserRole((staffData.role as "admin" | "cajera") || "cajera");
            setStoreId(staffData.storeId);
            setStaffProfile(staffData);
          } else {
            setUserRole("admin");
            setStoreId(current.uid);
            setStaffProfile(null);
          }
        } else {
          setUserRole("admin");
          setStoreId(current.uid);
        }
        setUser(current);
      } catch (err: any) {
        console.error("Error al verificar perfil de cajera:", err);
        setUserRole("admin");
        setStoreId(current.uid);
        setUser(current);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth) return;
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setBusy(true);
    setError("");
    try {
      if (mode === "register") {
        if (!allowSignup) throw new Error("El registro está desactivado.");
        const cred = await createUserWithEmailAndPassword(auth, String(values.email), String(values.password));
        const businessName = String(values.businessName || "").trim();
        if (businessName && cred.user) {
          try {
            await updateProfile(cred.user, { displayName: businessName });
          } catch {}
        }
      } else {
        await signInWithEmailAndPassword(auth, String(values.email), String(values.password));
      }
    } catch (e: any) {
      const code = String(e?.code || "");
      setError(
        code.includes("invalid-credential")
          ? "Correo o contraseña incorrectos."
          : code.includes("email-already")
          ? "Ese correo ya está registrado."
          : code.includes("weak-password")
          ? "La contraseña debe tener al menos 6 caracteres."
          : "No se pudo completar el acceso. Revisá la configuración de Firebase."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth) return;
    const targetEmail = email.trim();
    if (!targetEmail) {
      setError("Por favor, ingresá tu correo electrónico.");
      return;
    }
    setBusy(true);
    setError("");
    setResetSuccess(false);
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setResetSuccess(true);
    } catch (e: any) {
      const code = String(e?.code || "");
      setError(
        code.includes("user-not-found")
          ? "No se encontró ninguna cuenta registrada con este correo."
          : code.includes("invalid-email")
          ? "El formato del correo electrónico es inválido."
          : code.includes("too-many-requests")
          ? "Demasiados intentos. Por favor, esperá unos minutos antes de volver a intentar."
          : "No se pudo enviar el correo de recuperación. Verificá la dirección ingresada."
      );
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!auth) return;
    setBusy(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      const code = String(e?.code || "");
      if (code.includes("popup-closed-by-user") || code.includes("cancelled-popup-request")) {
        return;
      }
      setError(
        code.includes("operation-not-allowed")
          ? "El proveedor Google aún no está activado en tu Firebase Console (Authentication > Sign-in method > Google)."
          : code.includes("unauthorized-domain")
          ? "Este dominio no está en la lista de dominios autorizados en Firebase Authentication."
          : "No se pudo completar la autenticación con Google. Verificá la configuración en Firebase."
      );
    } finally {
      setBusy(false);
    }
  };

  if (!isFirebaseConfigured) return <SetupRequired />;
  if (isPublicStore) return <TiendaPage />;
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 size-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">Conectando con Firebase…</p>
        </div>
      </div>
    );
  if (!user)
    return (
      <div className="grid min-h-screen place-items-center bg-background p-5">
        <Card className="w-full max-w-md border-0 shadow-2xl">
          <CardHeader className="text-center">
            <span className="brand-orb mx-auto grid size-16 place-items-center rounded-3xl text-white">
              {mode === "forgot" ? <KeyRound className="size-8" /> : <ShoppingBag className="size-8" />}
            </span>
            <CardTitle className="mt-3 text-2xl">
              {mode === "login"
                ? "Gestión de Zapatería"
                : mode === "register"
                ? "Registrar mi Zapatería"
                : "Recuperar Contraseña"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {mode === "login"
                ? "Acceso privado al sistema de tu sucursal"
                : mode === "register"
                ? "Cada cuenta cuenta con su propio catálogo, stock y caja privada"
                : "Ingresá tu correo para recibir un enlace seguro de restablecimiento"}
            </p>
          </CardHeader>
          <CardContent>
            {mode === "forgot" ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="grid gap-1.5">
                  <label htmlFor="reset-email" className="text-sm font-semibold">
                    Correo electrónico registrado
                  </label>
                  <Input
                    id="reset-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="tu@zapateria.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {error && (
                  <p className="rounded-xl bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 leading-relaxed">
                    {error}
                  </p>
                )}

                {resetSuccess && (
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-sm text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 leading-relaxed flex items-start gap-2.5">
                    <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">¡Correo de recuperación enviado!</p>
                      <p className="text-xs mt-1 text-emerald-700/90 dark:text-emerald-400/90">
                        Te enviamos un enlace de recuperación a <strong>{email}</strong>. Revisá tu bandeja de entrada y spam para restablecer tu clave.
                      </p>
                    </div>
                  </div>
                )}

                <Button className="h-11 w-full rounded-xl" disabled={busy || resetSuccess}>
                  <MailCheck className="size-4 mr-2" />
                  {busy ? "Enviando enlace…" : "Enviar enlace de recuperación"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-sm font-medium text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
                  onClick={() => {
                    setError("");
                    setResetSuccess(false);
                    setMode("login");
                  }}
                >
                  <ArrowLeft className="size-4" />
                  Volver a iniciar sesión
                </Button>
              </form>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-xl flex items-center justify-center gap-2.5 font-medium border-border/80 hover:bg-muted/50 transition-all shadow-sm"
                  onClick={signInWithGoogle}
                  disabled={busy}
                >
                  <svg className="size-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>{mode === "login" ? "Ingresar con Google" : "Crear cuenta con Google"}</span>
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/60" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">o con correo</span>
                  </div>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  {mode === "register" && (
                    <div className="grid gap-1.5">
                      <label htmlFor="auth-business-name" className="text-sm font-semibold">
                        Nombre de tu zapatería / negocio
                      </label>
                      <Input
                        id="auth-business-name"
                        name="businessName"
                        placeholder="Ej: Zapatería Central"
                      />
                    </div>
                  )}
                  <div className="grid gap-1.5">
                    <label htmlFor="auth-email" className="text-sm font-semibold">
                      Correo electrónico
                    </label>
                    <Input
                      id="auth-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="tu@zapateria.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="auth-password" className="text-sm font-semibold">
                        Contraseña
                      </label>
                      {mode === "login" && (
                        <button
                          type="button"
                          onClick={() => {
                            setError("");
                            setResetSuccess(false);
                            setMode("forgot");
                          }}
                          className="text-xs font-semibold text-primary hover:underline transition-all"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="auth-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        className="pr-10"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                        title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  {error && <p className="rounded-xl bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 leading-relaxed">{error}</p>}
                  <Button className="h-11 w-full rounded-xl" disabled={busy}>
                    {mode === "login" ? <LogIn /> : <UserPlus />}
                    {busy ? "Procesando…" : mode === "login" ? "Ingresar a mi negocio" : "Crear mi zapatería"}
                  </Button>
                </form>
                {allowSignup && (
                  <button
                    className="mt-4 w-full text-center text-sm font-semibold text-primary hover:underline"
                    onClick={() => {
                      setError("");
                      setMode(mode === "login" ? "register" : "login");
                    }}
                  >
                    {mode === "login" ? "¿No tenés cuenta? Registrá tu zapatería aquí" : "¿Ya tenés cuenta? Ingresá acá"}
                  </button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  return (
    <>
      <StoreApp
        user={user}
        role={userRole}
        storeId={storeId}
        staffProfile={staffProfile}
      />
      <Button
        variant="outline"
        className="no-print fixed bottom-4 right-4 z-[90] rounded-full shadow-xl"
        onClick={() => auth && signOut(auth)}
      >
        <LockKeyhole />
        Cerrar sesión
      </Button>
    </>
  );
}

function SetupRequired(){return <div className="grid min-h-screen place-items-center bg-background p-5"><Card className="max-w-xl border-0 shadow-xl"><CardHeader><CardTitle>Falta conectar Firebase</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>Copiá <strong>.env.example</strong> como <strong>.env.local</strong> y completá las credenciales Web de tu proyecto Firebase.</p><p>Después activá Authentication con correo y contraseña, Firestore y Storage. La guía <strong>README-ANTIGRAVITY.md</strong> contiene todos los pasos.</p></CardContent></Card></div>}
