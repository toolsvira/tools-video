'use strict';
/* Tools Video: ambil frame dari video, semuanya di perangkat (tanpa server). */
const FPS = 24;          // dipakai untuk geser 1 frame
const EPS = 0.01;        // jarak dari ujung video supaya yang terambil memang frame paling akhir
const $ = id => document.getElementById(id);
const el = {};
['drop','privasi','panelVideo','v','btnReset','btnPlay','btnFull','waktu','rng','btnMundur','btnMaju','btnPilih','btnAmbil','err','hasil','hasilKosong','img','dim','posisi','btnSimpan','ios','berkas','toast','btnMenu','menu','btnPasang','infoPasang'].forEach(i => el[i] = $(i));

let durasi = 0, tCari = 0, urlVideo = '', urlHasil = '', namaDasar = 'video', namaFile = 'frame.png', tToast = 0, tReset = 0, sudahSimpan = true, promptPasang = null;
const akhir = () => tCari >= durasi - EPS - 1e-6;

/* ---------- bantu ---------- */
const fmt = t => { t = Math.max(0, t); const m = Math.floor(t / 60); return m + ':' + (t - m * 60).toFixed(1).padStart(4, '0'); };
const frameSiap = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
function pesan(teks) { clearTimeout(tToast); el.toast.textContent = teks; el.toast.hidden = false; tToast = setTimeout(() => el.toast.hidden = true, 3200); }
function galat(teks) { el.err.textContent = teks; el.err.hidden = !teks; }
function sibuk(btn, on, teks) {
  const s = btn.querySelector('span');
  if (on) { btn._t = s.textContent; s.textContent = teks; btn.classList.add('busy'); btn.disabled = true; }
  else { s.textContent = btn._t || s.textContent; btn.classList.remove('busy'); btn.disabled = false; }
}
function ikon(btn, id) { btn.querySelector('use').setAttribute('href', '#' + id); }

/* ---------- tampilan ---------- */
function segarkan() {
  const v = el.v, akh = akhir();
  const nilai = akh ? 1000 : Math.min(999, Math.round(tCari / durasi * 1000));
  el.rng.value = nilai;
  el.rng.style.setProperty('--p', (nilai / 10) + '%');
  el.waktu.textContent = fmt(tCari) + ' / ' + fmt(durasi);
  if (!el.btnAmbil.classList.contains('busy')) el.btnAmbil.querySelector('span').textContent = akh ? 'Ambil frame terakhir' : 'Ambil frame ini';
  const main = !v.paused;
  el.btnPlay.classList.toggle('main', main);
  ikon(el.btnPlay, main ? 'i-pause' : 'i-play');
  el.btnPlay.setAttribute('aria-label', main ? 'Jeda' : 'Putar');
}

/* ---------- pindah posisi video ---------- */
function cari(t) {
  const v = el.v;
  t = Math.min(Math.max(0, t), Math.max(0, durasi - EPS));
  tCari = t;
  return new Promise((ok, gagal) => {
    if (Math.abs(v.currentTime - t) < 0.0005 && v.readyState >= 2 && !v.seeking) return ok();
    let timer;
    const bersih = () => { clearTimeout(timer); v.removeEventListener('seeked', b); v.removeEventListener('error', e); };
    const b = () => { bersih(); ok(); }, e = () => { bersih(); gagal(new Error('cari')); };
    v.addEventListener('seeked', b); v.addEventListener('error', e);
    timer = setTimeout(() => { bersih(); gagal(new Error('lama')); }, 10000);
    v.currentTime = t;
  });
}

/* ---------- buka video ---------- */
async function bukaVideo(file) {
  galat('');
  if (!file) return;
  const ok = /^video\//.test(file.type) || /\.(mp4|mov|m4v|webm|mkv)$/i.test(file.name);
  if (!ok) return galat('Itu bukan file video. Pilih video MP4, MOV, atau WebM.');
  sibuk(el.btnPilih, true, 'Membuka video...');
  try {
    el.v.pause();
    if (urlVideo) URL.revokeObjectURL(urlVideo);
    urlVideo = URL.createObjectURL(file);
    el.v.src = urlVideo;
    await new Promise((ok, gagal) => {
      const t = setTimeout(() => gagal(new Error('lama')), 20000);
      el.v.onloadedmetadata = () => { clearTimeout(t); ok(); };
      el.v.onerror = () => { clearTimeout(t); gagal(new Error('rusak')); };
    });
    el.v.onloadedmetadata = el.v.onerror = null;
    if (!isFinite(el.v.duration) || el.v.duration <= 0 || !el.v.videoWidth) throw new Error('kosong');
    durasi = el.v.duration;
    namaDasar = file.name.replace(/\.[^.]+$/, '').replace(/[^\w\-]+/g, '_').slice(0, 40) || 'video';
    await cari(durasi);          // tampilkan frame paling akhir lebih dulu
    el.drop.hidden = el.privasi.hidden = true;
    el.panelVideo.hidden = false;
    el.btnAmbil.disabled = false;
    el.btnReset.hidden = false;
    kosongkanHasil();
    segarkan();
  } catch (e) {
    el.v.onloadedmetadata = el.v.onerror = null;
    galat('Video ini tidak bisa dibuka. Coba video MP4 hasil unduhan dari Flow.');
    ulang(false);
  } finally {
    sibuk(el.btnPilih, false);
    el.berkas.value = '';
  }
}

function kosongkanHasil() {
  if (urlHasil) URL.revokeObjectURL(urlHasil);
  urlHasil = ''; el.img.removeAttribute('src');
  el.hasil.hidden = true; el.hasilKosong.hidden = false;
}

function ulang(bersih = true) {
  el.v.pause(); el.v.removeAttribute('src'); el.v.load();
  if (urlVideo) URL.revokeObjectURL(urlVideo);
  urlVideo = ''; durasi = tCari = 0;
  kosongkanHasil();
  el.panelVideo.hidden = true; el.drop.hidden = el.privasi.hidden = false;
  el.btnAmbil.disabled = true; el.btnAmbil.querySelector('span').textContent = 'Ambil frame terakhir';
  el.btnReset.hidden = true; batalReset();
  if (bersih) galat('');
}

/* ---------- ambil frame ---------- */
async function ambil() {
  galat('');
  sibuk(el.btnAmbil, true, 'Mengambil frame...');
  el.btnReset.disabled = true;
  try {
    el.v.pause();
    const akh = akhir(), t = tCari;
    await cari(t);
    await frameSiap();
    const w = el.v.videoWidth, h = el.v.videoHeight;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(el.v, 0, 0, w, h);
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    if (!blob) throw new Error('png');
    if (urlHasil) URL.revokeObjectURL(urlHasil);
    urlHasil = URL.createObjectURL(blob);
    el.img.src = urlHasil;
    el.dim.textContent = w + ' x ' + h + ' px';
    el.posisi.textContent = akh ? 'Frame paling akhir video' : 'Detik ke-' + t.toFixed(2).replace('.', ',');
    namaFile = namaDasar + (akh ? '_frame_akhir' : '_frame_' + t.toFixed(2).replace('.', '_')) + '.png';
    sudahSimpan = false;
    el.hasil.hidden = false; el.hasilKosong.hidden = true;
    el.hasil.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (e) {
    galat('Frame gagal diambil. Coba sekali lagi, atau geser sedikit ke frame sebelumnya.');
  } finally {
    sibuk(el.btnAmbil, false);
    el.btnReset.disabled = false;
    segarkan();
  }
}

function simpan() {
  if (!urlHasil) return;
  const a = document.createElement('a');
  a.href = urlHasil; a.download = namaFile;
  document.body.appendChild(a); a.click(); a.remove();
  sudahSimpan = true;
  pesan('Gambar dikirim ke unduhan: ' + namaFile);
}

/* ---------- reset: kalau ada frame yang belum disimpan, minta tekan sekali lagi ---------- */
const labelReset = t => el.btnReset.querySelector('span').textContent = t;
function batalReset() { clearTimeout(tReset); tReset = 0; labelReset('Reset, pilih video lain'); }
function reset() {
  if (urlHasil && !sudahSimpan && !tReset) {
    labelReset('Frame belum disimpan. Tekan lagi untuk reset');
    tReset = setTimeout(batalReset, 4000);
    return;
  }
  batalReset(); ulang();
  pesan('Sudah direset. Silakan pilih video baru.');
}

/* ---------- pemutar ---------- */
function putar() {
  const v = el.v;
  if (v.paused) {
    if (akhir()) v.currentTime = 0;
    v.play().catch(() => galat('Video tidak bisa diputar di sini, tapi frame tetap bisa diambil.'));
  } else v.pause();
}
const geserFrame = arah => { el.v.pause(); cari(tCari + arah / FPS).then(segarkan).catch(() => {}); };

/* ---------- pasang kejadian ---------- */
el.btnPilih.onclick = () => el.berkas.click();
el.berkas.onchange = () => bukaVideo(el.berkas.files[0]);
el.btnReset.onclick = reset;
el.btnAmbil.onclick = ambil;
el.btnSimpan.onclick = simpan;
el.btnPlay.onclick = el.v.onclick = putar;
el.btnMundur.onclick = () => geserFrame(-1);
el.btnMaju.onclick = () => geserFrame(1);
el.btnFull.onclick = () => { const v = el.v; (v.requestFullscreen || v.webkitEnterFullscreen || (() => {})).call(v); };
el.rng.oninput = () => {
  el.v.pause();
  const n = +el.rng.value;
  cari(n >= 1000 ? durasi : n / 1000 * durasi).then(segarkan).catch(() => {});
  el.rng.style.setProperty('--p', (n / 10) + '%');
  el.waktu.textContent = fmt(tCari) + ' / ' + fmt(durasi);
};
el.v.onplay = el.v.onpause = segarkan;
el.v.ontimeupdate = () => { if (!el.v.paused) { tCari = el.v.currentTime; segarkan(); } };
el.v.onended = () => { tCari = durasi; segarkan(); };

/* tarik file ke kotak (laptop) */
['dragenter', 'dragover'].forEach(n => el.drop.addEventListener(n, e => { e.preventDefault(); el.drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(n => el.drop.addEventListener(n, e => { e.preventDefault(); el.drop.classList.remove('over'); }));
el.drop.addEventListener('drop', e => bukaVideo(e.dataTransfer.files[0]));
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => e.preventDefault());

/* ---------- menu dan pasang aplikasi ---------- */
const tutupMenu = () => { el.menu.hidden = true; el.btnMenu.setAttribute('aria-expanded', 'false'); };
el.btnMenu.onclick = e => { e.stopPropagation(); const buka = el.menu.hidden; el.menu.hidden = !buka; el.btnMenu.setAttribute('aria-expanded', String(buka)); };
document.addEventListener('click', e => { if (!el.menu.contains(e.target)) tutupMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') tutupMenu(); });

const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const terpasang = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
el.ios.hidden = !iOS;
if (terpasang) el.infoPasang.textContent = 'Aplikasi sudah terpasang di perangkat ini.';
else if (iOS) el.infoPasang.textContent = 'Buka lewat Safari, tekan tombol Bagikan, lalu pilih Tambah ke Layar Utama.';
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); promptPasang = e;
  el.btnPasang.hidden = false;
  el.infoPasang.textContent = 'Pasang supaya terbuka seperti aplikasi biasa.';
});
el.btnPasang.onclick = async () => {
  if (!promptPasang) return;
  sibuk(el.btnPasang, true, 'Memasang...');
  try { promptPasang.prompt(); await promptPasang.userChoice; } catch (e) {}
  promptPasang = null; el.btnPasang.hidden = true; sibuk(el.btnPasang, false); tutupMenu();
};
window.addEventListener('appinstalled', () => { el.btnPasang.hidden = true; el.infoPasang.textContent = 'Aplikasi sudah terpasang di perangkat ini.'; });

if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
