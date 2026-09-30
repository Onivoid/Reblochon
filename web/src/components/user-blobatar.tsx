import { Blobatar } from '@blobatar/react'
import {
  happy,
  idle,
  love,
  mad,
  sad,
  shy,
  sleepy,
  smug,
  surprised,
  thinking,
  wink,
} from 'blobatar/expression'
import 'blobatar/motion.css'
import { cn } from '@/lib/utils'
import type { AvatarConfig } from '@/lib/api'

const EXPRESSIONS = {
  idle,
  happy,
  sad,
  mad,
  surprised,
  wink,
  sleepy,
  smug,
  love,
  shy,
  thinking,
} as const

export type ExpressionName = keyof typeof EXPRESSIONS

type Props = {
  name: string
  config?: AvatarConfig | null
  className?: string
  size?: number
  animate?: 'hover' | 'always' | false
}

export function UserBlobatar({ name, config, className, size = 40, animate = 'hover' }: Props) {
  const expressionName = config?.expression as ExpressionName | undefined
  const expression = expressionName ? EXPRESSIONS[expressionName] : undefined

  return (
    <span
      className={cn('inline-flex shrink-0 overflow-hidden rounded-full', className)}
      style={{ width: size, height: size }}
    >
      <Blobatar
        name={name || 'anon'}
        animate={animate || undefined}
        size={size}
        hue={config?.hue}
        tone={config?.tone}
        background={config?.background}
        traits={config?.traits}
        expression={expression}
      />
    </span>
  )
}

export function avatarNameFor(user: { email?: string | null }) {
  return (user.email || 'anon').toLowerCase()
}

export const EXPRESSION_OPTIONS = Object.keys(EXPRESSIONS) as ExpressionName[]

export const BACKGROUND_OPTIONS = [
  { value: 'circle', labelKey: 'profile.bgCircle' },
  { value: 'squircle', labelKey: 'profile.bgSquircle' },
  { value: 'square', labelKey: 'profile.bgSquare' },
] as const
