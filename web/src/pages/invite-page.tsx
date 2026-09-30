import { useNavigate, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppearanceProvider } from '@/components/ui/appearance'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InviteCard } from '@/components/ui/invite-card'
import { getAccessToken, teamsApi } from '@/lib/api'

export function InvitePage() {
  const { t } = useTranslation()
  const { token } = useParams({ from: '/invite/$token' })
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function accept() {
    if (!getAccessToken()) {
      void navigate({ to: '/login' })
      return
    }
    setLoading(true)
    setError(null)
    try {
      await teamsApi.accept(token)
      void navigate({ to: '/team' })
    } catch {
      setError(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppearanceProvider>
      <div className="mx-auto flex min-h-svh max-w-lg flex-col justify-center p-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('team.acceptInvite')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InviteCard name={t('team.inviteToken')} description={token} />
            {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
            <Button onClick={accept} disabled={loading} fullWidth>
              {t('team.acceptInvite')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppearanceProvider>
  )
}
