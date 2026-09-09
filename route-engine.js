/* ============================================================
   LIVE GPS TRACKER DEMO — Intelligent Route & Simulation Engine
   
   Provides:
   - Location management & category filtering
   - Distance (Haversine) & ETA calculations
   - Congestion-aware multi-path route recommendations
   - Dynamic route reversal for morning ↔ return journeys
   - Multi-stop drop-off sequence calculation
   ============================================================ */

const RouteEngine = (function() {
  let locations = [];
  let busRoutes = [];

  // Haversine formula
  function calcDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Load datasets
  async function init() {
    try {
      const locResp = await fetch('data/locations.json');
      locations = await locResp.json();
    } catch(e) {
      locations = getDefaultLocations();
    }

    try {
      const routeResp = await fetch('data/bus-routes.json');
      busRoutes = await routeResp.json();
    } catch(e) {
      busRoutes = getDefaultBusRoutes();
    }
  }

  function getLocations() {
    return locations.length ? locations : getDefaultLocations();
  }

  function getBusRoutes() {
    return busRoutes.length ? busRoutes : getDefaultBusRoutes();
  }

  function getLocationById(id) {
    const list = getLocations();
    return list.find(l => l.id === id) || null;
  }

  // Generate intelligent route suggestion between ANY two locations
  function findBestRoute(fromId, toId, currentHour = 8) {
    const fromLoc = getLocationById(fromId);
    const toLoc = getLocationById(toId);
    if (!fromLoc || !toLoc) return null;

    const straightDist = calcDistanceKm(fromLoc.lat, fromLoc.lng, toLoc.lat, toLoc.lng);
    const roadDist = Math.max(1.2, +(straightDist * 1.28).toFixed(1));
    const altRoadDist = +(roadDist * 1.18).toFixed(1);

    // Congestion factor based on hour of day
    let congestionScore = 30; // base
    if ((currentHour >= 8 && currentHour <= 10) || (currentHour >= 17 && currentHour <= 20)) {
      congestionScore = 78; // Peak hours
    } else if ((currentHour >= 11 && currentHour <= 16) || (currentHour >= 21 && currentHour <= 22)) {
      congestionScore = 48; // Moderate hours
    } else {
      congestionScore = 20; // Off-peak
    }

    // Determine congestion level
    let congestion = "Low";
    let speedKmh = 42;
    if (congestionScore > 66) {
      congestion = "High";
      speedKmh = 24;
    } else if (congestionScore > 33) {
      congestion = "Medium";
      speedKmh = 32;
    }

    const travelTime = Math.max(4, Math.round((roadDist / speedKmh) * 60));
    const altTravelTime = Math.round(travelTime * 1.35);
    const timeSaved = Math.max(3, altTravelTime - travelTime);

    // Generate intelligent intermediate corridor nodes
    const primaryCorridor = getCorridorName(fromLoc, toLoc, false);
    const altCorridor = getCorridorName(fromLoc, toLoc, true);

    // Coordinates arrays for Leaflet polylines
    const recommendedCoords = generateRoutePath(fromLoc, toLoc, 0);
    const alternativeCoords = generateRoutePath(fromLoc, toLoc, 0.008);

    return {
      from: fromLoc,
      to: toLoc,
      recommended: {
        pathName: `${fromLoc.name} → ${primaryCorridor} → ${toLoc.name}`,
        distanceKm: roadDist,
        travelTimeMin: travelTime,
        congestion: congestion,
        timeSavedMin: timeSaved,
        bestTime: "Before 8:00 AM or After 8:30 PM",
        coordinates: recommendedCoords
      },
      alternative: {
        pathName: `${fromLoc.name} → ${altCorridor} → ${toLoc.name}`,
        distanceKm: altRoadDist,
        travelTimeMin: altTravelTime,
        congestion: congestion === "High" ? "High" : "Medium",
        coordinates: alternativeCoords
      }
    };
  }

  function getCorridorName(from, to, isAlt = false) {
    if (to.id === 'khit' || from.id === 'khit') {
      return isAlt 
        ? "Inner Ring Road ↔ Pattabhipuram ↔ Nallapadu" 
        : "NH-16 Highway Corridor ↔ Gujjanagundla";
    }
    return isAlt 
      ? "Outer Bypass ↔ Autonagar Line" 
      : "Main Arterial Corridor ↔ Collectorate";
  }

  // Generate intermediate curve coordinates between two points
  function generateRoutePath(p1, p2, curveOffset = 0) {
    const steps = 6;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      const lat = p1.lat + (p2.lat - p1.lat) * frac + Math.sin(frac * Math.PI) * curveOffset;
      const lng = p1.lng + (p2.lng - p1.lng) * frac + Math.sin(frac * Math.PI) * (curveOffset * 0.7);
      pts.push([+lat.toFixed(6), +lng.toFixed(6)]);
    }
    return pts;
  }

  // Reverse any route for return trip
  function createReturnRoute(route) {
    if (!route) return null;
    return {
      routeId: `${route.routeId}-RET`,
      routeName: `Return: ${route.destination || 'KHIT College'} → ${route.origin || 'Home Stop'}`,
      origin: route.destination || "KHIT College (Chowdavaram)",
      destination: route.origin,
      stops: (route.returnStops && route.returnStops.length) 
        ? route.returnStops 
        : [...(route.outboundStops || [])].reverse()
    };
  }

  // Fallback default locations
  function getDefaultLocations() {
    return [
      { id: "khit", name: "KHIT College (Chowdavaram)", lat: 16.2366, lng: 80.3957, category: "College" },
      { id: "rtc_stand", name: "Guntur RTC Bus Stand", lat: 16.3020, lng: 80.4490, category: "Bus Stand" },
      { id: "brodipet", name: "Brodipet (Main Road)", lat: 16.3090, lng: 80.4425, category: "Commercial" },
      { id: "syamala_nagar", name: "Syamala Nagar (Shyamala Nagar)", lat: 16.2940, lng: 80.4350, category: "Residential" },
      { id: "arundelpet", name: "Arundelpet", lat: 16.3040, lng: 80.4450, category: "Commercial" },
      { id: "lakshmipuram", name: "Lakshmipuram", lat: 16.2980, lng: 80.4520, category: "Residential" },
      { id: "gujjanagundla", name: "Gujjanagundla (Ring Road)", lat: 16.2870, lng: 80.4280, category: "Junction" },
      { id: "pattabhipuram", name: "Pattabhipuram", lat: 16.2990, lng: 80.4250, category: "Residential" },
      { id: "gorantla", name: "Gorantla", lat: 16.3300, lng: 80.4180, category: "Residential" },
      { id: "nallapadu", name: "Nallapadu", lat: 16.2620, lng: 80.3980, category: "Junction" },
      { id: "collector_office", name: "Collector Office Area", lat: 16.3030, lng: 80.4390, category: "Landmark" },
      { id: "anu", name: "Acharya Nagarjuna University (ANU)", lat: 16.3765, lng: 80.5280, category: "Educational" },
      { id: "vijayawada", name: "Vijayawada (PNBS)", lat: 16.5165, lng: 80.6200, category: "City" }
    ];
  }

  function getDefaultBusRoutes() {
    return [
      {
        routeId: "R1",
        routeName: "Route 1 - Brodipet ↔ KHIT College",
        origin: "Brodipet (Main Road)",
        destination: "KHIT College (Chowdavaram)",
        defaultBusNumbers: ["12", "28"],
        outboundStops: [
          { name: "Brodipet (Main Road)", lat: 16.3090, lng: 80.4425 },
          { name: "Arundelpet 4th Line", lat: 16.3040, lng: 80.4450 },
          { name: "Lakshmipuram Circle", lat: 16.2980, lng: 80.4520 },
          { name: "Gujjanagundla Ring Road", lat: 16.2870, lng: 80.4280 },
          { name: "Nallapadu Bypass", lat: 16.2620, lng: 80.3980 },
          { name: "KHIT College (Campus)", lat: 16.2366, lng: 80.3957 }
        ]
      }
    ];
  }

  return {
    init,
    calcDistanceKm,
    getLocations,
    getBusRoutes,
    getLocationById,
    findBestRoute,
    createReturnRoute
  };
})();

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
  window.RouteEngine = RouteEngine;
  RouteEngine.init();
}
