import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { authApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { setAppLocale } from '@/lib/i18n'

const LOCALES = [
  { id: 'fr' as const, flag: '🇫🇷', labelKey: 'settings.languageFr' },
  { id: 'en' as const, flag: '🇬🇧', labelKey: 'settings.languageEn' },
]

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const { user, refreshUser } = useAuth()
  const current = i18n.language === 'en' ? 'en' : 'fr'
  const active = LOCALES.find((l) => l.id === current) ?? LOCALES[0]

  async function onChange(next: string | null) {
    if (next !== 'fr' && next !== 'en') return
    setAppLocale(next)
    if (user) {
      try {
        const updated = await authApi.updateMe({ locale: next })
        refreshUser(updated)
      } catch {
        /* locale still applied locally */
      }
    }
  }

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger
        className="h-8 w-auto min-w-[7.5rem] gap-2"
        aria-label={t('settings.language')}
      >
        <SelectValue>
          <span className="flex items-center gap-2">
            <span aria-hidden="true">{active.flag}</span>
            <span>{t(active.labelKey)}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {LOCALES.map((locale) => (
          <SelectItem key={locale.id} value={locale.id}>
            <span className="flex items-center gap-2">
              <span aria-hidden="true">{locale.flag}</span>
              <span>{t(locale.labelKey)}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
