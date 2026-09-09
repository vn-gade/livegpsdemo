/* ============================================================
   LIVE GPS TRACKER DEMO — Driver View JavaScript (v4)
   
   Features:
   - Start Duty / Go Live (Morning pickup)
   - I Already Started My Trip (Resume mode)
   - Mark "Arrived at KHIT College"
   - "Start Return Trip" with automatic route reversal
   - Multi-stop drop-off tracker with arrival confirmation
   - "Trip Completed" & "Go Off Duty"
   - Real GPS via watchPosition() + intelligent demo simulation
   - Real-time cross-tab sync to Faculty Transport Dashboard
   ============================================================ */

// ─── State ───────────────────────────────────────────────────────
let watchId = null;
let demoIntervalId = null;
let driverMap = null;
let driverMarker = null;
let routeLine = null;
let stopMarkers = [];

let isOnDuty = false;
let isDemoMode = false;
let currentBusRecord = null;
let allRoutesData = [];

// KHIT College Reference
const COLLEGE = { lat: 16.2366, lng: 80.3957, name: "KHIT College (Chowdavaram, Guntur)" };

// Default demo fallback path (Brodipet to KHIT)
const DEFAULT_OUTBOUND_PATH = [
  { lat: 16.3090, lng: 80.4425, name: "Brodipet (Main Road)" },
  { lat: 16.3040, lng: 80.4450, name: "Arundelpet 4th Line" },
  { lat: 16.2980, lng: 80.4520, name: "Lakshmipuram Circle" },
  { lat: 16.2870, lng: 80.4280, name: "Gujjanagundla Ring Road" },
  { lat: 16.2620, lng: 80.3980, name: "Nallapadu Bypass" },
  { lat: 16.2366, lng: 80.3957, name: "KHIT College (Campus)" }
];

let activePath = [...DEFAULT_OUTBOUND_PATH];
let currentStopIndex = 0;
let demoStep = 0;
let prevLat = null, prevLng = null, prevTime = null;

// ─── DOM References ──────────────────────────────────────────────
const regCard               = document.getElementById('regCard');
const liveStatusCard        = document.getElementById('liveStatusCard');
const liveIndicatorDot      = document.getElementById('liveIndicatorDot');
const liveStatusTitle       = document.getElementById('liveStatusTitle');
const tripPillBadge         = document.getElementById('tripPillBadge');
const liveStatusSub         = document.getElementById('liveStatusSub');
const liveSpeed             = document.getElementById('liveSpeed');
const liveBusNum            = document.getElementById('liveBusNum');
const liveDriverDisplay     = document.getElementById('liveDriverDisplay');
const liveDirectionDisplay  = document.getElementById('liveDirectionDisplay');
const liveNextStop          = document.getElementById('liveNextStop');
const liveAccuracy          = document.getElementById('liveAccuracy');
const liveLat               = document.getElementById('liveLat');
const liveLng               = document.getElementById('liveLng');
const gpsStatusText         = document.getElementById('gpsStatusText');
const gpsErrorMsg           = document.getElementById('gpsErrorMsg');
const demoModeBanner        = document.getElementById('demoModeBanner');
const mapContainer          = document.getElementById('driverMapContainer');

// Buttons
const reachedCollegeBtn     = document.getElementById('reachedCollegeBtn');
const startReturnBtn        = document.getElementById('startReturnBtn');
const completeFinalTripBtn  = document.getElementById('completeFinalTripBtn');
const endDutyBtn            = document.getElementById('endDutyBtn');
const stopsProgressCard     = document.getElementById('stopsProgressCard');
const stopsListContainer    = document.getElementById('stopsListContainer');
const remainingStopsCount   = document.getElementById('remainingStopsCount');

// ─── Initialize ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('data/bus-routes.json');
    allRoutesData = await res.json();
    populateRouteDropdown();
  } catch (e) {
    allRoutesData = [];
  }

  // Restore previous session if active
  restoreSessionIfActive();
});

function populateRouteDropdown() {
  const sel = document.getElementById('routeName');
  if (!sel || !allRoutesData.length) return;
  sel.innerHTML = '<option value="">Select your route...</option>';
  allRoutesData.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.routeName;
    opt.textContent = r.routeName;
    opt.dataset.id = r.routeId;
    sel.appendChild(opt);
  });
}

function onRouteSelectChange() {
  const sel = document.getElementById('routeName');
  const selectedOpt = sel.options[sel.selectedIndex];
  if (selectedOpt && selectedOpt.dataset.id) {
    const r = allRoutesData.find(x => x.routeId === selectedOpt.dataset.id);
    if (r && r.defaultBusNumbers && r.defaultBusNumbers.length) {
      document.getElementById('busNumber').value = r.defaultBusNumbers[0];
    }
  }
}

// ─── Start / Resume Duty ─────────────────────────────────────────
window.startDuty = function(isResume = false) {
  const driverName = document.getElementById('driverName').value.trim();
  const busNumber  = document.getElementById('busNumber').value.trim();
  const routeName  = document.getElementById('routeName').value.trim();
  const tripDirection = document.getElementById('tripDirection').value;

  if (!driverName) { alert('Please enter Driver Name.'); return; }
  if (!busNumber)  { alert('Please enter Bus Number.'); return; }
  if (!routeName)  { alert('Please select an assigned Route.'); return; }

  isOnDuty = true;
  const routeObj = allRoutesData.find(r => r.routeName === routeName) || null;

  if (tripDirection === 'RETURN') {
    activePath = routeObj && routeObj.returnStops ? routeObj.returnStops : [...DEFAULT_OUTBOUND_PATH].reverse();
  } else {
    activePath = routeObj && routeObj.outboundStops ? routeObj.outboundStops : [...DEFAULT_OUTBOUND_PATH];
  }

  currentStopIndex = 0;
  demoStep = 0;

  const initialLat = activePath[0]?.lat || 16.3090;
  const initialLng = activePath[0]?.lng || 80.4425;
  const nextTargetName = activePath.length > 1 ? activePath[1].name : COLLEGE.name;

  currentBusRecord = {
    busNumber,
    driverName,
    routeName,
    routeId: routeObj ? routeObj.routeId : 'R1',
    tripDirection: tripDirection === 'RETURN' ? 'RETURN' : 'OUTBOUND',
    status: tripDirection === 'RETURN' ? 'RETURN TRIP' : 'ON TRIP TO COLLEGE',
    onDuty: true,
    lat: initialLat,
    lng: initialLng,
    speedKmh: isResume ? 36 : 0,
    accuracy: 10,
    currentStopIndex: 0,
    currentStopName: activePath[0]?.name || 'Origin',
    nextStopName: nextTargetName,
    completedStops: [],
    remainingStops: activePath.slice(1).map(s => s.name),
    startedAt: Date.now(),
    arrivedAtCollegeTime: null,
    lastUpdated: Date.now()
  };

  saveBusRecord(currentBusRecord);

  // Switch UI view
  regCard.style.display = 'none';
  liveStatusCard.classList.add('visible');
  liveStatusCard.classList.remove('off-duty');
  mapContainer.classList.add('visible');

  updateUIForState(currentBusRecord.status);
  initDriverMap();
  drawActiveRouteOnMap();

  // Start GPS tracking
  if ('geolocation' in navigator) {
    requestGPS();
  } else {
    startDemoSimulation();
  }
};

// ─── State & UI Updates ──────────────────────────────────────────
function updateUIForState(status) {
  liveBusNum.textContent = `Bus ${currentBusRecord.busNumber}`;
  liveDriverDisplay.textContent = currentBusRecord.driverName;
  liveStatusSub.textContent = isDemoMode ? '🎭 Demo Mode Active' : '✅ Live GPS Tracking Active';

  if (status === 'ON TRIP TO COLLEGE') {
    liveStatusTitle.textContent = 'YOU ARE LIVE';
    liveStatusTitle.className = 'live-title green';
    tripPillBadge.textContent = 'MORNING PICKUP';
    tripPillBadge.className = 'trip-badge-pill outbound';
    liveDirectionDisplay.textContent = 'Home → KHIT College';
    liveNextStop.textContent = currentBusRecord.nextStopName || 'KHIT College';

    reachedCollegeBtn.style.display = 'block';
    startReturnBtn.style.display = 'none';
    completeFinalTripBtn.style.display = 'none';
    stopsProgressCard.style.display = 'none';

  } else if (status === 'ARRIVED AT COLLEGE') {
    liveStatusTitle.textContent = 'AT KHIT COLLEGE';
    liveStatusTitle.className = 'live-title yellow';
    tripPillBadge.textContent = 'AT CAMPUS';
    tripPillBadge.className = 'trip-badge-pill college';
    liveDirectionDisplay.textContent = 'At KHIT College Campus';
    liveNextStop.textContent = 'Campus Parking';
    liveSpeed.textContent = '0 km/h';

    reachedCollegeBtn.style.display = 'none';
    startReturnBtn.style.display = 'block';
    completeFinalTripBtn.style.display = 'none';
    stopsProgressCard.style.display = 'none';

  } else if (status === 'RETURN TRIP') {
    liveStatusTitle.textContent = 'RETURN TRIP LIVE';
    liveStatusTitle.className = 'live-title green';
    tripPillBadge.textContent = 'STUDENT DROP-OFF';
    tripPillBadge.className = 'trip-badge-pill return';
    liveDirectionDisplay.textContent = 'KHIT → Home Locations';
    liveNextStop.textContent = currentBusRecord.nextStopName || 'Next Stop';

    reachedCollegeBtn.style.display = 'none';
    startReturnBtn.style.display = 'none';
    completeFinalTripBtn.style.display = 'none';
    stopsProgressCard.style.display = 'block';
    renderStopsProgressList();

  } else if (status === 'TRIP COMPLETED') {
    liveStatusTitle.textContent = 'TRIP COMPLETED';
    liveStatusTitle.className = 'live-title gray';
    tripPillBadge.textContent = 'COMPLETED';
    tripPillBadge.className = 'trip-badge-pill completed';
    liveDirectionDisplay.textContent = 'All Drops Completed';
    liveNextStop.textContent = 'Final Destination';
    liveSpeed.textContent = '0 km/h';

    reachedCollegeBtn.style.display = 'none';
    startReturnBtn.style.display = 'none';
    completeFinalTripBtn.style.display = 'none';
    stopsProgressCard.style.display = 'none';
  }
}

// ─── Mark Reached College ─────────────────────────────────────────
window.markReachedCollege = function() {
  if (!confirm('Confirm arrival at KHIT College Campus?')) return;

  const now = Date.now();
  currentBusRecord.status = 'ARRIVED AT COLLEGE';
  currentBusRecord.tripDirection = 'AT COLLEGE';
  currentBusRecord.arrivedAtCollegeTime = now;
  currentBusRecord.lat = COLLEGE.lat;
  currentBusRecord.lng = COLLEGE.lng;
  currentBusRecord.speedKmh = 0;
  currentBusRecord.lastUpdated = now;

  // Log morning trip completion to history
  logTripHistory({
    busNumber: currentBusRecord.busNumber,
    driverName: currentBusRecord.driverName,
    routeName: currentBusRecord.routeName,
    tripType: 'Morning Pickup (Home → KHIT College)',
    startedAt: currentBusRecord.startedAt,
    completedAt: now,
    status: 'Arrived at College'
  });

  saveBusRecord(currentBusRecord);
  updateUIForState(currentBusRecord.status);
  updateDriverMapMarker(COLLEGE.lat, COLLEGE.lng, 0);
};

// ─── Start Return Trip (Reversed Route) ───────────────────────────
window.startReturnTrip = function() {
  const routeObj = allRoutesData.find(r => r.routeName === currentBusRecord.routeName);
  activePath = routeObj && routeObj.returnStops ? routeObj.returnStops : [...DEFAULT_OUTBOUND_PATH].reverse();
  
  currentStopIndex = 0;
  demoStep = 0;
  const now = Date.now();

  currentBusRecord.status = 'RETURN TRIP';
  currentBusRecord.tripDirection = 'RETURN';
  currentBusRecord.startedAt = now;
  currentBusRecord.currentStopIndex = 0;
  currentBusRecord.currentStopName = activePath[0]?.name || 'KHIT College';
  currentBusRecord.nextStopName = activePath[1]?.name || 'First Drop-off Stop';
  currentBusRecord.completedStops = [activePath[0]?.name || 'KHIT College'];
  currentBusRecord.remainingStops = activePath.slice(1).map(s => s.name);
  currentBusRecord.lat = activePath[0]?.lat || COLLEGE.lat;
  currentBusRecord.lng = activePath[0]?.lng || COLLEGE.lng;
  currentBusRecord.speedKmh = 35;
  currentBusRecord.lastUpdated = now;

  saveBusRecord(currentBusRecord);
  updateUIForState('RETURN TRIP');
  drawActiveRouteOnMap();

  if (isDemoMode) {
    startDemoSimulation();
  }
};

// ─── Multi-stop Progress Handler ──────────────────────────────────
function renderStopsProgressList() {
  if (!stopsListContainer || !activePath.length) return;
  stopsListContainer.innerHTML = '';

  activePath.forEach((stop, idx) => {
    const item = document.createElement('div');
    item.className = 'stop-item';
    if (idx < currentStopIndex) {
      item.classList.add('done');
      item.innerHTML = `<span>✓</span> <span>${stop.name}</span> <small style="margin-left:auto;color:#4ade80;">Completed</small>`;
    } else if (idx === currentStopIndex) {
      item.classList.add('current');
      item.innerHTML = `<span>📍</span> <span>${stop.name}</span> <small style="margin-left:auto;color:#38bdf8;">Next Stop</small>`;
    } else {
      item.classList.add('upcoming');
      item.innerHTML = `<span>○</span> <span>${stop.name}</span>`;
    }
    stopsListContainer.appendChild(item);
  });

  const remaining = Math.max(0, activePath.length - currentStopIndex - 1);
  remainingStopsCount.textContent = `${remaining} Remaining`;

  if (currentStopIndex >= activePath.length - 1) {
    document.getElementById('arrivedAtStopBtn').style.display = 'none';
    completeFinalTripBtn.style.display = 'block';
  } else {
    document.getElementById('arrivedAtStopBtn').style.display = 'block';
    completeFinalTripBtn.style.display = 'none';
  }
}

window.advanceToNextStop = function() {
  if (currentStopIndex < activePath.length - 1) {
    currentStopIndex++;
    const currentStop = activePath[currentStopIndex];
    const nextStop = activePath[currentStopIndex + 1] || null;

    currentBusRecord.currentStopIndex = currentStopIndex;
    currentBusRecord.currentStopName = currentStop.name;
    currentBusRecord.nextStopName = nextStop ? nextStop.name : 'Final Drop-off Stop';
    currentBusRecord.completedStops.push(currentStop.name);
    currentBusRecord.remainingStops = activePath.slice(currentStopIndex + 1).map(s => s.name);
    currentBusRecord.lat = currentStop.lat;
    currentBusRecord.lng = currentStop.lng;
    currentBusRecord.lastUpdated = Date.now();

    saveBusRecord(currentBusRecord);
    renderStopsProgressList();
    updateLiveUI(currentStop.lat, currentStop.lng, currentBusRecord.speedKmh, 10, Date.now());
  }
};

window.completeFinalTrip = function() {
  const now = Date.now();
  currentBusRecord.status = 'TRIP COMPLETED';
  currentBusRecord.speedKmh = 0;
  currentBusRecord.lastUpdated = now;

  logTripHistory({
    busNumber: currentBusRecord.busNumber,
    driverName: currentBusRecord.driverName,
    routeName: currentBusRecord.routeName,
    tripType: 'Return Drop-off (KHIT College → Home)',
    startedAt: currentBusRecord.startedAt,
    completedAt: now,
    status: 'Completed'
  });

  saveBusRecord(currentBusRecord);
  updateUIForState('TRIP COMPLETED');
  alert('🎉 Return trip completed successfully! All students dropped off. You may now Go Off Duty.');
};

// ─── End Duty / Go Off Duty ───────────────────────────────────────
window.endDuty = function() {
  if (!confirm('End your duty and go OFF DUTY?')) return;

  isOnDuty = false;
  if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  if (demoIntervalId) { clearInterval(demoIntervalId); demoIntervalId = null; }

  if (currentBusRecord) {
    currentBusRecord.onDuty = false;
    currentBusRecord.status = 'OFF DUTY';
    currentBusRecord.speedKmh = 0;
    currentBusRecord.lastUpdated = Date.now();
    saveBusRecord(currentBusRecord);
  }

  // Reset UI
  liveStatusCard.classList.add('off-duty');
  liveStatusTitle.textContent = 'OFF DUTY';
  liveStatusTitle.className = 'live-title gray';
  tripPillBadge.textContent = 'OFF DUTY';
  tripPillBadge.className = 'trip-badge-pill';
  liveStatusSub.textContent = 'Tracking stopped';
  liveIndicatorDot.classList.add('off');
  liveSpeed.textContent = '0 km/h';
  gpsStatusText.textContent = '⏹️ Duty ended — Bus is now OFF DUTY.';

  // Show registration again after 1.5s
  setTimeout(() => {
    liveStatusCard.classList.remove('visible');
    mapContainer.classList.remove('visible');
    regCard.style.display = 'block';
  }, 1200);
};



// ─── GPS Streaming & Demo Simulation ──────────────────────────────
function requestGPS() {
  gpsStatusText.textContent = 'Requesting device GPS stream...';
  const options = { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 };

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      isDemoMode = false;
      demoModeBanner.classList.remove('visible');
      gpsErrorMsg.classList.remove('visible');
      const { latitude, longitude, speed, accuracy } = pos.coords;
      let spdKmh = speed ? Math.round(speed * 3.6) : calculateSpeed(latitude, longitude, pos.timestamp);

      if (currentBusRecord) {
        currentBusRecord.lat = latitude;
        currentBusRecord.lng = longitude;
        currentBusRecord.speedKmh = spdKmh;
        currentBusRecord.accuracy = accuracy;
        currentBusRecord.lastUpdated = Date.now();
        saveBusRecord(currentBusRecord);
      }
      updateLiveUI(latitude, longitude, spdKmh, accuracy, pos.timestamp);
    },
    (err) => {
      console.warn('GPS failed, starting simulation mode:', err.message);
      gpsErrorMsg.classList.add('visible');
      startDemoSimulation();
    },
    options
  );
}

function startDemoSimulation() {
  if (isDemoMode && demoIntervalId) return;
  isDemoMode = true;
  demoModeBanner.classList.add('visible');
  gpsStatusText.textContent = '🎭 Simulated GPS Movement Active';

  if (demoIntervalId) clearInterval(demoIntervalId);

  demoIntervalId = setInterval(() => {
    if (!isOnDuty || currentBusRecord?.status === 'ARRIVED AT COLLEGE' || currentBusRecord?.status === 'TRIP COMPLETED') {
      return;
    }

    const path = activePath.length ? activePath : DEFAULT_OUTBOUND_PATH;
    const pt = path[demoStep % path.length];
    const spd = Math.round(32 + Math.random() * 18);
    const now = Date.now();

    if (currentBusRecord) {
      currentBusRecord.lat = pt.lat + (Math.random() - 0.5) * 0.0002;
      currentBusRecord.lng = pt.lng + (Math.random() - 0.5) * 0.0002;
      currentBusRecord.speedKmh = spd;
      currentBusRecord.accuracy = 8;
      currentBusRecord.lastUpdated = now;
      saveBusRecord(currentBusRecord);
      updateLiveUI(currentBusRecord.lat, currentBusRecord.lng, spd, 8, now);
    }

    demoStep++;
  }, 3000);
}

function calculateSpeed(lat, lng, timestamp) {
  if (!prevLat || !prevTime) {
    prevLat = lat; prevLng = lng; prevTime = timestamp;
    return 35;
  }
  const distKm = RouteEngine.calcDistanceKm(prevLat, prevLng, lat, lng);
  const timeHrs = Math.max(0.0001, (timestamp - prevTime) / 3600000);
  prevLat = lat; prevLng = lng; prevTime = timestamp;
  return Math.min(80, Math.round(distKm / timeHrs));
}

function updateLiveUI(lat, lng, speedKmh, accuracy, timestamp) {
  liveSpeed.textContent = `${speedKmh} km/h`;
  liveLat.textContent = lat ? lat.toFixed(5) : '—';
  liveLng.textContent = lng ? lng.toFixed(5) : '—';
  liveAccuracy.textContent = accuracy ? `±${Math.round(accuracy)} m` : 'Simulated';
  gpsStatusText.textContent = `📡 Updated at ${new Date(timestamp).toLocaleTimeString()}`;

  if (lat && lng) {
    updateDriverMapMarker(lat, lng, speedKmh);
  }
}

// ─── Leaflet Map ──────────────────────────────────────────────────
function initDriverMap() {
  if (driverMap) return;
  const startPt = activePath[0] || COLLEGE;
  driverMap = L.map('driver-map', { zoomControl: true }).setView([startPt.lat, startPt.lng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(driverMap);
}

function drawActiveRouteOnMap() {
  if (!driverMap || !activePath.length) return;

  // Clear existing layers
  if (routeLine) driverMap.removeLayer(routeLine);
  stopMarkers.forEach(m => driverMap.removeLayer(m));
  stopMarkers = [];

  const latlngs = activePath.map(p => [p.lat, p.lng]);
  routeLine = L.polyline(latlngs, {
    color: '#0ea5e9',
    weight: 4,
    dashArray: '6,6',
    opacity: 0.8
  }).addTo(driverMap);

  // Add stop markers
  activePath.forEach((stop, i) => {
    const isCol = (stop.lat === COLLEGE.lat && stop.lng === COLLEGE.lng);
    const iconHtml = isCol 
      ? '<div style="background:#22c55e;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid white;">🏫</div>'
      : `<div style="background:#3b82f6;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;color:white;font-weight:bold;border:2px solid white;">${i + 1}</div>`;

    const marker = L.marker([stop.lat, stop.lng], {
      icon: L.divIcon({ html: iconHtml, iconSize: [24, 24], iconAnchor: [12, 12], className: '' })
    }).addTo(driverMap).bindPopup(`<strong>${stop.name}</strong>`);
    stopMarkers.push(marker);
  });

  driverMap.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
}

function updateDriverMapMarker(lat, lng, speed) {
  if (!driverMap) return;

  const busIconHtml = `
    <div style="background:linear-gradient(135deg,#0284c7,#00d4ff);border:2px solid #fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 0 12px rgba(14,165,233,0.8);">🚌</div>
  `;

  if (driverMarker) {
    driverMarker.setLatLng([lat, lng]);
  } else {
    driverMarker = L.marker([lat, lng], {
      icon: L.divIcon({ html: busIconHtml, iconSize: [36, 36], iconAnchor: [18, 18], className: '' })
    }).addTo(driverMap);
  }

  driverMarker.bindPopup(`
    <strong>Bus ${currentBusRecord?.busNumber || ''}</strong><br>
    Speed: ${speed} km/h<br>
    Status: ${currentBusRecord?.status || 'Active'}
  `);
}

// ─── LocalStorage Persistence ─────────────────────────────────────
function saveBusRecord(record) {
  try {
    const data = JSON.parse(localStorage.getItem('liveGpsBuses') || '{}');
    data[record.busNumber] = record;
    localStorage.setItem('liveGpsBuses', JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

function logTripHistory(trip) {
  try {
    const hist = JSON.parse(localStorage.getItem('liveGpsTripHistory') || '[]');
    hist.unshift(trip);
    localStorage.setItem('liveGpsTripHistory', JSON.stringify(hist.slice(0, 30)));
  } catch (e) {}
}

function restoreSessionIfActive() {
  try {
    const data = JSON.parse(localStorage.getItem('liveGpsBuses') || '{}');
    const buses = Object.values(data);
    const active = buses.find(b => b.onDuty === true);
    if (active) {
      document.getElementById('driverName').value = active.driverName || '';
      document.getElementById('busNumber').value = active.busNumber || '';
      document.getElementById('routeName').value = active.routeName || '';
    }
  } catch (e) {}
}
