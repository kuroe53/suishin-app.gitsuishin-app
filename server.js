const express = require('express');
const cors = require('cors');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const numFields = [
  'pipe_no','face_earth_pressure','sousui','hainyu_flow','kusshin_speed','motooshi_force',
  'cutter_torque','souden_p1','haiden_p2','haiden_p3','haiden_p4','pitching','rolling',
  'viscosity','specific_gravity','zando','precision_center_value','precision_level_value'
];
function cleanRecord(body) {
  const out = {...body};
  numFields.forEach(k => {
    if (out[k] === '' || out[k] === undefined || out[k] === null) out[k] = null;
    else out[k] = Number(out[k]);
  });
  out.project_id = out.project_id ? Number(out.project_id) : 1;
  return out;
}
function run(sql, params=[]) {
  return new Promise((resolve,reject)=>db.run(sql, params, function(err){err?reject(err):resolve(this);}));
}
function all(sql, params=[]) {
  return new Promise((resolve,reject)=>db.all(sql, params, (err,rows)=>err?reject(err):resolve(rows)));
}
function get(sql, params=[]) {
  return new Promise((resolve,reject)=>db.get(sql, params, (err,row)=>err?reject(err):resolve(row)));
}

app.get('/api/projects', async (req,res)=>{
  try { res.json(await all('SELECT * FROM projects ORDER BY id ASC')); }
  catch(e){ res.status(500).json({error:e.message}); }
});
app.post('/api/projects', async (req,res)=>{
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({error:'現場名を入力してください'});
    const r = await run('INSERT INTO projects (name) VALUES (?)',[name]);
    await run('INSERT OR IGNORE INTO print_settings (project_id) VALUES (?)',[r.lastID]);
    res.json({id:r.lastID,name});
  } catch(e){ res.status(500).json({error:e.message}); }
});
app.put('/api/projects/:id', async (req,res)=>{
  try {
    await run("UPDATE projects SET name=?, updated_at=datetime('now','localtime') WHERE id=?",[(req.body.name||'').trim(), req.params.id]);
    res.json({success:true});
  } catch(e){ res.status(500).json({error:e.message}); }
});

app.get('/api/settings/:projectId', async (req,res)=>{
  try {
    await run('INSERT OR IGNORE INTO print_settings (project_id) VALUES (?)',[req.params.projectId]);
    res.json(await get('SELECT * FROM print_settings WHERE project_id=?',[req.params.projectId]));
  } catch(e){ res.status(500).json({error:e.message}); }
});
app.put('/api/settings/:projectId', async (req,res)=>{
  try {
    const b=req.body;
    await run(`INSERT INTO print_settings
      (project_id, construction_name, contractor, span_name, pipe_diameter, jacking_distance, writer, logo_data, updated_at)
      VALUES (?,?,?,?,?,?,?,?,datetime('now','localtime'))
      ON CONFLICT(project_id) DO UPDATE SET
      construction_name=excluded.construction_name, contractor=excluded.contractor,
      span_name=excluded.span_name, pipe_diameter=excluded.pipe_diameter,
      jacking_distance=excluded.jacking_distance, writer=excluded.writer,
      logo_data=excluded.logo_data, updated_at=datetime('now','localtime')`,
      [req.params.projectId,b.construction_name||'',b.contractor||'',b.span_name||'',b.pipe_diameter||'',b.jacking_distance||'',b.writer||'',b.logo_data||'']);
    res.json({success:true});
  } catch(e){ res.status(500).json({error:e.message}); }
});

app.get('/api/next-pipe-no', async (req,res)=>{
  try {
    const projectId = req.query.project_id || 1;
    const row = await get('SELECT MAX(pipe_no) AS max_no FROM records WHERE project_id=?',[projectId]);
    res.json({next:(row && row.max_no ? Number(row.max_no)+1 : 1)});
  } catch(e){ res.status(500).json({error:e.message}); }
});

app.get('/api/records', async (req,res)=>{
  try {
    const projectId = req.query.project_id || 1;
    res.json(await all('SELECT * FROM records WHERE project_id=? ORDER BY datetime(date) ASC, pipe_no ASC, id ASC',[projectId]));
  } catch(e){ res.status(500).json({error:e.message}); }
});
app.get('/api/records/:id', async (req,res)=>{
  try {
    const row = await get('SELECT * FROM records WHERE id=?',[req.params.id]);
    if(!row) return res.status(404).json({error:'見つかりません'});
    res.json(row);
  } catch(e){ res.status(500).json({error:e.message}); }
});

const cols = ['project_id','pipe_no','date','face_earth_pressure','sousui','hainyu_flow','kusshin_speed','motooshi_force','cutter_torque','souden_p1','haiden_p2','haiden_p3','haiden_p4','pitching','rolling','viscosity','specific_gravity','zando','precision_center_direction','precision_center_value','precision_level_direction','precision_level_value','remarks'];

app.post('/api/records', async (req,res)=>{
  try {
    const b = cleanRecord(req.body);
    const r = await run(`INSERT INTO records (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')})`, cols.map(c=>b[c] ?? null));
    res.json({id:r.lastID});
  } catch(e){ res.status(500).json({error:e.message}); }
});
app.put('/api/records/:id', async (req,res)=>{
  try {
    const b=cleanRecord(req.body);
    await run(`UPDATE records SET ${cols.map(c=>`${c}=?`).join(',')}, updated_at=datetime('now','localtime') WHERE id=?`, [...cols.map(c=>b[c] ?? null), req.params.id]);
    res.json({success:true});
  } catch(e){ res.status(500).json({error:e.message}); }
});
app.delete('/api/records/:id', async (req,res)=>{
  try { await run('DELETE FROM records WHERE id=?',[req.params.id]); res.json({success:true}); }
  catch(e){ res.status(500).json({error:e.message}); }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
