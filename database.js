
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'suishin.db'));

function addColumnIfMissing(table, column, definition) {
  db.all(`PRAGMA table_info(${table})`, [], (err, rows) => {
    if (err) return console.error(err.message);
    if (!rows.some(r => r.name === column)) {
      db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, [], e => {
        if (e) console.error(`ALTER ${table}.${column}:`, e.message);
      });
    }
  });
}

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS print_settings (
    project_id INTEGER PRIMARY KEY,
    construction_name TEXT,
    contractor TEXT,
    span_name TEXT,
    pipe_diameter TEXT,
    push_distance TEXT,
    writer TEXT,
    logo_data TEXT,
    updated_at TEXT DEFAULT (datetime('now','localtime'))
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

  db.get(`SELECT COUNT(*) AS c FROM projects`, [], (err, row) => {
    if (!err && row.c === 0) db.run(`INSERT INTO projects (name) VALUES (?)`, ['第1現場']);
  });

  const cols = [
    ['records','project_id','INTEGER DEFAULT 1'],
    ['records','pipe_no','INTEGER'],
    ['print_settings','construction_name','TEXT'],
    ['print_settings','contractor','TEXT'],
    ['print_settings','span_name','TEXT'],
    ['print_settings','pipe_diameter','TEXT'],
    ['print_settings','push_distance','TEXT'],
    ['print_settings','writer','TEXT'],
    ['print_settings','logo_data','TEXT']
  ];
  cols.forEach(c => addColumnIfMissing(c[0], c[1], c[2]));
});
module.exports = db;
