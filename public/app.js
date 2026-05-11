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
