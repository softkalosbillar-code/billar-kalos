import { round2 } from './money'
import { billableHours, facturableElapsedSec } from './time'
import type { Rental, Tab, TabTotals } from './types'

export interface RentalCharge {
  elapsedSec: number
  hours: number
  charge: number
}

export function computeRentalCharge(rental: Rental, now: number): RentalCharge {
  const elapsedSec = facturableElapsedSec(rental, now)
  const hours = billableHours(elapsedSec, rental.rounding, rental.minimumMinutes)
  const charge = round2(hours * rental.ratePerHour)
  return { elapsedSec, hours, charge }
}

/**
 * Totaliza una cuenta: renta + productos + IVA por línea − descuento + propina.
 * Para una cuenta cerrada `rental.endedAt` ya está fijado, por lo que el total
 * es determinista al recalcularlo.
 */
export function computeTotals(tab: Tab, now: number): TabTotals {
  const rental = tab.rental
  const rentalCharge = rental
    ? computeRentalCharge(rental, rental.endedAt ?? now).charge
    : 0
  const productsSubtotal = round2(
    tab.items.reduce((s, it) => s + it.qty * it.unitPrice, 0),
  )
  const subtotal = round2(rentalCharge + productsSubtotal)

  const rentalTax = round2(rentalCharge * (rental?.taxRate ?? 0))
  const productsTax = round2(
    tab.items.reduce((s, it) => s + it.qty * it.unitPrice * it.taxRate, 0),
  )
  const tax = round2(rentalTax + productsTax)

  const discount = round2(tab.discount)
  const tip = round2(tab.tip)
  const total = round2(subtotal + tax - discount + tip)

  return { rentalCharge, productsSubtotal, subtotal, tax, discount, tip, total }
}
