/******************** CLOCK *************************/
function updateDateTime() {
  document.getElementById('date-time').textContent =
    new Date().toLocaleString();
}
updateDateTime();
setInterval(updateDateTime, 1000);

/******************** CONTACT PAGE (regex-first) *************************/
function validateContact(e) {
  if (e && e.preventDefault) e.preventDefault();

  const firstName = document.getElementById("firstname").value.trim();
  const lastName  = document.getElementById("lastname").value.trim();
  const phone     = document.getElementById("phone").value.trim();
  const email     = document.getElementById("email").value.trim();
  const comment   = document.getElementById("comment").value.trim();
  const demoEl    = document.getElementById("demo");

  // Regex rules (per assignment)
  const nameRx   = /^[A-Z][a-zA-Z]*$/;           // alphabetic only, first letter capital
  const phoneRx  = /^\(\d{3}\)\d{3}-\d{4}$/;     // (ddd)ddd-dddd (no space)
  const emailRx  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // contains @ and .

  // Reset message
  demoEl.style.color = "#b91c1c";
  demoEl.textContent = "";

  // 1) Required
  if (!firstName || !lastName || !phone || !email || !comment) {
    demoEl.textContent = "Please fill in all required fields.";
    return false;
  }
  // 2) Names format
  if (!nameRx.test(firstName)) {
    demoEl.textContent = "First name must start with a capital letter and contain letters only.";
    return false;
  }
  if (!nameRx.test(lastName)) {
    demoEl.textContent = "Last name must start with a capital letter and contain letters only.";
    return false;
  }
  // 3) Not the same
  if (firstName.toLowerCase() === lastName.toLowerCase()) {
    demoEl.textContent = "First name and last name cannot be the same.";
    return false;
  }
  // 4) Phone format
  if (!phoneRx.test(phone)) {
    demoEl.textContent = "Phone must be in the format (123)456-7890.";
    return false;
  }
  // 5) Email format
  if (!emailRx.test(email)) {
    demoEl.textContent = "Please enter a valid email address.";
    return false;
  }
  // 6) Gender radio
  const genderEl = document.querySelector('input[name="gender"]:checked');
  if (!genderEl) {
    demoEl.textContent = "Please select a gender.";
    return false;
  }
  const gender = genderEl.value;

  // 7) Comment length
  if (comment.length < 10) {
    demoEl.textContent = "Comment must be at least 10 characters.";
    return false;
  }

  // ===== Store as JSON (localStorage + downloadable file) =====
  const record = {
    firstName, lastName, phone, email, gender, comment,
    timestamp: new Date().toISOString()
  };

  const KEY = "contact_submissions";
  const arr = JSON.parse(localStorage.getItem(KEY) || "[]");
  arr.push(record);
  localStorage.setItem(KEY, JSON.stringify(arr));

  const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = "contact_submission.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  demoEl.style.color = "#0b6cff";
  demoEl.textContent = "Form submitted successfully!";
  return false; // keep the page
}

/******************** APPEARANCE CONTROLS *************************/
document.getElementById("bgColorControl")?.addEventListener("input", function() {
  document.body.style.backgroundColor = this.value;
});
document.getElementById("fontSizeControl")?.addEventListener("input", function() {
  document.querySelector(".section")?.style && (document.querySelector(".section").style.fontSize = this.value + "px");
});

/******************** FLIGHTS – UI BASICS *************************/
// Trip type toggles the return date field
const tripRadios = document.querySelectorAll('input[name="trip"]');
const returnWrap = document.getElementById('returnWrap');
tripRadios.forEach(r => {
  r.addEventListener('change', () => {
    if (r.value === 'round' && r.checked) {
      returnWrap.style.display = '';
    } else if (r.value === 'oneway' && r.checked) {
      returnWrap.style.display = 'none';
      const returnEl = document.getElementById('returnDate');
      if (returnEl) returnEl.value = '';
    }
  });
});

// Passenger panel toggle
const paxBtn   = document.getElementById('paxBtn');
const paxPanel = document.getElementById('paxPanel');
if (paxBtn && paxPanel) {
  paxBtn.addEventListener('click', () => {
    paxPanel.style.display = (paxPanel.style.display === 'none' || paxPanel.style.display === '') ? 'block' : 'none';
  });
}

/******************** FLIGHTS – VALIDATION (regex-first) *************************/
// Cities via regex list
const txCaCityRx = new RegExp(
  '^\\s*(?:' + [
    // Texas
    'Austin','Dallas','Houston','San Antonio','El Paso','Fort Worth','Arlington','Plano','Irving','Denton',
    'Corpus Christi','Lubbock','Garland','McKinney','Frisco','Amarillo','Grand Prairie','Brownsville',
    // California
    'Los Angeles','San Diego','San Jose','San Francisco','Fresno','Sacramento','Long Beach','Oakland',
    'Bakersfield','Anaheim','Riverside','Stockton','Irvine','Santa Ana','Chula Vista','Fremont','San Bernardino'
  ].join('|') + ')\\s*$', 'i'
);

const dateRx  = /^\d{4}-\d{2}-\d{2}$/;
const minDate = new Date('2024-09-01');
const maxDate = new Date('2024-12-01');
const paxRx   = /^[0-4]$/;

const originEl = document.getElementById('origin');
const destEl   = document.getElementById('destination');
const departEl = document.getElementById('departDate');
const returnEl = document.getElementById('returnDate');

const adultEl  = document.getElementById('adultCount');
const childEl  = document.getElementById('childCount');
const infantEl = document.getElementById('infantCount');

const errorBox = document.getElementById('errorBox');
const resultBox= document.getElementById('result');

function showError(msg) { errorBox.textContent = msg; }

// Validate on Search (basic form summary)
const searchBtn = document.getElementById('searchBtn');
if (searchBtn) {
  searchBtn.addEventListener('click', () => {
    errorBox.textContent = '';
    resultBox.style.display = 'none';
    resultBox.innerHTML = '';

    const trip   = document.querySelector('input[name="trip"]:checked')?.value || 'oneway';
    const origin = (originEl?.value || '').trim();
    const dest   = (destEl?.value || '').trim();
    const depart = (departEl?.value || '').trim();
    const ret    = (returnEl?.value || '').trim();

    const a = (adultEl?.value || '').trim();
    const c = (childEl?.value || '').trim();
    const i = (infantEl?.value || '').trim();

    if (!txCaCityRx.test(origin)) return showError('Origin must be a city in Texas or California.');
    if (!txCaCityRx.test(dest))   return showError('Destination must be a city in Texas or California.');

    if (!dateRx.test(depart)) return showError('Departure date must be in YYYY-MM-DD format.');
    const dDate = new Date(depart);
    if (isNaN(dDate) || dDate < minDate || dDate > maxDate)
      return showError('Departure date must be between 2024-09-01 and 2024-12-01.');

    if (trip === 'round') {
      if (!dateRx.test(ret)) return showError('Return date must be in YYYY-MM-DD format.');
      const rDate = new Date(ret);
      if (isNaN(rDate) || rDate < minDate || rDate > maxDate)
        return showError('Return date must be between 2024-09-01 and 2024-12-01.');
      if (rDate < dDate) return showError('Return date cannot be before the departure date.');
    }

    if (!paxRx.test(a)) return showError('Adults must be a number from 0 to 4.');
    if (!paxRx.test(c)) return showError('Children must be a number from 0 to 4.');
    if (!paxRx.test(i)) return showError('Infants must be a number from 0 to 4.');
    const total = Number(a) + Number(c) + Number(i);
    if (total < 1) return showError('At least one passenger is required.');

    const lines = [
      `<strong>Trip type:</strong> ${trip === 'round' ? 'Round trip' : 'One-way'}`,
      `<strong>Origin:</strong> ${origin}`,
      `<strong>Destination:</strong> ${dest}`,
      `<strong>Departure:</strong> ${depart}`,
    ];
    if (trip === 'round') lines.push(`<strong>Return:</strong> ${ret}`);
    lines.push(`<strong>Passengers:</strong> Adults ${a}, Children ${c}, Infants ${i}`);

    resultBox.innerHTML = lines.join('<br>');
    resultBox.style.display = 'block';
  });
}

/******************** FLIGHTS DB (manual-only) *************************/
const FLIGHTS_DB_KEY = 'flights_db_manual_v1';
const FLIGHTS_DB_META_KEY = 'flights_db_manual_meta';

// Read/write only our manual DB key
function getFlightsDb() {
  return JSON.parse(localStorage.getItem(FLIGHTS_DB_KEY) || '[]');
}
function saveFlightsDb(db) {
  localStorage.setItem(FLIGHTS_DB_KEY, JSON.stringify(db));
}

/**
 * Seed localStorage with our manual JSON DB if not already present.
 * Call ensureManualFlightsDb(true) to reseed during development.
 */
function ensureManualFlightsDb(force = false) {
  const meta = JSON.parse(localStorage.getItem(FLIGHTS_DB_META_KEY) || 'null');

  if (
    !force &&
    Array.isArray(getFlightsDb()) &&
    getFlightsDb().length &&
    meta?.source === 'manual' &&
    meta?.version === 1
  ) {
    return; // already seeded by our manual v1 DB
  }

  const flights = [
    // ----- TX → CA -----
    { flightId:"TXCA-001", origin:"Dallas",       destination:"Los Angeles",  departDate:"2024-09-01", arrivalDate:"2024-09-01", departTime:"07:30", arrivalTime:"10:40", availableSeats:90, price:220 },
    { flightId:"TXCA-001", origin:"Dallas",       destination:"Los Angeles",  departDate:"2024-09-02", arrivalDate:"2024-09-02", departTime:"07:30", arrivalTime:"10:40", availableSeats:90, price:220 },
    { flightId:"TXCA-002", origin:"Houston",      destination:"San Diego",    departDate:"2024-09-02", arrivalDate:"2024-09-02", departTime:"09:15", arrivalTime:"12:25", availableSeats:72, price:210 },
    { flightId:"TXCA-003", origin:"Austin",       destination:"San Jose",     departDate:"2024-09-03", arrivalDate:"2024-09-03", departTime:"13:10", arrivalTime:"16:20", availableSeats:65, price:195 },
    { flightId:"TXCA-004", origin:"San Antonio",  destination:"San Francisco",departDate:"2024-09-04", arrivalDate:"2024-09-04", departTime:"10:05", arrivalTime:"13:15", availableSeats:80, price:235 },
    { flightId:"TXCA-005", origin:"El Paso",      destination:"Sacramento",   departDate:"2024-09-05", arrivalDate:"2024-09-05", departTime:"08:25", arrivalTime:"11:35", availableSeats:50, price:175 },
    { flightId:"TXCA-006", origin:"Fort Worth",   destination:"Oakland",      departDate:"2024-09-06", arrivalDate:"2024-09-06", departTime:"11:45", arrivalTime:"14:55", availableSeats:88, price:205 },
    { flightId:"TXCA-007", origin:"Dallas",       destination:"San Diego",    departDate:"2024-09-08", arrivalDate:"2024-09-08", departTime:"18:10", arrivalTime:"21:20", availableSeats:76, price:215 },
    { flightId:"TXCA-008", origin:"Houston",      destination:"Los Angeles",  departDate:"2024-09-09", arrivalDate:"2024-09-09", departTime:"06:50", arrivalTime:"10:00", availableSeats:84, price:230 },
    { flightId:"TXCA-009", origin:"Austin",       destination:"San Francisco",departDate:"2024-09-10", arrivalDate:"2024-09-10", departTime:"12:00", arrivalTime:"15:10", availableSeats:62, price:228 },
    { flightId:"TXCA-010", origin:"San Antonio",  destination:"San Jose",     departDate:"2024-09-11", arrivalDate:"2024-09-11", departTime:"16:20", arrivalTime:"19:30", availableSeats:55, price:205 },
    { flightId:"TXCA-011", origin:"El Paso",      destination:"Los Angeles",  departDate:"2024-09-12", arrivalDate:"2024-09-12", departTime:"07:40", arrivalTime:"09:55", availableSeats:60, price:185 },
    { flightId:"TXCA-012", origin:"Fort Worth",   destination:"San Diego",    departDate:"2024-09-13", arrivalDate:"2024-09-13", departTime:"14:35", arrivalTime:"17:45", availableSeats:93, price:220 },
    { flightId:"TXCA-013", origin:"Dallas",       destination:"Oakland",      departDate:"2024-09-15", arrivalDate:"2024-09-15", departTime:"10:30", arrivalTime:"13:40", availableSeats:77, price:209 },
    { flightId:"TXCA-014", origin:"Houston",      destination:"San Jose",     departDate:"2024-09-16", arrivalDate:"2024-09-16", departTime:"19:00", arrivalTime:"22:10", availableSeats:70, price:204 },
    { flightId:"TXCA-015", origin:"Austin",       destination:"Los Angeles",  departDate:"2024-09-17", arrivalDate:"2024-09-17", departTime:"06:25", arrivalTime:"08:40", availableSeats:92, price:199 },
    { flightId:"TXCA-016", origin:"San Antonio",  destination:"Sacramento",   departDate:"2024-09-18", arrivalDate:"2024-09-18", departTime:"09:45", arrivalTime:"12:55", availableSeats:64, price:212 },
    { flightId:"TXCA-017", origin:"El Paso",      destination:"San Francisco",departDate:"2024-09-19", arrivalDate:"2024-09-19", departTime:"13:50", arrivalTime:"16:55", availableSeats:58, price:206 },
    { flightId:"TXCA-018", origin:"Fort Worth",   destination:"Los Angeles",  departDate:"2024-09-20", arrivalDate:"2024-09-20", departTime:"08:15", arrivalTime:"11:25", availableSeats:96, price:218 },
    { flightId:"TXCA-019", origin:"Dallas",       destination:"San Francisco",departDate:"2024-10-01", arrivalDate:"2024-10-01", departTime:"07:30", arrivalTime:"10:50", availableSeats:82, price:240 },
    { flightId:"TXCA-020", origin:"Houston",      destination:"Oakland",      departDate:"2024-10-03", arrivalDate:"2024-10-03", departTime:"15:10", arrivalTime:"18:20", availableSeats:73, price:215 },
    { flightId:"TXCA-021", origin:"Austin",       destination:"San Diego",    departDate:"2024-10-05", arrivalDate:"2024-10-05", departTime:"09:20", arrivalTime:"12:35", availableSeats:67, price:205 },
    { flightId:"TXCA-022", origin:"San Antonio",  destination:"Los Angeles",  departDate:"2024-10-08", arrivalDate:"2024-10-08", departTime:"18:40", arrivalTime:"21:50", availableSeats:71, price:230 },
    { flightId:"TXCA-023", origin:"El Paso",      destination:"San Jose",     departDate:"2024-10-10", arrivalDate:"2024-10-10", departTime:"06:55", arrivalTime:"10:00", availableSeats:52, price:192 },
    { flightId:"TXCA-024", origin:"Fort Worth",   destination:"Sacramento",   departDate:"2024-10-12", arrivalDate:"2024-10-12", departTime:"11:05", arrivalTime:"14:20", availableSeats:88, price:214 },
    { flightId:"TXCA-025", origin:"Dallas",       destination:"San Jose",     departDate:"2024-11-02", arrivalDate:"2024-11-02", departTime:"12:10", arrivalTime:"15:20", availableSeats:79, price:222 },
    { flightId:"TXCA-027", origin:"Dallas",       destination:"Los Angeles",  departDate:"2024-11-05", arrivalDate:"2024-11-05", departTime:"17:00", arrivalTime:"20:10", availableSeats:91, price:225 },

    // ----- CA → TX -----
    { flightId:"CATX-026", origin:"Los Angeles",  destination:"Dallas",       departDate:"2024-09-01", arrivalDate:"2024-09-01", departTime:"17:00", arrivalTime:"20:10", availableSeats:91, price:225 },
    { flightId:"CATX-026", origin:"Los Angeles",  destination:"Dallas",       departDate:"2024-11-06", arrivalDate:"2024-11-06", departTime:"17:00", arrivalTime:"20:10", availableSeats:91, price:225 },
    { flightId:"CATX-027", origin:"San Diego",    destination:"Houston",      departDate:"2024-09-02", arrivalDate:"2024-09-02", departTime:"18:40", arrivalTime:"21:55", availableSeats:69, price:215 },
    { flightId:"CATX-028", origin:"San Jose",     destination:"Austin",       departDate:"2024-09-03", arrivalDate:"2024-09-03", departTime:"06:30", arrivalTime:"09:40", availableSeats:61, price:200 },
    { flightId:"CATX-029", origin:"San Francisco",destination:"San Antonio",   departDate:"2024-09-04", arrivalDate:"2024-09-04", departTime:"07:15", arrivalTime:"10:25", availableSeats:74, price:240 },
    { flightId:"CATX-030", origin:"Sacramento",   destination:"El Paso",      departDate:"2024-09-05", arrivalDate:"2024-09-05", departTime:"12:10", arrivalTime:"15:20", availableSeats:48, price:182 },
    { flightId:"CATX-031", origin:"Oakland",      destination:"Fort Worth",   departDate:"2024-09-06", arrivalDate:"2024-09-06", departTime:"15:30", arrivalTime:"18:40", availableSeats:92, price:210 },
    { flightId:"CATX-032", origin:"San Diego",    destination:"Dallas",       departDate:"2024-09-08", arrivalDate:"2024-09-08", departTime:"07:25", arrivalTime:"10:35", availableSeats:78, price:216 },
    { flightId:"CATX-033", origin:"Los Angeles",  destination:"Houston",      departDate:"2024-09-09", arrivalDate:"2024-09-09", departTime:"20:20", arrivalTime:"23:35", availableSeats:86, price:232 },
    { flightId:"CATX-034", origin:"San Francisco",destination:"Austin",       departDate:"2024-09-10", arrivalDate:"2024-09-10", departTime:"13:30", arrivalTime:"16:45", availableSeats:63, price:229 },
    { flightId:"CATX-035", origin:"San Jose",     destination:"San Antonio",  departDate:"2024-09-11", arrivalDate:"2024-09-11", departTime:"10:00", arrivalTime:"13:05", availableSeats:57, price:208 },
    { flightId:"CATX-036", origin:"Los Angeles",  destination:"El Paso",      departDate:"2024-09-12", arrivalDate:"2024-09-12", departTime:"08:40", arrivalTime:"11:00", availableSeats:59, price:188 },
    { flightId:"CATX-037", origin:"San Diego",    destination:"Fort Worth",   departDate:"2024-09-13", arrivalDate:"2024-09-13", departTime:"16:35", arrivalTime:"19:50", availableSeats:95, price:221 },
    { flightId:"CATX-038", origin:"Oakland",      destination:"Dallas",       departDate:"2024-09-15", arrivalDate:"2024-09-15", departTime:"11:30", arrivalTime:"14:45", availableSeats:76, price:212 },
    { flightId:"CATX-039", origin:"San Jose",     destination:"Houston",      departDate:"2024-09-16", arrivalDate:"2024-09-16", departTime:"06:10", arrivalTime:"09:25", availableSeats:68, price:204 },
    { flightId:"CATX-040", origin:"Los Angeles",  destination:"Austin",       departDate:"2024-09-17", arrivalDate:"2024-09-17", departTime:"18:25", arrivalTime:"21:35", availableSeats:89, price:206 },
    { flightId:"CATX-041", origin:"Sacramento",   destination:"San Antonio",  departDate:"2024-09-18", arrivalDate:"2024-09-18", departTime:"09:40", arrivalTime:"12:55", availableSeats:60, price:216 },
    { flightId:"CATX-042", origin:"San Francisco",destination:"El Paso",      departDate:"2024-09-19", arrivalDate:"2024-09-19", departTime:"14:50", arrivalTime:"18:05", availableSeats:54, price:207 },
    { flightId:"CATX-043", origin:"Los Angeles",  destination:"Fort Worth",   departDate:"2024-09-20", arrivalDate:"2024-09-20", departTime:"07:20", arrivalTime:"10:30", availableSeats:97, price:219 },
    { flightId:"CATX-044", origin:"San Francisco",destination:"Dallas",       departDate:"2024-10-01", arrivalDate:"2024-10-01", departTime:"08:05", arrivalTime:"11:15", availableSeats:83, price:242 },
    { flightId:"CATX-045", origin:"Oakland",      destination:"Houston",      departDate:"2024-10-03", arrivalDate:"2024-10-03", departTime:"17:40", arrivalTime:"20:55", availableSeats:72, price:218 },
    { flightId:"CATX-046", origin:"San Diego",    destination:"Austin",       departDate:"2024-10-05", arrivalDate:"2024-10-05", departTime:"12:20", arrivalTime:"15:30", availableSeats:66, price:206 },
    { flightId:"CATX-047", origin:"Los Angeles",  destination:"San Antonio",  departDate:"2024-10-08", arrivalDate:"2024-10-08", departTime:"06:55", arrivalTime:"10:05", availableSeats:70, price:231 },
    { flightId:"CATX-048", origin:"San Jose",     destination:"El Paso",      departDate:"2024-10-10", arrivalDate:"2024-10-10", departTime:"19:10", arrivalTime:"22:20", availableSeats:51, price:193 },
    { flightId:"CATX-049", origin:"Sacramento",   destination:"Fort Worth",   departDate:"2024-10-12", arrivalDate:"2024-10-12", departTime:"11:15", arrivalTime:"14:25", availableSeats:87, price:216 },
    { flightId:"CATX-050", origin:"San Jose",     destination:"Dallas",       departDate:"2024-11-02", arrivalDate:"2024-11-02", departTime:"13:05", arrivalTime:"16:15", availableSeats:80, price:224 }
  ];

  saveFlightsDb(flights);
  localStorage.setItem(
    FLIGHTS_DB_META_KEY,
    JSON.stringify({ source: 'manual', version: 1, seededAt: new Date().toISOString() })
  );

  // Optional one-time download for your records
  try {
    const blob = new Blob([JSON.stringify(flights, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'flights.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {}
}

/******************** SEARCH HELPERS *************************/
function dateToYMD(d){ const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }
function ymdToDate(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }

/**
 * Search flights for an exact date; if none, return ±3-day alternatives.
 * Options:
 *   - opts.minYmd: lower bound (YYYY-MM-DD). Alt dates earlier than this are skipped.
 */
function searchFlights(origin, destination, ymd, paxNeeded, opts = {}) {
  const db = getFlightsDb();
  const minYmd = opts.minYmd || null;

  let matches = db.filter(f =>
    f.origin.toLowerCase() === origin.toLowerCase() &&
    f.destination.toLowerCase() === destination.toLowerCase() &&
    f.departDate === ymd &&
    f.availableSeats >= paxNeeded
  );

  if (matches.length) return { exact: matches, alt: [] };

  // ±3 days if none on exact
  const center = ymdToDate(ymd);
  if (isNaN(center)) return { exact: [], alt: [] };

  const alt = [];
  for (let offset=-3; offset<=3; offset++) {
    if (offset===0) continue;
    const dt = new Date(center); dt.setDate(center.getDate()+offset);
    const y = dateToYMD(dt);

    // Enforce lower bound if provided
    if (minYmd && y < minYmd) continue;

    const dayMatches = db.filter(f =>
      f.origin.toLowerCase() === origin.toLowerCase() &&
      f.destination.toLowerCase() === destination.toLowerCase() &&
      f.departDate === y &&
      f.availableSeats >= paxNeeded
    );
    if (dayMatches.length) alt.push({ date: y, flights: dayMatches });
  }
  return { exact: [], alt };
}

/******************** RENDER HELPERS *************************/
function flightCardHTML(f) {
  // unique per row because some flightIds repeat (different dates)
  const rowId = `${f.flightId}|${f.departDate}`;
  return `
    <div class="flightCard">
      <div><strong>Flight ID:</strong> ${f.flightId}</div>
      <div><strong>Origin:</strong> ${f.origin}</div>
      <div><strong>Destination:</strong> ${f.destination}</div>
      <div><strong>Departure date:</strong> ${f.departDate}</div>
      <div><strong>Arrival date:</strong> ${f.arrivalDate}</div>
      <div><strong>Departure time:</strong> ${f.departTime}</div>
      <div><strong>Arrival time:</strong> ${f.arrivalTime}</div>
      <div><strong>Number of available seats:</strong> ${f.availableSeats}</div>
      <div><strong>Price (Adult):</strong> $${f.price}</div>
      <button class="btn addFlight" data-id="${rowId}">Select</button>
    </div>
  `;
}
function renderFlights(listEl, flights) {
  listEl.innerHTML = flights.length ? flights.map(f => flightCardHTML(f)).join('') : '<p>No flights.</p>';
}
function renderAltFlights(listEl, alt) {
  if (!alt.length) {
    listEl.innerHTML += `<p>No alternate dates within ±3 days.</p>`;
    return;
  }
  listEl.innerHTML += `<h5>Also available within ±3 days:</h5>`;
  alt.sort((a,b)=>a.date.localeCompare(b.date));
  alt.forEach(group => {
    listEl.innerHTML += `<p><em>${group.date}</em></p>` +
      group.flights.map(f => flightCardHTML(f)).join('');
  });
}

/******************** WIRING: FLIGHTS PAGE *************************/
document.addEventListener('DOMContentLoaded', () => {
  // Build the DB once from the manual list
  ensureManualFlightsDb();

  const resultsWrap   = document.getElementById('flightResults');
  if (!resultsWrap) return; // not on flights page

  const originEl = document.getElementById('origin');
  const destEl   = document.getElementById('destination');
  const departEl = document.getElementById('departDate');
  const returnEl = document.getElementById('returnDate');
  const adultEl  = document.getElementById('adultCount');
  const childEl  = document.getElementById('childCount');
  const infantEl = document.getElementById('infantCount');

  const outList       = document.getElementById('outboundList');
  const inWrap        = document.getElementById('inboundWrap');
  const inList        = document.getElementById('inboundList');
  const addBothWrap   = document.getElementById('addBothContainer');
  const addBothBtn    = document.getElementById('addRoundToCart');

  // Expose context + selections globally so the click handler can see them
  window.currentContext   = { paxTotal: 0, trip: 'oneway', origin: '', dest: '', depart: '', ret: '' };
  window.selectedOutbound = null;
  window.selectedInbound  = null;

  // Search button
  const searchBtn = document.getElementById('searchBtn');
  searchBtn?.addEventListener('click', () => {
    const trip = document.querySelector('input[name="trip"]:checked')?.value || 'oneway';
    const origin = (originEl?.value || '').trim();
    const dest   = (destEl?.value || '').trim();
    const depart = (departEl?.value || '').trim();
    const ret    = (returnEl?.value || '').trim();

    const a = Number((adultEl?.value || '0').trim());
    const c = Number((childEl?.value || '0').trim());
    const i = Number((infantEl?.value || '0').trim());
    const paxTotal = a + c + i;

    window.currentContext = { paxTotal, trip, origin, dest, depart, ret };
    window.selectedOutbound = null;
    window.selectedInbound  = null;

    // OUTBOUND search
    const out = searchFlights(origin, dest, depart, paxTotal);
    outList.innerHTML = '';
    renderFlights(outList, out.exact);
    renderAltFlights(outList, out.alt);

    // INBOUND (round trip)
    if (trip === 'round') {
      inWrap.style.display = '';
      // IMPORTANT: do not show alt inbound dates earlier than departure date
      const back = searchFlights(dest, origin, ret, paxTotal, { minYmd: depart });
      inList.innerHTML = '';
      renderFlights(inList, back.exact);
      renderAltFlights(inList, back.alt);
      addBothWrap.style.display = 'none';
    } else {
      inWrap.style.display = 'none';
      addBothWrap.style.display = 'none';
    }

    resultsWrap.style.display = 'block';
  });

  // Add both to cart (round trip)
  addBothBtn?.addEventListener('click', () => {
    if (!(window.selectedOutbound && window.selectedInbound)) return;
    if (typeof window.addRoundToCart === 'function') {
      window.addRoundToCart(window.selectedOutbound, window.selectedInbound, window.currentContext);
    } else {
      // Minimal fallback
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const getVal = id => Number((document.getElementById(id)?.value || '0').trim());
      cart.push({
        type: 'round',
        counts: { adults: getVal('adultCount'), children: getVal('childCount'), infants: getVal('infantCount') },
        outbound: window.selectedOutbound,
        inbound:  window.selectedInbound
      });
      localStorage.setItem('cart', JSON.stringify(cart));
    }
    alert('Departing + Returning flights added to cart!');
    addBothWrap.style.display = 'none';
  });
});

/******************** SELECT BUTTON HANDLER (works for both lists) ******/
document.addEventListener('click', (e) => {
  if (!(e.target && e.target.classList.contains('addFlight'))) return;
  const id = e.target.getAttribute('data-id');        // "flightId|departDate"
  const [fid, fdate] = (id || '').split('|');
  const db = getFlightsDb();
  const f  = db.find(x => x.flightId === fid && x.departDate === fdate);
  if (!f) return;

  // Round-trip: select outbound / inbound separately
  if (window.currentContext?.trip === 'round') {
    const isOutboundBtn = document.getElementById('outboundList')
                         ?.contains(e.target.closest('.flightCard'));
    if (isOutboundBtn) {
      window.selectedOutbound = f;
      e.target.textContent = 'Selected (departing)';
    } else {
      window.selectedInbound = f;
      e.target.textContent = 'Selected (returning)';
    }
    const addBothWrap = document.getElementById('addBothContainer');
    if (window.selectedOutbound && window.selectedInbound && addBothWrap) {
      addBothWrap.style.display = '';
    }
  } else {
    // One-way: add directly to cart via your helper if present
    if (typeof window.addOneWayToCart === 'function') {
      window.addOneWayToCart(f, window.currentContext);
    } else {
      // Minimal fallback
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const getVal = id => Number((document.getElementById(id)?.value || '0').trim());
      cart.push({
        type: 'oneway',
        counts: { adults: getVal('adultCount'), children: getVal('childCount'), infants: getVal('infantCount') },
        outbound: f
      });
      localStorage.setItem('cart', JSON.stringify(cart));
    }
    alert('Flight added to cart!');
  }
});

/******************** CART HELPERS *************************/
function getCart(){ return JSON.parse(localStorage.getItem('cart') || '[]'); }
function setCart(v){ localStorage.setItem('cart', JSON.stringify(v)); }
function getVal(id){ const v = document.getElementById(id)?.value || '0'; return Number(v.trim()); }

function addOneWayToCart(flight, ctx) {
  const cart = getCart();
  cart.push({
    type: 'oneway',
    counts: { adults: getVal('adultCount'), children: getVal('childCount'), infants: getVal('infantCount') },
    outbound: flight
  });
  setCart(cart);
}

function addRoundToCart(outbound, inbound, ctx) {
  const cart = getCart();
  cart.push({
    type: 'round',
    counts: { adults: getVal('adultCount'), children: getVal('childCount'), infants: getVal('infantCount') },
    outbound, inbound
  });
  setCart(cart);
}

/* ==================== STAYS PAGE LOGIC (no RegExp) ==================== */

// Allowed cities (Texas & California) – case-insensitive match without regex
const TX_CITIES = [
  "austin","dallas","houston","san antonio","el paso","fort worth","arlington","plano","irving","Denton",
  "corpus christi","lubbock","garland","mckinney","frisco","amarillo","grand prairie","brownsville"
];
const CA_CITIES = [
  "los angeles","san diego","san jose","san francisco","fresno","sacramento","long beach","oakland",
  "bakersfield","anaheim","riverside","stockton","irvine","santa ana","chula vista","fremont","san bernardino"
];

// Date window (inclusive): 2024-09-01 .. 2024-12-01
const STAY_MIN = new Date("2024-09-01");
const STAY_MAX = new Date("2024-12-01");

// Helpers (no regex)
function isEmpty(v){ return v === null || v === undefined || String(v).trim() === ""; }
function parseIntSafe(v){ const n = Number(v); return Number.isFinite(n) ? n : NaN; }
function isCityTXorCA(name){
  const n = String(name || "").trim().toLowerCase();
  return TX_CITIES.includes(n) || CA_CITIES.includes(n);
}
function inDateWindow(d){
  // valid Date and within inclusive range
  return d instanceof Date && !isNaN(d) && d >= STAY_MIN && d <= STAY_MAX;
}
function computeRooms(adults, children){
  // Rule: “Number of guests cannot be more than 2 for each room.
  // However infants can stay with adults even if the number of guests exceeds 2.”
  // => We count only Adults + Children towards room capacity (2 per room).
  const paying = Math.max(0, adults) + Math.max(0, children);
  return Math.max(1, Math.ceil(paying / 2)); // at least 1 room if any guests
}

// Hook up the button if we are on the Stays page
document.addEventListener("DOMContentLoaded", function(){
  const btn = document.getElementById("staySearchBtn");
  if(!btn) return;

  const cityEl     = document.getElementById("stayCity");
  const inEl       = document.getElementById("checkIn");
  const outEl      = document.getElementById("checkOut");
  const adEl       = document.getElementById("stayAdults");
  const chEl       = document.getElementById("stayChildren");
  const infEl      = document.getElementById("stayInfants");
  const errBox     = document.getElementById("stayError");
  const resultBox  = document.getElementById("stayResult");

  btn.addEventListener("click", function(){
    // clear messages
    errBox.textContent = "";
    resultBox.style.display = "none";
    resultBox.innerHTML = "";

    // 1) Required fields
    if (isEmpty(cityEl.value) || isEmpty(inEl.value) || isEmpty(outEl.value)) {
      errBox.textContent = "Please enter city, check-in, and check-out dates.";
      return;
    }

    // 2) City must be in TX or CA (no regex)
    if (!isCityTXorCA(cityEl.value)) {
      errBox.textContent = "City must be in Texas or California.";
      return;
    }

    // 3) Dates: valid & within 2024-09-01 .. 2024-12-01, and check-out after check-in
    const inDate  = new Date(inEl.value);
    const outDate = new Date(outEl.value);

    if (!inDateWindow(inDate) || !inDateWindow(outDate)) {
      errBox.textContent = "Dates must be between 2024-09-01 and 2024-12-01.";
      return;
    }
    if (!(outDate > inDate)) {
      errBox.textContent = "Check-out date must be after check-in date.";
      return;
    }

    // 4) Guests: integers ≥ 0
    const ad = parseIntSafe(adEl.value);
    const ch = parseIntSafe(chEl.value);
    const inf = parseIntSafe(infEl.value);

    if (!Number.isInteger(ad) || ad < 0 ||
        !Number.isInteger(ch) || ch < 0 ||
        !Number.isInteger(inf) || inf < 0) {
      errBox.textContent = "Guest counts must be whole numbers ≥ 0.";
      return;
    }

    // 5) Capacity rule
    if ((ad + ch + inf) < 1) {
      errBox.textContent = "Please specify at least one guest.";
      return;
    }

    const rooms = computeRooms(ad, ch);

    // 6) Show summary
    const lines = [
      `<strong>City:</strong> ${cityEl.value.trim()}`,
      `<strong>Check-in:</strong> ${inEl.value}`,
      `<strong>Check-out:</strong> ${outEl.value}`,
      `<strong>Guests:</strong> Adults ${ad}, Children ${ch}, Infants ${inf}`,
      `<strong>Rooms needed:</strong> ${rooms}`
    ];
    resultBox.innerHTML = lines.join("<br>");
    resultBox.style.display = "block";
  });
});

/* ==================== CARS PAGE LOGIC (DOM methods) ==================== */

// Allowed cities (lowercase, no regex needed)
const TX_CITIES_CAR = [
  "austin","dallas","houston","san antonio","el paso","fort worth","arlington","plano","irving",
  "corpus christi","lubbock","garland","mckinney","frisco","amarillo","grand prairie","brownsville"
];
const CA_CITIES_CAR = [
  "los angeles","san diego","san jose","san francisco","fresno","sacramento","long beach","oakland",
  "bakersfield","anaheim","riverside","stockton","irvine","santa ana","chula vista","fremont","san bernardino"
];

// Valid car types (lowercase)
const VALID_CAR_TYPES = ["economy","suv","compact","midsize"];

// Date window (inclusive)
const CAR_MIN = new Date("2024-09-01");
const CAR_MAX = new Date("2024-12-01");

// Helpers
function lc(v){ return String(v || "").trim().toLowerCase(); }
function isCityTXorCA_CAR(name){
  const n = lc(name);
  return TX_CITIES_CAR.includes(n) || CA_CITIES_CAR.includes(n);
}
function inDateWindow_CAR(d){
  return d instanceof Date && !isNaN(d) && d >= CAR_MIN && d <= CAR_MAX;
}

document.addEventListener("DOMContentLoaded", function(){
  const cityEl   = document.getElementById("carCity");
  const typeEl   = document.getElementById("carType");
  const inEl     = document.getElementById("carCheckIn");
  const outEl    = document.getElementById("carCheckOut");
  const btn      = document.getElementById("carSubmit");
  const errBox   = document.getElementById("carError");
  const result   = document.getElementById("carResult");

  if (!btn) return;

  btn.addEventListener("click", function () {
    // reset
    errBox.textContent = "";
    result.style.display = "none";
    result.innerHTML = "";

    const city  = cityEl.value.trim();
    const type  = typeEl.value;           // select value
    const inVal = inEl.value;
    const outVal= outEl.value;

    // 1) Field-by-field required checks
    if (!city)  return (errBox.textContent = "Please enter a city.");
    if (!type)  return (errBox.textContent = "Please select a car type.");
    if (!inVal) return (errBox.textContent = "Please choose a pick-up date.");
    if (!outVal)return (errBox.textContent = "Please choose a drop-off date.");

    // 2) City must be TX/CA
    if (!isCityTXorCA_CAR(city)) {
      errBox.textContent = "City must be a city in Texas or California.";
      return;
    }

    // 3) Car type must be in allowed list 
    const chosenType = lc(type);
    if (!VALID_CAR_TYPES.includes(chosenType)) {
      errBox.textContent = "Car type must be Economy, SUV, Compact, or Midsize.";
      return;
    }

    // 4) Dates window + order
    const inDate  = new Date(inVal);
    const outDate = new Date(outVal);
    if (!inDateWindow_CAR(inDate) || !inDateWindow_CAR(outDate)) {
      errBox.textContent = "Dates must be between 2024-09-01 and 2024-12-01.";
      return;
    }
    if (!(outDate > inDate)) {
      errBox.textContent = "Drop-off date must be after pick-up date.";
      return;
    }

    // 5) Success
    result.innerHTML = [
      `<strong>City:</strong> ${city}`,
      `<strong>Car Type:</strong> ${typeEl.options[typeEl.selectedIndex].text}`,
      `<strong>Pick-up:</strong> ${inVal}`,
      `<strong>Drop-off:</strong> ${outVal}`
    ].join("<br>");
    result.style.display = "block";
  });
});

/******************** CART PAGE BOOTSTRAP *************************/
document.addEventListener('DOMContentLoaded', () => {
  const cartFlights = document.getElementById('cartFlights');
  const cartTotalEl = document.getElementById('cartTotal');
  const formWrap    = document.getElementById('passengerFormWrap');
  const formEl      = document.getElementById('passengerForm');
  const bookBtn     = document.getElementById('bookBtn');
  const bookMsg     = document.getElementById('bookMsg');

  if (!cartFlights || !cartTotalEl) return; // not on cart page

  const money = n => '$' + n.toFixed(2);
  let workingItem = null;

  function labeledFlightHTML(f, title=null) {
    return `
      <div class="flightCard">
        ${title ? `<div style="margin-bottom:6px;"><strong>${title}</strong></div>` : ""}
        <div><strong>Flight ID:</strong> ${f.flightId}</div>
        <div><strong>Origin:</strong> ${f.origin}</div>
        <div><strong>Destination:</strong> ${f.destination}</div>
        <div><strong>Departure date:</strong> ${f.departDate}</div>
        <div><strong>Arrival date:</strong> ${f.arrivalDate}</div>
        <div><strong>Departure time:</strong> ${f.departTime}</div>
        <div><strong>Arrival time:</strong> ${f.arrivalTime}</div>
      </div>
    `;
  }

  function renderCart() {
    const cart = getCart();
    if (!cart.length) {
      cartFlights.innerHTML = '<p>Your cart is empty.</p>';
      cartTotalEl.textContent = '$0.00';
      if (formWrap) formWrap.style.display = 'none';
      return;
    }
    workingItem = cart[cart.length - 1];
    const counts = workingItem.counts || { adults: 0, children: 0, infants: 0 };
    const legs = (workingItem.type === 'round') ? [workingItem.outbound, workingItem.inbound] : [workingItem.outbound];

    const legHtml = legs.map((f, i) =>
      labeledFlightHTML(f, workingItem.type === 'round' ? (i === 0 ? 'Departing flight' : 'Returning flight') : null)
    ).join('');

    const adultPrice = legs.reduce((s,f)=>s+f.price, 0);
    const childPrice = adultPrice * 0.70;
    const infantPrice= adultPrice * 0.10;
    const total = counts.adults*adultPrice + counts.children*childPrice + counts.infants*infantPrice;

    cartFlights.innerHTML = `
      <p><strong>Trip:</strong> ${workingItem.type === 'round' ? 'Round trip' : 'One-way'}</p>
      ${legHtml}
      <p><strong>Passengers:</strong> Adults ${counts.adults}, Children ${counts.children}, Infants ${counts.infants}</p>
      <p><em>Fare rule:</em> Child = 70% of adult, Infant = 10% of adult.</p>
    `;
    cartTotalEl.textContent = money(total);

    const totalPax = (counts.adults|0)+(counts.children|0)+(counts.infants|0);
    if (formWrap && formEl) {
      if (totalPax > 0) {
        formEl.innerHTML = '';
        for (let k=1;k<=totalPax;k++){
          formEl.innerHTML += `
            <fieldset style="margin-bottom:10px;">
              <legend>Passenger ${k}</legend>
              <label>First name <input required name="fn${k}" type="text"></label>
              <label>Last name <input required name="ln${k}" type="text"></label>
              <label>Date of Birth <input required name="dob${k}" type="date"></label>
              <label>SSN <input required name="ssn${k}" type="text" placeholder="XXX-XX-XXXX"></label>
            </fieldset>
          `;
        }
        formWrap.style.display = '';
      } else {
        formWrap.style.display = 'none';
      }
    }
  }

  renderCart();

  function getOrCreateUserId(){
    let uid = localStorage.getItem('user_id');
    if (!uid) {
      uid = 'U-' + Math.random().toString(36).slice(2,8).toUpperCase();
      localStorage.setItem('user_id', uid);
    }
    return uid;
  }
  function newBookingNumber(){
    const d = new Date();
    const pad=n=>String(n).padStart(2,'0');
    const tag = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
    return 'BK-' + tag + '-' + Math.random().toString(36).slice(2,6).toUpperCase();
  }

  bookBtn?.addEventListener('click', (e)=>{
    e.preventDefault();
    if (!workingItem) return;

    const data = new FormData(formEl);
    const counts = workingItem.counts || {adults:0,children:0,infants:0};
    const totalPax = (counts.adults|0)+(counts.children|0)+(counts.infants|0);
    const pax = [];
    for (let k=1;k<=totalPax;k++){
      const fn = data.get('fn'+k)?.trim();
      const ln = data.get('ln'+k)?.trim();
      const dob= data.get('dob'+k);
      const ssn= data.get('ssn'+k)?.trim();
      if (!fn || !ln || !dob || !ssn) { alert('Please fill all passenger fields.'); return; }
      pax.push({ ssn, firstName: fn, lastName: ln, dob });
    }

    const legs = (workingItem.type === 'round') ? [workingItem.outbound, workingItem.inbound] : [workingItem.outbound];
    const adultFare = legs.reduce((s,f)=>s+f.price,0);
    const total = (counts.adults|0)*adultFare + (counts.children|0)*(adultFare*0.70) + (counts.infants|0)*(adultFare*0.10);

    const booking = {
      userId: getOrCreateUserId(),
      bookingNumber: newBookingNumber(),
      type: workingItem.type,
      legs: legs.map(f=>({
        flightId: f.flightId, origin: f.origin, destination: f.destination,
        departDate: f.departDate, arrivalDate: f.arrivalDate,
        departTime: f.departTime, arrivalTime: f.arrivalTime
      })),
      passengers: pax,
      counts,
      total
    };

    // Persist booking + let user download it
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    bookings.push(booking);
    localStorage.setItem('bookings', JSON.stringify(bookings));
    const blob = new Blob([JSON.stringify(booking, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `booking_${booking.bookingNumber}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);

    // Decrement seats for all booked legs (match by flightId + departDate)
    const db = getFlightsDb();
    const take = (counts.adults|0)+(counts.children|0)+(counts.infants|0);
    legs.forEach(f=>{
      const idx = db.findIndex(x=>x.flightId===f.flightId && x.departDate===f.departDate);
      if (idx>=0) db[idx].availableSeats = Math.max(0, db[idx].availableSeats - take);
    });
    saveFlightsDb(db);

    // Clear last cart item and refresh
    const cart = getCart(); cart.pop(); setCart(cart);

    if (bookMsg) {
      bookMsg.style.display = 'block';
      bookMsg.innerHTML = `
        <p><strong>Booking confirmed.</strong></p>
        <p><strong>User-ID:</strong> ${booking.userId}</p>
        <p><strong>Booking #:</strong> ${booking.bookingNumber}</p>
        ${booking.legs.map((f,i)=>`
          <div class="flightCard">
            <div><strong>${i===0?'Departing':'Returning'}:</strong> ${f.flightId} — ${f.origin} → ${f.destination}</div>
            <div>${f.departDate} ${f.departTime} → ${f.arrivalDate} ${f.arrivalTime}</div>
          </div>
        `).join('')}
      `;
    }
    renderCart();
  });
});
