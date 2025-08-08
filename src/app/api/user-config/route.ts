import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const configName = searchParams.get('configName') || 'default';

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const config = await prisma.userConfig.findUnique({
      where: {
        userId_configName: {
          userId,
          configName
        }
      }
    });

    if (!config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error fetching user config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, configName = 'default', ...configData } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const configId = nanoid();
    const now = new Date().toISOString();

    const config = await prisma.userConfig.create({
      data: {
        id: configId,
        userId,
        configName,
        laserCutterWidth: configData.laserCutterWidth || 300.0,
        laserCutterHeight: configData.laserCutterHeight || 200.0,
        kerf: configData.kerf || 0.1,
        layerHeight: configData.layerHeight || 3.0,
        defaultAxis: configData.defaultAxis || 'z',
        materialThickness: configData.materialThickness || 3.0,
        cutSpeed: configData.cutSpeed || 10.0,
        cutPower: configData.cutPower || 80.0,
        partSpacing: configData.partSpacing || 2.0,
        margin: configData.margin || 5.0,
        optimizeLayout: configData.optimizeLayout || true,
        theme: configData.theme || 'light',
        units: configData.units || 'mm',
        autoSave: configData.autoSave || true,
        showKerfPreview: configData.showKerfPreview || true,
        customSettings: JSON.stringify(configData.customSettings || {}),
        createdAt: now,
        updatedAt: now
      }
    });

    return NextResponse.json({ 
      success: true, 
      configId,
      message: 'Configuration saved successfully' 
    });
  } catch (error) {
    console.error('Error saving user config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, configName = 'default', ...configData } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const config = await prisma.userConfig.update({
      where: {
        userId_configName: {
          userId,
          configName
        }
      },
      data: {
        laserCutterWidth: configData.laserCutterWidth || 300.0,
        laserCutterHeight: configData.laserCutterHeight || 200.0,
        kerf: configData.kerf || 0.1,
        layerHeight: configData.layerHeight || 3.0,
        defaultAxis: configData.defaultAxis || 'z',
        materialThickness: configData.materialThickness || 3.0,
        cutSpeed: configData.cutSpeed || 10.0,
        cutPower: configData.cutPower || 80.0,
        partSpacing: configData.partSpacing || 2.0,
        margin: configData.margin || 5.0,
        optimizeLayout: configData.optimizeLayout || true,
        theme: configData.theme || 'light',
        units: configData.units || 'mm',
        autoSave: configData.autoSave || true,
        showKerfPreview: configData.showKerfPreview || true,
        customSettings: JSON.stringify(configData.customSettings || {}),
        updatedAt: now
      }
    });

    if (!config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Configuration updated successfully' 
    });
  } catch (error) {
    console.error('Error updating user config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const configName = searchParams.get('configName') || 'default';

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const config = await prisma.userConfig.delete({
      where: {
        userId_configName: {
          userId,
          configName
        }
      }
    });

    if (!config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Configuration deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting user config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
