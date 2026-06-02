
const express = require('express');
const cors = require('cors');
const path = require('path');
const XLSX = require('xlsx');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json({limit:'30mb'}));
app.use(express.static(path.join(__dirname,'public')));

const fields = ['kafuatsu','sousui','hainyu_flow','kusshin_speed','motooshi_force','cutter_torque','souden_p1','haiden_p2','haiden_p3','haiden_p4','pitching','rolling','viscosity','specific_gravity','zando','precision_center_value','precision_level_value'];
const defaults = [
 ['kafuatsu','切羽土圧','MPa',10], ['sousui','送水圧','MPa',20], ['hainyu_flow','排泥流量','m³/分',30], ['kusshin_speed','掘進速度','cm/分',40],
 ['motooshi_force','元押し推力','kN',50], ['cutter_torque','カッタートルク','A',60], ['souden_p1','送泥P1ポンプ','rpm',70], ['haiden_p2','排泥P2ポンプ','rpm',80],
 ['haiden_p3','排泥P3ポンプ','rpm',90], ['haiden_p4','排泥P4ポンプ','rpm',100], ['pitching','ピッチング','土',110], ['rolling','ローリング','土',120],
 ['viscosity','粘性','秒',130], ['specific_gravity','比重','',140], ['zando','残土量','m³',150], ['precision_center','推進精度 センター','mm',160],
 ['precision_level','推進精度 レベル','mm',170], ['remarks','特記事項','',180]
];
function num(v){ return v===''||v===undefined||v===null ? null : Number(v); }
function ensureSettings(pid, cb){
 db.run(`INSERT OR IGNORE INTO project_settings(project_id) VALUES (?)`,[pid],()=>{
   let left=defaults.length; if(!left) return cb&&cb();
   defaults.forEach(d=>db.run(`INSERT OR IGNORE INTO item_settings(project_id,field_key,label,unit,sort_order) VALUES (?,?,?,?,?)`,[pid,...d],()=>{ if(--left===0 && cb) cb(); }));
 });
}
function all(sql,params=[]){return new Promise((res,rej)=>db.all(sql,params,(e,r)=>e?rej(e):res(r)));}
function get(sql,params=[]){return new Promise((res,rej)=>db.get(sql,params,(e,r)=>e?rej(e):res(r)));}
function run(sql,params=[]){return new Promise((res,rej)=>db.run(sql,params,function(e){e?rej(e):res(this)}));}

app.get('/api/projects', (req,res)=>db.all(`SELECT * FROM projects ORDER BY id`,[],(e,r)=>e?res.status(500).json({error:e.message}):res.json(r)));
app.post('/api/projects', async (req,res)=>{try{let name=(req.body.name||'').trim(); if(!name) return res.status(400).json({error:'現場名が必要です'}); let r=await run(`INSERT INTO projects(name) VALUES (?)`,[name]); ensureSettings(r.lastID); res.json({id:r.lastID,name});}catch(e){res.status(500).json({error:e.message});}});
app.get('/api/projects/:pid/settings',(req,res)=>ensureSettings(req.params.pid,async()=>{try{res.json({settings:await get(`SELECT * FROM project_settings WHERE project_id=?`,[req.params.pid]), items:await all(`SELECT * FROM item_settings WHERE project_id=? ORDER BY sort_order,id`,[req.params.pid])});}catch(e){res.status(500).json({error:e.message});}}));
app.put('/api/projects/:pid/settings', async (req,res)=>{try{let b=req.body; await run(`INSERT OR IGNORE INTO project_settings(project_id) VALUES (?)`,[req.params.pid]); await run(`UPDATE project_settings SET report_title=?, construction_name=?, contractor=?, span_name=?, pipe_diameter=?, drive_distance=?, writer=?, logo_data=?, lubricant_material_name=?, updated_at=datetime('now','localtime') WHERE project_id=?`,[b.report_title||'',b.construction_name||'',b.contractor||'',b.span_name||'',b.pipe_diameter||'',b.drive_distance||'',b.writer||'',b.logo_data||'',b.lubricant_material_name||'材料',req.params.pid]); res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});
app.put('/api/projects/:pid/items', async (req,res)=>{try{for(const it of (req.body.items||[])){await run(`UPDATE item_settings SET label=?, unit=?, sort_order=?, visible=?, print_visible=? WHERE id=? AND project_id=?`,[it.label,it.unit,Number(it.sort_order)||0,it.visible?1:0,it.print_visible?1:0,it.id,req.params.pid]);} res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});

app.get('/api/records', async (req,res)=>{try{let pid=req.query.project_id||1; res.json(await all(`SELECT * FROM records WHERE project_id=? ORDER BY datetime(date), pipe_no`,[pid]));}catch(e){res.status(500).json({error:e.message});}});
app.get('/api/records/next-pipe-no', async (req,res)=>{try{let r=await get(`SELECT COALESCE(MAX(pipe_no),0)+1 AS next_no FROM records WHERE project_id=?`,[req.query.project_id||1]); res.json(r);}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/records', async (req,res)=>{try{let b=req.body; let vals=[b.project_id||1,num(b.pipe_no),b.date||new Date().toISOString().slice(0,16),...fields.map(f=>num(b[f])),b.precision_center_direction||'',b.precision_level_direction||'',b.remarks||'']; let keys=['project_id','pipe_no','date',...fields,'precision_center_direction','precision_level_direction','remarks']; let q=`INSERT INTO records(${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`; let r=await run(q,vals); res.json({id:r.lastID});}catch(e){res.status(500).json({error:e.message});}});
app.put('/api/records/:id', async (req,res)=>{try{let b=req.body; let keys=['pipe_no','date',...fields,'precision_center_direction','precision_level_direction','remarks']; let vals=[num(b.pipe_no),b.date,...fields.map(f=>num(b[f])),b.precision_center_direction||'',b.precision_level_direction||'',b.remarks||'',req.params.id]; await run(`UPDATE records SET ${keys.map(k=>k+'=?').join(',')}, updated_at=datetime('now','localtime') WHERE id=?`,vals); res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});
app.delete('/api/records/:id', async (req,res)=>{try{await run(`DELETE FROM records WHERE id=?`,[req.params.id]);res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});

app.get('/api/lubricants', async (req,res)=>{try{let rows=await all(`SELECT * FROM lubricant_records WHERE project_id=? ORDER BY datetime(date), id`,[req.query.project_id||1]); let totalInj=0,totalMat=0,totalDel=0, day={}; rows=rows.map(r=>{let d=(r.date||'').slice(0,10); if(!day[d]) day[d]={inj:0,mat:0}; day[d].inj+=Number(r.injection_liter)||0; day[d].mat+=Number(r.material_kg)||0; totalInj+=Number(r.injection_liter)||0; totalMat+=Number(r.material_kg)||0; totalDel+=Number(r.delivery_kg)||0; return {...r, day_injection_total:day[d].inj, total_injection:totalInj, day_material_total:day[d].mat, total_material:totalMat, total_delivery:totalDel, remaining:totalDel-totalMat};}); res.json(rows);}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/lubricants', async (req,res)=>{try{let b=req.body; let r=await run(`INSERT INTO lubricant_records(project_id,date,injection_pipe_no,injection_liter,material_kg,delivery_kg,remarks) VALUES (?,?,?,?,?,?,?)`,[b.project_id||1,b.date||new Date().toISOString().slice(0,16),b.injection_pipe_no||'',num(b.injection_liter),num(b.material_kg),num(b.delivery_kg),b.remarks||'']); res.json({id:r.lastID});}catch(e){res.status(500).json({error:e.message});}});
app.delete('/api/lubricants/:id', async (req,res)=>{try{await run(`DELETE FROM lubricant_records WHERE id=?`,[req.params.id]); res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});

app.get('/api/export/excel', async (req,res)=>{try{let pid=req.query.project_id||1; let rec=await all(`SELECT * FROM records WHERE project_id=? ORDER BY datetime(date),pipe_no`,[pid]); let lub=await all(`SELECT * FROM lubricant_records WHERE project_id=? ORDER BY datetime(date),id`,[pid]); let wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rec),'掘進データ'); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(lub),'滑材注入管理'); let buf=XLSX.write(wb,{type:'buffer',bookType:'xlsx'}); res.setHeader('Content-Disposition','attachment; filename="suishin_export.xlsx"'); res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(buf);}catch(e){res.status(500).json({error:e.message});}});
app.get('/api/backup', async (req,res)=>{try{let pid=req.query.project_id||1; let data={project:await get(`SELECT * FROM projects WHERE id=?`,[pid]),settings:await get(`SELECT * FROM project_settings WHERE project_id=?`,[pid]),items:await all(`SELECT * FROM item_settings WHERE project_id=?`,[pid]),records:await all(`SELECT * FROM records WHERE project_id=?`,[pid]),lubricants:await all(`SELECT * FROM lubricant_records WHERE project_id=?`,[pid])}; res.setHeader('Content-Disposition','attachment; filename="project_backup.json"'); res.json(data);}catch(e){res.status(500).json({error:e.message});}});

app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));
