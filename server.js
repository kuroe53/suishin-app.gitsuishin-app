
const express = require('express');
const cors = require('cors');
const db = require('./database');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({limit:'25mb'}));
app.use(express.static(path.join(__dirname, 'public')));

const num = v => (v === '' || v === undefined || v === null ? null : Number(v));
const intv = v => (v === '' || v === undefined || v === null ? null : parseInt(v,10));
const txt = v => (v === undefined || v === null ? '' : String(v));

app.get('/api/projects', (req,res)=>{
  db.all('SELECT * FROM projects ORDER BY id ASC', [], (err, rows)=>{
    if(err) return res.status(500).json({error:err.message});
    res.json(rows);
  });
});
app.post('/api/projects', (req,res)=>{
  const name = txt(req.body.name).trim();
  if(!name) return res.status(400).json({error:'現場名を入力してください'});
  db.run('INSERT INTO projects (name) VALUES (?)', [name], function(err){
    if(err) return res.status(500).json({error:err.message});
    db.run('INSERT OR IGNORE INTO print_settings (project_id) VALUES (?)', [this.lastID]);
    res.json({id:this.lastID, name});
  });
});
app.put('/api/projects/:id', (req,res)=>{
  const name=txt(req.body.name).trim();
  db.run("UPDATE projects SET name=?, updated_at=datetime('now','localtime') WHERE id=?", [name, req.params.id], err=>{
    if(err) return res.status(500).json({error:err.message});
    res.json({success:true});
  });
});

app.get('/api/settings/:projectId',(req,res)=>{
  db.get('SELECT * FROM print_settings WHERE project_id=?', [req.params.projectId], (err,row)=>{
    if(err) return res.status(500).json({error:err.message});
    res.json(row || {project_id:Number(req.params.projectId)});
  });
});
app.put('/api/settings/:projectId',(req,res)=>{
  const p=req.params.projectId;
  const b=req.body;
  db.run(`INSERT INTO print_settings
    (project_id, construction_name, contractor, span_name, pipe_diameter, push_distance, writer, logo_data, updated_at)
    VALUES (?,?,?,?,?,?,?,?,datetime('now','localtime'))
    ON CONFLICT(project_id) DO UPDATE SET
      construction_name=excluded.construction_name,
      contractor=excluded.contractor,
      span_name=excluded.span_name,
      pipe_diameter=excluded.pipe_diameter,
      push_distance=excluded.push_distance,
      writer=excluded.writer,
      logo_data=excluded.logo_data,
      updated_at=datetime('now','localtime')`,
    [p, txt(b.construction_name), txt(b.contractor), txt(b.span_name), txt(b.pipe_diameter), txt(b.push_distance), txt(b.writer), txt(b.logo_data)],
    err => {
      if(err) return res.status(500).json({error:err.message});
      res.json({success:true});
    });
});

app.get('/api/records',(req,res)=>{
  const projectId=req.query.project_id || 1;
  db.all('SELECT * FROM records WHERE project_id=? ORDER BY datetime(date) ASC, pipe_no ASC, id ASC', [projectId], (err,rows)=>{
    if(err) return res.status(500).json({error:err.message});
    res.json(rows);
  });
});
app.get('/api/records/next-pipe-no/:projectId',(req,res)=>{
  db.get('SELECT COALESCE(MAX(pipe_no),0)+1 AS next_no FROM records WHERE project_id=?', [req.params.projectId], (err,row)=>{
    if(err) return res.status(500).json({error:err.message});
    res.json({next_no:row.next_no});
  });
});

const fields = ['project_id','pipe_no','date','kafuatsu','sousui','hainyu_flow','kusshin_speed','motooshi_force','cutter_torque','souden_p1','haiden_p2','haiden_p3','haiden_p4','pitching','rolling','viscosity','specific_gravity','zando','precision_center_direction','precision_center_value','precision_level_direction','precision_level_value','remarks'];
function params(b){
  return [
    intv(b.project_id)||1, intv(b.pipe_no), txt(b.date),
    num(b.kafuatsu), num(b.sousui), num(b.hainyu_flow), num(b.kusshin_speed), num(b.motooshi_force), num(b.cutter_torque),
    num(b.souden_p1), num(b.haiden_p2), num(b.haiden_p3), num(b.haiden_p4), num(b.pitching), num(b.rolling),
    num(b.viscosity), num(b.specific_gravity), num(b.zando), txt(b.precision_center_direction), num(b.precision_center_value),
    txt(b.precision_level_direction), num(b.precision_level_value), txt(b.remarks)
  ];
}
app.post('/api/records',(req,res)=>{
  if(!txt(req.body.date)) return res.status(400).json({error:'日時を入力してください'});
  db.run(`INSERT INTO records (${fields.join(',')}) VALUES (${fields.map(()=>'?').join(',')})`, params(req.body), function(err){
    if(err) return res.status(500).json({error:err.message});
    res.json({id:this.lastID});
  });
});
app.put('/api/records/:id',(req,res)=>{
  const set=fields.map(f=>`${f}=?`).join(',');
  db.run(`UPDATE records SET ${set}, updated_at=datetime('now','localtime') WHERE id=?`, [...params(req.body), req.params.id], err=>{
    if(err) return res.status(500).json({error:err.message});
    res.json({success:true});
  });
});
app.delete('/api/records/:id',(req,res)=>{
  db.run('DELETE FROM records WHERE id=?', [req.params.id], err=>{
    if(err) return res.status(500).json({error:err.message});
    res.json({success:true});
  });
});

app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));
