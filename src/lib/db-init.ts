import prisma from './prisma';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function initializeDatabase() {
  try {
    // With Prisma, we don't need to manually initialize the database schema
    // as it's handled through prisma db push
    console.log('Database initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('Database initialization failed:', error);
    return { success: false, error };
  }
}

export async function testConnection() {
  try {
    // Test the Prisma connection by making a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Database connection successful');
    return { success: true, result };
  } catch (error) {
    console.error('Database connection failed:', error);
    return { success: false, error };
  }
}
