
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'suishin.db'));
function addColumnIfMissing(table, column, definition) {
  db.all(`PRAGMA table_info(${table})`, [], (err, rows=[]) => {
    if (err) return console.error(err.message);
    if (!rows.some(r => r.name === column)) db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  });
}
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,created_at TEXT DEFAULT (datetime('now','localtime')),updated_at TEXT DEFAULT (datetime('now','localtime')))`);
  db.run(`CREATE TABLE IF NOT EXISTS print_settings (project_id INTEGER PRIMARY KEY, construction_name TEXT, contractor TEXT, span_name TEXT, pipe_diameter TEXT, push_distance TEXT, writer TEXT, logo_data TEXT, report_title TEXT, updated_at TEXT DEFAULT (datetime('now','localtime')))`);
  db.run(`CREATE TABLE IF NOT EXISTS records (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER DEFAULT 1, pipe_no INTEGER, date TEXT NOT NULL,
    kafuatsu REAL,sousui REAL,hainyu_flow REAL,kusshin_speed REAL,motooshi_force REAL,cutter_torque REAL,souden_p1 REAL,haiden_p2 REAL,haiden_p3 REAL,haiden_p4 REAL,pitching REAL,rolling REAL,viscosity REAL,specific_gravity REAL,zando REAL,
    precision_center_direction TEXT,precision_center_value REAL,precision_level_direction TEXT,precision_level_value REAL,remarks TEXT,created_at TEXT DEFAULT (datetime('now','localtime')),updated_at TEXT DEFAULT (datetime('now','localtime')))`);

  db.run(`CREATE TABLE IF NOT EXISTS lubricant_settings (project_id INTEGER PRIMARY KEY, material_name TEXT DEFAULT '滑材', report_title TEXT DEFAULT '滑材注入管理表', updated_at TEXT DEFAULT (datetime('now','localtime')))`);

  db.run(`CREATE TABLE IF NOT EXISTS lubricant_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    injection_pipe_no TEXT,
    injection_liter REAL,
    material_kg REAL,
    carry_in_kg REAL,
    remarks TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS field_settings (project_id INTEGER, field_key TEXT, label TEXT, unit TEXT, sort_order INTEGER, visible INTEGER DEFAULT 1, print_visible INTEGER DEFAULT 1, PRIMARY KEY(project_id, field_key))`);
  db.get(`SELECT COUNT(*) AS c FROM projects`, [], (e,r)=>{ if(!e && r.c===0) db.run(`INSERT INTO projects (name) VALUES ('第1現場')`); });
  [['print_settings','report_title','TEXT'],['records','pipe_no','INTEGER']].forEach(c=>addColumnIfMissing(...c));
});
module.exports = db;
