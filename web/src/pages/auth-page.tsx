import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppearanceProvider } from '@/components/ui/appearance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MotionSurface } from '@/components/ui/presence'
import { SproutsBackground } from '@/components/ui/sprouts-background'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ModeToggle } from '@/components/mode-toggle'
import { ApiError, authApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useChoreography } from '@/lib/cojeev-motion/choreography'
import i18n from '@/lib/i18n'

const ONBOARD_KEY = 'reblochon-onboarded'
const DRAFT_KEY = 'reblochon-auth-draft'

type AuthMode = 'login' | 'register'

type Draft = { email: string; password: string; displayName: string }

function loadDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return { email: '', password: '', displayName: '' }
    return { email: '', password: '', displayName: '', ...(JSON.parse(raw) as Partial<Draft>) }
  } catch {
    return { email: '', password: '', displayName: '' }
  }
}

/** Mounted once under the auth layout — mode comes from the URL without remount. */
export function AuthPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const mode: AuthMode = pathname.includes('register') ? 'register' : 'login'
  const isLogin = mode === 'login'
  const { quiet } = useChoreography()

  const { t } = useTranslation()
  const { setSession } = useAuth()
  const navigate = useNavigate()
  const draft = loadDraft()
  const [email, setEmail] = useState(draft.email)
  const [password, setPassword] = useState(draft.password)
  const [displayName, setDisplayName] = useState(draft.displayName)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ email, password, displayName }))
  }, [email, password, displayName])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (isLogin) {
        const data = await authApi.login({ email, password })
        sessionStorage.removeItem(DRAFT_KEY)
        setSession(data)
        void navigate({ to: '/today' })
      } else {
        const data = await authApi.register({
          email,
          password,
          display_name: displayName,
          locale: i18n.language === 'en' ? 'en' : 'fr',
        })
        sessionStorage.removeItem(DRAFT_KEY)
        localStorage.removeItem(ONBOARD_KEY)
        setSession(data)
        void navigate({ to: '/today' })
      }
    } catch (err) {
      if (err instanceof ApiError && err.detail === 'invalid_credentials') {
        setError(t('auth.errorCredentials'))
      } else if (err instanceof ApiError && err.detail === 'email_taken') {
        setError(t('auth.errorEmailTaken'))
      } else {
        setError(t('auth.errorGeneric'))
      }
    } finally {
      setLoading(false)
    }
  }

  const panelTransition = quiet
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 320, damping: 34, mass: 0.85 }

  return (
    <AppearanceProvider>
      <div className="flex min-h-svh flex-col bg-[var(--background)] lg:grid lg:grid-cols-2">
        <MotionSurface
          layout
          preset="fade"
          transition={panelTransition}
          className="relative isolate hidden min-h-svh overflow-hidden bg-[var(--muted)]/30 lg:block"
          style={{ order: isLogin ? 0 : 1 }}
        >
          <SproutsBackground className="absolute inset-0" opacity={0.8} />
          <div className="relative z-10 flex h-full flex-col justify-center gap-4 p-12 text-[var(--foreground)]">
            <MotionSurface
              key={mode}
              preset="slide"
              transition={quiet ? { duration: 0 } : { duration: 0.35 }}
              className="max-w-md rounded-2xl bg-[var(--background)]/40 p-6 backdrop-blur-sm"
            >
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                {t('app.name')}
              </p>
              <p className="mt-1.5 text-xs font-light italic leading-none tracking-wide text-[var(--muted-foreground)]/70">
                {t('app.tagline')}
              </p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight">
                {isLogin ? t('auth.loginTitle') : t('auth.registerTitle')}
              </h1>
              <p className="mt-3 max-w-sm text-base text-[var(--muted-foreground)]">
                {isLogin ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
              </p>
            </MotionSurface>
          </div>
        </MotionSurface>

        <MotionSurface
          layout
          preset="fade"
          transition={panelTransition}
          className="relative flex min-h-svh flex-col justify-center bg-[var(--background)] px-6 py-10 sm:px-10 lg:px-16"
          style={{ order: isLogin ? 1 : 0 }}
        >
          <div className="absolute right-4 top-4 flex gap-2 lg:right-8 lg:top-8">
            <LanguageSwitcher />
            <ModeToggle />
          </div>
          <div className="mx-auto w-full max-w-[440px] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-md sm:p-8">
            <p className="mb-2 text-sm font-medium text-[var(--muted-foreground)] lg:hidden">
              {t('app.name')}
            </p>
            <p className="mb-3 text-xs font-light italic leading-none tracking-wide text-[var(--muted-foreground)]/70 lg:hidden">
              {t('app.tagline')}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              {isLogin ? t('auth.loginTitle') : t('auth.registerTitle')}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {isLogin ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
            </p>
            <form className="mt-8 flex flex-col gap-4" onSubmit={onSubmit}>
              {!isLogin && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">{t('auth.displayName')}</Label>
                  <Input
                    id="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
              <Button type="submit" disabled={loading} fullWidth>
                {isLogin ? t('auth.submitLogin') : t('auth.submitRegister')}
              </Button>
            </form>
            <p className="mt-6 text-sm">
              {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
              <Link to={isLogin ? '/register' : '/login'} className="underline underline-offset-4">
                {isLogin ? t('auth.goRegister') : t('auth.goLogin')}
              </Link>
            </p>
          </div>
        </MotionSurface>
      </div>
    </AppearanceProvider>
  )
}
