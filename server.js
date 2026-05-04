const express = require('express');
const path = require('path');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ckjbzzccfinnfqajdszp.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpbWFwZmtseW92dHJ2dGhtZWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NzAwNjcsImV4cCI6MjA5MzQ0NjA2N30.Fnjzp2N4hJVrOCr0XHBVxoMi05IPeN7flLDrehJyr9w';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BUCKET = 'photos';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
 res.header('Access-Control-Allow-Origin', '*');
 res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
 res.header('Access-Control-Allow-Headers', 'Content-Type');
 if (req.method === 'OPTIONS') return res.sendStatus(200);
 next();
});

const upload = multer({
 storage: multer.memoryStorage(),
 limits: { fileSize: 10 * 1024 * 1024 },
 fileFilter: (req, file, cb) => {
 if (file.mimetype.startsWith('image/')) cb(null, true);
 else cb(new Error('只支持图片格式'));
 }
});

app.use((err, req, res, next) => {
 if (err instanceof multer.MulterError || err.message.includes('图片')) return res.status(400).json({ error: err.message });
 next(err);
});

async function uploadToStorage(file) {
 const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
 const name = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext;
 const { error } = await supabase.storage.from(BUCKET).upload(name, file.buffer, { contentType: file.mimetype, upsert: true });
 if (error) throw error;
 return supabase.storage.from(BUCKET).getPublicUrl(name).data.publicUrl;
}

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/blessings', async (req, res) => {
 const { data, error } = await supabase.from('blessings').select('*').order('created_at', { ascending: true });
 res.json(error ? [] : data.map(r => ({ id: r.id, name: r.name, message: r.message, time: r.created_at })));
});
app.post('/api/blessings', async (req, res) => {
 const { name, message } = req.body;
 if (!name || !message) return res.status(400).json({ error: 'name and message required' });
 const { data, error } = await supabase.from('blessings').insert({ name, message }).select().single();
 res.json(error ? { error: error.message } : { id: data.id, name: data.name, message: data.message, time: data.created_at });
});
app.delete('/api/blessings/:id', async (req, res) => {
 await supabase.from('blessings').delete().eq('id', req.params.id);
 res.json({ ok: true });
});

app.get('/api/photos', async (req, res) => {
 const { data } = await supabase.from('photos').select('*').order('created_at', { ascending: true });
 const result = {};
 (data || []).forEach(r => {
 if (!result[r.category]) result[r.category] = [];
 result[r.category].push({ url: r.url, uploader: r.uploader, message: r.message, time: r.created_at });
 });
 res.json(result);
});
app.post('/api/photos', upload.single('photo'), async (req, res) => {
 const url = await uploadToStorage(req.file);
 const category = req.body.key || 'default';
 await supabase.from('photos').insert({ category, url });
 res.json({ ok: true, url });
});
app.delete('/api/photos/:key/:index', async (req, res) => {
 const { data } = await supabase.from('photos').select('id').eq('category', req.params.key).order('created_at', { ascending: true });
 if (data && data[parseInt(req.params.index)]) await supabase.from('photos').delete().eq('id', data[parseInt(req.params.index)].id);
 res.json({ ok: true });
});

app.get('/api/pending', async (req, res) => {
 const { data } = await supabase.from('pending').select('*').order('created_at', { ascending: true });
 res.json((data || []).map(r => ({ id: r.id, name: r.name, age: r.age, message: r.message, content: r.content, type: r.type, photo: r.photo_url, time: r.created_at })));
});
app.post('/api/pending', upload.single('photo'), async (req, res) => {
 let photoUrl = null;
 if (req.file) photoUrl = await uploadToStorage(req.file);
 await supabase.from('pending').insert({ name: req.body.name, age: req.body.age, message: req.body.message, content: req.body.content, type: req.body.type || 'blessing', photo_url: photoUrl });
 res.json({ ok: true });
});
app.post('/api/pending/approve/:id', async (req, res) => {
 const { data: item } = await supabase.from('pending').select('*').eq('id', req.params.id).single();
 if (!item) return res.json({ ok: false, error: 'not found' });
 if (item.type === 'year-content' && item.age) {
 if (item.photo_url) await supabase.from('year_photos').insert({ age: parseInt(item.age), url: item.photo_url, uploader: item.name });
 if (item.content) await supabase.from('year_stories').insert({ age: parseInt(item.age), name: item.name, content: item.content });
 } else if (item.type === 'blessing') {
 await supabase.from('blessings').insert({ name: item.name, message: item.message || item.content });
 } else if (item.photo_url) {
 const cat = item.age ? 'age' + item.age : 'misc';
 await supabase.from('photos').insert({ category: cat, url: item.photo_url, uploader: item.name, message: item.message });
 }
 await supabase.from('pending').delete().eq('id', req.params.id);
 res.json({ ok: true });
});
app.delete('/api/pending/:id', async (req, res) => {
 await supabase.from('pending').delete().eq('id', req.params.id);
 res.json({ ok: true });
});

app.get('/api/year/:age', async (req, res) => {
 const age = parseInt(req.params.age);
 const [cover, photos, stories, comments] = await Promise.all([
 supabase.from('year_covers').select('url').eq('age', age).single().then(r => r.data?.url || null).catch(() => null),
 supabase.from('year_photos').select('url, created_at').eq('age', age).order('created_at', { ascending: true }).then(r => (r.data||[]).map(p => ({ url: p.url, time: p.created_at }))).catch(() => []),
 supabase.from('year_stories').select('id, name, content, created_at').eq('age', age).order('created_at', { ascending: true }).then(r => (r.data||[]).map(s => ({ id: s.id, name: s.name, content: s.content, time: s.created_at }))).catch(() => []),
 supabase.from('year_comments').select('id, name, content, created_at').eq('age', age).order('created_at', { ascending: true }).then(r => (r.data||[]).map(c => ({ id: c.id, name: c.name, content: c.content, time: c.created_at }))).catch(() => [])
 ]);
 res.json({ cover, photos, stories, comments });
});
app.post('/api/year/:age/cover', upload.single('cover'), async (req, res) => {
 const url = await uploadToStorage(req.file);
 await supabase.from('year_covers').upsert({ age: parseInt(req.params.age), url }, { onConflict: 'age' });
 res.json({ ok: true, url });
});
app.post('/api/year/:age/photo', upload.single('photo'), async (req, res) => {
 const url = await uploadToStorage(req.file);
 await supabase.from('year_photos').insert({ age: parseInt(req.params.age), url });
 res.json({ ok: true, url });
});
app.post('/api/year/:age/story', async (req, res) => {
 const { name, content } = req.body;
 if (!name || !content) return res.status(400).json({ error: 'name and content required' });
 await supabase.from('year_stories').insert({ age: parseInt(req.params.age), name, content });
 res.json({ ok: true });
});
app.post('/api/year/:age/comment', async (req, res) => {
 const { name, content } = req.body;
 if (!name || !content) return res.status(400).json({ error: 'name and content required' });
 await supabase.from('year_comments').insert({ age: parseInt(req.params.age), name, content });
 res.json({ ok: true });
});
app.delete('/api/year/:age/photo/:index', async (req, res) => {
 const { data } = await supabase.from('year_photos').select('id').eq('age', parseInt(req.params.age)).order('created_at', { as
...(truncated)...
