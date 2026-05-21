// --- helper lazy load (agar gambar muncul juga saat dibuat dinamis) ---
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
  if (!src) return; // tidak ada yang diload
  // Browser modern: pakai IO
  const io = __ensureObserver();
  if (io) {
    io.observe(img);
    return;
  }
  // Fallback (browser lama): load saat scroll/resize/load
  const tryLoad = () => {
    const r = img.getBoundingClientRect();
    if (r.top < (window.innerHeight + 200)) {
      if (!img.dataset.loaded) {
        img.src = src;
        img.dataset.loaded = '1';
      }
      window.removeEventListener('scroll', tryLoad, { passive:true });
      window.removeEventListener('resize', tryLoad, { passive:true });
    }
  };
  window.addEventListener('scroll', tryLoad, { passive:true });
  window.addEventListener('resize', tryLoad, { passive:true });
  window.addEventListener('load', tryLoad);
  tryLoad();
}

// --- kode asli kamu + perbaikan kecil untuk mobile images ---
async function loadPosts(){
  const q = document.getElementById('search').value.trim();
  let url = '/api/bukti';
  if(q) url += '?q=' + encodeURIComponent(q);

  const res = await fetch(url);
  const list = await res.json();
  const root = document.getElementById('posts');
  root.innerHTML = '';

  list.forEach(p=>{
    const col = document.createElement('div'); col.className='card';

    const img = document.createElement('img');
    img.alt = p.title || '';
    // penting agar kompatibel dengan lazy & mobile:
    img.className = 'thumb lazy';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = 'img/loading.svg';                    // placeholder
    img.setAttribute('data-src', p.thumb || p.image || ''); // target asli
    observeLazy(img); // <- sekarang fungsi ini ada

    const body = document.createElement('div'); body.className='body';
    const h5 = document.createElement('h5'); h5.textContent=p.title;
    const meta = document.createElement('div'); meta.className='meta';
    meta.textContent = new Date(p.date||Date.now())
      .toLocaleDateString('id-ID',{weekday:'long', day:'2-digit', month:'long', year:'numeric'})
      .toUpperCase();
    const excerpt = document.createElement('div'); excerpt.className='excerpt'; excerpt.textContent=p.excerpt || '';
    const a = document.createElement('a'); a.className='btn read'; a.href='detail.html?id='+encodeURIComponent(p.id); a.textContent='Read More';

    body.append(h5, meta, excerpt, a);
    col.append(img, body);
    root.append(col);
  });
}
window.addEventListener('load', loadPosts);
