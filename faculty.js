/* ============================================================
   LIVE GPS TRACKER DEMO — Faculty Dashboard JavaScript (v4)
   
   Features:
   - Fleet Overview KPIs (Active, At College, Returning, Off Duty)
   - Cross-tab Storage Sync + 2.5s Polling Fallback
   - Multi-state Filterable Bus List
   - Live Bus Detail Panel with Leaflet Map, Route Polyline & ETA
   - Completed Trips History Logging
   ============================================================ */

// ─── Constants ───────────────────────────────────────────────────
const COLLEGE = { lat: 16.2366, lng: 80.3957, name: 'KHIT College (Chowdavaram, Guntur)' };
const LS_KEY = 'liveGpsBuses';
const LS_HIST_KEY = 'liveGpsTripHistory';
const POLL_MS = 2500;

// ─── State ───────────────────────────────────────────────────────
let allBuses = {};
let selectedBusNum = null;
let currentFilter = 'all';
let facultyMap = null;
let busMarker = null;
let collegeMarker = null;
let routeLine = null;
let pollInterval = null;
let searchQuery = '';

// Pre-defined college fleet
const DEFAULT_FLEET = [
  { busNumber: "28", driverName: "Ravi Kumar", routeName: "Route 1 - Brodipet ↔ KHIT College", defaultRouteId: "R1" },
  { busNumber: "33", driverName: "Suresh Reddy", routeName: "Route 2 - Syamala Nagar ↔ KHIT College", defaultRouteId: "R2" },
  { busNumber: "07", driverName: "Venkata Rao", routeName: "Route 3 - Guntur RTC Bus Stand ↔ KHIT College", defaultRouteId: "R3" },
  { busNumber: "52", driverName: "M. Prasad", routeName: "Route 4 - Gorantla ↔ KHIT College", defaultRouteId: "R4" },
  { busNumber: "38", driverName: "K. Nagaraju", routeName: "Route 5 - ANU / Mangalagiri ↔ KHIT College", defaultRouteId: "R5" },
  { busNumber: "15", driverName: "Ch. Anjaneyulu", routeName: "Route 6 - Perecherla ↔ KHIT College", defaultRouteId: "R6" }
];

// ─── Lifecycle ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initFacultyMap();
  loadBuses();
  renderTripHistoryTable();
  startPolling();
  setupStorageListener();
});

function setupStorageListener() {
  window.addEventListener('storage', (e) => {
    if (e.key === LS_KEY || e.key === LS_HIST_KEY) {
      loadBuses();
      renderTripHistoryTable();
    }
  });
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(() => {
    loadBuses();
  }, POLL_MS);
}

// ─── Load Buses from LocalStorage ────────────────────────────────
function loadBuses() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const stored = raw ? JSON.parse(raw) : {};

    // Merge default fleet to ensure all buses are visible in Off-Duty state if not active
    const merged = {};
    DEFAULT_FLEET.forEach(f => {
      merged[f.busNumber] = {
        busNumber: f.busNumber,
        driverName: f.driverName,
        routeName: f.routeName,
        status: 'OFF DUTY',
        onDuty: false,
        lat: null,
        lng: null,
        speedKmh: 0,
        tripDirection: 'OFF DUTY',
        nextStopName: '—',
        lastUpdated: null
      };
    });

    // Overlay active/saved data
    Object.keys(stored).forEach(k => {
      merged[k] = { ...merged[k], ...stored[k] };
    });

    allBuses = merged;
  } catch (e) {
    console.error('Failed reading buses:', e);
  }

  updateKPIs();
  renderBusList();

  if (selectedBusNum && allBuses[selectedBusNum]) {
    showBusDetail(selectedBusNum, false);
  }
}

// ─── Update KPIs ──────────────────────────────────────────────────
function updateKPIs() {
  const list = Object.values(allBuses);
  const total = list.length;
  const onTrip = list.filter(b => b.onDuty && (b.status === 'ON TRIP TO COLLEGE' || b.status === 'ON TRIP')).length;
  const atCollege = list.filter(b => b.onDuty && b.status === 'ARRIVED AT COLLEGE').length;
  const returning = list.filter(b => b.onDuty && b.status === 'RETURN TRIP').length;
  const offDuty = list.filter(b => !b.onDuty || b.status === 'OFF DUTY' || b.status === 'TRIP COMPLETED').length;

  document.getElementById('kpiTotalBuses').textContent = total;
  document.getElementById('kpiActiveBuses').textContent = onTrip;
  document.getElementById('kpiAtCollegeBuses').textContent = atCollege;
  document.getElementById('kpiReturningBuses').textContent = returning;
  document.getElementById('kpiOffDutyBuses').textContent = offDuty;
}

// ─── Filter Pills ─────────────────────────────────────────────────
window.setFilter = function(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderBusList();
};

window.filterBusList = function() {
  searchQuery = document.getElementById('busSearch').value.toLowerCase();
  renderBusList();
};

// ─── Render Bus List ──────────────────────────────────────────────
function renderBusList() {
  const container = document.getElementById('busListContainer');
  if (!container) return;

  const list = Object.values(allBuses);
  let filtered = list.filter(b => {
    // Search match
    const matchesSearch = !searchQuery || 
      b.busNumber.toLowerCase().includes(searchQuery) ||
      (b.driverName && b.driverName.toLowerCase().includes(searchQuery)) ||
      (b.routeName && b.routeName.toLowerCase().includes(searchQuery)) ||
      (b.nextStopName && b.nextStopName.toLowerCase().includes(searchQuery));

    if (!matchesSearch) return false;

    // Filter match
    if (currentFilter === 'all') return true;
    if (currentFilter === 'on_trip') return b.onDuty && (b.status === 'ON TRIP TO COLLEGE' || b.status === 'ON TRIP');
    if (currentFilter === 'at_college') return b.onDuty && b.status === 'ARRIVED AT COLLEGE';
    if (currentFilter === 'returning') return b.onDuty && b.status === 'RETURN TRIP';
    if (currentFilter === 'off_duty') return !b.onDuty || b.status === 'OFF DUTY' || b.status === 'TRIP COMPLETED';
    return true;
  });

  if (!filtered.length) {
    container.innerHTML = `
      <div class="no-buses-msg">
        <div class="nb-icon">🔍</div>
        <strong>No matching buses found</strong>
        <p>Try changing your filter or search query.</p>
      </div>`;
    return;
  }

  container.innerHTML = '';
  filtered.forEach(bus => {
    const card = document.createElement('div');
    const isSelected = (bus.busNumber === selectedBusNum);
    const statusBadge = getStatusBadge(bus);

    card.className = `bus-card ${isSelected ? 'selected' : ''} ${!bus.onDuty ? 'off-duty' : ''}`;
    card.setAttribute('role', 'button');
    card.onclick = () => selectBus(bus.busNumber);

    const speedDisplay = bus.onDuty ? `🚀 ${bus.speedKmh || 0} km/h` : '⏹️ Off Duty';
    const timeDisplay = bus.lastUpdated ? timeAgo(bus.lastUpdated) : '—';
    const targetDisplay = bus.nextStopName ? `🎯 ${bus.nextStopName}` : `🛣️ ${bus.routeName || '—'}`;

    card.innerHTML = `
      <div class="bus-card-header">
        <div class="bus-card-num">🚌 Bus ${bus.busNumber}</div>
        ${statusBadge}
      </div>
      <div class="bus-card-route">${targetDisplay}</div>
      <div class="bus-card-meta">
        <span>👤 ${bus.driverName || 'Driver'}</span>
        <span style="color:${bus.onDuty ? '#4ade80' : 'inherit'};font-weight:600;">${speedDisplay}</span>
      </div>
      <div style="font-size:0.72rem;color:var(--text-muted);margin-top:6px;display:flex;justify-content:space-between;">
        <span>${bus.tripDirection === 'RETURN' ? '🏠 Drop-off Return' : '🏫 Morning Pickup'}</span>
        <span>⏱️ ${timeDisplay}</span>
      </div>
    `;

    container.appendChild(card);
  });
}

function getStatusBadge(bus) {
  if (!bus.onDuty || bus.status === 'OFF DUTY') {
    return `<span class="duty-badge off">OFF DUTY</span>`;
  }
  if (bus.status === 'ARRIVED AT COLLEGE') {
    return `<span class="duty-badge on" style="background:#eab308;">AT COLLEGE</span>`;
  }
  if (bus.status === 'RETURN TRIP') {
    return `<span class="duty-badge on" style="background:#0284c7;">RETURNING</span>`;
  }
  if (bus.status === 'TRIP COMPLETED') {
    return `<span class="duty-badge on" style="background:#8b5cf6;">COMPLETED</span>`;
  }
  return `<span class="duty-badge on">ON TRIP</span>`;
}

// ─── Select Bus ──────────────────────────────────────────────────
window.selectBus = function(busNum) {
  selectedBusNum = busNum;
  document.querySelectorAll('.bus-card').forEach(c => c.classList.remove('selected'));
  renderBusList();
  showBusDetail(busNum, true);
};

window.clearSelectedBus = function() {
  selectedBusNum = null;
  document.getElementById('welcomePanel').style.display = 'block';
  document.getElementById('busDetailPanel').style.display = 'none';
  if (busMarker && facultyMap) {
    facultyMap.removeLayer(busMarker);
    busMarker = null;
  }
  if (routeLine && facultyMap) {
    facultyMap.removeLayer(routeLine);
    routeLine = null;
  }
  renderBusList();
};

// ─── Bus Detail Panel ─────────────────────────────────────────────
function showBusDetail(busNum, centerMap = false) {
  const bus = allBuses[busNum];
  if (!bus) return;

  document.getElementById('welcomePanel').style.display = 'none';
  const detailPanel = document.getElementById('busDetailPanel');
  detailPanel.style.display = 'flex';

  requestAnimationFrame(() => {
    if (facultyMap) facultyMap.invalidateSize();
  });
  setTimeout(() => {
    if (facultyMap) facultyMap.invalidateSize();
  }, 100);

  document.getElementById('detailBusNum').textContent = `Bus ${bus.busNumber}`;
  document.getElementById('detailDriverName').textContent = `👤 ${bus.driverName || '—'}`;
  document.getElementById('detailRoute').textContent = `🛣️ ${bus.routeName || '—'}`;
  document.getElementById('detailLastUpdated').textContent = bus.lastUpdated ? `Updated ${timeAgo(bus.lastUpdated)}` : 'No recent updates';

  const badge = document.getElementById('detailDutyBadge');
  badge.className = `duty-badge ${bus.onDuty ? 'on' : 'off'}`;
  badge.textContent = bus.onDuty ? (bus.status || 'ON TRIP') : 'OFF DUTY';

  // Stats
  document.getElementById('detailSpeed').textContent = `${bus.speedKmh || 0} km/h`;
  document.getElementById('detailTarget').textContent = bus.nextStopName || 'KHIT College';
  document.getElementById('detailTargetSub').textContent = bus.tripDirection === 'RETURN' ? 'Evening Return Drop-off' : 'Morning College Pickup';

  if (bus.lat && bus.lng) {
    document.getElementById('detailLat').textContent = bus.lat.toFixed(5);
    document.getElementById('detailLng').textContent = bus.lng.toFixed(5);

    // Calculate ETA to KHIT College
    const distKm = RouteEngine.calcDistanceKm(bus.lat, bus.lng, COLLEGE.lat, COLLEGE.lng);
    const speedFloor = Math.max(bus.speedKmh || 0, 15);
    const etaMin = Math.round((distKm / speedFloor) * 60);

    if (bus.status === 'ARRIVED AT COLLEGE') {
      document.getElementById('detailETA').textContent = 'At Campus';
      document.getElementById('detailETASub').textContent = 'Parked at KHIT College';
    } else if (bus.status === 'TRIP COMPLETED') {
      document.getElementById('detailETA').textContent = 'Completed';
      document.getElementById('detailETASub').textContent = 'All stops completed';
    } else {
      document.getElementById('detailETA').textContent = `~${etaMin} min`;
      document.getElementById('detailETASub').textContent = `~${distKm.toFixed(1)} km to destination`;
    }

    updateFacultyMapMarker(bus, centerMap);
  } else {
    document.getElementById('detailLat').textContent = '—';
    document.getElementById('detailLng').textContent = '—';
    document.getElementById('detailETA').textContent = bus.onDuty ? 'Awaiting GPS' : 'Offline';
    document.getElementById('detailETASub').textContent = 'No GPS fix yet';
  }
}

// ─── Leaflet Map ──────────────────────────────────────────────────
function initFacultyMap() {
  const el = document.getElementById('faculty-map');
  if (!el) return;

  facultyMap = L.map('faculty-map', { zoomControl: true }).setView([COLLEGE.lat, COLLEGE.lng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(facultyMap);

  // College destination marker
  const collegeIcon = L.divIcon({
    html: '<div style="background:#22c55e;border:2px solid #fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 0 12px rgba(34,197,94,0.7);">🏫</div>',
    iconSize: [32, 32], iconAnchor: [16, 16], className: ''
  });
  collegeMarker = L.marker([COLLEGE.lat, COLLEGE.lng], { icon: collegeIcon })
    .addTo(facultyMap)
    .bindPopup(`<strong style="color:#4ade80;">📍 ${COLLEGE.name}</strong><br><small style="color:#94a3b8;">Main College Campus</small>`);
}

function updateFacultyMapMarker(bus, centerMap = false) {
  if (!facultyMap || !bus.lat || !bus.lng) return;

  const busIcon = L.divIcon({
    html: `<div style="background:linear-gradient(135deg,#0284c7,#00d4ff);border:2px solid #fff;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 16px rgba(14,165,233,0.9);">🚌</div>`,
    iconSize: [38, 38], iconAnchor: [19, 19], className: ''
  });

  if (busMarker) {
    busMarker.setLatLng([bus.lat, bus.lng]);
  } else {
    busMarker = L.marker([bus.lat, bus.lng], { icon: busIcon }).addTo(facultyMap);
  }

  busMarker.bindPopup(`
    <strong>Bus ${bus.busNumber}</strong><br>
    Driver: ${bus.driverName || '—'}<br>
    Speed: ${bus.speedKmh || 0} km/h<br>
    Status: ${bus.status || 'Active'}
  `);

  // Draw connecting dashed route line
  if (routeLine) facultyMap.removeLayer(routeLine);
  routeLine = L.polyline([[bus.lat, bus.lng], [COLLEGE.lat, COLLEGE.lng]], {
    color: '#0ea5e9', weight: 3, dashArray: '6,8', opacity: 0.7
  }).addTo(facultyMap);

  if (centerMap) {
    const bounds = L.latLngBounds([[bus.lat, bus.lng], [COLLEGE.lat, COLLEGE.lng]]);
    facultyMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }
}

// ─── Trip History Table ───────────────────────────────────────────
window.renderTripHistoryTable = function() {
  const tbody = document.getElementById('tripHistoryBody');
  if (!tbody) return;

  let history = [];
  try {
    history = JSON.parse(localStorage.getItem(LS_HIST_KEY) || '[]');
  } catch (e) { history = []; }

  // Include default sample trips for high-fidelity presentation if empty
  if (!history.length) {
    history = [
      { busNumber: "28", driverName: "Ravi Kumar", routeName: "Route 1 - Brodipet ↔ KHIT", tripType: "Morning Pickup", startedAt: Date.now() - 3600000, completedAt: Date.now() - 600000, status: "Arrived at College" },
      { busNumber: "33", driverName: "Suresh Reddy", routeName: "Route 2 - Syamala Nagar ↔ KHIT", tripType: "Morning Pickup", startedAt: Date.now() - 4200000, completedAt: Date.now() - 1200000, status: "Arrived at College" }
    ];
  }

  tbody.innerHTML = '';
  history.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>Bus ${t.busNumber}</strong></td>
      <td>${t.driverName || '—'}</td>
      <td>${t.routeName || '—'}</td>
      <td><span class="badge badge-low" style="font-size:0.7rem;">${t.tripType || 'Trip'}</span></td>
      <td>${new Date(t.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
      <td>${t.completedAt ? new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
      <td><span style="color:#4ade80;font-weight:600;">${t.status || 'Completed'}</span></td>
    `;
    tbody.appendChild(tr);
  });
};

window.refreshDashboard = function() {
  loadBuses();
  renderTripHistoryTable();
  const btn = document.getElementById('refreshBtn');
  if (btn) {
    btn.textContent = '✅ Updated';
    setTimeout(() => { btn.innerHTML = '🔄 <span>Refresh</span>'; }, 1000);
  }
};

function timeAgo(ms) {
  const diff = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}
