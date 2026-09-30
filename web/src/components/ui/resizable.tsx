"use client";

import * as React from "react";
import { useMorph } from "@/lib/cojeev-motion/use-morph";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import * as Primitive from "react-resizable-panels";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
export const resizableVariants = cva(
  "v-resizable [height:var(--h,240px)] [background:var(--card)] [border-radius:var(--r-panel)] [overflow:hidden] [box-shadow:inset_0_0_0_1px_var(--v-border)] [isolation:isolate] flex",
  {
    variants: { variant: { default: "", v: "-v" } },
    defaultVariants: { variant: "default" },
  },
);
export type ResizablePanelGroupProps = React.ComponentProps<
  typeof Primitive.Group
> &
  VariantProps<typeof resizableVariants> & {
    direction?: "horizontal" | "vertical";
  };
export function ResizablePanelGroup({
  className,
  variant,
  direction,
  orientation,
  elementRef,
  style,
  ...props
}: ResizablePanelGroupProps) {
  const morphRef = useMorph<HTMLDivElement>("cards", elementRef);
  const resolved =
    orientation ?? direction ?? (variant === "v" ? "vertical" : "horizontal");
  return (
    <Primitive.Group
      elementRef={morphRef}
      data-slot="resizable"
      data-part="root"
      data-resizable=""
      orientation={resolved}
      style={{ height: "var(--h,240px)", ...style }}
      className={cn(
        resizableVariants({
          variant: resolved === "vertical" ? "v" : "default",
        }),
        className,
      )}
      {...props}
    />
  );
}
export type ResizablePanelProps = React.ComponentProps<typeof Primitive.Panel>;
export function ResizablePanel({
  className,
  children,
  minSize = "15%",
  maxSize = "85%",
  ...props
}: ResizablePanelProps) {
  return (
    <Primitive.Panel
      data-slot="resizable-panel"
      data-part="content"
      minSize={minSize}
      maxSize={maxSize}
      className={cn("v-resizable__pane min-w-0 overflow-hidden", className)}
      {...props}
    >
      <ScrollArea
        variant="plain"
        className="v-resizable__scroll"
        viewportProps={{
          "aria-label": props["aria-label"] ?? "Resizable panel content",
        }}
        viewportWrapper={(viewport) => (
          <>
            {viewport}
            <ScrollBar orientation="horizontal" />
          </>
        )}
      >
        {children}
      </ScrollArea>
    </Primitive.Panel>
  );
}
export type ResizableHandleProps = React.ComponentProps<
  typeof Primitive.Separator
> & { withHandle?: boolean };
export function ResizableHandle({
  className,
  withHandle = true,
  children,
  ...props
}: ResizableHandleProps) {
  return (
    <Primitive.Separator
      data-slot="resizable-handle"
      data-part="thumb"
      data-with-handle={withHandle || undefined}
      className={cn(
        "v-resizable__handle grid place-items-center touch-none shrink-0 basis-2",
        className,
      )}
      {...props}
    >
      {children}
    </Primitive.Separator>
  );
}
