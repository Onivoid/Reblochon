import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  Home,
  LayoutGrid,
  Plus,
  Settings,
  Users,
  LogOut,
  Search,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useEffect, useMemo, useState } from 'react'
import { AppearanceProvider } from '@/components/ui/appearance'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Dock } from '@/components/ui/dock'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OnboardingSpotlight } from '@/components/onboarding-spotlight'
import { ProfileTile } from '@/components/profile-tile'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ModeToggle } from '@/components/mode-toggle'
import { TaskDetailModal } from '@/components/task-detail-modal'
import { projectsApi, teamsApi, tasksApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { TeamProvider, useTeam } from '@/lib/team-context'

const LAST_PROJECT_KEY = 'reblochon-last-project'
const CREATE_TEAM_VALUE = '__create_team__'

function ShellInner() {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const { team, teams, setTeamId, projects } = useTeam()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const qc = useQueryClient()
  const [cmdOpen, setCmdOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createTeamOpen, setCreateTeamOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newTeamName, setNewTeamName] = useState('')
  const [boardsOpen, setBoardsOpen] = useState(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!pathname.startsWith('/projects/')) return
    const id = pathname.split('/')[2]
    if (id) localStorage.setItem(LAST_PROJECT_KEY, id)
  }, [pathname])

  const todayQuery = useQuery({
    queryKey: ['today-cmd', team?.id],
    queryFn: () => tasksApi.today(team!.id),
    enabled: !!team,
  })

  const createProject = useMutation({
    mutationFn: (name: string) => projectsApi.create(team!.id, name),
    onSuccess: (project) => {
      void qc.invalidateQueries({ queryKey: ['projects', team?.id] })
      setCreateOpen(false)
      setNewProjectName('')
      localStorage.setItem(LAST_PROJECT_KEY, project.id)
      void navigate({ to: `/projects/${project.id}` })
    },
  })

  const createTeam = useMutation({
    mutationFn: (name: string) => teamsApi.create(name),
    onSuccess: (created) => {
      setNewTeamName('')
      setCreateTeamOpen(false)
      setTeamId(created.id)
      void qc.invalidateQueries({ queryKey: ['teams'] })
    },
  })

  const crumb = useMemo(() => {
    if (pathname.startsWith('/projects/')) {
      const id = pathname.split('/')[2]
      const project = projects.find((p) => p.id === id)
      return project?.name ?? t('nav.projects')
    }
    if (pathname === '/team') return t('nav.team')
    if (pathname === '/settings') return t('nav.settings')
    return t('nav.today')
  }, [pathname, projects, t])

  const dockValue = pathname.startsWith('/projects')
    ? 'projects'
    : pathname === '/team'
      ? 'team'
      : pathname === '/settings'
        ? 'settings'
        : 'today'

  function resolveProjectsTarget() {
    const lastId = localStorage.getItem(LAST_PROJECT_KEY)
    return projects.find((p) => p.id === lastId) ?? projects[0]
  }

  return (
    <div className="flex h-svh overflow-hidden bg-[var(--background)]">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col gap-4 overflow-y-auto border-r border-[var(--border)] bg-[var(--card)] p-4 md:flex">
        <div>
          <p className="text-lg font-semibold tracking-tight">{t('app.name')}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{t('app.tagline')}</p>
        </div>

        {teams.length > 0 && (
          <div data-onboard="team" className="-mx-4 border-y border-[var(--border)]">
            <Select
              value={team?.id}
              containerProps={{ className: "block w-full" }}
              onValueChange={(id) => {
                if (!id) return
                if (id === CREATE_TEAM_VALUE) {
                  setCreateTeamOpen(true)
                  return
                }
                setTeamId(id)
              }}
            >
              <SelectTrigger
                radius="square"
                data-motion="off"
                style={{ borderRadius: 0 }}
                className="h-auto w-full min-w-0 rounded-none border-0 bg-[var(--card)] px-4 py-2.5 shadow-none focus:ring-0 focus-visible:ring-0 data-[state=open]:bg-[var(--muted)] hover:bg-[var(--muted)] [box-shadow:none]"
              >
                <SelectValue placeholder={t('team.title')}>
                  {team ? (
                    <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
                      <span className="truncate font-medium">{team.name}</span>
                      {team.description && (
                        <span className="line-clamp-2 text-[10px] font-normal text-[var(--muted-foreground)]">
                          {team.description}
                        </span>
                      )}
                    </span>
                  ) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {teams.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    <span className="flex flex-col gap-0.5">
                      <span>{item.name}</span>
                      {item.description && (
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          {item.description}
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
                <SelectItem value={CREATE_TEAM_VALUE}>{t('team.createTeam')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <nav className="flex flex-col gap-1">
          <NavLink
            to="/today"
            active={pathname === '/today'}
            icon={<Home size={16} />}
            label={t('nav.today')}
            dataOnboard="today"
          />
          <Collapsible open={boardsOpen} onOpenChange={setBoardsOpen} className="mt-2">
            <div className="flex items-center gap-1 px-1">
              <CollapsibleTrigger className="flex flex-1 items-center gap-1 rounded-lg px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)] hover:bg-[var(--muted)]">
                <ChevronDown
                  size={12}
                  className={`transition-transform ${boardsOpen ? '' : '-rotate-90'}`}
                />
                {t('nav.boards')}
              </CollapsibleTrigger>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="size-6 p-0"
                onClick={() => setCreateOpen(true)}
                disabled={!team}
                aria-label={t('nav.newBoard')}
              >
                <Plus size={14} />
              </Button>
            </div>
            <CollapsibleContent>
              <div className="mt-1 space-y-1">
                {projects.map((p) => (
                  <NavLink
                    key={p.id}
                    to={`/projects/${p.id}`}
                    active={pathname.includes(p.id)}
                    icon={<LayoutGrid size={16} />}
                    label={p.name}
                    dataOnboard={p === projects[0] ? 'project' : undefined}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
          <NavLink
            to="/team"
            active={pathname === '/team'}
            icon={<Users size={16} />}
            label={t('nav.team')}
          />
          <NavLink
            to="/settings"
            active={pathname === '/settings'}
            icon={<Settings size={16} />}
            label={t('nav.settings')}
            dataOnboard="settings"
          />
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCmdOpen(true)}
            className="justify-start gap-2"
          >
            <Search size={14} />
            {t('nav.command')}
            <kbd className="ml-auto text-[10px] opacity-60">⌘K</kbd>
          </Button>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <LanguageSwitcher />
          </div>
          <ProfileTile />
          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-2"
            onClick={async () => {
              await logout()
              void navigate({ to: '/login' })
            }}
          >
            <LogOut size={14} />
            {t('nav.logout')}
          </Button>
        </div>
      </aside>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="relative z-10 flex items-center gap-3 border-b border-[var(--border)]/60 px-4 py-3 md:px-8">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/today">{t('app.name')}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{crumb}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {team && (
            <span className="ml-auto truncate text-xs text-[var(--muted-foreground)]">
              {team.name}
            </span>
          )}
        </header>
        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8">
          <Outlet />
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-3 z-20 flex justify-center md:hidden">
        <Dock
          variant="glass"
          value={dockValue}
          onValueChange={(value) => {
            if (value === 'today') void navigate({ to: '/today' })
            if (value === 'team') void navigate({ to: '/team' })
            if (value === 'settings') void navigate({ to: '/settings' })
            if (value === 'projects') {
              const target = resolveProjectsTarget()
              if (target) void navigate({ to: `/projects/${target.id}` })
            }
          }}
          items={[
            { value: 'today', label: t('nav.today'), icon: <Home size={18} /> },
            { value: 'projects', label: t('nav.projects'), icon: <LayoutGrid size={18} /> },
            { value: 'team', label: t('nav.team'), icon: <Users size={18} /> },
            { value: 'settings', label: t('nav.settings'), icon: <Settings size={18} /> },
          ]}
        />
      </div>

      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder={t('nav.command')} />
        <CommandList>
          <CommandEmpty>{t('common.none')}</CommandEmpty>
          <CommandGroup heading={t('nav.today')}>
            {(todayQuery.data ?? []).map((task) => (
              <CommandItem
                key={task.id}
                onSelect={() => {
                  setCmdOpen(false)
                  setSelectedTaskId(task.id)
                }}
              >
                {task.title}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading={t('nav.projects')}>
            {projects.map((p) => (
              <CommandItem
                key={p.id}
                onSelect={() => {
                  setCmdOpen(false)
                  void navigate({ to: `/projects/${p.id}` })
                }}
              >
                {p.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('nav.newBoard')}</DialogTitle>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (newProjectName.trim() && team) createProject.mutate(newProjectName.trim())
            }}
          >
            <Input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder={t('project.name')}
              autoFocus
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={!newProjectName.trim() || createProject.isPending}>
                {t('project.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('team.createTeam')}</DialogTitle>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (newTeamName.trim()) createTeam.mutate(newTeamName.trim())
            }}
          >
            <Input
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder={t('team.teamName')}
              autoFocus
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateTeamOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={!newTeamName.trim() || createTeam.isPending}>
                {t('team.createTeam')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <TaskDetailModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
      <OnboardingSpotlight />
    </div>
  )
}

function NavLink({
  to,
  active,
  icon,
  label,
  dataOnboard,
}: {
  to: string
  active: boolean
  icon: React.ReactNode
  label: string
  dataOnboard?: string
}) {
  return (
    <Link
      to={to}
      data-onboard={dataOnboard}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
        active ? 'bg-[var(--accent)]/15 font-medium' : 'hover:bg-[var(--muted)]'
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Link>
  )
}

export function AppShell() {
  return (
    <AppearanceProvider>
      <TeamProvider>
        <ShellInner />
      </TeamProvider>
    </AppearanceProvider>
  )
}
