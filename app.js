/* ═══════════════════════════════════════════════════════════════
   To Do In — App JavaScript (ES6+)
   ═══════════════════════════════════════════════════════════════ */

const API = 'http://localhost:3000/api';

// ─── Estado global ────────────────────────────────────────────
let currentUser = null;
let map = null;
let mapMarkers = [];
let infoWindow = null;
let tempMarker = null;
let selectedLatLng = null;
let addPanelOpen = false;
let deleteTargetId = null;

// ─── SVGs por categoría ──────────────────────────────────────
const CAT_CONFIG = {
  restaurante: {
    color: '#E74C3C',
    emoji: '🍽️',
    label: 'Restaurante',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z" fill="#E74C3C"/>
      <text x="16" y="20" text-anchor="middle" fill="white" font-size="14">🍽</text></svg>`
  },
  parque: {
    color: '#27AE60',
    emoji: '🌳',
    label: 'Parque',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z" fill="#27AE60"/>
      <text x="16" y="20" text-anchor="middle" fill="white" font-size="14">🌳</text></svg>`
  },
  evento: {
    color: '#F39C12',
    emoji: '⭐',
    label: 'Evento',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z" fill="#F39C12"/>
      <text x="16" y="20" text-anchor="middle" fill="white" font-size="14">⭐</text></svg>`
  },
  cultura: {
    color: '#8E44AD',
    emoji: '📚',
    label: 'Cultura',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z" fill="#8E44AD"/>
      <text x="16" y="20" text-anchor="middle" fill="white" font-size="14">📚</text></svg>`
  },
  interes: {
    color: '#2980B9',
    emoji: '📌',
    label: 'Punto de Interés',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z" fill="#2980B9"/>
      <text x="16" y="20" text-anchor="middle" fill="white" font-size="14">📌</text></svg>`
  }
};

// ─── Helpers ─────────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

function showMsg(id, text) {
  const el = $(id);
  el.textContent = text;
  el.classList.add('show');
}

function hideMsg(id) {
  const el = $(id);
  el.textContent = '';
  el.classList.remove('show');
}

function showToast(text) {
  const t = $('toast');
  t.textContent = text;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function setLoading(btnId, loading) {
  const btn = $(btnId);
  if (loading) {
    btn.dataset.origText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Cargando...';
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.origText || btn.innerHTML;
    btn.disabled = false;
  }
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error del servidor');
  return data;
}

// ─── Google Maps Init ────────────────────────────────────────

window.initMap = function() {
  map = new google.maps.Map($('map'), {
    center: { lat: 4.711, lng: -74.0721 },
    zoom: 12,
    styles: [
      { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#6c63ff' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a4a' }] },
      { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9999b3' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f0f1a' }] },
      { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#16213e' }] },
      { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6c63ff' }] },
      { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#16213e' }] }
    ],
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false
  });

  infoWindow = new google.maps.InfoWindow();

  map.addListener('click', (e) => {
    if (addPanelOpen) {
      selectedLatLng = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      $('add-lat').value = selectedLatLng.lat.toFixed(8);
      $('add-lng').value = selectedLatLng.lng.toFixed(8);
      $('loc-preview').textContent = `📍 ${selectedLatLng.lat.toFixed(6)}, ${selectedLatLng.lng.toFixed(6)}`;

      if (tempMarker) tempMarker.setMap(null);
      tempMarker = new google.maps.Marker({
        position: selectedLatLng,
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#6c63ff',
          fillOpacity: 0.9,
          strokeColor: '#fff',
          strokeWeight: 2
        },
        animation: google.maps.Animation.DROP
      });
    }
  });

  checkSession();
  loadMarkers();
}

// ─── Sesión ──────────────────────────────────────────────────

async function checkSession() {
  try {
    const data = await apiFetch('/auth/me');
    if (data.user) {
      currentUser = data.user;
      updateUI(true);
    } else {
      currentUser = null;
      updateUI(false);
    }
  } catch (e) {
    currentUser = null;
    updateUI(false);
  }
}

function updateUI(loggedIn) {
  if (loggedIn && currentUser) {
    $('btn-login').classList.add('hidden');
    $('btn-register').classList.add('hidden');
    $('btn-add').classList.remove('hidden');
    $('btn-mis').classList.remove('hidden');
    $('btn-logout').classList.remove('hidden');
    $('user-info').classList.remove('hidden');
    $('user-name').textContent = currentUser.nombre;
    if (currentUser.rol === 'admin') {
      $('btn-admin').classList.remove('hidden');
      $('user-badge').textContent = '👑';
    } else {
      $('btn-admin').classList.add('hidden');
      $('user-badge').textContent = '👤';
    }
  } else {
    $('btn-login').classList.remove('hidden');
    $('btn-register').classList.remove('hidden');
    $('btn-add').classList.add('hidden');
    $('btn-mis').classList.add('hidden');
    $('btn-admin').classList.add('hidden');
    $('btn-logout').classList.add('hidden');
    $('user-info').classList.add('hidden');
  }
}

// ─── Marcadores en el mapa ───────────────────────────────────

async function loadMarkers() {
  try {
    const markers = await apiFetch('/markers');
    clearMapMarkers();
    markers.forEach(m => addMarkerToMap(m));
  } catch (e) {
    console.error('Error cargando marcadores:', e);
  }
}

function clearMapMarkers() {
  mapMarkers.forEach(m => m.setMap(null));
  mapMarkers = [];
}

function addMarkerToMap(m) {
  const cat = CAT_CONFIG[m.categoria] || CAT_CONFIG.interes;
  const svgUrl = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(cat.svg);

  const marker = new google.maps.Marker({
    position: { lat: parseFloat(m.latitud), lng: parseFloat(m.longitud) },
    map: map,
    title: m.titulo,
    icon: {
      url: svgUrl,
      scaledSize: new google.maps.Size(32, 40),
      anchor: new google.maps.Point(16, 40)
    },
    animation: google.maps.Animation.DROP
  });

  const fecha = new Date(m.fecha_creacion).toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const ciudad = m.ciudad_nombre || 'Sin ciudad';

  const content = `
    <div style="font-family:Inter,sans-serif;min-width:200px;max-width:280px;padding:4px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="font-size:1.2rem">${cat.emoji}</span>
        <strong style="font-size:.95rem;color:#1a1a2e">${m.titulo}</strong>
      </div>
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:6px 0">
      <p style="font-size:.85rem;color:#444;margin:6px 0">${m.descripcion || 'Sin descripción'}</p>
      <p style="font-size:.78rem;color:#888;margin:4px 0">📅 ${fecha}</p>
      <p style="font-size:.78rem;color:#888;margin:2px 0">🏙️ ${ciudad}</p>
    </div>`;

  marker.addListener('click', () => {
    infoWindow.setContent(content);
    infoWindow.open(map, marker);
  });

  mapMarkers.push(marker);
}

// ─── Paneles ─────────────────────────────────────────────────

function openPanel(id) {
  closeAllPanels();
  $(id).classList.add('open');
  $('overlay').classList.add('active');
  if (id === 'panel-add') addPanelOpen = true;
}

function closePanel(id) {
  $(id).classList.remove('open');
  $('overlay').classList.remove('active');
  if (id === 'panel-add') {
    addPanelOpen = false;
    if (tempMarker) { tempMarker.setMap(null); tempMarker = null; }
    selectedLatLng = null;
  }
}

function closePanelAdd() {
  closePanel('panel-add');
  $('add-titulo').value = '';
  $('add-desc').value = '';
  $('add-lat').value = '';
  $('add-lng').value = '';
  $('loc-preview').textContent = '';
  hideMsg('add-err');
}

function closeAllPanels() {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('open'));
  $('overlay').classList.remove('active');
  addPanelOpen = false;
}

function switchPanel(from, to) {
  closePanel(from);
  setTimeout(() => openPanel(to), 100);
}

// Cerrar panel al clic en overlay
document.addEventListener('DOMContentLoaded', () => {
  $('overlay').addEventListener('click', closeAllPanels);
});

// ─── Registro ────────────────────────────────────────────────

async function doRegister() {
  hideMsg('reg-err');
  hideMsg('reg-ok');
  const nombre = $('reg-nombre').value.trim();
  const email = $('reg-email').value.trim();
  const password = $('reg-pass').value;

  if (!nombre || !email || !password) {
    return showMsg('reg-err', 'Todos los campos son obligatorios');
  }
  if (password.length < 6) {
    return showMsg('reg-err', 'La contraseña debe tener al menos 6 caracteres');
  }

  setLoading('btn-do-reg', true);
  try {
    await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ nombre, email, password })
    });
    showMsg('reg-ok', '¡Cuenta creada! Ya puedes iniciar sesión.');
    $('reg-nombre').value = '';
    $('reg-email').value = '';
    $('reg-pass').value = '';
    setTimeout(() => switchPanel('panel-register', 'panel-login'), 1500);
  } catch (e) {
    showMsg('reg-err', e.message);
  } finally {
    setLoading('btn-do-reg', false);
  }
}

// ─── Login ───────────────────────────────────────────────────

async function doLogin() {
  hideMsg('login-err');
  hideMsg('login-ok');
  const email = $('login-email').value.trim();
  const password = $('login-pass').value;

  if (!email || !password) {
    return showMsg('login-err', 'Completa todos los campos');
  }

  setLoading('btn-do-login', true);
  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    currentUser = { id: data.id, nombre: data.nombre, rol: data.rol };
    updateUI(true);
    closePanel('panel-login');
    showToast(`¡Bienvenido, ${data.nombre}!`);
    $('login-email').value = '';
    $('login-pass').value = '';
    loadMarkers();
  } catch (e) {
    showMsg('login-err', e.message);
  } finally {
    setLoading('btn-do-login', false);
  }
}

// ─── Logout ──────────────────────────────────────────────────

async function doLogout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch (e) { /* ignorar */ }
  currentUser = null;
  updateUI(false);
  closeAllPanels();
  loadMarkers();
  showToast('Sesión cerrada');
}

// ─── Crear marcador ──────────────────────────────────────────

async function doAddMarker() {
  hideMsg('add-err');
  const titulo = $('add-titulo').value.trim();
  const descripcion = $('add-desc').value.trim();
  const categoria = $('add-cat').value;
  const ciudad_id = parseInt($('add-ciudad').value);
  const latitud = $('add-lat').value;
  const longitud = $('add-lng').value;

  if (!titulo) return showMsg('add-err', 'El título es obligatorio');
  if (!latitud || !longitud) return showMsg('add-err', 'Haz clic en el mapa para seleccionar ubicación');

  setLoading('btn-do-add', true);
  try {
    await apiFetch('/markers', {
      method: 'POST',
      body: JSON.stringify({
        titulo, descripcion, categoria, ciudad_id,
        latitud: parseFloat(latitud),
        longitud: parseFloat(longitud)
      })
    });
    closePanelAdd();
    showToast('¡Marcador enviado! Pendiente de aprobación.');
    loadMarkers();
  } catch (e) {
    showMsg('add-err', e.message);
  } finally {
    setLoading('btn-do-add', false);
  }
}

// ─── Mis Marcadores ──────────────────────────────────────────

async function openMisPanel() {
  openPanel('panel-mis');
  hideMsg('mis-err');
  hideMsg('mis-ok');
  $('mis-list').innerHTML = '<div class="loading-box"><span class="spinner"></span> Cargando...</div>';

  try {
    const markers = await apiFetch('/markers/mis-marcadores');
    renderMisMarcadores(markers);
  } catch (e) {
    showMsg('mis-err', e.message);
    $('mis-list').innerHTML = '';
  }
}

function renderMisMarcadores(markers) {
  if (markers.length === 0) {
    $('mis-list').innerHTML = '<div class="loading-box" style="color:var(--text2)">No tienes marcadores aún</div>';
    return;
  }

  const html = markers.map(m => {
    const cat = CAT_CONFIG[m.categoria] || CAT_CONFIG.interes;
    const fecha = new Date(m.fecha_creacion).toLocaleDateString('es-CO', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
    const badgeClass = m.estado === 'aprobado' ? 'badge-approved'
      : m.estado === 'rechazado' ? 'badge-rejected'
        : 'badge-pending';
    const estadoLabel = m.estado.charAt(0).toUpperCase() + m.estado.slice(1);

    let actions = '';
    if (m.estado === 'pendiente') {
      actions = `
        <div class="mc-actions">
          <button class="btn btn-ghost btn-sm" onclick="toggleEditForm('${m.id}')">✏️ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDelete('${m.id}')">🗑️ Eliminar</button>
        </div>
        <div class="edit-form" id="edit-${m.id}">
          <div class="form-group"><label>Título</label><input type="text" id="edit-titulo-${m.id}" value="${escapeHtml(m.titulo)}"></div>
          <div class="form-group"><label>Descripción</label><textarea id="edit-desc-${m.id}">${escapeHtml(m.descripcion || '')}</textarea></div>
          <div class="form-group"><label>Categoría</label>
            <select id="edit-cat-${m.id}">
              <option value="interes" ${m.categoria === 'interes' ? 'selected' : ''}>📌 Punto de Interés</option>
              <option value="restaurante" ${m.categoria === 'restaurante' ? 'selected' : ''}>🍽️ Restaurante</option>
              <option value="parque" ${m.categoria === 'parque' ? 'selected' : ''}>🌳 Parque</option>
              <option value="evento" ${m.categoria === 'evento' ? 'selected' : ''}>⭐ Evento</option>
              <option value="cultura" ${m.categoria === 'cultura' ? 'selected' : ''}>📚 Cultura</option>
            </select>
          </div>
          <div class="form-group"><label>Ciudad</label>
            <select id="edit-ciudad-${m.id}">
              <option value="1" ${m.ciudad_id == 1 ? 'selected' : ''}>Bogotá</option>
              <option value="2" ${m.ciudad_id == 2 ? 'selected' : ''}>Medellín</option>
            </select>
          </div>
          <div class="mc-actions">
            <button class="btn btn-primary btn-sm" onclick="doEditMarker('${m.id}')">Guardar</button>
            <button class="btn btn-ghost btn-sm" onclick="toggleEditForm('${m.id}')">Cancelar</button>
          </div>
        </div>`;
    }

    return `
      <div class="marker-card">
        <div class="mc-header">
          <span class="mc-title">${cat.emoji} ${escapeHtml(m.titulo)}</span>
          <span class="badge ${badgeClass}">${estadoLabel}</span>
        </div>
        <div class="mc-meta">${cat.label} · ${fecha}</div>
        ${actions}
      </div>`;
  }).join('');

  $('mis-list').innerHTML = html;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function toggleEditForm(id) {
  const form = $('edit-' + id);
  form.classList.toggle('open');
}

async function doEditMarker(id) {
  const titulo = $('edit-titulo-' + id).value.trim();
  const descripcion = $('edit-desc-' + id).value.trim();
  const categoria = $('edit-cat-' + id).value;
  const ciudad_id = parseInt($('edit-ciudad-' + id).value);

  if (!titulo) return showMsg('mis-err', 'El título es obligatorio');
  hideMsg('mis-err');

  try {
    await apiFetch('/markers/' + id, {
      method: 'PATCH',
      body: JSON.stringify({ titulo, descripcion, categoria, ciudad_id })
    });
    showToast('Marcador actualizado');
    openMisPanel();
  } catch (e) {
    showMsg('mis-err', e.message);
  }
}

// ─── Eliminar marcador ──────────────────────────────────────

function confirmDelete(id) {
  deleteTargetId = id;
  $('modal-confirm').classList.add('open');
  $('modal-confirm-btn').onclick = async () => {
    try {
      await apiFetch('/markers/' + id, { method: 'DELETE' });
      closeModal();
      showToast('Marcador eliminado');
      openMisPanel();
      loadMarkers();
    } catch (e) {
      closeModal();
      showMsg('mis-err', e.message);
    }
  };
}

function closeModal() {
  $('modal-confirm').classList.remove('open');
  deleteTargetId = null;
}

// ─── Panel Admin ─────────────────────────────────────────────

async function openAdminPanel() {
  openPanel('panel-admin');
  hideMsg('admin-err');
  $('admin-content').innerHTML = '<div class="loading-box"><span class="spinner"></span> Cargando...</div>';

  try {
    const markers = await apiFetch('/markers/pending');
    renderAdminPanel(markers);
  } catch (e) {
    showMsg('admin-err', e.message);
    $('admin-content').innerHTML = '';
  }
}

function renderAdminPanel(markers) {
  if (markers.length === 0) {
    $('admin-content').innerHTML = '<div class="loading-box" style="color:var(--text2)">🎉 No hay marcadores pendientes</div>';
    return;
  }

  // Desktop table
  let tableHtml = `<div class="table-wrap"><table class="admin-table">
    <thead><tr><th>Título</th><th>Categoría</th><th>Creador</th><th>Coords</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody>`;
  markers.forEach(m => {
    const cat = CAT_CONFIG[m.categoria] || CAT_CONFIG.interes;
    const fecha = new Date(m.fecha_creacion).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
    const coords = `${parseFloat(m.latitud).toFixed(4)}, ${parseFloat(m.longitud).toFixed(4)}`;
    tableHtml += `<tr>
      <td>${cat.emoji} ${escapeHtml(m.titulo)}</td>
      <td>${cat.label}</td>
      <td>${escapeHtml(m.creador || 'Anónimo')}</td>
      <td style="font-size:.75rem">${coords}</td>
      <td>${fecha}</td>
      <td>
        <button class="btn btn-success btn-sm" onclick="doApprove('${m.id}')">✅ Aprobar</button>
        <button class="btn btn-danger btn-sm" onclick="doReject('${m.id}')">❌ Rechazar</button>
      </td>
    </tr>`;
  });
  tableHtml += '</tbody></table></div>';

  // Mobile cards
  let cardsHtml = '<div class="admin-cards-mobile">';
  markers.forEach(m => {
    const cat = CAT_CONFIG[m.categoria] || CAT_CONFIG.interes;
    const fecha = new Date(m.fecha_creacion).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
    const coords = `${parseFloat(m.latitud).toFixed(4)}, ${parseFloat(m.longitud).toFixed(4)}`;
    cardsHtml += `<div class="admin-card">
      <div class="admin-card-row"><strong>${cat.emoji} ${escapeHtml(m.titulo)}</strong></div>
      <div class="admin-card-row"><span class="admin-card-label">Categoría</span> ${cat.label}</div>
      <div class="admin-card-row"><span class="admin-card-label">Creador</span> ${escapeHtml(m.creador || 'Anónimo')}</div>
      <div class="admin-card-row"><span class="admin-card-label">Coordenadas</span> ${coords}</div>
      <div class="admin-card-row"><span class="admin-card-label">Fecha</span> ${fecha}</div>
      <div class="admin-card-actions">
        <button class="btn btn-success btn-sm" onclick="doApprove('${m.id}')">✅ Aprobar</button>
        <button class="btn btn-danger btn-sm" onclick="doReject('${m.id}')">❌ Rechazar</button>
      </div>
    </div>`;
  });
  cardsHtml += '</div>';

  $('admin-content').innerHTML = tableHtml + cardsHtml;
}

async function doApprove(id) {
  try {
    await apiFetch('/markers/' + id + '/approve', { method: 'PATCH' });
    showToast('Marcador aprobado ✅');
    openAdminPanel();
    loadMarkers();
  } catch (e) {
    showMsg('admin-err', e.message);
  }
}

async function doReject(id) {
  try {
    await apiFetch('/markers/' + id + '/reject', { method: 'PATCH' });
    showToast('Marcador rechazado ❌');
    openAdminPanel();
    loadMarkers();
  } catch (e) {
    showMsg('admin-err', e.message);
  }
}
