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
 * Con envolvente armónica de 2 segundos de duración y opción de retardo.
 */
export function playOrderAlertSound(delaySeconds: number = 0): boolean {
  if (typeof window === "undefined") return false;
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const startBase = ctx.currentTime + Math.max(0, delaySeconds);

    // Función auxiliar para un tono suave con envolvente acampanada
    const playTone = (freq: number, startOffset: number, duration: number, peakVol: number, type: OscillatorType = "sine") => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startBase + startOffset);

      // Ataque suave y decaimiento exponencial natural de campana
      gain.gain.setValueAtTime(0.0001, startBase + startOffset);
      gain.gain.exponentialRampToValueAtTime(peakVol, startBase + startOffset + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, startBase + startOffset + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startBase + startOffset);
      osc.stop(startBase + startOffset + duration);
    };

    // Secuencia tipo campana de hotel / recepción de alta gama que se extiende por 2.2 segundos:
    // Fase 1 (Campanada inicial): C5 (523Hz) + armónico C6 (1046Hz)
    playTone(523.25, 0.00, 0.90, 0.22);
    playTone(1046.50, 0.00, 0.70, 0.10);

    // Fase 2 (Campanada media): E5 (659Hz) + armónico E6 (1318Hz)
    playTone(659.25, 0.35, 1.10, 0.26);
    playTone(1318.50, 0.35, 0.85, 0.12);

    // Fase 3 (Campanada final y resonancia rica y brillante): G5 (784Hz) + D6 (1174Hz) con decay prolongado hasta 2.2s
    playTone(783.99, 0.75, 1.45, 0.30);
    playTone(1174.66, 0.80, 1.40, 0.22);
    playTone(1567.98, 0.85, 1.25, 0.14);

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
