import React from 'react';
import { ArrowRight, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react';

const ActivationScreen = ({
  diasRestantes = 0,
  motivo = 'expired',
  onRetry,
  loading,
  onActivate,
  activationMessage,
  activationReason,
  licenciaInput,
  setLicenciaInput,
  activating,
  mode = 'blocked',
  onClose,
}) => {
  const isRenewal = mode === 'renewal';
  const descripcion = isRenewal
    ? 'Ingresá la nueva clave de renovación para extender el tiempo de uso antes del vencimiento.'
    : motivo === 'clock-rollback-detected'
      ? 'La fecha del sistema no coincide con la verificación de la licencia. Ajustá la hora del equipo y probá nuevamente.'
      : 'Tu suscripción no está activa en este equipo. Ingresá una nueva clave de producto para regularizar el acceso.';

  const resolvedActivationMessage = activationReason === 'hardware-mismatch'
    ? 'Esta clave ya ha sido registrada en otro equipo. Por favor, contacta a soporte para adquirir una nueva licencia.'
    : activationMessage;

  const isSuccess = resolvedActivationMessage?.toLowerCase().includes('correctamente');
  const isError = resolvedActivationMessage && !isSuccess;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.25),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(167,139,250,0.25),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] p-4 sm:p-6 lg:p-8">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05),transparent_40%,rgba(255,255,255,0.03))]" />
      <div className="absolute left-[-8rem] top-[-6rem] h-56 w-56 rounded-full bg-cyan-400/20 blur-[120px]" />
      <div className="absolute bottom-[-6rem] right-[-4rem] h-60 w-60 rounded-full bg-violet-500/20 blur-[140px]" />

      <div className="relative mx-auto flex min-h-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-xl rounded-[32px] border border-white/20 bg-white/10 p-6 shadow-[0_30px_120px_rgba(2,6,23,0.65)] backdrop-blur-2xl sm:p-8 lg:p-10">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-200">
              <Sparkles size={14} className="text-cyan-300" />
              Licencia SaaS
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                {diasRestantes > 0 ? `${diasRestantes} días` : 'Bloqueado'}
              </div>
              {isRenewal && typeof onClose === 'function' ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-white/20 bg-white/10 p-2 text-slate-200 transition hover:bg-white/20"
                  aria-label="Cerrar"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-300">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">Regularización de acceso</p>
              <p className="text-sm text-slate-400">Tu instalación necesita una licencia válida para continuar.</p>
            </div>
          </div>

          <h1 className="mt-8 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {isRenewal ? 'Renovar licencia' : 'Activar nueva clave'}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-[15px]">
            {descripcion}
          </p>

          <form onSubmit={onActivate} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Clave de producto</span>
              <input
                value={licenciaInput}
                onChange={(event) => setLicenciaInput(event.target.value)}
                placeholder="ej. PROD-AB12-CD34"
                autoComplete="off"
                className="w-full rounded-2xl border border-white/15 bg-slate-950/70 px-4 py-3.5 text-sm text-white outline-none ring-0 transition focus:border-cyan-400/60 focus:bg-slate-900/80"
              />
            </label>

            {resolvedActivationMessage ? (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${
                isSuccess
                  ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                  : isError
                    ? 'border-rose-400/30 bg-rose-400/10 text-rose-200'
                    : 'border-white/10 bg-white/10 text-slate-200'
              }`}>
                {resolvedActivationMessage}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={activating || !licenciaInput.trim()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {activating ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Activando...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    {isRenewal ? 'Validar y renovar' : 'Activar licencia'}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onRetry}
                disabled={loading}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 font-semibold text-slate-100 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <ArrowRight size={16} />
                    Verificar ahora
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ActivationScreen;
