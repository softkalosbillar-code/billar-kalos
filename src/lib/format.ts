const mxn = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

const mxnNoSymbol = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function money(n: number): string {
  return mxn.format(n)
}

export function moneyNoSymbol(n: number): string {
  return mxnNoSymbol.format(n)
}

/** Duración en formato de cronómetro HH:MM:SS (segundos enteros). */
export function duration(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(ss)}`
}

/** Hora de reloj HH:MM a partir de ms. */
export function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function shortDateTime(ms: number): string {
  return new Date(ms).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function shortDate(ms: number): string {
  return new Date(ms).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
  })
}
