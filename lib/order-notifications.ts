// Utilidad para avisos sonoros (Web Audio API) y Notificaciones Push del Navegador
// para el módulo de Pedidos Web del sistema.

const SOUND_PREF_KEY = "cr_order_sound_enabled";
const NOTIF_PREF_KEY = "cr_order_notif_enabled";

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!sharedAudioContext || sharedAudioContext.state === "closed") {
    sharedAudioContext = new AudioContextClass();
  }
  if (sharedAudioContext.state === "suspended") {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

/**
 * Reproduce un sonido de campanita / chime limpio y profesional usando síntesis Web Audio.
 * No requiere descargar archivos externos de audio, funciona instantáneamente.
 */
export function playOrderAlertSound(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Función auxiliar para un tono suave con envolvente
    const playTone = (freq: number, startDelay: number, duration: number, peakVol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + startDelay);

      // Envolvente de volumen (ataque rápido y caída suave tipo campana)
      gain.gain.setValueAtTime(0.0001, now + startDelay);
      gain.gain.exponentialRampToValueAtTime(peakVol, now + startDelay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + startDelay + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + startDelay);
      osc.stop(now + startDelay + duration);
    };

    // Melodía elegante de 3 campanadas: D5 (587Hz) -> F#5 (739Hz) -> A5 (880Hz) + armónico D6 (1174Hz)
    playTone(587.33, 0.00, 0.45, 0.28);
    playTone(739.99, 0.12, 0.50, 0.32);
    playTone(880.00, 0.24, 0.85, 0.35);
    playTone(1174.66, 0.28, 0.95, 0.25);

    return true;
  } catch (err) {
    console.warn("No se pudo emitir sonido de alerta:", err);
    return false;
  }
}

/**
 * Consulta o solicita permisos para notificaciones del navegador
 */
export async function requestOrderNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  try {
    if (Notification.permission === "granted") {
      return "granted";
    }
    return await Notification.requestPermission();
  } catch (e) {
    console.warn("Error al solicitar permisos de notificación:", e);
    return "denied";
  }
}

/**
 * Obtiene el estado actual del permiso de notificaciones
 */
export function getNotificationPermissionStatus(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

/**
 * Emite una notificación emergente del sistema operativo / navegador
 */
export function showOrderBrowserNotification(
  order: {
    orderNumber?: string;
    customerName?: string;
    totalAmount?: number;
    totalUnits?: number;
    currency?: string;
  },
  onClick?: () => void
): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  try {
    const formattedAmount = order.totalAmount !== undefined
      ? `${order.currency === "ARS" ? "$" : order.currency === "USD" ? "US$" : "R$"} ${order.totalAmount.toLocaleString("es-AR")}`
      : "";

    const title = `🔔 ¡Nuevo Pedido Web Recibido!`;
    const body = `${order.customerName || "Cliente"} envió el pedido ${order.orderNumber || ""}\nTotal: ${formattedAmount} • ${order.totalUnits || 1} unidades`;

    const notif = new Notification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: `order-${order.orderNumber || Date.now()}`,
      requireInteraction: false,
    });

    notif.onclick = () => {
      window.focus();
      if (onClick) onClick();
      notif.close();
    };

    return true;
  } catch (err) {
    console.warn("Error al mostrar notificación web:", err);
    return false;
  }
}

/**
 * Preferencias en LocalStorage
 */
export function isSoundAlertEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const val = localStorage.getItem(SOUND_PREF_KEY);
  return val === null ? true : val === "true";
}

export function setSoundAlertEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_PREF_KEY, enabled ? "true" : "false");
}
