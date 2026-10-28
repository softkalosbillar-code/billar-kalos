interface LogoProps {
  variant?: 'full' | 'mark'
  height?: number
  className?: string
}

export function Logo({ variant = 'full', height = 48, className }: LogoProps) {
  const src = variant === 'full' ? '/logo-black.png' : '/icons/icon-512.png'
  return (
    <img
      src={src}
      alt="Kalos Billar Club"
      draggable={false}
      className={className}
      style={{ height, width: 'auto', objectFit: 'contain' }}
      onError={(e) => {
        // Fallback if image path differs
        const target = e.currentTarget
        if (!target.src.endsWith('/logo-transparent.png')) {
          target.src = '/logo-transparent.png'
        }
      }}
    />
  )
}
