
const express=require('express');
const cors=require('cors');
const fs=require('fs');
const path=require('path');
const XLSX=require('xlsx');
const app=express();
const PORT=process.env.PORT||3000;
const DB=path.join(__dirname,'data.json');
app.use(cors());
app.use(express.json({limit:'20mb'}));
app.use(express.static(path.join(__dirname,'public')));

const defaultFields=[
 {key:'face_pressure',label:'切羽土圧',unit:'MPa',order:1,show:true,print:true,graph:true},
 {key:'water_pressure',label:'送水圧',unit:'MPa',order:2,show:true,print:true,graph:true},
 {key:'slurry_flow',label:'排泥流量',unit:'m³/分',order:3,show:true,print:true,graph:true},
 {key:'speed',label:'掘進速度',unit:'cm/分',order:4,show:true,print:true,graph:true},
 {key:'thrust',label:'元押し推力',unit:'kN',order:5,show:true,print:true,graph:true},
 {key:'cutter_torque',label:'カッタートルク',unit:'A',order:6,show:true,print:true,graph:true},
 {key:'pump1',label:'送泥P1ポンプ',unit:'rpm',order:7,show:true,print:true,graph:true},
 {key:'pump2',label:'排泥P2ポンプ',unit:'rpm',order:8,show:true,print:true,graph:true},
 {key:'pump3',label:'排泥P3ポンプ',unit:'rpm',order:9,show:true,print:true,graph:true},
 {key:'pump4',label:'排泥P4ポンプ',unit:'rpm',order:10,show:true,print:true,graph:true},
 {key:'pitching',label:'ピッチング',unit:'±',order:11,show:true,print:true,graph:true},
 {key:'rolling',label:'ローリング',unit:'±',order:12,show:true,print:true,graph:true},
 {key:'viscosity',label:'粘性',unit:'秒',order:13,show:true,print:true,graph:true},
 {key:'specific_gravity',label:'比重',unit:'',order:14,show:true,print:true,graph:true},
 {key:'soil_amount',label:'残土量',unit:'m³',order:15,show:true,print:true,graph:true},
 {key:'precision_center',label:'推進精度センター',unit:'mm',order:16,show:true,print:true,graph:true},
 {key:'precision_level',label:'推進精度レベル',unit:'mm',order:17,show:true,print:true,graph:true}
];
function init(){
 if(!fs.existsSync(DB)){
  fs.writeFileSync(DB,JSON.stringify({projects:[{id:1,name:'デモ現場',settings:{title:'泥水式推進工データー表',workName:'',contractor:'',spanName:'',diameter:'',distance:'',writer:'',logo:''},fields:defaultFields,graphConfigs:[],lubricant:{materialName:'滑材',records:[]},records:[]}],nextProjectId:2,nextRecordId:1,nextLubId:1},null,2));
 }
}
function load(){init();return JSON.parse(fs.readFileSync(DB,'utf8'))}
function save(d){fs.writeFileSync(DB,JSON.stringify(d,null,2))}
function project(d,id){return d.projects.find(p=>p.id==Number(id))}
function num(v){return v===''||v===null||v===undefined?null:Number(v)}
function sortedRecords(p){return [...(p.records||[])].sort((a,b)=>(a.datetime||'').localeCompare(b.datetime||'')||((a.pipe_no||0)-(b.pipe_no||0)))}
function calcLub(rows){let byDay={},cumInj=0,cumMat=0,totalCarry=0; return [...rows].sort((a,b)=>(a.date||'').localeCompare(b.date||'')).map(r=>{let day=r.date||''; byDay[day]=byDay[day]||{inj:0,mat:0}; byDay[day].inj+=Number(r.injection_l||0); byDay[day].mat+=Number(r.material_kg||0); cumInj+=Number(r.injection_l||0); cumMat+=Number(r.material_kg||0); totalCarry+=Number(r.carry_kg||0); return {...r, day_injection:byDay[day].inj, total_injection:cumInj, day_material:byDay[day].mat, total_material:cumMat, total_carry:totalCarry, remaining:totalCarry-cumMat};});}

app.get('/api/projects',(req,res)=>res.json(load().projects.map(p=>({id:p.id,name:p.name}))));
app.post('/api/projects',(req,res)=>{let d=load(); let p={id:d.nextProjectId++,name:req.body.name||'新規現場',settings:{title:'泥水式推進工データー表',workName:'',contractor:'',spanName:'',diameter:'',distance:'',writer:'',logo:''},fields:JSON.parse(JSON.stringify(defaultFields)),graphConfigs:[],lubricant:{materialName:'滑材',records:[]},records:[]}; d.projects.push(p); save(d); res.json(p);});
app.get('/api/project/:id',(req,res)=>{let d=load(),p=project(d,req.params.id); if(!p)return res.status(404).json({error:'not found'}); p.fields=p.fields||defaultFields; p.settings=p.settings||{}; p.graphConfigs=p.graphConfigs||[]; p.lubricant=p.lubricant||{materialName:'滑材',records:[]}; res.json(p);});
app.put('/api/project/:id/settings',(req,res)=>{let d=load(),p=project(d,req.params.id); if(!p)return res.status(404).json({error:'not found'}); p.settings={...p.settings,...req.body}; save(d); res.json(p.settings);});
app.put('/api/project/:id/fields',(req,res)=>{let d=load(),p=project(d,req.params.id); if(!p)return res.status(404).json({error:'not found'}); p.fields=req.body.fields||p.fields||defaultFields; save(d); res.json(p.fields);});
app.get('/api/project/:id/records',(req,res)=>{let d=load(),p=project(d,req.params.id); if(!p)return res.status(404).json({error:'not found'}); res.json(sortedRecords(p));});
app.post('/api/project/:id/records',(req,res)=>{let d=load(),p=project(d,req.params.id); if(!p)return res.status(404).json({error:'not found'}); let r={id:d.nextRecordId++,pipe_no:num(req.body.pipe_no),datetime:req.body.datetime||'',remarks:req.body.remarks||''}; (p.fields||defaultFields).forEach(f=>r[f.key]=num(req.body[f.key])); p.records.push(r); save(d); res.json(r);});
app.put('/api/project/:id/records/:rid',(req,res)=>{let d=load(),p=project(d,req.params.id); if(!p)return res.status(404).json({error:'not found'}); let r=p.records.find(x=>x.id==req.params.rid); if(!r)return res.status(404).json({error:'not found'}); r.pipe_no=num(req.body.pipe_no); r.datetime=req.body.datetime||''; r.remarks=req.body.remarks||''; (p.fields||defaultFields).forEach(f=>r[f.key]=num(req.body[f.key])); save(d); res.json(r);});
app.delete('/api/project/:id/records/:rid',(req,res)=>{let d=load(),p=project(d,req.params.id); if(!p)return res.status(404).json({error:'not found'}); p.records=p.records.filter(x=>x.id!=req.params.rid); save(d); res.json({ok:true});});
app.get('/api/project/:id/next-pipe',(req,res)=>{let d=load(),p=project(d,req.params.id); let max=0; if(p)(p.records||[]).forEach(r=>{if(Number(r.pipe_no)>max)max=Number(r.pipe_no)}); res.json({next:max+1});});
app.put('/api/project/:id/graph-configs',(req,res)=>{let d=load(),p=project(d,req.params.id); if(!p)return res.status(404).json({error:'not found'}); p.graphConfigs=req.body.graphConfigs||[]; save(d); res.json(p.graphConfigs);});

app.get('/api/project/:id/lubricant',(req,res)=>{let d=load(),p=project(d,req.params.id); if(!p)return res.status(404).json({error:'not found'}); p.lubricant=p.lubricant||{materialName:'滑材',records:[]}; res.json({...p.lubricant,records:calcLub(p.lubricant.records||[])});});
app.put('/api/project/:id/lubricant/settings',(req,res)=>{let d=load(),p=project(d,req.params.id); if(!p)return res.status(404).json({error:'not found'}); p.lubricant=p.lubricant||{records:[]}; p.lubricant.materialName=req.body.materialName||'滑材'; save(d); res.json(p.lubricant);});
app.post('/api/project/:id/lubricant',(req,res)=>{let d=load(),p=project(d,req.params.id); if(!p)return res.status(404).json({error:'not found'}); p.lubricant=p.lubricant||{materialName:'滑材',records:[]}; let r={id:d.nextLubId++,date:req.body.date||'',pipe:req.body.pipe||'',injection_l:num(req.body.injection_l),material_kg:num(req.body.material_kg),carry_kg:num(req.body.carry_kg),remarks:req.body.remarks||''}; p.lubricant.records.push(r); save(d); res.json(r);});
app.get('/api/project/:id/export.xlsx',(req,res)=>{let d=load(),p=project(d,req.params.id); if(!p)return res.status(404).send('not found'); let wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(sortedRecords(p)),'掘進データ'); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(calcLub((p.lubricant||{}).records||[])),'滑材注入管理'); let buf=XLSX.write(wb,{bookType:'xlsx',type:'buffer'}); res.setHeader('Content-Disposition','attachment; filename="suishin.xlsx"'); res.send(buf);});
app.get('/api/project/:id/backup',(req,res)=>{let d=load(),p=project(d,req.params.id); if(!p)return res.status(404).send('not found'); res.setHeader('Content-Disposition',`attachment; filename="backup_project_${p.id}.json"`); res.json(p);});

app.listen(PORT,()=>console.log('server running '+PORT));
