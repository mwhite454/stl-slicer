#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// Get package version
const packageJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
const version = packageJson.version.replace(/\./g, '_');

// Get git branch name
let branchName = 'unknown';
try {
  branchName = execSync('git rev-parse --abbrev-ref HEAD', { 
    cwd: process.cwd(), 
    stdio: ['pipe', 'pipe', 'ignore'] 
  }).toString().trim().replace(/[^a-zA-Z0-9]/g, '_');
} catch (error) {
  console.warn('Could not determine git branch name:', error.message);
}

// Get latest commit hash
let commitHash = 'unknown';
try {
  commitHash = execSync('git rev-parse --short HEAD', { 
    cwd: process.cwd(), 
    stdio: ['pipe', 'pipe', 'ignore'] 
  }).toString().trim();
} catch (error) {
  console.warn('Could not determine latest commit hash:', error.message);
}

// Create migration filename
const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
const migrationName = `${timestamp}_${branchName}_${commitHash}_v${version}`;
const migrationFile = `prisma/migrations/${migrationName}.sql`;

async function runMigration() {
  console.log('Starting database migration process...');
  console.log(`Migration name: ${migrationName}`);
  
  try {
    // Step 1: Generate Prisma client
    console.log('Step 1: Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // Step 2: Create migration directory if it doesn't exist
    console.log('Step 2: Creating migration directory...');
    execSync('mkdir -p prisma/migrations', { stdio: 'inherit' });
    
    // Step 3: Create migration file using migrate diff
    console.log('Step 3: Creating migration file...');
    execSync(`npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > ${migrationFile}`, { stdio: 'inherit' });
    
    // Step 4: Apply migration to Turso database
    console.log('Step 4: Applying migration to Turso database...');
    
    // Check if Turso CLI is installed
    try {
      execSync('turso --version', { stdio: 'ignore' });
    } catch (error) {
      console.error('Turso CLI is not installed. Please install it first:');
      console.error('Follow instructions at: https://docs.turso.tech/reference/turso-cli');
      process.exit(1);
    }
    
    // Check if database URL is set
    if (!process.env.TURSO_DATABASE_URL) {
      console.error('TURSO_DATABASE_URL is not set in .env.local');
      process.exit(1);
    }
    
    // Extract database name from URL
    const dbUrl = process.env.TURSO_DATABASE_URL;
    const dbNameMatch = dbUrl.match(/https:\/\/([^\.]+)\./);
    if (!dbNameMatch) {
      console.error('Could not extract database name from TURSO_DATABASE_URL');
      process.exit(1);
    }
    
    const dbName = dbNameMatch[1];
    console.log(`Applying migration to database: ${dbName}`);
    
    // Apply migration
    try {
      execSync(`turso db shell ${dbName} < ${migrationFile}`, { 
        stdio: 'inherit' 
      });
      console.log('Migration applied successfully!');
    } catch (error) {
      console.error('Failed to apply migration to Turso database:', error.message);
      console.log('You can manually apply the migration using:');
      console.log(`turso db shell ${dbName} < ${migrationFile}`);
      process.exit(1);
    }
    
    console.log('Database migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
