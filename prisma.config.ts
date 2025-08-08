import path from 'node:path'
import { defineConfig } from '@prisma/config'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import dotenv from 'dotenv'
import { existsSync } from 'fs'

// Load environment variables
if (existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' })
} else {
  dotenv.config()
}

export default defineConfig({
  experimental: {
    adapter: true,
  },
  schema: path.join('prisma', 'schema.prisma'),
  async adapter() {
    return new PrismaLibSQL({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })
  }
})
