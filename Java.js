function updateDateTime() {
    document.getElementById('date-time').textContent =
      new Date().toLocaleString();
  }

  // Update once right away
  updateDateTime();

  // Update every 1 second (1000 ms)
  setInterval(updateDateTime, 1000);

function validateContact(e) {
  if (e && e.preventDefault) e.preventDefault();

  const firstName = document.getElementById("firstname").value.trim();
  const lastName  = document.getElementById("lastname").value.trim();
  const phone     = document.getElementById("phone").value.trim();
  const email     = document.getElementById("email").value.trim();
  const comment   = document.getElementById("comment").value.trim();
  const demoEl    = document.getElementById("demo");

  // Regex rules
  const nameRx   = /^[A-Z][a-zA-Z]*$/;            // alphabetic only, first letter capital
  const phoneRx  = /^\(\d{3}\)\s\d{3}-\d{4}$/;     // (ddd) ddd-dddd  (note the space)
  const emailRx  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;   // must contain @ and .

  // Clear previous message
  demoEl.innerHTML = "";

  // 1) Required fields
  if (!firstName || !lastName || !phone || !email || !comment) {
    demoEl.innerHTML = "Please fill in all required fields.";
    return false;
  }

  // 2) Names: alphabetic only + capital first letter
  if (!nameRx.test(firstName)) {
    demoEl.innerHTML = "First name must start with a capital letter and contain letters only.";
    return false;
  }
  if (!nameRx.test(lastName)) {
    demoEl.innerHTML = "Last name must start with a capital letter and contain letters only.";
    return false;
  }

  // 3) First and last cannot be the same (case-insensitive)
  if (firstName.toLowerCase() === lastName.toLowerCase()) {
    demoEl.innerHTML = "First name and last name cannot be the same.";
    return false;
  }

  // 4) Phone format
  if (!phoneRx.test(phone)) {
    demoEl.innerHTML = "Phone must be in the format (123) 456-7890.";
    return false;
  }

  // 5) Email must contain @ and .
  if (!emailRx.test(email)) {
    demoEl.innerHTML = "Please enter a valid email address.";
    return false;
  }

  // 6) Gender must be selected (radio)
  const genderChecked = !!document.querySelector('input[name="gender"]:checked');
  if (!genderChecked) {
    demoEl.innerHTML = "Please select a gender.";
    return false;
  }

  // 7) Comment length
  if (comment.length < 10) {
    demoEl.innerHTML = "Comment must be at least 10 characters.";
    return false;
  }

  // If all valid → show 
 demoEl.style.color = "#0b6cff";
demoEl.innerHTML = "Form submitted successfully!";

  return false; // keep the page (no navigation)
}

document.getElementById("bgColorControl").addEventListener("input", function() {
    document.body.style.backgroundColor = this.value;
  });

  // Font size
  document.getElementById("fontSizeControl").addEventListener("input", function() {
    document.querySelector(".section").style.fontSize = this.value + "px";
  });


/* -------------------- Flights UI logic -------------------- */
// Toggle return date based on trip type
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

/* -------------------- Validation (RegEx-first as required) -------------------- */
// REGEX: Origin/Destination must be TX or CA city (case-insensitive)
const txCaCityRx = new RegExp(
  '^\\s*(?:' + [
    // Texas
    'Austin','Dallas','Houston','San Antonio','El Paso','Fort Worth','Arlington','Plano','Irving',
    'Corpus Christi','Lubbock','Garland','McKinney','Frisco','Amarillo','Grand Prairie','Brownsville',
    // California
    'Los Angeles','San Diego','San Jose','San Francisco','Fresno','Sacramento','Long Beach','Oakland',
    'Bakersfield','Anaheim','Riverside','Stockton','Irvine','Santa Ana','Chula Vista','Fremont','San Bernardino'
  ].join('|') + ')\\s*$', 'i'
);

// REGEX: Date must be YYYY-MM-DD (we also range-check with Date objects)
const dateRx  = /^\d{4}-\d{2}-\d{2}$/;
// Date window (inclusive): 2024-09-01 .. 2024-12-01
const minDate = new Date('2024-09-01');
const maxDate = new Date('2024-12-01');

// REGEX: Passenger per category 0..4
const paxRx = /^[0-4]$/;

// Elements
const originEl   = document.getElementById('origin');
const destEl     = document.getElementById('destination');
const departEl   = document.getElementById('departDate');
const returnEl   = document.getElementById('returnDate');

const adultEl    = document.getElementById('adultCount');
const childEl    = document.getElementById('childCount');
const infantEl   = document.getElementById('infantCount');

const errorBox   = document.getElementById('errorBox');
const resultBox  = document.getElementById('result');

// Validate on Search
const searchBtn = document.getElementById('searchBtn');
if (searchBtn) {
  searchBtn.addEventListener('click', () => {
    // Clear previous messages
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

    // --- City checks (RegEx) ---
    if (!txCaCityRx.test(origin)) return showError('Origin must be a city in Texas or California.');
    if (!txCaCityRx.test(dest))   return showError('Destination must be a city in Texas or California.');

    // --- Departure date (RegEx + range) ---
    if (!dateRx.test(depart)) return showError('Departure date must be in YYYY-MM-DD format.');
    const dDate = new Date(depart);
    if (isNaN(dDate) || dDate < minDate || dDate > maxDate) {
      return showError('Departure date must be between 2024-09-01 and 2024-12-01.');
    }

    // --- Return date if round trip ---
    if (trip === 'round') {
      if (!dateRx.test(ret)) return showError('Return date must be in YYYY-MM-DD format.');
      const rDate = new Date(ret);
      if (isNaN(rDate) || rDate < minDate || rDate > maxDate) {
        return showError('Return date must be between 2024-09-01 and 2024-12-01.');
      }
      if (rDate < dDate) return showError('Return date cannot be before the departure date.');
    }

    // --- Passengers per category 0..4 (RegEx) and total > 0 ---
    if (!paxRx.test(a)) return showError('Adults must be a number from 0 to 4.');
    if (!paxRx.test(c)) return showError('Children must be a number from 0 to 4.');
    if (!paxRx.test(i)) return showError('Infants must be a number from 0 to 4.');
    const total = Number(a) + Number(c) + Number(i);
    if (total < 1) return showError('At least one passenger is required.');

    // --- If valid, show summary ---
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

function showError(msg) {
  errorBox.textContent = msg;
}

/* ==================== STAYS PAGE LOGIC (no RegExp) ==================== */

// Allowed cities (Texas & California) – case-insensitive match without regex
const TX_CITIES = [
  "austin","dallas","houston","san antonio","el paso","fort worth","arlington","plano","irving",
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

    // 4) Guests: integers >= 0
    const ad = parseIntSafe(adEl.value);
    const ch = parseIntSafe(chEl.value);
    const inf = parseIntSafe(infEl.value);

    if (!Number.isInteger(ad) || ad < 0 ||
        !Number.isInteger(ch) || ch < 0 ||
        !Number.isInteger(inf) || inf < 0) {
      errBox.textContent = "Guest counts must be whole numbers ≥ 0.";
      return;
    }

    // 5) Capacity rule: “not more than 2 per room” applies to Adults + Children only.
    // We also ensure there is at least 1 total guest.
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

  // 3) Car type must be in allowed list (protects against tampering)
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
