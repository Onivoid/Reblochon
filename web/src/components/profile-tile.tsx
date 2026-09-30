import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import {
  BACKGROUND_OPTIONS,
  EXPRESSION_OPTIONS,
  UserBlobatar,
  avatarNameFor,
  type ExpressionName,
} from '@/components/user-blobatar'
import { authApi, type AvatarConfig } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

const JOB_SUGGESTIONS = ['PO', 'SM', 'Dev', 'Designer', 'QA'] as const

function AvatarEditor({
  name,
  config,
  onChange,
  size = 72,
}: {
  name: string
  config: AvatarConfig
  onChange: (next: AvatarConfig) => void
  size?: number
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  function patch(partial: AvatarConfig) {
    onChange({ ...config, ...partial })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded-full ring-offset-2 transition hover:ring-2 hover:ring-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          aria-label={t('profile.editAvatar')}
        >
          <UserBlobatar name={name} config={config} size={size} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3 p-4" align="center">
        <p className="text-sm font-medium">{t('profile.editAvatar')}</p>
        <div className="flex justify-center">
          <UserBlobatar name={name} config={config} size={64} animate="always" />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <Label>{t('profile.hue')}</Label>
            <span>{Math.round(config.hue ?? 0)}°</span>
          </div>
          <Slider
            min={0}
            max={360}
            step={1}
            value={[config.hue ?? 180]}
            onValueChange={([hue]) => patch({ hue })}
          />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <Label>{t('profile.tone')}</Label>
            <span>{Math.round((config.tone ?? 0.5) * 100)}%</span>
          </div>
          <Slider
            min={0}
            max={0.999}
            step={0.01}
            value={[config.tone ?? 0.5]}
            onValueChange={([tone]) => patch({ tone })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('profile.shape')}</Label>
          <Slider
            min={0}
            max={0.999}
            step={0.01}
            value={[config.traits?.shape ?? 0.5]}
            onValueChange={([shape]) => patch({ traits: { ...config.traits, shape } })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('profile.expression')}</Label>
          <Select
            value={(config.expression as ExpressionName) ?? 'idle'}
            onValueChange={(v) => v && patch({ expression: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPRESSION_OPTIONS.map((name) => (
                <SelectItem key={name} value={name}>
                  {t(`profile.expr.${name}`, { defaultValue: name })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('profile.background')}</Label>
          <Select
            value={
              typeof config.background === 'string'
                ? config.background
                : config.background === false
                  ? 'none'
                  : 'circle'
            }
            onValueChange={(v) => {
              if (!v) return
              if (v === 'none') patch({ background: false })
              else patch({ background: v as 'circle' | 'square' | 'squircle' })
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('profile.bgNone')}</SelectItem>
              {BACKGROUND_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => onChange({})}
        >
          {t('profile.resetAvatar')}
        </Button>
      </PopoverContent>
    </Popover>
  )
}

export function ProfileTile() {
  const { t } = useTranslation()
  const { user, refreshUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>({})

  useEffect(() => {
    if (!user) return
    setDisplayName(user.display_name)
    setJobTitle(user.job_title ?? '')
    setAvatarConfig(user.avatar_config ?? {})
  }, [user, open])

  const save = useMutation({
    mutationFn: () =>
      authApi.updateMe({
        display_name: displayName.trim(),
        job_title: jobTitle.trim() || null,
        avatar_config: Object.keys(avatarConfig).length ? avatarConfig : null,
      }),
    onSuccess: (next) => {
      refreshUser(next)
      setOpen(false)
    },
  })

  if (!user) return null

  const name = avatarNameFor(user)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)]/60 p-2 text-left transition-colors hover:bg-[var(--muted)]"
      >
        <UserBlobatar name={name} config={user.avatar_config} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{user.display_name}</span>
          <span className="block truncate text-xs text-[var(--muted-foreground)]">
            {user.job_title || t('profile.jobTitlePlaceholder')}
          </span>
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>{t('profile.editTitle')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-2 py-2">
            <AvatarEditor name={name} config={avatarConfig} onChange={setAvatarConfig} size={80} />
            <p className="text-xs text-[var(--muted-foreground)]">{t('profile.avatarClickHint')}</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label>{t('auth.displayName')}</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('profile.jobTitle')}</Label>
              <Input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder={t('profile.jobTitlePlaceholder')}
              />
              <div className="flex flex-wrap gap-1">
                {JOB_SUGGESTIONS.map((role) => (
                  <Button
                    key={role}
                    type="button"
                    size="sm"
                    variant={jobTitle === role ? 'default' : 'outline'}
                    onClick={() => setJobTitle(role)}
                  >
                    {role}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button disabled={!displayName.trim() || save.isPending} onClick={() => save.mutate()}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
