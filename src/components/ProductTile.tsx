import { money } from '../lib/format'
import type { Product } from '../lib/types'

interface ProductTileProps {
  product: Product
  onAdd?: (product: Product) => void
  onEdit?: (product: Product) => void
  compact?: boolean
}

export function ProductTile({ product, onAdd, onEdit, compact }: ProductTileProps) {
  const out = product.stock != null && product.stock <= 0
  return (
    <button
      onClick={onAdd ? () => onAdd(product) : onEdit ? () => onEdit(product) : undefined}
      disabled={out && !!onAdd}
      className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-surface-2 p-3 transition-all duration-150 active:scale-[0.96] ${
        compact ? 'min-h-24' : 'min-h-28'
      } ${out ? 'opacity-45' : 'hover:border-white/20'}`}
    >
      <span className={compact ? 'text-2xl' : 'text-3xl'}>{product.emoji}</span>
      <span className="text-[13px] font-semibold text-ink-1 text-center leading-tight">
        {product.name}
      </span>
      <span className="text-xs text-ink-2 tabular-nums">{money(product.price)}</span>
      {out && (
        <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-danger/20 text-danger">
          Agotado
        </span>
      )}
    </button>
  )
}
