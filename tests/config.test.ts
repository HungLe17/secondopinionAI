import { afterEach, describe, expect, it } from "vitest";
import { publicConfig } from "@/lib/server/config";

const original={...process.env};
afterEach(()=>{process.env={...original};});

describe("runtime public configuration",()=>{
  it("returns only Firebase web values and feature flags",()=>{
    Object.assign(process.env,{FIREBASE_WEB_API_KEY:"public-web-key",FIREBASE_AUTH_DOMAIN:"example.firebaseapp.com",FIREBASE_PROJECT_ID:"example",FIREBASE_APP_ID:"app-id",FIREBASE_MEASUREMENT_ID:"G-TEST",GEMINI_API_KEY:"must-never-leak"});
    const result=publicConfig();const serialized=JSON.stringify(result);
    expect(result.analyticsEnabled).toBe(true);expect(serialized).not.toContain("must-never-leak");expect(serialized).not.toContain("GEMINI_API_KEY");expect(serialized).not.toContain("storageBucket");
  });
  it("identifies the exact deployment variables that are absent",()=>{
    delete process.env.FIREBASE_WEB_API_KEY;delete process.env.FIREBASE_AUTH_DOMAIN;delete process.env.FIREBASE_PROJECT_ID;delete process.env.FIREBASE_APP_ID;
    expect(()=>publicConfig()).toThrow(/FIREBASE_WEB_API_KEY.*FIREBASE_AUTH_DOMAIN.*FIREBASE_PROJECT_ID.*FIREBASE_APP_ID/i);
  });
  it("trims hosted secrets and rejects a URL used as the auth domain",()=>{
    Object.assign(process.env,{FIREBASE_WEB_API_KEY:" key ",FIREBASE_AUTH_DOMAIN:" example.firebaseapp.com ",FIREBASE_PROJECT_ID:" example ",FIREBASE_APP_ID:" app "});
    expect(publicConfig().firebase).toMatchObject({apiKey:"key",authDomain:"example.firebaseapp.com",projectId:"example",appId:"app"});
    process.env.FIREBASE_AUTH_DOMAIN="https://example.firebaseapp.com/";
    expect(()=>publicConfig()).toThrow(/without https:\/\//i);
  });
});
