// ──────────────────────────────────────────────
//  ⚠️ PROTOCOL CHECK — must run on HTTP not file://
// ──────────────────────────────────────────────
if (location.protocol === 'file:') {
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('google-login-btn');
    const warn = document.getElementById('protocol-warning');
    if (btn) btn.style.display = 'none';
    if (warn) warn.classList.remove('hidden');
  });
  // Stop execution — Firebase Auth won't work on file://
  throw new Error('Admin panel must be served via HTTP. Open via VS Code Live Server or deploy to Vercel.');
}

// ──────────────────────────────────────────────
//  🔥 FIREBASE CONFIG
// ──────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBWYkuBFcPXZ-bITnXv2fCWTQJKpH_wbYU",
  authDomain: "sundar-hotel-resort-50dd9.firebaseapp.com",
  projectId: "sundar-hotel-resort-50dd9",
  storageBucket: "sundar-hotel-resort-50dd9.firebasestorage.app",
  messagingSenderId: "412496518341",
  appId: "1:412496518341:web:acb05a67b6919a0494a4ac",
  measurementId: "G-7JDW4RMDLV"
};

// Allowed admin emails (fallback — also stored in Firestore)
const ADMIN_EMAILS = ["sundarhotelresort@gmail.com"];

try { firebase.initializeApp(firebaseConfig); } catch(e) { console.error("Firebase init:", e); }
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();
const googleProvider = new firebase.auth.GoogleAuthProvider();


// ──────────────────────────────────────────────
//  🔐 AUTH — Google Sign-In with email whitelist
// ──────────────────────────────────────────────
let adminLoaded = false;
let allowedEmails = [...ADMIN_EMAILS];

auth.onAuthStateChanged(async (user) => {
  const loginScreen = document.getElementById("login-screen");
  const appScreen = document.getElementById("app-screen");

  if (user) {
    // Check whitelist
    try {
      const settingsDoc = await db.collection("siteContent").doc("settings").get();
      if (settingsDoc.exists && settingsDoc.data().adminEmails) {
        allowedEmails = settingsDoc.data().adminEmails;
      }
    } catch(e) { /* use fallback */ }

    if (!allowedEmails.includes(user.email)) {
      document.getElementById("login-error").textContent = "Access denied. " + user.email + " is not authorized.";
      document.getElementById("login-error").classList.remove("hidden");
      auth.signOut();
      return;
    }

    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
    document.getElementById("admin-email").textContent = user.email;

    if (!adminLoaded) {
      loadHero(); loadAbout(); loadRooms(); loadServices();
      loadOffers(); loadDining(); loadReviews(); loadSettings();
      adminLoaded = true;
    }
  } else {
    loginScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
    adminLoaded = false;
  }
});

document.getElementById("google-login-btn").addEventListener("click", () => {
  const errEl = document.getElementById("login-error");
  errEl.classList.add("hidden");
  auth.signInWithPopup(googleProvider).catch(err => {
    errEl.textContent = err.message;
    errEl.classList.remove("hidden");
  });
});

document.getElementById("logout-btn").addEventListener("click", () => auth.signOut());

// ──────────────────────────────────────────────
//  👉 TAB NAVIGATION
// ──────────────────────────────────────────────
function switchTab(tabId) {
  const tabs = ['hero','about','rooms','services','offers','dining','reviews','settings'];
  tabs.forEach(t => {
    document.getElementById('tab-'+t).classList.add('hidden');
    const btn = document.getElementById('tab-btn-'+t);
    if(btn) { btn.classList.remove('bg-primary','text-white'); btn.classList.add('text-on-surface-variant'); }
  });
  document.getElementById('tab-'+tabId).classList.remove('hidden');
  const activeBtn = document.getElementById('tab-btn-'+tabId);
  if(activeBtn) { activeBtn.classList.add('bg-primary','text-white'); activeBtn.classList.remove('text-on-surface-variant'); }
}

// ──────────────────────────────────────────────
//  📸 IMAGE COMPRESSION & UPLOAD
// ──────────────────────────────────────────────
function compressAndUpload(file, maxWidth = 1200) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h *= maxWidth / w; w = maxWidth; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => {
          if (!blob) return reject('Canvas empty');
          const fileName = 'uploads/' + Date.now() + '_' + Math.random().toString(36).substring(2) + '.jpg';
          const ref = storage.ref().child(fileName);
          ref.put(blob).then(snap => snap.ref.getDownloadURL()).then(resolve).catch(reject);
        }, 'image/jpeg', 0.75);
      };
      img.onerror = () => reject('Image load failed');
    };
    reader.onerror = () => reject('File read failed');
  });
}

function showMsg(id) {
  const el = document.getElementById(id);
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

// ──────────────────────────────────────────────
//  🏠 HERO
// ──────────────────────────────────────────────
function loadHero() {
  db.collection("siteContent").doc("hero").onSnapshot(doc => {
    if (!doc.exists) return;
    const d = doc.data();
    document.getElementById("hero-title-input").value = d.heroTitle || '';
    document.getElementById("hero-subtitle-input").value = d.heroSubtitle || '';
    const prev = document.getElementById("hero-img-preview");
    if (d.heroImage) prev.innerHTML = '<img src="'+d.heroImage+'" class="w-32 h-20 object-cover rounded-lg border">';
  });
}
document.getElementById("hero-form").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type='submit']"); btn.disabled = true;
  const payload = { heroTitle: document.getElementById("hero-title-input").value, heroSubtitle: document.getElementById("hero-subtitle-input").value };
  const file = document.getElementById("hero-img-input").files[0];
  if (file) payload.heroImage = await compressAndUpload(file);
  await db.collection("siteContent").doc("hero").set(payload, {merge:true});
  btn.disabled = false; showMsg("hero-msg"); document.getElementById("hero-img-input").value = '';
});

// ──────────────────────────────────────────────
//  ℹ️ ABOUT
// ──────────────────────────────────────────────
function loadAbout() {
  db.collection("siteContent").doc("about").onSnapshot(doc => {
    if (!doc.exists) return;
    const d = doc.data();
    document.getElementById("about-title-input").value = d.title || '';
    document.getElementById("about-desc-input").value = d.description || '';
    const prev = document.getElementById("about-img-preview");
    if (d.image) prev.innerHTML = '<img src="'+d.image+'" class="w-32 h-20 object-cover rounded-lg border">';
  });
}
document.getElementById("about-form").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type='submit']"); btn.disabled = true;
  const payload = { title: document.getElementById("about-title-input").value, description: document.getElementById("about-desc-input").value };
  const file = document.getElementById("about-img-input").files[0];
  if (file) payload.image = await compressAndUpload(file);
  await db.collection("siteContent").doc("about").set(payload, {merge:true});
  btn.disabled = false; showMsg("about-msg"); document.getElementById("about-img-input").value = '';
});

// ──────────────────────────────────────────────
//  🛏️ ROOMS CRUD
// ──────────────────────────────────────────────
let currentRooms = [];
function loadRooms() {
  db.collection("rooms").orderBy("createdAt","desc").onSnapshot(snap => {
    const grid = document.getElementById("rooms-grid");
    currentRooms = []; let html = '';
    snap.forEach(doc => { const p = doc.data(); p.id = doc.id; currentRooms.push(p);
      html += `<div class="glass-card p-0 rounded-2xl overflow-hidden bg-white">
        ${p.image ? '<img src="'+p.image+'" class="w-full h-40 object-cover">' : '<div class="w-full h-40 bg-surface-container flex items-center justify-center text-on-surface-variant">No image</div>'}
        <div class="p-5"><h4 class="font-bold text-primary mb-1">${p.title||'Untitled'}</h4>
        ${p.price ? '<span class="text-sm font-bold text-primary-light">₹'+p.price+' /night</span>' : ''}
        <div class="flex gap-2 mt-4"><button onclick="editRoom('${doc.id}')" class="flex-1 py-2 text-xs font-bold bg-surface-container-high rounded border hover:bg-surface-container-highest text-primary">Edit</button>
        <button onclick="deleteRoom('${doc.id}')" class="flex-1 py-2 text-xs font-bold bg-red-50 text-red-600 rounded border border-red-100 hover:bg-red-100">Delete</button></div></div></div>`;
    });
    grid.innerHTML = html || '<div class="p-8 text-center text-on-surface-variant col-span-full">No rooms yet.</div>';
  });
}
window.openRoomModal = function(){ closeRoomModal(); document.getElementById('room-modal').classList.remove('hidden'); };
window.closeRoomModal = function(){ document.getElementById('room-modal').classList.add('hidden'); document.getElementById('room-form').reset(); document.getElementById('room-id').value=''; document.getElementById('room-img-url').value=''; document.getElementById('room-img-preview').innerHTML=''; document.getElementById('room-modal-title').textContent='Add Room'; };
window.editRoom = function(id) {
  const r = currentRooms.find(x=>x.id===id); if(!r) return;
  document.getElementById('room-id').value=r.id; document.getElementById('room-title').value=r.title||'';
  document.getElementById('room-price').value=r.price||''; document.getElementById('room-img-url').value=r.image||'';
  if(r.image) document.getElementById('room-img-preview').innerHTML='<img src="'+r.image+'" class="w-24 h-16 object-cover rounded border">';
  document.getElementById('room-modal-title').textContent='Edit Room';
  document.getElementById('room-modal').classList.remove('hidden');
};
window.deleteRoom = function(id) { if(confirm('Delete this room?')) db.collection('rooms').doc(id).delete(); };
document.getElementById("room-form").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type='submit']"); btn.disabled = true;
  const id = document.getElementById('room-id').value;
  const payload = { title: document.getElementById('room-title').value, price: document.getElementById('room-price').value };
  const file = document.getElementById('room-img').files[0];
  if (file) { document.getElementById('room-upload-progress').classList.remove('hidden'); payload.image = await compressAndUpload(file); document.getElementById('room-upload-progress').classList.add('hidden'); }
  else { const old = document.getElementById('room-img-url').value; if(old) payload.image = old; }
  if (id) await db.collection('rooms').doc(id).update(payload);
  else { payload.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await db.collection('rooms').add(payload); }
  btn.disabled = false; closeRoomModal();
});

// ──────────────────────────────────────────────
//  🆕 SERVICES CRUD (What's New)
// ──────────────────────────────────────────────
let currentServices = [];
function loadServices() {
  db.collection("services").orderBy("createdAt","desc").onSnapshot(snap => {
    const grid = document.getElementById("services-grid");
    currentServices = []; let html = '';
    snap.forEach(doc => { const p = doc.data(); p.id = doc.id; currentServices.push(p);
      html += `<div class="glass-card p-0 rounded-2xl overflow-hidden bg-white">
        ${p.image ? '<img src="'+p.image+'" class="w-full h-40 object-cover">' : '<div class="w-full h-40 bg-surface-container flex items-center justify-center text-3xl">🏨</div>'}
        <div class="p-5"><h4 class="font-bold text-primary mb-1">${p.name||'Untitled'}</h4>
        <p class="text-xs text-on-surface-variant line-clamp-2">${p.description||''}</p>
        <div class="flex gap-2 mt-4"><button onclick="editService('${doc.id}')" class="flex-1 py-2 text-xs font-bold bg-surface-container-high rounded border hover:bg-surface-container-highest text-primary">Edit</button>
        <button onclick="deleteService('${doc.id}')" class="flex-1 py-2 text-xs font-bold bg-red-50 text-red-600 rounded border border-red-100 hover:bg-red-100">Delete</button></div></div></div>`;
    });
    grid.innerHTML = html || '<div class="p-8 text-center text-on-surface-variant col-span-full">No items yet.</div>';
  });
}
window.openServiceModal = function(){ closeServiceModal(); document.getElementById('service-modal').classList.remove('hidden'); };
window.closeServiceModal = function(){ document.getElementById('service-modal').classList.add('hidden'); document.getElementById('service-form').reset(); document.getElementById('svc-id').value=''; document.getElementById('svc-img-url').value=''; document.getElementById('svc-img-preview').innerHTML=''; document.getElementById('service-modal-title').textContent='Add Item'; };
window.editService = function(id) {
  const s = currentServices.find(x=>x.id===id); if(!s) return;
  document.getElementById('svc-id').value=s.id; document.getElementById('svc-name').value=s.name||'';
  document.getElementById('svc-desc').value=s.description||''; document.getElementById('svc-img-url').value=s.image||'';
  if(s.image) document.getElementById('svc-img-preview').innerHTML='<img src="'+s.image+'" class="w-24 h-16 object-cover rounded border">';
  document.getElementById('service-modal-title').textContent='Edit Item';
  document.getElementById('service-modal').classList.remove('hidden');
};
window.deleteService = function(id) { if(confirm('Delete this item?')) db.collection('services').doc(id).delete(); };
document.getElementById("service-form").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type='submit']"); btn.disabled = true;
  const id = document.getElementById('svc-id').value;
  const payload = { name: document.getElementById('svc-name').value, description: document.getElementById('svc-desc').value };
  const file = document.getElementById('svc-img').files[0];
  if (file) { document.getElementById('svc-upload-progress').classList.remove('hidden'); payload.image = await compressAndUpload(file); document.getElementById('svc-upload-progress').classList.add('hidden'); }
  else { const old = document.getElementById('svc-img-url').value; if(old) payload.image = old; }
  if (id) await db.collection('services').doc(id).update(payload);
  else { payload.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await db.collection('services').add(payload); }
  btn.disabled = false; closeServiceModal();
});

// ──────────────────────────────────────────────
//  🎁 OFFERS CRUD
// ──────────────────────────────────────────────
let currentOffers = [];
function loadOffers() {
  db.collection("offers").orderBy("createdAt","desc").onSnapshot(snap => {
    const grid = document.getElementById("offers-grid");
    currentOffers = []; let html = '';
    snap.forEach(doc => { const p = doc.data(); p.id = doc.id; currentOffers.push(p);
      html += `<div class="glass-card p-0 rounded-2xl overflow-hidden bg-white">
        ${p.image ? '<img src="'+p.image+'" class="w-full h-40 object-cover">' : '<div class="w-full h-40 bg-surface-container flex items-center justify-center text-3xl">🎁</div>'}
        <div class="p-5"><h4 class="font-bold text-primary mb-1">${p.title||'Untitled'}</h4>
        <p class="text-xs text-on-surface-variant line-clamp-2">${p.description||''}</p>
        <div class="flex gap-2 mt-4"><button onclick="editOffer('${doc.id}')" class="flex-1 py-2 text-xs font-bold bg-surface-container-high rounded border hover:bg-surface-container-highest text-primary">Edit</button>
        <button onclick="deleteOffer('${doc.id}')" class="flex-1 py-2 text-xs font-bold bg-red-50 text-red-600 rounded border border-red-100 hover:bg-red-100">Delete</button></div></div></div>`;
    });
    grid.innerHTML = html || '<div class="p-8 text-center text-on-surface-variant col-span-full">No offers yet.</div>';
  });
}
window.openOfferModal = function(){ closeOfferModal(); document.getElementById('offer-modal').classList.remove('hidden'); };
window.closeOfferModal = function(){ document.getElementById('offer-modal').classList.add('hidden'); document.getElementById('offer-form').reset(); document.getElementById('offer-id').value=''; document.getElementById('offer-img-url').value=''; document.getElementById('offer-img-preview').innerHTML=''; document.getElementById('offer-modal-title').textContent='Add Offer'; };
window.editOffer = function(id) {
  const o = currentOffers.find(x=>x.id===id); if(!o) return;
  document.getElementById('offer-id').value=o.id; document.getElementById('offer-title').value=o.title||'';
  document.getElementById('offer-desc').value=o.description||''; document.getElementById('offer-img-url').value=o.image||'';
  if(o.image) document.getElementById('offer-img-preview').innerHTML='<img src="'+o.image+'" class="w-24 h-16 object-cover rounded border">';
  document.getElementById('offer-modal-title').textContent='Edit Offer';
  document.getElementById('offer-modal').classList.remove('hidden');
};
window.deleteOffer = function(id) { if(confirm('Delete this offer?')) db.collection('offers').doc(id).delete(); };
document.getElementById("offer-form").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type='submit']"); btn.disabled = true;
  const id = document.getElementById('offer-id').value;
  const payload = { title: document.getElementById('offer-title').value, description: document.getElementById('offer-desc').value };
  const file = document.getElementById('offer-img').files[0];
  if (file) { document.getElementById('offer-upload-progress').classList.remove('hidden'); payload.image = await compressAndUpload(file); document.getElementById('offer-upload-progress').classList.add('hidden'); }
  else { const old = document.getElementById('offer-img-url').value; if(old) payload.image = old; }
  if (id) await db.collection('offers').doc(id).update(payload);
  else { payload.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await db.collection('offers').add(payload); }
  btn.disabled = false; closeOfferModal();
});

// ──────────────────────────────────────────────
//  🍽️ DINING
// ──────────────────────────────────────────────
function loadDining() {
  db.collection("siteContent").doc("dining").onSnapshot(doc => {
    if (!doc.exists) return;
    const d = doc.data();
    document.getElementById("dining-title-input").value = d.title || '';
    document.getElementById("dining-desc-input").value = d.description || '';
    const prev = document.getElementById("dining-img-preview");
    if (d.image) prev.innerHTML = '<img src="'+d.image+'" class="w-32 h-20 object-cover rounded-lg border">';
  });
}
document.getElementById("dining-form").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type='submit']"); btn.disabled = true;
  const payload = { title: document.getElementById("dining-title-input").value, description: document.getElementById("dining-desc-input").value };
  const file = document.getElementById("dining-img-input").files[0];
  if (file) payload.image = await compressAndUpload(file);
  await db.collection("siteContent").doc("dining").set(payload, {merge:true});
  btn.disabled = false; showMsg("dining-msg"); document.getElementById("dining-img-input").value = '';
});

// ──────────────────────────────────────────────
//  ⭐ REVIEWS
// ──────────────────────────────────────────────
function loadReviews() {
  db.collection("reviews").orderBy("createdAt","desc").onSnapshot(snap => {
    const grid = document.getElementById("reviews-grid");
    if (snap.empty) { grid.innerHTML = '<div class="p-8 text-center text-on-surface-variant col-span-full">No reviews yet.</div>'; return; }
    let html = '';
    snap.forEach(doc => {
      const r = doc.data(); const isApproved = r.approved === true;
      let stars = ''; for(let i=0;i<5;i++) stars += i < (r.rating||5) ? '★' : '☆';
      html += `<div class="glass-card p-6 rounded-2xl bg-white border ${isApproved ? 'border-primary/20' : 'border-outline/20'}">
        <div class="flex justify-between items-start mb-4"><div><h4 class="font-bold text-primary">${r.name||'Anonymous'}</h4>
        <div class="text-yellow-500 text-sm">${stars}</div></div>
        <span class="px-3 py-1 rounded-full text-xs font-bold ${isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${isApproved ? 'Approved' : 'Pending'}</span></div>
        <p class="text-sm text-on-surface-variant italic mb-4">"${r.content||''}"</p>
        <div class="flex gap-2 border-t border-outline/10 pt-4">
        <button onclick="setReviewStatus('${doc.id}',true)" class="flex-1 py-2 text-xs font-bold rounded border ${isApproved ? 'bg-primary text-white' : 'hover:bg-green-50 text-primary border-primary'} transition-colors">Approve</button>
        <button onclick="setReviewStatus('${doc.id}',false)" class="flex-1 py-2 text-xs font-bold rounded border ${!isApproved ? 'bg-red-50 text-red-600' : 'hover:bg-red-50 text-outline'} transition-colors">Reject</button>
        <button onclick="deleteReview('${doc.id}')" class="py-2 px-3 text-xs font-bold rounded border text-red-600 hover:bg-red-50">🗑️</button></div></div>`;
    });
    grid.innerHTML = html;
  });
}
window.setReviewStatus = function(id, approved) { db.collection('reviews').doc(id).update({approved}); };
window.deleteReview = function(id) { if(confirm('Delete this review permanently?')) db.collection('reviews').doc(id).delete(); };

// ──────────────────────────────────────────────
//  ⚙️ SETTINGS
// ──────────────────────────────────────────────
function loadSettings() {
  db.collection("siteContent").doc("settings").onSnapshot(doc => {
    if (!doc.exists) return;
    const d = doc.data();
    document.getElementById("set-whatsapp").value = d.whatsapp || '';
    document.getElementById("set-phone").value = d.phone || '';
    document.getElementById("set-instagram").value = d.instagram || '';
    document.getElementById("set-maps").value = d.mapsUrl || '';
    document.getElementById("set-admin-emails").value = (d.adminEmails || ADMIN_EMAILS).join('\n');
  });
}
document.getElementById("settings-form").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type='submit']"); btn.disabled = true;
  const emails = document.getElementById("set-admin-emails").value.split('\n').map(e=>e.trim().toLowerCase()).filter(Boolean);
  const payload = {
    whatsapp: document.getElementById("set-whatsapp").value,
    phone: document.getElementById("set-phone").value,
    instagram: document.getElementById("set-instagram").value,
    mapsUrl: document.getElementById("set-maps").value,
    adminEmails: emails.length ? emails : ADMIN_EMAILS
  };
  await db.collection("siteContent").doc("settings").set(payload, {merge:true});
  allowedEmails = payload.adminEmails;
  btn.disabled = false; showMsg("settings-msg");
});
