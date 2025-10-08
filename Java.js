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

