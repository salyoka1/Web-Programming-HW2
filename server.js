const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Adjust this if your public files live elsewhere:
app.use(express.static(path.join(__dirname, 'public')));

const FLIGHTS_PATH = path.join(__dirname, 'flights.json');
const BACKUP_PATH  = path.join(__dirname, 'flights.db.backup.json');

// Utility: read flights array from file
async function readFlights() {
  const raw = await fs.readFile(FLIGHTS_PATH, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('flights.json must be a plain array');
  return data;
}

// Utility: write flights array back to file (with a quick backup)
async function writeFlights(flights) {
  await fs.writeFile(BACKUP_PATH, JSON.stringify(flights, null, 2)); // optional backup
  // atomic-ish write: write temp then rename
  const tmp = FLIGHTS_PATH + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(flights, null, 2));
  await fs.rename(tmp, FLIGHTS_PATH);
}

// GET flights (for the client to load)
app.get('/api/flights', async (req, res) => {
  try {
    const flights = await readFlights();
    res.json(flights);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read flights' });
  }
});

/**
 * POST /api/book
 * Body:
 * {
 *   legs: [{ flightId, departDate }, ...],
 *   take: <total passengers to remove from each leg, integer >= 1>
 * }
 * Server decrements availableSeats for each matching leg and persists to flights.json.
 */
app.post('/api/book', async (req, res) => {
  try {
    const { legs, take } = req.body || {};
    if (!Array.isArray(legs) || !Number.isInteger(take) || take <= 0) {
      return res.status(400).json({ error: 'Invalid body' });
    }

    const flights = await readFlights();
    legs.forEach(({ flightId, departDate }) => {
      const idx = flights.findIndex(
        f => f.flightId === flightId && f.departDate === departDate
      );
      if (idx >= 0) {
        const current = Number(flights[idx].availableSeats) || 0;
        flights[idx].availableSeats = Math.max(0, current - take);
      }
    });

    await writeFlights(flights);
    res.json({ ok: true, flights }); // return new state if you want
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update flights' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});