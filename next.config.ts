import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  matcher: ["/((?!_next|favicon.ico|login|public).*)"], // protege tudo, exceto login, _next, favicon
  /* config options here */
};

export default nextConfig;
