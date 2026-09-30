import type { TFunction } from 'i18next'
import type { Activity } from '@/lib/api'

export function formatActivity(event: Activity, t: TFunction): string {
  const title = typeof event.payload.title === 'string' ? event.payload.title : null
  const teamName = typeof event.payload.team_name === 'string' ? event.payload.team_name : null

  switch (event.event_type) {
    case 'task_created':
      return title ? t('activity.taskCreated', { title }) : t('activity.taskCreatedGeneric')
    case 'task_updated':
      return title ? t('activity.taskUpdated', { title }) : t('activity.taskUpdatedGeneric')
    case 'task_completed':
      return title ? t('activity.taskCompleted', { title }) : t('activity.taskCompletedGeneric')
    case 'comment_added':
      return title ? t('activity.commentAdded', { title }) : t('activity.commentAddedGeneric')
    case 'drawing_updated':
      return title ? t('activity.drawingUpdated', { title }) : t('activity.drawingUpdatedGeneric')
    case 'member_joined':
      return teamName
        ? t('activity.memberJoined', { team: teamName })
        : t('activity.memberJoinedGeneric')
    case 'daily_note':
      return t('activity.dailyNote')
    default:
      return event.event_type
  }
}
