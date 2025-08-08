-- Users table for basic user information
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- OAuth accounts table
CREATE TABLE IF NOT EXISTS user_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,       -- e.g. 'github', 'google'
  provider_type TEXT NOT NULL,     -- e.g. 'oauth', 'email'
  provider_account_id TEXT NOT NULL, -- Account ID from provider
  refresh_token TEXT,              -- OAuth refresh token
  access_token TEXT,               -- OAuth access token
  expires_at INTEGER,              -- Token expiry timestamp
  token_type TEXT,                 -- Token type
  scope TEXT,                      -- OAuth scope
  id_token TEXT,                   -- OAuth ID token
  created_at TEXT,
  updated_at TEXT,
  UNIQUE(provider_id, provider_account_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires TEXT NOT NULL,           -- Session expiry timestamp
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User configurations table for STL laser cutting slicer settings
CREATE TABLE IF NOT EXISTS user_configs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  config_name TEXT NOT NULL DEFAULT 'default',
  
  -- Laser cutter parameters
  laser_cutter_width REAL DEFAULT 300.0,  -- mm
  laser_cutter_height REAL DEFAULT 200.0, -- mm
  kerf REAL DEFAULT 0.1,                   -- mm, laser beam width
  layer_height REAL DEFAULT 3.0,          -- mm, thickness of material layers
  default_axis TEXT DEFAULT 'z',          -- axis to slice along (x, y, z)
  
  -- Material and cutting settings
  material_thickness REAL DEFAULT 3.0,    -- mm
  cut_speed REAL DEFAULT 10.0,            -- mm/s
  cut_power REAL DEFAULT 80.0,            -- percentage
  
  -- Layout and spacing
  part_spacing REAL DEFAULT 2.0,          -- mm between parts
  margin REAL DEFAULT 5.0,                -- mm margin from edges
  optimize_layout BOOLEAN DEFAULT true,   -- auto-arrange parts
  
  -- UI preferences
  theme TEXT DEFAULT 'light',
  units TEXT DEFAULT 'mm',                 -- 'mm' or 'inch'
  auto_save BOOLEAN DEFAULT true,
  show_kerf_preview BOOLEAN DEFAULT true,
  
  -- Custom settings (JSON for flexibility)
  custom_settings TEXT DEFAULT '{}',
  
  created_at TEXT,
  updated_at TEXT,
  
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE(user_id, config_name)
);

-- User projects table for saved STL projects
CREATE TABLE IF NOT EXISTS user_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  description TEXT,
  
  -- Project data
  stl_file_name TEXT,
  slice_settings TEXT, -- JSON with slice parameters
  preview_image TEXT, -- Base64 or URL to preview
  
  -- Metadata
  file_size INTEGER,
  estimated_print_time INTEGER, -- in minutes
  material_usage REAL, -- in grams
  
  created_at TEXT,
  updated_at TEXT,
  
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON user_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_projects_user_id ON user_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id ON user_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_provider ON user_accounts(provider_id, provider_account_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
