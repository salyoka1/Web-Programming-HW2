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

  const firstName = (document.getElementById("firstname")?.value || "").trim();
  const lastName  = (document.getElementById("lastname")?.value  || "").trim();
  const phone     = (document.getElementById("phone")?.value     || "").trim();
  const email     = (document.getElementById("email")?.value     || "").trim();
  const comment   = (document.getElementById("comment")?.value   || "").trim();
  const demoEl    = document.getElementById("demo") || { style:{}, textContent:"" };

  const nameRx   = /^[A-Z][a-zA-Z]*$/;
  const phoneRx  = /^\(\d{3}\)\d{3}-\d{4}$/;
  const emailRx  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  demoEl.style.color = "#b91c1c";
  demoEl.textContent = "";

  if (!firstName || !lastName || !phone || !email || !comment) {
    demoEl.textContent = "Please fill in all required fields.";
    return false;
  }
  if (!nameRx.test(firstName)) { demoEl.textContent = "First name must start with a capital letter and contain letters only."; return false; }
  if (!nameRx.test(lastName))  { demoEl.textContent = "Last name must start with a capital letter and contain letters only.";  return false; }
  if (firstName.toLowerCase() === lastName.toLowerCase()) { demoEl.textContent = "First name and last name cannot be the same."; return false; }
  if (!phoneRx.test(phone)) { demoEl.textContent = "Phone must be in the format (123)456-7890."; return false; }
  if (!emailRx.test(email)) { demoEl.textContent = "Please enter a valid email address."; return false; }

  const genderEl = document.querySelector('input[name="gender"]:checked');
  if (!genderEl) { demoEl.textContent = "Please select a gender."; return false; }
  const gender = genderEl.value;

  if (comment.length < 10) { demoEl.textContent = "Comment must be at least 10 characters."; return false; }

  const record = { firstName, lastName, phone, email, gender, comment, timestamp: new Date().toISOString() };
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
  return false;
}

/******************** APPEARANCE CONTROLS *************************/
document.getElementById("bgColorControl")?.addEventListener("input", function() {
  document.body.style.backgroundColor = this.value;
});
document.getElementById("fontSizeControl")?.addEventListener("input", function() {
  const sec = document.querySelector(".section");
  if (sec) sec.style.fontSize = this.value + "px";
});

/******************** FLIGHTS – UI BASICS *************************/
// Passenger panel toggle (RESTORED)
function initPaxToggle() {
  const paxBtn   = document.getElementById('paxBtn');
  const paxPanel = document.getElementById('paxPanel');
  if (!paxBtn || !paxPanel) return; // not on flights page or HTML doesn't include it

  // Ensure a predictable initial state: collapsed by default
  paxPanel.style.display = 'none';
  paxBtn.setAttribute('aria-expanded', 'false');

  paxBtn.addEventListener('click', () => {
    const openNow = paxPanel.style.display !== 'none';
    paxPanel.style.display = openNow ? 'none' : 'block';
    paxBtn.setAttribute('aria-expanded', openNow ? 'false' : 'true');
  });
}

// Round trip return-date toggle
function initReturnToggle() {
  const tripRadios = document.querySelectorAll('input[name="trip"]');
  const returnWrap = document.getElementById('returnWrap');
  const returnEl   = document.getElementById('returnDate');
  if (!tripRadios.length || !returnWrap) return;

  const apply = () => {
    const checked = document.querySelector('input[name="trip"]:checked');
    const val = checked ? checked.value : 'oneway';
    if (val === 'round') {
      returnWrap.style.display = '';
    } else {
      returnWrap.style.display = 'none';
      if (returnEl) returnEl.value = '';
    }
  };

  apply(); // initial
  tripRadios.forEach(r => r.addEventListener('change', apply));
}

document.addEventListener('DOMContentLoaded', () => {
  initPaxToggle();
  initReturnToggle();
});

/******************** FLIGHTS – VALIDATION (regex-first) *************************/
const txCaCityRx = new RegExp(
  '^\\s*(?:' + [
    'Austin','Dallas','Houston','San Antonio','El Paso','Fort Worth','Arlington','Plano','Irving','Denton',
    'Corpus Christi','Lubbock','Garland','McKinney','Frisco','Amarillo','Grand Prairie','Brownsville',
    'Los Angeles','San Diego','San Jose','San Francisco','Fresno','Sacramento','Long Beach','Oakland',
    'Bakersfield','Anaheim','Riverside','Stockton','Irvine','Santa Ana','Chula Vista','Fremont','San Bernardino'
  ].join('|') + ')\\s*$', 'i'
);
const dateRx  = /^\d{4}-\d{2}-\d{2}$/;
const minDate = new Date('2024-09-01');
const maxDate = new Date('2024-12-01');
const paxRx   = /^[0-4]$/;

const originEl  = document.getElementById('origin');
const destEl    = document.getElementById('destination');
const departEl  = document.getElementById('departDate');
const returnEl  = document.getElementById('returnDate');

const adultEl   = document.getElementById('adultCount');
const childEl   = document.getElementById('childCount');
const infantEl  = document.getElementById('infantCount');

const errorBox  = document.getElementById('errorBox');
const resultBox = document.getElementById('result');

function showError(msg) { if (errorBox) errorBox.textContent = msg; }

function validateFlightForm() {
  if (!originEl || !destEl || !departEl) return { ok: false };

  const trip   = document.querySelector('input[name="trip"]:checked')?.value || 'oneway';
  const origin = (originEl.value || '').trim();
  const dest   = (destEl.value   || '').trim();
  const depart = (departEl.value || '').trim();
  const ret    = (returnEl?.value || '').trim();

  const a = (adultEl?.value  || '').trim();
  const c = (childEl?.value  || '').trim();
  const i = (infantEl?.value || '').trim();

  if (errorBox) errorBox.textContent = '';
  if (resultBox) { resultBox.style.display = 'none'; resultBox.innerHTML = ''; }

  if (!txCaCityRx.test(origin)) { showError('Origin must be a city in Texas or California.'); return { ok: false }; }
  if (!txCaCityRx.test(dest))   { showError('Destination must be a city in Texas or California.'); return { ok: false }; }
  if (origin.toLowerCase() === dest.toLowerCase()) { showError('Origin and destination must be different.'); return { ok: false }; }

  if (!dateRx.test(depart)) { showError('Departure date must be in YYYY-MM-DD format.'); return { ok: false }; }
  const dDate = new Date(depart);
  if (isNaN(dDate) || dDate < minDate || dDate > maxDate) {
    showError('Departure date must be between 2024-09-01 and 2024-12-01.');
    return { ok: false };
  }

  if (trip === 'round') {
    if (!dateRx.test(ret)) { showError('Return date must be in YYYY-MM-DD format.'); return { ok: false }; }
    const rDate = new Date(ret);
    if (isNaN(rDate) || rDate < minDate || rDate > maxDate) {
      showError('Return date must be between 2024-09-01 and 2024-12-01.');
      return { ok: false };
    }
    if (rDate <= dDate) { showError('Return date must be after the departure date.'); return { ok: false }; }
  }

  if (!paxRx.test(a)) { showError('Adults must be a number from 0 to 4.'); return { ok: false }; }
  if (!paxRx.test(c)) { showError('Children must be a number from 0 to 4.'); return { ok: false }; }
  if (!paxRx.test(i)) { showError('Infants must be a number from 0 to 4.'); return { ok: false }; }
  const total = Number(a) + Number(c) + Number(i);
  if (total < 1) { showError('At least one passenger is required.'); return { ok: false }; }

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
  return { ok: true };
}

/******************** FLIGHTS DB (file-backed) *************************/
const FLIGHTS_DB_KEY = 'flights_db_manual_v1';
const FLIGHTS_DB_META_KEY = 'flights_db_manual_meta';

function getFlightsDb() {
  return JSON.parse(localStorage.getItem(FLIGHTS_DB_KEY) || '[]');
}
function saveFlightsDb(db) {
  localStorage.setItem(FLIGHTS_DB_KEY, JSON.stringify(db));
}

async function ensureFlightsDbFromFile(force = false) {
  const meta = JSON.parse(localStorage.getItem(FLIGHTS_DB_META_KEY) || 'null');

  if (
    !force &&
    Array.isArray(getFlightsDb()) &&
    getFlightsDb().length &&
    meta?.source === 'file' &&
    meta?.version === 1
  ) {
    return;
  }

  const res = await fetch('flights.json', { cache: 'no-store' });
  if (!res.ok) {
    console.error('Failed to load flights.json:', res.status, res.statusText);
    return;
  }
  const flights = await res.json();
  if (!Array.isArray(flights)) {
    console.error('flights.json is not an array');
    return;
  }

  saveFlightsDb(flights);
  localStorage.setItem(
    FLIGHTS_DB_META_KEY,
    JSON.stringify({ source: 'file', version: 1, loadedAt: new Date().toISOString() })
  );
}

/******************** SEARCH HELPERS *************************/
function dateToYMD(d){ const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }
function ymdToDate(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }

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

  const center = ymdToDate(ymd);
  if (isNaN(center)) return { exact: [], alt: [] };

  const alt = [];
  for (let offset=-3; offset<=3; offset++) {
    if (offset===0) continue;
    const dt = new Date(center); dt.setDate(center.getDate()+offset);
    const y = dateToYMD(dt);
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
    await ensureFlightsDbFromFile();

    const resultsWrap   = document.getElementById('flightResults');
    if (!resultsWrap) return;

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

    window.currentContext   = { paxTotal: 0, trip: 'oneway', origin: '', dest: '', depart: '', ret: '' };
    window.selectedOutbound = null;
    window.selectedInbound  = null;

    const searchBtn = document.getElementById('searchBtn');
    searchBtn?.addEventListener('click', () => {
      const { ok } = validateFlightForm();
      if (!ok) {
        if (outList) outList.innerHTML = '';
        if (inList)  inList.innerHTML  = '';
        if (resultsWrap) resultsWrap.style.display = 'none';
        return;
      }

      const trip = document.querySelector('input[name="trip"]:checked')?.value || 'oneway';
      const origin = (originEl?.value || '').trim();
      const dest   = (destEl?.value   || '').trim();
      const depart = (departEl?.value || '').trim();
      const ret    = (returnEl?.value || '').trim();

      const a = Number((adultEl?.value  || '0').trim());
      const c = Number((childEl?.value  || '0').trim());
      const i = Number((infantEl?.value || '0').trim());
      const paxTotal = a + c + i;

      window.currentContext = { paxTotal, trip, origin, dest, depart, ret };
      window.selectedOutbound = null;
      window.selectedInbound  = null;

      const out = searchFlights(origin, dest, depart, paxTotal, { direction: 'outbound' });
      outList.innerHTML = '';
      renderFlights(outList, out.exact);
      renderAltFlights(outList, out.alt);

      if (trip === 'round') {
        inWrap.style.display = '';
        const back = searchFlights(dest, origin, ret, paxTotal, { minYmd: depart, direction: 'inbound' });
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

    addBothBtn?.addEventListener('click', () => {
      if (!(window.selectedOutbound && window.selectedInbound)) return;
      if (typeof window.addRoundToCart === 'function') {
        window.addRoundToCart(window.selectedOutbound, window.selectedInbound, window.currentContext);
      } else {
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
    if (typeof window.addOneWayToCart === 'function') {
      window.addOneWayToCart(f, window.currentContext);
    } else {
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

/******************** CART PAGE BOOTSTRAP *************************/
document.addEventListener('DOMContentLoaded', () => {
  (async () => {
    await ensureFlightsDbFromFile();

    const cartFlights = document.getElementById('cartFlights');
    const cartTotalEl = document.getElementById('cartTotal');
    const formWrap    = document.getElementById('passengerFormWrap');
    const formEl      = document.getElementById('passengerForm');
    const bookBtn     = document.getElementById('bookBtn');
    const bookMsg     = document.getElementById('bookMsg');

    if (!cartFlights || !cartTotalEl) return;

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

      const adultPrice  = legs.reduce((s,f)=>s+f.price, 0);
      const childPrice  = adultPrice * 0.70;
      const infantPrice = adultPrice * 0.10;
      const total = (counts.adults|0)*adultPrice + (counts.children|0)*childPrice + (counts.infants|0)*infantPrice;

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
        const fn = (data.get('fn'+k)  || '').toString().trim();
        const ln = (data.get('ln'+k)  || '').toString().trim();
        const dob= (data.get('dob'+k) || '').toString().trim();
        const ssn= (data.get('ssn'+k) || '').toString().trim();
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

      const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
      bookings.push(booking);
      localStorage.setItem('bookings', JSON.stringify(bookings));
      const blob = new Blob([JSON.stringify(booking, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `booking_${booking.bookingNumber}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);

      const db = getFlightsDb();
      const take = (counts.adults|0)+(counts.children|0)+(counts.infants|0);
      legs.forEach(f=>{
        const idx = db.findIndex(x=>x.flightId===f.flightId && x.departDate===f.departDate);
        if (idx>=0) db[idx].availableSeats = Math.max(0, db[idx].availableSeats - take);
      });
      saveFlightsDb(db);

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
  return d instanceof Date && !isNaN(d) && d >= STAY_MIN && d <= STAY_MAX;
}
function computeRooms(adults, children){
  const paying = Math.max(0, adults) + Math.max(0, children);
  return Math.max(1, Math.ceil(paying / 2));
}

function initStaysPage(){
  const btn = document.getElementById("staySearchBtn");
  if(!btn) return; // not on stays.html

  const cityEl     = document.getElementById("stayCity");
  const inEl       = document.getElementById("checkIn");
  const outEl      = document.getElementById("checkOut");
  const adEl       = document.getElementById("stayAdults");
  const chEl       = document.getElementById("stayChildren");
  const infEl      = document.getElementById("stayInfants");
  const errBox     = document.getElementById("stayError");
  const resultBox  = document.getElementById("stayResult");

  btn.addEventListener("click", function(e){
    e.preventDefault(); // keep on page
    errBox.textContent = "";
    resultBox.style.display = "none";
    resultBox.innerHTML = "";

    if (isEmpty(cityEl.value) || isEmpty(inEl.value) || isEmpty(outEl.value)) {
      errBox.textContent = "Please enter city, check-in, and check-out dates.";
      return;
    }

    if (!isCityTXorCA(cityEl.value)) {
      errBox.textContent = "City must be in Texas or California.";
      return;
    }

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

    const ad  = parseIntSafe(adEl.value);
    const ch  = parseIntSafe(chEl.value);
    const inf = parseIntSafe(infEl.value);

    if (!Number.isInteger(ad) || ad < 0 ||
        !Number.isInteger(ch) || ch < 0 ||
        !Number.isInteger(inf) || inf < 0) {
      errBox.textContent = "Guest counts must be whole numbers ≥ 0.";
      return;
    }

    if ((ad + ch + inf) < 1) {
      errBox.textContent = "Please specify at least one guest.";
      return;
    }

    const rooms = computeRooms(ad, ch);
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
}
/* ==================== CARS PAGE LOGIC (DOM methods) ==================== */

// Allowed cities (lowercase)
const TX_CITIES_CAR = [
  "austin","dallas","houston","san antonio","el paso","fort worth","arlington","plano","irving",
  "corpus christi","lubbock","garland","mckinney","frisco","amarillo","grand prairie","brownsville"
];
const CA_CITIES_CAR = [
  "los angeles","san diego","san jose","san francisco","fresno","sacramento","long beach","oakland",
  "bakersfield","anaheim","riverside","stockton","irvine","santa ana","chula vista","fremont","san bernardino"
];

// Valid car types
const VALID_CAR_TYPES = ["economy","suv","compact","midsize"];

// Date window
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

function initCarsPage(){
  const btn = document.getElementById("carSubmit");
  if (!btn) return; // not on cars.html

  const cityEl   = document.getElementById("carCity");
  const typeEl   = document.getElementById("carType");
  const inEl     = document.getElementById("carCheckIn");
  const outEl    = document.getElementById("carCheckOut");
  const errBox   = document.getElementById("carError");
  const result   = document.getElementById("carResult");

  btn.addEventListener("click", function (e) {
    e.preventDefault(); // keep on page
    errBox.textContent = "";
    result.style.display = "none";
    result.innerHTML = "";

    const city  = cityEl.value.trim();
    const type  = typeEl.value;
    const inVal = inEl.value;
    const outVal= outEl.value;

    if (!city)  { errBox.textContent = "Please enter a city."; return; }
    if (!type)  { errBox.textContent = "Please select a car type."; return; }
    if (!inVal) { errBox.textContent = "Please choose a pick-up date."; return; }
    if (!outVal){ errBox.textContent = "Please choose a drop-off date."; return; }

    if (!isCityTXorCA_CAR(city)) {
      errBox.textContent = "City must be a city in Texas or California.";
      return;
    }

    const chosenType = lc(type);
    if (!VALID_CAR_TYPES.includes(chosenType)) {
      errBox.textContent = "Car type must be Economy, SUV, Compact, or Midsize.";
      return;
    }

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

    result.innerHTML = [
      `<strong>City:</strong> ${city}`,
      `<strong>Car Type:</strong> ${typeEl.options[typeEl.selectedIndex].text}`,
      `<strong>Pick-up:</strong> ${inVal}`,
      `<strong>Drop-off:</strong> ${outVal}`
    ].join("<br>");
    result.style.display = "block";
  });
}

/* === Ensure Stays & Cars initializers run (in addition to your other DOMContentLoaded hooks) === */
document.addEventListener("DOMContentLoaded", function(){
  initStaysPage();
  initCarsPage();
});
