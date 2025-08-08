import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const userId = searchParams.get('userId');

    if (!email && !userId) {
      return NextResponse.json({ error: 'Email or User ID is required' }, { status: 400 });
    }

    let user;
    if (email) {
      user = await prisma.user.findUnique({
        where: { email }
      });
    } else {
      user = await prisma.user.findUnique({
        where: { id: userId! }
      });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
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
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const userId = nanoid();
    const now = new Date().toISOString();

    const user = await prisma.user.create({
      data: {
        id: userId,
        email,
        name: name || null,
        createdAt: now,
        updatedAt: now
      }
    });

    // Create default configuration for new user
    const configId = nanoid();
    await prisma.userConfig.create({
      data: {
        id: configId,
        userId,
        configName: 'default',
        createdAt: now,
        updatedAt: now
      }
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

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        email,
        name: name || null,
        updatedAt: now
      }
    });

    if (!user) {
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
