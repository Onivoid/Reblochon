"use client";

import * as React from "react";
import { useMorph } from "@/lib/cojeev-motion/use-morph";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import * as Primitive from "@radix-ui/react-hover-card";
import { useFlowAppearance } from "@/lib/cojeev-motion/use-flow";
import { ScrollArea } from "@/components/ui/scroll-area";
export type HoverCardProps = React.ComponentProps<typeof Primitive.Root>;
export function HoverCard(props: HoverCardProps) {
  return <Primitive.Root openDelay={300} closeDelay={150} {...props} />;
}
export type HoverCardTriggerProps = React.ComponentProps<
  typeof Primitive.Trigger
>;
export function HoverCardTrigger(props: HoverCardTriggerProps) {
  return (
    <Primitive.Trigger
      data-slot="hover-card-trigger"
      data-part="trigger"
      {...props}
    />
  );
}
export type HoverCardPortalProps = React.ComponentProps<
  typeof Primitive.Portal
>;
export function HoverCardPortal(props: HoverCardPortalProps) {
  return <Primitive.Portal {...props} />;
}
export const hoverCardContentVariants = cva(
  "v-popover [background:var(--popover)] [border-radius:var(--r-card)] [padding:var(--s-5)] [box-shadow:var(--shadow-float)] [border:1px_solid_var(--v-border)]",
);
export type HoverCardContentProps = React.ComponentProps<
  typeof Primitive.Content
> & {
  portal?: boolean;
  appearance?: "identity" | "preview" | "media";
  scrollable?: boolean;
};
export function HoverCardContent({
  className,
  ref,
  children,
  sideOffset = 8,
  align = "start",
  collisionPadding = 8,
  portal = true,
  appearance,
  scrollable = !!appearance,
  ...props
}: HoverCardContentProps) {
  const morphRef = useMorph<HTMLDivElement>("surfaces", ref);
  const flowRef = useFlowAppearance<HTMLDivElement>(true, morphRef, "grow");
  const ownsScroll = scrollable && !props.asChild;
  const content = (
    <Primitive.Content
      ref={flowRef}
      data-slot="hover-card-content"
      data-part="content"
      data-appearance={appearance}
      data-morph={appearance ? "both" : undefined}
      data-r={appearance ? "css" : undefined}
      data-scrollable={ownsScroll || undefined}
      sideOffset={sideOffset}
      align={align}
      collisionPadding={collisionPadding}
      className={cn(hoverCardContentVariants(), className)}
      {...props}
    >
      {ownsScroll ? (
        <ScrollArea
          variant="plain"
          className="v-hovercard-scroll"
          viewportProps={{ "aria-label": "Preview details" }}
        >
          {children}
        </ScrollArea>
      ) : (
        children
      )}
    </Primitive.Content>
  );
  return portal ? <Primitive.Portal>{content}</Primitive.Portal> : content;
}
