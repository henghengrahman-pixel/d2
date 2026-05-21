// --- lazy load helper (sama konsepnya dengan di main.js) ---
let __io = null;
function __ensureObserver() {
  if (!('IntersectionObserver' in window)) return null;
  if (__io) return __io;
  __io = new IntersectionObserver((entries, obs) => {
    entries.forEach(ent => {
      if (ent.isIntersecting) {
        const img = ent.target;
        const src = img.getAttribute('data-src');
        if (src && !img.dataset.loaded) {
          img.src = src;
          img.dataset.loaded = '1';
        }
        obs.unobserve(img);
      }
    });
  }, { rootMargin: '200px 0px' });
  return __io;
}
function observeLazy(img) {
  const src = img.getAttribute('data-src');
  if (!src) return;
  const io = __ensureObserver();
  if (io) { io.observe(img); return; }
  const tryLoad = () => {
    const r = img.getBoundingClientRect();
    if (r.top < (window.innerHeight + 200)) {
      if (!img.dataset.loaded) { img.src = src; img.dataset.loaded = '1'; }
      window.removeEventListener('scroll', tryLoad, { passive:true });
      window.removeEventListener('resize', tryLoad, { passive:true });
    }
  };
  window.addEventListener('scroll', tryLoad, { passive:true });
  window.addEventListener('resize', tryLoad, { passive:true });
  window.addEventListener('load', tryLoad);
  tryLoad();
}

// --- render detail + related ---
async function loadDetail(){
  const params = new URLSearchParams(location.search);
  const id = params.get('id');

  const res = await fetch('/api/bukti');
  const list = await res.json();

  // cari item utama
  const item = list.find(p => p.id === id) || list[0];
  if(!item){ document.getElementById('detail').innerHTML = '<p>Data tidak ditemukan.</p>'; return; }

  // render konten utama
  const wrap = document.getElementById('detail');
  const card = document.createElement('div'); card.className='card';

  const img = document.createElement('img');
  img.className = 'thumb lazy';
  img.alt = item.title || '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.src = 'img/loading.svg';
  img.setAttribute('data-src', item.image || item.thumb || '');
  observeLazy(img);

  const body = document.createElement('div'); body.className='body';
  const h1 = document.createElement('h1'); h1.textContent = item.title || '';
  const meta = document.createElement('div'); meta.className='small';
  meta.textContent = new Date(item.date||Date.now())
    .toLocaleString('id-ID', { weekday: 'long', day: '2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });

  const content = document.createElement('div'); content.className='content';
  content.innerHTML = item.contentHtml || '';

  body.append(h1, meta, content);
  card.append(img, body);
  wrap.append(card);

  // render Bukti JP Lainnya (exclude current)
  const relatedRoot = document.getElementById('related');
  relatedRoot.innerHTML = '';
  list.filter(p => p.id !== item.id).slice(0, 6).forEach(p => {
    const box = document.createElement('a');
    box.href = 'detail.html?id=' + encodeURIComponent(p.id);
    box.className = 'item';

    const timg = document.createElement('img');
    timg.className = 'thumb lazy';
    timg.alt = p.title || '';
    timg.loading = 'lazy';
    timg.decoding = 'async';
    timg.src = 'img/loading.svg';
    timg.setAttribute('data-src', p.thumb || p.image || '');
    observeLazy(timg);

    const body = document.createElement('div'); body.className = 'body';
    const h5 = document.createElement('h5'); h5.textContent = p.title || '';
    const meta = document.createElement('div'); meta.className='meta';
    meta.textContent = new Date(p.date||Date.now())
      .toLocaleDateString('id-ID',{weekday:'long', day:'2-digit', month:'long', year:'numeric'}).toUpperCase();

    body.append(h5, meta);
    box.append(timg, body);
    relatedRoot.append(box);
  });
}

window.addEventListener('load', loadDetail);
