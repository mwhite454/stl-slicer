import { turso } from './turso';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function initializeDatabase() {
  try {
    // Read the schema file
    const schemaPath = join(process.cwd(), 'src/lib/schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      await turso.execute(statement);
    }
    
    console.log('Database initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('Database initialization failed:', error);
    return { success: false, error };
  }
}

export async function testConnection() {
  try {
    const result = await turso.execute('SELECT 1 as test');
    console.log('Database connection successful');
    return { success: true, result };
  } catch (error) {
    console.error('Database connection failed:', error);
    return { success: false, error };
  }
}
