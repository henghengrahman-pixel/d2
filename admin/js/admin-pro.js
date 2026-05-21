/* Admin Bukti JP – match UI & behavior persis screenshot
 * HTML tidak diubah. Hanya CSS + JS ini.
 */

async function me(){
  try{
    const r = await fetch('/api/me');
    if(!r.ok) throw 0;
    return r.json();
  }catch{ location = '/admin/login'; return null; }
}

async function logout(){
  try{ await fetch('/api/logout',{method:'POST'}); }finally{ location='/admin/login'; }
}

// toolbar helpers (pakai perintah bawaan browser biar ringan)
function fmt(el,cmd){ document.execCommand(cmd,false,null); el.blur(); }
function insert(el,html){
  const ed = el.closest('.card').querySelector('.editor');
  ed.focus(); document.execCommand('insertHTML',false,html); el.blur();
}

// WIB timestamp helper
const TZ = 'Asia/Jakarta';
const wibNowText = () => new Date().toLocaleString('id-ID',{ timeZone:TZ, hour12:false });

// ---------- DATA LAYER ----------
async function apiList(){
  const r = await fetch('/api/bukti');
  if(!r.ok) return [];
  return r.json();
}
async function apiSave(payload){
  const method = payload.id ? 'PUT' : 'POST';
  const url = payload.id ? ('/api/bukti/'+encodeURIComponent(payload.id)) : '/api/bukti';
  const res = await fetch(url,{
    method, headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  if(!res.ok) throw new Error('save-failed');
  return res.json();
}
async function apiPub(id, published){
  const res = await fetch('/api/bukti/'+encodeURIComponent(id)+'/publish',{
    method:'PATCH', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({published})
  });
  if(!res.ok) throw new Error('pub-failed');
  return res.json();
}
async function apiDel(id){
  const res = await fetch('/api/bukti/'+encodeURIComponent(id),{method:'DELETE'});
  if(!res.ok) throw new Error('del-failed');
}

// ---------- RENDER ----------
function renumber(){
  document.querySelectorAll('#cards .card').forEach((c,i)=>{
    const n = i+1;
    c.querySelector('.badge').textContent = `\$ Bukti JP #${n}`;
    c.querySelector('.pub-btn').textContent  = `✓ Publikasikan Artikel #${n}?`;
    c.querySelector('.hide-btn').textContent = `✖ Sembunyikan Artikel #${n}?`;
    c.querySelector('.del-btn').textContent  = `✖ Hapus BuktiJP #${n}`;
  });
}

function makeHint(afterEl){
  // teks kecil IMGBB seperti di screenshot
  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.innerHTML = 'Upload gambar? langsung ke link ini >>> <a href="https://imgbb.com" target="_blank" rel="noopener">IMGBB</a>';
  afterEl.insertAdjacentElement('afterend', hint);
}

function attachPreview(block, thumbInput){
  const img = document.createElement('img');
  img.className = 'preview';
  img.alt = 'tidak ada gambar promo';
  block.insertAdjacentElement('afterend', img);

  const refresh = () => {
    const url = (thumbInput.value || '').trim();
    img.src = url || '';
    img.style.display = url ? 'block' : 'none';
  };
  thumbInput.addEventListener('input', refresh);
  refresh();
  return img;
}

function bindCardEvents(card, data={}){
  const id      = data.id || '';
  card.dataset.id = id;

  const title   = card.querySelector('.title');
  const thumb   = card.querySelector('.thumb');
  const excerpt = card.querySelector('.excerpt');
  const editor  = card.querySelector('.editor');
  const update  = card.querySelector('.update');
  const pubBtn  = card.querySelector('.pub-btn');
  const hideBtn = card.querySelector('.hide-btn');
  const delBtn  = card.querySelector('.del-btn');
  const saveBtn = card.querySelector('.save-btn');

  // isi awal
  title.value        = data.title   || '';
  thumb.value        = data.thumb   || data.image || '';
  excerpt.value      = data.excerpt || '';
  editor.innerHTML   = data.contentHtml || data.html || '';
  const isPublished  = !!data.published;
  pubBtn.style.display  = isPublished ? 'none' : 'inline-flex';
  hideBtn.style.display = isPublished ? 'inline-flex' : 'none';

  // timestamp (format seperti screenshot)
  const stamp = data.date ? new Date(data.date) : new Date();
  update.textContent = `Update pada : ${stamp.toLocaleString('id-ID',{ timeZone:TZ, hour12:false })} WIB`;

  // hint + preview
  makeHint(update);
  attachPreview(update, thumb);

  // setiap perubahan -> update timestamp WIB
  const touch = () => { update.textContent = `Update pada : ${wibNowText()} WIB`; };
  [title, thumb, excerpt, editor].forEach(el=>{
    const evt = (el === editor) ? 'input' : 'input';
    el.addEventListener(evt, touch);
  });

  // actions
  saveBtn.addEventListener('click', async ()=>{
    const payload = {
      id: card.dataset.id || undefined,
      title: title.value.trim(),
      thumb: thumb.value.trim(),
      excerpt: excerpt.value.trim(),
      contentHtml: editor.innerHTML.trim()
    };
    try{
      const rs = await apiSave(payload);
      if(rs?.id) card.dataset.id = rs.id;
      alert('Tersimpan');
      await loadAll(); // refresh supaya state publish & penomoran rapih
    }catch{ alert('Gagal simpan'); }
  });

  pubBtn.addEventListener('click', async ()=>{
    if(!card.dataset.id){ alert('Simpan dulu sebelum publish.'); return; }
    try{ await apiPub(card.dataset.id, true); await loadAll(); }catch{ alert('Gagal update status'); }
  });

  hideBtn.addEventListener('click', async ()=>{
    if(!card.dataset.id){ alert('Simpan dulu sebelum sembunyikan.'); return; }
    try{ await apiPub(card.dataset.id, false); await loadAll(); }catch{ alert('Gagal update status'); }
  });

  delBtn.addEventListener('click', async ()=>{
    if(!confirm('Hapus Bukti JP ini?')) return;
    if(card.dataset.id){
      try{ await apiDel(card.dataset.id); }catch{ alert('Gagal menghapus'); return; }
    }
    card.remove(); renumber();
  });
}

function cardFromData(d={}){
  const tpl = document.getElementById('card-tpl');
  const node = tpl.content.firstElementChild.cloneNode(true);
  bindCardEvents(node, d);
  return node;
}

function addCard(){
  document.getElementById('cards').prepend(cardFromData({}));
  renumber();
}
window.addCard = addCard;

async function loadAll(){
  const wrap = document.getElementById('cards');
  wrap.innerHTML = '';
  let data = [];
  try{ data = await apiList(); }catch{ data = []; }
  if(!Array.isArray(data) || data.length===0){
    addCard();
  }else{
    data.forEach(d=> wrap.append(cardFromData(d)));
    renumber();
  }
}

// ---------- BOOT ----------
(async function init(){
  const info = await me(); if(!info) return;
  await loadAll();
})();
