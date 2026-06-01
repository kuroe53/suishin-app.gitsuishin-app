const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'suishin.db'));

function addColumn(table, name, definition) {
  db.all(`PRAGMA table_info(${table})`, [], (err, columns) => {
    if (!err && !columns.map(c => c.name).includes(name)) db.run(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  });
}

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      client TEXT,
      location TEXT,
      construction_name TEXT,
      contractor TEXT,
      span_name TEXT,
      pipe_diameter TEXT,
      drive_distance TEXT,
      writer TEXT,
      logo_data TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER DEFAULT 1,
      date TEXT NOT NULL,
      pipe_no INTEGER,
      ring_no TEXT,
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
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY(project_id) REFERENCES projects(id)
    )
  `);

  ['construction_name','contractor','span_name','pipe_diameter','drive_distance','writer','logo_data'].forEach(c => addColumn('projects', c, 'TEXT'));
  addColumn('records', 'project_id', 'INTEGER DEFAULT 1');
  addColumn('records', 'ring_no', 'TEXT');
  addColumn('records', 'pipe_no', 'INTEGER');

  db.get(`SELECT COUNT(*) AS count FROM projects`, [], (err, row) => {
    if (!err && row.count === 0) {
      db.run(`INSERT INTO projects (name, client, location, construction_name, contractor, span_name, pipe_diameter, drive_distance, writer)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['サンプル現場', '北海道開発局', '', '', '', '', '', '', '']);
    }
  });
});
module.exports = db;
