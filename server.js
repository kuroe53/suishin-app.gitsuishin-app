
const express = require('express');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname,'data','db.json');
app.use(express.json({limit:'15mb'}));
app.use(express.static(path.join(__dirname,'public')));
function blank(){return {projects:[{id:1,name:'サンプル現場'}], projectSettings:{}, fieldSettings:{}, records:[], lubricantSettings:{}, lubricant:[], next:{project:2,record:1,lubricant:1}}}
function load(){try{return JSON.parse(fs.readFileSync(DB_PATH,'utf8'))}catch(e){let d=blank(); save(d); return d}}
function save(d){fs.mkdirSync(path.dirname(DB_PATH),{recursive:true}); fs.writeFileSync(DB_PATH,JSON.stringify(d,null,2),'utf8')}
function n(v){ if(v===''||v===undefined||v===null) return null; const x=Number(v); return isNaN(x)?null:x}
function s(v){return v==null?'':String(v)}
function setting(d,pid){ if(!d.projectSettings[pid]) d.projectSettings[pid]={title:'泥水式推進工データー表',work_name:'',contractor:'',span_name:'',diameter:'',drive_distance:'',writer:'',logo:''}; return d.projectSettings[pid];}
const defaultFields=[
 ['face_pressure','切羽土圧','MPa'],['water_pressure','送水圧','MPa'],['slurry_flow','排泥流量','m³/分'],['speed','掘進速度','cm/分'],['thrust','元押し推力','kN'],['cutter_torque','カッタートルク','A'],
 ['pump_p1','送泥P1ポンプ','rpm'],['pump_p2','排泥P2ポンプ','rpm'],['pump_p3','排泥P3ポンプ','rpm'],['pump_p4','排泥P4ポンプ','rpm'],
 ['pitching','ピッチング','±'],['rolling','ローリング','±'],['viscosity','粘性','秒'],['specific_gravity','比重',''],['soil_amount','残土量','m³'],['accuracy_center','推進精度センター','mm'],['accuracy_level','推進精度レベル','mm'],['remarks','特記事項','']
];
function fields(d,pid){ if(!d.fieldSettings[pid]) d.fieldSettings[pid]=defaultFields.map((x,i)=>({key:x[0],label:x[1],unit:x[2],order:i+1,show:true,print:true})); return d.fieldSettings[pid];}
function lubSetting(d,pid){ if(!d.lubricantSettings[pid]) d.lubricantSettings[pid]={material_name:'滑材'}; return d.lubricantSettings[pid];}
function sortRecords(a){return a.sort((x,y)=>(x.datetime||'').localeCompare(y.datetime||'') || (Number(x.pipe_no)||0)-(Number(y.pipe_no)||0))}
function sortLub(a){return a.sort((x,y)=>(x.date||'').localeCompare(y.date||'') || (Number(x.pipe_no)||0)-(Number(y.pipe_no)||0))}
app.get('/api/projects',(req,res)=>res.json(load().projects));
app.post('/api/projects',(req,res)=>{let d=load(); let p={id:d.next.project++, name:s(req.body.name)||'新規現場'}; d.projects.push(p); save(d); res.json(p)});
app.get('/api/settings/:pid',(req,res)=>{let d=load(), pid=req.params.pid; res.json({projectSettings:setting(d,pid), fields:fields(d,pid), lubricantSettings:lubSetting(d,pid)})});
app.post('/api/settings/:pid',(req,res)=>{let d=load(), pid=req.params.pid; if(req.body.projectSettings)d.projectSettings[pid]=req.body.projectSettings; if(req.body.fields)d.fieldSettings[pid]=req.body.fields; if(req.body.lubricantSettings)d.lubricantSettings[pid]=req.body.lubricantSettings; save(d); res.json({ok:true})});
app.get('/api/records/:pid',(req,res)=>{let d=load(); res.json(sortRecords(d.records.filter(r=>String(r.project_id)===String(req.params.pid))))});
app.post('/api/records/:pid',(req,res)=>{let d=load(), b=req.body, pid=Number(req.params.pid); let rec={id:b.id||d.next.record++, project_id:pid, pipe_no:n(b.pipe_no), datetime:s(b.datetime)};
defaultFields.forEach(f=>{let k=f[0]; rec[k]=(k==='remarks')?s(b[k]):n(b[k])}); if(b.id){let i=d.records.findIndex(r=>r.id==b.id); if(i>=0)d.records[i]=rec; else d.records.push(rec)} else d.records.push(rec); save(d); res.json(rec)});
app.delete('/api/records/:id',(req,res)=>{let d=load(); d.records=d.records.filter(r=>r.id!=req.params.id); save(d); res.json({ok:true})});
app.get('/api/next-pipe/:pid',(req,res)=>{let d=load(); let m=Math.max(0,...d.records.filter(r=>String(r.project_id)===String(req.params.pid)).map(r=>Number(r.pipe_no)||0)); res.json({next:m+1})});
app.get('/api/lubricant/:pid',(req,res)=>{let d=load(); res.json(sortLub(d.lubricant.filter(r=>String(r.project_id)===String(req.params.pid))))});
app.post('/api/lubricant/:pid',(req,res)=>{let d=load(), b=req.body, pid=Number(req.params.pid); let rec={id:b.id||d.next.lubricant++, project_id:pid, date:s(b.date), pipe_no:s(b.pipe_no), injection_l:n(b.injection_l), material_kg:n(b.material_kg), delivery_kg:n(b.delivery_kg), remarks:s(b.remarks)}; if(b.id){let i=d.lubricant.findIndex(r=>r.id==b.id); if(i>=0)d.lubricant[i]=rec; else d.lubricant.push(rec)}else d.lubricant.push(rec); save(d); res.json(rec)});
app.delete('/api/lubricant/:id',(req,res)=>{let d=load(); d.lubricant=d.lubricant.filter(r=>r.id!=req.params.id); save(d); res.json({ok:true})});
app.get('/api/export/:pid',(req,res)=>{let d=load(), pid=req.params.pid, fl=fields(d,pid); let rows=sortRecords(d.records.filter(r=>String(r.project_id)===String(pid))).map(r=>{let o={'推進管No.':r.pipe_no,'日時':r.datetime}; fl.forEach(f=>o[`${f.label}${f.unit?'('+f.unit+')':''}`]=r[f.key]); return o});
let lub=sortLub(d.lubricant.filter(r=>String(r.project_id)===String(pid))); let day={inj:{},mat:{}}; let ti=0,tm=0,td=0; let lrows=lub.map(r=>{ti+=Number(r.injection_l)||0;tm+=Number(r.material_kg)||0;td+=Number(r.delivery_kg)||0;day.inj[r.date]=(day.inj[r.date]||0)+(Number(r.injection_l)||0);day.mat[r.date]=(day.mat[r.date]||0)+(Number(r.material_kg)||0); return {'日付':r.date,'注入管No.':r.pipe_no,'注入量ℓ':r.injection_l,'日注入合計ℓ':day.inj[r.date],'全体累計ℓ':ti,'材料kg':r.material_kg,'日材料合計kg':day.mat[r.date],'累計使用kg':tm,'搬入量kg':r.delivery_kg,'総搬入kg':td,'残数量kg':td-tm,'備考':r.remarks}});
let wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'掘進データ'); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(lrows),'滑材注入管理'); let buf=XLSX.write(wb,{type:'buffer',bookType:'xlsx'}); res.setHeader('Content-Disposition','attachment; filename="suishin.xlsx"'); res.send(buf)});
app.get('/api/backup/:pid',(req,res)=>{let d=load(), pid=req.params.pid; res.json({project:d.projects.find(p=>String(p.id)===String(pid)), projectSettings:setting(d,pid), fields:fields(d,pid), lubricantSettings:lubSetting(d,pid), records:d.records.filter(r=>String(r.project_id)===String(pid)), lubricant:d.lubricant.filter(r=>String(r.project_id)===String(pid))})});
app.listen(PORT,()=>console.log('server started '+PORT));
