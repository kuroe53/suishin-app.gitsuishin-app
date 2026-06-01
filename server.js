const express = require('express');
const cors = require('cors');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function numberOrNull(v){ if(v===''||v===undefined||v===null) return null; const n=Number(v); return Number.isFinite(n)?n:null; }
const fields = ['project_id','date','pipe_no','ring_no','kafuatsu','sousui','hainyu_flow','kusshin_speed','motooshi_force','cutter_torque','souden_p1','haiden_p2','haiden_p3','haiden_p4','pitching','rolling','viscosity','specific_gravity','zando','precision_center_direction','precision_center_value','precision_level_direction','precision_level_value','remarks'];
const numericFields = new Set(['project_id','pipe_no','kafuatsu','sousui','hainyu_flow','kusshin_speed','motooshi_force','cutter_torque','souden_p1','haiden_p2','haiden_p3','haiden_p4','pitching','rolling','viscosity','specific_gravity','zando','precision_center_value','precision_level_value']);
function bodyParams(body){ return fields.map(f => numericFields.has(f) ? numberOrNull(body[f]) : (body[f] ?? '')); }

app.get('/api/projects', (req,res)=>db.all('SELECT * FROM projects ORDER BY id ASC',[],(e,rows)=>e?res.status(500).json({error:e.message}):res.json(rows)));
app.post('/api/projects',(req,res)=>{
  const {name,client,location}=req.body; if(!name) return res.status(400).json({error:'現場名は必須です'});
  db.run('INSERT INTO projects (name,client,location) VALUES (?,?,?)',[name,client??'',location??''],function(e){e?res.status(500).json({error:e.message}):res.json({id:this.lastID});});
});
app.put('/api/projects/:id',(req,res)=>{
  const p=req.body; if(!p.name) return res.status(400).json({error:'現場名は必須です'});
  db.run(`UPDATE projects SET name=?,client=?,location=?,construction_name=?,contractor=?,span_name=?,pipe_diameter=?,drive_distance=?,writer=?,logo_data=?,updated_at=datetime('now','localtime') WHERE id=?`,
    [p.name,p.client??'',p.location??'',p.construction_name??'',p.contractor??'',p.span_name??'',p.pipe_diameter??'',p.drive_distance??'',p.writer??'',p.logo_data??'',req.params.id],
    e=>e?res.status(500).json({error:e.message}):res.json({success:true}));
});

app.get('/api/next-pipe-no',(req,res)=>{
  const project_id=req.query.project_id||1;
  db.get('SELECT MAX(pipe_no) AS max_no FROM records WHERE project_id=?',[project_id],(e,row)=>{
    if(e) return res.status(500).json({error:e.message});
    res.json({ next_pipe_no: (Number(row?.max_no)||0)+1 });
  });
});

app.get('/api/records',(req,res)=>{
  const {project_id,date_from,date_to}=req.query;
  let q='SELECT records.*, projects.name AS project_name FROM records LEFT JOIN projects ON records.project_id=projects.id WHERE 1=1'; const ps=[];
  if(project_id){q+=' AND records.project_id=?';ps.push(project_id);}
  if(date_from){q+=' AND date>=?';ps.push(date_from);}
  if(date_to){q+=' AND date<=?';ps.push(date_to);}
  q+=' ORDER BY datetime(date) ASC, pipe_no ASC, id ASC';
  db.all(q,ps,(e,rows)=>e?res.status(500).json({error:e.message}):res.json(rows));
});
app.get('/api/records/:id',(req,res)=>db.get('SELECT * FROM records WHERE id=?',[req.params.id],(e,row)=>e?res.status(500).json({error:e.message}):(!row?res.status(404).json({error:'見つかりません'}):res.json(row))));
app.post('/api/records',(req,res)=>{
  if(!req.body.date) return res.status(400).json({error:'日時は必須です'});
  const q=`INSERT INTO records (${fields.join(',')}) VALUES (${fields.map(()=>'?').join(',')})`;
  db.run(q, bodyParams(req.body), function(e){e?res.status(500).json({error:e.message}):res.json({id:this.lastID});});
});
app.put('/api/records/:id',(req,res)=>{
  if(!req.body.date) return res.status(400).json({error:'日時は必須です'});
  const q=`UPDATE records SET ${fields.map(f=>`${f}=?`).join(',')}, updated_at=datetime('now','localtime') WHERE id=?`;
  db.run(q,[...bodyParams(req.body),req.params.id],e=>e?res.status(500).json({error:e.message}):res.json({success:true}));
});
app.delete('/api/records/:id',(req,res)=>db.run('DELETE FROM records WHERE id=?',[req.params.id],e=>e?res.status(500).json({error:e.message}):res.json({success:true})));

app.get('/api/records.csv',(req,res)=>{
  const {project_id}=req.query; let q='SELECT records.*,projects.name AS project_name FROM records LEFT JOIN projects ON records.project_id=projects.id WHERE 1=1'; const ps=[];
  if(project_id){q+=' AND records.project_id=?';ps.push(project_id);} q+=' ORDER BY datetime(date) ASC, pipe_no ASC, id ASC';
  db.all(q,ps,(e,rows)=>{
    if(e) return res.status(500).send(e.message);
    const headers=['現場','日時','推進管No.','リングNo','切羽土圧(Mpa)','送水圧','排泥流量','掘進速度','元押推力','カッタートルク','送泥P1','排泥P2','排泥P3','排泥P4','ピッチング','ローリング','粘性','比重','残土量','センター方向','センター値','レベル方向','レベル値','特記事項'];
    const keys=['project_name','date','pipe_no','ring_no','kafuatsu','sousui','hainyu_flow','kusshin_speed','motooshi_force','cutter_torque','souden_p1','haiden_p2','haiden_p3','haiden_p4','pitching','rolling','viscosity','specific_gravity','zando','precision_center_direction','precision_center_value','precision_level_direction','precision_level_value','remarks'];
    const esc=v=>`"${String(v??'').replaceAll('"','""')}"`;
    res.setHeader('Content-Type','text/csv; charset=utf-8'); res.setHeader('Content-Disposition','attachment; filename="records.csv"');
    res.send('\uFEFF'+[headers.map(esc).join(','),...rows.map(r=>keys.map(k=>esc(r[k])).join(','))].join('\n'));
  });
});
app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));
