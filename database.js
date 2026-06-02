
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const dbPath = process.env.DB_PATH || path.join(__dirname, 'suishin.db');
const db = new sqlite3.Database(dbPath);

function addColumn(table, name, def){
  db.all(`PRAGMA table_info(${table})`, (err, cols)=>{
    if(err) return console.error(err);
    if(!cols.some(c=>c.name===name)){
      db.run(`ALTER TABLE ${table} ADD COLUMN ${name} ${def}`, e=>{ if(e) console.error(e.message); });
    }
  });
}

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS project_settings (
    project_id INTEGER PRIMARY KEY,
    report_title TEXT DEFAULT '泥水式推進工データー表',
    construction_name TEXT DEFAULT '',
    contractor TEXT DEFAULT '',
    span_name TEXT DEFAULT '',
    pipe_diameter TEXT DEFAULT '',
    drive_distance TEXT DEFAULT '',
    writer TEXT DEFAULT '',
    logo_data TEXT DEFAULT '',
    lubricant_material_name TEXT DEFAULT '材料',
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS item_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    field_key TEXT NOT NULL,
    label TEXT NOT NULL,
    unit TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    visible INTEGER DEFAULT 1,
    print_visible INTEGER DEFAULT 1,
    UNIQUE(project_id, field_key)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER DEFAULT 1,
    pipe_no INTEGER,
    date TEXT NOT NULL,
    kafuatsu REAL,
    sousui REAL,
    hainyu_flow REAL,
    kusshin_speed REAL,
    motooshi_force REAL,
    cutter_torque REAL,
    souden_p1 REAL,
    haiden_p2 REAL,
    haiden_p3 REAL,
    haiden_p4 REAL,
    pitching REAL,
    rolling REAL,
    viscosity REAL,
    specific_gravity REAL,
    zando REAL,
    precision_center_direction TEXT,
    precision_center_value REAL,
    precision_level_direction TEXT,
    precision_level_value REAL,
    remarks TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS lubricant_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER DEFAULT 1,
    date TEXT NOT NULL,
    injection_pipe_no TEXT,
    injection_liter REAL,
    material_kg REAL,
    delivery_kg REAL,
    remarks TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
  db.get(`SELECT COUNT(*) AS c FROM projects`, (err,row)=>{
    if(!err && row.c===0){
      db.run(`INSERT INTO projects(name) VALUES (?)`, ['初期現場'], function(){
        db.run(`INSERT OR IGNORE INTO project_settings(project_id) VALUES (?)`, [this.lastID]);
      });
    }
  });
  ['project_id INTEGER DEFAULT 1','pipe_no INTEGER'].forEach(s=>{ const [n,...d]=s.split(' '); addColumn('records',n,d.join(' ')); });
});

module.exports = db;
