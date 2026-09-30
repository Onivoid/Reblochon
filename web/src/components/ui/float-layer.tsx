"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { animate, motion, useMotionValue, useScroll, useSpring, useTransform, type HTMLMotionProps, type MotionStyle } from "motion/react";
import { cn } from "@/lib/utils";
import { assignMotionRef } from "@/lib/cojeev-motion/refs";
import { motionTokens, trackMotion, useChoreography } from "@/lib/cojeev-motion/choreography";
import { useMotionVisibility } from "@/lib/cojeev-motion/use-motion-visibility";

const MotionSlot = motion.create(Slot);
const clamp = (value: number, low: number, high: number, fallback: number) => Number.isFinite(value) ? Math.max(low, Math.min(high, value)) : fallback;
export type FloatLayerProps = Omit<HTMLMotionProps<"div">, "initial" | "animate" | "transition" | "ref"> & {
  /** Total native-scroll displacement in px. Negative values reverse the plane. */
  depth?: number;
  /** Entrance delay in seconds; bounded to one second. */
  delay?: number;
  /** Gentle idle excursion in px. Set zero for scroll-only depth. */
  drift?: number;
  /** Repeat the entrance when the layer leaves and re-enters the viewport. */
  replay?: boolean;
  /** Entrance duration in seconds, clamped to 0.2–2. */
  revealDuration?: number;
  /** Initial vertical entrance offset in px, clamped to 0–80. */
  revealDistance?: number;
  asChild?: boolean;
  ref?: React.Ref<HTMLElement>;
  "data-slot"?: string;
};

/** A visible entrance and a separate native-scroll depth plane. The child keeps
 * its transform/scale and native identity; consumers owning `translate` can use
 * the default wrapper to put each movement on its own element. */
export function FloatLayer({ depth = 32, delay = 0, drift = 6, replay = false, revealDuration = .95, revealDistance = 24, asChild = false, className, style, ref, ...props }: FloatLayerProps) {
  const host = React.useRef<HTMLElement | null>(null);
  const attach = React.useCallback((element: HTMLElement | null) => { host.current = element; const release = assignMotionRef(ref, element); return () => { host.current = null; release(); }; }, [ref]);
  const { quiet } = useChoreography(), { enabled, inView } = useMotionVisibility(host);
  const active = !quiet && enabled && inView;
  const distance = clamp(depth, -180, 180, 32), excursion = clamp(drift, 0, 24, 6), pause = clamp(delay, 0, 1, 0), entranceTime = clamp(revealDuration, .2, 2, .95), entranceDistance = clamp(revealDistance, 0, 80, 24);
  // Server output remains readable; hydration prepares the entrance before paint.
  const reveal = useMotionValue(1), phase = useMotionValue(0), prepared = React.useRef(false), entered = React.useRef(false);
  const mark = React.useCallback((state: "waiting" | "entering" | "shown") => host.current?.setAttribute("data-reveal", state), []);
  const { scrollYProgress } = useScroll({ target: host, offset: ["start end", "end start"] });
  const scroll = useSpring(.5, motionTokens.spring.gentle);
  React.useLayoutEffect(() => {
    if (prepared.current) return;
    prepared.current = true;
    if (!quiet) { reveal.jump(0); mark("waiting"); }
  }, [quiet, reveal, mark]);
  React.useEffect(() => {
    if (quiet || document.hidden) { reveal.jump(1); entered.current = true; mark("shown"); return; }
    if (!enabled) return;
    if (!inView) {
      if (replay) { reveal.jump(0); entered.current = false; mark("waiting"); }
      else if (entered.current) { reveal.jump(1); mark("shown"); }
      return;
    }
    if (reveal.get() >= 1) { mark("shown"); return; }
    const first = !entered.current;
    entered.current = true;
    mark("entering");
    const controls = animate(reveal, 1, { duration: entranceTime, delay: first ? pause : 0, ease: [...motionTokens.ease.enter], onComplete: () => mark("shown") });
    return trackMotion(controls);
  }, [quiet, enabled, inView, reveal, pause, replay, entranceTime, mark]);
  React.useEffect(() => {
    if (!active) { scroll.jump(.5); return; }
    scroll.set(scrollYProgress.get());
    const unsubscribe = scrollYProgress.on("change", value => scroll.set(value));
    const start = phase.get();
    const release = excursion > 0 ? trackMotion(animate(phase, start + 1, { duration: 14, ease: "linear", repeat: Infinity })) : () => {};
    return () => { unsubscribe(); release(); scroll.stop(); };
  }, [active, excursion, scroll, scrollYProgress, phase]);
  const x = useTransform(() => `${active ? Math.sin(phase.get() * Math.PI * 2) * excursion * .4 : 0}px`);
  const y = useTransform(() => `${(active ? (.5 - scroll.get()) * distance + Math.sin(phase.get() * Math.PI * 4) * excursion : 0) + (1 - reveal.get()) * entranceDistance}px`);
  const Element = asChild ? MotionSlot : motion.div;
  return <Element {...props} ref={attach} {...(asChild ? {} : { "data-slot": props["data-slot"] ?? "float-layer" })}
    data-float-layer="" data-float-depth={distance} data-quiet={quiet} data-active={active}
    className={cn("v-float-layer", className)} style={{ ...style, "--float-x": x, "--float-y": y, "--float-reveal": reveal } as MotionStyle} initial={false} />;
}
