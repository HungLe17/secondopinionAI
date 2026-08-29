import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://www.google-analytics.com https://region1.google-analytics.com",
  "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  async headers() {
    const sharedHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    const productionHeaders = [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Frame-Options", value: "DENY" },
    ];
    const rules: Array<{
      source: string;
      headers: Array<{ key: string; value: string }>;
      missing?: Array<{ type: "host"; value: string }>;
    }> = [{
      source: "/(.*)",
      headers: sharedHeaders,
    }];
    if (!isDevelopment) rules.push({
      source: "/(.*)",
      missing: [{ type: "host" as const, value: "(?<aiStudioPreview>.*\\.usercontent\\.goog)" }],
      headers: productionHeaders,
    });
    return rules;
  }
};

export default nextConfig;
