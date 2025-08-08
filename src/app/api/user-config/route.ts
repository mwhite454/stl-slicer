import { NextRequest, NextResponse } from 'next/server';
import { turso } from '@/lib/turso';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const configName = searchParams.get('configName') || 'default';

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const result = await turso.execute({
      sql: 'SELECT * FROM user_configs WHERE user_id = ? AND config_name = ?',
      args: [userId, configName]
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    return NextResponse.json({ config: result.rows[0] });
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

    const result = await turso.execute({
      sql: `INSERT INTO user_configs (
        id, user_id, config_name, laser_cutter_width, laser_cutter_height, kerf,
        layer_height, default_axis, material_thickness, cut_speed, cut_power,
        part_spacing, margin, optimize_layout, theme, units, auto_save,
        show_kerf_preview, custom_settings, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        configId,
        userId,
        configName,
        configData.laserCutterWidth || 300.0,
        configData.laserCutterHeight || 200.0,
        configData.kerf || 0.1,
        configData.layerHeight || 3.0,
        configData.defaultAxis || 'z',
        configData.materialThickness || 3.0,
        configData.cutSpeed || 10.0,
        configData.cutPower || 80.0,
        configData.partSpacing || 2.0,
        configData.margin || 5.0,
        configData.optimizeLayout || true,
        configData.theme || 'light',
        configData.units || 'mm',
        configData.autoSave || true,
        configData.showKerfPreview || true,
        JSON.stringify(configData.customSettings || {}),
        now,
        now
      ]
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

    const result = await turso.execute({
      sql: `UPDATE user_configs SET 
        laser_cutter_width = ?, laser_cutter_height = ?, kerf = ?,
        layer_height = ?, default_axis = ?, material_thickness = ?, 
        cut_speed = ?, cut_power = ?, part_spacing = ?, margin = ?,
        optimize_layout = ?, theme = ?, units = ?, auto_save = ?, 
        show_kerf_preview = ?, custom_settings = ?, updated_at = ?
        WHERE user_id = ? AND config_name = ?`,
      args: [
        configData.laserCutterWidth || 300.0,
        configData.laserCutterHeight || 200.0,
        configData.kerf || 0.1,
        configData.layerHeight || 3.0,
        configData.defaultAxis || 'z',
        configData.materialThickness || 3.0,
        configData.cutSpeed || 10.0,
        configData.cutPower || 80.0,
        configData.partSpacing || 2.0,
        configData.margin || 5.0,
        configData.optimizeLayout || true,
        configData.theme || 'light',
        configData.units || 'mm',
        configData.autoSave || true,
        configData.showKerfPreview || true,
        JSON.stringify(configData.customSettings || {}),
        now,
        userId,
        configName
      ]
    });

    if (result.rowsAffected === 0) {
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

    const result = await turso.execute({
      sql: 'DELETE FROM user_configs WHERE user_id = ? AND config_name = ?',
      args: [userId, configName]
    });

    if (result.rowsAffected === 0) {
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
