import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import {
  Calendar,
  GripVertical,
  Link2,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TaskDetailModal } from '@/components/task-detail-modal'
import { UserBlobatar, avatarNameFor } from '@/components/user-blobatar'
import { columnsApi, projectsApi, tasksApi, teamsApi, type BoardColumn, type Task } from '@/lib/api'
import { useTeam } from '@/lib/team-context'

function priorityVariant(priority: Task['priority']) {
  if (priority === 'high') return 'pink' as const
  if (priority === 'low') return 'dashed' as const
  return 'blue-soft' as const
}

function priorityLabelKey(priority: Task['priority']) {
  const capitalized = priority.charAt(0).toUpperCase() + priority.slice(1)
  return `task.priority${capitalized}`
}

function kindLabelKey(kind: Task['kind'] | undefined) {
  if (kind === 'epic') return 'task.kindEpic'
  if (kind === 'story') return 'task.kindStory'
  return 'task.kindTask'
}

function shortDate(value: string | null | undefined) {
  if (!value) return null
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function columnSortId(id: string) {
  return `column:${id}`
}

function parseColumnSortId(id: string | number) {
  const value = String(id)
  return value.startsWith('column:') ? value.slice(7) : null
}

const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) return pointerCollisions
  return closestCorners(args)
}

export function ProjectPage() {
  const { t } = useTranslation()
  const { projectId } = useParams({ from: '/app/projects/$projectId' })
  const { team, projects } = useTeam()
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [projectName, setProjectName] = useState('')
  const [newColumnName, setNewColumnName] = useState('')
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [localTasks, setLocalTasks] = useState<Task[]>([])
  const [localColumns, setLocalColumns] = useState<BoardColumn[]>([])

  const project = projects.find((p) => p.id === projectId)

  const columnsQuery = useQuery({
    queryKey: ['columns', projectId],
    queryFn: () => columnsApi.list(projectId),
    enabled: !!projectId && !!project,
  })

  const tasksQuery = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list(projectId),
    enabled: !!projectId && !!project,
  })

  const membersQuery = useQuery({
    queryKey: ['members', team?.id],
    queryFn: () => teamsApi.members(team!.id),
    enabled: !!team,
  })

  useEffect(() => {
    if (tasksQuery.data) setLocalTasks(tasksQuery.data)
  }, [tasksQuery.data])

  useEffect(() => {
    if (columnsQuery.data) setLocalColumns(columnsQuery.data)
  }, [columnsQuery.data])

  const membersById = useMemo(() => {
    const map = new Map<
      string,
      {
        display_name: string
        email: string
        avatar_seed: string | null
        avatar_config: import('@/lib/api').AvatarConfig | null
      }
    >()
    for (const m of membersQuery.data ?? []) {
      map.set(m.user_id, {
        display_name: m.display_name,
        email: m.email,
        avatar_seed: m.avatar_seed,
        avatar_config: m.avatar_config,
      })
    }
    return map
  }, [membersQuery.data])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const createTask = useMutation({
    mutationFn: (taskTitle: string) => {
      const first = localColumns[0]
      return tasksApi.create(projectId, {
        title: taskTitle,
        column_id: first?.id,
        status: first?.is_done ? 'done' : 'todo',
      })
    },
    onSuccess: () => {
      setTitle('')
      void qc.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
  })

  const createProject = useMutation({
    mutationFn: (name: string) => projectsApi.create(team!.id, name),
    onSuccess: () => {
      setProjectName('')
      void qc.invalidateQueries({ queryKey: ['projects', team?.id] })
    },
  })

  const createColumn = useMutation({
    mutationFn: (name: string) => columnsApi.create(projectId, { name }),
    onSuccess: () => {
      setNewColumnName('')
      void qc.invalidateQueries({ queryKey: ['columns', projectId] })
    },
  })

  const renameColumn = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => columnsApi.update(id, { name }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['columns', projectId] }),
  })

  const updateColumnDescription = useMutation({
    mutationFn: ({ id, description }: { id: string; description: string | null }) =>
      columnsApi.update(id, { description }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['columns', projectId] }),
  })

  const reorderColumns = useMutation({
    mutationFn: (items: Array<{ id: string; position: number }>) =>
      columnsApi.reorder(projectId, items),
    onSuccess: (data) => {
      setLocalColumns(data)
      void qc.setQueryData(['columns', projectId], data)
    },
  })

  const deleteColumn = useMutation({
    mutationFn: (id: string) => columnsApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['columns', projectId] })
      void qc.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
  })

  const reorder = useMutation({
    mutationFn: (items: Array<{ id: string; column_id: string; position: number }>) =>
      tasksApi.reorder(projectId, items),
    onSuccess: (data) => {
      setLocalTasks(data)
      void qc.setQueryData(['tasks', projectId], data)
    },
  })

  const tasksByColumn = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const col of localColumns) map.set(col.id, [])
    const sorted = [...localTasks].sort((a, b) => a.position - b.position)
    for (const task of sorted) {
      const key = task.column_id ?? localColumns[0]?.id
      if (!key) continue
      const list = map.get(key) ?? []
      list.push(task)
      map.set(key, list)
    }
    return map
  }, [localTasks, localColumns])

  function persistBoard(nextTasks: Task[]) {
    const items = nextTasks
      .filter((task) => task.column_id)
      .map((task) => ({
        id: task.id,
        column_id: task.column_id!,
        position: task.position,
      }))
    reorder.mutate(items)
  }

  function findColumnId(id: string, tasks: Task[]) {
    const columnFromPrefix = parseColumnSortId(id)
    if (columnFromPrefix) return columnFromPrefix
    if (localColumns.some((col) => col.id === id)) return id
    return tasks.find((task) => task.id === id)?.column_id ?? null
  }

  function onDragStart(event: DragStartEvent) {
    if (parseColumnSortId(event.active.id)) {
      setActiveTask(null)
      return
    }
    const task = localTasks.find((item) => item.id === event.active.id)
    setActiveTask(task ?? null)
  }

  function onDragOver(event: DragOverEvent) {
    if (parseColumnSortId(event.active.id)) return
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    setLocalTasks((prev) => {
      const activeTaskRow = prev.find((task) => task.id === activeId)
      if (!activeTaskRow) return prev

      const fromColumnId = activeTaskRow.column_id
      const toColumnId = findColumnId(overId, prev)
      if (!fromColumnId || !toColumnId || fromColumnId === toColumnId) return prev

      const overIsColumn = localColumns.some((col) => col.id === overId)
      const overTasks = prev
        .filter((task) => task.column_id === toColumnId && task.id !== activeId)
        .sort((a, b) => a.position - b.position)

      let insertAt = overTasks.length
      if (!overIsColumn) {
        const overIndex = overTasks.findIndex((task) => task.id === overId)
        if (overIndex >= 0) {
          const isBelow =
            !!active.rect.current.translated &&
            active.rect.current.translated.top > over.rect.top + over.rect.height / 2
          insertAt = overIndex + (isBelow ? 1 : 0)
        }
      }

      const moved = { ...activeTaskRow, column_id: toColumnId }
      const nextOver = [...overTasks]
      nextOver.splice(insertAt, 0, moved)
      const reindexedOver = nextOver.map((task, index) => ({ ...task, position: index }))

      const reindexedFrom = prev
        .filter((task) => task.column_id === fromColumnId && task.id !== activeId)
        .sort((a, b) => a.position - b.position)
        .map((task, index) => ({ ...task, position: index }))

      const byId = new Map([...reindexedFrom, ...reindexedOver].map((task) => [task.id, task]))
      return prev.map((task) => byId.get(task.id) ?? task)
    })
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return

    const activeColumnId = parseColumnSortId(active.id)
    const overColumnId =
      parseColumnSortId(over.id) ??
      (localColumns.some((c) => c.id === String(over.id)) ? String(over.id) : null)
    if (activeColumnId && overColumnId && activeColumnId !== overColumnId) {
      const oldIndex = localColumns.findIndex((c) => c.id === activeColumnId)
      const newIndex = localColumns.findIndex((c) => c.id === overColumnId)
      if (oldIndex >= 0 && newIndex >= 0) {
        const next = arrayMove(localColumns, oldIndex, newIndex).map((col, index) => ({
          ...col,
          position: index,
        }))
        setLocalColumns(next)
        reorderColumns.mutate(next.map((col) => ({ id: col.id, position: col.position })))
      }
      return
    }

    if (activeColumnId) return

    const activeId = String(active.id)
    const overId = String(over.id)

    setLocalTasks((prev) => {
      const activeTaskRow = prev.find((task) => task.id === activeId)
      if (!activeTaskRow?.column_id) return prev

      const columnId = findColumnId(overId, prev) ?? activeTaskRow.column_id
      const columnTasks = prev
        .filter((task) => task.column_id === columnId)
        .sort((a, b) => a.position - b.position)

      const oldIndex = columnTasks.findIndex((task) => task.id === activeId)
      const overIsColumn =
        !!parseColumnSortId(overId) || localColumns.some((col) => col.id === overId)
      const newIndex = overIsColumn
        ? columnTasks.length - 1
        : columnTasks.findIndex((task) => task.id === overId)

      let next = prev
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        const reordered = arrayMove(columnTasks, oldIndex, newIndex).map((task, index) => ({
          ...task,
          column_id: columnId,
          position: index,
        }))
        const byId = new Map(reordered.map((task) => [task.id, task]))
        next = prev.map((task) => byId.get(task.id) ?? task)
      } else if (activeTaskRow.column_id !== columnId) {
        next = prev.map((task) => (task.id === activeId ? { ...task, column_id: columnId } : task))
      }

      queueMicrotask(() => persistBoard(next))
      return next
    })
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Empty>
          <EmptyTitle>{t('project.noProjects')}</EmptyTitle>
          <EmptyDescription>{t('project.createFirst')}</EmptyDescription>
        </Empty>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (projectName.trim() && team) createProject.mutate(projectName.trim())
          }}
        >
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder={t('project.name')}
          />
          <Button type="submit">{t('project.create')}</Button>
        </form>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">{t('project.board')}</p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (title.trim()) createTask.mutate(title.trim())
          }}
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('project.taskTitle')}
          />
          <Button type="submit">{t('project.createTask')}</Button>
        </form>
      </header>

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">{t('project.board')}</TabsTrigger>
          <TabsTrigger value="list">{t('project.list')}</TabsTrigger>
        </TabsList>
        <TabsContent value="board" className="mt-4">
          {localTasks.length === 0 && (
            <Empty className="mb-4">
              <EmptyTitle>{t('project.emptyBoard')}</EmptyTitle>
              <EmptyDescription>{t('project.emptyBoardHint')}</EmptyDescription>
            </Empty>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={localColumns.map((c) => columnSortId(c.id))}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex gap-4 overflow-x-auto pb-4">
                {localColumns.map((column) => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    tasks={tasksByColumn.get(column.id) ?? []}
                    membersById={membersById}
                    onOpenTask={setSelectedTaskId}
                    onRename={(name) => renameColumn.mutate({ id: column.id, name })}
                    onDescription={(description) =>
                      updateColumnDescription.mutate({ id: column.id, description })
                    }
                    onDelete={() => deleteColumn.mutate(column.id)}
                    canDelete={localColumns.length > 1}
                  />
                ))}
                <div className="w-72 shrink-0 rounded-2xl border border-dashed border-[var(--border)] p-3">
                  <form
                    className="flex flex-col gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (newColumnName.trim()) createColumn.mutate(newColumnName.trim())
                    }}
                  >
                    <Input
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      placeholder={t('project.columnName')}
                    />
                    <Button type="submit" variant="outline" size="sm" className="gap-1">
                      <Plus size={14} />
                      {t('project.addColumn')}
                    </Button>
                  </form>
                </div>
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeTask ? (
                <TaskCard
                  task={activeTask}
                  membersById={membersById}
                  onOpen={() => undefined}
                  overlay
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <ul className="flex flex-col gap-2">
            {localTasks.map((task) => {
              const column = localColumns.find((col) => col.id === task.column_id)
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3 text-left"
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <span>{task.title}</span>
                    <Badge variant="blue-soft">{column?.name ?? task.status}</Badge>
                  </button>
                </li>
              )
            })}
          </ul>
        </TabsContent>
      </Tabs>

      <TaskDetailModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </div>
  )
}

function KanbanColumn({
  column,
  tasks,
  membersById,
  onOpenTask,
  onRename,
  onDescription,
  onDelete,
  canDelete,
}: {
  column: BoardColumn
  tasks: Task[]
  membersById: Map<
    string,
    {
      display_name: string
      email: string
      avatar_seed: string | null
      avatar_config: import('@/lib/api').AvatarConfig | null
    }
  >
  onOpenTask: (id: string) => void
  onRename: (name: string) => void
  onDescription: (description: string | null) => void
  onDelete: () => void
  canDelete: boolean
}) {
  const { t } = useTranslation()
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: column.id })
  const {
    attributes,
    listeners,
    setNodeRef: setSortRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: columnSortId(column.id) })
  const [editing, setEditing] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [name, setName] = useState(column.name)
  const [description, setDescription] = useState(column.description ?? '')

  const setNodeRef = (node: HTMLElement | null) => {
    setDropRef(node)
    setSortRef(node)
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={`flex w-72 shrink-0 flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)]/70 p-3 ${
        isOver ? 'ring-2 ring-[var(--accent)]/40' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab text-[var(--muted-foreground)] active:cursor-grabbing"
          aria-label={t('project.reorderColumn')}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </button>
        {editing ? (
          <form
            className="flex flex-1 gap-1"
            onSubmit={(e) => {
              e.preventDefault()
              if (name.trim()) {
                onRename(name.trim())
                setEditing(false)
              }
            }}
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </form>
        ) : (
          <button
            type="button"
            className="flex-1 text-left text-sm font-medium"
            onDoubleClick={() => setEditing(true)}
          >
            {column.name}{' '}
            <Badge variant="count" size="sm">
              {tasks.length}
            </Badge>
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">
              <MoreHorizontal size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setEditing(true)}>
              {t('project.renameColumn')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditingDesc(true)}>
              {t('project.editColumnDescription')}
            </DropdownMenuItem>
            {canDelete && (
              <DropdownMenuItem onClick={onDelete}>
                <Trash2 size={14} />
                {t('project.deleteColumn')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {editingDesc ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            onDescription(description.trim() || null)
            setEditingDesc(false)
          }}
        >
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder={t('project.columnDescription')}
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              {t('common.save')}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingDesc(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      ) : column.description ? (
        <p className="line-clamp-2 text-xs text-[var(--muted-foreground)]">{column.description}</p>
      ) : null}

      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-24 flex-col gap-2">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              membersById={membersById}
              onOpen={() => onOpenTask(task.id)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

function SortableTaskCard({
  task,
  membersById,
  onOpen,
}: {
  task: Task
  membersById: Map<
    string,
    {
      display_name: string
      email: string
      avatar_seed: string | null
      avatar_config: import('@/lib/api').AvatarConfig | null
    }
  >
  onOpen: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        membersById={membersById}
        onOpen={onOpen}
        dragProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

type MemberInfo = {
  display_name: string
  email: string
  avatar_seed: string | null
  avatar_config: import('@/lib/api').AvatarConfig | null
}

function TaskCard({
  task,
  membersById,
  onOpen,
  dragProps,
  overlay,
}: {
  task: Task
  membersById: Map<string, MemberInfo>
  onOpen: () => void
  dragProps?: Record<string, unknown>
  overlay?: boolean
}) {
  const { t } = useTranslation()
  const assignee = task.assignee_id ? membersById.get(task.assignee_id) : null

  return (
    <div
      className={`cursor-grab rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 shadow-sm active:cursor-grabbing ${
        overlay ? 'rotate-1 shadow-lg' : ''
      } ${task.is_blocked ? 'border-[var(--destructive)]/50' : ''}`}
      {...dragProps}
      onClick={onOpen}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-[var(--muted-foreground)]" aria-hidden>
          <GripVertical size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            <Badge variant="dashed" size="sm">
              {t(kindLabelKey(task.kind))}
            </Badge>
            {task.is_blocked && (
              <Badge variant="pink" size="sm">
                {t('task.blocked')}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-left text-sm font-medium">{task.title}</p>
          {task.description && (
            <p className="mt-1 line-clamp-3 text-xs text-[var(--muted-foreground)]">
              {task.description}
            </p>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge variant={priorityVariant(task.priority)} size="sm">
          {t(priorityLabelKey(task.priority))}
        </Badge>
        {task.due_at && (
          <Badge variant="blue-soft" size="sm" className="gap-1">
            <Calendar size={10} />
            {shortDate(task.due_at)}
          </Badge>
        )}
        <Badge variant="count" size="sm" className="gap-1">
          <Link2 size={10} />
          {task.links_count ?? 0}
        </Badge>
        <Badge variant="count" size="sm" className="gap-1">
          <MessageSquare size={10} />
          {task.comments_count ?? 0}
        </Badge>
        {(task.created_at || task.updated_at) && (
          <span className="text-[10px] text-[var(--muted-foreground)]">
            {shortDate(task.updated_at ?? task.created_at)}
          </span>
        )}
        {assignee && (
          <span className="ml-auto">
            <UserBlobatar
              name={avatarNameFor(assignee)}
              config={assignee.avatar_config}
              size={24}
              animate={false}
            />
          </span>
        )}
      </div>
    </div>
  )
}
