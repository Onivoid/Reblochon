"use client";
import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { useFlowGroup } from "@/lib/cojeev-motion/use-flow";
import { useMorph } from "@/lib/cojeev-motion/use-morph";
import { useChoreography } from "@/lib/cojeev-motion/choreography";
export type StepperPresentation = "rail" | "ledger" | "compact";
const StepperContext = React.createContext<{
  value: number;
  count: number;
  labels?: string[];
  presentation?: StepperPresentation;
  change: (value: number) => void;
} | null>(null);
export function useStepper() {
  const context = React.useContext(StepperContext);
  if (!context) throw new Error("Stepper parts must be inside Stepper");
  return context;
}
export type StepperProps = React.ComponentProps<"div"> & {
  value?: number;
  defaultValue?: number;
  count: number;
  labels?: string[];
  /** Optional composition; omitted callers retain the original vertical/horizontal list. */
  presentation?: StepperPresentation;
  onValueChange?: (value: number) => void;
};
export function Stepper({
  value,
  defaultValue = 1,
  count,
  labels,
  presentation,
  onValueChange,
  children,
  ...props
}: StepperProps) {
  const { quiet } = useChoreography();
  const [local, setLocal] = React.useState(defaultValue);
  const total = Math.max(1, Math.floor(Number.isFinite(count) ? count : 1));
  const current = Math.min(
    total,
    Math.max(
      1,
      Math.floor(Number.isFinite(value ?? local) ? (value ?? local) : 1),
    ),
  );
  const change = (next: number) => {
    if (!Number.isFinite(next)) return;
    next = Math.min(total, Math.max(1, Math.floor(next)));
    if (value === undefined) setLocal(next);
    if (next !== current) onValueChange?.(next);
  };
  return (
    <StepperContext.Provider
      value={{ value: current, count: total, labels, presentation, change }}
    >
      <div
        data-slot="stepper-provider"
        data-presentation={presentation}
        data-motion={quiet ? "off" : undefined}
        {...props}
      >
        {children}
      </div>
    </StepperContext.Provider>
  );
}
export const stepperVariants = cva(
  "v-stepper-flow grid gap-0 m-0 p-0 list-none [counter-reset:none]",
);
export type StepperListProps = React.ComponentProps<"ol"> & {
  orientation?: "vertical" | "horizontal";
};
export function StepperList({
  ref,
  className,
  orientation = "vertical",
  ...props
}: StepperListProps) {
  const context = React.useContext(StepperContext);
  const flowRef = useFlowGroup<HTMLOListElement>(ref);
  return (
    <ol
      ref={flowRef}
      data-slot="stepper"
      data-part="root"
      data-stepper=""
      data-orientation={orientation}
      data-flow={
        context?.presentation || orientation === "horizontal"
          ? "off"
          : undefined
      }
      className={cn(stepperVariants(), className)}
      {...props}
    />
  );
}
export type StepperItemProps = React.ComponentProps<"li"> & { step: number };
export function StepperItem({ step, className, ...props }: StepperItemProps) {
  const context = useStepper();
  return (
    <li
      data-slot="stepper-item"
      data-part="item"
      aria-current={step === context.value ? "step" : undefined}
      data-state={
        step < context.value
          ? "complete"
          : step === context.value
            ? "active"
            : "inactive"
      }
      className={cn(
        "v-step relative grid grid-cols-[38px_minmax(0,1fr)] items-center gap-[var(--s-4)] py-[var(--s-2)] min-h-[54px] list-none",
        step < context.value && "-done",
        step === context.value && "-on",
        className,
      )}
      {...props}
    />
  );
}
export type StepperIndicatorProps = React.ComponentProps<"span"> & {
  step: number;
};
export function StepperIndicator({
  step,
  ref,
  className,
  children,
  ...props
}: StepperIndicatorProps) {
  const context = useStepper();
  const morphRef = useMorph<HTMLSpanElement>("buttons", ref);
  return (
    <span
      ref={morphRef}
      data-morph={
        context.presentation && step === context.value ? "fill" : "none"
      }
      data-stable-hit=""
      data-r="14"
      data-slot="stepper-indicator"
      data-part="indicator"
      className={cn(
        "v-step__n relative z-[1] col-start-1 grid place-items-center size-[38px] [border-radius:50%] text-[length:var(--fs-control)] font-semibold tabular-nums bg-[var(--v-canvas)] text-[color:var(--v-text-2)] [box-shadow:inset_0_0_0_1.5px_var(--v-edge)]",
        className,
      )}
      {...props}
    >
      {children ??
        (step < context.value ? (
          <AnimatedIcon name="check" preset="validation" />
        ) : (
          step
        ))}
    </span>
  );
}
export type StepperTitleProps = React.ComponentProps<"span">;
export function StepperTitle({ className, ...props }: StepperTitleProps) {
  return (
    <span
      data-slot="stepper-title"
      data-part="label"
      className={cn(
        "v-step__t col-start-2 text-[length:var(--fs-body)] leading-[1.35] text-[color:var(--v-text-2)]",
        className,
      )}
      {...props}
    />
  );
}
export type StepperTriggerProps = ButtonProps & {
  step: number;
  /** Explicitly permit navigation to unfinished steps. Validation stays with the caller. */
  allowFuture?: boolean;
};
export function StepperTrigger({
  step,
  allowFuture = false,
  disabled,
  onClick,
  ...props
}: StepperTriggerProps) {
  const context = useStepper();
  const blocked =
    !Number.isInteger(step) ||
    step < 1 ||
    step > context.count ||
    (!allowFuture && step > context.value);
  return (
    <Button
      variant="ghost"
      {...props}
      data-slot="stepper-trigger"
      data-morph="none"
      data-stable-hit=""
      disabled={disabled || blocked}
      aria-current={step === context.value ? "step" : undefined}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) context.change(step);
      }}
    />
  );
}
export type StepperPreviousProps = ButtonProps;
export function StepperPrevious({
  onClick,
  children,
  disabled,
  ...props
}: StepperPreviousProps) {
  const context = useStepper();
  return (
    <Button
      variant="secondary"
      disabled={disabled || context.value === 1}
      data-stable-hit=""
      data-step-back=""
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) context.change(context.value - 1);
      }}
      {...props}
    >
      {children ?? "Back"}
    </Button>
  );
}
export type StepperNextProps = ButtonProps;
export function StepperNext({
  onClick,
  children,
  disabled,
  ...props
}: StepperNextProps) {
  const context = useStepper();
  return (
    <Button
      disabled={disabled || context.value === context.count}
      data-stable-hit=""
      data-step-next=""
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) context.change(context.value + 1);
      }}
      {...props}
    >
      {children ?? "Next"}
    </Button>
  );
}
export type StepperStatusProps = React.ComponentProps<"span">;
export function StepperStatus({
  className,
  children,
  ...props
}: StepperStatusProps) {
  const context = useStepper();
  return (
    <span
      data-slot="stepper-status"
      data-step-say=""
      role="status"
      className={cn(
        "v-quiet text-[length:var(--fs-meta)] text-[color:var(--v-text-2)]",
        className,
      )}
      {...props}
    >
      {children ??
        `Stage ${context.value} of ${context.count}${context.labels?.[context.value - 1] ? ` · ${context.labels[context.value - 1]}` : ""}`}
    </span>
  );
}
