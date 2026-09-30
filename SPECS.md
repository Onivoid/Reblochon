# Specs

Behavioural contracts for unit, integration, and manual E2E checks. Automated API tests live under `api/tests/` (`test_unit_*`, `test_integration_*`). Assert on stable `detail` codes and behaviour, not private implementation.

## Product scope

Small hobby teams (about 4–5 people). Primary loop: sign in, manage today’s tasks, collaborate lightly (comments, invites, whiteboard, daily note).

## Auth

| Case | Expected |
| --- | --- |
| Register with valid email/password (≥8) and display name | 200, user + tokens; creates team **Default**, project **Général**, 3 board columns |
| Register duplicate email | 409 `email_taken` |
| Login with wrong password | 401 `invalid_credentials` |
| Login with unknown email | 401 `invalid_credentials` (same message) |
| Refresh with valid refresh token | 200, new token pair, previous refresh revoked |
| Refresh with revoked/expired token | 401 `invalid_refresh` |
| Logout | refresh revoked; reuse fails |
| Access protected route without Bearer | 401 |

## Teams and invites

| Case | Expected |
| --- | --- |
| Create team | creator is `owner` member; activity `member_joined` |
| List teams | only teams the user belongs to |
| PATCH team name / description | owner only |
| DELETE team | owner only; cascades members/projects/tasks; UI action on Team page |
| List members as outsider | 404 `team_not_found` |
| Owner creates invite | pending invite, unique token, expires in 7 days |
| Member creates invite | 403 `owner_required` |
| Accept invite with matching authenticated email | membership created, invite `accepted` |
| Accept with different email | 403 `invite_email_mismatch` |
| Accept expired invite | 410 `invite_expired` |

## Projects, columns, and tasks

| Case | Expected |
| --- | --- |
| Create project in team | project belongs to team; seeds 3 columns (À faire / En cours / Terminé) |
| List/create columns | member of project’s team; `position` + `color_token` + `is_done` + optional `description` |
| PATCH column | rename / description / reorder / toggle `is_done` |
| PATCH columns/reorder | `{ items: [{ id, position }] }` persists horizontal order |
| DELETE column | forbidden if last column (`last_column`); tasks reassigned to a sibling |
| Create task | default first column; `kind` defaults to `task`; `status` derived from column (`is_done` → done) |
| Update `column_id` | refreshes derived `status` |
| Soft delete task | disappears from list/today; row keeps `deleted_at` |
| Today list | includes `is_today=true` or `scheduled_for=today`, excludes deleted |
| Today `mine_only=true` | assignee is current user or null |
| Reorder | `{ items: [{ id, column_id, position }] }` updates order intra/inter column |
| Create task link `depends_on` / `blocks` / `relates_to` | same project only; no self-link; `depends_on` means from depends on to |
| TaskOut `is_blocked` | `true` while any open `depends_on` target is not `done`; **informational only** (API still allows status/column changes) |
| TaskOut counts | `comments_count`, `links_count` |
| Delete link | member of project; removes row |
| Cross-team task access | 404 |
| PATCH /me | `display_name`, `locale`, `job_title`, `avatar_config` |
| Team description | nullable text on create/update; shown in sidebar team selector |
| Avatar UI | Blobatar `name` = email; visual via `avatar_config` (no seed text field) |
| Shell chrome | no ClickSpark / decorative canvas in app header |

## Comments, drawings, attachments

| Case | Expected |
| --- | --- |
| Add comment | stored; activity `comment_added` |
| Save drawing JSON | upsert one row per task; activity `drawing_updated` |
| Get drawing with none | null / empty body as API defines |
| Add attachment URL | label + url stored |
| Delete attachment as non-member | 404 |

## Focus and daily note

Focus endpoints remain available for API consumers but are **not** exposed in the Today UI.

| Case | Expected |
| --- | --- |
| Start focus | session for current user |
| End focus | sets `ended_at` |
| End another user’s session | 404 |
| Upsert daily note | one row per team+date; activity `daily_note` |
| Get note for day without entry | null |

## Stats

Stats endpoint returns counts derived from live non-deleted tasks only (`total_tasks`, `done_tasks`, `doing_tasks`, `today_tasks`, `project_count`). Never invent numbers in the UI.

## API surface (smoke)

- `GET /health` → `{ "status": "ok" }`
- `POST /auth/register|login|refresh|logout`
- `GET|PATCH /me`
- `POST|GET /teams`, `PATCH|DELETE /teams/{id}`, members, invites, accept
- `POST|GET /teams/{id}/projects`
- `GET /teams/{id}/today|activity|stats|daily-note`
- `PUT /teams/{id}/daily-note`
- `GET|POST /projects/{id}/columns`, `PATCH|DELETE /columns/{id}`
- `POST|GET /projects/{id}/tasks`, reorder (`column_id` + `position`)
- `GET|PATCH|DELETE /tasks/{id}`
- comments, subtasks, drawing, attachments, links
- `POST|GET /focus`, end focus

## Frontend E2E scenarios (manual outline)

1. Register → land on Default team + Général project → Today bento → mark task done → stats move.
2. Invite second user by email → accept invite link while logged in as invitee → appears in members.
3. Open project board → drag task between custom columns → reload → order persists.
4. Add / rename / delete a column (cannot delete the last one).
5. Owner deletes a team from the Team page → switches to another team or empty state handled.
6. Open task modal → edit title inline → add comment → drawing tab (Excalidraw) → reload → drawing still there.
7. Link task A `depends_on` B → A shows blocked badge while B is open → complete B → badge clears; A remains editable throughout.
8. Switch language FR ↔ EN → no hard-coded UI strings remain visible.
9. Settings: palette + theme only (no Adjuster) → surfaces update without hard refresh.
10. First session after register → onboarding spotlight → Skip / Done sets `reblochon-onboarded`.

## Error contract

API `detail` values are stable machine codes (`invalid_credentials`, `email_taken`, …). The frontend maps them through i18n. Do not assert on French copy in API tests.
