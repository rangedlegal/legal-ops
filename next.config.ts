import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@react-pdf/renderer",
    "@prisma/client",
    "@libsql/client",
    "@prisma/adapter-libsql",
  ],
}

export default nextConfig
