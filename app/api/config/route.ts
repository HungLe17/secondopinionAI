import { safeErrorResponse } from "@/lib/errors";
import { publicConfig } from "@/lib/server/config";
export const dynamic = "force-dynamic";
export function GET(){try{return Response.json(publicConfig(),{headers:{"Cache-Control":"no-store"}})}catch(error){const response=safeErrorResponse(error);response.headers.set("Cache-Control","no-store");return response}}
