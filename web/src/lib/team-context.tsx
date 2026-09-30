import { useQuery } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { projectsApi, teamsApi, type Project, type Team } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

type TeamContextValue = {
  teams: Team[]
  team: Team | null
  setTeamId: (id: string) => void
  projects: Project[]
  isLoading: boolean
}

const TeamContext = createContext<TeamContextValue | null>(null)
const TEAM_KEY = 'reblochon-team-id'

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [teamId, setTeamIdState] = useState<string | null>(() => localStorage.getItem(TEAM_KEY))

  const teamsQuery = useQuery({
    queryKey: ['teams', user?.id],
    queryFn: () => teamsApi.list(),
    enabled: !!user,
  })

  const teams = teamsQuery.data ?? []
  const team = teams.find((t) => t.id === teamId) ?? teams[0] ?? null

  useEffect(() => {
    if (team && team.id !== teamId) {
      localStorage.setItem(TEAM_KEY, team.id)
      setTeamIdState(team.id)
    }
  }, [team, teamId])

  const projectsQuery = useQuery({
    queryKey: ['projects', team?.id],
    queryFn: () => projectsApi.list(team!.id),
    enabled: !!team,
  })

  const value = useMemo<TeamContextValue>(
    () => ({
      teams,
      team,
      setTeamId: (id: string) => {
        localStorage.setItem(TEAM_KEY, id)
        setTeamIdState(id)
      },
      projects: projectsQuery.data ?? [],
      isLoading: teamsQuery.isLoading || projectsQuery.isLoading,
    }),
    [teams, team, projectsQuery.data, teamsQuery.isLoading, projectsQuery.isLoading],
  )

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
}

export function useTeam() {
  const ctx = useContext(TeamContext)
  if (!ctx) throw new Error('TeamProvider missing')
  return ctx
}
