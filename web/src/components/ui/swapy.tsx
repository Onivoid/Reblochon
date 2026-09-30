"use client";
import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { reconcileSwapOrder,swapLayoutItems } from "@/lib/cojeev/reference-layouts";
import { useMotionVisibility } from "@/lib/cojeev-motion/use-motion-visibility";
import { assignMotionRef } from "@/lib/cojeev-motion/refs";
export type SwapyItem={id:string;label:string;content:React.ReactNode};
export type SwapyProps=Omit<React.ComponentProps<"div">,"children"> & {items:readonly SwapyItem[];order?:readonly string[];defaultOrder?:readonly string[];onOrderChange?:(order:string[])=>void;variant?:"grid"|"list";disabled?:boolean};
/** React owns the order. Pointer capture is confined to explicit drag handles. */
export function Swapy({items,order,defaultOrder=[],onOrderChange,variant="grid",disabled=false,className,ref,...props}:SwapyProps){
 const [localOrder,setLocalOrder]=React.useState<readonly string[]>(defaultOrder),[dragged,setDragged]=React.useState<string|null>(null),[target,setTarget]=React.useState<string|null>(null),[announcement,setAnnouncement]=React.useState("");
 const host=React.useRef<HTMLDivElement>(null),drag=React.useRef<{id:string;pointer:number;target:string|null}|null>(null),{enabled,inView}=useMotionVisibility(host),instructions=React.useId();
 const ids=reconcileSwapOrder(order??localOrder,items.map(item=>item.id));
 const itemMap=new Map(items.map(item=>[item.id,item]));
 const hostRef=React.useCallback((node:HTMLDivElement|null)=>{host.current=node;return assignMotionRef(ref,node);},[ref]);
 const swap=(first:string,second:string)=>{if(disabled||first===second)return;const next=swapLayoutItems(ids,first,second);if(!next.includes(first)||!next.includes(second))return;if(order===undefined)setLocalOrder(next);onOrderChange?.(next);setAnnouncement(`${itemMap.get(first)?.label??first} moved to position ${next.indexOf(first)+1} of ${next.length}.`);};
 const end=()=>{drag.current=null;setDragged(null);setTarget(null);};
 const keyboard=(event:React.KeyboardEvent<HTMLButtonElement>,id:string)=>{const index=ids.indexOf(id);let next=index;if(event.key==="ArrowLeft"||event.key==="ArrowUp")next=Math.max(0,index-1);else if(event.key==="ArrowRight"||event.key==="ArrowDown")next=Math.min(ids.length-1,index+1);else if(event.key==="Home")next=0;else if(event.key==="End")next=ids.length-1;else if(event.key==="Escape"){end();event.preventDefault();return;}else return;event.preventDefault();swap(id,ids[next]);};
 return <div {...props} ref={hostRef} className={cn("v-swapy",className)} data-slot="swapy" data-variant={variant} data-disabled={disabled}>
 <p id={instructions} className="v-swapy__instructions">Drag a handle onto another card, or use its arrow buttons to swap positions.</p>
 <ol className="v-swapy__grid">{ids.map((id,index)=>{const item=itemMap.get(id)!;return <motion.li key={id} layout={enabled&&inView} transition={{duration:.3,ease:[.22,1,.36,1]}} className="v-swapy__item" data-swap-id={id} data-dragged={dragged===id} data-drop-target={target===id&&dragged!==id}>
 <div className="v-swapy__header"><strong>{item.label}</strong><button type="button" disabled={disabled||ids.length<2} className="v-swapy__handle" aria-label={`Move ${item.label}`} aria-describedby={instructions} onKeyDown={event=>keyboard(event,id)} onPointerDown={event=>{if(disabled||event.button!==0)return;event.preventDefault();event.currentTarget.focus();event.currentTarget.setPointerCapture(event.pointerId);drag.current={id,pointer:event.pointerId,target:null};setDragged(id);}} onPointerMove={event=>{const active=drag.current;if(!active||active.pointer!==event.pointerId)return;const hit=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>("[data-swap-id]");const next=hit&&host.current?.contains(hit)?hit.dataset.swapId??null:null;active.target=next;setTarget(next);}} onPointerUp={event=>{const active=drag.current;if(!active||active.pointer!==event.pointerId)return;if(active.target)swap(active.id,active.target);event.currentTarget.releasePointerCapture(event.pointerId);end();}} onPointerCancel={end} onLostPointerCapture={end}>⠿</button></div>
 <div className="v-swapy__content">{item.content}</div>
 <div className="v-swapy__controls"><button type="button" aria-label={`Move ${item.label} earlier`} disabled={disabled||index===0} onClick={()=>swap(id,ids[index-1])}>←</button><span aria-hidden="true">{String(index+1).padStart(2,"0")}</span><button type="button" aria-label={`Move ${item.label} later`} disabled={disabled||index===ids.length-1} onClick={()=>swap(id,ids[index+1])}>→</button></div>
 </motion.li>;})}</ol>
 {!ids.length&&<p>No cards to arrange.</p>}<p role="status" className="v-swapy__status">{announcement||`${ids.length} ${ids.length===1?"card":"cards"} ready to arrange.`}</p>
 </div>;
}
