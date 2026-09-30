"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useChoreography } from "@/lib/cojeev-motion/choreography";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperList,
  StepperTitle,
} from "@/components/ui/stepper";
import { BodySecondary, Meta, Title } from "@/components/ui/typography";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export type MilestoneState = "complete" | "current" | "upcoming";
export type Milestone = {
  /** Stable identity, independent of display text and array position. */
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  state: MilestoneState;
  meta?: React.ReactNode;
  /** Disables the optional selection button; does not change progress. */
  disabled?: boolean;
};
export type MilestonePathProps = Omit<
  React.ComponentProps<"section">,
  "children" | "title"
> & {
  /** Ordered journey. Supply at most one current milestone. */
  items: readonly Milestone[];
  title?: React.ReactNode;
  description?: React.ReactNode;
  empty?: React.ReactNode;
  statusLabels?: Partial<Record<MilestoneState, React.ReactNode>>;
  /** Makes titles native buttons. Progress remains owned by the caller. */
  onMilestoneSelect?: (id: string) => void;
  /** Omit for the original vertical composition. */
  presentation?: "journey" | "sequence" | "review";
};

const stateLabels: Record<MilestoneState, string> = {
  complete: "Completed",
  current: "In progress",
  upcoming: "Upcoming",
};
const connection = "M18 0 C18 26 21 31 18 50 C15 69 18 75 18 100";

export function MilestonePath({
  items,
  title,
  description,
  empty,
  statusLabels,
  onMilestoneSelect,
  presentation,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": labelledBy,
  ...props
}: MilestonePathProps) {
  const titleId = React.useId();
  const { quiet, transition } = useChoreography();
  const currentIndex = items.findIndex((item) => item.state === "current");
  const upcomingIndex = items.findIndex((item) => item.state === "upcoming");
  // One terminal provider slot represents a finished journey without a fake
  // current item. Per-item states remain authoritative for mixed histories.
  const position =
    currentIndex >= 0
      ? currentIndex + 1
      : upcomingIndex >= 0
        ? upcomingIndex + 1
        : items.length + 1;
  const list = (
    <StepperList
      className="v-milestone-path__list"
      role="list"
      data-no-glide=""
      data-flow="off"
    >
      {items.map((item, index) => (
        <StepperItem
          key={item.id}
          step={index + 1}
          data-milestone-id={item.id}
          data-state={item.state}
          aria-current={item.state === "current" ? "step" : undefined}
          className="v-milestone-path__item"
        >
          {index < items.length - 1 && (
            <svg
              aria-hidden="true"
              className="v-milestone-path__connection"
              viewBox={
                presentation === "sequence" ? "0 0 100 36" : "0 0 36 100"
              }
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                d={
                  presentation === "sequence"
                    ? "M0 18 C26 18 31 21 50 18 C69 15 75 18 100 18"
                    : connection
                }
                className="v-milestone-path__track"
                vectorEffect="non-scaling-stroke"
              />
              <motion.path
                d={
                  presentation === "sequence"
                    ? "M0 18 C26 18 31 21 50 18 C69 15 75 18 100 18"
                    : connection
                }
                className="v-milestone-path__progress"
                vectorEffect="non-scaling-stroke"
                initial={false}
                animate={{ opacity: item.state === "complete" ? 1 : 0 }}
                transition={quiet ? { duration: 0 } : transition}
              />
            </svg>
          )}
          <StepperIndicator
            step={index + 1}
            className="v-milestone-path__marker"
            aria-hidden="true"
            data-morph={
              presentation && item.state === "current" ? "fill" : "none"
            }
          >
            {item.state === "complete" ? (
              <AnimatedIcon name="check" preset="validation" size="sm" />
            ) : (
              <span>{index + 1}</span>
            )}
          </StepperIndicator>
          <div className="v-milestone-path__content">
            <div className="v-milestone-path__heading">
              <StepperTitle className="v-milestone-path__title">
                {onMilestoneSelect ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={item.disabled}
                    data-morph="none"
                    data-flow="off"
                    data-stable-hit=""
                    className="v-milestone-path__select"
                    onClick={() => onMilestoneSelect(item.id)}
                  >
                    {item.title}
                  </Button>
                ) : (
                  item.title
                )}
              </StepperTitle>
              <Badge
                size="sm"
                variant={
                  item.state === "complete"
                    ? "olive-soft"
                    : item.state === "current"
                      ? "pink-soft"
                      : "cream"
                }
                className="v-milestone-path__status"
              >
                {statusLabels?.[item.state] ?? stateLabels[item.state]}
              </Badge>
            </div>
            {item.description && (
              <BodySecondary as="div" className="v-milestone-path__description">
                {item.description}
              </BodySecondary>
            )}
            {item.meta && (
              <Meta className="v-milestone-path__meta">{item.meta}</Meta>
            )}
          </div>
        </StepperItem>
      ))}
    </StepperList>
  );
  return (
    <section
      {...props}
      data-slot="milestone-path"
      data-presentation={presentation}
      data-motion-quiet={quiet || undefined}
      aria-label={
        ariaLabel ?? (!title && !labelledBy ? "Milestones" : undefined)
      }
      aria-labelledby={labelledBy ?? (title ? titleId : undefined)}
      className={cn("v-milestone-path", className)}
    >
      {(title || description) && (
        <header className="v-milestone-path__header">
          {title && <Title id={titleId}>{title}</Title>}
          {description && <BodySecondary as="div">{description}</BodySecondary>}
        </header>
      )}
      {items.length === 0 ? (
        (empty ?? (
          <Empty>
            <EmptyTitle>No milestones yet</EmptyTitle>
            <EmptyDescription>
              Add the steps that matter to this journey.
            </EmptyDescription>
          </Empty>
        ))
      ) : (
        <Stepper value={position} count={items.length + 1}>
          {presentation === "sequence" ? (
            <>
              <ScrollArea
                variant="plain"
                className="v-milestone-path__scroll"
                aria-label="Milestone sequence"
                viewportProps={{ style: { height: "auto" } }}
                viewportWrapper={(viewport) => (
                  <>
                    {viewport}
                    <ScrollBar orientation="horizontal" />
                  </>
                )}
              >
                {list}
              </ScrollArea>
              <Meta className="v-milestone-path__scroll-note">
                Scroll to explore ·{" "}
                {items.filter((item) => item.state === "complete").length} of{" "}
                {items.length} completed
              </Meta>
            </>
          ) : (
            list
          )}
        </Stepper>
      )}
    </section>
  );
}
