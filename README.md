# Smart Civic Connect
## AI-Powered Civic Issue Reporting, Urban Accessibility & Community Governance Platform
### Aligned with United Nations Sustainable Development Goal 11: Sustainable Cities and Communities

**Tagline:** *One City. Every Voice. Smarter Solutions.*  
**Live Production Site:** [https://melodious-pegasus-1fdc1c.netlify.app/](https://melodious-pegasus-1fdc1c.netlify.app/)  
**Version:** 2.0.0 (Transformed from legacy CivicLoop prototype)

---

## 1. Executive Summary & UN SDG 11 Alignment

**Smart Civic Connect** transforms conventional civic complaint reporting into an integrated smart-city digital governance platform. While traditional civic tools act merely as passive digital suggestion boxes, Smart Civic Connect introduces an active municipal workflow engineered to:

1. **Eliminate Duplicate Complaints:** Intelligent pre-submission spatial radius matching (Haversine formula) and description token analysis consolidate community efforts rather than fragmenting municipal work orders.
2. **Prioritize Safety & Inclusivity:** The **Community Severity Index (CSI 0–100)** transparently balances hazard severity, vulnerable mobility impact, citizen upvotes, and overdue duration so that urgent safety issues are never buried under viral votes.
3. **Advance Urban Accessibility (SDG 11.2):** A dedicated **Accessibility Navigator** surfaces wheelchair ramp obstructions, broken transit lifts, missing tactile paving, and accessible public restrooms.
4. **Enforce Transparent SLA Escalations:** Algorithmic escalation thresholds (24h reminder, 3-day zonal escalation, 7-day supervisor review, 15-day commissioner audit) ensure accountability.
5. **Verify Repairs with Ground Truth:** When city crews complete work, tickets enter a **Citizen Verification** phase where residents inspect the site and confirm or dispute the repair before final ticket closure.
6. **Empower All Demographics:** Support for browser GPS, live camera snapshots, file uploads, **multilingual voice reporting (English, Telugu, Hindi)**, and a **toll-free Assisted Helpline** ensures digital inclusion across age groups and literacy levels.

---

## 2. Visual Identity & Original Brand Assets

Smart Civic Connect features a custom-designed smart-city brand identity:

- **Primary Color:** Deep Forest Navy (`#0a2520`, `#071915`) conveying civic authority, institutional trust, and environmental stewardship.
- **Technology Accent:** Electric Teal (`#00c9a7`, `#00f2c3`) representing modern AI intelligence, precision, and civic transparency.
- **Resolution Emerald:** Vibrant Emerald Green (`#10b981`) denoting confirmed municipal repairs.
- **Warning Amber:** Warm Amber (`#f59e0b`) for active maintenance and caution.
- **Hazard Red:** Urgent Scarlet (`#ef4444`) for critical public safety concerns.
- **Neutral Canvas:** High-contrast soft slate and crisp white cards (`#ffffff`, `#f6f9f8`).

### Brand Assets in Repository
- `logo.svg`: Main horizontal brand logo with the interconnected urban skyline, civic location pin, circular community network, resolution checkmark, wordmark, and UN SDG 11 badge.
- `logo-light.svg`: Light-background variant for print and document exports.
- `icon.svg`: Compact square app icon for mobile homescreens and favicons.
- `favicon.svg`: Vector favicon linked in `index.html`.

---

## 3. Architecture & Codebase Structure

The project preserves the lightweight, self-contained architecture requested by the development prompt:

```
DTPROJECT/
├── index.html          # Unified semantic HTML5 application shell & view templates
├── styles.css          # Executive smart-city design system, responsive grid, high-contrast mode
├── app.js              # Core logic: taxonomy, AI assistant, duplicate check, maps, CSI scorer
├── backend.mjs         # Node.js web server and complaints/photos API
├── database.sql        # PostgreSQL schema initialized by the API
├── render.yaml         # Render web service and PostgreSQL Blueprint
├── package.json        # Node.js dependencies and start scripts
├── start-website.bat   # Windows one-click local development launcher
├── schema.sql          # Supabase schema for Supabase-based deployments
├── migration_v2.sql    # Non-destructive database migration script from CivicLoop to v2
├── logo.svg            # Official horizontal vector logo
├── logo-light.svg      # Light-theme vector logo
├── icon.svg            # Compact square vector app icon
├── favicon.svg         # High-resolution vector favicon
└── README.md           # Master technical documentation and deployment guide
```

---

## 4. Comprehensive 9-Category Taxonomy & Department Routing

Smart Civic Connect replaces generic issue reporting with a hierarchical taxonomy mapping each subcategory to its responsible municipal department:

| Major Category | Key Subcategories | Responsible Department | Base CSI |
|---|---|---|---|
| **1. Public Infrastructure & Road Maintenance** | Potholes, Damaged roads, Road cracks, Damaged footpaths, Missing road signs, Open manholes, Fallen trees, Damaged bridges, Broken bus shelters | Roads & Municipal Engineering Dept | 30 |
| **2. Street Lighting & Electricity** | Broken streetlights, Flickering streetlights, Dark public areas, Fallen electric poles, Exposed electrical wires | Electrical & Power Department | 25 |
| **3. Water and Drainage** | Water leakage, Burst pipelines, Sewage overflow, Blocked drains, Suspected drinking-water contamination, Flooded roads | Water Supply & Sewerage Board | 35 |
| **4. Sanitation & Environmental Hazards** | Overflowing garbage bins, Illegal waste dumping, Construction debris, Burning garbage, Biomedical waste dumping, Dirty public toilets | Sanitation & Solid Waste Management | 25 |
| **5. Traffic and Public Safety** | Nonfunctional traffic signals, Illegal parking, Double parking, Parking on footpaths, Parking in designated disabled parking spaces, Wrong-side driving, Traffic congestion hotspots, Dangerous intersections | Traffic Police & Transport Authority | 30 |
| **6. Accessibility & Inclusive Infrastructure** | Missing wheelchair ramps, Blocked ramps, Broken elevators, Missing tactile pathways, Inaccessible bus stops, Broken metro-station lifts, Blocked wheelchair routes, Inaccessible public washrooms, Inaccessible government buildings, Missing accessibility signage | Accessibility & Public Works Dept | 40 |
| **7. Environmental Issues** | Air-pollution hotspots, Noise pollution, Illegal tree cutting, Water pollution, Destruction of green cover, Public-space environmental hazards | Environmental Protection Dept | 25 |
| **8. Encroachment & Zoning Violations** | Shops blocking footpaths, Vendors obstructing public walkways, Illegal construction allegations, Occupation of public land, Construction obstructing public roads | Town Planning & Enforcement Squad | 25 |
| **9. Public Property Damage** | Broken park benches, Damaged playground equipment, Damaged bus stops, Damaged street furniture, Vandalized public infrastructure, Defaced public monuments | Municipal Asset Maintenance Division | 20 |

---

## 5. Key Functional Modules

### A. AI Civic Issue Assistant
- Evaluates title, description, and voice transcript keywords in real time.
- Suggests category, subcategory, responsible department, and initial urgency level.
- Automatically generates structured complaint titles and descriptions via the **"Apply AI Suggestions"** action.
- Uses Gemini 2.5 Flash when an API key is configured; the deterministic on-device classifier remains available as an offline fallback.

### B. Smart Duplicate Complaint Detection
- Triggers before final submission.
- Evaluates spatial distance via the **Haversine formula** ($\le 150\text{ m}$) combined with token similarity.
- When a match is found:
  - Displays the existing ticket with distance (e.g. `45m away`), photo, status, and community vote count.
  - Allows the citizen to **"Support Existing Ticket (+5 Points)"** to consolidate community demand without generating duplicate work orders.
  - Allows the citizen to **"Continue as New Report"** if their issue is distinct.

### C. Live Civic Map & Heatmap Clustering (Leaflet + OpenStreetMap)
- Renders geotagged reports with color-coded custom SVG pin markers:
  - 🔴 **Urgent Hazard** (CSI $\ge 80$)
  - 🟠 **High Priority** (CSI $60\text{--}79$)
  - 🔵 **In Progress** (Crews actively assigned)
  - 🟢 **Resolved / Verified Fix**
  - 🟡 **Open / Under Review**
- **Civic Hotspot Overlay:** Highlights high-density problem areas (e.g., recurring pothole corridors or chronic garbage dumps) with translucent cluster rings.
- Popups display ticket summary, department, CSI gauge, and a direct link to the full detail modal.

### D. Community Severity Index (CSI: 0 to 100)
A transparent, multi-factor prioritization formula:
$$\text{CSI} = \text{Base Severity} + \text{Safety Hazard (+25)} + \text{Accessibility Impact (+20)} + \text{Community Upvotes (+2/vote, max 20)} + \text{SLA Overdue (+5 to +15)}$$
- Normalizes score between 5 and 100.
- Factor breakdown is displayed transparently in each ticket's detail view.

### E. Transparent Resolution Timeline & Citizen Verification
- Workflow: `Submitted` ➔ `Verified` ➔ `Assigned` ➔ `In Progress` ➔ `Resolved` ➔ `Citizen Verification` ➔ `Closed`.
- When an authority marks work as resolved, the ticket enters **Citizen Verification**:
  - Citizens view resolution notes and repair proof photographs.
  - Citizens can click **"Confirm Fix Verified (+15 Points)"** or **"Dispute Fix — Problem Persists"** (which reopens the ticket and notifies the supervisor).

### F. Multilingual Voice Complaints & Assisted Helpline
- **Voice Recording:** Records audio via `MediaRecorder` with playback preview.
- **Web Speech Recognition:** Transcribes speech live into editable text in **English (India)**, **Telugu (తెలుగు)**, or **Hindi (हिन्दी)**.
- **Assisted Helpline:** Toll-free banner (`1800-425-CIVIC`) with click-to-call and an operator registration portal that generates reference tickets and simulates SMS acknowledgement dispatch. Operators can analyze caller notes with Gemini 2.5 Flash or the offline classifier to prefill the issue category, subcategory, and urgency.

### G. Civic Rewards & Leaderboard
- +10 points for filing a genuine report.
- +5 points for supporting an existing report instead of creating a duplicate.
- +15 points for verifying a completed repair.
- +20 points for reporting safety-critical or accessibility hazards.
- Unlockable badges: *SDG 11 Champion*, *Accessibility Guardian*, *First Responder*, *Clean City Hero*, *Civic Leader*.

---

## 6. User Roles & Experiences

1. **Citizen Experience:**
   - Explore neighborhood pulse feed and interactive map.
   - Submit complaints with GPS, photos, and voice notes.
   - Benefit from AI categorization and duplicate avoidance.
   - Upvote issues, verify repairs, earn civic points and badges.
2. **Authority Officer Experience:**
   - Filter complaints by department workload and severity.
   - Review photo evidence, audio notes, and voice transcripts.
   - Advance ticket status, assign field crews, upload repair proof, and append audit notes.
   - Prioritize overdue SLA tickets.
3. **Administrator Experience:**
   - Configure category-to-department routing rules.
   - Adjust escalation thresholds (24h reminder, 3d zonal, 7d supervisor, 15d commissioner).
   - Review platform-wide analytics and predictive maintenance alerts.
   - Reset prototype demonstration data.

*Role Switcher:* Toggle instantly between Citizen, Authority Officer, and Administrator using the dropdown in the top header or sidebar.

---

## 7. Database Setup & Supabase Migration

The codebase provides both a fresh schema and a non-destructive migration script:

### Option A: Fresh Database Installation
Run `schema.sql` in the **Supabase Dashboard > SQL Editor > New Query**. This creates:
- `public.reports` (full v2 schema with GPS, CSI, escalation levels, and JSONB status history).
- `public.departments`, `public.community_support_votes`, `public.resolution_verifications`, and `public.civic_rewards_log`.
- Comprehensive Row Level Security (RLS) policies.

### Option B: Upgrade Existing CivicLoop Database
Run `migration_v2.sql` in the Supabase SQL Editor. It:
1. Safely drops legacy check constraints on category and status.
2. Adds `major_category`, `subcategory`, `department`, `latitude`, `longitude`, `csi_score`, `escalation_level`, `status_history`, and verification counters via `ADD COLUMN IF NOT EXISTS`.
3. Backfills existing legacy records (`Roads` ➔ `public-infra`, `Waste` ➔ `sanitation`, etc.).
4. Creates supporting tables for departments, support votes, and verifications with RLS policies and indexes.

---

## 8. Local Development & Testing Instructions

### Prerequisites
- Any modern web browser (Google Chrome, Microsoft Edge, Firefox, Safari).
- Node.js (optional, for local development server).

### Running Locally
1. **Recommended (Windows):** Double-click `start-website.bat`. It starts the website and opens `http://localhost:4200`.
2. **Using Node.js:**
   ```bash
   npm start
   ```
   Open `http://localhost:4200` if it does not open automatically. Stop the server with `Ctrl+C`.
3. Complaint records and status updates are stored in the generated `civic_data.json` file and shared by browsers using this server. Browser-only preferences and offline changes remain in local storage. Running `index.html` directly does not enable server storage.
4. To connect locally to Supabase, copy `.env.example` to `.env`, then set `DATABASE_URL` to the project's **Transaction Pooler** connection string and keep `DATABASE_SSL=true`. Start the app with `npm start`; `/health` should report `"database":"postgresql"`. `.env` is ignored by Git. Never paste the connection string into chat or commit it.

---

## 9. Free-Tier Full-Stack Deployment (Render + Supabase)

`render.yaml` configures a free Render Node.js web service. Connect it to a Supabase free-tier PostgreSQL project for shared complaint and photo storage. The API initializes the tables from `database.sql` when it starts; local development continues to use `civic_data.json`.

1. Create a private Git repository and push this project. Do not commit `.env` or database credentials.
2. Create a Supabase project on its free plan. Copy the **Transaction Pooler** PostgreSQL connection string from **Project Settings → Database** (use the pooler for IPv4-compatible hosting). Treat the connection string as a password; never post it in chat or commit it.
3. In [Render](https://render.com), create a Blueprint from your repository using `render.yaml`. Choose the free web-service plan. When prompted, provide `DATABASE_URL` using the Supabase connection string. The blueprint enables SSL for the external database connection.
4. Wait for deployment, then check `https://<your-service>.onrender.com/health`. It should report `"database":"postgresql"`.
5. Open the Render service URL and test filing and tracking a complaint from a second browser.

The current Netlify site remains unchanged. It is a static deployment and cannot run this Node API. Free-tier services have usage limits and may sleep or pause; check the current Render and Supabase free-plan terms and do not upgrade to a paid plan.

---

## 10. Honest Engineering Boundaries

To uphold academic integrity and technical credibility:

| Feature | Current Prototype Status | Future Scope Requirement |
|---|---|---|
| **Duplicate Detection** | **Working:** Haversine distance ($\le 150\text{ m}$) & token similarity. | Image embedding comparison via deep vision model (CLIP / ResNet). |
| **AI Classifier** | **Working:** Gemini 2.5 Flash with deterministic on-device fallback. | Fine-tuned municipal model. |
| **Geospatial Mapping** | **Working:** Live Leaflet & OpenStreetMap tiles with custom markers. | Real-time municipal GIS shapefile ward boundaries. |
| **Voice & Speech** | **Working:** Browser MediaRecorder & Web Speech API (EN, TE, HI). | Cloud STT API (Whisper / Google Cloud Speech) for noisy environments. |
| **Helpline Registration** | **Working:** Operator form, AI-assisted notes classification, ticket generator & simulated SMS dispatch. | Twilio / Exotel IVR telephony integration and SMS gateway. |
| **Smart Parking** | **Working:** Demonstration telemetry & citizen violation reporting. | Live IoT magnetometers / camera-based ANPR sensor feeds. |
| **Accessibility Navigator** | **Working:** Community-reported barrier radar & mapped assets. | Municipal LiDAR sidewalk slope scans and transit elevator APIs. |

---

## 11. What Distinguishes Smart Civic Connect

1. **Anti-Duplication Architecture:** Most civic portals flood municipal officers with hundreds of redundant tickets for the same pothole. Smart Civic Connect detects nearby duplicates and turns complaints into constructive support votes.
2. **Equity & Inclusivity (SDG 11.2):** Explicit focus on universal accessibility (wheelchair ramps, tactile paving, metro elevators) ensures mobility-impaired residents have first-class representation.
3. **Accountability via Verification:** City teams cannot simply mark a ticket "Resolved" without photographic evidence and citizen confirmation.
4. **Predictive Municipal Insights:** Trends and geographic clusters are translated into preventive infrastructure recommendations before catastrophic failures occur.
5. **Multi-Channel Inclusion:** Web, GPS, live camera, multilingual voice recognition, and toll-free telephone assisted registration guarantee that every citizen has a voice.

---
*Created for UN SDG 11: Sustainable Cities and Communities • One City. Every Voice. Smarter Solutions.*
