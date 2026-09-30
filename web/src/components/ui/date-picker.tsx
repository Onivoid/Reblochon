"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { controlRadiusStyle, type ControlAppearanceProps } from "@/lib/cojeev/control-appearance";
import { Calendar, type CalendarSingleProps, type CalendarRangeProps, type CalendarMultipleProps, type DateRange } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { ScrollAreaList } from "@/components/ui/scroll-area";
import { useMorph } from "@/lib/cojeev-motion/use-morph";
import { useFlowPress } from "@/lib/cojeev-motion/flow-press";
export const datePickerVariants = cva("v-menuhost [display:inline-block]");
type DatePickerBaseProps = Omit<React.ComponentProps<"div">, "defaultValue" | "onChange"> & ControlAppearanceProps & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Format each day; ranges and multiple summaries reuse this formatter. */
  formatDate?: (date: Date) => string;
  triggerProps?: React.ComponentProps<"button">;
  clearLabel?: string;
  doneLabel?: string;
};
export type DatePickerSingleProps = DatePickerBaseProps & {
  mode?: "single";
  date?: Date;
  defaultDate?: Date;
  onDateChange?: (date: Date | undefined) => void;
  calendarProps?: Omit<CalendarSingleProps, "selected" | "onSelect" | "mode" | "defaultSelected">;
};
export type DatePickerRangeProps = DatePickerBaseProps & {
  mode: "range";
  date?: DateRange;
  defaultDate?: DateRange;
  onDateChange?: (range: DateRange | undefined) => void;
  /** Range pickers default to one night; set min=0 to allow a one-day range. */
  calendarProps?: Omit<CalendarRangeProps, "selected" | "onSelect" | "mode" | "defaultSelected">;
};
export type DatePickerMultipleProps = DatePickerBaseProps & {
  mode: "multiple";
  date?: Date[];
  defaultDate?: Date[];
  onDateChange?: (dates: Date[] | undefined) => void;
  calendarProps?: Omit<CalendarMultipleProps, "selected" | "onSelect" | "mode" | "defaultSelected">;
};
export type DatePickerProps = DatePickerSingleProps | DatePickerRangeProps | DatePickerMultipleProps;
type DateSelection = Date | DateRange | Date[] | undefined;

export function DatePicker(datePickerProps: DatePickerProps) {
  const {
    radius, appearance, style, className, mode = "single", date, defaultDate,
    onDateChange, open, defaultOpen = false, onOpenChange,
    placeholder = "Pick a date", disabled, calendarProps,
    formatDate = (date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    triggerProps, clearLabel = "Clear dates", doneLabel = "Done", ...props
  } = datePickerProps;
  const [internal, setInternal] = React.useState({ mode, value: defaultDate });
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const value = Object.prototype.hasOwnProperty.call(datePickerProps, "date") ? date : internal.mode === mode ? internal.value : defaultDate;
  const setOpen = (next: boolean) => { setInternalOpen(next); onOpenChange?.(next); };
  const change = (next: DateSelection) => {
    setInternal({ mode, value: next });
    if (mode === "range") (onDateChange as DatePickerRangeProps["onDateChange"])?.(next as DateRange | undefined);
    else if (mode === "multiple") (onDateChange as DatePickerMultipleProps["onDateChange"])?.(next as Date[] | undefined);
    else (onDateChange as DatePickerSingleProps["onDateChange"])?.(next as Date | undefined);
  };
  let summary: string = placeholder;
  let initialMonth: Date | undefined;
  let calendar: React.ReactNode;
  let hasValue = false;
  if (mode === "range") {
    const range = value as DateRange | undefined;
    initialMonth = range?.from;
    hasValue = !!range?.from;
    summary = range?.from ? `${formatDate(range.from)} – ${range.to ? formatDate(range.to) : "Choose end"}` : placeholder;
    calendar = <Calendar autoFocus defaultMonth={initialMonth} min={1} {...(calendarProps as DatePickerRangeProps["calendarProps"])} mode="range" selected={range} onSelect={next => { change(next); if (next?.from && next.to) setOpen(false); }} />;
  } else if (mode === "multiple") {
    const dates = value as Date[] | undefined;
    initialMonth = dates?.[0];
    hasValue = !!dates?.length;
    summary = dates?.length ? `${dates.length} ${dates.length === 1 ? "day" : "days"} selected` : placeholder;
    calendar = <Calendar autoFocus defaultMonth={initialMonth} {...(calendarProps as DatePickerMultipleProps["calendarProps"])} mode="multiple" selected={dates} onSelect={change} />;
  } else {
    const selected = value as Date | undefined;
    initialMonth = selected;
    hasValue = !!selected;
    summary = selected ? formatDate(selected) : placeholder;
    calendar = <Calendar autoFocus defaultMonth={initialMonth} {...(calendarProps as DatePickerSingleProps["calendarProps"])} selected={selected} onSelect={next => { change(next); setOpen(false); }} />;
  }
  const clearDisabled = !hasValue || calendarProps?.required || (mode === "multiple" && ((calendarProps as DatePickerMultipleProps["calendarProps"])?.min ?? 0) > 0);
  return <Popover open={!disabled && (open ?? internalOpen)} onOpenChange={setOpen}>
    <div data-slot="date-picker" data-selection-mode={mode} data-appearance={appearance} style={{ ...style, ...controlRadiusStyle(radius) }} data-part="root" data-datepicker="" className={cn(datePickerVariants(), className)} {...props}>
      <DatePickerTrigger appearance={appearance} disabled={disabled} {...triggerProps}>
        <Icon name="calendar" /><span data-value="">{summary}</span><Icon name="chevron-down" />
      </DatePickerTrigger>
      <DatePickerContent>
        <ScrollAreaList className="v-datepicker__scroll" maxHeight="max(160px, calc(var(--radix-popover-content-available-height, 80dvh) - 112px))" viewportProps={{ "aria-label": "Choose dates", tabIndex: -1 }}>
          {calendar}
        </ScrollAreaList>
        <div className="v-datepicker__footer">
          <Button size="sm" variant="ghost" disabled={clearDisabled} onClick={() => { change(undefined); setOpen(false); }}>{clearLabel}</Button>
          {mode === "multiple" ? <Button size="sm" onClick={() => setOpen(false)}>{doneLabel}</Button> : <span className="v-datepicker__hint">{mode === "range" ? "Choose a start and end" : "Choose one day"}</span>}
        </div>
      </DatePickerContent>
    </div>
  </Popover>;
}
export type DatePickerTriggerProps = React.ComponentProps<typeof PopoverTrigger> & ControlAppearanceProps;
export function DatePickerTrigger({
  radius, appearance, style,
  className,
  ref,
  ...props
}: DatePickerTriggerProps) {
  const morphRef = useMorph<HTMLButtonElement>("buttons", ref);
  const pressRef = useFlowPress(morphRef);
  return (
    <PopoverTrigger
      ref={pressRef}
      data-slot="date-picker-trigger"
      data-motion={appearance === "editorial" ? "off" : undefined}
      data-appearance={appearance}
      style={{ ...style, ...controlRadiusStyle(radius) }}
      data-part="trigger"
      className={cn("v-select", className)}
      {...props}
    />
  );
}
export type DatePickerContentProps = React.ComponentProps<
  typeof PopoverContent
>;
export function DatePickerContent({
  className,
  ...props
}: DatePickerContentProps) {
  return (
    <PopoverContent
      data-slot="date-picker-content"
      data-part="content"
      align="start"
      sideOffset={8}
      collisionPadding={12}
      className={className}
      {...props}
    />
  );
}
