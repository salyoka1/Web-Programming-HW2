/******************** CLOCK *************************/
function updateDateTime() {
  const el = document.getElementById('date-time');
  if (el) el.textContent = new Date().toLocaleString();
}
updateDateTime();
setInterval(updateDateTime, 1000);

/******************** CONTACT PAGE (regex-first) *************************/
function validateContact(e) {
  if (e && e.preventDefault) e.preventDefault();

  const firstName = (document.getElementById("firstname") || {}).value?.trim() || "";
  const lastName  = (document.getElementById("lastname")  || {}).value?.trim() || "";
  const phone     = (document.getElementById("phone")      || {}).value?.trim() || "";
  const email     = (document.getElementById("email")      || {}).value?.trim() || "";
  const comment   = (document.getElementById("comment")    || {}).value?.trim() || "";
  const demoEl    = document.getElementById("demo");

  // Regex rules (per assignment)
  const nameRx   = /^[A-Z][a-zA-Z]*$/;           // alphabetic only, first letter capital
  const phoneRx  = /^\(\d{3}\)\d{3}-\d{4}$/;     // (ddd)ddd-dddd (no space)
  const emailRx  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // contains @ and .

  // Reset message
  if (demoEl) {
    demoEl.style.color = "#b91c1c";
    demoEl.textContent = "";
  }

  // 1) Required
  if (!firstName || !lastName || !phone || !email || !comment) {
    if (demoEl) demoEl.textContent = "Please fill in all required fields.";
    return false;
  }
  // 2) Names format
  if (!nameRx.test(firstName)) {
    if (demoEl) demoEl.textContent = "First name must start with a capital letter and contain letters only.";
    return false;
  }
  if (!nameRx.test(lastName)) {
    if (demoEl) demoEl.textContent = "Last name must start with a capital letter and contain letters only.";
    return false;
  }
  // 3) Not the same
  if (firstName.toLowerCase() === lastName.toLowerCase()) {
    if (demoEl) demoEl.textContent = "First name and last name cannot be the same.";
    return false;
  }
  // 4) Phone format
  if (!phoneRx.test(phone)) {
    if (demoEl) demoEl.textContent = "Phone must be in the format (123)456-7890.";
    return false;
  }
  // 5) Email format
  if (!emailRx.test(email)) {
    if (demoEl) demoEl.textContent = "Please enter a valid email address.";
    return false;
  }
  // 6) Gender radio
  const genderEl = document.querySelector('input[name="gender"]:checked');
  if (!genderEl) {
    if (demoEl) demoEl.textContent = "Please select a gender.";
    return false;
  }
  const gender = genderEl.value;

  // 7) Comment length
  if (comment.length < 10) {
    if (demoEl) demoEl.textContent = "Comment must be at least 10 characters.";
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

  if (demoEl) {
    demoEl.style.color = "#0b6cff";
    demoEl.textContent = "Form submitted successfully!";
  }
  return false; // keep the page
}

/******************** APPEARANCE CONTROLS *************************/
document.getElementById("bgColorControl")?.addEventListener("input", function() {
  document.body.style.backgroundColor = this.value;
});
document.getElementById("fontSizeControl")?.addEventListener("input", function() {
  const s = document.querySelector(".section");
  if (s) s.style.fontSize = this.value + "px";
});

/******************** FLIGHTS – UI BASICS *************************/
// Trip type toggles the return date field
(() => {
  const tripRadios = document.querySelectorAll('input[name="trip"]');
  const returnWrap = document.getElementById('returnWrap');
  tripRadios.forEach(r => {
    r.addEventListener('change', () => {
      if (!returnWrap) return;
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
})();

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

/******************** FLIGHTS DB (file-backed) *************************/
const FLIGHTS_DB_KEY = 'flights_db_manual_v1';
const FLIGHTS_DB_META_KEY = 'flights_db_manual_meta';

function getFlightsDb() {
  return JSON.parse(localStorage.getItem(FLIGHTS_DB_KEY) || '[]');
}
function saveFlightsDb(db) {
  localStorage.setItem(FLIGHTS_DB_KEY, JSON.stringify(db));
}

/**
 * Load flights from flights.json once (expects a plain array).
 * If it finds { flights: [...] }, it will use that array instead.
 * Call ensureFlightsDbFromFile(true) to force-reload during development.
 */
async function ensureFlightsDbFromFile(force = false) {
  const meta = JSON.parse(localStorage.getItem(FLIGHTS_DB_META_KEY) || 'null');

  if (
    !force &&
    Array.isArray(getFlightsDb()) &&
    getFlightsDb().length &&
    meta?.source === 'file' &&
    meta?.version === 1
  ) {
    return; // already loaded from file
  }

  // fetch() requires serving over HTTP. Live Server or GitHub Pages are fine.
  const res = await fetch('flights.json', { cache: 'no-store' });
  if (!res.ok) {
    console.error('Failed to load flights.json:', res.status, res.statusText);
    return;
  }

  const raw = await res.json();
  const flights = Array.isArray(raw) ? raw : (Array.isArray(raw?.flights) ? raw.flights : null);

  if (!Array.isArray(flights)) {
    console.error('flights.json is not a plain array or {flights:[...]}.');
    return;
  }

  // Normalize field names to our app’s schema if needed
  const normalized = flights.map(f => ({
    flightId: f.flightId,
    origin: f.origin,
    destination: f.destination,
    departDate: f.departDate || f.departureDate,    // support both
    arrivalDate: f.arrivalDate,
    departTime: f.departTime || f.departureTime,    // support both
    arrivalTime: f.arrivalTime,
    availableSeats: Number(f.availableSeats ?? 0),
    price: Number(f.price ?? 0)
  }));

  saveFlightsDb(normalized);
  localStorage.setItem(
    FLIGHTS_DB_META_KEY,
    JSON.stringify({ source: 'file', version: 1, loadedAt: new Date().toISOString() })
  );
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
    String(f.origin).toLowerCase() === String(origin).toLowerCase() &&
    String(f.destination).toLowerCase() === String(destination).toLowerCase() &&
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
      String(f.origin).toLowerCase() === String(origin).toLowerCase() &&
      String(f.destination).toLowerCase() === String(destination).toLowerCase() &&
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
  (async () => {
    // Load external JSON into localStorage
    await ensureFlightsDbFromFile();

    const resultsWrap   = document.getElementById('flightResults');
    if (!resultsWrap) return; // not on flights page

    const originEl = document.getElementById('origin');
    const destEl   = document.getElementById('destination');
    const departEl = document.getElementById('departDate');
    const returnEl = document.getElementById('returnDate');
    const adultEl  = document.getElementById('adultCount');
    const childEl  = document.getElementById('childCount');
    const infantEl = document.getElementById('infantCount');
    const errorBox = document.getElementById('errorBox');
    const resultBox= document.getElementById('result');

    const outList       = document.getElementById('outboundList');
    const inWrap        = document.getElementById('inboundWrap');
    const inList        = document.getElementById('inboundList');
    const addBothWrap   = document.getElementById('addBothContainer');
    const addBothBtn    = document.getElementById('addRoundToCart');
    const searchBtn     = document.getElementById('searchBtn');

    // Expose context + selections globally so the click handler can see them
    window.currentContext   = { paxTotal: 0, trip: 'oneway', origin: '', dest: '', depart: '', ret: '' };
    window.selectedOutbound = null;
    window.selectedInbound  = null;

    // ---- VALIDATE-FIRST search handler ----
    searchBtn?.addEventListener('click', () => {
      // reset UI
      if (errorBox) errorBox.textContent = '';
      if (resultBox) { resultBox.style.display = 'none'; resultBox.innerHTML = ''; }
      if (resultsWrap) resultsWrap.style.display = 'none'; // hide until valid
      if (outList) outList.innerHTML = '';
      if (inList) inList.innerHTML = '';
      if (addBothWrap) addBothWrap.style.display = 'none';

      // read form
      const trip   = document.querySelector('input[name="trip"]:checked')?.value || 'oneway';
      const origin = (originEl?.value || '').trim();
      const dest   = (destEl?.value || '').trim();
      const depart = (departEl?.value || '').trim();
      const ret    = (returnEl?.value || '').trim();

      const a = (adultEl?.value || '').trim();
      const c = (childEl?.value || '').trim();
      const i = (infantEl?.value || '').trim();

      // ---- VALIDATION (block results if any fail) ----
      // cities
      if (!txCaCityRx.test(origin)) { if (errorBox) errorBox.textContent = 'Origin must be a city in Texas or California.'; return; }
      if (!txCaCityRx.test(dest))   { if (errorBox) errorBox.textContent = 'Destination must be a city in Texas or California.'; return; }
      if (origin.toLowerCase() === dest.toLowerCase()) { if (errorBox) errorBox.textContent = 'Origin and destination must be different.'; return; }

      // dates
      if (!dateRx.test(depart)) { if (errorBox) errorBox.textContent = 'Departure date must be in YYYY-MM-DD format.'; return; }
      const dDate = new Date(depart);
      if (isNaN(dDate) || dDate < minDate || dDate > maxDate) {
        if (errorBox) errorBox.textContent = 'Departure date must be between 2024-09-01 and 2024-12-01.'; return;
      }

      let rDate = null;
      if (trip === 'round') {
        if (!dateRx.test(ret)) { if (errorBox) errorBox.textContent = 'Return date must be in YYYY-MM-DD format.'; return; }
        rDate = new Date(ret);
        if (isNaN(rDate) || rDate < minDate || rDate > maxDate) {
          if (errorBox) errorBox.textContent = 'Return date must be between 2024-09-01 and 2024-12-01.'; return;
        }
        if (!(rDate > dDate)) { // strictly after
          if (errorBox) errorBox.textContent = 'Return date must be after the departure date.'; return;
        }
      }

      // pax
      if (!paxRx.test(a)) { if (errorBox) errorBox.textContent = 'Adults must be a number from 0 to 4.'; return; }
      if (!paxRx.test(c)) { if (errorBox) errorBox.textContent = 'Children must be a number from 0 to 4.'; return; }
      if (!paxRx.test(i)) { if (errorBox) errorBox.textContent = 'Infants must be a number from 0 to 4.'; return; }
      const paxTotal = Number(a) + Number(c) + Number(i);
      if (paxTotal < 1) { if (errorBox) errorBox.textContent = 'At least one passenger is required.'; return; }

      // If we reached here, inputs are valid → show a small summary (optional)
      if (resultBox) {
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
      }

      // ---- SEARCH (now that validation passed) ----
      window.currentContext = { paxTotal, trip, origin, dest, depart, ret };
      window.selectedOutbound = null;
      window.selectedInbound  = null;

      // OUTBOUND must be origin → destination on the depart date
      const out = searchFlights(origin, dest, depart, paxTotal);
      if (outList) {
        outList.innerHTML = '';
        renderFlights(outList, out.exact);
        renderAltFlights(outList, out.alt);
      }

      // INBOUND shown only for round trip; must be destination → origin on the return date
      if (trip === 'round') {
        if (inWrap) inWrap.style.display = '';
        const back = searchFlights(dest, origin, ret, paxTotal, { minYmd: depart }); // min bound prevents showing dates before depart
        if (inList) {
          inList.innerHTML = '';
          renderFlights(inList, back.exact);
          renderAltFlights(inList, back.alt);
        }
        if (addBothWrap) addBothWrap.style.display = 'none';
      } else {
        if (inWrap) inWrap.style.display = 'none';
        if (addBothWrap) addBothWrap.style.display = 'none';
      }

      if (resultsWrap) resultsWrap.style.display = 'block';
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
      if (addBothWrap) addBothWrap.style.display = 'none';
    });
  })();
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
  "austin","dallas","houston","san antonio","el paso","fort worth","arlington","plano","irving","denton",
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
  (async () => {
    // Ensure DB is ready (safe no-op if already loaded)
    await ensureFlightsDbFromFile();

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
  })();
});
