const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'suishin.db'));

function addColumn(table, column, definition) {
  db.all(`PRAGMA table_info(${table})`, (err, cols) => {
    if (err) return console.error(err.message);
    if (!cols.some(c => c.name === column)) {
      db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, e => {
        if (e) console.error(`ALTER ${table}.${column}:`, e.message);
      });
    }
  });
}

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS print_settings (
      project_id INTEGER PRIMARY KEY,
      construction_name TEXT,
      contractor TEXT,
      span_name TEXT,
      pipe_diameter TEXT,
      jacking_distance TEXT,
      writer TEXT,
      logo_data TEXT,
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER DEFAULT 1,
      pipe_no INTEGER,
      date TEXT NOT NULL,
      face_earth_pressure REAL,
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

  db.get('SELECT COUNT(*) AS cnt FROM projects', (err, row) => {
    if (!err && row.cnt === 0) db.run('INSERT INTO projects (name) VALUES (?)', ['第1現場']);
  });

  // 旧DBからの移行用
  addColumn('records','project_id','INTEGER DEFAULT 1');
  addColumn('records','pipe_no','INTEGER');
  addColumn('records','face_earth_pressure','REAL');
  addColumn('records','sousui','REAL');
  addColumn('records','hainyu_flow','REAL');
  addColumn('records','kusshin_speed','REAL');
  addColumn('records','motooshi_force','REAL');
  addColumn('records','cutter_torque','REAL');
  addColumn('records','souden_p1','REAL');
  addColumn('records','haiden_p2','REAL');
  addColumn('records','haiden_p3','REAL');
  addColumn('records','haiden_p4','REAL');
  addColumn('records','pitching','REAL');
  addColumn('records','rolling','REAL');
  addColumn('records','viscosity','REAL');
  addColumn('records','specific_gravity','REAL');
  addColumn('records','zando','REAL');
  addColumn('records','precision_center_direction','TEXT');
  addColumn('records','precision_center_value','REAL');
  addColumn('records','precision_level_direction','TEXT');
  addColumn('records','precision_level_value','REAL');
  addColumn('records','remarks','TEXT');

  // 旧項目 kafuatsu がある場合、切羽土圧へコピー
  db.all(`PRAGMA table_info(records)`, (err, cols) => {
    if (!err && cols.some(c => c.name === 'kafuatsu')) {
      db.run(`UPDATE records SET face_earth_pressure = COALESCE(face_earth_pressure, kafuatsu)`);
    }
  });
});

module.exports = db;
