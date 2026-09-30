import { useEffect, useState } from 'react'
import { ThemeToggle, applyTheme, type ThemeMode } from '@/components/ui/theme-toggle'

export function ModeToggle() {
  const [mode, setMode] = useState<ThemeMode>(() =>
    document.documentElement.dataset.mode === 'dark' ? 'dark' : 'light',
  )

  useEffect(() => {
    applyTheme(mode)
  }, [mode])

  return <ThemeToggle mode={mode} onModeChange={setMode} showLabel={false} />
}
