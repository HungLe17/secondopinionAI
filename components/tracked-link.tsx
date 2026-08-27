"use client";
import Link from "next/link";import type { SafeEvent } from "@/lib/analytics";import { trackSafeEvent } from "@/lib/analytics";
export function TrackedLink({href,event,className,children}:{href:string;event:SafeEvent;className?:string;children:React.ReactNode}){return <Link href={href} className={className} onClick={()=>void trackSafeEvent(event)}>{children}</Link>}
