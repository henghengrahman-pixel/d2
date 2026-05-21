const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const FileStoreFactory = require('session-file-store');

const app = express();
const FileStore = FileStoreFactory(session);

const PORT =
  process.env.PORT || 8080;

const DATA_DIR =
  process.env.DATA_DIR ||
  path.join(__dirname, 'data');

const DATA_FILE =
  path.join(DATA_DIR, 'bukti.json');

const SESSION_DIR =
  path.join(DATA_DIR, 'sessions');

const ADMIN_USER =
  process.env.ADMIN_USER ||
  process.env.ADMIN_ID ||
  'admin';

const ADMIN_PASS =
  process.env.ADMIN_PASS ||
  process.env.ADMIN_PASSWORD ||
  '12345';

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  'merdeka-secret';

function ensureDir(dir) {

  if (!fs.existsSync(dir)) {

    fs.mkdirSync(dir, {
      recursive: true
    });

  }

}

ensureDir(DATA_DIR);
ensureDir(SESSION_DIR);

if (!fs.existsSync(DATA_FILE)) {

  fs.writeFileSync(
    DATA_FILE,
    '[]',
    'utf8'
  );

}

app.set('trust proxy', 1);

app.set(
  'view engine',
  'ejs'
);

app.set(
  'views',
  path.join(__dirname, 'views')
);

app.disable('x-powered-by');

app.use(bodyParser.json({
  limit: '10mb'
}));

app.use(bodyParser.urlencoded({
  extended: true,
  limit: '10mb'
}));

app.use(session({

  name: 'bukti_sid',

  secret: SESSION_SECRET,

  store: new FileStore({
    path: SESSION_DIR,
    retries: 0,
    ttl: 86400
  }),

  resave: false,

  saveUninitialized: false,

  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge:
      1000 *
      60 *
      60 *
      24
  }

}));

app.use(
  '/css',
  express.static(
    path.join(
      __dirname,
      'public/css'
    )
  )
);

app.use(
  '/js',
  express.static(
    path.join(
      __dirname,
      'public/js'
    )
  )
);

app.use(
  '/img',
  express.static(
    path.join(
      __dirname,
      'public/img'
    )
  )
);

app.use(
  '/admin/css',
  express.static(
    path.join(
      __dirname,
      'admin/css'
    )
  )
);

app.use(
  '/admin/js',
  express.static(
    path.join(
      __dirname,
      'admin/js'
    )
  )
);

function readData() {

  try {

    const raw =
      fs
        .readFileSync(
          DATA_FILE,
          'utf8'
        )
        .trim();

    const parsed =
      raw
        ? JSON.parse(raw)
        : [];

    return Array.isArray(parsed)
      ? parsed
      : [];

  } catch (err) {

    console.log(err);

    return [];

  }

}

function writeData(data) {

  ensureDir(DATA_DIR);

  const tmp =
    `${DATA_FILE}.tmp`;

  fs.writeFileSync(
    tmp,
    JSON.stringify(
      data,
      null,
      2
    ),
    'utf8'
  );

  fs.renameSync(
    tmp,
    DATA_FILE
  );

}

function slugify(value) {

  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .replace(
      /[^a-z0-9]+/g,
      '-'
    )
    .replace(
      /^-+|-+$/g,
      ''
    )
    .slice(0, 90);

}

function publicPosts(q) {

  let posts =
    readData().filter(
      p => p.published !== false
    );

  if (q) {

    const term =
      String(q)
        .toLowerCase();

    posts =
      posts.filter(
        p =>
          `${p.title || ''} ${p.excerpt || ''}`
            .toLowerCase()
            .includes(term)
      );

  }

  return posts;

}

function requireLoginPage(
  req,
  res,
  next
) {

  if (!req.session.user) {

    return res.redirect(
      '/admin/login'
    );

  }

  next();

}

function requireLoginApi(
  req,
  res,
  next
) {

  if (!req.session.user) {

    return res
      .status(401)
      .json({
        error: 'unauthorized'
      });

  }

  next();

}

app.get('/', (req, res) => {

  res.render(
    'pages/index',
    {
      title:
        'Bukti Jackpot Lunas - Merdeka Togel',

      posts:
        publicPosts(
          req.query.q
        ),

      q:
        req.query.q || ''
    }
  );

});

app.get(
  '/bukti/:id',
  (req, res) => {

    const posts =
      publicPosts();

    const item =
      posts.find(
        p =>
          p.id ===
          req.params.id
      );

    if (!item) {

      return res
        .status(404)
        .render(
          'pages/404',
          {
            title:
              'Tidak ditemukan'
          }
        );

    }

    res.render(
      'pages/detail',
      {
        title:
          item.title,

        item,

        related:
          posts
            .filter(
              p =>
                p.id !==
                item.id
            )
            .slice(0, 8)
      }
    );

  }
);

app.get(
  '/admin',
  (req, res) => {

    res.redirect(
      '/admin/login'
    );

  }
);

app.get(
  '/admin/login',
  (req, res) => {

    if (req.session.user) {

      return res.redirect(
        '/admin/dashboard'
      );

    }

    res.render(
      'admin/login',
      {
        title:
          'Login Admin'
      }
    );

  }
);

app.get(
  '/admin/dashboard',
  requireLoginPage,
  (req, res) => {

    res.render(
      'admin/dashboard',
      {
        title:
          'Dashboard Admin',

        username:
          req.session.user
      }
    );

  }
);

app.post(
  '/api/login',
  (req, res) => {

    try {

      const username =
        String(
          req.body.username || ''
        ).trim();

      const password =
        String(
          req.body.password || ''
        ).trim();

      if (
        username !==
          ADMIN_USER ||
        password !==
          ADMIN_PASS
      ) {

        return res
          .status(401)
          .json({
            error:
              'Username atau password salah'
          });

      }

      req.session.user =
        ADMIN_USER;

      req.session.save(
        err => {

          if (err) {

            console.log(err);

            return res
              .status(500)
              .json({
                error:
                  'Session gagal dibuat'
              });

          }

          return res.json({
            ok: true
          });

        }
      );

    } catch (err) {

      console.log(err);

      return res
        .status(500)
        .json({
          error:
            'Internal server error'
        });

    }

  }
);

app.post(
  '/api/logout',
  (req, res) => {

    req.session.destroy(
      () => {

        return res.json({
          ok: true
        });

      }
    );

  }
);

app.get(
  '/api/me',
  requireLoginApi,
  (req, res) => {

    res.json({
      username:
        req.session.user
    });

  }
);

app.get(
  '/api/bukti',
  (req, res) => {

    const list =
      req.session.user
        ? readData()
        : publicPosts(
            req.query.q
          );

    res.json(list);

  }
);

app.post(
  '/api/bukti',
  requireLoginApi,
  (req, res) => {

    const posts =
      readData();

    const post = {

      id:
        slugify(
          req.body.title
        ) +
        '-' +
        Date.now(),

      title:
        String(
          req.body.title || ''
        ).trim(),

      image:
        String(
          req.body.image || ''
        ).trim(),

      thumb:
        String(
          req.body.thumb || ''
        ).trim(),

      excerpt:
        String(
          req.body.excerpt || ''
        ).trim(),

      contentHtml:
        String(
          req.body.contentHtml || ''
        ).trim(),

      published: true,

      date:
        new Date()
          .toISOString()

    };

    posts.unshift(post);

    writeData(posts);

    res.json(post);

  }
);

app.delete(
  '/api/bukti/:id',
  requireLoginApi,
  (req, res) => {

    const posts =
      readData();

    const filtered =
      posts.filter(
        p =>
          p.id !==
          req.params.id
      );

    writeData(filtered);

    res.json({
      ok: true
    });

  }
);

app.use((req, res) => {

  res
    .status(404)
    .render(
      'pages/404',
      {
        title:
          '404 Not Found'
      }
    );

});

app.listen(
  PORT,
  () => {

    console.log(
      `SERVER RUNNING PORT ${PORT}`
    );

  }
);
