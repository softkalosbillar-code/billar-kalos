import type { Rental, RoundingMode } from './types'

/**
 * Tiempo facturable en segundos (enteros).
 * Elapsed = (fin − inicio) − Σ(resume − pause) − pausa activa (si la hay).
 * Todas las marcas están en milisegundos (época).
 */
export function facturableElapsedSec(rental: Rental, now: number): number {
  let pausedMs = 0
  for (const p of rental.pauses) {
    const resumed = p.resumedAt ?? now
    pausedMs += Math.max(0, resumed - p.pausedAt)
  }
  const end = rental.endedAt ?? now
  const elapsedMs = end - rental.startedAt - pausedMs
  return Math.max(0, Math.floor(elapsedMs / 1000))
}

/**
 * Horas facturables. Orden canónico: PRIMERO mínimo, DESPUÉS redondeo (siempre hacia arriba).
 */
export function billableHours(
  elapsedSec: number,
  mode: RoundingMode,
  minimumMinutes: number,
): number {
  const minSec = minimumMinutes * 60
  const effective = Math.max(elapsedSec, minSec)
  switch (mode) {
    case 'exacto':
      return effective / 3600
    case 'minuto':
      return Math.ceil(effective / 60) / 60
    case 'cuarto_hora':
      return (Math.ceil(effective / 900) * 15) / 60
    case 'hora':
      return Math.ceil(effective / 3600)
    default:
      return effective / 3600
  }
}

export const ROUNDING_LABELS: Record<RoundingMode, string> = {
  exacto: 'Exacto (por segundo)',
  minuto: 'Redondear al minuto',
  cuarto_hora: 'Cuarto de hora',
  hora: 'Hora completa',
}
