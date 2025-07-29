'use client'

import { useMemo } from 'react'
import { Progress } from '@/components/ui/progress'

interface PasswordStrengthProps {
  password: string
  className?: string
}

interface StrengthResult {
  score: number
  label: string
  color: string
  suggestions: string[]
}

function calculatePasswordStrength(password: string): StrengthResult {
  let score = 0
  const suggestions: string[] = []

  // Critérios de força da senha
  const hasLowerCase = /[a-z]/.test(password)
  const hasUpperCase = /[A-Z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  const isLongEnough = password.length >= 8
  const isVeryLong = password.length >= 12

  // Pontuação baseada nos critérios
  if (hasLowerCase) score += 1
  else suggestions.push('Adicione letras minúsculas')

  if (hasUpperCase) score += 1
  else suggestions.push('Adicione letras maiúsculas')

  if (hasNumbers) score += 1
  else suggestions.push('Adicione números')

  if (hasSpecialChars) score += 1
  else suggestions.push('Adicione caracteres especiais (!@#$%^&*)')

  if (isLongEnough) score += 1
  else suggestions.push('Use no mínimo 8 caracteres')

  if (isVeryLong) score += 1

  // Penalizar senhas comuns ou padrões
  const commonPatterns = ['123456', 'password', 'qwerty', 'abc123', '111111']
  const hasCommonPattern = commonPatterns.some(pattern => 
    password.toLowerCase().includes(pattern)
  )
  if (hasCommonPattern) {
    score = Math.max(0, score - 2)
    suggestions.push('Evite sequências comuns')
  }

  // Determinar nível e cor
  let label = ''
  let color = ''

  if (score <= 1) {
    label = 'Muito fraca'
    color = 'bg-red-500'
  } else if (score <= 3) {
    label = 'Fraca'
    color = 'bg-orange-500'
  } else if (score <= 4) {
    label = 'Média'
    color = 'bg-yellow-500'
  } else if (score <= 5) {
    label = 'Forte'
    color = 'bg-green-500'
  } else {
    label = 'Muito forte'
    color = 'bg-green-600'
  }

  const percentage = Math.min(100, (score / 6) * 100)

  return {
    score: percentage,
    label,
    color,
    suggestions: suggestions.slice(0, 3), // Mostrar no máximo 3 sugestões
  }
}

export function PasswordStrength({ password, className = '' }: PasswordStrengthProps) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password])

  if (!password) return null

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Força da senha:</span>
        <span className={`font-medium ${
          strength.score <= 25 ? 'text-red-600' :
          strength.score <= 50 ? 'text-orange-600' :
          strength.score <= 75 ? 'text-yellow-600' :
          'text-green-600'
        }`}>
          {strength.label}
        </span>
      </div>
      
      <Progress 
        value={strength.score} 
        className="h-2"
      />
      
      {strength.suggestions.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Sugestões:</p>
          <ul className="space-y-0.5">
            {strength.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-center">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mr-2" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
} 