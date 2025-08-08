import { NextResponse } from 'next/server';
import { initializeDatabase, testConnection } from '@/lib/db-init';

export async function POST() {
  try {
    // First test the connection
    const connectionTest = await testConnection();
    if (!connectionTest.success) {
      return NextResponse.json({ 
        error: 'Database connection failed', 
        details: connectionTest.error 
      }, { status: 500 });
    }

    // Initialize the database
    const initResult = await initializeDatabase();
    if (!initResult.success) {
      return NextResponse.json({ 
        error: 'Database initialization failed', 
        details: initResult.error 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database initialized successfully' 
    });
  } catch (error) {
    console.error('Error in database initialization:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const connectionTest = await testConnection();
    return NextResponse.json(connectionTest);
  } catch (error) {
    console.error('Error testing database connection:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Connection test failed',
      details: error 
    }, { status: 500 });
  }
}
