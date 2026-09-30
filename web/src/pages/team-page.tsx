import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { UserBlobatar, avatarNameFor } from '@/components/user-blobatar'
import { teamsApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useTeam } from '@/lib/team-context'

export function TeamPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { team, teams, setTeamId } = useTeam()
  const qc = useQueryClient()
  const [inviteEmail, setInviteEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [descriptionValue, setDescriptionValue] = useState('')

  useEffect(() => {
    setDescriptionValue(team?.description ?? '')
  }, [team?.id, team?.description])

  const membersQuery = useQuery({
    queryKey: ['members', team?.id],
    queryFn: () => teamsApi.members(team!.id),
    enabled: !!team,
  })

  const invitesQuery = useQuery({
    queryKey: ['invites', team?.id],
    queryFn: () => teamsApi.invites(team!.id),
    enabled: !!team,
  })

  const updateTeam = useMutation({
    mutationFn: (body: { name?: string; description?: string | null }) =>
      teamsApi.update(team!.id, body),
    onSuccess: () => {
      setRenameValue('')
      void qc.invalidateQueries({ queryKey: ['teams'] })
    },
  })

  const deleteTeam = useMutation({
    mutationFn: () => teamsApi.remove(team!.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['teams'] })
      const remaining = teams.filter((item) => item.id !== team?.id)
      if (remaining[0]) setTeamId(remaining[0].id)
    },
  })

  const sendInvite = useMutation({
    mutationFn: (email: string) => teamsApi.invite(team!.id, email),
    onSuccess: () => {
      setInviteEmail('')
      void qc.invalidateQueries({ queryKey: ['invites', team?.id] })
    },
  })

  const isOwner = membersQuery.data?.some((m) => m.user_id === user?.id && m.role === 'owner')
  const latestInvite = invitesQuery.data?.[0]

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t('team.title')}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">{team?.name}</p>
          {team?.description && (
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{team.description}</p>
          )}
        </div>
        {isOwner && team && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="danger" size="sm">
                {t('team.delete')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>{t('team.deleteConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t('team.deleteConfirmBody')}</AlertDialogDescription>
              <div className="mt-4 flex justify-end gap-2">
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteTeam.mutate()}>
                  {t('common.delete')}
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </header>

      {isOwner && team && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('team.settings')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (renameValue.trim()) updateTeam.mutate({ name: renameValue.trim() })
              }}
            >
              <div className="flex flex-1 flex-col gap-2">
                <Label>{t('team.rename')}</Label>
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder={team.name}
                />
              </div>
              <Button type="submit" className="mt-7">
                {t('common.save')}
              </Button>
            </form>
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                updateTeam.mutate({ description: descriptionValue.trim() || null })
              }}
            >
              <Label>{t('team.description')}</Label>
              <Textarea
                value={descriptionValue}
                onChange={(e) => setDescriptionValue(e.target.value)}
                rows={2}
                placeholder={t('team.descriptionPlaceholder')}
              />
              <Button type="submit" variant="outline" className="self-start">
                {t('team.saveDescription')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('team.members')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(membersQuery.data ?? []).map((member) => (
            <div key={member.id} className="flex items-center gap-3">
              <UserBlobatar name={avatarNameFor(member)} config={member.avatar_config} size={36} />
              <div className="flex-1">
                <p className="text-sm font-medium">{member.display_name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {[member.job_title, member.email].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Badge variant={member.role === 'owner' ? 'pink' : 'dashed'}>
                {member.role === 'owner' ? t('team.roleOwner') : t('team.roleMember')}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('team.invites')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (inviteEmail.trim()) sendInvite.mutate(inviteEmail.trim())
            }}
          >
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={t('team.inviteEmail')}
            />
            <Button type="submit">{t('team.sendInvite')}</Button>
          </form>

          {latestInvite && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-sm font-medium">{latestInvite.email}</p>
              <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
                {`${window.location.origin}/invite/${latestInvite.token}`}
              </p>
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(
                    `${window.location.origin}/invite/${latestInvite.token}`,
                  )
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 1500)
                }}
              >
                {copied ? t('team.copied') : t('team.copyLink')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
