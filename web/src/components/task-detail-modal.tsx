import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ActivityFeed } from '@/components/ui/activity-feed'
import { extrasApi, tasksApi, teamsApi, type TaskKind, type TaskLink } from '@/lib/api'
import { formatActivity } from '@/lib/format-activity'
import { useTeam } from '@/lib/team-context'

const Excalidraw = lazy(async () => {
  await import('@excalidraw/excalidraw/index.css')
  const mod = await import('@excalidraw/excalidraw')
  return { default: mod.Excalidraw }
})

type Props = {
  taskId: string | null
  onClose: () => void
}

function sceneFromJson(scene: Record<string, unknown> | null | undefined) {
  if (!scene || typeof scene !== 'object') return undefined
  const elements = scene.elements
  if (!Array.isArray(elements) || elements.length === 0) return undefined
  return {
    elements,
    appState: (scene.appState as Record<string, unknown>) ?? {},
    files: (scene.files as Record<string, unknown>) ?? {},
  }
}

function toDateInput(value: string | null | undefined) {
  if (!value) return ''
  return value.slice(0, 10)
}

export function TaskDetailModal({ taskId, onClose }: Props) {
  const { t } = useTranslation()
  const { team } = useTeam()
  const qc = useQueryClient()
  const open = !!taskId
  const drawReady = useRef(false)
  const drawTimer = useRef<number | null>(null)

  const taskQuery = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksApi.get(taskId!),
    enabled: !!taskId,
  })

  const commentsQuery = useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => tasksApi.comments(taskId!),
    enabled: !!taskId,
  })

  const drawingQuery = useQuery({
    queryKey: ['drawing', taskId],
    queryFn: () => tasksApi.drawing(taskId!),
    enabled: !!taskId,
  })

  const attachmentsQuery = useQuery({
    queryKey: ['attachments', taskId],
    queryFn: () => tasksApi.attachments(taskId!),
    enabled: !!taskId,
  })

  const linksQuery = useQuery({
    queryKey: ['links', taskId],
    queryFn: () => tasksApi.links(taskId!),
    enabled: !!taskId,
  })

  const projectTasksQuery = useQuery({
    queryKey: ['tasks', taskQuery.data?.project_id],
    queryFn: () => tasksApi.list(taskQuery.data!.project_id),
    enabled: !!taskQuery.data?.project_id,
  })

  const activityQuery = useQuery({
    queryKey: ['activity', team?.id],
    queryFn: () => extrasApi.activity(team!.id),
    enabled: !!team && open,
    refetchInterval: 15_000,
  })

  const membersQuery = useQuery({
    queryKey: ['members', team?.id],
    queryFn: () => teamsApi.members(team!.id),
    enabled: !!team && open,
  })

  const task = taskQuery.data
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [comment, setComment] = useState('')
  const [attachLabel, setAttachLabel] = useState('')
  const [attachUrl, setAttachUrl] = useState('')
  const [linkTarget, setLinkTarget] = useState('')
  const [linkType, setLinkType] = useState<'depends_on' | 'blocks' | 'relates_to'>('depends_on')
  const [deadline, setDeadline] = useState('')
  const [activeTab, setActiveTab] = useState('details')
  const [drawingFullscreen, setDrawingFullscreen] = useState(false)

  const onDrawingTab = activeTab === 'drawing'

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setDeadline(toDateInput(task.due_at))
    }
  }, [task])

  useEffect(() => {
    drawReady.current = false
    if (drawTimer.current) window.clearTimeout(drawTimer.current)
  }, [taskId])

  useEffect(() => {
    if (!open) {
      setActiveTab('details')
      setDrawingFullscreen(false)
    }
  }, [open])

  useEffect(() => {
    if (!onDrawingTab) setDrawingFullscreen(false)
  }, [onDrawingTab])

  const saveTask = useMutation({
    mutationFn: (body: Record<string, unknown>) => tasksApi.update(taskId!, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['task', taskId] })
      void qc.invalidateQueries({ queryKey: ['today'] })
      void qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const addComment = useMutation({
    mutationFn: (body: string) => tasksApi.addComment(taskId!, body),
    onSuccess: () => {
      setComment('')
      void qc.invalidateQueries({ queryKey: ['comments', taskId] })
      void qc.invalidateQueries({ queryKey: ['activity', team?.id] })
    },
  })

  const saveDrawing = useMutation({
    mutationFn: (scene_json: Record<string, unknown>) => tasksApi.saveDrawing(taskId!, scene_json),
  })

  const addAttachment = useMutation({
    mutationFn: () => tasksApi.addAttachment(taskId!, attachLabel, attachUrl),
    onSuccess: () => {
      setAttachLabel('')
      setAttachUrl('')
      void qc.invalidateQueries({ queryKey: ['attachments', taskId] })
    },
  })

  const addLink = useMutation({
    mutationFn: () => tasksApi.addLink(taskId!, { to_task_id: linkTarget, link_type: linkType }),
    onSuccess: () => {
      setLinkTarget('')
      void qc.invalidateQueries({ queryKey: ['links', taskId] })
      void qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const removeLink = useMutation({
    mutationFn: (linkId: string) => tasksApi.removeLink(linkId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['links', taskId] })
      void qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  function commitTitle() {
    if (!task) return
    const next = title.trim()
    if (!next) {
      setTitle(task.title)
      return
    }
    if (next === task.title) return
    saveTask.mutate({ title: next })
  }

  function commitDescription() {
    if (!task) return
    const next = description.trim() || null
    const prev = task.description ?? null
    if (next === prev) return
    saveTask.mutate({ description: next })
  }

  function linkLabel(link: TaskLink) {
    const otherId = link.from_task_id === taskId ? link.to_task_id : link.from_task_id
    const other = (projectTasksQuery.data ?? []).find((item) => item.id === otherId)
    const name = other?.title ?? otherId.slice(0, 8)
    if (link.link_type === 'depends_on') {
      return link.from_task_id === taskId
        ? `${t('links.dependsOn')} · ${name}`
        : `${t('links.dependedBy')} · ${name}`
    }
    if (link.link_type === 'blocks') {
      return link.from_task_id === taskId
        ? `${t('links.blocks')} · ${name}`
        : `${t('links.blockedBy')} · ${name}`
    }
    return `${t('links.relatesTo')} · ${name}`
  }

  const initialScene = sceneFromJson(drawingQuery.data?.scene_json ?? undefined)

  const shellClass = drawingFullscreen
    ? '!flex !h-[96vh] !w-[98vw] !max-w-none flex-col overflow-hidden p-0'
    : onDrawingTab
      ? '!flex !h-[min(94vh,100%)] !w-[min(96vw,90rem)] !max-w-[90rem] flex-col overflow-hidden p-0 max-md:!h-[min(94dvh,100%)] max-md:!w-[min(96vw,40rem)] max-md:!max-w-none'
      : '!flex !h-[min(90vh,calc(min(96vw,80rem)*9/16))] !w-[min(96vw,80rem)] !max-w-[80rem] flex-col overflow-hidden p-0 max-md:!h-[min(92dvh,100%)] max-md:!w-[min(96vw,40rem)] max-md:!max-w-none'

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className={shellClass}>
        <div
          className={`relative shrink-0 border-b border-[var(--border)] px-6 pr-14 ${drawingFullscreen ? 'py-2' : 'py-4'}`}
        >
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label={t('common.close')}
              className="absolute top-3 right-3 z-20 h-9 w-9 shrink-0 p-0"
            >
              <Icon name="x" />
            </Button>
          </DialogClose>
          <DialogHeader className="gap-1">
            <DialogTitle className="sr-only">{title || t('task.details')}</DialogTitle>
            <DialogDescription className="sr-only">{t('task.details')}</DialogDescription>
            {task ? (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    e.currentTarget.blur()
                  }
                }}
                aria-label={t('project.taskTitle')}
                className="w-full border-0 border-b border-transparent bg-transparent p-0 text-xl font-semibold tracking-tight text-[var(--foreground)] outline-none transition-[border-color] placeholder:text-[var(--muted-foreground)] focus:border-[var(--border)]"
              />
            ) : (
              <p className="text-lg font-semibold">{t('common.loading')}</p>
            )}
          </DialogHeader>
        </div>

        {task && (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="!flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6"
          >
            <TabsList className={`mt-3 shrink-0 ${drawingFullscreen ? 'hidden' : ''}`}>
              <TabsTrigger value="details">{t('task.details')}</TabsTrigger>
              <TabsTrigger value="comments">{t('task.comments')}</TabsTrigger>
              <TabsTrigger value="drawing">{t('task.drawing')}</TabsTrigger>
              <TabsTrigger value="activity">{t('task.activity')}</TabsTrigger>
            </TabsList>

            <TabsContent
              value="details"
              className="mt-4 min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
            >
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
                <div className="flex min-w-0 flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>{t('task.description')}</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onBlur={commitDescription}
                      rows={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('links.dependencies')}</Label>
                    {(linksQuery.data ?? []).length === 0 ? (
                      <p className="text-sm text-[var(--muted-foreground)]">{t('links.empty')}</p>
                    ) : (
                      <ul className="space-y-2">
                        {(linksQuery.data ?? []).map((link) => (
                          <li
                            key={link.id}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <span className="min-w-0 truncate">{linkLabel(link)}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeLink.mutate(link.id)}
                            >
                              {t('common.delete')}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Select
                        value={linkTarget || undefined}
                        onValueChange={(v) => v && setLinkTarget(v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('links.pickTask')} />
                        </SelectTrigger>
                        <SelectContent>
                          {(projectTasksQuery.data ?? [])
                            .filter((item) => item.id !== task.id)
                            .map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.title}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={linkType}
                        onValueChange={(v) =>
                          v && setLinkType(v as 'depends_on' | 'blocks' | 'relates_to')
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('links.type')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="depends_on">{t('links.dependsOn')}</SelectItem>
                          <SelectItem value="blocks">{t('links.blocks')}</SelectItem>
                          <SelectItem value="relates_to">{t('links.relatesTo')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      disabled={!linkTarget}
                      onClick={() => addLink.mutate()}
                    >
                      {t('links.add')}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('task.attachments')}</Label>
                    <ul className="space-y-1 text-sm">
                      {(attachmentsQuery.data ?? []).map((a) => (
                        <li key={a.id}>
                          <a href={a.url} target="_blank" rel="noreferrer" className="underline">
                            {a.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        value={attachLabel}
                        onChange={(e) => setAttachLabel(e.target.value)}
                        placeholder={t('task.attachmentLabel')}
                      />
                      <Input
                        value={attachUrl}
                        onChange={(e) => setAttachUrl(e.target.value)}
                        placeholder={t('task.attachmentUrl')}
                      />
                    </div>
                    <Button
                      variant="outline"
                      disabled={!attachLabel || !attachUrl}
                      onClick={() => addAttachment.mutate()}
                    >
                      {t('task.addAttachment')}
                    </Button>
                  </div>
                </div>

                <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-0 lg:self-start">
                  <div className="flex flex-col gap-2">
                    <Label>{t('task.kind')}</Label>
                    <Select
                      value={task.kind ?? 'task'}
                      onValueChange={(kind) => kind && saveTask.mutate({ kind: kind as TaskKind })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="epic">{t('task.kindEpic')}</SelectItem>
                        <SelectItem value="story">{t('task.kindStory')}</SelectItem>
                        <SelectItem value="task">{t('task.kindTask')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>{t('task.status')}</Label>
                    <Select
                      value={task.status}
                      onValueChange={(status) => status && saveTask.mutate({ status })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">{t('project.todo')}</SelectItem>
                        <SelectItem value="doing">{t('project.doing')}</SelectItem>
                        <SelectItem value="done">{t('project.done')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>{t('task.priority')}</Label>
                    <Select
                      value={task.priority}
                      onValueChange={(priority) => priority && saveTask.mutate({ priority })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t('task.priorityLow')}</SelectItem>
                        <SelectItem value="medium">{t('task.priorityMedium')}</SelectItem>
                        <SelectItem value="high">{t('task.priorityHigh')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>{t('task.deadline')}</Label>
                    <Input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      onBlur={() => {
                        const next = deadline
                          ? new Date(`${deadline}T12:00:00`).toISOString()
                          : null
                        const prev = task.due_at
                        if (next === prev) return
                        if (!deadline && !prev) return
                        if (deadline && prev && toDateInput(prev) === deadline) return
                        saveTask.mutate({ due_at: next })
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>{t('task.assignee')}</Label>
                    <Select
                      value={task.assignee_id ?? 'none'}
                      onValueChange={(value) =>
                        value && saveTask.mutate({ assignee_id: value === 'none' ? null : value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('task.unassigned')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('task.unassigned')}</SelectItem>
                        {(membersQuery.data ?? []).map((m) => (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {m.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={task.is_today}
                      onCheckedChange={(checked) => saveTask.mutate({ is_today: checked })}
                    />
                    {t('task.markToday')}
                  </label>
                  <Button
                    variant="danger"
                    onClick={async () => {
                      await tasksApi.remove(task.id)
                      void qc.invalidateQueries({ queryKey: ['today'] })
                      void qc.invalidateQueries({ queryKey: ['tasks'] })
                      onClose()
                    }}
                  >
                    {t('task.delete')}
                  </Button>
                </aside>
              </div>
            </TabsContent>

            <TabsContent value="comments" className="mt-4 min-h-0 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-3">
                <ul className="space-y-3">
                  {(commentsQuery.data ?? []).map((c) => (
                    <li key={c.id} className="rounded-xl border border-[var(--border)] p-3 text-sm">
                      <p>{c.body}</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {new Date(c.created_at).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t('task.commentPlaceholder')}
                />
                <Button
                  disabled={!comment.trim()}
                  onClick={() => addComment.mutate(comment.trim())}
                >
                  {t('task.sendComment')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent
              value="drawing"
              forceMount
              className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
            >
              <div className="mb-1.5 flex shrink-0 items-center justify-between gap-3">
                <p className="text-xs text-[var(--muted-foreground)]">{t('task.drawingHint')}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={() => setDrawingFullscreen((v) => !v)}
                >
                  <Icon name={drawingFullscreen ? 'minimize-2' : 'maximize'} />
                  {drawingFullscreen
                    ? t('task.drawingExitFullscreen')
                    : t('task.drawingFullscreen')}
                </Button>
              </div>
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
                {drawingQuery.isLoading ? (
                  <p className="p-4 text-sm">{t('common.loading')}</p>
                ) : (
                  <Suspense fallback={<p className="p-4 text-sm">{t('common.loading')}</p>}>
                    <div className="absolute inset-0 [&_.excalidraw]:h-full [&_.excalidraw]:w-full [&_.excalidraw-modal-container]:z-[100]">
                      <Excalidraw
                        key={taskId ?? 'none'}
                        initialData={initialScene as never}
                        onChange={(elements, appState, files) => {
                          if (!drawReady.current) {
                            drawReady.current = true
                            return
                          }
                          const scene = {
                            elements,
                            appState: {
                              viewBackgroundColor: appState.viewBackgroundColor,
                              currentItemFontFamily: appState.currentItemFontFamily,
                            },
                            files,
                          }
                          if (drawTimer.current) window.clearTimeout(drawTimer.current)
                          drawTimer.current = window.setTimeout(() => {
                            saveDrawing.mutate(scene as Record<string, unknown>)
                          }, 800)
                        }}
                      />
                    </div>
                  </Suspense>
                )}
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-4 min-h-0 flex-1 overflow-y-auto">
              <ActivityFeed
                entries={(activityQuery.data ?? [])
                  .filter((e) => e.payload?.task_id === task.id)
                  .slice(0, 20)
                  .map((e) => ({
                    id: e.id,
                    title: formatActivity(e, t),
                    description: '',
                    timestamp: new Date(e.created_at).toLocaleString(),
                    dateTime: e.created_at,
                  }))}
              />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { TaskDetailModal as TaskDetailSheet }
