// ─── Utilidades de Sonido (Web Audio API) ───
// No requiere archivos de audio externos.

let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
};

/**
 * Reproduce un tono con los parámetros dados.
 */
const playTone = (frequency, duration, type = "sine", volume = 0.3) => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    // Silenciar errores de audio (ej: política de autoplay)
  }
};

/**
 * Beep corto al escanear código de barras.
 */
export const beepScan = () => {
  if (!isSoundEnabled()) return;
  playTone(1200, 0.1, "square", 0.15);
};

/**
 * Sonido agradable de éxito (venta completada, guardado, etc.).
 */
export const successSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Dos tonos ascendentes rápidos
  [523.25, 659.25, 783.99].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + i * 0.1);
    gain.gain.setValueAtTime(0.2, now + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.15);
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.15);
  });
};

/**
 * Sonido de error.
 */
export const errorSound = () => {
  if (!isSoundEnabled()) return;
  playTone(200, 0.3, "sawtooth", 0.15);
  setTimeout(() => playTone(150, 0.3, "sawtooth", 0.1), 150);
};

/**
 * Sonido de notificación suave (para alertas, mensajes, etc.).
 */
export const notifSound = () => {
  if (!isSoundEnabled()) return;
  playTone(880, 0.15, "sine", 0.12);
};

/**
 * Comprueba si los sonidos están habilitados.
 */
export const isSoundEnabled = () => {
  return localStorage.getItem("sacware_sonidos") !== "off";
};

/**
 * Alterna el estado de sonidos.
 */
export const toggleSound = () => {
  const current = isSoundEnabled();
  localStorage.setItem("sacware_sonidos", current ? "off" : "on");
  return !current;
};
