import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { Badge } from '@/components/ui/badge'
import { BentoGrid } from '@/components/ui/bento-grid'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { TaskDetailModal } from '@/components/task-detail-modal'
import { extrasApi, projectsApi, tasksApi, type Task } from '@/lib/api'
import { formatActivity } from '@/lib/format-activity'
import { useTeam } from '@/lib/team-context'
import type { BentoLayout } from '@/lib/cojeev/bento-layout'

const LAYOUT: BentoLayout = {
  columns: 4,
  rows: 4,
  seed: 7,
  tiles: [
    { id: 'today', x: 0, y: 0, width: 2, height: 3, label: 'today' },
    { id: 'stats', x: 2, y: 0, width: 2, height: 1, label: 'stats' },
    { id: 'note', x: 2, y: 1, width: 1, height: 2, label: 'note' },
    { id: 'activity', x: 3, y: 1, width: 1, height: 2, label: 'activity' },
    { id: 'projects', x: 0, y: 3, width: 4, height: 1, label: 'projects' },
  ],
}

const tileClass =
  'flex h-full flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)]/90 p-4 text-[var(--foreground)]'

export function TodayPage() {
  const { t } = useTranslation()
  const { team, projects, isLoading } = useTeam()
  const qc = useQueryClient()
  const [mineOnly, setMineOnly] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [note, setNote] = useState('')

  const todayQuery = useQuery({
    queryKey: ['today', team?.id, mineOnly],
    queryFn: () => tasksApi.today(team!.id, mineOnly),
    enabled: !!team,
  })

  const statsQuery = useQuery({
    queryKey: ['stats', team?.id],
    queryFn: () => extrasApi.stats(team!.id),
    enabled: !!team,
  })

  const noteQuery = useQuery({
    queryKey: ['daily-note', team?.id],
    queryFn: () => extrasApi.dailyNote(team!.id),
    enabled: !!team,
  })

  const activityQuery = useQuery({
    queryKey: ['activity', team?.id],
    queryFn: () => extrasApi.activity(team!.id),
    enabled: !!team,
    refetchInterval: 20_000,
  })

  const saveNote = useMutation({
    mutationFn: (body: string) => extrasApi.saveDailyNote(team!.id, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['daily-note', team?.id] }),
  })

  const toggleDone = useMutation({
    mutationFn: (task: Task) =>
      tasksApi.update(task.id, { status: task.status === 'done' ? 'todo' : 'done' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['today', team?.id] })
      void qc.invalidateQueries({ queryKey: ['stats', team?.id] })
    },
  })

  const createTask = useMutation({
    mutationFn: async (title: string) => {
      let projectId = projects[0]?.id
      if (!projectId && team) {
        const project = await projectsApi.create(team.id, t('project.title'))
        projectId = project.id
        void qc.invalidateQueries({ queryKey: ['projects', team.id] })
      }
      if (!projectId) throw new Error('no_project')
      return tasksApi.create(projectId, { title, is_today: true })
    },
    onSuccess: () => {
      setNewTitle('')
      void qc.invalidateQueries({ queryKey: ['today', team?.id] })
      void qc.invalidateQueries({ queryKey: ['stats', team?.id] })
    },
  })

  if (isLoading) {
    return <p className="text-sm text-[var(--muted-foreground)]">{t('common.loading')}</p>
  }

  const tasks = todayQuery.data ?? []
  const stats = statsQuery.data

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 text-[var(--foreground)]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            {t('today.title')}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">{team?.name}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
          <Switch checked={mineOnly} onCheckedChange={setMineOnly} />
          {t('today.mineOnly')}
        </label>
      </header>

      <BentoGrid
        layout={LAYOUT}
        variant="classic"
        className="min-h-[640px] text-[var(--foreground)]"
        renderTile={(tile) => {
          if (tile.id === 'today') {
            return (
              <div className={tileClass}>
                <p className="text-sm font-medium text-[var(--foreground)]">{t('today.title')}</p>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (newTitle.trim()) createTask.mutate(newTitle.trim())
                  }}
                >
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={t('today.addTask')}
                  />
                  <Button type="submit" size="sm">
                    {t('today.addTask')}
                  </Button>
                </form>
                {tasks.length === 0 ? (
                  <Empty className="my-auto">
                    <EmptyTitle>{t('today.empty')}</EmptyTitle>
                    <EmptyDescription>{t('today.emptyHint')}</EmptyDescription>
                  </Empty>
                ) : (
                  <ul className="flex flex-1 flex-col gap-2 overflow-y-auto">
                    {tasks.map((task) => (
                      <li
                        key={task.id}
                        className="flex items-center gap-2 rounded-lg border border-[var(--border)]/60 bg-[var(--background)]/70 px-2 py-1.5"
                      >
                        <Checkbox
                          checked={task.status === 'done'}
                          onCheckedChange={() => toggleDone.mutate(task)}
                        />
                        <button
                          type="button"
                          className="flex-1 truncate text-left text-sm text-[var(--foreground)]"
                          onClick={() => setSelectedTaskId(task.id)}
                        >
                          <span className={task.status === 'done' ? 'line-through opacity-60' : ''}>
                            {task.title}
                          </span>
                        </button>
                        <Badge variant="dashed" size="sm">
                          {task.priority}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          }

          if (tile.id === 'stats') {
            return (
              <div className={`${tileClass} grid grid-cols-4 gap-2`}>
                {[
                  { label: t('today.statsToday'), value: stats?.today_tasks ?? 0 },
                  { label: t('today.statsDoing'), value: stats?.doing_tasks ?? 0 },
                  { label: t('today.statsDone'), value: stats?.done_tasks ?? 0 },
                  { label: t('today.statsTotal'), value: stats?.total_tasks ?? 0 },
                ].map((item) => (
                  <div key={item.label} className="min-w-0">
                    <p className="truncate text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">
                      {item.label}
                    </p>
                    <p className="text-xl font-semibold text-[var(--foreground)]">
                      <AnimatedNumber value={item.value} />
                    </p>
                  </div>
                ))}
              </div>
            )
          }

          if (tile.id === 'note') {
            return (
              <div className={tileClass}>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {t('today.dailyNote')}
                </p>
                <Textarea
                  className="min-h-0 flex-1"
                  value={note || noteQuery.data?.body || ''}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('today.dailyNotePlaceholder')}
                />
                <Button
                  size="sm"
                  onClick={() => saveNote.mutate(note || noteQuery.data?.body || '')}
                  disabled={saveNote.isPending}
                >
                  {t('today.saveNote')}
                </Button>
              </div>
            )
          }

          if (tile.id === 'activity') {
            const events = (activityQuery.data ?? []).slice(0, 8)
            return (
              <div className={`${tileClass} overflow-hidden`}>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {t('today.activity')}
                </p>
                {events.length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {t('today.activityEmpty')}
                  </p>
                ) : (
                  <ul className="space-y-1 overflow-y-auto text-xs text-[var(--muted-foreground)]">
                    {events.map((event) => (
                      <li key={event.id} className="truncate">
                        {formatActivity(event, t)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          }

          return (
            <div className={tileClass}>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {t('today.quickProjects')}
              </p>
              <div className="flex flex-wrap gap-2">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    to="/projects/$projectId"
                    params={{ projectId: project.id }}
                    className="inline-flex items-center rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--muted)]"
                  >
                    {project.name}
                  </Link>
                ))}
                {projects.length === 0 && (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {t('project.noProjects')}
                  </p>
                )}
              </div>
            </div>
          )
        }}
      />

      <TaskDetailModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </div>
  )
}
