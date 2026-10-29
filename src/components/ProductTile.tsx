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
      className={`billiard-card-frame billiard-felt relative flex flex-col items-center justify-center p-1.5 transition-all duration-150 active:scale-[0.96] text-left ${
        compact ? 'min-h-24' : 'min-h-28'
      } ${out ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:scale-[1.02]'}`}
    >
      {/* Troneras en las esquinas */}
      <div className="billiard-pocket billiard-pocket-tl" />
      <div className="billiard-pocket billiard-pocket-tr" />
      <div className="billiard-pocket billiard-pocket-bl" />
      <div className="billiard-pocket billiard-pocket-br" />

      <div className="billiard-felt-inner w-full h-full flex flex-col items-center justify-center p-2.5 text-center">
        <span className={compact ? 'text-2xl' : 'text-3xl'} role="img" aria-label={product.name}>
          {product.emoji}
        </span>
        <span className="text-xs font-bold text-ink-1 leading-tight mt-1.5 truncate max-w-full drop-shadow">
          {product.name}
        </span>
        <span className="text-xs text-brand font-mono font-bold mt-1 tabular-nums drop-shadow">
          {money(product.price)}
        </span>
        {out && (
          <span className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-danger/80 text-white shadow-sm">
            Agotado
          </span>
        )}
      </div>
    </button>
  )
}
