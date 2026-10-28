/** Redondea a 2 decimales (centavos) de forma estable. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Convierte pesos a centavos enteros (para persistencia/auditoría sin float). */
export function toCents(n: number): number {
  return Math.round((n + Number.EPSILON) * 100)
}
