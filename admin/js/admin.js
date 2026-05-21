function flash(msg, ok=true){
  let t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `
    position:fixed;left:50%;top:16px;transform:translateX(-50%);
    background:${ok?'#1ee2a0':'#ef4444'};color:#06120f;
    font-weight:800;padding:10px 14px;border-radius:12px;
    box-shadow:0 10px 24px rgba(0,0,0,.35);z-index:9999
  `;
  document.body.appendChild(t); setTimeout(()=>t.remove(), 1600);
}

async function login(e){
  e.preventDefault();
  const btn = document.querySelector('button[type="submit"]');
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value;

  if(!u || !p){ flash('Lengkapi username & password', false); return false; }

  btn.disabled = true; const old = btn.textContent; btn.textContent = 'Memproses…';
  try{
    const r = await fetch('/api/login',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username:u, password:p})
    });
    if(!r.ok){
      const t = await r.text();
      throw new Error(t || 'Login gagal');
    }
    flash('Login sukses'); 
    // jeda tipis biar toast sempat terlihat
    setTimeout(()=>location.href='/admin/dashboard', 350);
  }catch(err){
    flash((err && err.message) || 'Login gagal', false);
    btn.disabled = false; btn.textContent = old;
  }
  return false;
}

/* Efek halus: kilau emas gerak di tepi card */
(function shimmer(){
  const card = document.querySelector('.card');
  if(!card) return;
  const bar = document.createElement('div');
  bar.style.cssText = `
    position:absolute; inset:auto 12px 12px 12px; height:1px;
    background:linear-gradient(90deg, transparent, rgba(255,216,107,.8), transparent);
    filter:blur(.2px); opacity:.7; border-radius:999px;
    animation:shine 3.2s linear infinite;
  `;
  card.appendChild(bar);
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shine {
      0%{ transform:translateX(-30%) }
      50%{ transform:translateX(30%) }
      100%{ transform:translateX(-30%) }
    }
  `;
  document.head.appendChild(style);
})();
