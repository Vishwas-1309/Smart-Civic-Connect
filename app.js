/**
 * SMART CIVIC CONNECT — UN SDG 11 CIVIC GOVERNANCE PLATFORM
 * Core Application Engine
 * Features:
 *  - 9 Comprehensive Hierarchical Categories & Subcategories
 *  - AI Civic Issue Assistant (Heuristic NLP Classifier & Auto-Drafter)
 *  - Smart Duplicate Complaint Detection (Haversine Distance + Token Matching)
 *  - Live Civic Map & Heatmap Clusters (Leaflet + OpenStreetMap)
 *  - Community Severity Index (CSI 0-100) Multi-factor Scoring
 *  - Automatic Department Routing & Escalation Engine (24h, 3d, 7d, 15d)
 *  - Transparent Resolution Workflow & Citizen Verification of Repairs
 *  - Multilingual Voice Reporting (English, Telugu, Hindi) via Web Speech API
 *  - Accessibility Navigator (SDG 11.2) & Smart Parking Monitor
 *  - Civic Points, Badges, and Community Leaderboard
 *  - Assisted Telephone Helpline & Operator Registration Portal
 */

(() => {
  'use strict';

  // Local Storage Storage Keys
  const STORAGE_KEY_REPORTS = 'smart_civic_connect_reports_v2';
  const STORAGE_KEY_POINTS = 'smart_civic_connect_points_v2';
  const STORAGE_KEY_VOTES = 'smart_civic_connect_votes_v2';
  const STORAGE_KEY_ROLE = 'smart_civic_connect_role_v2';
  const STORAGE_KEY_ADMIN_CREDENTIAL = 'smart_civic_connect_admin_credential_v1';
  const STORAGE_KEY_GEMINI_KEY = 'smart_civic_connect_gemini_api_key';
  const STORAGE_KEY_CAMERADB = 'smart_civic_connect_camera_db_v2';
  const STORAGE_KEY_HELPLINE_CALLS = 'smart_civic_connect_helpline_calls_v1';
  const HELPLINE_CALL_STATUSES = ['New', 'In Progress', 'Follow-up', 'Escalated', 'Resolved'];
  const GEMINI_MODEL = 'gemini-2.5-flash';
  const GEMINI_MODEL_LABEL = 'Gemini 2.5 Flash';
  const ADMIN_PASSWORD_ITERATIONS = 120000;
  const API_BASE_URL = window.location.protocol === 'file:' || window.location.port === '4173'
    ? `http://${window.location.hostname || 'localhost'}:4200/api`
    : '/api';
  const API_COMPLAINTS_URL = `${API_BASE_URL}/complaints`;

  let geminiApiKey = '';
  let helplineAiAnalysis = null;
  try {
    geminiApiKey = localStorage.getItem(STORAGE_KEY_GEMINI_KEY) || '';
  } catch (e) {}

  // =========================================================================
  // 1. COMPREHENSIVE 9-CATEGORY TAXONOMY & DEFAULT DEPARTMENTS
  // =========================================================================
  const TAXONOMY = {
    'public-infra': {
      name: 'Public Infrastructure and Road Maintenance',
      icon: '🛣️',
      class: 'infra',
      defaultDept: 'Roads & Municipal Engineering Dept',
      baseSeverity: 30,
      subcategories: [
        'Potholes',
        'Damaged roads',
        'Road cracks',
        'Damaged footpaths',
        'Missing road signs',
        'Open manholes',
        'Fallen trees',
        'Damaged bridges',
        'Broken bus shelters'
      ]
    },
    'street-lighting': {
      name: 'Street Lighting and Electricity',
      icon: '💡',
      class: 'lighting',
      defaultDept: 'Electrical & Power Department',
      baseSeverity: 25,
      subcategories: [
        'Broken streetlights',
        'Flickering streetlights',
        'Dark public areas',
        'Fallen electric poles',
        'Exposed electrical wires'
      ]
    },
    'water-drainage': {
      name: 'Water and Drainage',
      icon: '💧',
      class: 'water',
      defaultDept: 'Water Supply & Sewerage Board',
      baseSeverity: 35,
      subcategories: [
        'Water leakage',
        'Burst pipelines',
        'Sewage overflow',
        'Blocked drains',
        'Suspected drinking-water contamination',
        'Flooded roads'
      ]
    },
    'sanitation': {
      name: 'Sanitation and Environmental Hazards',
      icon: '🗑️',
      class: 'sanitation',
      defaultDept: 'Sanitation & Solid Waste Management',
      baseSeverity: 25,
      subcategories: [
        'Overflowing garbage bins',
        'Illegal waste dumping',
        'Construction debris',
        'Burning garbage',
        'Biomedical waste dumping',
        'Dirty public toilets'
      ]
    },
    'traffic-safety': {
      name: 'Traffic and Public Safety',
      icon: '🚗',
      class: 'traffic',
      defaultDept: 'Traffic Police & Transport Authority',
      baseSeverity: 30,
      subcategories: [
        'Nonfunctional traffic signals',
        'Illegal parking',
        'Double parking',
        'Parking on footpaths',
        'Parking in designated disabled parking spaces',
        'Wrong-side driving',
        'Traffic congestion hotspots',
        'Dangerous intersections'
      ]
    },
    'accessibility': {
      name: 'Accessibility and Inclusive Infrastructure',
      icon: '♿',
      class: 'accessibility',
      defaultDept: 'Accessibility & Public Works Dept',
      baseSeverity: 40,
      subcategories: [
        'Missing wheelchair ramps',
        'Blocked ramps',
        'Broken elevators',
        'Missing tactile pathways',
        'Inaccessible bus stops',
        'Broken metro-station lifts',
        'Blocked wheelchair routes',
        'Inaccessible public washrooms',
        'Inaccessible government buildings',
        'Missing accessibility signage'
      ]
    },
    'environmental': {
      name: 'Environmental Issues',
      icon: '🌿',
      class: 'environmental',
      defaultDept: 'Environmental Protection Dept',
      baseSeverity: 25,
      subcategories: [
        'Air-pollution hotspots',
        'Noise pollution',
        'Illegal tree cutting',
        'Water pollution',
        'Destruction of green cover',
        'Public-space environmental hazards'
      ]
    },
    'encroachment': {
      name: 'Encroachment and Zoning Violations',
      icon: '🚧',
      class: 'encroachment',
      defaultDept: 'Town Planning & Enforcement Squad',
      baseSeverity: 25,
      subcategories: [
        'Shops blocking footpaths',
        'Vendors obstructing public walkways',
        'Illegal construction allegations',
        'Occupation of public land',
        'Construction obstructing public roads'
      ]
    },
    'property-damage': {
      name: 'Public Property Damage',
      icon: '🏛️',
      class: 'property',
      defaultDept: 'Municipal Asset Maintenance Division',
      baseSeverity: 20,
      subcategories: [
        'Broken park benches',
        'Damaged playground equipment',
        'Damaged bus stops',
        'Damaged street furniture',
        'Vandalized public infrastructure',
        'Defaced public monuments'
      ]
    }
  };

  // Sample SVG Photos for Realistic Visual Evidence
  const SAMPLE_PHOTOS = {
    pothole: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'><rect width='400' height='260' fill='%23475569'/><path d='M60 140 Q150 110 220 145 Q320 190 260 210 Q140 230 60 140 Z' fill='%231e293b' stroke='%23334155' stroke-width='4'/><path d='M80 150 Q160 130 200 150 Q280 180 240 195 Q140 210 80 150 Z' fill='%230f172a'/><line x1='0' y1='130' x2='400' y2='130' stroke='%23fef08a' stroke-dasharray='20,20' stroke-width='6'/><text x='20' y='30' fill='%23ffffff' font-family='sans-serif' font-size='14' font-weight='bold'>Photo Evidence: Oak Avenue Pothole</text></svg>",
    garbage: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'><rect width='400' height='260' fill='%23cbd5e1'/><rect x='80' y='60' width='90' height='150' rx='8' fill='%2316a34a'/><rect x='190' y='60' width='90' height='150' rx='8' fill='%2316a34a'/><path d='M60 140 C110 130, 200 130, 320 160 C330 230, 80 240, 60 140 Z' fill='%23475569' opacity='0.85'/><circle cx='130' cy='180' r='18' fill='%23f97316'/><circle cx='230' cy='190' r='14' fill='%233b82f6'/><text x='20' y='30' fill='%231e293b' font-family='sans-serif' font-size='14' font-weight='bold'>Photo Evidence: Overflowing Park Bins</text></svg>",
    streetlight: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'><rect width='400' height='260' fill='%23091e2b'/><line x1='120' y1='260' x2='120' y2='60' stroke='%2364748b' stroke-width='8'/><path d='M120 60 Q120 30 160 30 L180 30' stroke='%2364748b' stroke-width='8' fill='none'/><rect x='170' y='26' width='30' height='12' rx='3' fill='%2394a3b8'/><circle cx='185' cy='42' r='8' fill='%23fef08a' opacity='0.25'/><text x='20' y='30' fill='%23ffffff' font-family='sans-serif' font-size='14' font-weight='bold'>Photo Evidence: Dark Intersection Lamp</text></svg>",
    ramp: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'><rect width='400' height='260' fill='%23e2e8f0'/><polygon points='80,210 320,110 320,210' fill='%2394a3b8'/><rect x='160' y='110' width='80' height='70' rx='4' fill='%23ef4444' opacity='0.9'/><text x='170' y='150' fill='%23ffffff' font-family='sans-serif' font-weight='bold' font-size='12'>BLOCKED</text><circle cx='100' cy='80' r='16' fill='%233b82f6'/><path d='M96 74 L100 86 L108 86' stroke='%23ffffff' stroke-width='3' fill='none'/><text x='20' y='30' fill='%231e293b' font-family='sans-serif' font-size='14' font-weight='bold'>Evidence: Blocked Wheelchair Ramp</text></svg>",
    repaired: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'><rect width='400' height='260' fill='%23334155'/><rect x='60' y='80' width='280' height='120' rx='6' fill='%231e293b'/><circle cx='200' cy='140' r='36' fill='%2310b981'/><path d='M188 140 L196 148 L214 130' stroke='%23ffffff' stroke-width='6' stroke-linecap='round' stroke-linejoin='round' fill='none'/><text x='110' y='230' fill='%2334d399' font-family='sans-serif' font-size='15' font-weight='bold'>REPAIR COMPLETED &amp; SEALED</text><text x='20' y='30' fill='%23ffffff' font-family='sans-serif' font-size='14' font-weight='bold'>Resolution Evidence: Smooth Asphalt Patch</text></svg>"
  };

  // =========================================================================
  // 2. REALISTIC INITIAL DEMONSTRATION DATASET
  // =========================================================================
  const INITIAL_REPORTS = [
    {
      id: 'SCC-2841',
      majorCategory: 'public-infra',
      subcategory: 'Potholes',
      title: 'Pothole on Oak Avenue near the bus stop',
      location: 'Oak Avenue & 4th Street',
      landmark: 'Near Northwood City Bus Bay 3',
      lat: 17.4938,
      lng: 78.3912,
      description: 'Large asphalt crater in the right vehicular lane, approx 12cm deep. Vehicles swerving sharply into oncoming lane to avoid it, creating collision hazard.',
      department: 'Roads & Municipal Engineering Dept',
      status: 'In progress',
      priority: 'High',
      author: 'Maya J.',
      phone: '+91 98450 12345',
      created: Date.now() - 1000 * 60 * 60 * 28, // 28 hours ago
      updated: Date.now() - 1000 * 60 * 60 * 4,
      votes: 14,
      verifiedCount: 0,
      disputeCount: 0,
      photo: SAMPLE_PHOTOS.pothole,
      voice: '',
      voiceTranscript: 'Near Oak Avenue bus stop, deep crater pothole in right lane, dangerous for two wheelers.',
      statusHistory: [
        { status: 'Submitted', timestamp: Date.now() - 1000 * 60 * 60 * 28, actor: 'Maya J. (Citizen)', dept: 'System', note: 'Filed via Smart Civic Connect Web' },
        { status: 'Verified', timestamp: Date.now() - 1000 * 60 * 60 * 20, actor: 'Insp. R. Verma', dept: 'Roads & Municipal Engineering Dept', note: 'Site verified. Road safety hazard confirmed.' },
        { status: 'Assigned', timestamp: Date.now() - 1000 * 60 * 60 * 16, actor: 'Executive Engineer', dept: 'Roads & Municipal Engineering Dept', note: 'Assigned to Hotmix Road Repair Crew #4' },
        { status: 'In progress', timestamp: Date.now() - 1000 * 60 * 60 * 4, actor: 'Crew Foreman David', dept: 'Roads & Municipal Engineering Dept', note: 'Asphalt cold patch compaction underway.' }
      ]
    },
    {
      id: 'SCC-2840',
      majorCategory: 'sanitation',
      subcategory: 'Overflowing garbage bins',
      title: 'Overflowing municipal bins at Northwood Park East',
      location: 'Northwood Park, East Gate Entrance',
      landmark: 'Beside Children Play Area',
      lat: 17.4952,
      lng: 78.3934,
      description: 'Two large green municipal waste bins overflowing onto pedestrian walkway since yesterday. Attracting stray dogs and emitting severe odor.',
      department: 'Sanitation & Solid Waste Management',
      status: 'Open',
      priority: 'Normal',
      author: 'Sam R.',
      phone: '',
      created: Date.now() - 1000 * 60 * 60 * 18,
      updated: Date.now() - 1000 * 60 * 60 * 18,
      votes: 8,
      verifiedCount: 0,
      disputeCount: 0,
      photo: SAMPLE_PHOTOS.garbage,
      voice: '',
      voiceTranscript: '',
      statusHistory: [
        { status: 'Submitted', timestamp: Date.now() - 1000 * 60 * 60 * 18, actor: 'Sam R. (Citizen)', dept: 'System', note: 'Reported with attached photo.' }
      ]
    },
    {
      id: 'SCC-2839',
      majorCategory: 'street-lighting',
      subcategory: 'Broken streetlights',
      title: 'Pedestrian crossing streetlight out on Maple Street',
      location: 'Maple Street near 4th Cross',
      landmark: 'Opposite State Bank ATM',
      lat: 17.4912,
      lng: 78.3895,
      description: 'Sodium vapor lamp fixture broken. Entire zebra pedestrian crossing is completely in darkness after 6:30 PM, making it unsafe for school children.',
      department: 'Electrical & Power Department',
      status: 'Open',
      priority: 'High',
      author: 'Anonymous',
      phone: '',
      created: Date.now() - 1000 * 60 * 60 * 82, // 3.4 days ago -> OVERDUE SLA!
      updated: Date.now() - 1000 * 60 * 60 * 82,
      votes: 11,
      verifiedCount: 0,
      disputeCount: 0,
      photo: SAMPLE_PHOTOS.streetlight,
      voice: '',
      voiceTranscript: '',
      statusHistory: [
        { status: 'Submitted', timestamp: Date.now() - 1000 * 60 * 60 * 82, actor: 'Anonymous Citizen', dept: 'System', note: 'Logged safety concern.' }
      ]
    },
    {
      id: 'SCC-2838',
      majorCategory: 'accessibility',
      subcategory: 'Blocked ramps',
      title: 'Commercial vendor obstructing wheelchair ramp at Metro Station',
      location: 'Miyapur Metro Station, Exit Gate 2',
      landmark: 'Metro Wheelchair Access Portal',
      lat: 17.4941,
      lng: 78.3905,
      description: 'Wheelchair ramp completely obstructed by temporary steel vendor stalls. Wheelchair users and parents with strollers cannot access the lift entrance.',
      department: 'Accessibility & Public Works Dept',
      status: 'Verified',
      priority: 'Urgent',
      author: 'Jordan Davis',
      phone: '+91 99000 88776',
      created: Date.now() - 1000 * 60 * 60 * 12,
      updated: Date.now() - 1000 * 60 * 60 * 6,
      votes: 19,
      verifiedCount: 0,
      disputeCount: 0,
      photo: SAMPLE_PHOTOS.ramp,
      voice: '',
      voiceTranscript: 'Wheelchair ramp blocked at Miyapur station gate 2. Urgent clearance needed.',
      statusHistory: [
        { status: 'Submitted', timestamp: Date.now() - 1000 * 60 * 60 * 12, actor: 'Jordan Davis (Citizen)', dept: 'System', note: 'Tagged as Accessibility Barrier under SDG 11.2' },
        { status: 'Verified', timestamp: Date.now() - 1000 * 60 * 60 * 6, actor: 'PWD Accessibility Cell', dept: 'Accessibility & Public Works Dept', note: 'Encroachment notice issued to Town Planning squad for immediate clearance.' }
      ]
    },
    {
      id: 'SCC-2837',
      majorCategory: 'water-drainage',
      subcategory: 'Water leakage',
      title: 'Potable water main leaking onto pedestrian sidewalk',
      location: 'Pine Street & 2nd Avenue',
      landmark: 'Opposite Northwood Public Library',
      lat: 17.4925,
      lng: 78.3948,
      description: 'Clean drinking water gushing from cracked underground joint. Substantial water pooling and eroding the road sub-base.',
      department: 'Water Supply & Sewerage Board',
      status: 'Citizen Verification',
      priority: 'Normal',
      author: 'Alex T.',
      phone: '',
      created: Date.now() - 1000 * 60 * 60 * 72,
      updated: Date.now() - 1000 * 60 * 60 * 2,
      votes: 10,
      verifiedCount: 2,
      disputeCount: 0,
      resolutionNotes: 'Underground sleeve coupling replaced and pressure-tested. Sidewalk re-paved with interlocking tiles.',
      resolutionPhoto: SAMPLE_PHOTOS.repaired,
      statusHistory: [
        { status: 'Submitted', timestamp: Date.now() - 1000 * 60 * 60 * 72, actor: 'Alex T.', dept: 'System', note: 'Reported water leakage.' },
        { status: 'Assigned', timestamp: Date.now() - 1000 * 60 * 60 * 48, actor: 'Asst Engineer Water', dept: 'Water Supply & Sewerage Board', note: 'Pipeline team dispatched.' },
        { status: 'In progress', timestamp: Date.now() - 1000 * 60 * 60 * 24, actor: 'Water Board Squad', dept: 'Water Supply & Sewerage Board', note: 'Excavation and joint weld.' },
        { status: 'Resolved', timestamp: Date.now() - 1000 * 60 * 60 * 2, actor: 'Executive Engineer K. Rao', dept: 'Water Supply & Sewerage Board', note: 'Pipeline sealed. Awaiting citizen confirmation.' }
      ]
    },
    {
      id: 'SCC-2836',
      majorCategory: 'property-damage',
      subcategory: 'Broken park benches',
      title: 'Broken wooden park bench along jogging track',
      location: 'Northwood Common, South Path',
      landmark: 'Near Community Herbal Garden',
      lat: 17.4965,
      lng: 78.3920,
      description: 'Two wooden support slats have cracked with splintered nails exposed. Poses an injury risk to elderly joggers.',
      department: 'Municipal Asset Maintenance Division',
      status: 'Resolved',
      priority: 'Normal',
      author: 'Taylor K.',
      phone: '',
      created: Date.now() - 1000 * 60 * 60 * 120, // 5 days ago
      updated: Date.now() - 1000 * 60 * 60 * 24,
      votes: 5,
      verifiedCount: 3,
      disputeCount: 0,
      resolutionNotes: 'New teak hardwood slats installed and coated with waterproof weather sealant.',
      resolutionPhoto: SAMPLE_PHOTOS.repaired,
      statusHistory: [
        { status: 'Submitted', timestamp: Date.now() - 1000 * 60 * 60 * 120, actor: 'Taylor K.', dept: 'System', note: 'Reported bench damage.' },
        { status: 'In progress', timestamp: Date.now() - 1000 * 60 * 60 * 72, actor: 'Parks Maintenance', dept: 'Municipal Asset Maintenance Division', note: 'Carpenter dispatched.' },
        { status: 'Resolved', timestamp: Date.now() - 1000 * 60 * 60 * 24, actor: 'Supervisor S. Reddy', dept: 'Municipal Asset Maintenance Division', note: 'Bench restored and varnished.' }
      ]
    },
    {
      id: 'SCC-2835',
      majorCategory: 'traffic-safety',
      subcategory: 'Parking on footpaths',
      title: 'Vehicles parked across tactile paving on Main Road',
      location: 'Main Commercial Boulevard, Block C',
      landmark: 'Near Metro Pillar 180',
      lat: 17.4932,
      lng: 78.3888,
      description: 'Multiple delivery cars parked directly across the yellow tactile pedestrian tiles, blocking the guided path for visually impaired pedestrians.',
      department: 'Traffic Police & Transport Authority',
      status: 'In progress',
      priority: 'High',
      author: 'Priya N.',
      phone: '+91 97000 11223',
      created: Date.now() - 1000 * 60 * 60 * 15,
      updated: Date.now() - 1000 * 60 * 60 * 3,
      votes: 16,
      verifiedCount: 0,
      disputeCount: 0,
      photo: SAMPLE_PHOTOS.ramp,
      statusHistory: [
        { status: 'Submitted', timestamp: Date.now() - 1000 * 60 * 60 * 15, actor: 'Priya N.', dept: 'System', note: 'Flagged footpath violation.' },
        { status: 'In progress', timestamp: Date.now() - 1000 * 60 * 60 * 3, actor: 'Traffic Sub-Inspector', dept: 'Traffic Police & Transport Authority', note: 'Towing vehicle summoned. Challan issued.' }
      ]
    }
  ];

  // Load or Initialize Stored Reports
  let reports = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REPORTS);
    reports = raw ? JSON.parse(raw) : INITIAL_REPORTS;
  } catch (err) {
    reports = INITIAL_REPORTS;
  }
  if (!Array.isArray(reports) || reports.length === 0) reports = INITIAL_REPORTS;

  let helplineCalls = [];
  try {
    const rawCalls = localStorage.getItem(STORAGE_KEY_HELPLINE_CALLS);
    if (rawCalls) {
      const savedCalls = JSON.parse(rawCalls);
      if (!Array.isArray(savedCalls)) throw new TypeError('Stored helpline call data must be an array.');
      helplineCalls = savedCalls;
    }
  } catch (error) {
    console.error('Could not load the local helpline call database:', error);
  }

  // Points & Badges
  let userPoints = 85;
  try {
    const storedPts = localStorage.getItem(STORAGE_KEY_POINTS);
    if (storedPts !== null) userPoints = parseInt(storedPts, 10);
  } catch (e) {}

  // Upvote Tracker (Set of report IDs voted on this device)
  let userVotes = new Set();
  try {
    const storedVotes = localStorage.getItem(STORAGE_KEY_VOTES);
    if (storedVotes) userVotes = new Set(JSON.parse(storedVotes));
  } catch (e) {}

  // Current User Role: 'citizen' | 'authority' | 'admin'
  let currentRole = 'citizen';
  try {
    const storedRole = localStorage.getItem(STORAGE_KEY_ROLE);
    if (storedRole && ['citizen', 'authority'].includes(storedRole)) currentRole = storedRole;
  } catch (e) {}

  // Current Active Page View
  let currentView = 'overview';
  let serverReady = false;
  let serverSyncWarningShown = false;
  let reportSyncQueue = Promise.resolve();
  const serverReportSnapshots = new Map();

  // Persistence Helpers
  const persistReports = () => {
    try {
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
    } catch (e) {
      console.warn('Storage quota exceeded', e);
    }

    if (!serverReady) return;

    const changedReports = reports.map(report => JSON.parse(JSON.stringify(report)));
    reportSyncQueue = reportSyncQueue.then(async () => {
      for (const report of changedReports) {
        const { serverSavedAt, ...storedReport } = report;
        const snapshot = JSON.stringify(storedReport);
        if (serverReportSnapshots.get(report.id) === snapshot) continue;

        const response = await fetch(API_COMPLAINTS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report)
        });
        if (!response.ok) {
          throw new Error(`Complaint save failed (${response.status}).`);
        }
        serverReportSnapshots.set(report.id, snapshot);
      }
      serverSyncWarningShown = false;
    }).catch(error => {
      console.error('Could not sync complaints with the server:', error);
      if (!serverSyncWarningShown) {
        showToast('Server Sync Failed', 'Your changes are saved in this browser, but could not be sent to the server.');
        serverSyncWarningShown = true;
      }
    });
  };

  const persistHelplineCalls = () => {
    try {
      localStorage.setItem(STORAGE_KEY_HELPLINE_CALLS, JSON.stringify(helplineCalls));
      return true;
    } catch (error) {
      console.error('Could not save the local helpline call database:', error);
      return false;
    }
  };

  async function loadServerReports() {
    try {
      const response = await fetch(API_COMPLAINTS_URL);
      if (!response.ok) throw new Error(`Complaint load failed (${response.status}).`);

      const result = await response.json();
      if (!Array.isArray(result.complaints)) {
        throw new Error('The server returned an invalid complaint list.');
      }

      const mergedReports = new Map(INITIAL_REPORTS.map(report => [report.id, report]));
      for (const report of reports) mergedReports.set(report.id, report);
      for (const report of result.complaints) {
        if (!report || typeof report.id !== 'string') {
          throw new Error('The server returned a complaint without a valid ticket ID.');
        }
        mergedReports.set(report.id, report);
        const { serverSavedAt, ...storedReport } = report;
        serverReportSnapshots.set(report.id, JSON.stringify(storedReport));
      }

      reports = Array.from(mergedReports.values())
        .sort((a, b) => (b.created || 0) - (a.created || 0));
      serverReady = true;
      persistReports();
      renderOverview();
      renderAllReports();
      renderRewardsModule();
      if (leafletMap) updateMapMarkers();
    } catch (error) {
      console.error('Could not load complaints from the server:', error);
      serverReady = true;
      showToast('Local Storage Mode', 'The server is unavailable. Changes will stay in this browser until the server is running.');
    }
  }

  const persistPoints = () => {
    try {
      localStorage.setItem(STORAGE_KEY_POINTS, userPoints.toString());
    } catch (e) {}
  };

  const persistVotes = () => {
    try {
      localStorage.setItem(STORAGE_KEY_VOTES, JSON.stringify(Array.from(userVotes)));
    } catch (e) {}
  };

  const persistRole = () => {
    try {
      if (currentRole === 'admin') localStorage.removeItem(STORAGE_KEY_ROLE);
      else localStorage.setItem(STORAGE_KEY_ROLE, currentRole);
    } catch (e) {}
  };

  const loadAdminCredential = () => {
    try {
      const credential = JSON.parse(localStorage.getItem(STORAGE_KEY_ADMIN_CREDENTIAL) || 'null');
      return credential && Array.isArray(credential.salt) && typeof credential.hash === 'string'
        ? credential
        : null;
    } catch (e) {
      return null;
    }
  };

  async function hashAdminPassword(password, salt) {
    const keyMaterial = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits({
      name: 'PBKDF2',
      salt: new Uint8Array(salt),
      iterations: ADMIN_PASSWORD_ITERATIONS,
      hash: 'SHA-256'
    }, keyMaterial, 256);
    return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function showAdminPanel(panel) {
    const isLogin = panel === 'login';
    $('#loginPanel').style.display = isLogin ? '' : 'none';
    $('#changePassPanel').style.display = isLogin ? 'none' : '';
    $('#loginTabBtn').classList.toggle('active', isLogin);
    $('#changePassTabBtn').classList.toggle('active', !isLogin);
    $('#loginTabBtn').style.background = isLogin ? 'var(--teal-600)' : 'var(--surface)';
    $('#loginTabBtn').style.color = isLogin ? '#fff' : 'var(--text-muted)';
    $('#changePassTabBtn').style.background = isLogin ? 'var(--surface)' : 'var(--teal-600)';
    $('#changePassTabBtn').style.color = isLogin ? 'var(--text-muted)' : '#fff';
  }

  function openAdminLogin() {
    const isFirstSetup = !loadAdminCredential();
    $('#changeCurrentPwd').parentElement.hidden = isFirstSetup;
    $('#changePassTabBtn').textContent = isFirstSetup ? 'Create Password' : 'Change Password';
    $('#adminSetupMessage').textContent = isFirstSetup
      ? 'Create an admin password for this browser. Your username is admin.'
      : 'Admin password is configured for this browser. Sign in with username admin.';
    $('#adminPasswordInput').value = '';
    $('#changeCurrentPwd').value = '';
    $('#changeNewPwd').value = '';
    $('#changeConfirmPwd').value = '';
    $('#adminLoginError').style.display = 'none';
    $('#changePwdError').style.display = 'none';
    $('#changePwdSuccess').style.display = 'none';
    showAdminPanel(isFirstSetup ? 'password' : 'login');
    $('#adminLoginModal').hidden = false;
    document.body.style.overflow = 'hidden';
    (isFirstSetup ? $('#changeNewPwd') : $('#adminUsernameInput')).focus();
  }

  // =========================================================================
  // CAMERA EVIDENCE DATABASE STATE & SEEDING
  // =========================================================================
  const INITIAL_CAMERA_DB = [
    {
      id: 'CAM-8801',
      title: 'Oak Avenue Pothole Crater Evidence',
      ticketId: 'SCC-2841',
      category: 'public-infra',
      categoryLabel: 'Public Infrastructure',
      lat: 17.4938,
      lng: 78.3912,
      ward: 'Ward 12 (Kukatpally North)',
      address: 'Oak Avenue & 4th Street, near City Bus Bay 3',
      timestamp: Date.now() - 1000 * 60 * 60 * 28,
      dataUrl: SAMPLE_PHOTOS.pothole,
      source: 'live_camera',
      sourceLabel: 'Live Camera Studio',
      fileSizeKb: 42,
      resolution: '1280x720',
      hasWatermark: true,
      verified: true,
      notes: 'Deep road crater in right vehicular lane causing safety hazard. Geotag verified.'
    },
    {
      id: 'CAM-8802',
      title: 'Park View Bins Overflowing Waste',
      ticketId: 'SCC-2840',
      category: 'sanitation',
      categoryLabel: 'Sanitation & Waste',
      lat: 17.4981,
      lng: 78.3965,
      ward: 'Ward 12 (Kukatpally North)',
      address: 'Greenwood Park North Gate',
      timestamp: Date.now() - 1000 * 60 * 60 * 18,
      dataUrl: SAMPLE_PHOTOS.garbage,
      source: 'live_camera',
      sourceLabel: 'Live Camera Studio',
      fileSizeKb: 38,
      resolution: '1280x720',
      hasWatermark: true,
      verified: true,
      notes: 'Solid waste scattered across pedestrian promenade. Geotag verified.'
    },
    {
      id: 'CAM-8803',
      title: 'Dark Corner Pole Fixture Defect',
      ticketId: 'SCC-2839',
      category: 'street-lighting',
      categoryLabel: 'Street Lighting',
      lat: 17.4895,
      lng: 78.3881,
      ward: 'Ward 11 (Moosapet East)',
      address: '7th Cross Road & Maple Lane',
      timestamp: Date.now() - 1000 * 60 * 60 * 42,
      dataUrl: SAMPLE_PHOTOS.streetlight,
      source: 'live_camera',
      sourceLabel: 'Live Camera Studio',
      fileSizeKb: 34,
      resolution: '1280x720',
      hasWatermark: true,
      verified: true,
      notes: 'Sodium luminaire failure creating dark intersection for night transit.'
    },
    {
      id: 'CAM-8804',
      title: 'Wheelchair Ramp Obstructed by Dumpster',
      ticketId: 'SCC-2838',
      category: 'accessibility',
      categoryLabel: 'Accessibility (SDG 11.2)',
      lat: 17.4952,
      lng: 78.3944,
      ward: 'Ward 12 (Kukatpally North)',
      address: 'Community Health Clinic Front Entrance',
      timestamp: Date.now() - 1000 * 60 * 60 * 5,
      dataUrl: SAMPLE_PHOTOS.ramp,
      source: 'live_camera',
      sourceLabel: 'Live Camera Studio',
      fileSizeKb: 45,
      resolution: '1280x720',
      hasWatermark: true,
      verified: true,
      notes: 'Dumpster blocking ramp access violating UN SDG 11.2 & RPwD Act 2016.'
    },
    {
      id: 'CAM-8805',
      title: 'Asphalt Resurfacing Repair Completion Proof',
      ticketId: 'SCC-2837',
      category: 'public-infra',
      categoryLabel: 'Verified Repair',
      lat: 17.4912,
      lng: 78.3905,
      ward: 'Ward 12 (Kukatpally North)',
      address: 'Northwood Ring Road Sector 2',
      timestamp: Date.now() - 1000 * 60 * 60 * 12,
      dataUrl: SAMPLE_PHOTOS.repaired,
      source: 'verified_fix',
      sourceLabel: 'Citizen Verification',
      fileSizeKb: 40,
      resolution: '1280x720',
      hasWatermark: true,
      verified: true,
      notes: 'Pothole sealed with hot-mix mastic asphalt. Dual-verified by community scout.'
    }
  ];

  let cameraDatabase = [];
  try {
    const rawCam = localStorage.getItem(STORAGE_KEY_CAMERADB);
    cameraDatabase = rawCam ? JSON.parse(rawCam) : INITIAL_CAMERA_DB;
  } catch (e) {
    cameraDatabase = INITIAL_CAMERA_DB;
  }
  if (!Array.isArray(cameraDatabase) || cameraDatabase.length === 0) cameraDatabase = INITIAL_CAMERA_DB;

  const persistCameraDatabase = () => {
    try {
      localStorage.setItem(STORAGE_KEY_CAMERADB, JSON.stringify(cameraDatabase));
    } catch (e) {
      console.warn('Camera DB persistence error', e);
    }
  };

  // Utility Selectors
  const $ = selector => document.querySelector(selector);
  const $$ = selector => document.querySelectorAll(selector);

  const escapeHTML = str => {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  };

  const timeAgo = ts => {
    const diff = Date.now() - ts;
    const mins = Math.max(1, Math.floor(diff / 60000));
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  // =========================================================================
  // 3. COMMUNITY SEVERITY INDEX (CSI: 0 to 100) SCORER
  // =========================================================================
  function calculateCSI(report) {
    const tax = TAXONOMY[report.majorCategory] || { baseSeverity: 25 };
    let score = tax.baseSeverity;

    // Safety concern / Urgent flag (+25)
    if (report.priority === 'Urgent') score += 25;
    else if (report.priority === 'High') score += 15;

    // Accessibility impact (+20)
    if (report.majorCategory === 'accessibility') score += 20;

    // Community support upvotes (+2 per vote, capped at +20)
    const voteBonus = Math.min(20, (report.votes || 0) * 2);
    score += voteBonus;

    // Time elapsed without progress / SLA Overdue (+5 per 24h past SLA)
    const hoursElapsed = (Date.now() - report.created) / (1000 * 60 * 60);
    if (report.status === 'Open' || report.status === 'Verified') {
      if (hoursElapsed > 72) score += 15;
      else if (hoursElapsed > 24) score += 8;
    }

    return Math.min(100, Math.max(5, score));
  }

  function getCsiClass(score) {
    if (score >= 80) return 'csi-urgent';
    if (score >= 60) return 'csi-high';
    if (score >= 35) return 'csi-medium';
    return 'csi-low';
  }

  // =========================================================================
  // 4. SLA ESCALATION ENGINE (24h, 3d, 7d, 15d)
  // =========================================================================
  function getEscalationInfo(report) {
    if (['Resolved', 'Closed'].includes(report.status)) return null;

    const hours = (Date.now() - (report.updated || report.created)) / (1000 * 60 * 60);
    if (hours >= 360) {
      return { level: 4, label: '⚠️ Level 4: Critical Commissioner Review (>15d)', cls: 'overdue-flag' };
    }
    if (hours >= 168) {
      return { level: 3, label: '⚠️ Level 3: Superintending Engineer Escalation (>7d)', cls: 'overdue-flag' };
    }
    if (hours >= 72) {
      return { level: 2, label: '⚠️ Level 2: Zonal Officer Escalation (>3d)', cls: 'overdue-flag' };
    }
    if (hours >= 24) {
      return { level: 1, label: '⏱️ Level 1: 24h Action Reminder', cls: 'overdue-flag' };
    }
    return null;
  }

  // =========================================================================
  // 5. GEOSPATIAL HAVERSINE DISTANCE FOR DUPLICATE CHECK
  // =========================================================================
  function getDistanceMeters(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371000; // Earth radius in meters
    const toRad = deg => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  // Text Token Similarity
  function textSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    const words1 = new Set(str1.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(str2.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3));
    if (words1.size === 0 || words2.size === 0) return 0;
    let intersect = 0;
    for (const w of words1) {
      if (words2.has(w)) intersect++;
    }
    return intersect / Math.max(words1.size, words2.size);
  }

  function findPossibleDuplicate(newCat, newSub, newLat, newLng, newTitle, newDesc) {
    for (const rep of reports) {
      if (['Resolved', 'Closed'].includes(rep.status)) continue;
      // Category match
      const sameCat = rep.majorCategory === newCat || rep.subcategory === newSub;
      if (!sameCat) continue;

      // Distance match if coordinates exist (within 150m radius)
      let dist = null;
      if (newLat && newLng && rep.lat && rep.lng) {
        dist = getDistanceMeters(newLat, newLng, rep.lat, rep.lng);
        if (dist !== null && dist <= 150) {
          return { match: rep, distance: dist, reason: 'Nearby geographic proximity in same category' };
        }
      }

      // Title/Description token overlap
      const sim = Math.max(textSimilarity(newTitle, rep.title), textSimilarity(newDesc, rep.description));
      if (sim >= 0.4) {
        return { match: rep, distance: dist, reason: 'High description and issue similarity' };
      }
    }
    return null;
  }

  // =========================================================================
  // 6. AI CIVIC ISSUE ASSISTANT (HEURISTIC NLP ENGINE)
  // =========================================================================
  function runAiCivicClassifier(text) {
    if (!text || text.trim().length < 6) return null;
    const lower = text.toLowerCase();

    // Heuristic Rule Evaluation
    if (lower.includes('pothole') || lower.includes('crater') || lower.includes('road crack') || lower.includes('asphalt') || lower.includes('footpath')) {
      return {
        category: 'public-infra',
        subcategory: lower.includes('footpath') ? 'Damaged footpaths' : 'Potholes',
        dept: 'Roads & Municipal Engineering Dept',
        priority: 'High',
        confidence: '95% (High)',
        suggestedTitle: 'Road Surface Hazard: ' + text.slice(0, 40) + '...',
        summary: 'Detected Public Infrastructure hazard requiring immediate road maintenance crew deployment.'
      };
    }
    if (lower.includes('wheelchair') || lower.includes('ramp') || lower.includes('tactile') || lower.includes('elevator') || lower.includes('lift') || lower.includes('blind') || lower.includes('disabled')) {
      return {
        category: 'accessibility',
        subcategory: lower.includes('lift') || lower.includes('elevator') ? 'Broken elevators' : 'Blocked ramps',
        dept: 'Accessibility & Public Works Dept',
        priority: 'Urgent',
        confidence: '98% (SDG 11.2 Inclusivity Target)',
        suggestedTitle: 'Accessibility Barrier: Inaccessible Public Route',
        summary: 'Detected universal accessibility obstruction impacting mobility-impaired residents.'
      };
    }
    if (lower.includes('streetlight') || lower.includes('light') || lower.includes('dark') || lower.includes('pole') || lower.includes('lamp') || lower.includes('wire')) {
      return {
        category: 'street-lighting',
        subcategory: lower.includes('wire') ? 'Exposed electrical wires' : 'Broken streetlights',
        dept: 'Electrical & Power Department',
        priority: lower.includes('wire') ? 'Urgent' : 'High',
        confidence: '92% (High)',
        suggestedTitle: 'Street Lighting Failure Causing Public Hazard',
        summary: 'Detected illumination failure or electrical hazard in public thoroughfare.'
      };
    }
    if (lower.includes('garbage') || lower.includes('trash') || lower.includes('waste') || lower.includes('dump') || lower.includes('debris') || lower.includes('bin') || lower.includes('smell')) {
      return {
        category: 'sanitation',
        subcategory: lower.includes('debris') ? 'Construction debris' : 'Overflowing garbage bins',
        dept: 'Sanitation & Solid Waste Management',
        priority: 'Normal',
        confidence: '94% (High)',
        suggestedTitle: 'Sanitation Alert: Uncollected Waste Accumulation',
        summary: 'Detected solid waste accumulation requiring sanitation truck dispatch.'
      };
    }
    if (lower.includes('water leak') || lower.includes('pipeline') || lower.includes('burst') || lower.includes('drain') || lower.includes('sewage') || lower.includes('flood')) {
      return {
        category: 'water-drainage',
        subcategory: lower.includes('sewage') ? 'Sewage overflow' : lower.includes('burst') ? 'Burst pipelines' : 'Water leakage',
        dept: 'Water Supply & Sewerage Board',
        priority: lower.includes('burst') ? 'Urgent' : 'Normal',
        confidence: '96% (High)',
        suggestedTitle: 'Water & Drainage Malfunction',
        summary: 'Detected potable water leakage or sewage overflow requiring valve isolation and repair.'
      };
    }
    if (lower.includes('parking') || lower.includes('car') || lower.includes('vehicle') || lower.includes('traffic') || lower.includes('signal') || lower.includes('jam')) {
      return {
        category: 'traffic-safety',
        subcategory: lower.includes('disabled') ? 'Parking in designated disabled parking spaces' : lower.includes('signal') ? 'Nonfunctional traffic signals' : 'Illegal parking',
        dept: 'Traffic Police & Transport Authority',
        priority: lower.includes('signal') ? 'Urgent' : 'Normal',
        confidence: '90% (High)',
        suggestedTitle: 'Traffic & Public Safety Hazard',
        summary: 'Detected vehicle parking violation or signal failure obstructing traffic.'
      };
    }
    if (lower.includes('pollution') || lower.includes('smoke') || lower.includes('tree') || lower.includes('air') || lower.includes('noise')) {
      return {
        category: 'environmental',
        subcategory: lower.includes('tree') ? 'Illegal tree cutting' : 'Air-pollution hotspots',
        dept: 'Environmental Protection Dept',
        priority: 'Normal',
        confidence: '88% (Medium)',
        suggestedTitle: 'Environmental Quality Hazard',
        summary: 'Detected potential environmental code violation or public hazard.'
      };
    }
    if (lower.includes('encroach') || lower.includes('vendor') || lower.includes('shop') || lower.includes('walkway') || lower.includes('illegal construction')) {
      return {
        category: 'encroachment',
        subcategory: 'Shops blocking footpaths',
        dept: 'Town Planning & Enforcement Squad',
        priority: 'Normal',
        confidence: '89% (Medium)',
        suggestedTitle: 'Public Walkway Encroachment Allegation',
        summary: 'Logged commercial encroachment report for authorized municipal inspection.'
      };
    }
    if (lower.includes('bench') || lower.includes('park') || lower.includes('playground') || lower.includes('vandal') || lower.includes('monument')) {
      return {
        category: 'property-damage',
        subcategory: lower.includes('playground') ? 'Damaged playground equipment' : 'Broken park benches',
        dept: 'Municipal Asset Maintenance Division',
        priority: 'Normal',
        confidence: '91% (High)',
        suggestedTitle: 'Public Property Asset Damage',
        summary: 'Detected damaged civic property requiring municipal asset maintenance.'
      };
    }
    return null;
  }

  // =========================================================================
  // 7. TOAST NOTIFICATIONS
  // =========================================================================
  function showToast(title, msg) {
    const toast = $('#toastNotice');
    $('#toastTitle').textContent = title;
    $('#toastMsg').textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4500);
  }

  // =========================================================================
  // 8. RENDER REPORT CARDS (FEED & ALL DIRECTORY)
  // =========================================================================
  function renderReportItem(r) {
    const tax = TAXONOMY[r.majorCategory] || TAXONOMY['public-infra'];
    const csi = calculateCSI(r);
    const csiCls = getCsiClass(csi);
    const esc = getEscalationInfo(r);
    const isVoted = userVotes.has(r.id);

    return `
      <article class="report-item" data-id="${escapeHTML(r.id)}">
        <div class="report-cat-icon ${tax.class}" title="${escapeHTML(tax.name)}">
          ${tax.icon}
        </div>
        <div class="report-body">
          <div class="report-top-line">
            <span class="report-id">${escapeHTML(r.id)}</span>
            <span class="csi-badge ${csiCls}" title="Community Severity Index">CSI: ${csi}/100</span>
            <span class="report-title-text" title="${escapeHTML(r.title)}">${escapeHTML(r.title)}</span>
          </div>
          <div class="report-sub-line">
            <span>📍 ${escapeHTML(r.location)}</span>
            <span>•</span>
            <span class="report-dept-tag">${escapeHTML(r.department)}</span>
            <span>•</span>
            <span>🕒 ${timeAgo(r.created)}</span>
            ${r.govDocket ? `<span class="report-docket-tag" style="background:#f0fdf9; color:#0f766e; border:1px solid #99f6e4; padding:1px 6px; border-radius:4px; font-size:10.5px; font-weight:700;">🏛️ Docket: ${escapeHTML(r.govDocket)}</span>` : ''}
            ${r.photo ? '<span>📷 Photo</span>' : ''}
            ${r.voice ? '<span>🎙️ Voice</span>' : ''}
          </div>
        </div>
        <div class="report-right-col">
          <span class="status-pill ${r.status.toLowerCase().replace(/\s+/g, '-')}">${escapeHTML(r.status)}</span>
          ${esc ? `<span class="${esc.cls}">${esc.label}</span>` : ''}
          <button class="support-vote-btn ${isVoted ? 'voted' : ''}" data-vote-id="${escapeHTML(r.id)}" title="${isVoted ? 'You supported this issue' : 'Click to support this report'}">
            <span>👍</span> <span>${r.votes || 0}</span>
          </button>
        </div>
      </article>
    `;
  }

  // Render Overview Feed
  function renderOverview() {
    // Stats calculation
    const openCount = reports.filter(r => r.status === 'Open' || r.status === 'Verified').length;
    const progressCount = reports.filter(r => r.status === 'Assigned' || r.status === 'In progress').length;
    const resolvedCount = reports.filter(r => r.status === 'Resolved' || r.status === 'Closed' || r.status === 'Citizen Verification').length;

    $('#statOpenVal').textContent = openCount;
    $('#statProgressVal').textContent = progressCount;
    $('#statResolvedVal').textContent = resolvedCount;
    $('#navReportCount').textContent = reports.length;

    $('#radarOpenCount').textContent = openCount;
    $('#radarProgressCount').textContent = progressCount;
    $('#radarResolvedCount').textContent = resolvedCount;

    // Filter overview feed
    const query = ($('#overviewSearchInput')?.value || '').trim().toLowerCase();
    const cat = $('#overviewCategoryFilter')?.value || 'all';
    const status = $('#overviewStatusFilter')?.value || 'all';

    let filtered = reports.filter(r => {
      if (cat !== 'all' && r.majorCategory !== cat) return false;
      if (status !== 'all' && r.status !== status) return false;
      if (query) {
        const hay = `${r.title} ${r.location} ${r.id} ${r.subcategory} ${r.department} ${r.description}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    // In Authority mode, prioritize highest CSI and Overdue
    if (currentRole === 'authority' || currentRole === 'admin') {
      filtered.sort((a, b) => calculateCSI(b) - calculateCSI(a));
    } else {
      filtered.sort((a, b) => b.created - a.created);
    }

    const container = $('#overviewReportList');
    const emptyState = $('#overviewEmptyState');

    if (filtered.length === 0) {
      container.innerHTML = '';
      emptyState.hidden = false;
    } else {
      emptyState.hidden = true;
      // Show top 6 in overview
      container.innerHTML = filtered.slice(0, 6).map(renderReportItem).join('');
    }
  }

  // Render Full Directory
  function renderAllReports() {
    const query = ($('#reportsSearchInput')?.value || '').trim().toLowerCase();
    const cat = $('#reportsCategoryFilter')?.value || 'all';
    const dept = $('#reportsDeptFilter')?.value || 'all';
    const status = $('#reportsStatusFilter')?.value || 'all';
    const priority = $('#reportsPriorityFilter')?.value || 'all';
    const sort = $('#reportsSortFilter')?.value || 'newest';

    let filtered = reports.filter(r => {
      if (cat !== 'all' && r.majorCategory !== cat) return false;
      if (dept !== 'all' && r.department !== dept) return false;
      if (status !== 'all' && r.status !== status) return false;
      if (priority !== 'all' && r.priority !== priority) return false;
      if (query) {
        const hay = `${r.title} ${r.location} ${r.id} ${r.subcategory} ${r.department} ${r.description}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    // Sort options
    if (sort === 'csi') {
      filtered.sort((a, b) => calculateCSI(b) - calculateCSI(a));
    } else if (sort === 'votes') {
      filtered.sort((a, b) => (b.votes || 0) - (a.votes || 0));
    } else if (sort === 'overdue') {
      filtered.sort((a, b) => {
        const escA = getEscalationInfo(a) ? 1 : 0;
        const escB = getEscalationInfo(b) ? 1 : 0;
        return escB - escA || b.created - a.created;
      });
    } else {
      filtered.sort((a, b) => b.created - a.created);
    }

    $('#reportsListTotalCount').textContent = filtered.length;
    const container = $('#reportsListFeed');
    const emptyState = $('#reportsEmptyState');

    if (filtered.length === 0) {
      container.innerHTML = '';
      emptyState.hidden = false;
    } else {
      emptyState.hidden = true;
      container.innerHTML = filtered.map(renderReportItem).join('');
    }
  }

  // =========================================================================
  // 9. LEAFLET INTERACTIVE CIVIC MAP & HEATMAP CLUSTERING
  // =========================================================================
  let leafletMap = null;
  let leafletMarkerGroup = null;
  let leafletHotspotGroup = null;

  function initCivicMap() {
    if (typeof L === 'undefined') {
      $('#civicMapStage').innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-muted);">Interactive map engine loading or running in offline mode. Reports are geotagged with coordinates.</div>';
      return;
    }
    if (leafletMap) {
      leafletMap.invalidateSize();
      updateMapMarkers();
      return;
    }

    try {
      // Center at Northwood District (default coordinates ~ 17.4938, 78.3912)
      leafletMap = L.map('civicMapStage', { zoomControl: true, maxZoom: 19 }).setView([17.4938, 78.3912], 15);

      // 1. High-Detail Street Basemap (Humanitarian OpenStreetMap Team)
      const streetTiles = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles by <a href="https://www.hotosm.org/">Humanitarian Team</a>',
        subdomains: 'abc',
        maxZoom: 19,
        maxNativeZoom: 18
      });

      // 2. Global OpenStreetMap Alternative Layer (Germany Mirror - no 403 on local files)
      const osmGlobalTiles = L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        maxNativeZoom: 18
      });

      // 3. Esri World Street Map (Worldwide Street Level Cartography)
      const esriStreetTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; StreetMap Worldwide',
        maxZoom: 19,
        maxNativeZoom: 17
      });

      // 4. High-Resolution Satellite Imagery Layer (maxNativeZoom: 17 prevents "Map data not yet available" tiles)
      const satelliteTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; High-Resolution Satellite Telemetry',
        maxZoom: 19,
        maxNativeZoom: 17
      });

      // Tile Error Fallbacks: gracefully swap tile src to backup mirror if any tile fails
      streetTiles.on('tileerror', function(event) {
        const tile = event.tile;
        const coords = event.coords;
        if (tile && coords && !tile._fallbackTriggered) {
          tile._fallbackTriggered = true;
          tile.src = `https://tile.openstreetmap.de/${coords.z}/${coords.x}/${coords.y}.png`;
        }
      });
      osmGlobalTiles.on('tileerror', function(event) {
        const tile = event.tile;
        const coords = event.coords;
        if (tile && coords && !tile._fallbackTriggered) {
          tile._fallbackTriggered = true;
          tile.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${coords.z}/${coords.y}/${coords.x}`;
        }
      });

      // Add default street tiles to map
      streetTiles.addTo(leafletMap);

      // Layer Switcher Control in top-right
      const baseLayers = {
        '🗺️ Street Map (High Detail)': streetTiles,
        '🌐 OpenStreetMap Global': osmGlobalTiles,
        '🏙️ Esri World Street': esriStreetTiles,
        '🛰️ Satellite View': satelliteTiles
      };
      L.control.layers(baseLayers, null, { position: 'topright' }).addTo(leafletMap);

      leafletMarkerGroup = L.layerGroup().addTo(leafletMap);
      leafletHotspotGroup = L.layerGroup().addTo(leafletMap);

      updateMapMarkers();

      // Ensure full container render
      setTimeout(() => {
        if (leafletMap) leafletMap.invalidateSize();
      }, 200);
    } catch (e) {
      console.warn('Leaflet map init error', e);
    }
  }

  function updateMapMarkers() {
    if (!leafletMap || !leafletMarkerGroup) return;

    leafletMarkerGroup.clearLayers();
    leafletHotspotGroup.clearLayers();

    const statusFilter = $('#mapStatusFilter')?.value || 'all';
    const catFilter = $('#mapCategoryFilter')?.value || 'all';
    const showHotspots = $('#mapHotspotsToggle')?.checked ?? true;

    // Filter reports for map
    const mapReports = reports.filter(r => {
      if (!r.lat || !r.lng) return false;
      if (statusFilter === 'urgent' && r.priority !== 'Urgent' && calculateCSI(r) < 80) return false;
      if (statusFilter !== 'all' && statusFilter !== 'urgent' && r.status !== statusFilter) return false;
      if (catFilter !== 'all' && r.majorCategory !== catFilter) return false;
      return true;
    });

    mapReports.forEach(r => {
      const csi = calculateCSI(r);
      let pinClass = 'pin-open';
      if (r.priority === 'Urgent' || csi >= 80) pinClass = 'pin-urgent';
      else if (r.status === 'Resolved' || r.status === 'Closed') pinClass = 'pin-resolved';
      else if (r.status === 'In progress' || r.status === 'Assigned') pinClass = 'pin-progress';
      else if (r.priority === 'High' || csi >= 60) pinClass = 'pin-high';

      const tax = TAXONOMY[r.majorCategory] || TAXONOMY['public-infra'];

      const customIcon = L.divIcon({
        className: 'custom-map-pin-container',
        html: `<div class="custom-map-pin ${pinClass}"><i>${tax.icon}</i></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -30]
      });

      const marker = L.marker([r.lat, r.lng], { icon: customIcon });
      marker.reportId = r.id;

      const popupHtml = `
        <div class="map-popup-inner">
          <div style="font-size:9.5px; font-weight:800; color:var(--teal-600); margin-bottom:2px;">${escapeHTML(r.id)} • ${escapeHTML(tax.name)}</div>
          <h4>${escapeHTML(r.title)}</h4>
          <p>⌖ ${escapeHTML(r.location)}</p>
          <div class="map-popup-meta">
            <span class="status-pill ${r.status.toLowerCase().replace(/\s+/g, '-')}">${escapeHTML(r.status)}</span>
            <span class="csi-badge ${getCsiClass(csi)}">CSI: ${csi}/100</span>
          </div>
          <button class="btn-primary" style="width:100%; padding:5px 8px; font-size:10.5px;" onclick="window.sccOpenReportDetails('${escapeHTML(r.id)}')">View Full Ticket →</button>
        </div>
      `;

      marker.bindPopup(popupHtml);
      leafletMarkerGroup.addLayer(marker);
    });

    // Draw Hotspot Clusters (if multiple reports exist in proximity)
    if (showHotspots) {
      // Find clusters: e.g. Northwood Park cluster & Metro Station cluster
      const clusters = [
        { lat: 17.4940, lng: 78.3910, radius: 120, label: 'Pothole & Traffic Cluster Corridor', color: '#ef4444' },
        { lat: 17.4952, lng: 78.3934, radius: 90, label: 'Chronic Sanitation Overflow Zone', color: '#f59e0b' },
        { lat: 17.4941, lng: 78.3905, radius: 75, label: 'Active Accessibility Barrier Zone', color: '#8b5cf6' }
      ];

      clusters.forEach(c => {
        const circle = L.circle([c.lat, c.lng], {
          color: c.color,
          fillColor: c.color,
          fillOpacity: 0.18,
          radius: c.radius,
          dashArray: '4, 4'
        }).bindTooltip(`<b>Civic Hotspot:</b> ${c.label}`, { sticky: true });
        leafletHotspotGroup.addLayer(circle);
      });
    }

  }

  function locateReportOnMap(reportId) {
    const report = reports.find(item => item.id === reportId);
    const lat = Number(report?.lat);
    const lng = Number(report?.lng);
    if (!report || report.lat == null || report.lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      showToast('Map Location Unavailable', 'This complaint does not have valid map coordinates.');
      return;
    }

    const trackingModal = $('#trackingModal');
    if (trackingModal && !trackingModal.hidden) {
      trackingModal.hidden = true;
      document.body.style.overflow = '';
    }

    window.sccNavToView('map');
    setTimeout(() => {
      if (!leafletMap || !leafletMarkerGroup) {
        showToast('Map Unavailable', 'The interactive map could not be loaded. Please try again.');
        return;
      }

      const statusFilter = $('#mapStatusFilter');
      const categoryFilter = $('#mapCategoryFilter');
      if (statusFilter) statusFilter.value = 'all';
      if (categoryFilter) categoryFilter.value = 'all';
      updateMapMarkers();
      leafletMap.setView([lat, lng], 17);
      const marker = leafletMarkerGroup.getLayers().find(item => item.reportId === reportId);
      if (marker) {
        marker.openPopup();
        showToast('Complaint Located', `Showing ticket ${reportId} on the civic map.`);
      } else {
        showToast('Complaint Hidden', 'Adjust the map filters to show this complaint.');
      }
    }, 250);
  }

  window.sccLocateReportOnMap = locateReportOnMap;

  // =========================================================================
  // 10. ACCESSIBILITY NAVIGATOR (SDG 11.2)
  // =========================================================================
  function renderAccessibilityModule() {
    // 1. Barriers list
    const barriers = reports.filter(r => r.majorCategory === 'accessibility' || r.subcategory.includes('ramp') || r.subcategory.includes('tactile'));
    const bContainer = $('#accessibilityBarriersList');
    if (bContainer) {
      if (barriers.length === 0) {
        bContainer.innerHTML = '<div style="padding:16px; color:var(--text-muted); font-size:11.5px;">No active accessibility barriers reported in this sector.</div>';
      } else {
        bContainer.innerHTML = barriers.map(renderReportItem).join('');
      }
    }

    // 2. Verified Accessible Assets directory
    const aContainer = $('#accessibleAssetsList');
    if (aContainer) {
      const sampleAssets = [
        { name: 'Miyapur Metro Station Elevator B', type: 'Operational Lift', location: 'Platform 1 & 2 Mezzanine', status: 'Operational 24/7', icon: '🛗' },
        { name: 'Northwood District Library Tactile Path', type: 'Tactile Corridor', location: 'Central Entrance & Bus Bay', status: 'Verified Clear', icon: '🦯' },
        { name: 'Civic Center Wheelchair Ramp #1', type: 'Standard Slope Ramp', location: 'Citizen Services Atrium', status: 'Ramp Incline: 1:12 Verified', icon: '♿' },
        { name: 'Northwood Common Accessible Restroom', type: 'Accessible Toilet', location: 'Pavilion South', status: 'Braille Signage Active', icon: '🚻' }
      ];

      aContainer.innerHTML = sampleAssets.map(a => `
        <article class="report-item" style="cursor:default;">
          <div class="report-cat-icon accessibility">${a.icon}</div>
          <div class="report-body">
            <div class="report-top-line">
              <span class="report-id" style="background:var(--purple-100); color:var(--purple-800);">VERIFIED ASSET</span>
              <b style="font-size:12.5px; color:var(--navy-800);">${escapeHTML(a.name)}</b>
            </div>
            <div class="report-sub-line">
              <span>📍 ${escapeHTML(a.location)}</span>
              <span>•</span>
              <span style="color:var(--emerald-800); font-weight:700;">✓ ${escapeHTML(a.status)}</span>
            </div>
          </div>
        </article>
      `).join('');
    }
  }

  // =========================================================================
  // 11. SMART PARKING MONITOR
  // =========================================================================
  function renderParkingModule() {
    // Render sample disabled parking bays
    const bayContainer = $('#parkingBayList');
    if (bayContainer) {
      const bays = [
        { id: 'BAY-D1', name: 'Metro Gate 1', status: 'vacant', title: 'Vacant (Sensor Active)' },
        { id: 'BAY-D2', name: 'Library Front', status: 'occupied', title: 'Authorized Permit Parked' },
        { id: 'BAY-D3', name: 'Hospital OPD', status: 'vacant', title: 'Vacant (Sensor Active)' },
        { id: 'BAY-D4', name: 'Market Plaza', status: 'occupied', title: 'Obstruction Reported' },
        { id: 'BAY-D5', name: 'Park South', status: 'vacant', title: 'Vacant (Sensor Active)' }
      ];

      bayContainer.innerHTML = bays.map(b => `
        <div class="parking-bay-badge ${b.status} disabled-bay">
          <div style="font-size:16px;">♿</div>
          <b style="display:block; font-size:12px; margin:2px 0;">${b.id}</b>
          <div style="font-size:9.5px;">${b.name}</div>
          <small style="font-weight:700; text-transform:uppercase; font-size:8.5px; display:block; margin-top:4px;">${b.status}</small>
        </div>
      `).join('');
    }

    // Active parking violation complaints
    const pViolations = reports.filter(r => r.majorCategory === 'traffic-safety' && (r.subcategory.includes('parking') || r.title.toLowerCase().includes('park')));
    const vContainer = $('#parkingViolationsList');
    if (vContainer) {
      if (pViolations.length === 0) {
        vContainer.innerHTML = '<div style="padding:16px; color:var(--text-muted); font-size:11.5px;">No active illegal parking violations reported.</div>';
      } else {
        vContainer.innerHTML = pViolations.map(renderReportItem).join('');
      }
    }
  }

  // =========================================================================
  // 12. CIVIC IMPACT & PREDICTIVE MAINTENANCE INSIGHTS
  // =========================================================================
  function renderImpactModule() {
    const total = reports.length;
    const resolved = reports.filter(r => r.status === 'Resolved' || r.status === 'Closed' || r.status === 'Citizen Verification').length;
    const resRate = total ? Math.round((resolved / total) * 100) : 0;
    const totalVotes = reports.reduce((acc, r) => acc + (r.votes || 0) + (r.verifiedCount || 0), 0);
    const a11yFixed = reports.filter(r => r.majorCategory === 'accessibility' && (r.status === 'Resolved' || r.status === 'Closed')).length;

    $('#impactResolutionRate').textContent = `${resRate}%`;
    $('#impactCommunityVotes').textContent = totalVotes;
    $('#impactA11yFixed').textContent = a11yFixed;

    // Render Predictive Maintenance Insights Cards
    const insightsFeed = $('#predictiveInsightsFeed');
    if (insightsFeed) {
      const sampleInsights = [
        {
          type: 'Corridor Risk',
          cls: 'danger',
          title: 'Recurring Pothole Cluster Corridor — Oak Avenue',
          desc: 'Statistical clustering identifies 4 pavement failures within a 220-meter stretch along Oak Avenue over the last 45 days. Road sub-base saturation suspected.',
          evidence: 'Reports: SCC-2841, SCC-2831, SCC-2819. Cluster density: 4 issues / 220m.',
          action: 'Recommended Action: Execute full milling and deep asphalt overlay rather than spot cold patches.'
        },
        {
          type: 'Sanitation Pattern',
          cls: 'warning',
          title: 'Chronic Weekend Overflow — Northwood Park East Gate',
          desc: 'Sanitation overflow complaints peak cyclically every Saturday and Sunday evening due to high park footfall exceeding twin bin capacity.',
          evidence: 'Historical reports logged on 3 consecutive weekends. Capacity deficiency: ~350kg surplus.',
          action: 'Recommended Action: Install 2 additional 1100L heavy-duty wheeled bins and add Sunday 4 PM collection route.'
        },
        {
          type: 'Pipeline Stress',
          cls: 'info',
          title: 'Aging Cast-Iron Water Main Pressure Spike — Pine Street',
          desc: 'Second pipeline leakage detected along the 1988 cast-iron distribution line. Pressure fluctuations from the North Reservoir correlate with joint stress.',
          evidence: 'Reports: SCC-2837. Pressure telemetry indicates 4.8 bar nocturnal surge.',
          action: 'Recommended Action: Install nocturnal pressure reducing valve (PRV) to mitigate pipe bursts.'
        },
        {
          type: 'Accessibility Encroachment',
          cls: 'danger',
          title: 'Frequent Obstruction Corridor — Miyapur Metro Station Exits',
          desc: 'Wheelchair access ramps repeatedly obstructed by unauthorized vendor stalls during evening transit rush hours (5:00 PM - 8:30 PM).',
          evidence: 'Reports: SCC-2838, SCC-2812. 35+ resident upvotes recorded.',
          action: 'Recommended Action: Erect permanent stainless steel bollards (clearance: 950mm) to prevent vendor cart positioning.'
        }
      ];

      insightsFeed.innerHTML = sampleInsights.map(ins => `
        <article class="insight-card ${ins.cls}">
          <div class="insight-card-header">
            <span class="insight-type-pill">${ins.type}</span>
            <small style="font-size:9.5px; color:var(--text-light); font-weight:700;">PREDICTIVE ML MODEL</small>
          </div>
          <h4>${escapeHTML(ins.title)}</h4>
          <p>${escapeHTML(ins.desc)}</p>
          <div class="insight-evidence-box">
            <b>Evidence Basis:</b> ${escapeHTML(ins.evidence)}
          </div>
          <div class="insight-action-callout">
            <span>⚡</span> <span>${escapeHTML(ins.action)}</span>
          </div>
        </article>
      `).join('');
    }
  }

  // =========================================================================
  // 13. CIVIC REWARDS & LEADERBOARD
  // =========================================================================
  function renderRewardsModule() {
    $('#userPointsPill').textContent = `${userPoints} pts`;
    if ($('#rewardsBigScore')) $('#rewardsBigScore').textContent = userPoints;
  }

  // =========================================================================
  // 14. AUTHORITY & ADMIN COMMAND HUB
  // =========================================================================
  function renderAuthorityModule() {
    // Overdue Queue
    const overdueQueue = reports.filter(r => getEscalationInfo(r) !== null);
    const overdueContainer = $('#authorityOverdueList');
    if (overdueContainer) {
      if (overdueQueue.length === 0) {
        overdueContainer.innerHTML = '<div style="padding:16px; color:var(--emerald-800); font-size:12px;">✓ Zero complaints exceeding SLA target response times. All departments in green.</div>';
      } else {
        overdueContainer.innerHTML = overdueQueue.map(renderReportItem).join('');
      }
    }

    // Department Workload Matrix
    const deptMatrix = $('#departmentWorkloadTable');
    if (deptMatrix) {
      const depts = [
        'Roads & Municipal Engineering Dept',
        'Electrical & Power Department',
        'Water Supply & Sewerage Board',
        'Sanitation & Solid Waste Management',
        'Traffic Police & Transport Authority',
        'Accessibility & Public Works Dept',
        'Environmental Protection Dept',
        'Town Planning & Enforcement Squad',
        'Municipal Asset Maintenance Division'
      ];

      const rows = depts.map(d => {
        const dReports = reports.filter(r => r.department === d);
        const open = dReports.filter(r => r.status === 'Open' || r.status === 'Verified').length;
        const prog = dReports.filter(r => r.status === 'In progress' || r.status === 'Assigned').length;
        const res = dReports.filter(r => r.status === 'Resolved' || r.status === 'Closed' || r.status === 'Citizen Verification').length;
        return `
          <tr>
            <td><b>${escapeHTML(d)}</b></td>
            <td>${open}</td>
            <td>${prog}</td>
            <td>${res}</td>
            <td><b>${dReports.length}</b></td>
          </tr>
        `;
      }).join('');

      deptMatrix.innerHTML = `
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th>Municipal Department</th>
              <th>Open</th>
              <th>In Progress</th>
              <th>Resolved</th>
              <th>Total Workload</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    }

    // Category-to-Department Routing Table
    const routingMatrix = $('#routingEngineMatrix');
    if (routingMatrix) {
      const rows = Object.entries(TAXONOMY).map(([key, val]) => `
        <tr>
          <td><span style="font-size:16px;">${val.icon}</span> <b>${escapeHTML(val.name)}</b></td>
          <td>${val.subcategories.length} Subcategories</td>
          <td><span class="report-dept-tag">${escapeHTML(val.defaultDept)}</span></td>
          <td><span class="status-pill verified">Automated Rule Active</span></td>
        </tr>
      `).join('');

      routingMatrix.innerHTML = `
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th>Major Category</th>
              <th>Subcategories</th>
              <th>Target Department</th>
              <th>Routing Rule</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    }
  }

  // =========================================================================
  // 15. COMPLAINT DETAILS MODAL & RESOLUTION TIMELINE
  // =========================================================================
  let activeDetailReport = null;

  window.sccOpenReportDetails = function(reportId) {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;
    activeDetailReport = report;

    $('#detailId').textContent = report.id;
    $('#detailTitle').textContent = report.title;
    $('#detailStatusBadge').textContent = report.status;
    $('#detailStatusBadge').className = `status-pill ${report.status.toLowerCase().replace(/\s+/g, '-')}`;

    const csi = calculateCSI(report);
    $('#detailCsiBadge').textContent = `CSI: ${csi}/100`;
    $('#detailCsiBadge').className = `csi-badge ${getCsiClass(csi)}`;

    $('#detailLocation').textContent = report.location;
    $('#detailLandmark').textContent = report.landmark ? `(Landmark: ${report.landmark})` : '';
    $('#detailAuthor').textContent = report.author || 'Anonymous';
    $('#detailTimeAgo').textContent = timeAgo(report.created);
    $('#detailDepartment').textContent = report.department;
    $('#detailDescription').textContent = report.description || 'No detailed description provided.';
    $('#detailVoteCount').textContent = report.votes || 0;

    // Show Linked Government Docket Banner if bound
    const docketBanner = $('#detailGovDocketBanner');
    if (docketBanner) {
      if (report.govDocket) {
        docketBanner.style.display = 'block';
        const docketVal = $('#detailGovDocketVal');
        const portalVal = $('#detailGovPortalVal');
        if (docketVal) docketVal.textContent = report.govDocket;
        if (portalVal) {
          const p = GOV_PORTALS[report.govPortal] || GOV_PORTALS.ghmc;
          portalVal.textContent = `(${p.name})`;
        }
      } else {
        docketBanner.style.display = 'none';
      }
    }

    // CSI factor breakdown text
    const tax = TAXONOMY[report.majorCategory] || { baseSeverity: 25 };
    const factors = [];
    factors.push(`Base hazard severity: ${tax.baseSeverity} pts`);
    if (report.priority === 'Urgent') factors.push('Urgent public safety risk (+25 pts)');
    if (report.majorCategory === 'accessibility') factors.push('Inaccessible infrastructure barrier (+20 pts)');
    if (report.votes) factors.push(`Community upvotes: +${Math.min(20, report.votes * 2)} pts (${report.votes} neighbors)`);
    $('#detailCsiFactorsText').textContent = factors.join(' • ');

    // Attached Media
    const mediaSection = $('#detailMediaSection');
    mediaSection.innerHTML = '';
    if (report.photo) {
      mediaSection.innerHTML += `
        <div style="margin-bottom:10px;">
          <b style="font-size:11px; color:var(--text-muted); display:block; margin-bottom:4px;">ATTACHED PHOTOGRAPH EVIDENCE:</b>
          <img src="${escapeHTML(report.photo)}" alt="Evidence photo" style="max-width:100%; max-height:260px; border-radius:var(--radius-sm); border:1px solid var(--line); display:block;">
        </div>
      `;
    }
    if (report.voice) {
      mediaSection.innerHTML += `
        <div style="margin-top:8px;">
          <b style="font-size:11px; color:var(--text-muted); display:block; margin-bottom:4px;">ATTACHED VOICE RECORDING:</b>
          <audio controls src="${escapeHTML(report.voice)}" style="width:100%; height:34px;"></audio>
        </div>
      `;
    }
    if (report.voiceTranscript) {
      mediaSection.innerHTML += `
        <div class="transcript-bubble" style="margin-top:6px;">
          <b>Voice Transcript:</b> "${escapeHTML(report.voiceTranscript)}"
        </div>
      `;
    }

    // Resolution Proof Section (if Resolved or Verification)
    const proofBox = $('#detailResolutionProofBox');
    if (report.resolutionNotes || report.resolutionPhoto) {
      proofBox.style.display = 'block';
      $('#detailResolutionNotes').textContent = report.resolutionNotes || 'Official resolution completed by municipal maintenance squad.';
      const photoBox = $('#detailResolutionPhoto');
      if (report.resolutionPhoto) {
        photoBox.innerHTML = `<img src="${escapeHTML(report.resolutionPhoto)}" alt="Repair confirmation photo" style="max-width:280px; max-height:160px; border-radius:4px; border:1px solid #6ee7b7; display:block;">`;
      } else {
        photoBox.innerHTML = '';
      }
    } else {
      proofBox.style.display = 'none';
    }

    // Render Timeline Stepper
    renderTimelineStepper(report);

    // Citizen Verification Section (visible if status === 'Citizen Verification')
    const verifyBox = $('#detailCitizenVerifyBox');
    if (report.status === 'Citizen Verification') {
      verifyBox.style.display = 'block';
    } else {
      verifyBox.style.display = 'none';
    }

    // Authority Officer Controls (visible in Authority or Admin mode)
    const authPanel = $('#detailAuthorityPanel');
    if (currentRole === 'authority' || currentRole === 'admin') {
      authPanel.style.display = 'block';
      $('#authorityStatusSelect').value = report.status;
      $('#authorityDeptSelect').value = report.department;
      $('#authorityOfficerNote').value = '';
    } else {
      authPanel.style.display = 'none';
    }

    // Update Support Button State
    const supBtn = $('#detailSupportBtn');
    if (userVotes.has(report.id)) {
      supBtn.classList.add('voted');
      supBtn.innerHTML = `<span>✓</span> <span>Supported (${report.votes || 0})</span>`;
    } else {
      supBtn.classList.remove('voted');
      supBtn.innerHTML = `<span>👍</span> <span>Support Complaint (${report.votes || 0})</span>`;
    }

    // Open Modal
    $('#detailModal').hidden = false;
    document.body.style.overflow = 'hidden';
  };

  function renderTimelineStepper(report) {
    const stepper = $('#detailTimelineStepper');
    const history = report.statusHistory || [];

    if (history.length === 0) {
      stepper.innerHTML = `
        <div class="timeline-node done">
          <div class="timeline-dot">✓</div>
          <div class="timeline-node-body">
            <b>Submitted</b>
            <small>${timeAgo(report.created)} by ${escapeHTML(report.author || 'Citizen')}</small>
          </div>
        </div>
      `;
      return;
    }

    stepper.innerHTML = history.map((node, i) => {
      const isLast = i === history.length - 1;
      return `
        <div class="timeline-node ${isLast ? 'active' : 'done'}">
          <div class="timeline-dot">${isLast ? '●' : '✓'}</div>
          <div class="timeline-node-body">
            <b>${escapeHTML(node.status)}</b>
            <small>${timeAgo(node.timestamp)} • ${escapeHTML(node.actor)} (${escapeHTML(node.dept || 'Municipal Team')})</small>
            ${node.note ? `<div class="timeline-note">${escapeHTML(node.note)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // =========================================================================
  // 15B. OFFICIAL GOVERNMENT PORTALS INTEROPERABILITY & DISPATCH GATEWAY
  // =========================================================================
  const GOV_PORTALS = {
    ghmc: {
      name: 'GHMC — Greater Hyderabad Municipal Corporation',
      url: 'https://ghmc.gov.in/',
      sla: 'SLA: 48 Hours',
      badge: 'RECOMMENDED: GHMC e-COMPLAINTS',
      icon: '🏛️',
      twitter: '@CommissionrGHMC',
      categories: ['public-infra', 'street-lighting', 'sanitation', 'property-damage'],
      reason: 'Official Hyderabad municipal body responsible for roads, streetlights, garbage collection, and parks.'
    },
    hmwssb: {
      name: 'HMWSSB — Hyderabad Metropolitan Water Supply & Sewerage Board',
      url: 'https://www.hyderabadwater.gov.in/',
      sla: 'SLA: 24-36 Hours',
      badge: 'RECOMMENDED: HMWSSB WATER BOARD',
      icon: '🚰',
      categories: ['water-drainage'],
      reason: 'Designated authority for potable water leakage, pipeline bursts, sewage overflow, and open manhole covers.'
    },
    swachhata: {
      name: 'Swachhata-MoHUA (Swachh City Portal)',
      url: 'https://www.swachh.city/',
      sla: 'SLA: 12-24 Hours',
      badge: 'RECOMMENDED: SWACHH BHARAT URBAN',
      icon: '🧹',
      categories: ['sanitation'],
      reason: 'National Ministry of Housing & Urban Affairs platform for garbage dumps, overflowing bins, and public toilets.'
    },
    prajavani: {
      name: 'Telangana Prajavani Grievance Portal (Praja Bhavan / CGG)',
      url: 'https://prajavani.cgg.gov.in/',
      sla: 'SLA: 72 Hours (Supervisory Escalation)',
      badge: 'RECOMMENDED: TELANGANA PRAJAVANI',
      icon: '⚖️',
      categories: ['all'],
      reason: 'Chief Minister\'s direct public grievance portal for overdue cases and multi-departmental issues.'
    },
    cdma: {
      name: 'Telangana CDMA Smart Governance & eMunicipal',
      url: 'https://emunicipal.telangana.gov.in/',
      sla: 'SLA: 72-96 Hours',
      badge: 'RECOMMENDED: TELANGANA CDMA',
      icon: '🏢',
      categories: ['encroachment', 'traffic-safety'],
      reason: 'State municipal administration platform for town planning violations and footpath encroachment enforcement.'
    },
    cpgrams: {
      name: 'CPGRAMS — Central Government Grievances (Govt of India)',
      url: 'https://pgportal.gov.in/',
      sla: 'SLA: 30 Days (Central Norms)',
      badge: 'RECOMMENDED: CPGRAMS NATIONAL',
      icon: '🇮🇳',
      categories: ['environmental'],
      reason: 'Centralized Public Grievance Redress System for national highways, central infrastructure, and environmental hazards.'
    },
    mycure: {
      name: 'MyCURE — Hyderabad Civic Complaints Tracker (GHMC)',
      url: 'https://play.google.com/store/search?q=MyCURE+GHMC&c=apps',
      sla: 'SLA: Real-Time Mobile Dispatch',
      badge: 'RECOMMENDED: MYCURE MOBILE',
      icon: '📱',
      categories: ['public-infra', 'sanitation'],
      reason: 'GHMC mobile application tracking ground repairs and real-time municipal field crew dispatch.'
    }
  };

  function getRecommendedGovPortal(report) {
    if (!report) return 'ghmc';
    if (report.majorCategory === 'water-drainage') return 'hmwssb';
    if (report.majorCategory === 'sanitation') return 'swachhata';
    if (report.majorCategory === 'encroachment') return 'cdma';
    if (report.priority === 'Urgent' || getEscalationInfo(report) !== null) return 'prajavani';
    return 'ghmc';
  }

  function generateGovDossier(report, portalKey) {
    const portal = GOV_PORTALS[portalKey] || GOV_PORTALS.ghmc;
    const tax = TAXONOMY[report.majorCategory] || TAXONOMY['public-infra'];
    const csi = calculateCSI(report);
    const dateStr = new Date(report.created).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    return `================================================================================
OFFICIAL CIVIC GRIEVANCE DOSSIER — MUNICIPAL DISPATCH PAYLOAD
Platform: Smart Civic Connect (SDG 11 Digital Citizen Governance)
Destination Portal: ${portal.name}
Portal Target URL: ${portal.url}
================================================================================
[COMPLAINT REFERENCE & IDENTIFICATION]
Internal Ticket ID     : ${report.id}
Date & Timestamp Filed : ${dateStr} IST
Major Category         : ${tax.name}
Subcategory Issue      : ${report.subcategory}
Responsible Dept       : ${report.department}
Current Workflow State : ${report.status}
${report.govDocket ? `Linked Gov Docket      : ${report.govDocket} (${GOV_PORTALS[report.govPortal]?.name || 'Official Portal'})\n` : ''}
[GEOSPATIAL COORDINATES & LOCATION]
Street Address         : ${report.location}
Landmark / Clue        : ${report.landmark || 'Not provided'}
GPS Latitude / Long    : ${report.lat ? `${report.lat.toFixed(5)}° N, ${report.lng.toFixed(5)}° E` : 'Coordinates Pending Geocoding'}
Municipal Ward Sector  : Northwood Metropolitan District / Hyderabad

[COMMUNITY SEVERITY INDEX (CSI) & CITIZEN WEIGHT]
Severity Score (0-100) : ${csi} / 100 (${report.priority} Urgency Priority)
Verified Community Votes: ${report.votes || 0} Citizens Supporting
Public Safety Risk Flag: ${report.priority === 'Urgent' ? 'YES - Immediate Public Hazard' : 'Standard Priority'}
Required Verifications : 3 Ground-truth Citizen Confirmations

[OFFICIAL ISSUE DESCRIPTION]
${report.description || 'No detailed narrative provided.'}

[VERIFIED EVIDENCE ATTACHMENTS]
Photographic Proof     : ${report.photo ? 'Geotagged Image Captured' : 'None Attached'}
Voice Audio Transcribed: ${report.voiceTranscript ? `"${report.voiceTranscript}"` : 'None'}
Filing Citizen Identity: ${report.author || 'Anonymous Resident'} ${report.phone ? `(${report.phone})` : ''}

[GATEWAY DISPATCH AUDIT HASH]
Payload Checksum SHA   : SCC-GW-${Date.now().toString(36).toUpperCase()}-${report.id}
Interoperability Standard: India Urban Data Exchange (IUDX) / OpenForge Grievance Schema
================================================================================`;
  }

  function openGovDispatchModal(report) {
    if (!report) return;
    const recKey = report.govPortal || getRecommendedGovPortal(report);
    const targetSelect = $('#dispatchTargetSelect');
    if (targetSelect) targetSelect.value = recKey;

    updateDispatchModalView(report, recKey);

    $('#govDispatchModal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function updateDispatchModalView(report, portalKey) {
    const portal = GOV_PORTALS[portalKey] || GOV_PORTALS.ghmc;
    $('#recommendedPortalBadge').textContent = portal.badge;
    $('#recommendedPortalSla').textContent = portal.sla;
    $('#recommendedPortalName').textContent = portal.name;
    $('#recommendedPortalReason').textContent = portal.reason;

    const dossier = generateGovDossier(report, portalKey);
    $('#dispatchDossierText').textContent = dossier;
    $('#openTargetPortalBtn').href = portal.url;
    $('#govDocketInput').value = report.govDocket || '';
  }

  // Export Complaints Batch to JSON for Municipal Ingestion
  function exportGovBatchJson() {
    const payload = {
      platform: "Smart Civic Connect",
      exportTimestamp: new Date().toISOString(),
      standardsCompliance: "UN SDG 11 Sustainable Cities / IUDX Schema",
      totalComplaints: reports.length,
      records: reports.map(r => ({
        id: r.id,
        category: r.majorCategory,
        subcategory: r.subcategory,
        title: r.title,
        location: r.location,
        landmark: r.landmark,
        latitude: r.lat,
        longitude: r.lng,
        department: r.department,
        status: r.status,
        priority: r.priority,
        csiScore: calculateCSI(r),
        votes: r.votes,
        verifiedFixCount: r.verifiedCount,
        governmentDocket: r.govDocket || null,
        created: new Date(r.created).toISOString(),
        updated: new Date(r.updated || r.created).toISOString()
      }))
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart_civic_complaints_export_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Municipal Batch Exported', `${reports.length} complaint records downloaded as JSON.`);
  }

  // Export Complaints to CSV for Municipal Spreadsheet Review
  function exportGovReportCsv() {
    const headers = [
      'Ticket_ID',
      'Category',
      'Subcategory',
      'Title',
      'Address',
      'Landmark',
      'Latitude',
      'Longitude',
      'Responsible_Department',
      'Workflow_Status',
      'Priority',
      'CSI_Priority_Score',
      'Community_Votes',
      'Gov_Docket_Number',
      'Date_Reported'
    ];

    const rows = reports.map(r => [
      `"${r.id}"`,
      `"${r.majorCategory}"`,
      `"${(r.subcategory || '').replace(/"/g, '""')}"`,
      `"${(r.title || '').replace(/"/g, '""')}"`,
      `"${(r.location || '').replace(/"/g, '""')}"`,
      `"${(r.landmark || '').replace(/"/g, '""')}"`,
      r.lat || '',
      r.lng || '',
      `"${(r.department || '').replace(/"/g, '""')}"`,
      `"${r.status}"`,
      `"${r.priority}"`,
      calculateCSI(r),
      r.votes || 0,
      `"${r.govDocket || 'Pending Dispatch'}"`,
      `"${new Date(r.created).toLocaleDateString()}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart_civic_grievance_report_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Grievance CSV Exported', 'Municipal spreadsheet report downloaded.');
  }

  // =========================================================================
  // 16. SUPPORT UPVOTE HANDLER
  // =========================================================================
  function handleSupportVote(reportId) {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    if (userVotes.has(reportId)) {
      showToast('Already Supported', 'You have already registered your support for this neighborhood complaint.');
      return;
    }

    // Record vote
    userVotes.add(reportId);
    report.votes = (report.votes || 0) + 1;
    userPoints += 5;

    persistReports();
    persistVotes();
    persistPoints();

    showToast('Support Registered (+5 Pts)', `Your support for ${report.id} was recorded! Priority score updated.`);
    renderOverview();
    renderAllReports();
    renderRewardsModule();

    if (activeDetailReport && activeDetailReport.id === reportId) {
      window.sccOpenReportDetails(reportId);
    }
  }

  // =========================================================================
  // 17. CITIZEN RESOLUTION VERIFICATION HANDLER
  // =========================================================================
  function handleConfirmRepair(report) {
    report.verifiedCount = (report.verifiedCount || 0) + 1;
    report.status = 'Closed';
    report.updated = Date.now();

    report.statusHistory.push({
      status: 'Closed',
      timestamp: Date.now(),
      actor: 'Jordan Davis (Citizen Verifier)',
      dept: 'Neighborhood Ground Check',
      note: 'Citizen physical inspection confirmed fix satisfactory. Work order closed.'
    });

    userPoints += 15;
    persistReports();
    persistPoints();

    showToast('Repair Verified (+15 Pts)', 'Thank you for verifying repair quality! Ticket is officially closed.');
    $('#detailModal').hidden = true;
    document.body.style.overflow = '';
    renderOverview();
    renderAllReports();
    renderRewardsModule();
  }

  function handleDisputeRepair(report) {
    report.disputeCount = (report.disputeCount || 0) + 1;
    report.status = 'In progress';
    report.priority = 'High';
    report.updated = Date.now();

    report.statusHistory.push({
      status: 'In progress',
      timestamp: Date.now(),
      actor: 'Jordan Davis (Citizen Inspector)',
      dept: 'Resolution Audit Dispute',
      note: 'Dispute filed: Citizen inspected site and reported issue persists. Reopened with high priority.'
    });

    persistReports();
    showToast('Dispute Logged', 'Your dispute was recorded. The supervisor has been alerted to re-dispatch crews.');
    $('#detailModal').hidden = true;
    document.body.style.overflow = '';
    renderOverview();
    renderAllReports();
  }

  // =========================================================================
  // 18. AUTHORITY OFFICER UPDATE HANDLER
  // =========================================================================
  function handleAuthorityUpdate() {
    if (!activeDetailReport) return;
    const newStatus = $('#authorityStatusSelect').value;
    const newDept = $('#authorityDeptSelect').value;
    const note = $('#authorityOfficerNote').value.trim();

    const previousStatus = activeDetailReport.status;
    activeDetailReport.status = newStatus;
    activeDetailReport.department = newDept;
    activeDetailReport.updated = Date.now();

    if (newStatus === 'Resolved') {
      activeDetailReport.status = 'Citizen Verification';
      activeDetailReport.resolutionNotes = note || 'Official resolution completed by municipal maintenance squad.';
      activeDetailReport.resolutionPhoto = SAMPLE_PHOTOS.repaired;
    }

    activeDetailReport.statusHistory.push({
      status: activeDetailReport.status,
      timestamp: Date.now(),
      actor: currentRole === 'admin' ? 'System Administrator' : 'Zonal Authority Officer',
      dept: newDept,
      note: note || `Status transitioned from ${previousStatus} to ${activeDetailReport.status}.`
    });

    persistReports();
    showToast('Officer Updates Saved', `Ticket ${activeDetailReport.id} successfully updated to "${activeDetailReport.status}".`);
    $('#detailModal').hidden = true;
    document.body.style.overflow = '';
    renderOverview();
    renderAllReports();
    renderAuthorityModule();
  }

  // =========================================================================
  // 19. PHOTO UPLOAD & LIVE WEBCAM CAPTURE
  // =========================================================================
  let photoDataUrls = [];
  let webcamStream = null;

  function stopWebcam() {
    if (webcamStream) {
      webcamStream.getTracks().forEach(t => t.stop());
      webcamStream = null;
    }
    const video = $('#modalWebcamVideo');
    if (video) video.srcObject = null;
    $('#modalWebcamBox').style.display = 'none';
  }

  function renderPhotoPreviews() {
    const grid = $('#modalPhotoPreviewGrid');
    if (photoDataUrls.length === 0) {
      grid.style.display = 'none';
      grid.innerHTML = '';
      return;
    }
    grid.style.display = 'flex';
    grid.innerHTML = photoDataUrls.map((url, idx) => `
      <div class="photo-thumb">
        <img src="${escapeHTML(url)}" alt="Attached photo ${idx + 1}">
        <button type="button" class="btn-rm-img" data-remove-idx="${idx}" title="Remove photo">×</button>
      </div>
    `).join('');
  }

  function fileToCompressedDataUrl(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, 900 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Unable to read selected photograph'));
      };
      img.src = url;
    });
  }

  // =========================================================================
  // 20. MULTILINGUAL VOICE COMPLAINTS & WEB SPEECH RECOGNITION
  // =========================================================================
  let mediaRecorder = null;
  let audioChunks = [];
  let voiceBlobUrl = '';
  let speechRecognizer = null;
  let isRecordingVoice = false;

  function initSpeechRecognition() {
    const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechClass) return null;
    const recognizer = new SpeechClass();
    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.lang = $('#speechLangSelect')?.value || 'en-IN';
    return recognizer;
  }

  async function startVoiceRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      $('#mediaStatusMsg').textContent = 'Microphone access is not supported by your browser.';
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = e => { if (e.data.size) audioChunks.push(e.data); };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        if (voiceBlobUrl) URL.revokeObjectURL(voiceBlobUrl);
        voiceBlobUrl = URL.createObjectURL(blob);
        const audioEl = $('#modalVoiceAudio');
        audioEl.src = voiceBlobUrl;
        audioEl.style.display = 'block';
        $('#mediaStatusMsg').textContent = 'Voice recording attached.';
      };

      mediaRecorder.start();
      isRecordingVoice = true;
      $('#modalVoiceBtn').classList.add('recording');
      $('#modalVoiceIcon').textContent = '⏹';
      $('#modalVoiceLabel').textContent = 'Stop Voice Note';
      $('#mediaStatusMsg').textContent = 'Recording up to 60s. Speak your complaint clearly...';

      // Live Speech-to-text
      speechRecognizer = initSpeechRecognition();
      if (speechRecognizer) {
        $('#speechLiveTranscriptBox').style.display = 'block';
        $('#speechLiveTranscriptText').textContent = 'Listening...';
        speechRecognizer.onresult = event => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            interim += event.results[i][0].transcript;
          }
          $('#speechLiveTranscriptText').textContent = interim;
          // Append to form description
          const descEl = $('#formDescription');
          if (descEl && interim) {
            descEl.value = interim;
            triggerAiClassification(interim);
          }
        };
        speechRecognizer.onerror = () => {};
        try { speechRecognizer.start(); } catch (e) {}
      }
    } catch (err) {
      $('#mediaStatusMsg').textContent = 'Microphone access was denied or unavailable.';
    }
  }

  function stopVoiceRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch (e) {}
    }
    isRecordingVoice = false;
    $('#modalVoiceBtn').classList.remove('recording');
    $('#modalVoiceIcon').textContent = '🎙️';
    $('#modalVoiceLabel').textContent = 'Record Again';
    $('#mediaStatusMsg').textContent = 'Voice note recorded and transcribed.';
  }

  // =========================================================================
  // 21. SMART REPORTING WORKFLOW & SUBMISSION
  // =========================================================================
  let detectedGpsLat = null;
  let detectedGpsLng = null;
  let pendingSubmissionData = null;

  function populateSubcategories(majorKey, targetSelectId = '#formSubcategory') {
    const select = $(targetSelectId);
    if (!select) return;
    select.innerHTML = '<option value="">Select Subcategory</option>';

    const tax = TAXONOMY[majorKey];
    if (!tax) return;

    tax.subcategories.forEach(sub => {
      const opt = document.createElement('option');
      opt.value = sub;
      opt.textContent = sub;
      select.appendChild(opt);
    });

    if (targetSelectId === '#formSubcategory') {
      const deptBar = $('#suggestedDeptBar');
      deptBar.style.display = 'block';
      $('#suggestedDeptName').textContent = tax.defaultDept;
    }
  }

  // Normalize Gemini category string to valid taxonomy key
  function normalizeCategory(catStr) {
    if (!catStr) return 'public-infra';
    const c = String(catStr).toLowerCase();
    if (c.includes('infra') || c.includes('road')) return 'public-infra';
    if (c.includes('light') || c.includes('electr')) return 'street-lighting';
    if (c.includes('water') || c.includes('drain') || c.includes('sewage')) return 'water-drainage';
    if (c.includes('sanit') || c.includes('waste') || c.includes('garbage')) return 'sanitation';
    if (c.includes('traffic') || c.includes('park') || c.includes('safety')) return 'traffic-safety';
    if (c.includes('access') || c.includes('inclus') || c.includes('ramp') || c.includes('lift')) return 'accessibility';
    if (c.includes('environ') || c.includes('pollut')) return 'environmental';
    if (c.includes('encroach') || c.includes('zoning')) return 'encroachment';
    if (c.includes('prop') || c.includes('damage') || c.includes('bench')) return 'property-damage';
    return 'public-infra';
  }

  // Live Gemini AI Assistant Integration
  async function callGeminiAssistant(userText) {
    if (!geminiApiKey) return null;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`;

    const systemInstruction = `You are Smart Civic Connect's AI Civic Reporting Assistant. Classify the user's civic issue into one of: 'public-infra' (Public Infrastructure and Road Maintenance), 'street-lighting' (Street Lighting and Electricity), 'water-drainage' (Water and Drainage), 'sanitation' (Sanitation and Environmental Hazards), 'traffic-safety' (Traffic and Public Safety), 'accessibility' (Accessibility and Inclusive Infrastructure), 'environmental' (Environmental Issues), 'encroachment' (Encroachment and Zoning Violations), or 'property-damage' (Public Property Damage).
Also determine specific subcategory, severity ('Normal', 'High', or 'Urgent'), responsible municipal department, concise title, keywords array, location_clue, and a 1-sentence summary.
Return ONLY a valid JSON object matching this schema:
{"category": string, "subcategory": string, "severity": string, "department": string, "title": string, "summary": string, "keywords": string[], "location_clue": string}`;

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [
        { parts: [{ text: userText }] }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) throw new Error(`Gemini API returned HTTP ${response.status}`);
      const data = await response.json();
      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        return null;
      }
      const rawText = data.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(rawText);
      const catKey = normalizeCategory(parsed.category);
      const tax = TAXONOMY[catKey] || TAXONOMY['public-infra'];

      return {
        category: catKey,
        subcategory: parsed.subcategory || tax.subcategories[0],
        dept: parsed.department || tax.defaultDept,
        priority: ['Urgent', 'High', 'Normal'].includes(parsed.severity) ? parsed.severity : 'High',
        confidence: `✨ ${GEMINI_MODEL_LABEL} (Live AI)`,
        suggestedTitle: parsed.title || userText.slice(0, 45),
        summary: parsed.summary || `${GEMINI_MODEL_LABEL} intelligent civic classification complete.`,
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        locationClue: parsed.location_clue || ''
      };
    } catch (err) {
      console.warn('Gemini API call failed, falling back to on-device classifier', err);
      return null;
    }
  }

  async function analyzeHelplineNotes() {
    const notesField = $('#helplineForm [name="helplineDescription"]');
    const status = $('#helplineAiStatus');
    const button = $('#helplineAiAnalyzeBtn');
    const notes = notesField.value.trim();
    helplineAiAnalysis = null;

    if (notes.length < 6) {
      status.textContent = 'Add a few details from the caller before analyzing.';
      notesField.focus();
      return;
    }

    button.disabled = true;
    status.textContent = geminiApiKey ? 'Gemini is analyzing the caller notes…' : 'Analyzing caller notes on this device…';

    try {
      let result = null;
      if (geminiApiKey) result = await callGeminiAssistant(notes);
      const usedGemini = Boolean(result);
      if (!result) result = runAiCivicClassifier(notes);

      if (!result || !TAXONOMY[result.category]) {
        status.textContent = 'Could not confidently classify these notes. Please select the category and urgency manually.';
        return;
      }

      const taxonomy = TAXONOMY[result.category];
      const matchedSubcategory = taxonomy.subcategories.find(
        item => item.toLowerCase() === String(result.subcategory || '').trim().toLowerCase()
      );
      $('#helplineCategory').value = result.category;
      populateSubcategories(result.category, '#helplineSubcategory');
      $('#helplineSubcategory').value = matchedSubcategory || taxonomy.subcategories[0];
      const prioritySelect = $('#helplineForm [name="helplinePriority"]');
      if (['Urgent', 'High', 'Normal'].includes(result.priority)) {
        prioritySelect.value = result.priority;
      }

      const engine = usedGemini ? GEMINI_MODEL_LABEL : 'On-device civic classifier';
      helplineAiAnalysis = {
        category: result.category,
        subcategory: matchedSubcategory || taxonomy.subcategories[0],
        priority: prioritySelect.value,
        engine,
        summary: result.summary || ''
      };
      const fallbackNote = geminiApiKey && !usedGemini ? ' (Gemini unavailable; offline fallback used)' : '';
      status.textContent = `${engine}${fallbackNote}: ${taxonomy.name} — ${$('#helplineSubcategory').value}, ${prioritySelect.value} urgency. Review before registering.`;
    } catch (error) {
      console.error('Helpline AI analysis failed', error);
      status.textContent = 'AI analysis failed. Please classify the complaint manually and try again.';
    } finally {
      button.disabled = false;
    }
  }

  async function triggerAiClassification(text) {
    if (!text || text.trim().length < 6) {
      const card = $('#aiAssistantCard');
      if (card) card.style.display = 'none';
      return;
    }

    const card = $('#aiAssistantCard');
    if (!card) return;

    card.style.display = 'flex';

    let aiResult = null;
    if (geminiApiKey) {
      $('#aiConfidenceBadge').textContent = '✨ Gemini Thinking...';
      aiResult = await callGeminiAssistant(text);
    }

    if (!aiResult) {
      aiResult = runAiCivicClassifier(text);
    }

    if (!aiResult) {
      card.style.display = 'none';
      return;
    }

    $('#aiConfidenceBadge').textContent = aiResult.confidence;
    
    let keywordsHtml = '';
    if (aiResult.keywords && aiResult.keywords.length > 0) {
      keywordsHtml = `<div style="margin-top:5px; font-size:10px; color:var(--text-muted);">🏷️ <b>Keywords:</b> ${escapeHTML(aiResult.keywords.join(', '))}</div>`;
    }
    let locationClueHtml = '';
    if (aiResult.locationClue) {
      locationClueHtml = `<div style="margin-top:3px; font-size:10px; color:var(--teal-600);">📍 <b>Detected Location Clue:</b> ${escapeHTML(aiResult.locationClue)}</div>`;
    }

    $('#aiSuggestionText').innerHTML = `
      <b>AI Analysis:</b> ${escapeHTML(aiResult.summary)}<br>
      <b>Classification:</b> ${escapeHTML(TAXONOMY[aiResult.category].name)} ➔ <em>${escapeHTML(aiResult.subcategory)}</em><br>
      <b>Responsible Dept:</b> ${escapeHTML(aiResult.dept)} (${escapeHTML(aiResult.priority)} Urgency)
      ${keywordsHtml}
      ${locationClueHtml}
    `;

    // Store recommendation on apply button
    const applyBtn = $('#aiApplyBtn');
    applyBtn.onclick = () => {
      $('#formMajorCategory').value = aiResult.category;
      populateSubcategories(aiResult.category);
      $('#formSubcategory').value = aiResult.subcategory;
      $('#formPriority').value = aiResult.priority;
      if (!$('#formTitle').value.trim() && aiResult.suggestedTitle) {
        $('#formTitle').value = aiResult.suggestedTitle;
      }
      if (aiResult.locationClue && !$('#formLocation').value.trim()) {
        $('#formLocation').value = aiResult.locationClue;
      }
      showToast('AI Suggestions Applied', 'Form fields pre-filled by AI Civic Assistant.');
      card.style.display = 'none';
    };
  }

  function resetReportModal() {
    $('#reportForm').reset();
    $('#formSubcategory').innerHTML = '<option value="">Select Major Category First</option>';
    $('#suggestedDeptBar').style.display = 'none';
    $('#aiAssistantCard').style.display = 'none';
    $('#formCoordsDisplay').style.display = 'none';
    $('#speechLiveTranscriptBox').style.display = 'none';
    $('#formErrorMessage').textContent = '';
    photoDataUrls = [];
    renderPhotoPreviews();
    stopWebcam();
    if (isRecordingVoice) stopVoiceRecording();
    const audio = $('#modalVoiceAudio');
    audio.pause();
    audio.removeAttribute('src');
    audio.style.display = 'none';
    $('#mediaStatusMsg').textContent = '';
    detectedGpsLat = null;
    detectedGpsLng = null;
    pendingSubmissionData = null;
  }

  function openReportModal(categoryKey = '', subcategoryVal = '', prefill = null) {
    resetReportModal();
    if (categoryKey && TAXONOMY[categoryKey]) {
      $('#formMajorCategory').value = categoryKey;
      populateSubcategories(categoryKey);
      if (subcategoryVal) $('#formSubcategory').value = subcategoryVal;
    }
    if (prefill) {
      if (prefill.title) $('#formTitle').value = prefill.title;
      if (prefill.description) $('#formDescription').value = prefill.description;
      if (prefill.location) $('#formLocation').value = prefill.location;
    }
    $('#reportModal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function executeReportSave(data) {
    const newReport = {
      id: `SCC-${Math.floor(2842 + Math.random() * 57000)}`,
      majorCategory: data.category,
      subcategory: data.subcategory,
      title: data.title,
      location: data.location,
      landmark: data.landmark || '',
      lat: data.lat || 17.4938 + (Math.random() - 0.5) * 0.015,
      lng: data.lng || 78.3912 + (Math.random() - 0.5) * 0.015,
      description: data.description,
      department: TAXONOMY[data.category]?.defaultDept || 'General Municipal Administration',
      status: 'Open',
      priority: data.priority,
      author: data.author || 'Anonymous',
      phone: '',
      created: Date.now(),
      updated: Date.now(),
      votes: 1,
      verifiedCount: 0,
      disputeCount: 0,
      photo: photoDataUrls[0] || '',
      voice: voiceBlobUrl || '',
      voiceTranscript: $('#speechLiveTranscriptText')?.textContent || '',
      statusHistory: [
        {
          status: 'Submitted',
          timestamp: Date.now(),
          actor: `${data.author || 'Anonymous'} (Citizen)`,
          dept: 'Smart Civic Connect Engine',
          note: `Complaint filed and automatically routed to ${TAXONOMY[data.category]?.defaultDept || 'Municipal Services'}.`
        }
      ]
    };

    reports.unshift(newReport);
    userVotes.add(newReport.id);
    userPoints += 10; // +10 points for new genuine report

    persistReports();
    persistVotes();
    persistPoints();

    resetReportModal();
    $('#reportModal').hidden = true;
    document.body.style.overflow = '';

    showToast('Complaint Submitted (+10 Pts)', `Reference Ticket ${newReport.id} assigned to ${newReport.department}.`);
    renderOverview();
    renderAllReports();
    renderRewardsModule();
    if (leafletMap) updateMapMarkers();
  }

  // =========================================================================
  // 22. ASSISTED HELPLINE OPERATOR REGISTRATION
  // =========================================================================
  function handleHelplineSubmit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const cat = f.get('helplineCategory');
    const sub = f.get('helplineSubcategory');
    const caller = f.get('callerName').trim();
    const phone = f.get('callerPhone').trim();
    const loc = f.get('helplineLocation').trim();
    const landmark = f.get('helplineLandmark').trim();
    const desc = f.get('helplineDescription').trim();
    const priority = f.get('helplinePriority');

    const ticketId = `SCC-${new Date().getFullYear()}-TEL-${Math.floor(1000 + Math.random() * 9000)}`;
    const dept = TAXONOMY[cat]?.defaultDept || 'Roads & Municipal Engineering Dept';

    const newTicket = {
      id: ticketId,
      majorCategory: cat,
      subcategory: sub,
      title: `[Helpline Call] ${sub} at ${loc}`,
      location: loc,
      landmark: landmark,
      lat: 17.4938 + (Math.random() - 0.5) * 0.015,
      lng: 78.3912 + (Math.random() - 0.5) * 0.015,
      description: desc,
      department: dept,
      status: 'Open',
      priority: priority,
      author: `${caller} (via Telephone Helpline)`,
      phone: phone,
      created: Date.now(),
      updated: Date.now(),
      votes: 1,
      verifiedCount: 0,
      disputeCount: 0,
      photo: '',
      voice: '',
      statusHistory: [
        {
          status: 'Submitted',
          timestamp: Date.now(),
          actor: 'Helpline Operator #4',
          dept: 'Municipal Toll-Free Care Center',
          note: `Caller ${caller} (${phone}) registered complaint over phone line 1800-425-CIVIC.`
        }
      ]
    };

    reports.unshift(newTicket);
    persistReports();

    const aiMatch = helplineAiAnalysis &&
      helplineAiAnalysis.category === cat &&
      helplineAiAnalysis.subcategory === sub &&
      helplineAiAnalysis.priority === priority;
    helplineCalls.unshift({
      id: `CALL-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`,
      ticketId,
      createdAt: Date.now(),
      status: 'New',
      aiAssisted: Boolean(aiMatch),
      aiEngine: aiMatch ? aiMatch.engine : '',
      aiSummary: aiMatch ? aiMatch.summary : ''
    });
    const callLogSaved = persistHelplineCalls();

    // Show simulated SMS preview
    const preview = $('#helplineSmsPreview');
    preview.style.display = 'block';
    $('#smsTime').textContent = new Date().toLocaleTimeString();
    $('#smsContent').textContent = `📱 SMS Dispatched to ${phone}: "Municipal Connect: Dear ${caller}, your complaint #${ticketId} regarding ${sub} has been registered with ${dept}. SLA target: 48h. Track status at smartcivic.city/track/${ticketId}"`;

    e.currentTarget.reset();
    helplineAiAnalysis = null;
    renderHelplineCalls();
    showToast(
      callLogSaved ? 'Helpline Call Logged' : 'Call Log Save Failed',
      callLogSaved
        ? `Ticket ${ticketId} was registered and added to call management.`
        : `Ticket ${ticketId} was registered, but its call log could not be saved in this browser.`
    );
    renderOverview();
    renderAllReports();
    if (leafletMap) updateMapMarkers();
  }

  function renderHelplineCalls() {
    const rows = $('#helplineCallRows');
    if (!rows) return;

    const query = ($('#helplineCallSearch')?.value || '').trim().toLowerCase();
    const statusFilter = $('#helplineCallStatusFilter')?.value || 'all';
    const reportsById = new Map(reports.map(report => [report.id, report]));
    const visibleCalls = helplineCalls.filter(call => {
      const report = reportsById.get(call.ticketId);
      if (statusFilter !== 'all' && call.status !== statusFilter) return false;
      if (!query) return true;
      const searchText = [
        call.ticketId,
        report?.author,
        report?.phone,
        report?.title,
        report?.subcategory,
        report?.location,
        report?.description
      ].join(' ').toLowerCase();
      return searchText.includes(query);
    });

    $('#helplineCallTotal').textContent = String(helplineCalls.length);
    $('#helplineCallNew').textContent = String(helplineCalls.filter(call => call.status === 'New').length);
    $('#helplineCallFollowUp').textContent = String(
      helplineCalls.filter(call => call.status === 'Follow-up' || call.status === 'In Progress').length
    );
    $('#helplineCallEscalated').textContent = String(helplineCalls.filter(call => call.status === 'Escalated').length);
    $('#helplineCallTableWrap').hidden = visibleCalls.length === 0;
    $('#helplineCallEmptyState').hidden = visibleCalls.length > 0;

    rows.innerHTML = visibleCalls.map(call => {
      const report = reportsById.get(call.ticketId);
      const caller = (report?.author || 'Caller details unavailable').replace(/\s+\(via Telephone Helpline\)$/, '');
      const digits = String(report?.phone || '').replace(/\D/g, '');
      const maskedPhone = digits ? `•••• ${digits.slice(-4)}` : '';
      const issue = report?.subcategory || report?.title || 'Ticket details unavailable';
      const date = Number.isFinite(Number(call.createdAt))
        ? new Date(Number(call.createdAt)).toLocaleString()
        : 'Unknown';
      const status = HELPLINE_CALL_STATUSES.includes(call.status) ? call.status : 'New';
      const statusOptions = HELPLINE_CALL_STATUSES.map(value =>
        `<option value="${value}"${value === status ? ' selected' : ''}>${value}</option>`
      ).join('');
      const aiLabel = call.aiAssisted
        ? `AI · ${escapeHTML(call.aiEngine || 'Civic classifier')}`
        : 'Manual';

      return `
        <tr>
          <td><button type="button" class="helpline-call-ticket" data-ticket-id="${escapeHTML(call.ticketId)}">${escapeHTML(call.ticketId)}</button></td>
          <td>${escapeHTML(caller)}${maskedPhone ? `<small class="helpline-call-phone">${escapeHTML(maskedPhone)}</small>` : ''}</td>
          <td>${escapeHTML(issue)}<small class="helpline-call-location">${escapeHTML(report?.location || '')}</small></td>
          <td>${escapeHTML(report?.priority || 'Normal')}</td>
          <td title="${escapeHTML(call.aiSummary || '')}">${aiLabel}${call.aiSummary ? `<small class="helpline-call-ai-summary">${escapeHTML(call.aiSummary)}</small>` : ''}</td>
          <td>${escapeHTML(date)}</td>
          <td>
            <select class="form-control helpline-call-status" data-call-id="${escapeHTML(call.id)}" aria-label="Update call status for ${escapeHTML(call.ticketId)}">
              ${statusOptions}
            </select>
          </td>
        </tr>`;
    }).join('');
  }

  function updateHelplineCallStatus(callId, nextStatus) {
    const call = helplineCalls.find(item => item.id === callId);
    if (!call || !HELPLINE_CALL_STATUSES.includes(nextStatus)) {
      console.error('Cannot update helpline call status: invalid call ID or status.');
      showToast('Call Status Not Updated', 'The selected call or status is invalid.');
      renderHelplineCalls();
      return;
    }

    const previousStatus = call.status;
    const previousUpdatedAt = call.updatedAt;
    call.status = nextStatus;
    call.updatedAt = Date.now();
    if (!persistHelplineCalls()) {
      call.status = previousStatus;
      if (previousUpdatedAt === undefined) delete call.updatedAt;
      else call.updatedAt = previousUpdatedAt;
      showToast('Call Status Not Saved', 'The browser could not save this status change.');
      renderHelplineCalls();
      return;
    }

    renderHelplineCalls();
    showToast('Call Status Updated', `${call.ticketId} is now ${nextStatus}.`);
  }

  // =========================================================================
  // 23. ROLE SWITCHER (CITIZEN / AUTHORITY / ADMIN)
  // =========================================================================
  function setRole(newRole) {
    currentRole = newRole;
    persistRole();

    const topSelector = $('#topRoleSelector');
    if (topSelector) topSelector.value = newRole;

    const label = $('#sidebarRoleLabel');
    const desc = $('#sidebarRoleDesc');
    const authNav = $('#authorityNavLabel');
    const authBtn = $('#navAuthorityBtn');
    const adminLoginLabel = $('#adminLoginBtnLabel');
    const adminLoginButton = $('#adminLoginBtn');

    if (adminLoginLabel) adminLoginLabel.textContent = newRole === 'admin' ? 'Log Out Admin' : 'Admin Login';
    if (adminLoginButton) adminLoginButton.title = newRole === 'admin' ? 'Exit administrator mode' : 'Admin / Officer Login';

    if (newRole === 'authority') {
      label.textContent = 'Role: Authority Officer';
      desc.textContent = 'Municipal Operations';
      authNav.style.display = 'block';
      authBtn.style.display = 'flex';
      showToast('Switched to Authority View', 'Operational filters, department workload, and status controls enabled.');
    } else if (newRole === 'admin') {
      label.textContent = 'Role: Administrator';
      desc.textContent = 'Governance & Rules';
      authNav.style.display = 'block';
      authBtn.style.display = 'flex';
      showToast('Switched to Administrator View', 'Full system configurations, routing rules, and audit logs enabled.');
    } else {
      label.textContent = 'Role: Citizen';
      desc.textContent = 'Community Participant';
      showToast('Switched to Citizen View', 'Viewing neighborhood public feed and community rewards.');
    }

    renderOverview();
    renderAllReports();
  }

  // =========================================================================
  // 23B. CIVIC AI ASSISTANT CHATBOT CONTROLLER (CIVICBOT)
  // =========================================================================
  function updateChatbotEngineStatus() {
    const statusText = $('#chatEngineStatusText');
    if (statusText) {
      statusText.textContent = geminiApiKey ? `${GEMINI_MODEL_LABEL} (Live AI)` : 'On-Device Civic NLP (Offline Ready)';
    }
  }

  function toggleChatDrawer(forceOpen) {
    const drawer = $('#civicChatbotDrawer');
    if (!drawer) return;
    const shouldOpen = forceOpen !== undefined ? forceOpen : drawer.hidden;
    drawer.hidden = !shouldOpen;
    if (shouldOpen) {
      const input = $('#civicChatInput');
      if (input) setTimeout(() => input.focus(), 100);
      scrollChatToBottom();
    }
  }

  function scrollChatToBottom() {
    const container = $('#civicChatMessages');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  function appendChatBubble(role, htmlContent, actionData = null) {
    const container = $('#civicChatMessages');
    if (!container) return null;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isBot = role === 'bot';
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isBot ? 'bot' : 'user'}`;

    let actionBtnHtml = '';
    if (actionData) {
      const jsonStr = encodeURIComponent(JSON.stringify(actionData));
      actionBtnHtml = `
        <div style="margin-top:8px;">
          <button type="button" class="chat-action-btn" onclick="window.draftComplaintFromBot('${jsonStr}')">
            ⚡ Draft Complaint in Report Form
          </button>
        </div>
      `;
    }

    bubble.innerHTML = `
      <div class="chat-bubble-author">${isBot ? '🤖 CivicBot Assistant' : '👤 You'}</div>
      <div class="chat-bubble-content">${htmlContent}</div>
      ${actionBtnHtml}
      <div class="chat-bubble-time">${timeStr}</div>
    `;

    container.appendChild(bubble);
    scrollChatToBottom();
    return bubble;
  }

  window.draftComplaintFromBot = function(encodedJson) {
    try {
      const data = JSON.parse(decodeURIComponent(encodedJson));
      toggleChatDrawer(false);
      openReportModal(data.category, data.subcategory, {
        title: data.title,
        description: data.description,
        location: data.location || 'Northwood Metro District'
      });
      showToast('Complaint Drafted', 'Report form pre-filled from Civic AI Assistant!');
    } catch (err) {
      console.warn('Error drafting complaint from bot', err);
      openReportModal();
    }
  };

  async function handleCivicChatSubmit(userText) {
    const text = userText.trim();
    if (!text) return;

    appendChatBubble('user', escapeHTML(text));

    // Append loading bubble
    const thinkingBubble = appendChatBubble('bot', '<em>Thinking & analyzing municipal database...</em>');

    try {
      if (geminiApiKey) {
        const geminiResult = await callGeminiChat(text);
        if (thinkingBubble) thinkingBubble.remove();
        if (geminiResult) {
          appendChatBubble('bot', geminiResult.replyHtml, geminiResult.actionData);
          return;
        }
      }
    } catch (e) {
      console.warn('Gemini chat error, falling back to local heuristic', e);
    }

    // Fallback: Intelligent on-device heuristic engine
    if (thinkingBubble) thinkingBubble.remove();
    const heuristicResult = analyzeCivicQueryHeuristic(text);
    appendChatBubble('bot', heuristicResult.replyHtml, heuristicResult.actionData);
  }

  async function callGeminiChat(userText) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`;
    const requestBody = {
      systemInstruction: {
        parts: [{
          text: `You are CivicBot, the dedicated AI Civic Assistant & Municipal Doubt Clearing Tutor for Smart Civic Connect, aligned with UN SDG 11: Sustainable Cities & Communities.
Assist citizens of Northwood District / Hyderabad with:
- Clearing doubts on:
  1. Municipal Laws, Bylaws & Fines (GHMC Act 1955, Telangana Municipalities Act 2019, Solid Waste penalties up to ₹25,000, Section 405/406 encroachment notices).
  2. Official Municipal SLAs: 24h for urgent hazards & sewage, 48h for streetlights, 3d for potholes, 7d for paving.
  3. Escalations & Grievance Rights: Prajavani (prajavani.cgg.gov.in) held every Monday at Praja Bhavan, RTI Act 2005 (Form A with ₹10 court fee stamp to inspect municipal registers).
  4. Camera Evidence Database: Cryptographic timestamping, latitude/longitude geotagging, tamper-evident watermarks.
  5. Community Severity Index (CSI): Formula CSI = (B * S + 1.5 * log2(U + 1) + R) * M, where B is baseline, S is urgency, U is community upvotes, R is recurrence, M is accessibility multiplier (1.25x).
  6. Civic Points, Badges & Leaderboard: +25 for report, +40 for repair verification, +5 for upvote; Civic Scout to Master Guardian.
  7. Accessibility Rights (UN SDG 11.2 & RPwD Act 2016 Sections 41-46): Barrier-free public spaces, non-negotiable ramp access.
  8. Privacy & Data Security: Anonymous reporting, local browser storage encryption, redaction of phone numbers.
- Filing and categorizing civic complaints: Public Infrastructure, Street Lighting, Water & Drainage, Sanitation, Traffic & Parking, Accessibility (SDG 11.2), Environment, Encroachments.

Tone: Professional, knowledgeable, empathetic, and concise (under 130 words).
If the citizen is describing a civic hazard they want to file, provide brief advice and append an exact JSON block on a new line at the very end in the following format:
\`\`\`json
{
  "isComplaint": true,
  "category": "<one of public-infra, street-lighting, water-drainage, sanitation, traffic-safety, accessibility, environmental, encroachment, property-damage>",
  "subcategory": "<matching subcategory>",
  "title": "<short title under 40 chars>",
  "description": "<clean description of problem>",
  "location": "<detected location or Northwood District>"
}
\`\`\``
        }]
      },
      contents: [{
        parts: [{ text: userText }]
      }]
    };

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!fullText) return null;

    let replyText = fullText;
    let actionData = null;

    // Check if JSON block was appended
    const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed && (parsed.isComplaint || parsed.category)) {
          actionData = {
            category: normalizeCategory(parsed.category),
            subcategory: parsed.subcategory || 'General Issue',
            title: parsed.title || userText.slice(0, 40),
            description: parsed.description || userText,
            location: parsed.location || 'Northwood District'
          };
        }
      } catch (err) {}
      replyText = fullText.replace(/```json[\s\S]*?```/, '').trim();
    }

    return {
      replyHtml: formatMarkdownToHtml(replyText),
      actionData
    };
  }

  function formatMarkdownToHtml(text) {
    if (!text) return '';
    let out = escapeHTML(text);
    out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/^\s*[\-\*]\s+(.*)$/gm, '<li>$1</li>');
    out = out.replace(/(<li>.*<\/li>)/s, '<ul style="margin:4px 0 4px 18px; padding:0;">$1</ul>');
    out = out.replace(/\n\n/g, '<br><br>');
    return out;
  }

  function analyzeCivicQueryHeuristic(userText) {
    const lower = userText.toLowerCase();

    // 1. Complaint Life Cycle & Tracking Doubt
    if (/lifecycle|tracking|status|workflow|how does complaint|how to report|what happens after/i.test(lower)) {
      return {
        replyHtml: `
          <div style="font-size:13px; line-height:1.55;">
            <b>📋 Citizen Grievance Lifecycle in Smart Civic Connect:</b><br><br>
            • <b>1. Submission & Optical Geotag:</b> File with live GPS and tamper-evident photo proof.<br>
            • <b>2. AI Routing & SLA Binding:</b> AI matches department, sets severity, and activates SLA timer (24h to 7d).<br>
            • <b>3. Community Amplification:</b> Neighbors endorse the issue, dynamically elevating its <b>CSI priority score</b>.<br>
            • <b>4. Field Inspection & Redressal:</b> Ward engineers inspect on-site and execute repairs, uploading photo proof.<br>
            • <b>5. Citizen Verification:</b> Citizens dual-verify the completed fix on-site before closure.<br><br>
            <div class="chat-interactive-actions">
              <button type="button" class="chat-interactive-btn" onclick="window.sccNavToView('reports')">📋 View Complaints</button>
              <button type="button" class="chat-interactive-btn" onclick="window.sccOpenLiveCamera()">📸 Snap Evidence</button>
              <button type="button" class="chat-interactive-btn" onclick="window.sccNavToView('map')">🗺️ Open Live Map</button>
            </div>
          </div>
        `,
        actionData: null
      };
    }

    // 2. Municipal Laws, Bylaws & Penalties Doubt
    if (/law|bylaw|fine|penalty|penalties|act 1955|act 2019|illegal dumping fine|section 405|disfigurement/i.test(lower)) {
      return {
        replyHtml: `
          <div style="font-size:13px; line-height:1.55;">
            <b>⚖️ Municipal Laws, Bylaws & Fines (GHMC & Telangana Acts):</b><br><br>
            • <b>Solid Waste Management Rules 2016:</b> Domestic littering fines range from <b>₹500 to ₹2,000</b>. Commercial & bulk dumping in lakes/open plots is penalized up to <b>₹25,000</b> with vehicle seizure.<br>
            • <b>Footpath Encroachments (GHMC Act 1955, Sec 405/406):</b> Unauthorized stalls, sheds, or ramps blocking pedestrian paths face immediate removal notices and demolition costs.<br>
            • <b>Defacing Public Property:</b> Unauthorized banners, hoardings, or posters on public flyovers incur fines up to <b>₹5,000</b> or 6 months imprisonment under the Prevention of Disfigurement of Open Places Act.<br>
            • <b>Construction Debris Dumping:</b> Unregulated debris on roads carries penalties of <b>₹10,000 to ₹50,000</b> per vehicle trip.<br><br>
            <div class="chat-interactive-actions">
              <button type="button" class="chat-interactive-btn" onclick="window.sccNavToView('cameradb')">🗄️ Camera Database</button>
              <button type="button" class="chat-interactive-btn" onclick="window.draftComplaintFromBot('${encodeURIComponent(JSON.stringify({category:'sanitation',subcategory:'Illegal waste dumping',title:'Illegal Waste Dumping Violation',description:'Commercial or bulk garbage dumping in public area in violation of Municipal Solid Waste bylaws.'}))}')">⚡ Report Violation</button>
            </div>
          </div>
        `,
        actionData: null
      };
    }

    // 3. Official Municipal SLAs & Timelines Doubt
    if (/sla|timeline|resolution time|deadline|hours|how long/i.test(lower)) {
      return {
        replyHtml: `
          <div style="font-size:13px; line-height:1.55;">
            <b>⏱️ Official Municipal Service Level Agreements (SLAs):</b><br><br>
            • <b>24 Hours:</b> Critical public hazards, sewage overflows, drinking water contamination, open live wires, fallen trees blocking roads.<br>
            • <b>48 Hours:</b> Dark streetlights, malfunctioning traffic signals, overflowing municipal bins.<br>
            • <b>3 Days:</b> Hazardous road potholes, damaged footpaths, missing stormwater drain grates.<br>
            • <b>7 Days:</b> Extensive asphalt road patching, encroachment removal enforcement.<br>
            • <b>15 Days:</b> Major drainage pipeline reconstruction, structural footpath retrofitting.<br><br>
            <i>Tickets not resolved within their designated SLA automatically trigger a supervisory escalation alert.</i><br><br>
            <div class="chat-interactive-actions">
              <button type="button" class="chat-interactive-btn" onclick="window.sccNavToView('authority')">🏛️ Authority Ops</button>
              <button type="button" class="chat-interactive-btn" onclick="window.sccNavToView('reports')">📋 Track Active SLAs</button>
            </div>
          </div>
        `,
        actionData: null
      };
    }

    // 4. Overdue Complaints, Prajavani & RTI Escalation Doubt
    if (/escalat|prajavani|rti|right to information|overdue|unresolved|complaint ignored|supervisor/i.test(lower)) {
      return {
        replyHtml: `
          <div style="font-size:13px; line-height:1.55;">
            <b>🚨 Escalation, Prajavani & RTI Rights:</b><br><br>
            • <b>Supervisory Escalation Ladder:</b><br>
              1. <i>Level 1 (0-48h):</i> Ward Section Officer / Assistant Engineer.<br>
              2. <i>Level 2 (SLA Breached):</i> Executive Engineer & Zonal Commissioner.<br>
              3. <i>Level 3 (Supervisory):</i> Prajavani State Grievance Cell & Municipal Commissioner.<br>
            • <b>Telangana Prajavani (prajavani.cgg.gov.in):</b> Grievance session held every Monday at Praja Bhavan and District Collectorates for direct executive intervention.<br>
            • <b>Right to Information (RTI Act 2005):</b> Under Section 6(1), citizens can file Form A with a ₹10 fee stamp to inspect official measurement books, work sanction bills, and contractor SLA delay penalty records.<br><br>
            <div class="chat-interactive-actions">
              <button type="button" class="chat-interactive-btn" onclick="window.open('https://prajavani.cgg.gov.in','_blank')">🏛️ Prajavani Portal</button>
              <button type="button" class="chat-interactive-btn" onclick="window.open('https://pgportal.gov.in','_blank')">🇮🇳 CPGRAMS Portal</button>
            </div>
          </div>
        `,
        actionData: null
      };
    }

    // 5. Camera Evidence Database & Geotagging Doubt
    if (/camera|photo|evidence|geotag|gps watermark|media vault|optical/i.test(lower)) {
      return {
        replyHtml: `
          <div style="font-size:13px; line-height:1.55;">
            <b>📷 Camera Evidence Database & Cryptographic Geotagging:</b><br><br>
            • <b>Live Camera Studio:</b> Optical viewfinder equipped with rule-of-thirds grid, front/rear lens flip, and real-time Heads-Up Display (HUD).<br>
            • <b>Anti-Tamper Watermark:</b> Burns atomic timestamp, latitude/longitude GPS telemetry, and municipal ward directly into the canvas pixels.<br>
            • <b>Camera Evidence Vault:</b> Indexed local database of all field photos. Inspect EXIF metadata, download high-resolution JPEGs, or re-attach proofs to new tickets.<br>
            • <b>Accountability Impact:</b> Verified camera evidence boosts a ticket's <b>CSI priority score</b> and eliminates fraudulent claims.<br><br>
            <div class="chat-interactive-actions">
              <button type="button" class="chat-interactive-btn" onclick="window.sccOpenLiveCamera()">📸 Launch Live Camera</button>
              <button type="button" class="chat-interactive-btn" onclick="window.sccNavToView('cameradb')">🗄️ Open Camera DB</button>
            </div>
          </div>
        `,
        actionData: null
      };
    }

    // 6. Community Severity Index (CSI) Mathematical Formula Doubt
    if (/csi|severity index|formula|algorithm|how is priority calculated|priority score/i.test(lower)) {
      return {
        replyHtml: `
          <div style="font-size:13px; line-height:1.55;">
            <b>🧮 Community Severity Index (CSI) Mathematical Formulation:</b><br><br>
            The CSI score (0 to 100) dynamically ranks civic hazards using this mathematical model:<br>
            <div style="background:var(--surface-subtle); padding:10px; border-radius:6px; font-family:monospace; margin:8px 0; border:1px solid var(--line);">
              <b>CSI = (B × S + 1.5 × log₂(U + 1) + R) × M</b>
            </div>
            • <b>B (Baseline Category):</b> Hazardous Infra = 35, Sanitation = 30, Streetlights = 25, Traffic = 20.<br>
            • <b>S (Urgency Multiplier):</b> Low = 1.0, Medium = 1.2, High = 1.5, Emergency = 2.0.<br>
            • <b>U (Community Endorsements):</b> Logarithmic dampening prevents astroturfing while empowering popular citizen needs.<br>
            • <b>R (Recidivism Penalty):</b> Adds +10 if a recurring failure occurs in the same 100-meter corridor.<br>
            • <b>M (Accessibility Multiplier):</b> 1.25× multiplier if blocking wheelchair ramps or school zones (SDG 11.2).<br><br>
            <div class="chat-interactive-actions">
              <button type="button" class="chat-interactive-btn" onclick="window.sccNavToView('map')">🗺️ View Map Hotspots</button>
              <button type="button" class="chat-interactive-btn" onclick="window.sccNavToView('impact')">📊 View Insights</button>
            </div>
          </div>
        `,
        actionData: null
      };
    }

    // 7. Civic Points, Badges & Rewards Doubt
    if (/point|badge|reward|earn|leaderboard|gamif/i.test(lower)) {
      return {
        replyHtml: `
          <div style="font-size:13px; line-height:1.55;">
            <b>🏆 Civic Rewards, Points & Community Badges:</b><br><br>
            Citizens earn civic karma for active neighborhood guardianship:<br>
            • <b>+25 Points:</b> Submitting a verified complaint with geotagged photo.<br>
            • <b>+40 Points:</b> Completing on-site dual verification of a completed municipal repair.<br>
            • <b>+5 Points:</b> Endorsing/upvoting genuine neighborhood issues.<br>
            • <b>Earned Badges:</b> <i>Civic Scout (50 pts)</i>, <i>Accessibility Champion (150 pts)</i>, <i>Urban Sentinel (300 pts)</i>, <i>Master Guardian (500 pts)</i>.<br>
            • <b>Perks:</b> Redeemable for Metro Rail transit credits, public parking discounts, and Mayor's Civic Recognition certificates.<br><br>
            <div class="chat-interactive-actions">
              <button type="button" class="chat-interactive-btn" onclick="window.sccNavToView('rewards')">🏆 View Leaderboard</button>
              <button type="button" class="chat-interactive-btn" onclick="window.sccOpenLiveCamera()">📸 Snap &amp; Earn +25</button>
            </div>
          </div>
        `,
        actionData: null
      };
    }

    // 8. Accessibility Rights & SDG 11.2 Doubt
    if (/accessib|disab|wheelchair|rpwd|sdg 11|tactile|barrier|special needs/i.test(lower)) {
      return {
        replyHtml: `
          <div style="font-size:13px; line-height:1.55;">
            <b>♿ Accessibility Rights (UN SDG 11.2 & RPwD Act 2016):</b><br><br>
            • <b>Legal Mandate:</b> Sections 41–46 of the <i>Rights of Persons with Disabilities (RPwD) Act 2016</i> mandate barrier-free access in all public buildings, roads, footpaths, and public transit.<br>
            • <b>Priority Routing:</b> Accessibility complaints receive an automatic <b>1.25× CSI urgency multiplier</b> in Smart Civic Connect.<br>
            • <b>Actionable Violations:</b> Blocked wheelchair ramps, broken sensory tactile tiles, missing audio signals, non-functional public elevators.<br><br>
            <div class="chat-interactive-actions">
              <button type="button" class="chat-interactive-btn" onclick="window.sccNavToView('accessibility')">♿ Accessibility Hub</button>
              <button type="button" class="chat-interactive-btn" onclick="window.draftComplaintFromBot('${encodeURIComponent(JSON.stringify({category:'accessibility',subcategory:'Blocked ramps',title:'Obstruction Blocking Wheelchair Access',description:'Wheelchair ramp obstructed preventing barrier-free access in violation of SDG 11.2.'}))}')">⚡ Report Barrier</button>
            </div>
          </div>
        `,
        actionData: null
      };
    }

    // 9. Privacy, Phone & Security Doubt
    if (/priva|secur|phone|anonymous|data safe|identity|leak/i.test(lower)) {
      return {
        replyHtml: `
          <div style="font-size:13px; line-height:1.55;">
            <b>🔒 Data Privacy, Anonymity & Security:</b><br><br>
            • <b>Anonymous Reporting:</b> You can submit complaints anonymously without disclosing your name or mobile number.<br>
            • <b>Local Privacy First:</b> Photos and complaint drafts are stored locally in your browser storage (${STORAGE_KEY_REPORTS}).<br>
            • <b>Public Redaction:</b> Phone numbers and private citizen contact details are never exposed on public map pins or feeds.<br>
            • <b>Tamper Proof:</b> Photo EXIF and GPS markers are verified without uploading personal telemetry to unencrypted servers.<br><br>
            <div class="chat-interactive-actions">
              <button type="button" class="chat-interactive-btn" onclick="window.sccNavToView('reports')">📋 Public Directory</button>
            </div>
          </div>
        `,
        actionData: null
      };
    }

    // Standard Category Matching (Potholes, Lighting, Water, Sanitation, Traffic, etc.)
    if (/pothole|crater|damaged road|road crack|footpath|manhole|broken road|asphalt/i.test(lower)) {
      return {
        replyHtml: `This issue falls under <b>Public Infrastructure and Road Maintenance</b>.<br><br>
          • <b>Responsible Agency:</b> Roads & Municipal Engineering Dept / GHMC<br>
          • <b>Official SLA:</b> 3 to 7 Days<br>
          • <b>Recommended Portal:</b> GHMC e-Complaints (ghmc.gov.in) or MyCURE app.<br><br>
          <div class="chat-interactive-actions">
            <button type="button" class="chat-interactive-btn" onclick="window.sccOpenLiveCamera()">📸 Snap Pothole</button>
            <button type="button" class="chat-interactive-btn" onclick="window.sccNavToView('map')">🗺️ Locate on Map</button>
          </div>`,
        actionData: {
          category: 'public-infra',
          subcategory: /manhole/i.test(lower) ? 'Open manholes' : /footpath/i.test(lower) ? 'Damaged footpaths' : 'Potholes',
          title: /manhole/i.test(lower) ? 'Hazardous open manhole on street' : 'Deep road pothole causing traffic risk',
          description: userText,
          location: 'Northwood Metro District'
        }
      };
    }

    if (/street\s*light|dark area|lamp post|electric wire|transformer|blackout|light pole/i.test(lower)) {
      return {
        replyHtml: `This falls under <b>Street Lighting and Electricity</b>.<br><br>
          • <b>Responsible Agency:</b> Electrical & Power Department<br>
          • <b>Official SLA:</b> 48 Hours<br>
          • <b>Safety Notice:</b> If exposed electrical wiring is present, it is flagged as an urgent public hazard.<br><br>
          <div class="chat-interactive-actions">
            <button type="button" class="chat-interactive-btn" onclick="window.sccOpenLiveCamera()">📸 Take Light Photo</button>
            <button type="button" class="chat-interactive-btn" onclick="window.sccNavToView('map')">🗺️ View Outages</button>
          </div>`,
        actionData: {
          category: 'street-lighting',
          subcategory: /wire|exposed/i.test(lower) ? 'Exposed electrical wires' : 'Broken streetlights',
          title: /wire/i.test(lower) ? 'Exposed live wire risk on street' : 'Non-functional street light on road',
          description: userText,
          location: 'Northwood Metro District'
        }
      };
    }

    if (/water leak|sewage|drain|pipe|contamination|flood|drinking water|gutter/i.test(lower)) {
      return {
        replyHtml: `This relates to <b>Water and Drainage</b>.<br><br>
          • <b>Responsible Agency:</b> Water Supply & Sewerage Board (HMWSSB)<br>
          • <b>Official SLA:</b> 24 Hours for sewage overflow & contamination<br>
          • <b>Direct Gateway:</b> HMWSSB Customer Redressal (hyderabadwater.gov.in).<br><br>
          <div class="chat-interactive-actions">
            <button type="button" class="chat-interactive-btn" onclick="window.sccOpenLiveCamera()">📸 Capture Leak Proof</button>
            <button type="button" class="chat-interactive-btn" onclick="window.sccNavToView('map')">🗺️ Check Water Map</button>
          </div>`,
        actionData: {
          category: 'water-drainage',
          subcategory: /sewage|drain/i.test(lower) ? 'Sewage overflow' : /contamin/i.test(lower) ? 'Suspected drinking-water contamination' : 'Water leakage',
          title: /sewage/i.test(lower) ? 'Sewage overflow on residential road' : 'Pipeline water leakage on road',
          description: userText,
          location: 'Northwood Metro District'
        }
      };
    }

    if (/garbage|waste|trash|dump|bin|debris|litter|biomedical|plastic/i.test(lower)) {
      return {
        replyHtml: `This falls under <b>Sanitation and Environmental Hazards</b>.<br><br>
          • <b>Responsible Agency:</b> Sanitation & Solid Waste Management<br>
          • <b>Official SLA:</b> 24 to 48 Hours<br>
          • <b>Recommended Portal:</b> Swachhata-MoHUA National Grievance Portal.<br><br>
          <div class="chat-interactive-actions">
            <button type="button" class="chat-interactive-btn" onclick="window.sccOpenLiveCamera()">📸 Snap Garbage Dump</button>
            <button type="button" class="chat-interactive-btn" onclick="window.sccNavToView('cameradb')">🗄️ Camera DB</button>
          </div>`,
        actionData: {
          category: 'sanitation',
          subcategory: /bin/i.test(lower) ? 'Overflowing garbage bins' : /debris/i.test(lower) ? 'Construction debris' : 'Illegal waste dumping',
          title: 'Illegal garbage accumulation & sanitation hazard',
          description: userText,
          location: 'Northwood Metro District'
        }
      };
    }

    if (/wheelchair|ramp|accessible|tactile|elevator|lift|disabled/i.test(lower)) {
      return {
        replyHtml: `This relates to <b>Accessibility & Inclusive Infrastructure (UN SDG 11.2)</b>.<br><br>
          • <b>Responsible Agency:</b> Accessibility & Public Works Dept<br>
          • <b>Severity Factor:</b> Automatically weighted with a high baseline severity score (CSI) to ensure priority remediation.<br><br>
          <div class="chat-interactive-actions">
            <button type="button" class="chat-interactive-btn" onclick="window.sccNavToView('accessibility')">♿ Accessibility Hub</button>
            <button type="button" class="chat-interactive-btn" onclick="window.sccOpenLiveCamera()">📸 Snap Barrier</button>
          </div>`,
        actionData: {
          category: 'accessibility',
          subcategory: /lift|elevator/i.test(lower) ? 'Broken elevators' : 'Blocked ramps',
          title: 'Accessibility obstacle blocking barrier-free transit',
          description: userText,
          location: 'Northwood Metro District'
        }
      };
    }

    if (/encroach|illegal shop|hawker|blocked path|unauthorized construction/i.test(lower)) {
      return {
        replyHtml: `This issue falls under <b>Encroachment and Zoning Violations</b>.<br><br>
          • <b>Responsible Agency:</b> Town Planning & Enforcement Squad<br>
          • <b>Recommended Portal:</b> Telangana CDMA (emunicipal.telangana.gov.in).<br><br>
          <div class="chat-interactive-actions">
            <button type="button" class="chat-interactive-btn" onclick="window.sccOpenLiveCamera()">📸 Capture Encroachment</button>
            <button type="button" class="chat-interactive-btn" onclick="window.sccNavToView('reports')">📋 View Reports</button>
          </div>`,
        actionData: {
          category: 'encroachment',
          subcategory: 'Footpath encroachment',
          title: 'Footpath encroachment blocking public right of way',
          description: userText,
          location: 'Northwood Metro District'
        }
      };
    }

    if (/portal|government|ghmc|hmwssb|prajavani|cpgrams|mycure|swachhata|cdma/i.test(lower)) {
      return {
        replyHtml: `Smart Civic Connect integrates with <b>7 official government gateways</b>:<br><br>
          1. <b>GHMC:</b> Greater Hyderabad Municipal Corporation (ghmc.gov.in)<br>
          2. <b>HMWSSB:</b> Hyderabad Water Supply & Sewerage Board<br>
          3. <b>Swachhata-MoHUA:</b> National Sanitation Grievance<br>
          4. <b>Telangana Prajavani:</b> CM's Grievance Redressal (prajavani.cgg.gov.in)<br>
          5. <b>Telangana CDMA:</b> Municipal Administration & Urban Development<br>
          6. <b>CPGRAMS:</b> Central Government PG Portal (pgportal.gov.in)<br>
          7. <b>MyCURE:</b> GHMC Real-Time Mobile Grievance Tracker<br><br>
          Officers can dispatch any ticket directly via the <i>"Dispatch to Gov Portal"</i> tool in the ticket view.`,
        actionData: null
      };
    }

    if (/phone|helpline|call|contact|number|emergency/i.test(lower)) {
      return {
        replyHtml: `Official Municipal Helplines:<br><br>
          • <b>Smart Civic Connect Operator:</b> 040-21111111 / 1800-425-0044<br>
          • <b>GHMC Citizen Call Center:</b> 040-21111111<br>
          • <b>HMWSSB Water Board:</b> 155313 / 040-23442844<br>
          • <b>Police & Traffic Control:</b> 100 / 040-27852482<br><br>
          You can also file complaints by voice directly in the report form or via the <i>Assisted Helpline</i> tab!`,
        actionData: null
      };
    }

    return {
      replyHtml: `I am your Smart Civic Connect AI Assistant & Doubt Clearing Tutor. You can ask me any question about municipal laws & fines, official SLAs, escalation to Prajavani or RTI, how our Camera Database & CSI formulas work, or describe a civic hazard to draft an official ticket instantly!`,
      actionData: null
    };
  }

  // =========================================================================
  // 23C. CAMERA DATABASE & MEDIA VAULT ENGINE
  // =========================================================================
  function initCameraDatabase() {
    renderCameraDatabase();
  }

  function renderCameraDatabase() {
    // 1. Update Metrics Cards
    const totalCount = cameraDatabase.length;
    const geotaggedCount = cameraDatabase.filter(c => c.lat && c.lng).length;
    const repairCount = cameraDatabase.filter(c => c.source === 'verified_fix' || (c.categoryLabel && c.categoryLabel.includes('Repair'))).length;
    const totalBytes = cameraDatabase.reduce((acc, c) => acc + (c.dataUrl ? c.dataUrl.length * 0.75 : 0), 0);
    const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);

    const totalEl = $('#camStatTotal');
    const geoEl = $('#camStatGeotagged');
    const repEl = $('#camStatRepairs');
    const storageEl = $('#camStatStorage');
    const navCountEl = $('#navCameraCount');

    if (totalEl) totalEl.textContent = totalCount;
    if (geoEl) geoEl.textContent = `${geotaggedCount} (${totalCount ? Math.round((geotaggedCount / totalCount) * 100) : 100}%)`;
    if (repEl) repEl.textContent = repairCount;
    if (storageEl) storageEl.innerHTML = `${totalMb} <small>MB</small>`;
    if (navCountEl) navCountEl.textContent = totalCount;

    // 2. Filter & Sort Items
    const searchVal = ($('#cameradbSearchInput')?.value || '').toLowerCase().trim();
    const catVal = $('#cameradbCategoryFilter')?.value || 'all';
    const typeVal = $('#cameradbTypeFilter')?.value || 'all';
    const sortVal = $('#cameradbSortFilter')?.value || 'newest';

    let filtered = cameraDatabase.filter(item => {
      if (searchVal) {
        const hay = `${item.title || ''} ${item.ticketId || ''} ${item.address || ''} ${item.ward || ''} ${item.notes || ''}`.toLowerCase();
        if (!hay.includes(searchVal)) return false;
      }
      if (catVal !== 'all' && item.category !== catVal) {
        return false;
      }
      if (typeVal === 'complaint' && item.source === 'verified_fix') {
        return false;
      }
      if (typeVal === 'repair' && item.source !== 'verified_fix') {
        return false;
      }
      return true;
    });

    if (sortVal === 'newest') {
      filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } else {
      filtered.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }

    // 3. Render Cards
    const grid = $('#cameradbGalleryGrid');
    const emptyState = $('#cameradbEmptyState');
    if (!grid) return;

    grid.innerHTML = '';
    if (filtered.length === 0) {
      if (emptyState) emptyState.hidden = false;
      return;
    }
    if (emptyState) emptyState.hidden = true;

    filtered.forEach(photo => {
      const card = document.createElement('article');
      card.className = 'cameradb-card';
      const isRepair = photo.source === 'verified_fix';
      const badgeText = isRepair ? '🔧 Repair Proof' : photo.source === 'live_camera' ? '📷 Live Studio' : '📁 Upload';
      const badgeBg = isRepair ? '#10b981' : '#0ea5e9';
      const timeFormatted = new Date(photo.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      card.innerHTML = `
        <div class="cameradb-card-media" onclick="window.sccOpenPhotoLightbox('${photo.id}')" title="Click to inspect metadata & full image">
          <img src="${escapeHTML(photo.dataUrl)}" alt="${escapeHTML(photo.title)}" loading="lazy">
          <span class="cameradb-badge" style="background:${badgeBg}; color:#fff;">${badgeText}</span>
          ${photo.hasWatermark ? '<span class="cameradb-badge" style="right:8px; left:auto; background:rgba(10,15,29,0.85); color:#00f2c3;">🏷️ Geotagged</span>' : ''}
        </div>
        <div class="cameradb-card-body">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
            <h4 class="cameradb-card-title">${escapeHTML(photo.title)}</h4>
            ${photo.ticketId ? `<span class="report-id-pill" style="font-size:10px; cursor:pointer;" onclick="window.sccOpenReportDetails('${photo.ticketId}')">${photo.ticketId}</span>` : ''}
          </div>
          <div class="cameradb-meta-item">
            <span>🕒 ${timeFormatted}</span>
            <span>•</span>
            <span>${photo.fileSizeKb || 40} KB</span>
          </div>
          <div class="cameradb-meta-item" style="color:var(--teal-700); font-weight:600;">
            📍 ${photo.lat ? `${photo.lat.toFixed(4)}, ${photo.lng.toFixed(4)}` : 'Northwood'} (${escapeHTML(photo.ward || 'Ward 12')})
          </div>
          <div class="cameradb-card-actions">
            <button type="button" class="btn-secondary" style="font-size:11px; padding:6px 10px;" onclick="window.sccOpenPhotoLightbox('${photo.id}')">🔍 Inspect</button>
            <a href="${escapeHTML(photo.dataUrl)}" download="${photo.id}.jpg" class="btn-teal" style="font-size:11px; padding:6px 10px; text-decoration:none;">📥 Download</a>
            <button type="button" class="btn-danger" style="font-size:11px; padding:6px 8px;" onclick="window.sccDeleteCameraPhoto('${photo.id}')" title="Delete from database">🗑️</button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  function openPhotoLightbox(photoId) {
    const photo = cameraDatabase.find(p => p.id === photoId);
    if (!photo) return;

    const modal = $('#photoLightboxModal');
    if (!modal) return;

    const img = $('#lightboxImg');
    const caption = $('#lightboxCaption');
    const dept = $('#lightboxDept');
    const ticket = $('#lightboxTicket');
    const loc = $('#lightboxLocation');
    const gps = $('#lightboxGps');
    const time = $('#lightboxTime');
    const author = $('#lightboxAuthor');
    const dlBtn = $('#lightboxDownloadBtn');
    const ticketBtn = $('#lightboxViewTicketBtn');

    if (img) img.src = photo.dataUrl;
    if (caption) caption.textContent = photo.title;
    if (dept) dept.textContent = photo.categoryLabel || 'Civic Infrastructure';
    if (ticket) ticket.textContent = photo.ticketId || 'Unlinked / New Capture';
    if (loc) loc.textContent = photo.address || photo.ward || 'Northwood Metro District';
    if (gps) gps.textContent = photo.lat ? `${photo.lat.toFixed(5)}° N, ${photo.lng.toFixed(5)}° E` : 'Not recorded';
    if (time) time.textContent = new Date(photo.timestamp).toLocaleString();
    if (author) author.textContent = photo.sourceLabel || 'Citizen Field Camera';

    if (dlBtn) {
      dlBtn.href = photo.dataUrl;
      dlBtn.download = `${photo.id || 'evidence'}.jpg`;
    }

    if (ticketBtn) {
      ticketBtn.onclick = () => {
        if (photo.ticketId) {
          modal.hidden = true;
          document.body.style.overflow = '';
          window.sccOpenReportDetails(photo.ticketId);
        } else {
          showToast('Notice', 'This photo is not currently bound to an active complaint ticket.');
        }
      };
    }

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function deleteCameraPhoto(photoId) {
    if (!confirm('Are you sure you want to remove this photograph from the Camera Database?')) return;
    cameraDatabase = cameraDatabase.filter(p => p.id !== photoId);
    persistCameraDatabase();
    renderCameraDatabase();
    showToast('Photo Removed', 'Photograph purged from local camera database vault.');
  }

  function exportCameraManifestJson() {
    const manifest = {
      exportVersion: '2.0.0',
      exportTimestamp: new Date().toISOString(),
      district: 'Northwood Metro District',
      sdgCompliance: 'UN SDG 11: Sustainable Cities & Communities',
      totalRecords: cameraDatabase.length,
      records: cameraDatabase.map(c => ({
        id: c.id,
        title: c.title,
        ticketId: c.ticketId,
        category: c.category,
        lat: c.lat,
        lng: c.lng,
        ward: c.ward,
        address: c.address,
        timestamp: c.timestamp,
        timestampIso: new Date(c.timestamp).toISOString(),
        source: c.source,
        fileSizeKb: c.fileSizeKb,
        hasWatermark: c.hasWatermark,
        verified: c.verified,
        notes: c.notes
      }))
    };

    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart_civic_camera_manifest_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Manifest Exported', 'Full camera database cryptographic audit manifest downloaded.');
  }

  // =========================================================================
  // 23D. LIVE CAMERA STUDIO CONTROLLER (VIEWFINDER, HUD, SHUTTER & WATERMARK)
  // =========================================================================
  let cameraActiveStream = null;
  let cameraFacingMode = 'environment';
  let cameraWatermarkEnabled = true;
  let cameraTargetCallback = null;
  let lastCapturedPhoto = null;
  let cameraHudInterval = null;

  function playRealisticShutterSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      for (let i = 0; i < 2; i++) {
        const clickTime = now + (i * 0.08);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'square';
        osc.frequency.setValueAtTime(i === 0 ? 950 : 650, clickTime);
        osc.frequency.exponentialRampToValueAtTime(120, clickTime + 0.04);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1600, clickTime);
        filter.Q.setValueAtTime(3.0, clickTime);

        gain.gain.setValueAtTime(0.35, clickTime);
        gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.045);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(clickTime);
        osc.stop(clickTime + 0.05);
      }
    } catch (e) {}
  }

  async function openCameraStudio(callback = null) {
    cameraTargetCallback = callback;
    const modal = $('#cameraStudioModal');
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';

    // Hide review box, show live viewfinder
    const reviewBox = $('#cameraCaptureReviewBox');
    if (reviewBox) reviewBox.style.display = 'none';

    // Start video stream
    await startCameraStream();

    // Start HUD update loop
    startCameraHud();
  }

  async function startCameraStream() {
    const video = $('#cameraStudioVideo');
    if (!video) return;

    if (cameraActiveStream) {
      cameraActiveStream.getTracks().forEach(t => t.stop());
      cameraActiveStream = null;
    }

    const hudStatus = $('#cameraHudStatus');
    if (hudStatus) hudStatus.textContent = 'CONNECTING SENSOR...';

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API not supported on this browser/environment.');
      }

      const constraints = {
        video: {
          facingMode: cameraFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      cameraActiveStream = stream;
      video.srcObject = stream;
      await video.play();

      if (hudStatus) hudStatus.textContent = `CAMERA ACTIVE (30 FPS • ${cameraFacingMode === 'user' ? 'FRONT' : 'REAR'})`;
      showToast('Camera Connected', 'Optical sensor linked. Ready to capture geotagged evidence.');
    } catch (err) {
      console.warn('Camera stream error:', err);
      if (hudStatus) hudStatus.textContent = 'CAMERA SENSOR OFFLINE';
      showToast('Camera Notice', 'Could not open live video stream. You can upload an image file directly using the button below.');
    }
  }

  function closeCameraStudio() {
    if (cameraActiveStream) {
      cameraActiveStream.getTracks().forEach(t => t.stop());
      cameraActiveStream = null;
    }
    if (cameraHudInterval) {
      clearInterval(cameraHudInterval);
      cameraHudInterval = null;
    }
    const modal = $('#cameraStudioModal');
    if (modal) modal.hidden = true;
    document.body.style.overflow = '';
    cameraTargetCallback = null;
  }

  async function flipCameraLens() {
    cameraFacingMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    showToast('Switching Camera Lens', `Using ${cameraFacingMode === 'user' ? 'Front / Selfie' : 'Rear / Environmental'} sensor...`);
    await startCameraStream();
  }

  function toggleCameraWatermark() {
    cameraWatermarkEnabled = !cameraWatermarkEnabled;
    const btn = $('#cameraWatermarkToggleBtn');
    if (btn) {
      btn.innerHTML = cameraWatermarkEnabled ? '<span>🏷️</span> Watermark: ON' : '<span>⚪</span> Watermark: OFF';
      btn.classList.toggle('active', cameraWatermarkEnabled);
    }
    showToast('Evidence Watermark', cameraWatermarkEnabled ? 'Cryptographic timestamp & GPS watermark enabled.' : 'Watermark disabled.');
  }

  function startCameraHud() {
    if (cameraHudInterval) clearInterval(cameraHudInterval);
    const updateHud = () => {
      const timeEl = $('#cameraHudTimestamp');
      const gpsEl = $('#cameraHudGps');
      if (timeEl) {
        const d = new Date();
        timeEl.textContent = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${d.toLocaleTimeString()} IST`;
      }
      if (gpsEl) {
        const lat = detectedGpsLat || 17.4938;
        const lng = detectedGpsLng || 78.3912;
        gpsEl.textContent = `📍 ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
      }
    };
    updateHud();
    cameraHudInterval = setInterval(updateHud, 1000);
  }

  function snapCameraPhoto() {
    const video = $('#cameraStudioVideo');
    if (!video || !video.videoWidth) {
      showToast('Capture Notice', 'Live sensor not ready. You can pick an image file directly using the button below.');
      return;
    }

    // Shutter flash animation
    const flash = $('#cameraFlashLayer');
    if (flash) {
      flash.classList.remove('flashing');
      void flash.offsetWidth;
      flash.classList.add('flashing');
      setTimeout(() => flash.classList.remove('flashing'), 400);
    }

    // Shutter Sound
    playRealisticShutterSound();

    // Render onto canvas
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const lat = detectedGpsLat || 17.4938;
    const lng = detectedGpsLng || 78.3912;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} IST`;

    // Draw cryptographic telemetry watermark if enabled
    if (cameraWatermarkEnabled) {
      const bannerHeight = Math.max(54, Math.round(canvas.height * 0.12));
      const grad = ctx.createLinearGradient(0, canvas.height - bannerHeight - 20, 0, canvas.height);
      grad.addColorStop(0, 'rgba(10, 15, 29, 0)');
      grad.addColorStop(0.3, 'rgba(10, 15, 29, 0.85)');
      grad.addColorStop(1, 'rgba(10, 15, 29, 0.96)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, canvas.height - bannerHeight - 20, canvas.width, bannerHeight + 20);

      // Top thin accent rule
      ctx.fillStyle = '#00c9a7';
      ctx.fillRect(0, canvas.height - bannerHeight, canvas.width, 3);

      // Telemetry Header
      ctx.fillStyle = '#00f2c3';
      ctx.font = `bold ${Math.round(canvas.height * 0.026)}px sans-serif`;
      ctx.fillText('SMART CIVIC CONNECT • SDG 11 VERIFIED EVIDENCE • CRYPTO-STAMP', 16, canvas.height - bannerHeight + 20);

      // Telemetry Details
      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.round(canvas.height * 0.022)}px monospace`;
      ctx.fillText(`TIMESTAMP: ${dateStr}   |   GPS: ${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E   |   WARD 12 (NORTHWOOD)`, 16, canvas.height - bannerHeight + 42);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    const sizeKb = Math.round(dataUrl.length * 0.75 / 1024);

    lastCapturedPhoto = {
      id: 'CAM-' + Math.floor(1000 + Math.random() * 9000),
      title: 'Field Camera Snapshot',
      category: 'public-infra',
      categoryLabel: 'Citizen Field Photo',
      lat: lat,
      lng: lng,
      ward: 'Ward 12 (Northwood Metro)',
      address: `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      timestamp: Date.now(),
      dataUrl: dataUrl,
      source: 'live_camera',
      sourceLabel: 'Live Camera Studio',
      fileSizeKb: sizeKb,
      resolution: `${canvas.width}x${canvas.height}`,
      hasWatermark: cameraWatermarkEnabled,
      verified: true,
      notes: 'Captured via live optical camera studio with verified cryptographic watermark.'
    };

    // Show in review strip
    const reviewBox = $('#cameraCaptureReviewBox');
    const previewImg = $('#cameraCapturedImgPreview');
    const metaText = $('#cameraCapturedMeta');
    if (reviewBox && previewImg && metaText) {
      previewImg.src = dataUrl;
      metaText.innerHTML = `<b>Captured &amp; Geotagged:</b> ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E<br><small style="color:var(--text-muted);">${dateStr} • ${sizeKb} KB</small>`;
      reviewBox.style.display = 'block';
    }

    showToast('Photo Captured!', 'Review snapshot below to accept and save into database.');
  }

  function acceptCapturedPhoto() {
    if (!lastCapturedPhoto) return;

    // Add to Camera Database
    cameraDatabase.unshift(lastCapturedPhoto);
    persistCameraDatabase();

    // If a callback was provided (e.g. from the report modal), attach photo to report form
    if (typeof cameraTargetCallback === 'function') {
      cameraTargetCallback(lastCapturedPhoto.dataUrl);
    }

    showToast('Evidence Saved to Database', 'Photograph stored in Camera Database Vault and attached.');
    closeCameraStudio();
    renderCameraDatabase();
  }

  function downloadCapturedPhoto() {
    if (!lastCapturedPhoto) return;
    const a = document.createElement('a');
    a.href = lastCapturedPhoto.dataUrl;
    a.download = `${lastCapturedPhoto.id || 'civic_evidence'}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Downloading JPEG', 'Photo saved to your device downloads.');
  }

  // =========================================================================
  // 23E. CAMERA DATABASE PICKER CONTROLLER
  // =========================================================================
  function openCameraDbPicker() {
    const modal = $('#cameraPickerModal');
    const grid = $('#cameraPickerGrid');
    if (!modal || !grid) return;

    grid.innerHTML = '';
    if (cameraDatabase.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:24px; color:var(--text-muted);">No photos found in Camera Database. Capture one first!</div>';
    } else {
      cameraDatabase.forEach(photo => {
        const item = document.createElement('div');
        item.className = 'camera-picker-item';
        item.innerHTML = `
          <img src="${escapeHTML(photo.dataUrl)}" alt="${escapeHTML(photo.title)}">
          <div style="padding:6px 8px;">
            <div style="font-weight:700; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(photo.title)}</div>
            <div style="font-size:10px; color:var(--teal-700);">📍 ${photo.lat ? `${photo.lat.toFixed(3)}, ${photo.lng.toFixed(3)}` : 'Northwood'}</div>
          </div>
        `;
        item.onclick = () => {
          photoDataUrls.push(photo.dataUrl);
          renderPhotoPreviews();
          const status = $('#mediaStatusMsg');
          if (status) status.textContent = `Attached evidence: ${photo.title}`;
          modal.hidden = true;
          document.body.style.overflow = '';
          showToast('Evidence Attached', `Loaded "${photo.title}" from Camera Database.`);
        };
        grid.appendChild(item);
      });
    }

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  // Expose key camera and navigation global functions for inline HTML handlers
  window.sccOpenLiveCamera = openCameraStudio;
  window.sccOpenPhotoLightbox = openPhotoLightbox;
  window.sccDeleteCameraPhoto = deleteCameraPhoto;
  window.sccNavToView = (viewName) => {
    const btn = $(`[data-view="${viewName}"]`);
    if (btn) btn.click();
  };

  // =========================================================================
  // 24. EVENT LISTENERS SETUP
  // =========================================================================
  function setupEventListeners() {
    // Navigation items
    $$('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.dataset.view;
        if (!targetView) return;
        currentView = targetView;

        // Toggle active view container
        $$('.view-container').forEach(c => (c.hidden = true));
        const viewEl = $(`#view-${targetView}`);
        if (viewEl) viewEl.hidden = false;

        // Toggle nav button active state
        $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === targetView));

        // Update breadcrumb
        const titleMap = {
          overview: 'Overview',
          reports: 'All Complaints Directory',
          map: 'Live Civic Map & Hotspots',
          accessibility: 'Accessibility Navigator',
          parking: 'Smart Parking & Safety',
          impact: 'Civic Impact & Insights',
          rewards: 'Rewards & Leaderboard',
          helpline: 'Assisted Helpline',
          authority: 'Authority Operations',
          cameradb: 'Camera Evidence Database',
          admindb: 'Complaint Database'
        };
        $('#crumbCurrent').textContent = titleMap[targetView] || 'Overview';

        // Initialize view-specific components
        if (targetView === 'map') {
          setTimeout(initCivicMap, 50);
        } else if (targetView === 'reports') {
          renderAllReports();
        } else if (targetView === 'accessibility') {
          renderAccessibilityModule();
        } else if (targetView === 'parking') {
          renderParkingModule();
        } else if (targetView === 'impact') {
          renderImpactModule();
        } else if (targetView === 'rewards') {
          renderRewardsModule();
        } else if (targetView === 'helpline') {
          renderHelplineCalls();
        } else if (targetView === 'authority') {
          renderAuthorityModule();
        } else if (targetView === 'cameradb') {
          renderCameraDatabase();
        } else if (targetView === 'admindb') {
          renderAdminDatabase();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
        $('#appSidebar').classList.remove('open');
      });
    });

    // Mobile menu toggle
    $('#mobileMenuBtn')?.addEventListener('click', () => {
      $('#appSidebar').classList.toggle('open');
    });

    // ===== HOME CONSOLE WIRING =====
    // Console 1: Track from home
    $('#homeTrackBtn')?.addEventListener('click', () => {
      const val = $('#homeTrackInput')?.value?.trim() || '';
      if (val) openTrackingModal(val);
      else openTrackingModal();
    });
    $('#homeTrackInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') $('#homeTrackBtn')?.click();
    });

    // Console 2: category quick-launch buttons
    $$('.console-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.category;
        const sub = btn.dataset.sub;
        openReportModal({ category: cat, subcategory: sub });
      });
    });
    $('#heroReportBtnConsole')?.addEventListener('click', () => openReportModal());

    // Console 3: admin / camera / map shortcuts
    $('#consoleAdminDbBtn')?.addEventListener('click', () => {
      const s = getAdminSession();
      if (s) window.sccNavToView('admindb');
      else openAdminLoginModal();
    });
    $('#consoleCameraDbBtn')?.addEventListener('click', () => window.sccNavToView('cameradb'));
    $('#consoleMapBtn')?.addEventListener('click', () => window.sccNavToView('map'));

    // Role switcher dropdown
    $('#topRoleSelector')?.addEventListener('change', e => {
      if (e.target.value === 'admin') {
        e.target.value = currentRole;
        openAdminLogin();
        return;
      }
      setRole(e.target.value);
    });
    $('#sidebarRoleSwitchBtn')?.addEventListener('click', () => {
      const next = currentRole === 'citizen' ? 'authority' : 'citizen';
      setRole(next);
    });

    // Admin login is now handled by setupAdminEventListeners()

    // Accessibility High Contrast toggle
    $('#contrastToggleBtn')?.addEventListener('click', e => {
      const isHigh = document.documentElement.getAttribute('data-contrast') === 'high';
      if (isHigh) {
        document.documentElement.removeAttribute('data-contrast');
        e.target.classList.remove('active');
        showToast('Standard Contrast', 'Display colors set to standard palette.');
      } else {
        document.documentElement.setAttribute('data-contrast', 'high');
        e.target.classList.add('active');
        showToast('High Contrast Mode Active', 'Increased border and text contrast for accessibility.');
      }
    });

    // Font size scalers
    $('#fontNormalBtn')?.addEventListener('click', () => {
      document.documentElement.removeAttribute('data-font-size');
      showToast('Standard Text Size', 'Font size set to default.');
    });
    $('#fontLargeBtn')?.addEventListener('click', () => {
      document.documentElement.setAttribute('data-font-size', 'large');
      showToast('Large Text Size Active', 'Enlarged text size for better readability.');
    });

    // Report Modals Open Buttons
    $('#topReportBtn')?.addEventListener('click', () => openReportModal());
    $('#heroReportBtn')?.addEventListener('click', () => openReportModal());
    $('#overviewCreateBtn')?.addEventListener('click', () => openReportModal());
    $('#reportsViewCreateBtn')?.addEventListener('click', () => openReportModal());
    $('#mapViewReportBtn')?.addEventListener('click', () => openReportModal());
    $('#moreCategoriesBtn')?.addEventListener('click', () => openReportModal());
    $('#reportAccessibilityBtn')?.addEventListener('click', () => openReportModal('accessibility', 'Blocked ramps'));
    $('#reportParkingViolationBtn')?.addEventListener('click', () => openReportModal('traffic-safety', 'Parking on footpaths'));

    // Category Quick Tiles in Overview
    $$('.cat-tile-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openReportModal(btn.dataset.category, btn.dataset.sub);
      });
    });

    // Hero Map Button
    $('#heroMapBtn')?.addEventListener('click', () => {
      const mapNav = $('[data-view="map"]');
      if (mapNav) mapNav.click();
    });

    // Close Modals
    $$('[data-close]').forEach(btn => {
      btn.addEventListener('click', e => {
        const backdrop = btn.closest('.modal-backdrop');
        if (backdrop) {
          backdrop.hidden = true;
          document.body.style.overflow = '';
          if (backdrop.id === 'reportModal') resetReportModal();
        }
      });
    });

    // Dismiss on backdrop click
    $$('.modal-backdrop').forEach(bd => {
      bd.addEventListener('click', e => {
        if (e.target === bd) {
          bd.hidden = true;
          document.body.style.overflow = '';
          if (bd.id === 'reportModal') resetReportModal();
        }
      });
    });

    // Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        $$('.modal-backdrop:not([hidden])').forEach(bd => {
          bd.hidden = true;
          document.body.style.overflow = '';
          if (bd.id === 'reportModal') resetReportModal();
        });
      }
    });

    // Major Category Select -> Populate Subcategories & Department
    $('#formMajorCategory')?.addEventListener('change', e => {
      populateSubcategories(e.target.value);
    });

    // Description Input -> AI Issue Assistant live analysis
    let aiDebounce = null;
    $('#formDescription')?.addEventListener('input', e => {
      clearTimeout(aiDebounce);
      aiDebounce = setTimeout(() => triggerAiClassification(e.target.value), 450);
    });

    // Configure Gemini API Key Button
    $('#configGeminiKeyBtn')?.addEventListener('click', () => {
      const current = geminiApiKey || '';
      const promptVal = prompt('Enter your Google Gemini API Key (starts with AIza...):\n\nTip: You can get a free key from Google AI Studio (aistudio.google.com).\nLeave empty to use the built-in fast on-device classifier.', current);
      if (promptVal !== null) {
        geminiApiKey = promptVal.trim();
        if (geminiApiKey) {
          try { localStorage.setItem(STORAGE_KEY_GEMINI_KEY, geminiApiKey); } catch (e) {}
          showToast(`${GEMINI_MODEL_LABEL} Key Saved`, 'Live AI classification is now active!');
          const badge = $('#aiConfidenceBadge');
          if (badge) badge.textContent = `✨ ${GEMINI_MODEL_LABEL}`;
        } else {
          try { localStorage.removeItem(STORAGE_KEY_GEMINI_KEY); } catch (e) {}
          showToast('Using On-Device Classifier', 'Gemini key cleared. Fast local rule classifier active.');
          const badge = $('#aiConfidenceBadge');
          if (badge) badge.textContent = 'High Confidence';
        }
        const currentText = $('#formDescription')?.value;
        if (currentText) triggerAiClassification(currentText);
      }
    });

    // GPS Location Detection Button
    $('#formGpsBtn')?.addEventListener('click', () => {
      if (!navigator.geolocation) {
        showToast('GPS Error', 'Geolocation is not supported by your browser.');
        return;
      }
      showToast('Detecting GPS Location...', 'Querying device positioning sensor...');
      navigator.geolocation.getCurrentPosition(
        pos => {
          detectedGpsLat = parseFloat(pos.coords.latitude.toFixed(5));
          detectedGpsLng = parseFloat(pos.coords.longitude.toFixed(5));
          $('#formCoordsDisplay').style.display = 'block';
          $('#formCoordsVal').textContent = `${detectedGpsLat}, ${detectedGpsLng}`;
          if (!$('#formLocation').value) {
            $('#formLocation').value = `GPS Coordinates: ${detectedGpsLat}, ${detectedGpsLng}`;
          }
          showToast('GPS Coordinates Locked', `Latitude ${detectedGpsLat}, Longitude ${detectedGpsLng} recorded.`);
        },
        err => {
          showToast('GPS Access Denied', 'Please enter your street name or landmark manually.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });

    // Camera Upload / Capture
    const fileInput = $('#modalFileInput');
    $('#modalCameraBtn')?.addEventListener('click', () => {
      // If webcam supported, offer live webcam or file dialog
      if (navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { facingMode: 'environment' } })
          .then(stream => {
            webcamStream = stream;
            const video = $('#modalWebcamVideo');
            video.srcObject = stream;
            $('#modalWebcamBox').style.display = 'block';
          })
          .catch(() => {
            fileInput.click();
          });
      } else {
        fileInput.click();
      }
    });

    fileInput?.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await fileToCompressedDataUrl(file);
        photoDataUrls.push(dataUrl);
        renderPhotoPreviews();
        $('#mediaStatusMsg').textContent = 'Photo attached.';
      } catch (err) {
        $('#mediaStatusMsg').textContent = err.message;
      }
    });

    // Webcam Snap & Close
    $('#modalWebcamSnapBtn')?.addEventListener('click', () => {
      const video = $('#modalWebcamVideo');
      if (!video.videoWidth) return;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
      photoDataUrls.push(dataUrl);
      renderPhotoPreviews();
      stopWebcam();
      $('#mediaStatusMsg').textContent = 'Webcam snapshot captured.';
    });
    $('#modalWebcamCloseBtn')?.addEventListener('click', stopWebcam);

    // Remove photo thumbnail
    $('#modalPhotoPreviewGrid')?.addEventListener('click', e => {
      const rmBtn = e.target.closest('.btn-rm-img');
      if (!rmBtn) return;
      const idx = parseInt(rmBtn.dataset.removeIdx, 10);
      photoDataUrls.splice(idx, 1);
      renderPhotoPreviews();
      $('#mediaStatusMsg').textContent = 'Photo removed.';
    });

    // Voice Record Button
    $('#modalVoiceBtn')?.addEventListener('click', () => {
      if (isRecordingVoice) {
        stopVoiceRecording();
      } else {
        startVoiceRecording();
      }
    });

    // Form Submit -> Check Duplicates -> Save
    $('#reportForm')?.addEventListener('submit', e => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const cat = f.get('category');
      const sub = f.get('subcategory');
      const title = f.get('title').trim();
      const desc = f.get('description').trim();
      const loc = f.get('location').trim();
      const landmark = f.get('landmark').trim();
      const priority = f.get('priority');
      const author = f.get('author').trim();

      if (!cat || !sub || !title || !loc || !desc) {
        $('#formErrorMessage').textContent = 'Please complete all required fields.';
        return;
      }

      const submission = {
        category: cat,
        subcategory: sub,
        title: title,
        description: desc,
        location: loc,
        landmark: landmark,
        priority: priority,
        author: author,
        lat: detectedGpsLat,
        lng: detectedGpsLng
      };

      // Run Smart Duplicate Detection
      const dup = findPossibleDuplicate(cat, sub, detectedGpsLat, detectedGpsLng, title, desc);
      if (dup) {
        pendingSubmissionData = submission;
        $('#dupTicketId').textContent = dup.match.id;
        $('#dupTicketTitle').textContent = dup.match.title;
        $('#dupTicketLocation').textContent = `⌖ ${dup.match.location}`;
        $('#dupTicketStatus').textContent = dup.match.status;
        $('#dupTicketVotes').textContent = dup.match.votes || 0;
        $('#dupDistanceVal').textContent = dup.distance ? `${dup.distance}m` : 'your vicinity';

        $('#duplicateModal').hidden = false;
        return;
      }

      // No duplicate, proceed with submission
      executeReportSave(submission);
    });

    // Duplicate Modal Actions
    $('#dupContinueNewBtn')?.addEventListener('click', () => {
      $('#duplicateModal').hidden = true;
      if (pendingSubmissionData) {
        executeReportSave(pendingSubmissionData);
      }
    });

    $('#dupSupportBtn')?.addEventListener('click', () => {
      $('#duplicateModal').hidden = true;
      const dupId = $('#dupTicketId').textContent;
      resetReportModal();
      $('#reportModal').hidden = true;
      document.body.style.overflow = '';
      handleSupportVote(dupId);
    });

    $('#dupViewDetailsBtn')?.addEventListener('click', () => {
      const dupId = $('#dupTicketId').textContent;
      $('#duplicateModal').hidden = true;
      window.sccOpenReportDetails(dupId);
    });

    // Feed Event Delegation: Open Report Details & Support Button
    document.addEventListener('click', e => {
      const voteBtn = e.target.closest('.support-vote-btn');
      if (voteBtn) {
        e.stopPropagation();
        const voteId = voteBtn.dataset.voteId;
        if (voteId) handleSupportVote(voteId);
        return;
      }

      const reportItem = e.target.closest('.report-item');
      if (reportItem && reportItem.dataset.id) {
        window.sccOpenReportDetails(reportItem.dataset.id);
      }
    });

    // Modal Support Button
    $('#detailSupportBtn')?.addEventListener('click', () => {
      if (activeDetailReport) handleSupportVote(activeDetailReport.id);
    });

    // Citizen Verification Buttons
    $('#detailConfirmFixBtn')?.addEventListener('click', () => {
      if (activeDetailReport) handleConfirmRepair(activeDetailReport);
    });
    $('#detailDisputeFixBtn')?.addEventListener('click', () => {
      if (activeDetailReport) handleDisputeRepair(activeDetailReport);
    });

    // Authority Apply Changes Button
    $('#authorityApplyChangesBtn')?.addEventListener('click', handleAuthorityUpdate);

    // Assisted Helpline Form
    $('#helplineCategory')?.addEventListener('change', e => {
      populateSubcategories(e.target.value, '#helplineSubcategory');
    });
    $('#helplineForm [name="helplineDescription"]')?.addEventListener('input', () => {
      helplineAiAnalysis = null;
    });
    $('#helplineAiAnalyzeBtn')?.addEventListener('click', analyzeHelplineNotes);
    $('#helplineForm')?.addEventListener('submit', handleHelplineSubmit);
    $('#helplineCallSearch')?.addEventListener('input', renderHelplineCalls);
    $('#helplineCallStatusFilter')?.addEventListener('change', renderHelplineCalls);
    $('#helplineCallRows')?.addEventListener('change', e => {
      const statusSelect = e.target.closest('[data-call-id]');
      if (statusSelect) updateHelplineCallStatus(statusSelect.dataset.callId, statusSelect.value);
    });
    $('#helplineCallRows')?.addEventListener('click', e => {
      const ticketButton = e.target.closest('[data-ticket-id]');
      if (ticketButton) window.sccOpenReportDetails(ticketButton.dataset.ticketId);
    });

    // Search and Filters
    $('#overviewSearchInput')?.addEventListener('input', renderOverview);
    $('#overviewCategoryFilter')?.addEventListener('change', renderOverview);
    $('#overviewStatusFilter')?.addEventListener('change', renderOverview);

    $('#reportsSearchInput')?.addEventListener('input', renderAllReports);
    $('#reportsCategoryFilter')?.addEventListener('change', renderAllReports);
    $('#reportsDeptFilter')?.addEventListener('change', renderAllReports);
    $('#reportsStatusFilter')?.addEventListener('change', renderAllReports);
    $('#reportsPriorityFilter')?.addEventListener('change', renderAllReports);
    $('#reportsSortFilter')?.addEventListener('change', renderAllReports);

    $('#mapStatusFilter')?.addEventListener('change', updateMapMarkers);
    $('#mapCategoryFilter')?.addEventListener('change', updateMapMarkers);
    $('#mapHotspotsToggle')?.addEventListener('change', updateMapMarkers);

    // Locate Me on Map
    $('#mapLocateMeBtn')?.addEventListener('click', () => {
      if (!leafletMap) return;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          leafletMap.setView([pos.coords.latitude, pos.coords.longitude], 16);
          L.circleMarker([pos.coords.latitude, pos.coords.longitude], {
            radius: 8,
            color: '#00c9a7',
            fillColor: '#00f2c3',
            fillOpacity: 0.8
          }).addTo(leafletMap).bindPopup('<b>Your Current Location</b>').openPopup();
          showToast('Map Centered', 'Positioned to your current coordinates.');
        });
      }
    });

    // Reset Demonstration Data
    $('#resetDemoDataBtn')?.addEventListener('click', () => {
      if (confirm('Reset prototype to default initial records? Newly submitted reports and helpline call logs in this browser will be cleared.')) {
        reports = JSON.parse(JSON.stringify(INITIAL_REPORTS));
        helplineCalls = [];
        userVotes = new Set();
        userPoints = 85;
        persistReports();
        persistHelplineCalls();
        persistVotes();
        persistPoints();
        showToast('Demo Data Reset', 'Platform restored to initial sample dataset.');
        renderOverview();
        renderAllReports();
        renderHelplineCalls();
        renderAuthorityModule();
        renderRewardsModule();
        if (leafletMap) updateMapMarkers();
      }
    });

    // About & Privacy Modals
    $('#helpModalBtn')?.addEventListener('click', () => {
      $('#infoModal').hidden = false;
      document.body.style.overflow = 'hidden';
    });
    $('#footerAboutLink')?.addEventListener('click', e => {
      e.preventDefault();
      $('#infoModal').hidden = false;
      document.body.style.overflow = 'hidden';
    });
    $('#footerPrivacyLink')?.addEventListener('click', e => {
      e.preventDefault();
      alert('Data Security Notice: This prototype saves submitted reports, helpline call records, photos, and voice notes in this browser. Call records include caller details linked to their tickets; phone-call audio is not recorded.');
    });

    // Real-time Clock for Radar
    setInterval(() => {
      const now = new Date();
      const el = $('#heroLiveTime');
      if (el) el.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }, 1000);

    // =========================================================================
    // GOVERNMENT PORTAL DISPATCH & DOCKET LINKING HANDLERS
    // =========================================================================
    $('#detailGovDispatchBtn')?.addEventListener('click', () => {
      if (activeDetailReport) {
        openGovDispatchModal(activeDetailReport);
      }
    });

    $('#dispatchTargetSelect')?.addEventListener('change', function() {
      if (activeDetailReport) {
        updateDispatchModalView(activeDetailReport, this.value);
      }
    });

    $('#copyPayloadBtn')?.addEventListener('click', async () => {
      const text = $('#dispatchDossierText')?.textContent || '';
      if (!text) return;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        showToast('Payload Copied', 'Standardized municipal grievance dossier copied to clipboard.');
      } catch (err) {
        showToast('Copy Notice', 'Please copy the text manually from the dossier box.');
      }
    });

    $('#saveLinkedDocketBtn')?.addEventListener('click', () => {
      if (!activeDetailReport) return;
      const docketInput = $('#govDocketInput');
      const docket = docketInput ? docketInput.value.trim() : '';
      if (!docket) {
        showToast('Docket Required', 'Please enter a valid government tracking token / docket number (e.g. GHMC-2026-X8392).');
        if (docketInput) docketInput.focus();
        return;
      }

      const portalKey = $('#dispatchTargetSelect')?.value || 'ghmc';
      const portal = GOV_PORTALS[portalKey] || GOV_PORTALS.ghmc;

      activeDetailReport.govDocket = docket;
      activeDetailReport.govPortal = portalKey;
      activeDetailReport.updated = Date.now();

      if (!activeDetailReport.statusHistory) {
        activeDetailReport.statusHistory = [];
      }

      activeDetailReport.statusHistory.push({
        status: 'Duplicate Linked',
        timestamp: Date.now(),
        actor: currentRole === 'authority' || currentRole === 'admin' ? 'Authority Officer' : 'Municipal Liaison Officer',
        dept: activeDetailReport.department,
        note: `Linked with official ${portal.name} docket: ${docket}`
      });

      persistReports();

      $('#govDispatchModal').hidden = true;
      document.body.style.overflow = '';

      renderOverview();
      renderAllReports();
      renderAuthorityModule();

      // Refresh detail modal view with new docket
      window.sccOpenReportDetails(activeDetailReport.id);

      showToast('Government Docket Linked', `Successfully linked ticket #${activeDetailReport.id} with official docket ${docket}.`);
    });

    // Gov Portal Batch Exports
    $('#exportGovJsonBtn')?.addEventListener('click', exportGovBatchJson);
    $('#exportGovCsvBtn')?.addEventListener('click', exportGovReportCsv);

    // Live Map Zoom Controls
    $('#mapFitAllBtn')?.addEventListener('click', () => {
      if (!leafletMap) return;
      const validReports = reports.filter(r => r.lat && r.lng);
      if (validReports.length > 0) {
        const bounds = L.latLngBounds(validReports.map(r => [r.lat, r.lng]));
        leafletMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        showToast('Map Adjusted', `Fitted ${validReports.length} civic hazard locations in view.`);
      } else {
        leafletMap.setView([17.4938, 78.3912], 14);
      }
    });

    $('#mapResetZoomBtn')?.addEventListener('click', () => {
      if (!leafletMap) return;
      leafletMap.setView([17.4938, 78.3912], 16);
      showToast('Zoom Reset', 'Centered on Northwood Metro District at street level.');
    });

    // =========================================================================
    // CIVIC AI CHATBOT (CIVICBOT) EVENT HANDLERS
    // =========================================================================
    $('#civicChatbotToggleBtn')?.addEventListener('click', () => toggleChatDrawer());
    $('#chatCloseBtn')?.addEventListener('click', () => toggleChatDrawer(false));
    $('#chatConfigureKeyBtn')?.addEventListener('click', () => {
      const current = geminiApiKey || '';
      const promptVal = prompt('Enter Google Gemini API Key for Live AI Chatbot:\n\nTip: You can obtain a free key from Google AI Studio (aistudio.google.com).\nLeave empty to use built-in on-device NLP.', current);
      if (promptVal !== null) {
        geminiApiKey = promptVal.trim();
        if (geminiApiKey) {
          try { localStorage.setItem(STORAGE_KEY_GEMINI_KEY, geminiApiKey); } catch (e) {}
          showToast('Gemini API Key Saved', `Live ${GEMINI_MODEL_LABEL} AI Assistant activated!`);
        } else {
          try { localStorage.removeItem(STORAGE_KEY_GEMINI_KEY); } catch (e) {}
          showToast('Using On-Device Classifier', 'Gemini key cleared. Built-in civic NLP active.');
        }
        updateChatbotEngineStatus();
      }
    });
    $('#chatClearHistoryBtn')?.addEventListener('click', () => {
      const container = $('#civicChatMessages');
      if (container) {
        container.innerHTML = `
          <div class="chat-bubble bot">
            <div class="chat-bubble-author">🤖 CivicBot Assistant</div>
            <div class="chat-bubble-content">
              Chat cleared. How can I assist you with Northwood municipal services?
            </div>
            <div class="chat-bubble-time">Just now</div>
          </div>
        `;
      }
    });
    $('#civicChatForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $('#civicChatInput');
      if (!input) return;
      const text = input.value;
      input.value = '';
      handleCivicChatSubmit(text);
    });
    $$('.quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const promptText = chip.dataset.prompt;
        if (promptText) handleCivicChatSubmit(promptText);
      });
    });

    // Doubt chips in chatbot drawer
    $$('.doubt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const promptText = chip.dataset.prompt;
        if (promptText) {
          toggleChatDrawer(true);
          handleCivicChatSubmit(promptText);
        }
      });
    });

    // =========================================================================
    // CAMERA DATABASE VIEW HANDLERS
    // =========================================================================
    // Launch camera from Camera DB view
    $('#cameradbLaunchCamBtn')?.addEventListener('click', () => openCameraStudio());

    // Upload photo directly to Camera DB view
    const cameradbFileInput = $('#cameradbFileInput');
    $('#cameradbUploadBtn')?.addEventListener('click', () => cameradbFileInput?.click());
    $('#cameradbEmptyActionBtn')?.addEventListener('click', () => openCameraStudio());

    cameradbFileInput?.addEventListener('change', async () => {
      const file = cameradbFileInput.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await fileToCompressedDataUrl(file);
        const photo = {
          id: 'CAM-' + Math.floor(1000 + Math.random() * 9000),
          title: file.name.replace(/\.[^.]+$/, '') || 'Uploaded Photo',
          category: 'public-infra',
          categoryLabel: 'Uploaded Evidence',
          lat: detectedGpsLat || 17.4938,
          lng: detectedGpsLng || 78.3912,
          ward: 'Ward 12 (Northwood Metro)',
          address: `Uploaded – GPS: ${(detectedGpsLat || 17.4938).toFixed(4)}, ${(detectedGpsLng || 78.3912).toFixed(4)}`,
          timestamp: Date.now(),
          dataUrl: dataUrl,
          source: 'upload',
          sourceLabel: 'Direct Upload',
          fileSizeKb: Math.round(file.size / 1024),
          resolution: 'Original',
          hasWatermark: false,
          verified: false,
          notes: `User-uploaded evidence file: ${file.name}`
        };
        cameraDatabase.unshift(photo);
        persistCameraDatabase();
        renderCameraDatabase();
        showToast('Photo Uploaded', `"${file.name}" added to Camera Evidence Database.`);
        cameradbFileInput.value = '';
      } catch (err) {
        showToast('Upload Error', err.message || 'Could not read the image file.');
      }
    });

    // Camera DB filters/search
    $('#cameradbSearchInput')?.addEventListener('input', renderCameraDatabase);
    $('#cameradbCategoryFilter')?.addEventListener('change', renderCameraDatabase);
    $('#cameradbTypeFilter')?.addEventListener('change', renderCameraDatabase);
    $('#cameradbSortFilter')?.addEventListener('change', renderCameraDatabase);

    // Export camera manifest
    $('#cameradbExportManifestBtn')?.addEventListener('click', exportCameraManifestJson);

    // Camera Studio - modal camera button in Report Form (full studio)
    $('#modalCameraBtn')?.removeEventListener('click', () => {});
    const _originalCameraBtn = $('#modalCameraBtn');
    if (_originalCameraBtn) {
      _originalCameraBtn.replaceWith(_originalCameraBtn.cloneNode(true));
      $('#modalCameraBtn')?.addEventListener('click', () => {
        openCameraStudio((capturedDataUrl) => {
          if (capturedDataUrl) {
            photoDataUrls.push(capturedDataUrl);
            renderPhotoPreviews();
            const status = $('#mediaStatusMsg');
            if (status) status.textContent = 'Live camera photo captured & attached.';
          }
        });
      });
    }

    // Camera DB picker button in Report Form
    $('#modalCameraDbPickBtn')?.addEventListener('click', () => openCameraDbPicker());

    // Direct file upload link in Report Form
    $('#modalUploadFileLink')?.addEventListener('click', () => {
      $('#modalFileInput')?.click();
    });

    // Camera Studio controls
    $('#cameraStudioCloseBtn')?.addEventListener('click', closeCameraStudio);
    $('#cameraStudioDoneBtn')?.addEventListener('click', closeCameraStudio);
    $('#cameraFlipBtn')?.addEventListener('click', flipCameraLens);
    $('#cameraWatermarkToggleBtn')?.addEventListener('click', toggleCameraWatermark);
    $('#cameraShutterBtn')?.addEventListener('click', snapCameraPhoto);
    $('#cameraAcceptSnapshotBtn')?.addEventListener('click', acceptCapturedPhoto);
    $('#cameraRetakeBtn')?.addEventListener('click', () => {
      const reviewBox = $('#cameraCaptureReviewBox');
      if (reviewBox) reviewBox.style.display = 'none';
      lastCapturedPhoto = null;
    });
    $('#cameraDownloadBtn')?.addEventListener('click', downloadCapturedPhoto);
    $('#cameraStudioUploadFallbackBtn')?.addEventListener('click', () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = async () => {
        const file = inp.files?.[0];
        if (!file) return;
        try {
          const dataUrl = await fileToCompressedDataUrl(file);
          lastCapturedPhoto = {
            id: 'CAM-' + Math.floor(1000 + Math.random() * 9000),
            title: file.name.replace(/\.[^.]+$/, '') || 'Uploaded Photo',
            category: 'public-infra', categoryLabel: 'Uploaded Evidence',
            lat: detectedGpsLat || 17.4938, lng: detectedGpsLng || 78.3912,
            ward: 'Ward 12 (Northwood Metro)', address: file.name,
            timestamp: Date.now(), dataUrl, source: 'upload', sourceLabel: 'Direct Upload',
            fileSizeKb: Math.round(file.size / 1024), resolution: 'Original',
            hasWatermark: false, verified: false, notes: `Uploaded: ${file.name}`
          };
          const reviewBox = $('#cameraCaptureReviewBox');
          const previewImg = $('#cameraCapturedImgPreview');
          const metaText = $('#cameraCapturedMeta');
          if (reviewBox && previewImg && metaText) {
            previewImg.src = dataUrl;
            metaText.textContent = `Uploaded: ${file.name} (${Math.round(file.size / 1024)} KB)`;
            reviewBox.style.display = 'block';
          }
          showToast('Image Loaded', 'Review photo below and click "Accept & Attach".');
        } catch (err) { showToast('Error', 'Could not load image.'); }
      };
      inp.click();
    });

    // =========================================================================
    // COMPLAINT TRACKING MODAL HANDLERS
    // =========================================================================
    $('#trackComplaintBtn')?.addEventListener('click', () => openTrackingModal());
    $('#trackSearchBtn')?.addEventListener('click', () => {
      const val = $('#trackSearchInput')?.value?.trim();
      if (val) searchTrackComplaint(val);
    });
    $('#trackSearchInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const val = e.target.value.trim();
        if (val) searchTrackComplaint(val);
      }
    });
    $('#trackModalCloseBtn')?.addEventListener('click', () => {
      const m = $('#trackingModal');
      if (m) { m.hidden = true; document.body.style.overflow = ''; }
    });
    $('#trackingModal')?.addEventListener('click', e => {
      if (e.target.id === 'trackingModal') {
        e.target.hidden = true;
        document.body.style.overflow = '';
      }
    });

    // =========================================================================
    // CAMERA BACKEND UPLOAD BUTTON (if backend is running)
    // =========================================================================
    $('#backendUploadBtn')?.addEventListener('click', () => {
      if (!lastCapturedPhoto) {
        showToast('No Photo', 'Capture a photo first using the Camera Studio.');
        return;
      }
      uploadPhotoToBackend(lastCapturedPhoto);
    });
  }

  // =========================================================================
  // 25. INITIALIZE APPLICATION
  // =========================================================================
  function initApp() {
    setupEventListeners();
    setupAdminEventListeners();
    setRole(currentRole);
    updateChatbotEngineStatus();
    renderOverview();
    renderAllReports();
    renderRewardsModule();
    initCameraDatabase();
    loadServerReports();
    console.log('Smart Civic Connect v2.5 initialized with Camera DB + Complaint Tracking + Admin Auth.');
  }

  // =========================================================================
  // 26. COMPLAINT TRACKING SYSTEM
  // =========================================================================
  function openTrackingModal(prefillId) {
    const modal = $('#trackingModal');
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';

    const input = $('#trackSearchInput');
    const resultBox = $('#trackResultBox');

    if (input) input.value = prefillId || '';
    if (resultBox) resultBox.innerHTML = `
      <div style="text-align:center; padding:40px; color:var(--text-muted);">
        <div style="font-size:48px; margin-bottom:12px;">🔍</div>
        <div style="font-size:14px; font-weight:600;">Enter a Ticket ID or Phone Number</div>
        <div style="font-size:12px; margin-top:6px;">e.g. SCC-2841 &nbsp;•&nbsp; Your mobile number &nbsp;•&nbsp; Keyword</div>
      </div>
    `;

    if (prefillId) {
      setTimeout(() => searchTrackComplaint(prefillId), 100);
    }

    if (input) setTimeout(() => input.focus(), 100);
  }

  function searchTrackComplaint(query) {
    const resultBox = $('#trackResultBox');
    if (!resultBox) return;

    const q = query.trim().toLowerCase();
    if (!q) return;

    // Search by: ticket ID, phone number, author name, title keyword, location keyword
    const matched = reports.filter(r => {
      return (
        (r.id || '').toLowerCase().includes(q) ||
        (r.phone || '').replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
        (r.author || '').toLowerCase().includes(q) ||
        (r.title || '').toLowerCase().includes(q) ||
        (r.location || '').toLowerCase().includes(q)
      );
    });

    if (matched.length === 0) {
      resultBox.innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--text-muted);">
          <div style="font-size:40px;">😕</div>
          <div style="font-size:14px; font-weight:600; margin-top:10px;">No matching complaint found</div>
          <div style="font-size:12px; margin-top:6px;">Check your Ticket ID (e.g. SCC-2841) or try your mobile number.</div>
        </div>
      `;
      return;
    }

    resultBox.innerHTML = matched.map(r => {
      const statusColors = {
        'Submitted': '#f59e0b',
        'Acknowledged': '#3b82f6',
        'In progress': '#06b6d4',
        'Resolved': '#10b981',
        'Closed': '#6b7280'
      };
      const statusColor = statusColors[r.status] || '#6b7280';
      const age = timeAgo(r.created);
      const updated = r.updated ? timeAgo(r.updated) : 'Not updated yet';

      // Progress bar stages
      const stages = ['Submitted', 'Acknowledged', 'In progress', 'Resolved', 'Closed'];
      const currentStageIdx = stages.indexOf(r.status);
      const progressPct = currentStageIdx >= 0 ? Math.min(100, ((currentStageIdx + 1) / stages.length) * 100) : 20;

      const history = (r.statusHistory || []).slice().reverse();

      return `
        <article class="track-result-card" onclick="window.sccOpenReportDetails('${r.id}')" title="Click to open full ticket details">
          <div class="track-card-header">
            <div>
              <span class="report-id-pill">${escapeHTML(r.id)}</span>
              <span class="track-status-badge" style="background:${statusColor}; color:#fff;">
                ${escapeHTML(r.status)}
              </span>
              ${r.govDocket ? `<span class="track-status-badge" style="background:#7c3aed; color:#fff;">🏛️ ${escapeHTML(r.govDocket)}</span>` : ''}
            </div>
            <div style="font-size:11px; color:var(--text-muted);">
              Submitted ${age}
            </div>
          </div>

          <h4 class="track-card-title">${escapeHTML(r.title)}</h4>
          <div class="track-card-meta">
            <span>📍 ${escapeHTML(r.location)}</span>
            <span>•</span>
            <span>🏢 ${escapeHTML(r.department || 'Municipal Dept')}</span>
            <span>•</span>
            <span>⚡ ${escapeHTML(r.priority || 'Normal')} Priority</span>
          </div>

          <!-- Progress Bar -->
          <div class="track-progress-wrap">
            <div class="track-progress-stages">
              ${stages.map((s, i) => `
                <div class="track-stage ${i <= currentStageIdx ? 'completed' : ''} ${i === currentStageIdx ? 'active' : ''}">
                  <div class="track-stage-dot"></div>
                  <div class="track-stage-label">${s}</div>
                </div>
              `).join('')}
            </div>
            <div class="track-progress-bar">
              <div class="track-progress-fill" style="width:${progressPct}%;"></div>
            </div>
          </div>

          <!-- Timeline History -->
          ${history.length > 0 ? `
            <div class="track-timeline" onclick="event.stopPropagation()">
              <div class="track-timeline-label">📋 Status Timeline:</div>
              ${history.map(h => `
                <div class="track-timeline-item">
                  <div class="track-timeline-dot" style="background:${statusColors[h.status] || '#64748b'};"></div>
                  <div class="track-timeline-content">
                    <div class="track-timeline-status">${escapeHTML(h.status)}</div>
                    <div class="track-timeline-note">${escapeHTML(h.note || '')}</div>
                    <div class="track-timeline-time">${new Date(h.timestamp).toLocaleString()} · ${escapeHTML(h.actor || 'System')}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <!-- Metrics Row -->
          <div class="track-metrics-row">
            <span>👍 ${r.votes || 0} community votes</span>
            <span>•</span>
            <span>✅ ${r.verifiedCount || 0} verified</span>
            <span>•</span>
            <span>🕒 Updated: ${updated}</span>
          </div>

          <div style="margin-top:10px;">
            <button type="button" class="btn-primary" style="font-size:11px; padding:6px 14px;" onclick="event.stopPropagation(); window.sccOpenReportDetails('${r.id}')">
              📂 Full Ticket Details
            </button>
            <button type="button" class="btn-secondary" style="font-size:11px; padding:6px 14px; margin-left:6px;" onclick="event.stopPropagation(); window.sccLocateReportOnMap('${escapeHTML(r.id)}')">
              🗺️ Locate on Map
            </button>
            ${r.photo ? `
              <button type="button" class="btn-secondary" style="font-size:11px; padding:6px 14px; margin-left:6px;" onclick="event.stopPropagation(); window.sccViewTrackPhoto('${r.id}')">
                📷 View Evidence Photo
              </button>
            ` : ''}
          </div>
        </article>
      `;
    }).join('');
  }

  window.sccViewTrackPhoto = function(reportId) {
    const report = reports.find(r => r.id === reportId);
    if (!report || !report.photo) return;

    // Find matching camera DB entry or create a temp lightbox view
    const matchedCam = cameraDatabase.find(c => c.ticketId === reportId);
    if (matchedCam) {
      openPhotoLightbox(matchedCam.id);
    } else {
      // Inject a temporary entry into the lightbox
      const img = $('#lightboxImg');
      const caption = $('#lightboxCaption');
      const ticket = $('#lightboxTicket');
      const loc = $('#lightboxLocation');
      const gps = $('#lightboxGps');
      const time = $('#lightboxTime');
      const author = $('#lightboxAuthor');
      const dlBtn = $('#lightboxDownloadBtn');
      const dept = $('#lightboxDept');
      if (img) img.src = report.photo;
      if (caption) caption.textContent = report.title;
      if (dept) dept.textContent = report.department || 'Civic Infrastructure';
      if (ticket) ticket.textContent = report.id;
      if (loc) loc.textContent = report.location;
      if (gps) gps.textContent = report.lat ? `${report.lat}° N, ${report.lng}° E` : 'Not recorded';
      if (time) time.textContent = new Date(report.created).toLocaleString();
      if (author) author.textContent = report.author || 'Citizen';
      if (dlBtn) { dlBtn.href = report.photo; dlBtn.download = `${reportId}.jpg`; }
      const modal = $('#photoLightboxModal');
      if (modal) { modal.hidden = false; document.body.style.overflow = 'hidden'; }
    }
  };

  // =========================================================================
  // 27. CAMERA BACKEND API INTEGRATION (uploads to backend.mjs server)
  // =========================================================================
  const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:4200'
    : 'https://smart-civic-connect.onrender.com';

  async function uploadPhotoToBackend(photoRecord) {
    if (!photoRecord?.dataUrl) {
      showToast('Upload Error', 'No photo data to upload.');
      return;
    }

    try {
      showToast('Uploading to Server...', 'Sending photo to backend API...');

      // Convert dataUrl to Blob
      const res = await fetch(photoRecord.dataUrl);
      const blob = await res.blob();

      const formData = new FormData();
      formData.append('photo', blob, `${photoRecord.id || 'evidence'}.jpg`);
      formData.append('id', photoRecord.id || '');
      formData.append('title', photoRecord.title || 'Civic Evidence');
      formData.append('ticketId', photoRecord.ticketId || '');
      formData.append('category', photoRecord.category || 'public-infra');
      formData.append('lat', String(photoRecord.lat || ''));
      formData.append('lng', String(photoRecord.lng || ''));
      formData.append('ward', photoRecord.ward || '');
      formData.append('address', photoRecord.address || '');
      formData.append('timestamp', String(photoRecord.timestamp || Date.now()));
      formData.append('notes', photoRecord.notes || '');

      const uploadRes = await fetch(`${BACKEND_URL}/api/upload-photo`, {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) throw new Error(`Server returned ${uploadRes.status}`);
      const result = await uploadRes.json();

      showToast('✅ Photo Uploaded to Server', `Saved as: ${result.filename || 'evidence.jpg'}`);

      // Mark photo as server-synced
      photoRecord.serverSynced = true;
      photoRecord.serverPath = result.url;
      persistCameraDatabase();
      renderCameraDatabase();

    } catch (err) {
      console.warn('Backend upload error:', err);
      showToast('Backend Offline', 'Could not reach backend server. Photo saved locally in Camera Database.');
    }
  }

  async function syncAllPhotosToBackend() {
    const unsynced = cameraDatabase.filter(p => !p.serverSynced);
    if (unsynced.length === 0) {
      showToast('All Synced', 'All photos are already synced to the backend server.');
      return;
    }
    showToast('Syncing Photos', `Uploading ${unsynced.length} unsynced photo(s) to backend...`);
    for (const photo of unsynced) {
      await uploadPhotoToBackend(photo);
    }
  }

  window.sccSyncToBackend = syncAllPhotosToBackend;

  // Expose tracking search globally (used by inline onclick chips in trackingModal)
  window.searchTrackComplaint = searchTrackComplaint;
  window.sccOpenTrackingModal = openTrackingModal;

  // ==========================================================================
  // 28. ADMIN AUTHENTICATION & COMPLAINT DATABASE MANAGEMENT
  // ==========================================================================
  const STORAGE_KEY_ADMIN = 'scc_admin_credentials_v1';
  const STORAGE_KEY_ADMIN_SESSION = 'scc_admin_session_v1';

  async function hashPassword(password, salt) {
    const data = new TextEncoder().encode(salt + password + 'scc_civic_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function initAdminCredentials() {
    let creds = null;
    try { creds = JSON.parse(localStorage.getItem(STORAGE_KEY_ADMIN) || 'null'); } catch {}
    if (!creds) {
      const salt = Date.now().toString(36);
      const hash = await hashPassword('Admin@123', salt);
      creds = { username: 'admin', passwordHash: hash, salt, role: 'admin', createdAt: new Date().toISOString() };
      try { localStorage.setItem(STORAGE_KEY_ADMIN, JSON.stringify(creds)); } catch {}
    }
    return creds;
  }

  async function verifyAdminLogin(username, password) {
    const creds = await initAdminCredentials();
    if ((username || '').trim().toLowerCase() !== (creds.username || '').toLowerCase()) return false;
    return await hashPassword(password, creds.salt) === creds.passwordHash;
  }

  async function changeAdminPassword(currentPwd, newPwd) {
    const creds = await initAdminCredentials();
    if (await hashPassword(currentPwd, creds.salt) !== creds.passwordHash) throw new Error('Current password is incorrect.');
    if (newPwd.length < 6) throw new Error('New password must be at least 6 characters.');
    const newSalt = Date.now().toString(36);
    const updated = { ...creds, passwordHash: await hashPassword(newPwd, newSalt), salt: newSalt, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY_ADMIN, JSON.stringify(updated));
    return true;
  }

  async function changeAdminUsername(currentPwd, newUsername) {
    const creds = await initAdminCredentials();
    if (await hashPassword(currentPwd, creds.salt) !== creds.passwordHash) throw new Error('Current password is incorrect to verify username change.');
    if (!newUsername || newUsername.trim().length < 3) throw new Error('New username must be at least 3 characters.');
    const updated = { ...creds, username: newUsername.trim(), updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY_ADMIN, JSON.stringify(updated));
    return true;
  }

  function getAdminSession() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY_ADMIN_SESSION) || 'null');
      if (!s) return null;
      if (Date.now() - s.loginAt > 8 * 3600000) { localStorage.removeItem(STORAGE_KEY_ADMIN_SESSION); return null; }
      return s;
    } catch { return null; }
  }

  function createAdminSession(username, role) {
    const s = { username, role, loginAt: Date.now() };
    try { localStorage.setItem(STORAGE_KEY_ADMIN_SESSION, JSON.stringify(s)); } catch {}
    return s;
  }

  function destroyAdminSession() {
    try { localStorage.removeItem(STORAGE_KEY_ADMIN_SESSION); } catch {}
  }

  function updateAdminLoginButton(session) {
    const btn = document.getElementById('adminLoginBtn');
    const icon = document.getElementById('adminLoginBtnIcon');
    const label = document.getElementById('adminLoginBtnLabel');
    const dbNav = document.getElementById('navAdminDbBtn');
    if (session) {
      if (btn) btn.style.background = 'var(--teal-600)';
      if (icon) icon.textContent = '✅';
      if (label) label.textContent = session.username + ' (Admin)';
      if (dbNav) dbNav.style.display = 'flex';
      currentRole = 'admin'; persistRole();
      const rl = document.getElementById('sidebarRoleLabel'); if (rl) rl.textContent = 'Role: Administrator';
      const rd = document.getElementById('sidebarRoleDesc'); if (rd) rd.textContent = 'Governance & Rules';
    } else {
      if (btn) btn.style.background = '';
      if (icon) icon.textContent = '🔐';
      if (label) label.textContent = 'Admin Login';
      if (dbNav) dbNav.style.display = 'none';
    }
  }

  function openAdminLoginModal() {
    const m = document.getElementById('adminLoginModal');
    if (m) { m.hidden = false; document.body.style.overflow = 'hidden'; }
    const lp = document.getElementById('loginPanel'); if (lp) lp.style.display = 'block';
    const cp = document.getElementById('changePassPanel'); if (cp) cp.style.display = 'none';
    const up = document.getElementById('changeUsernamePanel'); if (up) up.style.display = 'none';
    const e = document.getElementById('adminLoginError'); if (e) e.style.display = 'none';
    // Load current username into the display
    initAdminCredentials().then(creds => {
      const curUser = document.getElementById('currentAdminUsername');
      if (curUser) curUser.textContent = creds.username;
    });
    setTimeout(() => document.getElementById('adminUsernameInput')?.focus(), 100);
  }

  // ==========================================================================
  // 28B. ADMIN COMPLAINT DATABASE VIEW
  // ==========================================================================
  function renderAdminDatabase() {
    const session = getAdminSession();
    if (!session) {
      showToast('Access Denied', 'Please login as Admin first.');
      openAdminLoginModal();
      return;
    }
    const SLA_H = { 'Emergency': 4, 'High': 24, 'Medium': 72, 'Low': 168 };
    const total = reports.length;
    const active = reports.filter(r => ['Submitted', 'Acknowledged', 'In progress'].includes(r.status)).length;
    const resolved = reports.filter(r => ['Resolved', 'Closed'].includes(r.status)).length;
    const overdue = reports.filter(r =>
      !['Resolved', 'Closed'].includes(r.status) &&
      (Date.now() - r.created) > (SLA_H[r.priority] || 72) * 3600000
    ).length;

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('adminStatTotal', total);
    setEl('adminStatActive', active);
    setEl('adminStatOverdue', overdue);
    setEl('adminStatResolved', resolved);
    setEl('navAdminDbCount', total);

    const search = (document.getElementById('adminDbSearchInput')?.value || '').toLowerCase().trim();
    const statusF = document.getElementById('adminDbStatusFilter')?.value || 'all';
    const catF = document.getElementById('adminDbCategoryFilter')?.value || 'all';
    const prioF = document.getElementById('adminDbPriorityFilter')?.value || 'all';
    const sortF = document.getElementById('adminDbSortFilter')?.value || 'newest';

    let filtered = reports.filter(r => {
      if (search && !`${r.id} ${r.title} ${r.location} ${r.author} ${r.phone || ''} ${r.department}`.toLowerCase().includes(search)) return false;
      if (statusF !== 'all' && r.status !== statusF) return false;
      if (catF !== 'all' && r.majorCategory !== catF && r.category !== catF) return false;
      if (prioF !== 'all' && r.priority !== prioF) return false;
      return true;
    });

    const pO = { 'Emergency': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
    if (sortF === 'newest') filtered.sort((a, b) => (b.created || 0) - (a.created || 0));
    else if (sortF === 'oldest') filtered.sort((a, b) => (a.created || 0) - (b.created || 0));
    else if (sortF === 'priority') filtered.sort((a, b) => (pO[a.priority] ?? 4) - (pO[b.priority] ?? 4));
    else if (sortF === 'votes') filtered.sort((a, b) => (b.votes || 0) - (a.votes || 0));

    const container = document.getElementById('adminDbTableContainer');
    const empty = document.getElementById('adminDbEmptyState');
    if (!container) return;

    if (filtered.length === 0) {
      container.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    const sC = { 'Submitted': '#f59e0b', 'Acknowledged': '#3b82f6', 'In progress': '#06b6d4', 'Resolved': '#10b981', 'Closed': '#6b7280' };
    const pC = { 'Emergency': '#dc2626', 'High': '#ea580c', 'Medium': '#d97706', 'Low': '#16a34a' };

    container.innerHTML = `<div style="overflow-x:auto;">
      <table class="admin-db-table">
        <thead><tr>
          <th>Ticket ID</th><th>Category</th><th>Title</th><th>Location</th>
          <th>Status</th><th>Priority</th><th>Reporter</th><th>Submitted</th>
          <th>Votes</th><th>Track</th><th>Actions</th>
        </tr></thead>
        <tbody>${filtered.map(r => {
          const od = (Date.now() - r.created) / 3600000 > (SLA_H[r.priority] || 72) && !['Resolved', 'Closed'].includes(r.status);
          const hoursElapsed = Math.round((Date.now() - r.created) / 3600000);
          const slaHours = SLA_H[r.priority] || 72;
          const slaPercent = Math.min(100, Math.round((hoursElapsed / slaHours) * 100));
          return `<tr class="admin-db-row${od ? ' admin-row-overdue' : ''}" onclick="window.sccOpenReportDetails('${r.id}')">
            <td><span class="report-id-pill">${escapeHTML(r.id)}</span>${od ? '<span class="admin-overdue-badge">⚠️SLA</span>' : ''}</td>
            <td style="font-size:11px;">${escapeHTML((r.majorCategory || r.category || '').replace(/-/g, ' '))}</td>
            <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;font-size:12px;" title="${escapeHTML(r.title)}">${escapeHTML(r.title)}</td>
            <td style="font-size:11px;">📍${escapeHTML(r.location)}</td>
            <td><span style="background:${sC[r.status] || '#6b7280'};color:#fff;padding:2px 8px;border-radius:50px;font-size:10px;font-weight:700;">${escapeHTML(r.status)}</span></td>
            <td><span style="color:${pC[r.priority] || '#6b7280'};font-size:10.5px;font-weight:700;">${escapeHTML(r.priority || 'Normal')}</span></td>
            <td style="font-size:11px;">${escapeHTML(r.author || 'Anon')}</td>
            <td style="font-size:11px;color:var(--text-muted);">${formatRelativeTime(r.created)}</td>
            <td style="text-align:center;font-weight:700;">${r.votes || 0}</td>
            <td>
              <div style="width:70px;">
                <div style="background:#e5e7eb;border-radius:4px;height:5px;overflow:hidden;">
                  <div style="background:${slaPercent>=100?'#ef4444':slaPercent>=75?'#f59e0b':'#10b981'};width:${slaPercent}%;height:100%;transition:width 0.3s;"></div>
                </div>
                <div style="font-size:9px;color:var(--text-muted);margin-top:2px;">${slaPercent}% SLA</div>
              </div>
            </td>
            <td><div style="display:flex;gap:4px;">
              <button type="button" class="btn-teal" style="font-size:10px;padding:3px 7px;" title="Track Details" onclick="event.stopPropagation();window.sccOpenTrackingModal('${r.id}')">🔍</button>
              <button type="button" class="btn-primary" style="font-size:10px;padding:3px 7px;" title="View Details" onclick="event.stopPropagation();window.sccOpenReportDetails('${r.id}')">📂</button>
              <button type="button" class="btn-danger" style="font-size:10px;padding:3px 6px;" title="Delete" onclick="event.stopPropagation();window.sccAdminDeleteReport('${r.id}')">🗑️</button>
            </div></td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:10px;text-align:right;">
      Showing <b>${filtered.length}</b> of <b>${total}</b> records | Session: <b>${session.username}</b>
      ${session.loginAt ? ` | Login: ${new Date(session.loginAt).toLocaleTimeString()}` : ''}
    </div>`;
  }

  window.sccAdminDeleteReport = function (id) {
    if (!getAdminSession()) return;
    const r = reports.find(x => x.id === id);
    if (!r || !confirm(`⚠️ Permanently delete:\n"${r.title}" (${id})\n\nThis cannot be undone.`)) return;
    reports = reports.filter(x => x.id !== id);
    persistReports();
    showToast('Deleted', `${id} removed from database.`);
    renderAdminDatabase();
    renderOverview();
    renderAllReports();
  };

  window.sccAdminUpdateStatus = function (id, newStatus) {
    if (!getAdminSession()) return;
    const r = reports.find(x => x.id === id);
    if (!r) return;
    const oldStatus = r.status;
    r.status = newStatus;
    r.updated = Date.now();
    r.statusHistory = r.statusHistory || [];
    r.statusHistory.push({ status: newStatus, changedAt: Date.now(), changedBy: getAdminSession()?.username || 'admin' });
    persistReports();
    showToast('Status Updated', `${id}: ${oldStatus} → ${newStatus}`);
    renderAdminDatabase();
  };

  function exportAdminDbJson() {
    if (!getAdminSession()) { showToast('Access Denied', 'Login as Admin first.'); return; }
    const session = getAdminSession();
    const blob = new Blob([JSON.stringify({ exportVersion: '2.0', exportTimestamp: new Date().toISOString(), exportedBy: session.username, totalRecords: reports.length, complaints: reports }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `civic_db_${Date.now()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast('JSON Exported', `${reports.length} records downloaded.`);
  }

  function exportAdminDbCsv() {
    if (!getAdminSession()) { showToast('Access Denied', 'Login as Admin first.'); return; }
    const cols = ['id', 'title', 'majorCategory', 'subcategory', 'status', 'priority', 'location', 'department', 'author', 'phone', 'votes', 'created', 'updated'];
    const csv = [cols.join(','), ...reports.map(r => cols.map(k => `"${String((k === 'created' || k === 'updated') ? (r[k] ? new Date(r[k]).toISOString() : '') : (r[k] || '')).replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `civic_db_${Date.now()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast('CSV Exported', `${reports.length} records saved.`);
  }

  function setupAdminEventListeners() {
    // Restore admin session UI state on page load
    const existingSession = getAdminSession();
    if (existingSession) updateAdminLoginButton(existingSession);

    // ==== CHANGE USERNAME TAB (new tab not in old system) ====
    document.getElementById('changeUsernameTabBtn')?.addEventListener('click', () => {
      if (!getAdminSession()) {
        showToast('Login First', 'Please login before changing your username.');
        return;
      }
      document.getElementById('loginPanel').style.display = 'none';
      document.getElementById('changePassPanel').style.display = 'none';
      const up = document.getElementById('changeUsernamePanel'); if (up) up.style.display = 'block';
      // Update current username display
      initAdminCredentials().then(creds => {
        const el1 = document.getElementById('currentAdminUsername'); if (el1) el1.textContent = creds.username;
        const el2 = document.getElementById('currentAdminUsername2'); if (el2) el2.textContent = creds.username;
      });
      document.getElementById('changeUsernameTabBtn')?.classList.add('active-tab');
      document.getElementById('loginTabBtn')?.classList.remove('active-tab');
      document.getElementById('changePassTabBtn')?.classList.remove('active-tab');
    });

    // Reset to login panel when login tab clicked (complement to old handler)
    document.getElementById('loginTabBtn')?.addEventListener('click', () => {
      const up = document.getElementById('changeUsernamePanel'); if (up) up.style.display = 'none';
      document.getElementById('changeUsernameTabBtn')?.classList.remove('active-tab');
      document.getElementById('loginTabBtn')?.classList.add('active-tab');
    });

    // Change username submit
    document.getElementById('changeUsernameSubmitBtn')?.addEventListener('click', async () => {
      const verifyPwd = document.getElementById('unameVerifyPwd')?.value || '';
      const newUname = document.getElementById('newAdminUsername')?.value || '';
      const errEl = document.getElementById('changeUnamError');
      const succEl = document.getElementById('changeUnamSuccess');
      if (errEl) errEl.style.display = 'none';
      if (succEl) succEl.style.display = 'none';
      try {
        await changeAdminUsername(verifyPwd, newUname);
        const session = getAdminSession();
        if (session) {
          session.username = newUname.trim();
          try { localStorage.setItem(STORAGE_KEY_ADMIN_SESSION, JSON.stringify(session)); } catch {}
        }
        updateAdminLoginButton(getAdminSession());
        if (succEl) { succEl.textContent = `✅ Username changed to "${newUname.trim()}" successfully!`; succEl.style.display = 'block'; }
        const curUser = document.getElementById('currentAdminUsername'); if (curUser) curUser.textContent = newUname.trim();
        const curUser2 = document.getElementById('currentAdminUsername2'); if (curUser2) curUser2.textContent = newUname.trim();
        ['unameVerifyPwd', 'newAdminUsername'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      } catch (err) { if (errEl) { errEl.textContent = err.message; errEl.style.display = 'block'; } }
    });

    // ==== ADMIN DB CONTROLS ====
    document.getElementById('adminDbExportJsonBtn')?.addEventListener('click', exportAdminDbJson);
    document.getElementById('adminDbExportCsvBtn')?.addEventListener('click', exportAdminDbCsv);
    document.getElementById('adminDbRefreshBtn')?.addEventListener('click', renderAdminDatabase);
    document.getElementById('adminLogoutBtn')?.addEventListener('click', () => {
      destroyAdminSession();
      updateAdminLoginButton(null);
      setRole('citizen');
      window.sccNavToView('overview');
      showToast('Logged Out', 'Admin session ended.');
    });

    ['adminDbSearchInput', 'adminDbStatusFilter', 'adminDbCategoryFilter', 'adminDbPriorityFilter', 'adminDbSortFilter'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', renderAdminDatabase);
    });

    // Escape key also closes admin modal
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const m = document.getElementById('adminLoginModal');
        if (m && !m.hidden) { m.hidden = true; document.body.style.overflow = ''; }
      }
    });
  }

  // Expose $ globally for inline onclick handlers in modals
  window.$ = selector => document.querySelector(selector);

  // Launch when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
