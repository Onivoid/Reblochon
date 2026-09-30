from enum import StrEnum


class MemberRole(StrEnum):
    OWNER = "owner"
    MEMBER = "member"


class InviteStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REVOKED = "revoked"
    EXPIRED = "expired"


class TaskStatus(StrEnum):
    TODO = "todo"
    DOING = "doing"
    DONE = "done"


class TaskPriority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ActivityType(StrEnum):
    TASK_CREATED = "task_created"
    TASK_UPDATED = "task_updated"
    TASK_COMPLETED = "task_completed"
    COMMENT_ADDED = "comment_added"
    MEMBER_JOINED = "member_joined"
    DRAWING_UPDATED = "drawing_updated"
    DAILY_NOTE = "daily_note"


class TaskLinkType(StrEnum):
    BLOCKS = "blocks"
    RELATES_TO = "relates_to"
    DEPENDS_ON = "depends_on"


class TaskKind(StrEnum):
    EPIC = "epic"
    STORY = "story"
    TASK = "task"
