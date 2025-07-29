'use client'

import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

interface LogoProps {
  width?: number
  height?: number
  className?: string
  variant?: 'auto' | 'light' | 'dark' // light = logo preta, dark = logo branca
}

export function Logo({ width = 180, height = 60, className = "", variant = 'auto' }: LogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Evita hydration mismatch
  if (!mounted) {
    return (
      <div 
        className={`bg-muted animate-pulse rounded ${className}`}
        style={{ width, height }}
      />
    )
  }

  let logoSrc = '/logos/LOGO PRETA FUNDO TRANSP.png' // padrão

  if (variant === 'auto') {
    const isDark = resolvedTheme === 'dark'
    logoSrc = isDark ? '/logos/LOGO BRANCA FUNDO TRANSP.png' : '/logos/LOGO PRETA FUNDO TRANSP.png'
  } else if (variant === 'dark') {
    logoSrc = '/logos/LOGO BRANCA FUNDO TRANSP.png' // logo branca para fundos escuros
  } else if (variant === 'light') {
    logoSrc = '/logos/LOGO PRETA FUNDO TRANSP.png' // logo preta para fundos claros
  }

  return (
    <Image
      src={logoSrc}
      alt="Indaiá Eventos"
      width={width}
      height={height}
      className={`object-contain ${className}`}
      priority
    />
  )
} 