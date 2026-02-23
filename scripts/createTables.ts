import db from "../lib/sqlite.js"

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  UserId INTEGER PRIMARY KEY,
  Email TEXT UNIQUE,
  Username TEXT,
  PasswordHash TEXT,
  IsFirstLogin INTEGER,
  IsActive INTEGER,
  LastLogin TEXT,
  CreatedOn TEXT,
  Role TEXT,
  DeletedAt TEXT,
  FirstName TEXT,
  LastName TEXT
);

CREATE TABLE IF NOT EXISTS projectmaster (
  projectid INTEGER PRIMARY KEY,
  projectname TEXT,
  userid INTEGER,
  status INTEGER,
  createdby INTEGER,
  createdon TEXT,
  updatedby INTEGER,
  updatedon TEXT,
  synced INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tutorial_master (
  id INTEGER PRIMARY KEY,
  tutorial_name TEXT,
  created_at TEXT,
  type TEXT
);

CREATE TABLE IF NOT EXISTS tutorial_activity (
  id INTEGER PRIMARY KEY,
  tutorial_id INTEGER,
  activity_name TEXT,
  level INTEGER,
  pdf_url TEXT,
  video_url TEXT,
  activity_order INTEGER,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS tutorial_blocks (
  id INTEGER PRIMARY KEY,
  tutorial_id INTEGER,
  block_type TEXT,
  block_order INTEGER,
  block_config TEXT,
  created_at TEXT,
  parent_id INTEGER
);
`)