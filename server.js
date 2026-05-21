const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const FileStoreFactory = require('session-file-store');

const app = express();
const FileStore = FileStoreFactory(session);

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'bukti.json');
const SESSION_DIR = path.join(DATA_DIR, 'sessions');
const ADMIN_USER = process.env.ADMIN_USER || process.env.ADMIN_ID || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || process.env.ADMIN_PASSWORD || '12345';
const SESSION_SECRET = process.env.SESSION_SECRET || 'ganti-session-secret-di-railway';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
ensureDir(DATA_DIR);
ensureDir(SESSION_DIR);
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');

app.use(bodyParser.json({ limit: '3mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '3mb' }));
app.use(session({
  name: 'bukti_sid',
  secret: SESSION_SECRET,
  store: new FileStore({ path: SESSION_DIR, retries: 0, ttl: 86400 }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24
  }
}));

app.use('/css', express.static(path.join(__dirname, 'public/css'), { maxAge: '7d' }));
app.use('/js', express.static(path.join(__dirname, 'public/js'), { maxAge: '7d' }));
app.use('/img', express.static(path.join(__dirname, 'public/img'), { maxAge: '7d' }));
app.use('/admin/css', express.static(path.join(__dirname, 'admin/css'), { maxAge: '7d' }));
app.use('/admin/js', express.static(path.join(__dirname, 'admin/js'), { maxAge: '7d' }));

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8').trim();
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[readData]', err.message);
    return [];
  }
}

function writeData(data) {
  ensureDir(DATA_DIR);
  const safe = Array.isArray(data) ? data : [];
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(safe, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || `bukti-${Date.now()}`;
}

function uniqueSlug(base, posts, currentId) {
  let slug = slugify(base);
  let finalSlug = slug;
  let i = 2;
  while (posts.some(p => p.id === finalSlug && p.id !== currentId)) {
    finalSlug = `${slug}-${i++}`;
  }
  return finalSlug;
}

function normalizePost(input, posts, currentId) {
  const title = String(input.title || '').trim();
  if (!title) return { error: 'Judul wajib diisi' };
  const id = currentId || uniqueSlug(input.id || title, posts, currentId);
  return {
    id,
    title,
    thumb: String(input.thumb || input.image || '').trim(),
    image: String(input.image || input.thumb || '').trim(),
    excerpt: String(input.excerpt || title).trim().slice(0, 180),
    contentHtml: String(input.contentHtml || '').trim(),
    date: input.date || new Date().toISOString(),
    published: input.published === undefined ? true : Boolean(input.published)
  };
}

function publicPosts(q) {
  let posts = readData().filter(p => p.published !== false);
  if (q) {
    const term = String(q).toLowerCase();
    posts = posts.filter(p => `${p.title || ''} ${p.excerpt || ''}`.toLowerCase().includes(term));
  }
  return posts;
}

function requireLoginPage(req, res, next) {
  if (!req.session.user) return res.redirect('/admin/login');
  next();
}

function requireLoginApi(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'unauthorized' });
  next();
}

app.get('/', (req, res) => {
  res.render('pages/index', {
    title: 'Bukti Jackpot Lunas - Merdeka Togel',
    posts: publicPosts(req.query.q),
    q: req.query.q || ''
  });
});

app.get(['/detail', '/detail.html'], (req, res) => {
  const posts = publicPosts();
  const item = posts.find(p => p.id === req.query.id) || null;
  if (!item) return res.status(404).render('pages/detail', { title: 'Data Tidak Ditemukan', item: null, related: [] });
  res.render('pages/detail', {
    title: item.title,
    item,
    related: posts.filter(p => p.id !== item.id).slice(0, 8)
  });
});

app.get('/bukti/:id', (req, res) => {
  const posts = publicPosts();
  const item = posts.find(p => p.id === req.params.id) || null;
  if (!item) return res.status(404).render('pages/detail', { title: 'Data Tidak Ditemukan', item: null, related: [] });
  res.render('pages/detail', { title: item.title, item, related: posts.filter(p => p.id !== item.id).slice(0, 8) });
});

app.get(['/index.html', '/public/index.html'], (req, res) => res.redirect('/'));

app.get(['/admin', '/admin/index.html'], (req, res) => res.redirect('/admin/login'));
app.get(['/admin/login', '/admin/login.html'], (req, res) => {
  if (req.session.user) return res.redirect('/admin/dashboard');
  res.render('admin/login', { title: 'Login Admin • Bukti JP' });
});
app.get(['/admin/dashboard', '/admin/dashboard.html'], requireLoginPage, (req, res) => {
  res.render('admin/dashboard', { title: 'Admin Bukti JP', username: req.session.user });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (String(username || '').trim() === ADMIN_USER && String(password || '') === ADMIN_PASS) {
    req.session.user = ADMIN_USER;
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: 'Username atau password salah' });
});

app.post('/api/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get('/api/me', requireLoginApi, (req, res) => res.json({ username: req.session.user }));

app.get('/api/bukti', (req, res) => {
  const list = req.session.user ? readData() : publicPosts(req.query.q);
  const q = req.query.q;
  if (!q || req.session.user) return res.json(list);
  return res.json(publicPosts(q));
});

app.get('/api/bukti/:id', (req, res) => {
  const list = req.session.user ? readData() : publicPosts();
  const item = list.find(p => p.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  res.json(item);
});

app.post('/api/bukti', requireLoginApi, (req, res) => {
  const posts = readData();
  const post = normalizePost(req.body || {}, posts);
  if (post.error) return res.status(400).json({ error: post.error });
  posts.unshift(post);
  writeData(posts);
  res.json(post);
});

app.put('/api/bukti/:id', requireLoginApi, (req, res) => {
  const posts = readData();
  const idx = posts.findIndex(p => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'not found' });
  const merged = { ...posts[idx], ...(req.body || {}), id: posts[idx].id, date: new Date().toISOString() };
  const post = normalizePost(merged, posts, posts[idx].id);
  if (post.error) return res.status(400).json({ error: post.error });
  posts[idx] = { ...posts[idx], ...post, published: posts[idx].published !== false };
  writeData(posts);
  res.json(posts[idx]);
});

app.patch('/api/bukti/:id/publish', requireLoginApi, (req, res) => {
  const posts = readData();
  const idx = posts.findIndex(p => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'not found' });
  posts[idx].published = Boolean(req.body?.published);
  posts[idx].date = new Date().toISOString();
  writeData(posts);
  res.json({ ok: true, published: posts[idx].published });
});

app.delete('/api/bukti/:id', requireLoginApi, (req, res) => {
  const posts = readData();
  const idx = posts.findIndex(p => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'not found' });
  const removed = posts.splice(idx, 1)[0];
  writeData(posts);
  res.json({ ok: true, removed: removed.id });
});

app.use((req, res) => res.status(404).render('pages/404', { title: 'Halaman Tidak Ditemukan' }));

app.listen(PORT, () => console.log(`Bukti JP EJS running on port ${PORT}`));
