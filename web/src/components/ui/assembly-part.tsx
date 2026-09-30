"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { animate, motion, useMotionValue, useTransform, usePresence, type MotionStyle } from "motion/react";
import { assemblyContour, type AssemblyContour, type AssemblyRect } from "@/lib/cojeev/assembly-geometry";
import { trackMotion, useChoreography } from "@/lib/cojeev-motion/choreography";
import { cn } from "@/lib/utils";

const NativePart=motion.create(Slot);
type PartPaint={background:string;ink:string};
/** Read the authored endpoint on the actual native root, before the browser paints.
 * Generated morph layers suppress their host fill, so exclude only that owned
 * layer while sampling. The root, its state and its children keep their identity. */
function nativePaint(node:HTMLElement):PartPaint {
  const body=node.querySelector<SVGSVGElement>(":scope > svg.v-morph"),next=body?.nextSibling;
  const live=node.classList.contains("v-morph-live"),fill=node.style.getPropertyValue("--mfill"),priority=node.style.getPropertyPriority("--mfill");
  node.setAttribute("data-assembly-paint-probe","");
  body?.remove();if(live)node.classList.remove("v-morph-live");
  if(node.hasAttribute("data-auto-morph"))node.style.removeProperty("--mfill");
  const style=getComputedStyle(node),paint={background:style.backgroundColor,ink:style.color};
  if(body)node.insertBefore(body,next??null);if(live)node.classList.add("v-morph-live");
  if(fill)node.style.setProperty("--mfill",fill,priority);
  node.removeAttribute("data-assembly-paint-probe");
  return paint;
}
const colourMix=(start:string,end:string,amount:number)=>amount>=1?end:amount<=0?start:`color-mix(in oklab, ${start} ${(1-amount)*100}%, ${end} ${amount*100}%)`;
export type AssemblyPartProps={
  children:React.ReactElement;
  identity:string;
  /** Marks a new composition even when a reused part has identical target geometry. */
  transitionKey?:string | object;
  rect:AssemblyRect;
  /** Initial geometry for a newly introduced native part; existing roots keep current motion values. */
  from?:AssemblyRect;
  fromContour?:AssemblyContour;
  contour?:AssemblyContour;
  radius?:number;
  reveal?:boolean;
  interactive?:boolean;
  immediate?:boolean;
  duration?:number;
  delay?:number;
  /** Curved travel strength from 0 (straight) to 1. */
  curve?:number;
  onProgress?:(progress:number)=>void;
  /** Give native paint, clipping, focus and hover motion back after arrival. */
  release?:boolean;
  floating?:boolean;
  tone?:"pink"|"blue"|"olive"|"yellow";
  onRest?:()=>void;
  className?:string;
};
/** One persistent atomic root. Its real surface changes contour, dimensions and location. */
export function AssemblyPart({children,identity,transitionKey,rect,from,fromContour,contour="rounded",radius=16,reveal=true,interactive=true,immediate=false,duration=1.15,delay=0,curve=.65,onProgress,release=false,floating=false,tone="pink",onRest,className}:AssemblyPartProps){
  const {quiet}=useChoreography();
  const [isPresent,safeToRemove]=usePresence();
  const present=isPresent!==false;
  const destination=present?rect:from??rect;
  const targetContour=present?contour:fromContour??contour;
  const released=release&&present;
  const origin=from??rect;
  const x=useMotionValue(origin.x),y=useMotionValue(origin.y),width=useMotionValue(origin.width),height=useMotionValue(origin.height),rotate=useMotionValue(origin.rotate??0);
  const rotation=useTransform(rotate,value=>`${value}deg`);
  const path=React.useMemo(()=>assemblyContour(targetContour,destination.width,destination.height,radius),[targetContour,destination.width,destination.height,radius]);
  const initialPath=from?assemblyContour(fromContour??contour,from.width,from.height,radius):path;
  const clipPath=useMotionValue(released?"":initialPath),contentOpacity=useMotionValue(reveal?1:0),opacity=useMotionValue(1);
  const background=useMotionValue(`var(--v-${tone})`),ink=useMotionValue("var(--v-on-accent)"),paintProgress=useMotionValue(0);
  const lastContour=React.useRef(initialPath),callbacks=React.useRef({onRest,onProgress,safeToRemove});
  const native=React.useRef<HTMLElement>(null),hasTraveled=React.useRef(false);
  React.useLayoutEffect(()=>{callbacks.current={onRest,onProgress,safeToRemove}},[onRest,onProgress,safeToRemove]);
  // Presence registers after layout. Complete instant exits after that registration,
  // otherwise a quiet composition change can leave invisible native roots retained.
  React.useEffect(()=>{if(!present&&(quiet||immediate))safeToRemove?.()},[present,quiet,immediate,safeToRemove]);
  React.useLayoutEffect(()=>{
    let current=true;
    const node=native.current;
    const arriving=present&&(targetContour==="rounded"||targetContour==="circle");
    const sampleTarget=():PartPaint=>node?arriving?nativePaint(node):{background:getComputedStyle(node).getPropertyValue("--assembly-tone").trim(),ink:"var(--v-on-accent)"}:{background:`var(--v-${tone})`,ink:"var(--v-on-accent)"};
    let paintStart:PartPaint=node?{background:getComputedStyle(node).backgroundColor,ink:getComputedStyle(node).color}:{background:background.get(),ink:ink.get()};
    let paintEnd=sampleTarget(),paintFrom=0,paintNow=0;
    const pairs=[[x,destination.x],[y,destination.y],[width,destination.width],[height,destination.height],[rotate,destination.rotate??0]] as const;
    const finish=()=>{if(!current)return;callbacks.current.onProgress?.(1);if(present)callbacks.current.onRest?.();else callbacks.current.safeToRemove?.()};
    if(released||quiet||immediate){
      for(const [value,target]of pairs){value.stop();value.jump(target)}
      clipPath.stop();clipPath.jump(released?"":path);lastContour.current=path;
      background.jump(paintEnd.background);ink.jump(paintEnd.ink);paintProgress.jump(1);
      contentOpacity.stop();contentOpacity.jump(present&&(reveal||arriving)?1:0);
      opacity.stop();opacity.jump(present?1:0);if(present)finish();return;
    }
    if(!clipPath.get())clipPath.set(lastContour.current);
    // Persistent values retain their velocity when a visitor reverses or retargets.
    // Position, dimensions, paint and text start at the frame already on screen.
    const speed=Math.max(.35,Math.min(duration,3));
    const stiffness=110/(speed*speed),damping=23/speed;
    const initialDelay=hasTraveled.current?0:Math.max(0,Math.min(delay,.4));
    hasTraveled.current=true;
    const travel=pairs.map(([value,target],index)=>animate(value,target,{
      type:"spring",stiffness:index===1?stiffness*(1-Math.max(0,Math.min(1,curve))*.16):stiffness,
      damping:index>1?damping+5:damping,mass:1,velocity:value.getVelocity(),delay:initialDelay,
      restDelta:.08,restSpeed:.2,
    }));
    const shape=animate(clipPath,path,{duration:speed*.8,delay:initialDelay,ease:[.22,.7,.2,1],onUpdate:value=>{lastContour.current=value}});
    const labels=animate(contentOpacity,arriving?1:0,{duration:arriving?.48:.3,delay:arriving&&contentOpacity.get()<.05?initialDelay+.24:0,ease:"easeOut"});
    const presenceAnimation=animate(opacity,present?1:0,{duration:present?.22:.4,ease:"easeOut"});
    const paint=animate(0,1,{duration:speed*.8,delay:initialDelay,ease:"easeInOut",onUpdate:progress=>{
      if(!current)return;paintNow=progress;
      const amount=Math.max(0,Math.min(1,(progress-paintFrom)/Math.max(.001,1-paintFrom)));
      background.set(colourMix(paintStart.background,paintEnd.background,amount));ink.set(colourMix(paintStart.ink,paintEnd.ink,amount));paintProgress.set(amount);callbacks.current.onProgress?.(progress);
    }});
    const theme=new MutationObserver(()=>{
      if(!node||!current||paintNow>=1)return;
      const style=getComputedStyle(node);paintStart={background:style.backgroundColor,ink:style.color};paintEnd=sampleTarget();paintFrom=paintNow;
    });
    theme.observe(document.documentElement,{attributes:true,attributeFilter:["data-mode","data-skin","style"]});
    const animations=[...travel,shape,labels,presenceAnimation,paint];
    const stops=animations.map(animation=>trackMotion(animation));
    void Promise.all(animations.map(animation=>animation.finished)).then(()=>{
      if(!current)return;
      finish();
      if(floating&&present){const drift=animate(y,[y.get(),destination.y-4,destination.y+2,destination.y],{duration:4.4,repeat:Infinity,ease:"easeInOut"});stops.push(trackMotion(drift))}
    });
    return()=>{current=false;theme.disconnect();stops.forEach(stop=>stop())};
  },[destination.x,destination.y,destination.width,destination.height,destination.rotate,path,targetContour,identity,transitionKey,duration,delay,curve,floating,released,reveal,present,quiet,immediate,tone,x,y,width,height,rotate,clipPath,contentOpacity,opacity,background,ink,paintProgress]);
  React.useLayoutEffect(()=>{
    const node=native.current;if(!released||!node)return;
    const remember=()=>{const paint=nativePaint(node);background.jump(paint.background);ink.jump(paint.ink)};
    remember();
    const theme=new MutationObserver(remember);theme.observe(document.documentElement,{attributes:true,attributeFilter:["data-mode","data-skin","style"]});
    return()=>theme.disconnect();
  });
  const position={left:x,top:y,width,height,opacity,clipPath,"--assembly-rotation":rotation,"--assembly-content-opacity":contentOpacity,"--assembly-paint-bg":background,"--assembly-paint-ink":ink,"--assembly-paint-progress":paintProgress} as MotionStyle;
  return <NativePart ref={native} className={cn("v-assembly-part",className)} data-assembly-part={identity} data-assembly-reveal={reveal&&present} data-assembly-revealing="true" data-assembly-released={released} data-assembly-tone={tone} data-assembly-exiting={!present||undefined} data-motion={released?undefined:"off"} data-flow={released?undefined:"off"} inert={!interactive||!present||undefined} aria-hidden={!reveal||!present||undefined} style={position}>{children}</NativePart>;
}
