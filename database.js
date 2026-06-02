
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'suishin.db'));

function addColumn(table, col, type){
  db.all(`PRAGMA table_info(${table})`, (err, rows)=>{
    if(err) return console.error(err);
    if(!rows.some(r=>r.name===col)){
      db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`, e=>{ if(e) console.error(e.message); });
    }
  });
}
db.serialize(()=>{
  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS project_settings (
    project_id INTEGER PRIMARY KEY,
    title TEXT DEFAULT '泥水式推進工データー表',
    work_name TEXT DEFAULT '',
    contractor TEXT DEFAULT '',
    span_name TEXT DEFAULT '',
    pipe_diameter TEXT DEFAULT '',
    drive_distance TEXT DEFAULT '',
    writer TEXT DEFAULT '',
    logo_data TEXT DEFAULT '',
    lubricant_material_name TEXT DEFAULT '材料'
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS field_settings (
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
    datetime TEXT,
    face_pressure REAL,
    water_pressure REAL,
    sludge_flow REAL,
    drive_speed REAL,
    main_thrust REAL,
    cutter_torque REAL,
    pump_p1 REAL,
    pump_p2 REAL,
    pump_p3 REAL,
    pump_p4 REAL,
    pitching REAL,
    rolling REAL,
    viscosity REAL,
    specific_gravity REAL,
    soil_amount REAL,
    accuracy_center_dir TEXT,
    accuracy_center REAL,
    accuracy_level_dir TEXT,
    accuracy_level REAL,
    notes TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS lubricant_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    injection_pipe_no TEXT,
    injection_liter REAL DEFAULT 0,
    material_kg REAL DEFAULT 0,
    delivery_kg REAL DEFAULT 0,
    notes TEXT
  )`);
  addColumn('records','project_id','INTEGER DEFAULT 1');
  addColumn('records','pipe_no','INTEGER');
  addColumn('records','datetime','TEXT');
  addColumn('records','main_thrust','REAL');
  addColumn('project_settings','title',"TEXT DEFAULT '泥水式推進工データー表'");
  addColumn('project_settings','lubricant_material_name',"TEXT DEFAULT '材料'");
  db.get('SELECT COUNT(*) AS c FROM projects', (e,row)=>{
    if(!e && row.c===0){
      db.run(`INSERT INTO projects(name) VALUES(?)`, ['サンプル現場'], function(){
        db.run(`INSERT OR IGNORE INTO project_settings(project_id) VALUES(?)`, [this.lastID]);
      });
    }
  });
});
module.exports = db;
