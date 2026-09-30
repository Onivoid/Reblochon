"use client";

import * as React from "react";
import { LayoutGroup, motion } from "motion/react";
import { useMorph } from "@/lib/cojeev-motion/use-morph";
import {
  DayPicker,
  useDayPicker,
  type PropsBase,
  type DayPickerProps,
  type DateRange,
  type Matcher,
  type DayButtonProps,
  type MonthCaptionProps,
  type MonthGridProps,
  type WeekNumberProps,
  type WeekdayProps,
  type WeekNumberHeaderProps,
  type RootProps,
} from "react-day-picker";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Icon, IconButton } from "@/components/ui/icon";
import {
  motionTokens,
  useChoreography,
} from "@/lib/cojeev-motion/choreography";
import { assignMotionRef } from "@/lib/cojeev-motion/refs";
export type CalendarMark = "pink" | "blue" | "olive" | "yellow" | "ink";
const MarksContext = React.createContext<Record<string, CalendarMark>>({});
const SelectionModeContext = React.createContext<
  "single" | "range" | "multiple"
>("single");
// Related, legible silhouettes: selection has a finite contour change, while
// the native day button and its focus target never move or change shape.
const selectionContours = [
  "43% 57% 48% 52% / 55% 44% 56% 45%",
  "55% 45% 58% 42% / 44% 54% 46% 56%",
  "48% 52% 41% 59% / 59% 45% 55% 41%",
  "58% 42% 53% 47% / 47% 59% 41% 53%",
];
export const calendarVariants = cva("v-cal [display:grid] [gap:var(--s-4)]");
type CalendarBaseProps = Omit<
  PropsBase,
  "mode" | "onSelect" | "selected" | "disabled" | "required"
> & {
  disabled?: Matcher | Matcher[];
  marks?: Record<string, CalendarMark>;
  required?: boolean;
};
export type CalendarSingleProps = CalendarBaseProps & {
  mode?: "single";
  selected?: Date;
  defaultSelected?: Date;
  onSelect?: (date: Date | undefined) => void;
};
export type CalendarRangeProps = CalendarBaseProps & {
  mode: "range";
  selected?: DateRange;
  defaultSelected?: DateRange;
  onSelect?: (range: DateRange | undefined) => void;
  min?: number;
  max?: number;
  excludeDisabled?: boolean;
  resetOnSelect?: boolean;
};
export type CalendarMultipleProps = CalendarBaseProps & {
  mode: "multiple";
  selected?: Date[];
  defaultSelected?: Date[];
  onSelect?: (dates: Date[] | undefined) => void;
  min?: number;
  max?: number;
};
export type CalendarProps =
  | CalendarSingleProps
  | CalendarRangeProps
  | CalendarMultipleProps;
export type { DateRange };
export function Calendar(calendarProps: CalendarProps) {
  const {
    className,
    selected,
    defaultSelected,
    onSelect,
    marks = {},
    classNames,
    components,
    mode = "single",
    required = false,
    animate = true,
    style,
    ...props
  } = calendarProps;
  const { quiet } = useChoreography();
  const layoutId = React.useId();
  const [internal, setInternal] = React.useState({
    mode,
    value: defaultSelected,
  });
  const controlled = Object.prototype.hasOwnProperty.call(
    calendarProps,
    "selected",
  );
  const current = controlled
    ? selected
    : internal.mode === mode
      ? internal.value
      : defaultSelected;
  const selection =
    mode === "range"
      ? {
          mode,
          selected: current as DateRange | undefined,
          onSelect: (date: DateRange | undefined) => {
            setInternal({ mode, value: date });
            (onSelect as CalendarRangeProps["onSelect"])?.(date);
          },
        }
      : mode === "multiple"
        ? {
            mode,
            selected: current as Date[] | undefined,
            onSelect: (date: Date[] | undefined) => {
              setInternal({ mode, value: date });
              (onSelect as CalendarMultipleProps["onSelect"])?.(date);
            },
          }
        : {
            mode,
            selected: current as Date | undefined,
            onSelect: (date: Date | undefined) => {
              setInternal({ mode, value: date });
              (onSelect as CalendarSingleProps["onSelect"])?.(date);
            },
          };
  // The public legacy required:boolean API is broader than DayPicker's literal
  // required discriminant. Values/callbacks above are still paired by mode.
  const selectionProps = { ...selection, required } as DayPickerProps;
  return (
    <LayoutGroup id={layoutId}>
      <SelectionModeContext.Provider value={mode}>
        <MarksContext.Provider value={marks}>
          <DayPicker
            {...selectionProps}
            showWeekNumber
            weekStartsOn={1}
            ISOWeek
            showOutsideDays={false}
            hideNavigation
            animate={animate && !quiet}
            data-slot="calendar"
            data-selection-mode={mode}
            data-part="root"
            data-cal=""
            className={cn(calendarVariants(), className)}
            style={
              {
                ...style,
                "--v-calendar-duration": `${quiet ? 0 : motionTokens.duration.enter}s`,
                "--v-calendar-ease": `cubic-bezier(${motionTokens.ease.enter.join(",")})`,
              } as React.CSSProperties
            }
            classNames={{
              months: "v-cal__months",
              month: "v-cal__month-wrap",
              month_caption: "v-cal__head",
              month_grid: "v-cal__grid",
              weekday: "v-cal__wd",
              week_number: "v-cal__wk",
              week_number_header: "v-cal__wd -wk",
              day_button: "v-cal__d",
              weeks_before_enter: "v-cal__weeks-before-enter",
              weeks_after_enter: "v-cal__weeks-after-enter",
              weeks_before_exit: "v-cal__weeks-before-exit",
              weeks_after_exit: "v-cal__weeks-after-exit",
              caption_before_enter: "v-cal__caption-enter",
              caption_after_enter: "v-cal__caption-enter",
              caption_before_exit: "v-cal__caption-exit",
              caption_after_exit: "v-cal__caption-exit",
              ...classNames,
            }}
            formatters={{
              formatWeekdayName: (date) =>
                date
                  .toLocaleDateString("en", { weekday: "short" })
                  .slice(0, 2)
                  .toUpperCase(),
              formatWeekNumberHeader: () => "WK",
            }}
            components={{
              Root: CalendarRoot,
              MonthCaption: CalendarCaption,
              DayButton: CalendarDayButton,
              MonthGrid: CalendarGrid,
              WeekNumber: CalendarWeekNumber,
              Weekday: CalendarWeekday,
              WeekNumberHeader: CalendarWeekNumberHeader,
              ...components,
            }}
            {...props}
          />
        </MarksContext.Provider>
      </SelectionModeContext.Provider>
    </LayoutGroup>
  );
}

/** DayPicker retains an aria-hidden DOM snapshot during its finite month exit. */
function CalendarRoot({ rootRef, ...props }: RootProps) {
  const host = React.useRef<HTMLDivElement>(null);
  const ref = React.useCallback(
    (node: HTMLDivElement | null) => {
      host.current = node;
      const release = assignMotionRef(rootRef, node);
      return () => {
        host.current = null;
        release();
      };
    },
    [rootRef],
  );
  React.useLayoutEffect(() => {
    const root = host.current;
    if (!root) return;
    const protectSnapshots = () =>
      root
        .querySelectorAll<HTMLElement>(
          '[data-animated-month][aria-hidden="true"]',
        )
        .forEach((snapshot) => {
          snapshot.inert = true;
          snapshot
            .querySelectorAll("[id]")
            .forEach((element) => element.removeAttribute("id"));
        });
    const observer = new MutationObserver(protectSnapshots);
    observer.observe(root, { childList: true, subtree: true });
    protectSnapshots();
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} {...props} />;
}
export function CalendarCaption({
  calendarMonth,
  displayIndex,
  className,
  ...props
}: MonthCaptionProps) {
  const { goToMonth, previousMonth, nextMonth } = useDayPicker();
  const month = calendarMonth.date;
  return (
    <div
      data-slot="calendar-header"
      data-month-index={displayIndex}
      data-part="header"
      className={cn("v-cal__head", className)}
      {...props}
    >
      <span
        data-slot="calendar-caption"
        className="v-cal__month"
        aria-live="polite"
      >
        <b>{month.toLocaleDateString("en", { month: "long" })}</b>
        <span>{month.getFullYear()}</span>
      </span>
      <span data-slot="calendar-nav" className="v-cal__nav">
        <IconButton
          data-slot="calendar-previous"
          data-part="trigger"
          size="sm"
          aria-label="Previous month"
          disabled={!previousMonth}
          onClick={() => previousMonth && goToMonth(previousMonth)}
        >
          <Icon name="chevron-left" />
        </IconButton>
        <IconButton
          data-slot="calendar-next"
          data-part="trigger"
          size="sm"
          aria-label="Next month"
          disabled={!nextMonth}
          onClick={() => nextMonth && goToMonth(nextMonth)}
        >
          <Icon name="chevron-right" />
        </IconButton>
      </span>
    </div>
  );
}
export function CalendarGrid({ className, ...props }: MonthGridProps) {
  return (
    <table
      data-flow="off"
      data-slot="calendar-grid"
      data-part="viewport"
      className={cn("v-cal__grid", className)}
      {...props}
    />
  );
}
export function CalendarDayButton({
  day,
  modifiers,
  className,
  children,
  ...props
}: DayButtonProps) {
  const marks = React.useContext(MarksContext);
  const mode = React.useContext(SelectionModeContext);
  const { quiet } = useChoreography();
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);
  const date = day.date;
  const contour = selectionContours[date.getDate() % selectionContours.length];
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const mark = marks[iso];
  return (
    <button
      ref={ref}
      data-slot="calendar-day"
      data-part="item"
      data-d={date.getDate()}
      data-date={iso}
      data-outside={modifiers.outside || undefined}
      data-today={modifiers.today || undefined}
      data-range-start={modifiers.range_start || undefined}
      data-range-middle={modifiers.range_middle || undefined}
      data-range-end={modifiers.range_end || undefined}
      data-state={modifiers.selected ? "active" : "inactive"}
      aria-pressed={modifiers.selected || undefined}
      className={cn(
        "v-cal__d",
        (date.getDay() === 0 || date.getDay() === 6) && "-off",
        modifiers.today && "-today",
        className,
      )}
      {...props}
    >
      {modifiers.selected && !modifiers.range_middle && (
        <motion.span
          data-slot="calendar-selection"
          aria-hidden="true"
          className="v-cal__selection"
          layoutId={mode === "single" && !quiet ? "selected-day" : undefined}
          initial={
            quiet
              ? false
              : {
                  opacity: 0,
                  scale: 0.9,
                  borderRadius: "50% 50% 50% 50% / 50% 50% 50% 50%",
                }
          }
          animate={{ opacity: 1, scale: 1, borderRadius: contour }}
          transition={{
            duration: quiet ? 0 : motionTokens.duration.enter,
            ease: motionTokens.ease.enter,
          }}
        />
      )}
      <span>{children}</span>
      {mark && (
        <i
          data-slot="calendar-mark"
          className={`v-cal__mark -${mark}`}
          aria-label="Marked day"
        />
      )}
    </button>
  );
}
export function CalendarWeekNumber({
  week,
  className,
  ...props
}: WeekNumberProps) {
  const { isSelected } = useDayPicker();
  const active = week.days.some((day) => isSelected?.(day.date));
  const weekRef = useMorph<HTMLTableCellElement>("pills");
  return (
    <th
      ref={weekRef}
      data-slot="calendar-week-number"
      className={cn("v-cal__wk", active && "-on", className)}
      {...props}
    />
  );
}

function CalendarWeekday(props: WeekdayProps) {
  return <th data-slot="calendar-weekday" {...props} />;
}

function CalendarWeekNumberHeader(props: WeekNumberHeaderProps) {
  return <th data-slot="calendar-week-number-header" {...props} />;
}
