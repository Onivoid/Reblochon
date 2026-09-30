import { useTranslation } from 'react-i18next'
import { AppearanceControls, useAppearance } from '@/components/ui/appearance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ModeToggle } from '@/components/mode-toggle'

export function SettingsPage() {
  const { t } = useTranslation()
  const [appearance, setAppearanceState] = useAppearance()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{t('settings.title')}</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('settings.language')}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <LanguageSwitcher />
          <ModeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('settings.appearance')}</CardTitle>
        </CardHeader>
        <CardContent>
          <AppearanceControls value={appearance} onValueChange={setAppearanceState} />
        </CardContent>
      </Card>
    </div>
  )
}
