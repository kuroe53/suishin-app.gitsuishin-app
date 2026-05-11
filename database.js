const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'suishin.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);

module.exports = db;
