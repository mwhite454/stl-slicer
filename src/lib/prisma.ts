import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import dotenv from 'dotenv'
import { existsSync } from 'fs'

// Load environment variables
if (existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' })
} else {
  dotenv.config()
}

// Create the adapter
const adapter = new PrismaLibSQL({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// Create the Prisma client
const prisma = new PrismaClient({ adapter })

export default prisma
