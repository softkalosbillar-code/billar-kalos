import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Video,
  Play,
  Tv,
  Sparkles,
  Trophy,
  Flame,
  Camera,
  Layers,
  Sliders,
  CheckCircle2,
  Clock,
  Radio,
  Eye,
  ArrowRight,
  Maximize2,
  RotateCcw,
} from 'lucide-react'
import { useApp } from '../state/AppContext'

export function ReplayEnVivo() {
  const { tables, notify } = useApp()
  const navigate = useNavigate()
  const [selectedTable, setSelectedTable] = useState<string>(tables[0]?.name || 'Mesa 1')
  const [interestRegistered, setInterestRegistered] = useState(false)
  const [previewPlaying, setPreviewPlaying] = useState(true)

  function handleNotifyMe() {
    setInterestRegistered(true)
    notify('¡Anotado! Recibirás acceso prioritario a la función de Replay en Vivo', 'success')
  }

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-ink-1 flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <Video size={24} />
              </span>
              Replay en vivo
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold font-mono">
              <Radio size={12} className="animate-pulse text-amber-400" />
              Módulo de Torneos
            </span>
          </div>
          <p className="text-sm text-ink-3 mt-1.5 max-w-2xl">
            Transmisión de cámaras de salón, repetición instantánea de jugadas magistrales y marcadores profesionales para competencias oficiales.
          </p>
        </div>

        <button
          onClick={() => navigate('/mesas-activas')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-2 border border-white/10 hover:border-brand/40 text-ink-2 hover:text-ink-1 text-xs font-bold transition shadow-sm self-start sm:self-auto"
        >
          <Flame size={15} className="text-brand" />
          <span>Ver Mesas en Vivo</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Banner Principal de Anuncio Oficial con Temática de Billar */}
      <div className="billiard-card-frame billiard-felt p-2 shadow-card">
        <div className="billiard-pocket billiard-pocket-tl" />
        <div className="billiard-pocket billiard-pocket-tr" />
        <div className="billiard-pocket billiard-pocket-bl" />
        <div className="billiard-pocket billiard-pocket-br" />

        <div className="billiard-felt-inner p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                <Sparkles size={14} className="text-emerald-400 animate-spin" />
                <span>Próximo Lanzamiento Oficial</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-black text-ink-1 leading-snug">
                Próximamente se integrará el Replay en tiempo real y todas las implementaciones de puntajes de mesas profesionales.
              </h2>
              <p className="text-xs sm:text-sm text-emerald-200/80 leading-relaxed">
                Estamos preparando la infraestructura de video streaming de baja latencia y el sistema de cronometraje oficial para torneos de Pool Bola 8, Bola 9, Snooker y Carambola a 3 Bandas.
              </p>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-2.5">
              {interestRegistered ? (
                <div className="px-5 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>Notificación Activada para Admin</span>
                </div>
              ) : (
                <button
                  onClick={handleNotifyMe}
                  className="px-5 py-3 rounded-xl bg-brand text-brand-on font-bold text-xs hover:bg-brand-hover active:scale-95 transition shadow-card flex items-center justify-center gap-2"
                >
                  <Trophy size={16} />
                  <span>Activar Notificación de Lanzamiento</span>
                </button>
              )}
              <span className="text-[11px] text-emerald-200/60 text-center font-mono">
                Actualización incluida para Kalos Billar
              </span>
            </div>
          </div>

          {/* Simulador Interactivo de Cabina de Transmisión */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Camera size={16} className="text-emerald-400" />
                <span className="text-xs font-bold text-ink-1 uppercase tracking-wider">
                  Vista Previa del Monitor de Transmisión
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                {tables.slice(0, 4).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTable(t.name)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition border ${
                      selectedTable === t.name
                        ? 'bg-brand text-brand-on border-brand'
                        : 'bg-black/40 border-white/10 text-emerald-200/70 hover:text-ink-1'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Pantalla Simulada de Cámara de Mesa */}
            <div className="relative aspect-video max-h-[380px] w-full rounded-2xl overflow-hidden border border-emerald-500/30 bg-black shadow-2xl flex flex-col justify-between p-4 sm:p-5">
              {/* Fondo gráfico simulando vista cenital de mesa de billar */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#0a2315] via-[#04160d] to-black opacity-90" />
              
              {/* Líneas de mesa cenital y troneras en mockup */}
              <div className="absolute inset-8 rounded-xl border-2 border-emerald-500/20 pointer-events-none">
                <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-emerald-500/15" />
                <div className="absolute top-0 bottom-0 left-1/2 border-l border-dashed border-emerald-500/15" />
                
                {/* Bola blanca con mira de tiro */}
                <div className="absolute top-[45%] left-[30%] w-5 h-5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] border border-neutral-300 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                </div>
                {/* Bola 8 negra */}
                <div className="absolute top-[52%] left-[62%] w-5 h-5 rounded-full bg-neutral-900 border border-white/40 shadow-md flex items-center justify-center">
                  <span className="text-[7px] font-mono font-bold text-white">8</span>
                </div>
                {/* Bola 1 amarilla */}
                <div className="absolute top-[38%] left-[68%] w-5 h-5 rounded-full bg-amber-400 border border-white/40 shadow-md" />
                {/* Bola 9 rayada */}
                <div className="absolute top-[60%] left-[58%] w-5 h-5 rounded-full bg-amber-200 border border-white/40 shadow-md" />
              </div>

              {/* Overlays Superiores de Transmisión */}
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-600 text-white font-mono text-[10px] font-black uppercase tracking-wider animate-pulse shadow-md">
                    <span className="w-2 h-2 rounded-full bg-white" />
                    REC · REPLAY FEED
                  </span>
                  <span className="px-2 py-1 rounded-md bg-black/60 backdrop-blur border border-white/10 text-emerald-300 font-mono text-[11px] font-bold">
                    CÁM 01 · {selectedTable.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-200/90">
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-black/60 border border-white/10">
                    1080p 60FPS
                  </span>
                  <span className="px-2 py-0.5 rounded bg-black/60 border border-white/10 text-amber-300">
                    00:14:28:12
                  </span>
                </div>
              </div>

              {/* Overlay Central de Marcador Profesional en Replay */}
              <div className="relative z-10 mx-auto max-w-md w-full p-2.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 shadow-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-xs grid place-items-center">
                    J1
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-ink-1 truncate">M. González</div>
                    <div className="text-[10px] text-emerald-300/80 font-mono">Bolas Lisas (1-7)</div>
                  </div>
                </div>

                {/* Score central */}
                <div className="flex items-center gap-3 px-3 py-1 rounded-lg bg-white/5 border border-white/10 font-mono">
                  <span className="text-base font-black text-brand">5</span>
                  <span className="text-xs text-ink-3 font-semibold">-</span>
                  <span className="text-base font-black text-brand">3</span>
                </div>

                <div className="flex items-center gap-2 min-w-0 text-right">
                  <div className="truncate">
                    <div className="text-xs font-bold text-ink-1 truncate">R. Morales</div>
                    <div className="text-[10px] text-amber-300/80 font-mono">Rayadas (9-15)</div>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-amber-600/30 border border-amber-500/40 text-amber-300 font-bold text-xs grid place-items-center">
                    J2
                  </div>
                </div>
              </div>

              {/* Barra de Control Inferior */}
              <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewPlaying((v) => !v)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                    title={previewPlaying ? 'Pausar simulador' : 'Reproducir'}
                  >
                    {previewPlaying ? <RotateCcw size={14} /> : <Play size={14} />}
                  </button>
                  <span className="text-[11px] font-mono text-emerald-300/80">
                    Cámara Lenta 0.5x · Detección de Trayectoria por IA
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-ink-3 text-[11px]">
                  <Maximize2 size={13} />
                  <span className="font-mono">PANTALLA COMPLETA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Características del Sistema de Replay & Puntajes Profesionales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Característica 1 */}
        <div className="p-5 rounded-2xl bg-surface-2 border border-white/10 shadow-card space-y-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
            <Video size={20} />
          </div>
          <h3 className="text-sm font-bold text-ink-1">
            Replay Instantáneo de Jugadas
          </h3>
          <p className="text-xs text-ink-3 leading-relaxed">
            Grabación continua en búfer para rebobinar los últimos 30 segundos de cualquier carambola magistral, tiro de fantasía o jugada polémica para arbitraje de torneo.
          </p>
          <ul className="text-[11px] text-ink-2 space-y-1.5 pt-1">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-400" />
              <span>Cámara lenta (0.25x, 0.5x)</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-400" />
              <span>Multi-ángulo cenital y diagonal</span>
            </li>
          </ul>
        </div>

        {/* Característica 2 */}
        <div className="p-5 rounded-2xl bg-surface-2 border border-white/10 shadow-card space-y-3">
          <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center font-bold">
            <Trophy size={20} />
          </div>
          <h3 className="text-sm font-bold text-ink-1">
            Puntajes & Marcadores de Torneo
          </h3>
          <p className="text-xs text-ink-3 leading-relaxed">
            Tableros digitales sincronizados para modalidades reglamentarias: Pool Bola 8, Bola 9, Carambola Libre, 3 Bandas y Snooker con conteo oficial de entradas.
          </p>
          <ul className="text-[11px] text-ink-2 space-y-1.5 pt-1">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-400" />
              <span>Reloj de tiro (Shot Clock 30s)</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-400" />
              <span>Control de faltas y bolas en mano</span>
            </li>
          </ul>
        </div>

        {/* Característica 3 */}
        <div className="p-5 rounded-2xl bg-surface-2 border border-white/10 shadow-card space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Tv size={20} />
          </div>
          <h3 className="text-sm font-bold text-ink-1">
            Transmisión a Pantallas del Club
          </h3>
          <p className="text-xs text-ink-3 leading-relaxed">
            Envía la transmisión y el marcador en vivo directamente a las televisiones de la sala y al portal móvil de los clientes del club en tiempo real.
          </p>
          <ul className="text-[11px] text-ink-2 space-y-1.5 pt-1">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-400" />
              <span>Salida HDMI / Smart TV compatible</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-400" />
              <span>Integración con Portal de Jugador</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
