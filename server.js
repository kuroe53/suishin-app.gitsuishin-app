
const express=require('express'), cors=require('cors'), db=require('./database'), path=require('path'), XLSX=require('xlsx');
const app=express(); const PORT=process.env.PORT||3000;
app.use(cors()); app.use(express.json({limit:'50mb'})); app.use(express.static(path.join(__dirname,'public')));
const txt=v=>v==null?'':String(v), num=v=>(v===''||v==null?null:Number(v)), intv=v=>(v===''||v==null?null:parseInt(v,10));
const fields=[
 ['pipe_no','推進管No.',''],['date','日時',''],['kafuatsu','切羽土圧','MPa'],['sousui','送水圧','MPa'],['hainyu_flow','排泥流量','m³/分'],['kusshin_speed','掘進速度','cm/分'],['motooshi_force','元押し推力','kN'],['cutter_torque','カッタートルク','A'],['souden_p1','送泥P1ポンプ','rpm'],['haiden_p2','排泥P2ポンプ','rpm'],['haiden_p3','排泥P3ポンプ','rpm'],['haiden_p4','排泥P4ポンプ','rpm'],['pitching','ピッチング','±'],['rolling','ローリング','±'],['viscosity','粘性','秒'],['specific_gravity','比重',''],['zando','残土量','m³'],['precision_center','推進精度 センター','mm'],['precision_level','推進精度 レベル','mm'],['remarks','特記事項','']
];
function ensureFieldSettings(pid,cb){ let pending=fields.length; fields.forEach((f,i)=>db.run(`INSERT OR IGNORE INTO field_settings(project_id,field_key,label,unit,sort_order,visible,print_visible) VALUES(?,?,?,?,?,1,1)`,[pid,f[0],f[1],f[2],i+1],()=>{if(--pending===0) cb&&cb()}));}
app.get('/api/projects',(q,s)=>db.all('SELECT * FROM projects ORDER BY id',(e,r)=>s.status(e?500:200).json(e?{error:e.message}:r)));
app.post('/api/projects',(q,s)=>{let name=txt(q.body.name).trim(); if(!name)return s.status(400).json({error:'現場名を入力してください'}); db.run('INSERT INTO projects(name) VALUES(?)',[name],function(e){if(e)return s.status(500).json({error:e.message}); ensureFieldSettings(this.lastID,()=>s.json({id:this.lastID,name}))})});
app.get('/api/settings/:pid',(q,s)=>db.get('SELECT * FROM print_settings WHERE project_id=?',[q.params.pid],(e,r)=>s.json(r||{})));
app.post('/api/settings/:pid',(q,s)=>{let b=q.body; db.run(`INSERT INTO print_settings(project_id,construction_name,contractor,span_name,pipe_diameter,push_distance,writer,logo_data,report_title,updated_at) VALUES(?,?,?,?,?,?,?,?,?,datetime('now','localtime'))
ON CONFLICT(project_id) DO UPDATE SET construction_name=excluded.construction_name,contractor=excluded.contractor,span_name=excluded.span_name,pipe_diameter=excluded.pipe_diameter,push_distance=excluded.push_distance,writer=excluded.writer,logo_data=excluded.logo_data,report_title=excluded.report_title,updated_at=datetime('now','localtime')`,
[q.params.pid,txt(b.construction_name),txt(b.contractor),txt(b.span_name),txt(b.pipe_diameter),txt(b.push_distance),txt(b.writer),txt(b.logo_data),txt(b.report_title)||'泥水式推進工データー表'],e=>s.status(e?500:200).json(e?{error:e.message}:{ok:true}))});
app.get('/api/fields/:pid',(q,s)=>ensureFieldSettings(q.params.pid,()=>db.all('SELECT * FROM field_settings WHERE project_id=? ORDER BY sort_order',[q.params.pid],(e,r)=>s.json(r))));
app.post('/api/fields/:pid',(q,s)=>{let arr=q.body.fields||[]; let pending=arr.length; if(!pending)return s.json({ok:true}); arr.forEach((f,i)=>db.run(`UPDATE field_settings SET label=?,unit=?,sort_order=?,visible=?,print_visible=? WHERE project_id=? AND field_key=?`,[txt(f.label),txt(f.unit),intv(f.sort_order)||i+1,f.visible?1:0,f.print_visible?1:0,q.params.pid,f.field_key],()=>{if(--pending===0)s.json({ok:true})}))});
app.get('/api/records/:pid',(q,s)=>db.all('SELECT * FROM records WHERE project_id=? ORDER BY datetime(date), pipe_no',[q.params.pid],(e,r)=>s.json(r)));
app.get('/api/records/:pid/next-pipe-no',(q,s)=>db.get('SELECT MAX(pipe_no) m FROM records WHERE project_id=?',[q.params.pid],(e,r)=>s.json({next:(r&&r.m?Number(r.m):0)+1})));
function vals(b,pid){return [pid,intv(b.pipe_no),txt(b.date),num(b.kafuatsu),num(b.sousui),num(b.hainyu_flow),num(b.kusshin_speed),num(b.motooshi_force),num(b.cutter_torque),num(b.souden_p1),num(b.haiden_p2),num(b.haiden_p3),num(b.haiden_p4),num(b.pitching),num(b.rolling),num(b.viscosity),num(b.specific_gravity),num(b.zando),txt(b.precision_center_direction),num(b.precision_center_value),txt(b.precision_level_direction),num(b.precision_level_value),txt(b.remarks)]}
const cols='project_id,pipe_no,date,kafuatsu,sousui,hainyu_flow,kusshin_speed,motooshi_force,cutter_torque,souden_p1,haiden_p2,haiden_p3,haiden_p4,pitching,rolling,viscosity,specific_gravity,zando,precision_center_direction,precision_center_value,precision_level_direction,precision_level_value,remarks';
app.post('/api/records/:pid',(q,s)=>db.run(`INSERT INTO records(${cols}) VALUES(${Array(23).fill('?').join(',')})`,vals(q.body,q.params.pid),function(e){s.status(e?500:200).json(e?{error:e.message}:{id:this.lastID})}));
app.put('/api/records/:pid/:id',(q,s)=>db.run(`UPDATE records SET ${cols.split(',').slice(1).map(c=>c+'=?').join(',')},updated_at=datetime('now','localtime') WHERE id=? AND project_id=?`,vals(q.body,q.params.pid).slice(1).concat([q.params.id,q.params.pid]),e=>s.status(e?500:200).json(e?{error:e.message}:{ok:true})));
app.delete('/api/records/:pid/:id',(q,s)=>db.run('DELETE FROM records WHERE id=? AND project_id=?',[q.params.id,q.params.pid],e=>s.json({ok:!e})));
app.get('/api/export/excel/:pid',(q,s)=>db.all('SELECT * FROM records WHERE project_id=? ORDER BY datetime(date), pipe_no',[q.params.pid],(e,rows)=>{let data=rows.map(r=>({'推進管No.':r.pipe_no,'日時':r.date,'切羽土圧':r.kafuatsu,'送水圧':r.sousui,'排泥流量':r.hainyu_flow,'掘進速度':r.kusshin_speed,'元押し推力':r.motooshi_force,'カッタートルク':r.cutter_torque,'残土量':r.zando,'特記事項':r.remarks}));let wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data),'掘進データ');let buf=XLSX.write(wb,{type:'buffer',bookType:'xlsx'});s.setHeader('Content-Disposition','attachment; filename=suishin.xlsx');s.send(buf)}));
app.get('/api/backup/:pid',(q,s)=>{db.get('SELECT * FROM projects WHERE id=?',[q.params.pid],(e,p)=>db.all('SELECT * FROM records WHERE project_id=?',[q.params.pid],(e2,records)=>db.get('SELECT * FROM print_settings WHERE project_id=?',[q.params.pid],(e3,settings)=>db.all('SELECT * FROM field_settings WHERE project_id=?',[q.params.pid],(e4,fields)=>db.all('SELECT * FROM lubricant_records WHERE project_id=?',[q.params.pid],(e5,lubricant_records)=>db.get('SELECT * FROM lubricant_settings WHERE project_id=?',[q.params.pid],(e6,lubricant_settings)=>s.json({project:p,settings,fields,records,lubricant_settings,lubricant_records})))))))});

// ---- 滑材注入管理 ----
app.get('/api/lubricant/settings/:pid',(q,s)=>{
  db.get('SELECT * FROM lubricant_settings WHERE project_id=?',[q.params.pid],(e,r)=>{
    if(e) return s.status(500).json({error:e.message});
    if(r) return s.json(r);
    db.run('INSERT OR IGNORE INTO lubricant_settings(project_id) VALUES(?)',[q.params.pid],()=>s.json({project_id:q.params.pid,material_name:'滑材',report_title:'滑材注入管理表'}));
  });
});
app.post('/api/lubricant/settings/:pid',(q,s)=>{
  const b=q.body||{};
  db.run(`INSERT INTO lubricant_settings(project_id,material_name,report_title,updated_at) VALUES(?,?,?,datetime('now','localtime'))
  ON CONFLICT(project_id) DO UPDATE SET material_name=excluded.material_name,report_title=excluded.report_title,updated_at=datetime('now','localtime')`,
  [q.params.pid, txt(b.material_name)||'滑材', txt(b.report_title)||'滑材注入管理表'],
  e=>s.status(e?500:200).json(e?{error:e.message}:{ok:true}));
});
app.get('/api/lubricant/records/:pid',(q,s)=>{
  db.all(`SELECT *,
    SUM(COALESCE(injection_liter,0)) OVER (PARTITION BY date(date) ORDER BY datetime(date), id) AS day_injection_cum,
    SUM(COALESCE(injection_liter,0)) OVER (ORDER BY datetime(date), id) AS total_injection_cum,
    SUM(COALESCE(material_kg,0)) OVER (PARTITION BY date(date) ORDER BY datetime(date), id) AS day_material_cum,
    SUM(COALESCE(material_kg,0)) OVER (ORDER BY datetime(date), id) AS total_material_cum,
    SUM(COALESCE(carry_in_kg,0)) OVER (ORDER BY datetime(date), id) AS total_carry_in_cum,
    SUM(COALESCE(carry_in_kg,0)) OVER (ORDER BY datetime(date), id) - SUM(COALESCE(material_kg,0)) OVER (ORDER BY datetime(date), id) AS remaining_kg
    FROM lubricant_records WHERE project_id=? ORDER BY datetime(date), id`,[q.params.pid],(e,r)=>s.status(e?500:200).json(e?{error:e.message}:r));
});
app.post('/api/lubricant/records/:pid',(q,s)=>{
  const b=q.body||{};
  db.run(`INSERT INTO lubricant_records(project_id,date,injection_pipe_no,injection_liter,material_kg,carry_in_kg,remarks) VALUES(?,?,?,?,?,?,?)`,
  [q.params.pid, txt(b.date), txt(b.injection_pipe_no), num(b.injection_liter), num(b.material_kg), num(b.carry_in_kg), txt(b.remarks)],
  function(e){s.status(e?500:200).json(e?{error:e.message}:{id:this.lastID})});
});
app.put('/api/lubricant/records/:pid/:id',(q,s)=>{
  const b=q.body||{};
  db.run(`UPDATE lubricant_records SET date=?,injection_pipe_no=?,injection_liter=?,material_kg=?,carry_in_kg=?,remarks=?,updated_at=datetime('now','localtime') WHERE project_id=? AND id=?`,
  [txt(b.date), txt(b.injection_pipe_no), num(b.injection_liter), num(b.material_kg), num(b.carry_in_kg), txt(b.remarks), q.params.pid, q.params.id],
  e=>s.status(e?500:200).json(e?{error:e.message}:{ok:true}));
});
app.delete('/api/lubricant/records/:pid/:id',(q,s)=>db.run('DELETE FROM lubricant_records WHERE project_id=? AND id=?',[q.params.pid,q.params.id],e=>s.json({ok:!e})));
app.get('/api/lubricant/export/excel/:pid',(q,s)=>{
  db.all('SELECT * FROM lubricant_records WHERE project_id=? ORDER BY datetime(date), id',[q.params.pid],(e,rows)=>{
    if(e) return s.status(500).json({error:e.message});
    let carry=0, used=0, inj=0;
    const data=rows.map(r=>{carry+=Number(r.carry_in_kg||0); used+=Number(r.material_kg||0); inj+=Number(r.injection_liter||0); return {'日時':r.date,'注入管No.':r.injection_pipe_no,'注入量ℓ':r.injection_liter,'材料kg':r.material_kg,'搬入量kg':r.carry_in_kg,'注入量累計ℓ':inj,'材料累計使用量kg':used,'総搬入量kg':carry,'残数量kg':carry-used,'備考':r.remarks};});
    let wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data),'滑材注入管理');
    let buf=XLSX.write(wb,{type:'buffer',bookType:'xlsx'}); s.setHeader('Content-Disposition','attachment; filename=lubricant.xlsx'); s.send(buf);
  });
});

app.listen(PORT,()=>console.log('server '+PORT));
