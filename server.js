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
