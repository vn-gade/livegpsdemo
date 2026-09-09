/* ============================================================
   LIVE GPS TRACKER DEMO — Main Application Script
   Handles: Navbar, Maps, Charts, Route Tool, Reveal Animations
   ============================================================ */

// ─── Load Traffic Data ───────────────────────────────────────────
let trafficData = null;

async function loadTrafficData() {
  try {
    const response = await fetch('data/traffic-data.json');
    trafficData = await response.json();
  } catch (err) {
    // Fallback inline data if fetch fails (e.g., file:// protocol)
    trafficData = getInlineTrafficData();
  }
  initAll();
}

// Inline fallback data for file:// protocol
function getInlineTrafficData() {
  return {
    college: { lat: 16.2366, lng: 80.3957, name: "KHIT College (Chowdavaram, Guntur)" },
    roadSegments: [
      { id: "seg1", name: "NH-16 Highway (Guntur - Chowdavaram Corridor)", coordinates: [[16.2750,80.4100],[16.2620,80.4040],[16.2480,80.3990],[16.2366,80.3957]], hourlyCongestion: [10,8,7,6,8,20,55,82,90,85,65,50,45,42,40,48,60,78,88,80,65,45,28,15] },
      { id: "seg2", name: "Brodipet Main Road (4/1 to 4/15)", coordinates: [[16.3140,80.4400],[16.3110,80.4420],[16.3080,80.4435],[16.3050,80.4450]], hourlyCongestion: [8,6,5,4,7,18,60,88,92,87,70,55,48,44,42,50,65,82,90,83,68,48,30,12] },
      { id: "seg3", name: "Shyamala Nagar Main Road", coordinates: [[16.2980,80.4320],[16.2950,80.4350],[16.2920,80.4370],[16.2890,80.4385]], hourlyCongestion: [12,10,8,7,10,25,50,78,88,82,62,48,40,38,36,44,58,75,85,78,62,42,25,14] },
      { id: "seg4", name: "Arundalpet 1st & 2nd Lines", coordinates: [[16.3080,80.4470],[16.3050,80.4460],[16.3020,80.4450],[16.2990,80.4440]], hourlyCongestion: [5,4,3,3,5,15,45,72,85,80,58,42,35,33,30,40,55,70,82,75,58,38,20,8] },
      { id: "seg5", name: "Lakshmipuram Main Road", coordinates: [[16.3030,80.4550],[16.3000,80.4530],[16.2970,80.4510],[16.2940,80.4490]], hourlyCongestion: [7,5,4,3,6,22,62,85,93,89,72,58,50,46,44,55,68,85,92,86,70,50,32,16] },
      { id: "seg6", name: "Gujanagundla Ring Road Junction", coordinates: [[16.2920,80.4250],[16.2890,80.4270],[16.2860,80.4290],[16.2830,80.4310]], hourlyCongestion: [15,12,10,8,12,30,68,90,95,91,75,62,55,52,50,60,72,88,94,88,72,55,38,20] },
      { id: "seg7", name: "Collectorate - Kanna Vari Thota Road", coordinates: [[16.3060,80.4360],[16.3030,80.4375],[16.3000,80.4390],[16.2970,80.4405]], hourlyCongestion: [6,4,3,2,5,18,48,75,82,78,60,46,38,36,34,42,56,72,80,74,58,40,22,10] },
      { id: "seg8", name: "Pattabhipuram - SVN Colony Link Road", coordinates: [[16.3050,80.4230],[16.3020,80.4250],[16.2990,80.4270],[16.2960,80.4290]], hourlyCongestion: [8,6,5,4,7,20,52,78,86,80,62,48,42,40,38,46,60,76,84,78,62,44,26,12] },
      { id: "seg9", name: "Nallapadu - Chowdavaram Bypass", coordinates: [[16.2650,80.3950],[16.2550,80.3955],[16.2450,80.3956],[16.2366,80.3957]], hourlyCongestion: [9,7,5,4,6,16,44,70,80,76,58,44,38,36,34,42,54,68,78,72,56,38,22,11] }
    ],
    locations: [
      { id: "loc1", name: "KHIT College (Chowdavaram)", lat: 16.2366, lng: 80.3957 },
      { id: "loc2", name: "Guntur RTC Bus Stand", lat: 16.3020, lng: 80.4490 },
      { id: "loc3", name: "Brodipet", lat: 16.3090, lng: 80.4425 },
      { id: "loc4", name: "Shyamala Nagar", lat: 16.2940, lng: 80.4350 },
      { id: "loc5", name: "Arundalpet", lat: 16.3040, lng: 80.4450 },
      { id: "loc6", name: "Lakshmipuram", lat: 16.2980, lng: 80.4520 },
      { id: "loc7", name: "Gujanagundla", lat: 16.2870, lng: 80.4280 },
      { id: "loc8", name: "Pattabhipuram", lat: 16.2990, lng: 80.4250 }
    ],
    routeMatrix: {
      "loc1-loc3": { route: "KHIT College ↔ NH-16 ↔ Gujanagundla ↔ Arundalpet ↔ Brodipet", travelTime: 22, timeSaved: 8, bestTime: "Before 8:00 AM or After 8:30 PM", congestion: "Medium" },
      "loc1-loc4": { route: "KHIT College ↔ NH-16 ↔ Nallapadu ↔ Pattabhipuram ↔ Shyamala Nagar", travelTime: 18, timeSaved: 6, bestTime: "Before 8:15 AM or After 8:30 PM", congestion: "Low" },
      "loc1-loc2": { route: "KHIT College ↔ NH-16 ↔ Lakshmipuram ↔ Guntur RTC Bus Stand", travelTime: 25, timeSaved: 9, bestTime: "Before 7:45 AM or After 9:00 PM", congestion: "High" },
      "loc1-loc5": { route: "KHIT College ↔ NH-16 ↔ Collectorate Road ↔ Arundalpet", travelTime: 20, timeSaved: 7, bestTime: "Before 8:00 AM or After 8:45 PM", congestion: "Medium" },
      "loc1-loc6": { route: "KHIT College ↔ NH-16 ↔ Gujanagundla ↔ Lakshmipuram", travelTime: 24, timeSaved: 8, bestTime: "Before 7:45 AM or After 9:00 PM", congestion: "High" },
      "loc1-loc7": { route: "KHIT College ↔ Chowdavaram ↔ Nallapadu ↔ Gujanagundla", travelTime: 15, timeSaved: 5, bestTime: "Before 8:30 AM or After 8:00 PM", congestion: "Low" },
      "loc1-loc8": { route: "KHIT College ↔ NH-16 ↔ Gujanagundla ↔ Pattabhipuram", travelTime: 16, timeSaved: 5, bestTime: "Before 8:15 AM or After 8:15 PM", congestion: "Low" },
      "loc2-loc3": { route: "Guntur RTC Bus Stand ↔ Arundalpet ↔ Brodipet", travelTime: 10, timeSaved: 3, bestTime: "Before 8:30 AM or After 8:30 PM", congestion: "Medium" },
      "loc3-loc4": { route: "Brodipet ↔ Pattabhipuram ↔ Shyamala Nagar", travelTime: 12, timeSaved: 4, bestTime: "Before 8:30 AM or After 8:30 PM", congestion: "Low" },
      "loc4-loc7": { route: "Shyamala Nagar ↔ Pattabhipuram ↔ Gujanagundla", travelTime: 8, timeSaved: 2, bestTime: "Before 9:00 AM or After 8:00 PM", congestion: "Low" },
      "loc5-loc6": { route: "Arundalpet ↔ RTC Cross Road ↔ Lakshmipuram", travelTime: 8, timeSaved: 2, bestTime: "Any time", congestion: "Low" }
    },
    busRoutes: [
      { routeId: "R1", routeName: "Route 1 - Brodipet → KHIT College" },
      { routeId: "R2", routeName: "Route 2 - Shyamala Nagar → KHIT College" },
      { routeId: "R3", routeName: "Route 3 - Guntur RTC Bus Stand → KHIT College" },
      { routeId: "R4", routeName: "Route 4 - Arundalpet → KHIT College" },
      { routeId: "R5", routeName: "Route 5 - Gujanagundla → KHIT College" },
      { routeId: "R6", routeName: "Route 6 - Pattabhipuram → KHIT College" }
    ]
  };
}

// ─── Initialize Everything ────────────────────────────────────────
function initAll() {
  initNavbar();
  initRevealAnimations();
  initHeroMockup();
  initCongestionMap();
  initAllCharts();
  initRouteTool();
}

// Wrapper to initialize all charts in correct order
function initAllCharts() {
  populateBarChartFilter();
  populateLineChartFilter();
}

// ─── Navbar ──────────────────────────────────────────────────────
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburgerBtn');
  const navLinks = document.getElementById('navLinks');

  // Scroll shadow effect
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
    updateActiveNavLink();
  });

  // Hamburger menu
  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen.toString());
  });

  // Close menu on nav link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

function updateActiveNavLink() {
  const sections = ['home','problem','solution','traffic-map','analytics','route-tool','live-gps','about'];
  const links = document.querySelectorAll('.nav-links a[href^="#"]');
  let current = 'home';

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 120) current = id;
  });

  links.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
  });
}

// ─── Reveal Animations ───────────────────────────────────────────
function initRevealAnimations() {
  const revealEls = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach(el => observer.observe(el));
}

// ─── Hero Mockup Animations ──────────────────────────────────────
function initHeroMockup() {
  // Animate hero stat mockup values
  let speed = 38, eta = 14, buses = 3;
  const speedEl = document.getElementById('hero-speed-mock');
  const etaEl = document.getElementById('hero-eta-mock');
  const busesEl = document.getElementById('hero-buses-mock');

  if (!speedEl) return;

  setInterval(() => {
    speed = Math.max(25, Math.min(65, speed + Math.round((Math.random() - 0.5) * 6)));
    eta = Math.max(5, Math.min(25, eta + Math.round((Math.random() - 0.5) * 2)));
    speedEl.textContent = speed;
    etaEl.textContent = eta;
  }, 2500);
}

// ─── Congestion Map ──────────────────────────────────────────────
let congestionMap = null;
let roadPolylines = [];
let currentHour = 8;

function initCongestionMap() {
  const mapEl = document.getElementById('congestion-map');
  if (!mapEl || !trafficData) return;

  // Initialize Leaflet map centered on Guntur - KHIT corridor
  congestionMap = L.map('congestion-map', { zoomControl: true }).setView([16.2750, 80.4200], 12);

  // OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(congestionMap);

  // College marker
  const collegeIcon = L.divIcon({
    html: '<div style="background:#22c55e;border:2px solid #166534;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 0 8px rgba(34,197,94,0.6);">🏫</div>',
    iconSize: [28, 28], iconAnchor: [14, 14], className: ''
  });
  L.marker([trafficData.college.lat, trafficData.college.lng], { icon: collegeIcon })
    .addTo(congestionMap)
    .bindPopup(`<strong style="color:#4ade80;">📍 ${trafficData.college.name}</strong><br><span style="font-size:0.8rem;color:#94a3b8;">ETA Destination</span>`);

  // Draw road polylines
  drawRoads(currentHour);
  populateSegmentList();

  // Time slider
  const slider = document.getElementById('timeSlider');
  const timeDisplay = document.getElementById('timeDisplay');

  slider.addEventListener('input', () => {
    currentHour = parseInt(slider.value);
    const timeStr = formatHour(currentHour);
    timeDisplay.textContent = timeStr;
    slider.setAttribute('aria-valuetext', timeStr);
    drawRoads(currentHour);
    populateSegmentList();
    updateDoughnutChart();
  });
}

function formatHour(h) {
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return `${display}:00 ${period}`;
}

function getCongestionColor(score) {
  if (score <= 33) return '#4ade80';      // Green
  if (score <= 66) return '#facc15';      // Yellow
  return '#f87171';                        // Red
}

function getCongestionLabel(score) {
  if (score <= 33) return 'Low';
  if (score <= 66) return 'Medium';
  return 'High';
}

function getCongestionClass(score) {
  if (score <= 33) return 'badge-low';
  if (score <= 66) return 'badge-medium';
  return 'badge-high';
}

function drawRoads(hour) {
  if (!congestionMap || !trafficData) return;

  // Clear existing polylines
  roadPolylines.forEach(p => congestionMap.removeLayer(p));
  roadPolylines = [];

  const hourIndex = Math.max(0, Math.min(23, hour));

  trafficData.roadSegments.forEach(segment => {
    const score = segment.hourlyCongestion[hourIndex];
    const color = getCongestionColor(score);
    const weight = score > 66 ? 6 : (score > 33 ? 5 : 4);

    const polyline = L.polyline(segment.coordinates, {
      color: color,
      weight: weight,
      opacity: 0.85,
      lineJoin: 'round',
      lineCap: 'round'
    }).addTo(congestionMap);

    polyline.bindPopup(`
      <div style="font-family:'Inter',sans-serif;min-width:180px;">
        <strong style="color:#f1f5f9;font-family:'Poppins',sans-serif;">${segment.name}</strong><br>
        <span style="color:#94a3b8;font-size:0.8rem;">⏰ ${formatHour(hour)}</span><br>
        <div style="margin-top:8px;">
          <span style="color:#94a3b8;font-size:0.8rem;">Congestion Score:</span>
          <strong style="color:${color};font-size:1rem;"> ${score}/100</strong>
        </div>
        <div>
          <span style="color:#94a3b8;font-size:0.8rem;">Status:</span>
          <strong style="color:${color};"> ${getCongestionLabel(score)}</strong>
        </div>
      </div>
    `);

    roadPolylines.push(polyline);
  });
}

function populateSegmentList() {
  const list = document.getElementById('segmentList');
  if (!list || !trafficData) return;

  const hourIndex = Math.max(0, Math.min(23, currentHour));
  list.innerHTML = '';

  trafficData.roadSegments.forEach((seg, i) => {
    const score = seg.hourlyCongestion[hourIndex];
    const label = getCongestionLabel(score);
    const cls = getCongestionClass(score);
    const item = document.createElement('div');
    item.className = 'segment-item';
    item.setAttribute('role', 'listitem');
    item.innerHTML = `
      <span class="segment-name">${seg.name}</span>
      <span class="segment-badge ${cls}">${label}</span>
    `;
    item.addEventListener('click', () => {
      if (roadPolylines[i]) {
        congestionMap.panTo(seg.coordinates[0]);
        roadPolylines[i].openPopup();
      }
    });
    list.appendChild(item);
  });
}

// ─── Charts ──────────────────────────────────────────────────────
let barChart, lineChart, doughnutChart;
const chartDefaults = {
  font: { family: "'Inter', sans-serif", size: 12 },
  color: '#94a3b8'
};
Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = "'Inter', sans-serif";

function populateBarChartFilter() {
  const sel = document.getElementById('barChartFilter');
  if (!sel || !trafficData) return;
  sel.innerHTML = '<option value="all">All Segments (Average)</option>';
  trafficData.roadSegments.forEach(seg => {
    const opt = document.createElement('option');
    opt.value = seg.id;
    opt.textContent = seg.name;
    sel.appendChild(opt);
  });
  sel.removeEventListener('change', updateBarChart);
  sel.addEventListener('change', updateBarChart);
  initBarChart();
}

function populateLineChartFilter() {
  const sel = document.getElementById('lineChartFilter');
  if (!sel || !trafficData) return;
  sel.innerHTML = '';
  trafficData.roadSegments.forEach(seg => {
    const opt = document.createElement('option');
    opt.value = seg.id;
    opt.textContent = seg.name;
    sel.appendChild(opt);
  });
  sel.removeEventListener('change', updateLineChart);
  sel.addEventListener('change', updateLineChart);
  initLineChart();
  initDoughnutChart();
}

function getHourLabels() {
  return Array.from({ length: 18 }, (_, i) => formatHour(i + 6));
}

function getBarData(filterId) {
  if (!trafficData) return [];
  if (filterId === 'all' || !filterId) {
    // Average all segments
    return Array.from({ length: 18 }, (_, i) => {
      const vals = trafficData.roadSegments.map(s => s.hourlyCongestion[i + 6]);
      return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    });
  }
  const seg = trafficData.roadSegments.find(s => s.id === filterId);
  return seg ? seg.hourlyCongestion.slice(6, 24) : [];
}

function initBarChart() {
  const ctx = document.getElementById('barChart');
  if (!ctx) return;
  if (barChart) {
    barChart.destroy();
    barChart = null;
  }
  const data = getBarData('all');
  const labels = getHourLabels();
  const colors = data.map(v => getCongestionColor(v));

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Congestion Score',
        data,
        backgroundColor: colors.map(c => c + '99'),
        borderColor: colors,
        borderWidth: 1.5,
        borderRadius: 4,
        barPercentage: 0.7
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0b1e38',
          borderColor: '#0ea5e9',
          borderWidth: 1,
          callbacks: {
            label: ctx => `Score: ${ctx.parsed.y}/100 — ${getCongestionLabel(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(14,165,233,0.08)' }, ticks: { color: '#64748b', maxRotation: 45 } },
        y: { min: 0, max: 100, grid: { color: 'rgba(14,165,233,0.08)' }, ticks: { color: '#64748b' } }
      }
    }
  });
}

function updateBarChart() {
  if (!barChart) return;
  const filterId = document.getElementById('barChartFilter').value;
  const data = getBarData(filterId);
  const colors = data.map(v => getCongestionColor(v));
  barChart.data.datasets[0].data = data;
  barChart.data.datasets[0].backgroundColor = colors.map(c => c + '99');
  barChart.data.datasets[0].borderColor = colors;
  barChart.update();
}

// Weekly trend – simulate 7-day peak congestion (Mon–Sun)
const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const weekFactors = [1.0, 0.95, 0.98, 1.02, 1.08, 0.6, 0.45];

function initLineChart() {
  const ctx = document.getElementById('lineChart');
  if (!ctx || !trafficData) return;
  if (lineChart) {
    lineChart.destroy();
    lineChart = null;
  }
  const seg = trafficData.roadSegments[0];
  const peakVal = seg.hourlyCongestion[8]; // 8 AM peak
  const data = weekFactors.map(f => Math.round(peakVal * f));

  lineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: weekDays,
      datasets: [{
        label: 'Peak Hour Congestion',
        data,
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14,165,233,0.1)',
        borderWidth: 2.5,
        pointBackgroundColor: data.map(v => getCongestionColor(v)),
        pointBorderColor: '#0ea5e9',
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0b1e38', borderColor: '#0ea5e9', borderWidth: 1,
          callbacks: { label: ctx => `Score: ${ctx.parsed.y}/100 — ${getCongestionLabel(ctx.parsed.y)}` }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(14,165,233,0.08)' }, ticks: { color: '#64748b' } },
        y: { min: 0, max: 100, grid: { color: 'rgba(14,165,233,0.08)' }, ticks: { color: '#64748b' } }
      }
    }
  });
}

function updateLineChart() {
  if (!lineChart || !trafficData) return;
  const segId = document.getElementById('lineChartFilter').value;
  const seg = trafficData.roadSegments.find(s => s.id === segId);
  if (!seg) return;
  const peakVal = seg.hourlyCongestion[8];
  const data = weekFactors.map(f => Math.round(peakVal * f));
  lineChart.data.datasets[0].data = data;
  lineChart.data.datasets[0].pointBackgroundColor = data.map(v => getCongestionColor(v));
  lineChart.update();
}

function initDoughnutChart() {
  const ctx = document.getElementById('doughnutChart');
  if (!ctx || !trafficData) return;
  if (doughnutChart) {
    doughnutChart.destroy();
    doughnutChart = null;
  }
  const { low, med, high } = getDoughnutData(currentHour);

  doughnutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Low', 'Medium', 'High'],
      datasets: [{
        data: [low, med, high],
        backgroundColor: ['rgba(74,222,128,0.7)', 'rgba(250,204,21,0.7)', 'rgba(248,113,113,0.7)'],
        borderColor: ['#4ade80', '#facc15', '#f87171'],
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0b1e38', borderColor: '#0ea5e9', borderWidth: 1,
          callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} segments` }
        }
      }
    }
  });
  updateDoughnutLegend(low, med, high);
}

function getDoughnutData(hour) {
  if (!trafficData) return { low: 3, med: 4, high: 2 };
  const idx = Math.max(0, Math.min(23, hour));
  let low = 0, med = 0, high = 0;
  trafficData.roadSegments.forEach(s => {
    const v = s.hourlyCongestion[idx];
    if (v <= 33) low++;
    else if (v <= 66) med++;
    else high++;
  });
  return { low, med, high };
}

function updateDoughnutChart() {
  if (!doughnutChart) return;
  const { low, med, high } = getDoughnutData(currentHour);
  doughnutChart.data.datasets[0].data = [low, med, high];
  doughnutChart.update();
  updateDoughnutLegend(low, med, high);
}

function updateDoughnutLegend(low, med, high) {
  const el = document.getElementById('doughnut-legend');
  if (!el) return;
  const total = low + med + high;
  el.innerHTML = `
    <span style="color:#4ade80;">● Low: ${low} (${Math.round(low/total*100)}%)</span>
    <span style="color:#facc15;">● Medium: ${med} (${Math.round(med/total*100)}%)</span>
    <span style="color:#f87171;">● High: ${high} (${Math.round(high/total*100)}%)</span>
  `;
}

// ─── Route Tool ──────────────────────────────────────────────────
let routePolylines = [];

function initRouteTool() {
  const fromSel = document.getElementById('routeFrom');
  const toSel = document.getElementById('routeTo');
  if (!fromSel || !toSel) return;

  const locs = (window.RouteEngine && window.RouteEngine.getLocations().length)
    ? window.RouteEngine.getLocations()
    : (trafficData ? trafficData.locations : []);

  fromSel.innerHTML = '<option value="">Select starting point...</option>';
  toSel.innerHTML = '<option value="">Select destination...</option>';

  // Sort alphabetically
  const sorted = [...locs].sort((a, b) => a.name.localeCompare(b.name));

  sorted.forEach(loc => {
    fromSel.add(new Option(loc.name, loc.id));
    toSel.add(new Option(loc.name, loc.id));
  });

  // Set intelligent defaults
  const brodipet = sorted.find(l => l.id === 'brodipet');
  const khit = sorted.find(l => l.id === 'khit' || l.id === 'loc1');
  if (brodipet) fromSel.value = brodipet.id;
  if (khit) toSel.value = khit.id;

  fromSel.addEventListener('change', clearRouteResult);
  toSel.addEventListener('change', clearRouteResult);
}

function clearRouteResult() {
  document.getElementById('routeResultContent').innerHTML = `
    <p style="color:var(--text-muted);font-size:0.9rem;line-height:1.7;">
      Click <strong style="color:var(--blue-400);">Find Best Route</strong> to get intelligent routing suggestions based on real-time congestion data.
    </p>`;
}

window.findRoute = function () {
  const fromId = document.getElementById('routeFrom').value;
  const toId = document.getElementById('routeTo').value;
  const container = document.getElementById('routeResultContent');

  if (!fromId || !toId) {
    container.innerHTML = `<p style="color:var(--red-400);">⚠️ Please select both a starting location and destination.</p>`;
    return;
  }
  if (fromId === toId) {
    container.innerHTML = `<p style="color:var(--yellow-400);">⚠️ Start and destination cannot be the same location.</p>`;
    return;
  }

  const routeResult = window.RouteEngine
    ? window.RouteEngine.findBestRoute(fromId, toId, currentHour)
    : null;

  if (!routeResult) {
    container.innerHTML = `<p style="color:var(--red-400);">Unable to compute route between selected points.</p>`;
    return;
  }

  const rec = routeResult.recommended;
  const alt = routeResult.alternative;
  const congestionClass = rec.congestion === 'Low' ? 'green' : (rec.congestion === 'Medium' ? 'yellow' : 'red');
  const congestionIcon = rec.congestion === 'Low' ? '🟢' : (rec.congestion === 'Medium' ? '🟡' : '🔴');

  container.innerHTML = `
    <div style="margin-bottom:14px;">
      <span class="badge badge-low" style="margin-bottom:6px;display:inline-block;">🌟 RECOMMENDED BEST ROUTE</span>
      <p class="route-path" style="font-size:0.95rem;margin:4px 0 12px;font-weight:600;color:#f1f5f9;">🛣️ ${rec.pathName}</p>
    </div>

    <div class="route-stats">
      <div class="route-stat-item">
        <div class="rs-label">📏 Road Distance</div>
        <div class="rs-value">${rec.distanceKm} km</div>
      </div>
      <div class="route-stat-item">
        <div class="rs-label">⏱️ Travel Time</div>
        <div class="rs-value">~${rec.travelTimeMin} min</div>
      </div>
      <div class="route-stat-item">
        <div class="rs-label">⚡ Time Saved</div>
        <div class="rs-value green">~${rec.timeSavedMin} min</div>
      </div>
      <div class="route-stat-item">
        <div class="rs-label">📊 Traffic Level</div>
        <div class="rs-value ${congestionClass}">${congestionIcon} ${rec.congestion}</div>
      </div>
    </div>

    <!-- Alternative Route Comparison -->
    <div style="margin-top:16px;padding:12px 14px;background:rgba(255,255,255,0.03);border:1px solid var(--card-border);border-radius:var(--radius-md);">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong style="font-size:0.8rem;color:var(--text-muted);text-transform:uppercase;">🔀 Alternative Route</strong>
        <span style="font-size:0.75rem;color:#94a3b8;">${alt.distanceKm} km • ~${alt.travelTimeMin} min</span>
      </div>
      <p style="font-size:0.82rem;color:var(--text-secondary);margin:4px 0 0;">${alt.pathName}</p>
    </div>

    <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:var(--text-muted);">
      <span>🕐 Best Departure: <strong style="color:#38bdf8;">${rec.bestTime}</strong></span>
      <span>Live Route Analysis</span>
    </div>
  `;

  // Highlight route on the Leaflet map
  if (congestionMap && rec.coordinates && rec.coordinates.length) {
    // Clear old route polylines
    routePolylines.forEach(p => congestionMap.removeLayer(p));
    routePolylines = [];

    // Draw Alternative (dashed orange)
    const altLine = L.polyline(alt.coordinates, {
      color: '#fb923c', weight: 4, dashArray: '6,6', opacity: 0.6
    }).addTo(congestionMap);

    // Draw Recommended (solid neon blue)
    const recLine = L.polyline(rec.coordinates, {
      color: '#00d4ff', weight: 6, opacity: 0.95
    }).addTo(congestionMap);

    routePolylines.push(altLine, recLine);
    congestionMap.fitBounds(recLine.getBounds(), { padding: [40, 40] });
  }
};

// ─── Start App ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadTrafficData);
