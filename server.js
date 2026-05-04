const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname).toLowerCase();
    if (!ext || !['.jpg','.jpeg','.png','.gif','.webp'].includes(ext)) ext = '.jpg';
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只支持 jpg/png/gif/webp 格式图片'));
    }
  }
});

// Multer error handler
app.use((err, req, res, next) => {
  if (err instanceof require('multer').MulterError || err.message.includes('格式')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// Data helpers
const DATA_DIR = path.join(__dirname, 'data');
function readJSON(file) {
  const fp = path.join(DATA_DIR, file);
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
  catch { return (file === 'blessings.json' || file === 'pending.json') ? [] : {}; }
}
function writeJSON(file, data) {
  const fp = path.join(DATA_DIR, file);
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
}
function readYearData(age) {
  const fp = path.join(DATA_DIR, 'years', age + '.json');
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
  catch { return { cover: null, photos: [], stories: [] }; }
}
function writeYearData(age, data) {
  const dir = path.join(DATA_DIR, 'years');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, age + '.json'), JSON.stringify(data, null, 2), 'utf8');
}
function readPetData() {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'pets', 'photos.json'), 'utf8')); }
  catch { return {}; }
}
function writePetData(data) {
  const dir = path.join(DATA_DIR, 'pets');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'photos.json'), JSON.stringify(data, null, 2), 'utf8');
}

// ===== Blessings API =====
app.get('/api/blessings', (req, res) => {
  res.json(readJSON('blessings.json'));
});
app.post('/api/blessings', (req, res) => {
  const { name, message } = req.body;
  if (!name || !message) return res.status(400).json({ error: 'name and message required' });
  const list = readJSON('blessings.json');
  const item = { id: Date.now(), name, message, time: new Date().toISOString() };
  list.push(item);
  writeJSON('blessings.json', list);
  res.json(item);
});
app.delete('/api/blessings/:id', (req, res) => {
  let list = readJSON('blessings.json');
  list = list.filter(b => b.id != req.params.id);
  writeJSON('blessings.json', list);
  res.json({ ok: true });
});

// ===== Photos API (main gallery) =====
app.get('/api/photos', (req, res) => {
  res.json(readJSON('photos.json'));
});
app.post('/api/photos', upload.single('photo'), (req, res) => {
  const data = readJSON('photos.json');
  const key = req.body.key || 'default';
  if (!data[key]) data[key] = [];
  const url = '/uploads/' + req.file.filename;
  data[key].push({ url, time: new Date().toISOString() });
  writeJSON('photos.json', data);
  res.json({ ok: true, url });
});
app.delete('/api/photos/:key/:index', (req, res) => {
  const data = readJSON('photos.json');
  const { key, index } = req.params;
  if (data[key]) { data[key].splice(parseInt(index), 1); writeJSON('photos.json', data); }
  res.json({ ok: true });
});

// ===== Pending (friend uploads) API =====
app.get('/api/pending', (req, res) => {
  res.json(readJSON('pending.json'));
});
app.post('/api/pending', upload.single('photo'), (req, res) => {
  const list = readJSON('pending.json');
  const type = req.query.type || 'covers';
  const url = req.file ? '/uploads/' + req.file.filename : null;
  const item = { id: Date.now(), name: req.body.name, age: req.body.age, message: req.body.message, content: req.body.content, type: req.body.type || 'blessing', photo: url, time: new Date().toISOString() };
  list.push(item);
  writeJSON('pending.json', list);
  res.json({ ok: true });
});
app.post('/api/pending/approve/:id', (req, res) => {
  let list = readJSON('pending.json');
  const item = list.find(p => p.id == req.params.id);
  if (item) {
    if (item.type === 'year-content' && item.age) {
      const yd = readYearData(item.age);
      if (item.photo) yd.photos.push({ url: item.photo, uploader: item.name, time: item.time });
      if (item.content) yd.stories.push({ id: Date.now(), name: item.name, content: item.content, time: item.time });
      writeYearData(item.age, yd);
    } else if (item.type === 'blessing') {
      const bl = readJSON('blessings.json');
      bl.push({ id: Date.now(), name: item.name, message: item.message || item.content, time: item.time });
      writeJSON('blessings.json', bl);
    } else if (item.photo) {
      const photos = readJSON('photos.json');
      const key = item.age ? 'age' + item.age : 'misc';
      if (!photos[key]) photos[key] = [];
      photos[key].push({ url: item.photo, uploader: item.name, message: item.message, time: item.time });
      writeJSON('photos.json', photos);
    }
    list = list.filter(p => p.id != req.params.id);
    writeJSON('pending.json', list);
  }
  res.json({ ok: true });
});
app.delete('/api/pending/:id', (req, res) => {
  let list = readJSON('pending.json');
  list = list.filter(p => p.id != req.params.id);
  writeJSON('pending.json', list);
  res.json({ ok: true });
});

// ===== Year Data API =====
app.get('/api/year/:age', (req, res) => {
  res.json(readYearData(req.params.age));
});
app.post('/api/year/:age/story', (req, res) => {
  const { name, content } = req.body;
  if (!name || !content) return res.status(400).json({ error: 'name and content required' });
  const data = readYearData(req.params.age);
  data.stories.push({ id: Date.now(), name, content, time: new Date().toISOString() });
  writeYearData(req.params.age, data);
  res.json({ ok: true });
});
app.post('/api/year/:age/comment', (req, res) => {
  const { name, content } = req.body;
  if (!name || !content) return res.status(400).json({ error: 'name and content required' });
  const data = readYearData(req.params.age);
  if (!data.comments) data.comments = [];
  data.comments.push({ id: Date.now(), name, content, time: new Date().toISOString() });
  writeYearData(req.params.age, data);
  res.json({ ok: true });
});
app.post('/api/year/:age/cover', upload.single('cover'), (req, res) => {
  const data = readYearData(req.params.age);
  const url = '/uploads/' + req.file.filename;
  data.cover = url;
  writeYearData(req.params.age, data);
  res.json({ ok: true, url });
});
app.post('/api/year/:age/photo', upload.single('photo'), (req, res) => {
  const data = readYearData(req.params.age);
  const url = '/uploads/' + req.file.filename;
  data.photos.push({ url, time: new Date().toISOString() });
  writeYearData(req.params.age, data);
  res.json({ ok: true, url });
});
app.delete('/api/year/:age/photo/:index', (req, res) => {
  const data = readYearData(req.params.age);
  if (data.photos) { data.photos.splice(parseInt(req.params.index), 1); writeYearData(req.params.age, data); }
  res.json({ ok: true });
});
app.delete('/api/year/:age/story/:storyId', (req, res) => {
  const data = readYearData(req.params.age);
  if (data.stories) {
    data.stories = data.stories.filter(s => s.id != req.params.storyId);
    writeYearData(req.params.age, data);
  }
  res.json({ ok: true });
});
app.delete('/api/year/:age/cover', (req, res) => {
  const data = readYearData(req.params.age);
  data.cover = null;
  writeYearData(req.params.age, data);
  res.json({ ok: true });
});

// ===== Pet Photos API =====
app.get('/api/pets', (req, res) => {
  res.json(readPetData());
});
app.post('/api/pets/:id', upload.single('photo'), (req, res) => {
  const data = readPetData();
  const url = '/uploads/' + req.file.filename;
  data[req.params.id] = { url, time: new Date().toISOString() };
  writePetData(data);
  res.json({ ok: true, url });
});

// ===== Anniversary Photos API =====
function readAnniData() {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'anniversary', 'photos.json'), 'utf8')); }
  catch { return {}; }
}
function writeAnniData(data) {
  const dir = path.join(DATA_DIR, 'anniversary');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'photos.json'), JSON.stringify(data, null, 2), 'utf8');
}
app.get('/api/anniversary', (req, res) => res.json(readAnniData()));
app.post('/api/anniversary/:key', upload.single('photo'), (req, res) => {
  const data = readAnniData();
  if (!data[req.params.key]) data[req.params.key] = [];
  const url = '/uploads/' + req.file.filename;
  data[req.params.key].push({ url, time: new Date().toISOString() });
  writeAnniData(data);
  res.json({ ok: true, url });
});
app.delete('/api/anniversary/:key/:index', (req, res) => {
  const data = readAnniData();
  if (data[req.params.key]) { data[req.params.key].splice(parseInt(req.params.index), 1); writeAnniData(data); }
  res.json({ ok: true });
});

// ===== Album (all photos aggregated) =====
app.get('/api/album', (req, res) => {
  const cat = req.query.cat;
  const photos = [];
  const main = readJSON('photos.json');
  Object.keys(main).forEach(k => { (main[k] || []).forEach(p => photos.push({ ...p, cat: k.startsWith('age') ? 'age' : 'misc', key: k })); });
  const ann = readAnniData();
  Object.keys(ann).forEach(k => { (ann[k] || []).forEach(p => photos.push({ ...p, cat: 'anniversary', key: k })); });
  for (let i = 1; i <= 30; i++) { const yd = readYearData(i); (yd.photos || []).forEach(p => photos.push({ ...p, cat: 'age', key: 'age' + i })); }
  const pd = readPetData();
  Object.keys(pd).forEach(k => { if (pd[k] && pd[k].url) photos.push({ ...pd[k], cat: 'pet', key: k }); });
  photos.sort((a, b) => new Date(b.time) - new Date(a.time));
  res.json(cat && cat !== 'all' ? photos.filter(p => p.cat === cat) : photos);
});

// ===== Static files =====
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}));

// SPA fallback for year.html
app.get('/year/:age', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'year.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
