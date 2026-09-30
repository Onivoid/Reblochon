"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { MotionPresence, MotionSurface } from "@/components/ui/presence";
import { BodySecondary, Meta, Title } from "@/components/ui/typography";

export type ActivityEntry = {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actor?: { name: string; initials?: string; avatarSrc?: string };
  timestamp?: React.ReactNode;
  /** Machine-readable time matching the caller's timestamp label. */
  dateTime?: string;
  /** Optional visible group heading; shown where a consecutive group begins. */
  group?: string;
  badge?: { label: React.ReactNode; variant?: BadgeProps["variant"] };
  /** Additional supplied details or native actions, kept in document flow. */
  content?: React.ReactNode;
};
export type ActivityFeedProps = Omit<
  React.ComponentProps<"section">,
  "children" | "title"
> & {
  /** Caller supplies the chronological order; the feed never reorders entries. */
  entries: readonly ActivityEntry[];
  title?: React.ReactNode;
  description?: React.ReactNode;
  empty?: React.ReactNode;
  /** Omit to show every supplied entry, including later appends. */
  initialVisible?: number;
  pageSize?: number;
  showMoreLabel?: React.ReactNode;
};

function count(value: number | undefined, fallback: number) {
  return value !== undefined && Number.isFinite(value)
    ? Math.max(1, Math.floor(value))
    : fallback;
}

export function ActivityFeed({
  entries,
  title,
  description,
  empty,
  initialVisible,
  pageSize = 3,
  showMoreLabel,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": labelledBy,
  ...props
}: ActivityFeedProps) {
  const titleId = React.useId();
  const listId = React.useId();
  const list = React.useRef<HTMLOListElement>(null);
  const focusIndex = React.useRef<number | null>(null);
  const [windowState, setWindowState] = React.useState(() => ({
    ids: entries.map((entry) => entry.id),
    limit: count(initialVisible, Infinity),
  }));
  const ids = entries.map((entry) => entry.id);
  let limit = windowState.limit;
  if (
    ids.length !== windowState.ids.length ||
    ids.some((id, index) => id !== windowState.ids[index])
  ) {
    const oldFirst = windowState.ids[0],
      firstIndex = ids.indexOf(oldFirst),
      previous = new Set(windowState.ids);
    const prepended =
      firstIndex > 0
        ? ids.slice(0, firstIndex).filter((id) => !previous.has(id)).length
        : 0;
    limit += prepended;
    // Reconcile before committing the new list: existing entries never unmount
    // for a frame merely because a new update was prepended.
    setWindowState({ ids, limit });
  }
  const [announcement, setAnnouncement] = React.useState("");
  const visible = entries.slice(0, limit);
  const remaining = entries.length - visible.length;
  const nextPage = Math.min(remaining, count(pageSize, 3));
  React.useLayoutEffect(() => {
    if (focusIndex.current === null) return;
    list.current
      ?.querySelectorAll<HTMLElement>("[data-activity-entry]")
      [focusIndex.current]?.focus();
    focusIndex.current = null;
  }, [visible.length]);
  const reveal = () => {
    focusIndex.current = visible.length;
    const nextCount = visible.length + nextPage;
    setWindowState((value) => ({ ...value, limit: nextCount }));
    setAnnouncement(`${nextCount} of ${entries.length} activities shown.`);
  };
  return (
    <section
      {...props}
      data-slot="activity-feed"
      aria-label={ariaLabel ?? (!title && !labelledBy ? "Activity" : undefined)}
      aria-labelledby={labelledBy ?? (title ? titleId : undefined)}
      className={cn("v-activity-feed", className)}
    >
      {(title || description) && (
        <header className="v-activity-feed__header">
          {title && (
            <div className="v-activity-feed__heading">
              <Title id={titleId}>{title}</Title>
              <Badge
                variant="count"
                aria-label={`${entries.length} activities`}
              >
                {entries.length}
              </Badge>
            </div>
          )}
          {description && <BodySecondary as="div">{description}</BodySecondary>}
        </header>
      )}
      {entries.length === 0 ? (
        (empty ?? (
          <Empty>
            <EmptyTitle>No activity yet</EmptyTitle>
            <EmptyDescription>
              Updates appear here as they are added.
            </EmptyDescription>
          </Empty>
        ))
      ) : (
        <>
          <ol
            ref={list}
            id={listId}
            className="v-activity-feed__list"
            role="list"
          >
            <MotionPresence>
              {visible.map((entry, index) => (
                <MotionSurface key={entry.id} preset="rise" render={<li tabIndex={-1} data-activity-entry={entry.id} className="v-activity-feed__entry" />}>{entry.group &&
                                        entry.group !== visible[index - 1]?.group && (
                                          <div className="v-activity-feed__group">
                                            {entry.group}
                                          </div>
                                        )}<div
                                        className="v-activity-feed__portrait"
                                        aria-hidden="true"
                                      >
                                        {entry.actor ? (
                                          <Avatar variant="sm">
                                            {entry.actor.avatarSrc && (
                                              <AvatarImage src={entry.actor.avatarSrc} alt="" />
                                            )}
                                            <AvatarFallback>
                                              {entry.actor.initials ??
                                                entry.actor.name
                                                  .trim()
                                                  .split(/\s+/)
                                                  .slice(0, 2)
                                                  .map((part) => Array.from(part)[0])
                                                  .join("")}
                                            </AvatarFallback>
                                          </Avatar>
                                        ) : (
                                          <span className="v-activity-feed__marker">
                                            <AnimatedIcon
                                              name="sparkles"
                                              size="sm"
                                              preset="draw"
                                            />
                                          </span>
                                        )}
                                      </div><ItemContent className="v-activity-feed__content">
                                        <div className="v-activity-feed__entry-heading">
                                          <ItemTitle className="v-activity-feed__title">
                                            {entry.title}
                                          </ItemTitle>
                                          {entry.badge && (
                                            <Badge
                                              size="sm"
                                              variant={entry.badge.variant ?? "cream"}
                                              className="v-activity-feed__badge"
                                            >
                                              {entry.badge.label}
                                            </Badge>
                                          )}
                                        </div>
                                        {entry.description && (
                                          <ItemDescription className="v-activity-feed__description">
                                            {entry.description}
                                          </ItemDescription>
                                        )}
                                        {(entry.actor || entry.timestamp) && (
                                          <div className="v-activity-feed__meta">
                                            {entry.actor && <Meta>{entry.actor.name}</Meta>}
                                            {entry.actor && entry.timestamp && (
                                              <span aria-hidden="true">·</span>
                                            )}
                                            {entry.timestamp && (
                                              <time dateTime={entry.dateTime}>
                                                <Meta>{entry.timestamp}</Meta>
                                              </time>
                                            )}
                                          </div>
                                        )}
                                        {entry.content && (
                                          <div className="v-activity-feed__details">
                                            {entry.content}
                                          </div>
                                        )}
                                      </ItemContent></MotionSurface>
              ))}
            </MotionPresence>
          </ol>
          {remaining > 0 && (
            <footer className="v-activity-feed__footer">
              <Button
                variant="secondary"
                size="sm"
                aria-controls={listId}
                onClick={reveal}
              >
                <AnimatedIcon name="chevron-down" size="sm" preset="bounce" />
                {showMoreLabel ?? `Show ${nextPage} more`}
              </Button>
              <Meta>
                {visible.length} of {entries.length}
              </Meta>
            </footer>
          )}
        </>
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </section>
  );
}
