(function(){
  function loadImg(img){
    if (img.dataset.loaded) return;
    const src = img.getAttribute('data-src');
    if (!src) return;
    img.src = src;
    img.dataset.loaded = '1';
  }

  // Jika browser sudah support loading=lazy, tetap pakai observer agar aman di iOS lama
  const imgs = [].slice.call(document.querySelectorAll('img.lazy,[data-src]'));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, obs)=>{
      entries.forEach(ent=>{
        if(ent.isIntersecting){
          loadImg(ent.target);
          obs.unobserve(ent.target);
        }
      });
    }, {rootMargin: '200px 0px'}); // prefetch sebelum masuk viewport

    imgs.forEach(img=> io.observe(img));
  } else {
    // Fallback: muat semua setelah onload + saat scroll
    const onScroll = ()=>{
      imgs.forEach(img=>{
        const rect = img.getBoundingClientRect();
        if(rect.top < window.innerHeight + 200) loadImg(img);
      });
    };
    window.addEventListener('scroll', onScroll, {passive:true});
    window.addEventListener('resize', onScroll, {passive:true});
    window.addEventListener('load', onScroll);
    onScroll();
  }
})();
