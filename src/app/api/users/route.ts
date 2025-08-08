import { NextRequest, NextResponse } from 'next/server';
import { turso } from '@/lib/turso';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const userId = searchParams.get('userId');

    if (!email && !userId) {
      return NextResponse.json({ error: 'Email or User ID is required' }, { status: 400 });
    }

    const sql = email 
      ? 'SELECT * FROM users WHERE email = ?'
      : 'SELECT * FROM users WHERE id = ?';
    const args = [email || userId];

    const result = await turso.execute({ sql, args });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await turso.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email]
    });

    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const userId = nanoid();
    const now = new Date().toISOString();

    await turso.execute({
      sql: 'INSERT INTO users (id, email, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      args: [userId, email, name || null, now, now]
    });

    // Create default configuration for new user
    const configId = nanoid();
    await turso.execute({
      sql: `INSERT INTO user_configs (
        id, user_id, config_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)`,
      args: [configId, userId, 'default', now, now]
    });

    return NextResponse.json({ 
      success: true, 
      userId,
      message: 'User created successfully with default configuration' 
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, name } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const result = await turso.execute({
      sql: 'UPDATE users SET email = ?, name = ?, updated_at = ? WHERE id = ?',
      args: [email, name || null, now, userId]
    });

    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User updated successfully' 
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
