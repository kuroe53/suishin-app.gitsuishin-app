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

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 1件取得
app.get('/api/records/:id', (req, res) => {
  db.get('SELECT * FROM records WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: '見つかりません' });
    res.json(row);
  });
});

// 登録
app.post('/api/records', (req, res) => {
  const {
    date, kafuatsu, sousui, hainyu_flow, kusshin_speed,
    motooshi_force, cutter_torque, souden_p1, haiden_p2,
    haiden_p3, haiden_p4, pitching, rolling, viscosity,
    specific_gravity, zando,
    precision_center_direction, precision_center_value,
    precision_level_direction, precision_level_value,
    remarks
  } = req.body;

  const query = `
    INSERT INTO records (
      date, kafuatsu, sousui, hainyu_flow, kusshin_speed,
      motooshi_force, cutter_torque, souden_p1, haiden_p2,
      haiden_p3, haiden_p4, pitching, rolling, viscosity,
      specific_gravity, zando,
      precision_center_direction, precision_center_value,
      precision_level_direction, precision_level_value,
      remarks
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `;

  const params = [
    date, kafuatsu, sousui, hainyu_flow, kusshin_speed,
    motooshi_force, cutter_torque, souden_p1, haiden_p2,
    haiden_p3, haiden_p4, pitching, rolling, viscosity,
    specific_gravity, zando,
    precision_center_direction, precision_center_value,
    precision_level_direction, precision_level_value,
    remarks
  ];

  db.run(query, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// 更新
app.put('/api/records/:id', (req, res) => {
  const {
    date, kafuatsu, sousui, hainyu_flow, kusshin_speed,
    motooshi_force, cutter_torque, souden_p1, haiden_p2,
    haiden_p3, haiden_p4, pitching, rolling, viscosity,
    specific_gravity, zando,
    precision_center_direction, precision_center_value,
    precision_level_direction, precision_level_value,
    remarks
  } = req.body;

  const query = `
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
  `;

  const params = [
    date, kafuatsu, sousui, hainyu_flow, kusshin_speed,
    motooshi_force, cutter_torque, souden_p1, haiden_p2,
    haiden_p3, haiden_p4, pitching, rolling, viscosity,
    specific_gravity, zando,
    precision_center_direction, precision_center_value,
    precision_level_direction, precision_level_value,
    remarks, req.params.id
  ];

  db.run(query, params, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// 削除
app.delete('/api/records/:id', (req, res) => {
  db.run('DELETE FROM records WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
