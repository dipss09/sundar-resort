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
  storageBucket: "sundar-hotel-resort-50dd9.appspot.com",
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
      loadOffers(); loadMenu(); loadGallery(); loadExtras();
      loadDining(); loadReviews(); loadSettings();
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
  const tabs = ['hero','about','rooms','services','offers','menu','gallery','extras','dining','reviews','settings'];
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
function compressAndUpload(file, maxWidth = 800) {
  return new Promise((resolve, reject) => {
    console.log("Starting image compression to Base64 for:", file.name);
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxWidth) { h *= maxWidth / w; w = maxWidth; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          
          // Convert directly to Base64 with high compression (0.6)
          const base64String = canvas.toDataURL('image/jpeg', 0.6);
          
          // Check size (Firestore limit is 1MB, let's limit to ~800KB)
          const sizeInBytes = base64String.length * 0.75;
          if (sizeInBytes > 800000) {
              return reject(new Error('Image is too complex/large even after compression. Please choose a different image.'));
          }
          
          console.log("Successfully compressed to Base64. Size:", Math.round(sizeInBytes/1024), "KB");
          resolve(base64String);
          
        } catch (e) {
          reject(new Error('Canvas processing failed: ' + e.message));
        }
      };
      img.onerror = () => reject(new Error('Image load failed inside browser.'));
    };
    reader.onerror = () => reject(new Error('File read failed.'));
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
  try {
    const payload = { heroTitle: document.getElementById("hero-title-input").value, heroSubtitle: document.getElementById("hero-subtitle-input").value };
    const file = document.getElementById("hero-img-input").files[0];
    if (file) {
      document.getElementById('hero-upload-progress').classList.remove('hidden');
      payload.heroImage = await compressAndUpload(file);
      document.getElementById('hero-upload-progress').classList.add('hidden');
    }
    await db.collection("siteContent").doc("hero").set(payload, {merge:true});
    showMsg("hero-msg"); document.getElementById("hero-img-input").value = '';
  } catch (err) {
    console.error(err);
    alert("Error saving: " + (err.message || err));
  } finally {
    btn.disabled = false;
    document.getElementById('hero-upload-progress').classList.add('hidden');
  }
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
  try {
    const payload = { title: document.getElementById("about-title-input").value, description: document.getElementById("about-desc-input").value };
    const file = document.getElementById("about-img-input").files[0];
    if (file) {
      document.getElementById('about-upload-progress').classList.remove('hidden');
      payload.image = await compressAndUpload(file);
      document.getElementById('about-upload-progress').classList.add('hidden');
    }
    await db.collection("siteContent").doc("about").set(payload, {merge:true});
    showMsg("about-msg"); document.getElementById("about-img-input").value = '';
  } catch (err) {
    console.error(err);
    alert("Error saving: " + (err.message || err));
  } finally {
    btn.disabled = false;
  }
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
  try {
    const id = document.getElementById('room-id').value;
    const payload = { title: document.getElementById('room-title').value, price: document.getElementById('room-price').value };
    const file = document.getElementById('room-img').files[0];
    if (file) { document.getElementById('room-upload-progress').classList.remove('hidden'); payload.image = await compressAndUpload(file); document.getElementById('room-upload-progress').classList.add('hidden'); }
    else { const old = document.getElementById('room-img-url').value; if(old) payload.image = old; }
    if (id) await db.collection('rooms').doc(id).update(payload);
    else { payload.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await db.collection('rooms').add(payload); }
    document.getElementById("room-msg").classList.remove("hidden");
    setTimeout(() => { document.getElementById("room-msg").classList.add("hidden"); closeRoomModal(); }, 1500);
  } catch (err) {
    console.error(err);
    alert("Error saving: " + (err.message || err));
  } finally {
    btn.disabled = false;
  }
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
  try {
    const id = document.getElementById('svc-id').value;
    const payload = { name: document.getElementById('svc-name').value, description: document.getElementById('svc-desc').value };
    const file = document.getElementById('svc-img').files[0];
    if (file) { document.getElementById('svc-upload-progress').classList.remove('hidden'); payload.image = await compressAndUpload(file); document.getElementById('svc-upload-progress').classList.add('hidden'); }
    else { const old = document.getElementById('svc-img-url').value; if(old) payload.image = old; }
    if (id) await db.collection('services').doc(id).update(payload);
    else { payload.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await db.collection('services').add(payload); }
    document.getElementById("svc-msg").classList.remove("hidden");
    setTimeout(() => { document.getElementById("svc-msg").classList.add("hidden"); closeServiceModal(); }, 1500);
  } catch (err) {
    console.error(err);
    alert("Error saving: " + (err.message || err));
  } finally {
    btn.disabled = false;
  }
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
  try {
    const id = document.getElementById('offer-id').value;
    const payload = { title: document.getElementById('offer-title').value, description: document.getElementById('offer-desc').value };
    const file = document.getElementById('offer-img').files[0];
    if (file) { document.getElementById('offer-upload-progress').classList.remove('hidden'); payload.image = await compressAndUpload(file); document.getElementById('offer-upload-progress').classList.add('hidden'); }
    else { const old = document.getElementById('offer-img-url').value; if(old) payload.image = old; }
    if (id) await db.collection('offers').doc(id).update(payload);
    else { payload.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await db.collection('offers').add(payload); }
    document.getElementById("offer-msg").classList.remove("hidden");
    setTimeout(() => { document.getElementById("offer-msg").classList.add("hidden"); closeOfferModal(); }, 1500);
  } catch (err) {
    console.error(err);
    alert("Error saving: " + (err.message || err));
  } finally {
    btn.disabled = false;
  }
});

// ──────────────────────────────────────────────
//  📜 MENU CRUD
// ──────────────────────────────────────────────
let currentMenu = [];
function loadMenu() {
  db.collection("restaurantMenu").orderBy("createdAt","desc").onSnapshot(snap => {
    const grid = document.getElementById("menu-grid");
    currentMenu = []; let html = '';
    snap.forEach(doc => { const p = doc.data(); p.id = doc.id; currentMenu.push(p);
      html += `<div class="glass-card p-0 rounded-2xl overflow-hidden bg-white flex flex-col h-full">
        ${p.image ? '<img src="'+p.image+'" class="w-full h-40 object-cover">' : '<div class="w-full h-40 bg-surface-container flex items-center justify-center text-3xl">🍲</div>'}
        <div class="p-5 flex-1 flex flex-col"><span class="text-[10px] font-bold text-primary-light uppercase tracking-widest mb-1">${p.category||'Uncategorized'}</span>
        <h4 class="font-bold text-primary mb-1">${p.name||'Untitled'}</h4>
        <p class="text-xs text-on-surface-variant line-clamp-2 flex-1">${p.description||''}</p>
        <div class="mt-2 text-primary font-bold">${p.price||''}</div>
        <div class="flex gap-2 mt-4"><button onclick="editMenu('${doc.id}')" class="flex-1 py-2 text-xs font-bold bg-surface-container-high rounded border hover:bg-surface-container-highest text-primary">Edit</button>
        <button onclick="deleteMenu('${doc.id}')" class="flex-1 py-2 text-xs font-bold bg-red-50 text-red-600 rounded border border-red-100 hover:bg-red-100">Delete</button></div></div></div>`;
    });
    grid.innerHTML = html || '<div class="p-8 text-center text-on-surface-variant col-span-full">No menu items yet.</div>';
  });
}
window.openMenuModal = function(){ closeMenuModal(); document.getElementById('menu-modal').classList.remove('hidden'); };
window.closeMenuModal = function(){ document.getElementById('menu-modal').classList.add('hidden'); document.getElementById('menu-form').reset(); document.getElementById('menu-id').value=''; document.getElementById('menu-img-url').value=''; document.getElementById('menu-img-preview').innerHTML=''; document.getElementById('menu-modal-title').textContent='Add Menu Item'; };
window.editMenu = function(id) {
  const m = currentMenu.find(x=>x.id===id); if(!m) return;
  document.getElementById('menu-id').value=m.id; document.getElementById('menu-category').value=m.category||'';
  document.getElementById('menu-name').value=m.name||''; document.getElementById('menu-desc').value=m.description||'';
  document.getElementById('menu-price').value=m.price||''; document.getElementById('menu-img-url').value=m.image||'';
  if(m.image) document.getElementById('menu-img-preview').innerHTML='<img src="'+m.image+'" class="w-24 h-16 object-cover rounded border">';
  document.getElementById('menu-modal-title').textContent='Edit Menu Item';
  document.getElementById('menu-modal').classList.remove('hidden');
};
window.deleteMenu = function(id) { if(confirm('Delete this menu item?')) db.collection('restaurantMenu').doc(id).delete(); };
document.getElementById("menu-form").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type='submit']"); btn.disabled = true;
  try {
    const id = document.getElementById('menu-id').value;
    const payload = { category: document.getElementById('menu-category').value, name: document.getElementById('menu-name').value, description: document.getElementById('menu-desc').value, price: document.getElementById('menu-price').value };
    const file = document.getElementById('menu-img').files[0];
    if (file) { document.getElementById('menu-upload-progress').classList.remove('hidden'); payload.image = await compressAndUpload(file); document.getElementById('menu-upload-progress').classList.add('hidden'); }
    else { const old = document.getElementById('menu-img-url').value; if(old) payload.image = old; }
    if (id) await db.collection('restaurantMenu').doc(id).update(payload);
    else { payload.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await db.collection('restaurantMenu').add(payload); }
    document.getElementById("menu-msg").classList.remove("hidden");
    setTimeout(() => { document.getElementById("menu-msg").classList.add("hidden"); closeMenuModal(); }, 1500);
  } catch (err) { console.error(err); alert("Error saving: " + (err.message || err)); } finally { btn.disabled = false; }
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
  try {
    const payload = { title: document.getElementById("dining-title-input").value, description: document.getElementById("dining-desc-input").value };
    const file = document.getElementById("dining-img-input").files[0];
    if (file) {
      document.getElementById('dining-upload-progress').classList.remove('hidden');
      payload.image = await compressAndUpload(file);
      document.getElementById('dining-upload-progress').classList.add('hidden');
    }
    await db.collection("siteContent").doc("dining").set(payload, {merge:true});
    showMsg("dining-msg"); document.getElementById("dining-img-input").value = '';
  } catch (err) {
    console.error(err);
    alert("Error saving: " + (err.message || err));
  } finally {
    btn.disabled = false;
  }
});

// ──────────────────────────────────────────────
//  🖼️ GALLERY CRUD
// ──────────────────────────────────────────────
function loadGallery() {
  db.collection("gallery").orderBy("createdAt","desc").onSnapshot(snap => {
    const grid = document.getElementById("gallery-grid");
    let html = '';
    snap.forEach(doc => { const p = doc.data();
      html += `<div class="glass-card p-0 rounded-2xl overflow-hidden bg-white flex flex-col">
        ${p.image ? '<img src="'+p.image+'" class="w-full h-48 object-cover">' : ''}
        <div class="p-4 flex-1 flex flex-col justify-between">
        <p class="text-xs text-on-surface-variant italic mb-2">"${p.quote||''}"</p>
        <button onclick="deleteGallery('${doc.id}')" class="w-full py-2 text-xs font-bold bg-red-50 text-red-600 rounded border border-red-100 hover:bg-red-100">Delete Photo</button></div></div>`;
    });
    grid.innerHTML = html || '<div class="p-8 text-center text-on-surface-variant col-span-full">No gallery images yet.</div>';
  });
}
window.openGalleryModal = function(){ closeGalleryModal(); document.getElementById('gallery-modal').classList.remove('hidden'); };
window.closeGalleryModal = function(){ document.getElementById('gallery-modal').classList.add('hidden'); document.getElementById('gallery-form').reset(); document.getElementById('gal-img-preview').innerHTML=''; };
window.deleteGallery = function(id) { if(confirm('Delete this photo?')) db.collection('gallery').doc(id).delete(); };
document.getElementById("gallery-form").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type='submit']"); btn.disabled = true;
  try {
    const files = document.getElementById('gal-img').files;
    if (files.length === 0) throw new Error("Image is required for gallery.");
    
    document.getElementById('gal-upload-progress').classList.remove('hidden');
    
    const quote = document.getElementById('gal-quote').value;
    const uploadPromises = Array.from(files).map(async (file) => {
      const base64Img = await compressAndUpload(file);
      const payload = {
        quote: quote, // Will be empty if not provided, which is fine for bulk
        image: base64Img,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      return db.collection('gallery').add(payload);
    });

    await Promise.all(uploadPromises);
    
    document.getElementById('gal-upload-progress').classList.add('hidden');
    document.getElementById("gal-msg").classList.remove("hidden");
    setTimeout(() => { document.getElementById("gal-msg").classList.add("hidden"); closeGalleryModal(); }, 1500);
  } catch (err) { console.error(err); alert("Error saving: " + (err.message || err)); } finally { btn.disabled = false; document.getElementById('gal-upload-progress').classList.add('hidden'); }
});

// ──────────────────────────────────────────────
//  ✨ EXTRA SECTIONS (Trust Banner, Location, etc.)
// ──────────────────────────────────────────────
function loadExtras() {
  db.collection("siteContent").doc("trustBanner").onSnapshot(doc => {
    if(!doc.exists) return; const d = doc.data();
    document.getElementById("trust-google").value = d.googleText || '';
    document.getElementById("trust-google-sub").value = d.googleSub || '';
    document.getElementById("trust-trip").value = d.tripText || '';
    document.getElementById("trust-trip-sub").value = d.tripSub || '';
  });
  db.collection("siteContent").doc("location").onSnapshot(doc => {
    if(!doc.exists) return; const d = doc.data();
    document.getElementById("loc-address").value = d.address || '';
    document.getElementById("loc-checkin").value = d.checkin || '';
    document.getElementById("loc-checkout").value = d.checkout || '';
  });
  db.collection("siteContent").doc("headers").onSnapshot(doc => {
    if(!doc.exists) return; const d = doc.data();
    if(d.acc) {
      document.getElementById("head-acc-kicker").value = d.acc.kicker || '';
      document.getElementById("head-acc-title").value = d.acc.title || '';
      document.getElementById("head-acc-desc").value = d.acc.desc || '';
    }
    if(d.fac) {
      document.getElementById("head-fac-kicker").value = d.fac.kicker || '';
      document.getElementById("head-fac-title").value = d.fac.title || '';
      document.getElementById("head-fac-desc").value = d.fac.desc || '';
    }
    if(d.menu) {
      document.getElementById("head-menu-kicker").value = d.menu.kicker || '';
      document.getElementById("head-menu-title").value = d.menu.title || '';
      document.getElementById("head-menu-desc").value = d.menu.desc || '';
    }
  });
}

document.getElementById("headers-form").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type='submit']"); btn.disabled = true;
  try {
    await db.collection("siteContent").doc("headers").set({
      acc: {
        kicker: document.getElementById("head-acc-kicker").value,
        title: document.getElementById("head-acc-title").value,
        desc: document.getElementById("head-acc-desc").value
      },
      fac: {
        kicker: document.getElementById("head-fac-kicker").value,
        title: document.getElementById("head-fac-title").value,
        desc: document.getElementById("head-fac-desc").value
      },
      menu: {
        kicker: document.getElementById("head-menu-kicker").value,
        title: document.getElementById("head-menu-title").value,
        desc: document.getElementById("head-menu-desc").value
      }
    }, {merge:true});
    showMsg("headers-msg");
  } catch (err) { console.error(err); alert("Error: " + err.message); } finally { btn.disabled = false; }
});

document.getElementById("trust-form").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type='submit']"); btn.disabled = true;
  try {
    await db.collection("siteContent").doc("trustBanner").set({
      googleText: document.getElementById("trust-google").value,
      googleSub: document.getElementById("trust-google-sub").value,
      tripText: document.getElementById("trust-trip").value,
      tripSub: document.getElementById("trust-trip-sub").value
    }, {merge:true});
    showMsg("trust-msg");
  } catch (err) { console.error(err); alert("Error: " + err.message); } finally { btn.disabled = false; }
});

document.getElementById("location-form").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type='submit']"); btn.disabled = true;
  try {
    await db.collection("siteContent").doc("location").set({
      address: document.getElementById("loc-address").value,
      checkin: document.getElementById("loc-checkin").value,
      checkout: document.getElementById("loc-checkout").value
    }, {merge:true});
    showMsg("loc-msg");
  } catch (err) { console.error(err); alert("Error: " + err.message); } finally { btn.disabled = false; }
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
    document.getElementById("set-facebook").value = d.facebook || '';
    document.getElementById("set-maps").value = d.mapsUrl || '';
    document.getElementById("set-admin-emails").value = (d.adminEmails || ADMIN_EMAILS).join('\n');
  });
}
document.getElementById("settings-form").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type='submit']"); btn.disabled = true;
  try {
    const emails = document.getElementById("set-admin-emails").value.split('\n').map(e=>e.trim().toLowerCase()).filter(Boolean);
    const payload = {
      whatsapp: document.getElementById("set-whatsapp").value,
      phone: document.getElementById("set-phone").value,
      instagram: document.getElementById("set-instagram").value,
      facebook: document.getElementById("set-facebook").value,
      mapsUrl: document.getElementById("set-maps").value,
      adminEmails: emails.length ? emails : ADMIN_EMAILS
    };
    await db.collection("siteContent").doc("settings").set(payload, {merge:true});
    allowedEmails = payload.adminEmails;
    showMsg("settings-msg");
  } catch (err) {
    console.error(err);
    alert("Error saving: " + (err.message || err));
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("logo-form").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type='submit']"); btn.disabled = true;
  try {
    const file = document.getElementById("set-logo-input").files[0];
    if (!file) throw new Error("Please select an image file for the logo.");
    
    document.getElementById('logo-upload-progress').classList.remove('hidden');
    const base64Img = await compressAndUpload(file);
    await db.collection("siteContent").doc("settings").set({ logoUrl: base64Img }, {merge:true});
    document.getElementById('logo-upload-progress').classList.add('hidden');
    
    showMsg("logo-msg");
    document.getElementById("set-logo-input").value = '';
    document.getElementById("set-logo-preview").innerHTML = '<img src="'+base64Img+'" class="h-12 object-contain bg-black rounded p-2 mt-2">';
  } catch (err) {
    console.error(err);
    alert("Error saving logo: " + (err.message || err));
  } finally {
    btn.disabled = false;
    document.getElementById('logo-upload-progress').classList.add('hidden');
  }
});
