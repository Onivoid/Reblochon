import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { getAccessToken } from '@/lib/api'
import { AppShell } from '@/components/app-shell'
import { AuthPage } from '@/pages/auth-page'
import { TodayPage } from '@/pages/today-page'
import { ProjectPage } from '@/pages/project-page'
import { TeamPage } from '@/pages/team-page'
import { SettingsPage } from '@/pages/settings-page'
import { InvitePage } from '@/pages/invite-page'

function requireAuth() {
  if (!getAccessToken()) {
    throw redirect({ to: '/login' })
  }
}

function requireGuest() {
  if (getAccessToken()) {
    throw redirect({ to: '/today' })
  }
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

/** Pathless layout keeps AuthPage mounted across /login ↔ /register. */
const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'auth',
  beforeLoad: requireGuest,
  component: AuthPage,
})

const loginRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/login',
})

const registerRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/register',
})

const inviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invite/$token',
  component: InvitePage,
})

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: requireAuth,
  component: AppShell,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: getAccessToken() ? '/today' : '/login' })
  },
})

const todayRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/today',
  component: TodayPage,
})

const projectRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/projects/$projectId',
  component: ProjectPage,
})

const teamRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/team',
  component: TeamPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/settings',
  component: SettingsPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  authLayoutRoute.addChildren([loginRoute, registerRoute]),
  inviteRoute,
  appRoute.addChildren([todayRoute, projectRoute, teamRoute, settingsRoute]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
