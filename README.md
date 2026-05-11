# suishin-app.gitsuishin-app
推進データ管理
{
  "name": "suishin-app",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "better-sqlite3": "^9.4.3",
    "cors": "^2.8.5"
  }
}

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'suishin.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
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
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);

module.exports = db;

const express = require('express');
const cors = require('cors');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 全件取得
app.get('/api/records', (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    let query = 'SELECT * FROM records WHERE 1=1';
    const params = [];

    if (date_from) {
      query += ' AND date >= ?';
      params.push(date_from);
    }
    if (date_to) {
      query += ' AND date <= ?';
      params.push(date_to);
    }

    query += ' ORDER BY date ASC';
    const records = db.prepare(query).all(...params);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1件取得
app.get('/api/records/:id', (req, res) => {
  try {
    const record = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id);
    if (!record) return res.status(404).json({ error: '見つかりません' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 登録
app.post('/api/records', (req, res) => {
  try {
    const {
      date, kafuatsu, sousui, hainyu_flow, kusshin_speed,
      motooshi_force, cutter_torque, souden_p1, haiden_p2,
      haiden_p3, haiden_p4, pitching, rolling, viscosity,
      specific_gravity, zando,
      precision_center_direction, precision_center_value,
      precision_level_direction, precision_level_value,
      remarks
    } = req.body;

    const stmt = db.prepare(`
      INSERT INTO records (
        date, kafuatsu, sousui, hainyu_flow, kusshin_speed,
        motooshi_force, cutter_torque, souden_p1, haiden_p2,
        haiden_p3, haiden_p4, pitching, rolling, viscosity,
        specific_gravity, zando,
        precision_center_direction, precision_center_value,
        precision_level_direction, precision_level_value,
        remarks
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);

    const result = stmt.run(
      date, kafuatsu, sousui, hainyu_flow, kusshin_speed,
      motooshi_force, cutter_torque, souden_p1, haiden_p2,
      haiden_p3, haiden_p4, pitching, rolling, viscosity,
      specific_gravity, zando,
      precision_center_direction, precision_center_value,
      precision_level_direction, precision_level_value,
      remarks
    );

    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新
app.put('/api/records/:id', (req, res) => {
  try {
    const {
      date, kafuatsu, sousui, hainyu_flow, kusshin_speed,
      motooshi_force, cutter_torque, souden_p1, haiden_p2,
      haiden_p3, haiden_p4, pitching, rolling, viscosity,
      specific_gravity, zando,
      precision_center_direction, precision_center_value,
      precision_level_direction, precision_level_value,
      remarks
    } = req.body;

    const stmt = db.prepare(`
      UPDATE records SET
        date=?, kafuatsu=?, sousui=?, hainyu_flow=?, kusshin_speed=?,
        motooshi_force=?, cutter_torque=?, souden_p1=?, haiden_p2=?,
        haiden_p3=?, haiden_p4=?, pitching=?, rolling=?, viscosity=?,
        specific_gravity=?, zando=?,
        precision_center_direction=?, precision_center_value=?,
        precision_level_direction=?, precision_level_value=?,
        remarks=?,
        updated_at=datetime('now','localtime')
      WHERE id=?
    `);

    stmt.run(
      date, kafuatsu, sousui, hainyu_flow, kusshin_speed,
      motooshi_force, cutter_torque, souden_p1, haiden_p2,
      haiden_p3, haiden_p4, pitching, rolling, viscosity,
      specific_gravity, zando,
      precision_center_direction, precision_center_value,
      precision_level_direction, precision_level_value,
      remarks, req.params.id
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 削除
app.delete('/api/records/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM records WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>掘進データ管理</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <h1>掘進データ管理システム</h1>
    <nav>
      <button id="btn-list" class="nav-btn active">一覧</button>
      <button id="btn-input" class="nav-btn">新規入力</button>
    </nav>
  </header>

  <main>
    <!-- 一覧画面 -->
    <section id="view-list">
      <div class="search-bar">
        <label>期間検索：
          <input type="date" id="search-from">
          〜
          <input type="date" id="search-to">
        </label>
        <button id="btn-search">検索</button>
        <button id="btn-reset">リセット</button>
        <button id="btn-print" class="print-btn">🖨 印刷</button>
      </div>
      <div class="table-wrapper">
        <table id="record-table">
          <thead>
            <tr>
              <th>日付</th>
              <th>切羽圧力<br>kg/cm²</th>
              <th>送水圧<br>kg/cm²</th>
              <th>排泥流量<br>m³/分</th>
              <th>掘進速度<br>cm/分</th>
              <th>元押推力<br>t</th>
              <th>カッター<br>トルク A</th>
              <th>送泥P1<br>rpm</th>
              <th>排泥P2<br>rpm</th>
              <th>排泥P3<br>rpm</th>
              <th>排泥P4<br>rpm</th>
              <th>ピッチング<br>±</th>
              <th>ローリング</th>
              <th>粘性<br>秒</th>
              <th>比重</th>
              <th>残土量<br>m³</th>
              <th>推進精度<br>センター</th>
              <th>推進精度<br>レベル</th>
              <th>特記事項</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody id="record-tbody"></tbody>
        </table>
      </div>
    </section>

    <!-- 入力・編集画面 -->
    <section id="view-form" class="hidden">
      <h2 id="form-title">新規入力</h2>
      <form id="data-form">
        <input type="hidden" id="edit-id">

        <div class="form-grid">
          <div class="form-group">
            <label>日付 <span class="required">*</span></label>
            <input type="date" id="f-date" required>
          </div>
          <div class="form-group">
            <label>切羽圧力 (kg/cm²)</label>
            <input type="number" step="0.01" id="f-kafuatsu">
          </div>
          <div class="form-group">
            <label>送水圧 (kg/cm²)</label>
            <input type="number" step="0.01" id="f-sousui">
          </div>
          <div class="form-group">
            <label>排泥流量 (m³/分)</label>
            <input type="number" step="0.01" id="f-hainyu-flow">
          </div>
          <div class="form-group">
            <label>掘進速度 (cm/分)</label>
            <input type="number" step="0.01" id="f-kusshin-speed">
          </div>
          <div class="form-group">
            <label>元押推力 (t)</label>
            <input type="number" step="0.01" id="f-motooshi-force">
          </div>
          <div class="form-group">
            <label>カッタートルク (A)</label>
            <input type="number" step="0.01" id="f-cutter-torque">
          </div>
          <div class="form-group">
            <label>送泥P1ポンプ (rpm)</label>
            <input type="number" step="1" id="f-souden-p1">
          </div>
          <div class="form-group">
            <label>排泥P2ポンプ (rpm)</label>
            <input type="number" step="1" id="f-haiden-p2">
          </div>
          <div class="form-group">
            <label>排泥P3ポンプ (rpm)</label>
            <input type="number" step="1" id="f-haiden-p3">
          </div>
          <div class="form-group">
            <label>排泥P4ポンプ (rpm)</label>
            <input type="number" step="1" id="f-haiden-p4">
          </div>
          <div class="form-group">
            <label>ピッチング (±)</label>
            <input type="number" step="0.1" id="f-pitching">
          </div>
          <div class="form-group">
            <label>ローリング</label>
            <input type="number" step="0.1" id="f-rolling">
          </div>
          <div class="form-group">
            <label>粘性 (秒)</label>
            <input type="number" step="0.1" id="f-viscosity">
          </div>
          <div class="form-group">
            <label>比重</label>
            <input type="number" step="0.001" id="f-specific-gravity">
          </div>
          <div class="form-group">
            <label>残土量 (m³)</label>
            <input type="number" step="0.01" id="f-zando">
          </div>

          <!-- 推進精度 センター -->
          <div class="form-group">
            <label>推進精度 センター</label>
            <div class="direction-input">
              <select id="f-precision-center-dir">
                <option value="">-</option>
                <option value="右">右</option>
                <option value="左">左</option>
              </select>
              <input type="number" step="0.1" id="f-precision-center-val" placeholder="数値">
            </div>
          </div>

          <!-- 推進精度 レベル -->
          <div class="form-group">
            <label>推進精度 レベル</label>
            <div class="direction-input">
              <select id="f-precision-level-dir">
                <option value="">-</option>
                <option value="上">上</option>
                <option value="下">下</option>
              </select>
              <input type="number" step="0.1" id="f-precision-level-val" placeholder="数値">
            </div>
          </div>

          <div class="form-group full-width">
            <label>特記事項</label>
            <textarea id="f-remarks" rows="3"></textarea>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-save">保存</button>
          <button type="button" id="btn-cancel" class="btn-cancel">キャンセル</button>
        </div>
      </form>
    </section>
  </main>

  <script src="app.js"></script>
</body>
</html>

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Meiryo', 'Hiragino Sans', sans-serif;
  font-size: 14px;
  background: #f0f2f5;
  color: #333;
}

header {
  background: #1a4a8a;
  color: white;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  position: sticky;
  top: 0;
  z-index: 100;
}

header h1 {
  font-size: 18px;
}

nav {
  display: flex;
  gap: 8px;
}

.nav-btn {
  padding: 6px 16px;
  border: 2px solid white;
  border-radius: 4px;
  background: transparent;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.nav-btn.active,
.nav-btn:hover {
  background: white;
  color: #1a4a8a;
}

main {
  padding: 20px;
  max-width: 100%;
}

/* 検索バー */
.search-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
  background: white;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}

.search-bar input[type="date"] {
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.search-bar button {
  padding: 6px 14px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

#btn-search {
  background: #1a4a8a;
  color: white;
}

#btn-reset {
  background: #888;
  color: white;
}

.print-btn {
  background: #2a8a4a;
  color: white;
  margin-left: auto;
}

/* テーブル */
.table-wrapper {
  overflow-x: auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1400px;
}

thead th {
  background: #1a4a8a;
  color: white;
  padding: 8px 6px;
  text-align: center;
  font-size: 12px;
  border: 1px solid #1560a0;
  white-space: nowrap;
}

tbody tr:nth-child(even) {
  background: #f5f8ff;
}

tbody tr:hover {
  background: #e8f0fe;
}

tbody td {
  padding: 6px 8px;
  border: 1px solid #ddd;
  text-align: center;
  font-size: 13px;
  white-space: nowrap;
}

tbody td.remarks {
  text-align: left;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-edit {
  padding: 4px 10px;
  background: #f0a500;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  margin-right: 4px;
  font-size: 12px;
}

.btn-delete {
  padding: 4px 10px;
  background: #d9534f;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

/* フォーム */
#view-form {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  max-width: 900px;
  margin: 0 auto;
}

#view-form h2 {
  margin-bottom: 20px;
  color: #1a4a8a;
  border-bottom: 2px solid #1a4a8a;
  padding-bottom: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 13px;
  font-weight: bold;
  color: #555;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  width: 100%;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #1a4a8a;
  box-shadow: 0 0 0 2px rgba(26,74,138,0.15);
}

.direction-input {
  display: flex;
  gap: 8px;
}

.direction-input select {
  width: 80px;
  flex-shrink: 0;
}

.direction-input input {
  flex: 1;
}

.required {
  color: red;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  justify-content: center;
}

.btn-save {
  padding: 10px 40px;
  background: #1a4a8a;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

.btn-save:hover {
  background: #1560a0;
}

.btn-cancel {
  padding: 10px 40px;
  background: #888;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

.hidden {
  display: none;
}

/* 印刷 */
@media print {
  header, .search-bar, .btn-edit, .btn-delete, #btn-print {
    display: none !important;
  }

  body {
    background: white;
  }

  .table-wrapper {
    box-shadow: none;
  }

  table {
    min-width: unset;
    font-size: 10px;
  }

  thead th {
    background: #333 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

/* レスポンシブ */
@media (max-width: 600px) {
  header h1 {
    font-size: 15px;
  }

  main {
    padding: 10px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}

const API = '/api/records';

// ナビゲーション
document.getElementById('btn-list').addEventListener('click', () => showView('list'));
document.getElementById('btn-input').addEventListener('click', () => showNewForm());
document.getElementById('btn-cancel').addEventListener('click', () => showView('list'));
document.getElementById('btn-search').addEventListener('click', loadRecords);
document.getElementById('btn-reset').addEventListener('click', () => {
  document.getElementById('search-from').value = '';
  document.getElementById('search-to').value = '';
  loadRecords();
});
document.getElementById('btn-print').addEventListener('click', () => window.print());
document.getElementById('data-form').addEventListener('submit', saveRecord);

function showView(view) {
  document.getElementById('view-list').classList.toggle('hidden', view !== 'list');
  document.getElementById('view-form').classList.toggle('hidden', view !== 'form');
  document.getElementById('btn-list').classList.toggle('active', view === 'list');
  document.getElementById('btn-input').classList.toggle('active', view === 'form');
  if (view === 'list') loadRecords();
}

function showNewForm() {
  document.getElementById('form-title').textContent = '新規入力';
  document.getElementById('data-form').reset();
  document.getElementById('edit-id').value = '';
  // 今日の日付をデフォルト設定
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('f-date').value = today;
  showView('form');
}

// データ読み込み
async function loadRecords() {
  const from = document.getElementById('search-from').value;
  const to = document.getElementById('search-to').value;
  let url = API;
  const params = new URLSearchParams();
  if (from) params.append('date_from', from);
  if (to) params.append('date_to', to);
  if ([...params].length) url += '?' + params.toString();

  try {
    const res = await fetch(url);
    const data = await res.json();
    renderTable(data);
  } catch (e) {
    alert('データの取得に失敗しました');
  }
}

// テーブル描画
function renderTable(records) {
  const tbody = document.getElementById('record-tbody');
  tbody.innerHTML = '';

  if (records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="20" style="text-align:center;padding:20px;color:#888;">データがありません</td></tr>';
    return;
  }

  records.forEach(r => {
    const centerText = r.precision_center_direction
      ? `${r.precision_center_direction} ${r.precision_center_value ?? ''}`
      : r.precision_center_value ?? '';
    const levelText = r.precision_level_direction
      ? `${r.precision_level_direction} ${r.precision_level_value ?? ''}`
      : r.precision_level_value ?? '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${val(r.kafuatsu)}</td>
      <td>${val(r.sousui)}</td>
      <td>${val(r.hainyu_flow)}</td>
      <td>${val(r.kusshin_speed)}</td>
      <td>${val(r.motooshi_force)}</td>
      <td>${val(r.cutter_torque)}</td>
      <td>${val(r.souden_p1)}</td>
      <td>${val(r.haiden_p2)}</td>
      <td>${val(r.haiden_p3)}</td>
      <td>${val(r.haiden_p4)}</td>
      <td>${val(r.pitching)}</td>
      <td>${val(r.rolling)}</td>
      <td>${val(r.viscosity)}</td>
      <td>${val(r.specific_gravity)}</td>
      <td>${val(r.zando)}</td>
      <td>${centerText}</td>
      <td>${levelText}</td>
      <td class="remarks" title="${r.remarks ?? ''}">${r.remarks ?? ''}</td>
      <td>
        <button class="btn-edit" onclick="editRecord(${r.id})">編集</button>
        <button class="btn-delete" onclick="deleteRecord(${r.id})">削除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function val(v) {
  return v !== null && v !== undefined ? v : '';
}

// 編集
async function editRecord(id) {
  try {
    const res = await fetch(`${API}/${id}`);
    const r = await res.json();

    document.getElementById('form-title').textContent = '編集';
    document.getElementById('edit-id').value = r.id;
    document.getElementById('f-date').value = r.date;
    document.getElementById('f-kafuatsu').value = r.kafuatsu ?? '';
    document.getElementById('f-sousui').value = r.sousui ?? '';
    document.getElementById('f-hainyu-flow').value = r.hainyu_flow ?? '';
    document.getElementById('f-kusshin-speed').value = r.kusshin_speed ?? '';
    document.getElementById('f-motooshi-force').value = r.motooshi_force ?? '';
    document.getElementById('f-cutter-torque').value = r.cutter_torque ?? '';
    document.getElementById('f-souden-p1').value = r.souden_p1 ?? '';
    document.getElementById('f-haiden-p2').value = r.haiden_p2 ?? '';
    document.getElementById('f-haiden-p3').value = r.haiden_p3 ?? '';
    document.getElementById('f-haiden-p4').value = r.haiden_p4 ?? '';
    document.getElementById('f-pitching').value = r.pitching ?? '';
    document.getElementById('f-rolling').value = r.rolling ?? '';
    document.getElementById('f-viscosity').value = r.viscosity ?? '';
    document.getElementById('f-specific-gravity').value = r.specific_gravity ?? '';
    document.getElementById('f-zando').value = r.zando ?? '';
    document.getElementById('f-precision-center-dir').value = r.precision_center_direction ?? '';
    document.getElementById('f-precision-center-val').value = r.precision_center_value ?? '';
    document.getElementById('f-precision-level-dir').value = r.precision_level_direction ?? '';
    document.getElementById('f-precision-level-val').value = r.precision_level_value ?? '';
    document.getElementById('f-remarks').value = r.remarks ?? '';

    showView('form');
  } catch (e) {
    alert('データの取得に失敗しました');
  }
}

// 削除
async function deleteRecord(id) {
  if (!confirm('このデータを削除してもよいですか？')) return;
  try {
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    loadRecords();
  } catch (e) {
    alert('削除に失敗しました');
  }
}

// 保存
async function saveRecord(e) {
  e.preventDefault();
  const id = document.getElementById('edit-id').value;

  const body = {
    date: document.getElementById('f-date').value,
    kafuatsu: numOrNull('f-kafuatsu'),
    sousui: numOrNull('f-sousui'),
    hainyu_flow: numOrNull('f-hainyu-flow'),
    kusshin_speed: numOrNull('f-kusshin-speed'),
    motooshi_force: numOrNull('f-motooshi-force'),
    cutter_torque: numOrNull('f-cutter-torque'),
    souden_p1: numOrNull('f-souden-p1'),
    haiden_p2: numOrNull('f-haiden-p2'),
    haiden_p3: numOrNull('f-haiden-p3'),
    haiden_p4: numOrNull('f-haiden-p4'),
    pitching: numOrNull('f-pitching'),
    rolling: numOrNull('f-rolling'),
    viscosity: numOrNull('f-viscosity'),
    specific_gravity: numOrNull('f-specific-gravity'),
    zando: numOrNull('f-zando'),
    precision_center_direction: document.getElementById('f-precision-center-dir').value || null,
    precision_center_value: numOrNull('f-precision-center-val'),
    precision_level_direction: document.getElementById('f-precision-level-dir').value || null,
    precision_level_value: numOrNull('f-precision-level-val'),
    remarks: document.getElementById('f-remarks').value || null,
  };

  try {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API}/${id}` : API;
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    showView('list');
  } catch (e) {
    alert('保存に失敗しました');
  }
}

function numOrNull(id) {
  const v = document.getElementById(id).value;
  return v === '' ? null : parseFloat(v);
}

// 初期表示
loadRecords();
