export type AvatarConfig = {
  hue?: number
  tone?: number
  background?: boolean | 'square' | 'circle' | 'squircle'
  expression?: string
  traits?: Record<string, number>
}

export type User = {
  id: string
  email: string
  display_name: string
  locale: string
  job_title: string | null
  avatar_seed: string | null
  avatar_config: AvatarConfig | null
}

export type Team = { id: string; name: string; slug: string; description: string | null }
export type Project = { id: string; team_id: string; name: string; color_token: string }
export type Tag = { id: string; name: string }
export type Subtask = { id: string; title: string; is_done: boolean; position: number }

export type TaskKind = 'epic' | 'story' | 'task'

export type BoardColumn = {
  id: string
  project_id: string
  name: string
  description: string | null
  position: number
  color_token: string
  is_done: boolean
}

export type Task = {
  id: string
  project_id: string
  column_id: string | null
  title: string
  description: string | null
  kind: TaskKind
  status: 'todo' | 'doing' | 'done'
  priority: 'low' | 'medium' | 'high'
  due_at: string | null
  assignee_id: string | null
  created_by: string
  position: number
  scheduled_for: string | null
  is_today: boolean
  created_at: string | null
  updated_at: string | null
  comments_count: number
  links_count: number
  is_blocked: boolean
  tags: Tag[]
  subtasks: Subtask[]
}

export type Member = {
  id: string
  user_id: string
  role: 'owner' | 'member'
  display_name: string
  email: string
  job_title: string | null
  avatar_seed: string | null
  avatar_config: AvatarConfig | null
}

export type Invite = {
  id: string
  token: string
  email: string
  status: string
  expires_at: string
}

export type Comment = {
  id: string
  task_id: string
  author_id: string
  body: string
  created_at: string
}

export type Activity = {
  id: string
  team_id: string
  actor_id: string
  event_type: string
  payload: Record<string, unknown>
  created_at: string
}

export type Stats = {
  total_tasks: number
  done_tasks: number
  doing_tasks: number
  today_tasks: number
  project_count: number
}

export type DailyNote = {
  id: string
  team_id: string
  note_date: string
  body: string
  author_id: string
  updated_at: string
}

export type Drawing = {
  task_id: string
  scene_json: Record<string, unknown>
  updated_by: string
  updated_at: string
}

export type FocusSession = {
  id: string
  user_id: string
  task_id: string | null
  started_at: string
  duration_sec: number
  ended_at: string | null
}

export type Attachment = {
  id: string
  task_id: string
  label: string
  url: string
  created_by: string
  created_at: string
}

export type TaskLink = {
  id: string
  from_task_id: string
  to_task_id: string
  link_type: 'blocks' | 'relates_to' | 'depends_on'
  created_at: string
}

export type AuthResponse = {
  user: User
  access_token: string
  refresh_token: string
  token_type: string
}
