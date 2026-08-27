import { logEvent } from "firebase/analytics";
import { enableConsentedAnalytics } from "@/lib/firebase-client";

export type SafeEvent = "landing_cta"|"demo_opened"|"sign_in_success"|"case_created"|"upload_completed"|"analysis_started"|"analysis_completed"|"analysis_failed"|"report_printed"|"case_deleted";
const ALLOWED_PARAMS = new Set(["kind", "count"]);

export async function trackSafeEvent(name:SafeEvent,params:Record<string,string|number>={}){
  if(typeof window==="undefined"||window.localStorage.getItem("second-opinion-anonymous-analytics")!=="accepted")return;
  const safe=Object.fromEntries(Object.entries(params).filter(([key,value])=>ALLOWED_PARAMS.has(key)&&(typeof value==="string"||typeof value==="number")));
  const analytics=await enableConsentedAnalytics().catch(()=>null);if(analytics)logEvent(analytics,name,safe);
}
