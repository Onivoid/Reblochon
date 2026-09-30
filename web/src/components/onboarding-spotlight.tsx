import { useEffect, useLayoutEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

const ONBOARD_KEY = 'reblochon-onboarded'

const STEPS = ['team', 'today', 'project', 'settings'] as const

type Rect = { top: number; left: number; width: number; height: number }

function readHotspot(key: string): Rect | null {
  const el = document.querySelector(`[data-onboard="${key}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  const pad = 8
  return {
    top: Math.max(0, r.top - pad),
    left: Math.max(0, r.left - pad),
    width: r.width + pad * 2,
    height: r.height + pad * 2,
  }
}

export function OnboardingSpotlight() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [hole, setHole] = useState<Rect | null>(null)

  useEffect(() => {
    if (localStorage.getItem(ONBOARD_KEY) !== '1') {
      setOpen(true)
    }
  }, [])

  const key = STEPS[step]

  useLayoutEffect(() => {
    if (!open) return
    const update = () => setHole(readHotspot(key))
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    const timer = window.setInterval(update, 400)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      window.clearInterval(timer)
    }
  }, [open, key])

  function finish() {
    localStorage.setItem(ONBOARD_KEY, '1')
    setOpen(false)
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1)
    else finish()
  }

  if (!open) return null

  const tooltipStyle: React.CSSProperties = hole
    ? {
        top: Math.min(hole.top + hole.height + 12, window.innerHeight - 240),
        left: Math.min(Math.max(16, hole.left), window.innerWidth - 340),
      }
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboard-title"
    >
      {hole ? (
        <>
          <div
            className="absolute bg-black/65"
            style={{ top: 0, left: 0, right: 0, height: hole.top }}
          />
          <div
            className="absolute bg-black/65"
            style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }}
          />
          <div
            className="absolute bg-black/65"
            style={{
              top: hole.top,
              left: hole.left + hole.width,
              right: 0,
              height: hole.height,
            }}
          />
          <div
            className="absolute bg-black/65"
            style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }}
          />
          <div
            className="pointer-events-none absolute rounded-xl ring-2 ring-[var(--accent)]"
            style={{
              top: hole.top,
              left: hole.left,
              width: hole.width,
              height: hole.height,
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/65" />
      )}

      <div
        className="absolute z-10 w-[min(100%-2rem,320px)] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-xl"
        style={tooltipStyle}
      >
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
          {t('onboarding.step', { current: step + 1, total: STEPS.length })}
        </p>
        <h2 id="onboard-title" className="mt-2 text-lg font-semibold tracking-tight">
          {t(`onboarding.${key}.title`)}
        </h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">{t(`onboarding.${key}.body`)}</p>
        <div className="mt-5 flex justify-end gap-2">
          {step > 0 && (
            <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
              {t('onboarding.back')}
            </Button>
          )}
          <Button size="sm" onClick={next}>
            {step < STEPS.length - 1 ? t('onboarding.next') : t('onboarding.done')}
          </Button>
        </div>
      </div>
    </div>
  )
}
