// metroMapController.js - Logic for metro map operations
const { v4: uuidv4 } = require('uuid');

/**
 * Get all stations
 * GET /api/metro-map/stations
 */
exports.getAllStations = async (req, res) => {
  try {
    const db = req.db;
    
    const stations = await db.all(
      'SELECT * FROM metro_stations ORDER BY sequence_id'
    );
    
    res.json(stations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create a new station
 * POST /api/metro-map/stations
 */
exports.createStation = async (req, res) => {
  try {
    const { node_id, name, x, y, interchange, terminal, description, transit_type, city } = req.body;
    const db = req.db;
    
    if (!node_id || !name) {
      return res.status(400).json({ error: 'Node ID and station name are required' });
    }
    
    const id = req.body.id || uuidv4();
    const now = Date.now();
    
    await db.run(
      `INSERT INTO metro_stations 
       (id, node_id, name, x, y, interchange, terminal, description, transit_type, city, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, node_id, name, x, y, interchange || 0, terminal || 0, description || '', 
       transit_type || 'metro', city || 'default', now, now]
    );
    
    const station = await db.get('SELECT * FROM metro_stations WHERE id = ?', id);
    
    res.status(201).json(station);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update a station
 * PUT /api/metro-map/stations/:id
 */
exports.updateStation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, x, y, interchange, terminal, description, transit_type, city } = req.body;
    const db = req.db;
    const now = Date.now();
    
    console.log('Updating station with transit_type:', transit_type);
    
    await db.run(
      `UPDATE metro_stations 
       SET name = ?, x = ?, y = ?, interchange = ?, terminal = ?, description = ?, 
       transit_type = ?, city = ?, updated_at = ? 
       WHERE id = ?`,
      [name, x, y, interchange || 0, terminal || 0, description || '', 
       transit_type || 'metro', city || 'default', now, id]
    );
    
    const station = await db.get('SELECT * FROM metro_stations WHERE id = ?', id);
    
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }
    
    res.json(station);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a station
 * DELETE /api/metro-map/stations/:id
 */
exports.deleteStation = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    await db.run('DELETE FROM metro_stations WHERE id = ?', id);
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all lines
 * GET /api/metro-map/lines
 */
exports.getAllLines = async (req, res) => {
  try {
    const db = req.db;
    
    const lines = await db.all(
      'SELECT * FROM metro_lines ORDER BY sequence_id'
    );
    
    res.json(lines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create a new line
 * POST /api/metro-map/lines
 */
exports.createLine = async (req, res) => {
  try {
    const { name, color, stations, curved, description, city } = req.body;
    const db = req.db;
    
    if (!name) {
      return res.status(400).json({ error: 'Line name is required' });
    }
    
    const id = req.body.id || uuidv4();
    const now = Date.now();
    
    const stationsJson = JSON.stringify(stations || []);
    
    await db.run(
      `INSERT INTO metro_lines 
       (id, name, color, stations, curved, description, city, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, color, stationsJson, curved || 0, description || '', city || 'default', now, now]
    );
    
    const line = await db.get('SELECT * FROM metro_lines WHERE id = ?', id);
    line.stations = JSON.parse(line.stations || '[]');
    
    res.status(201).json(line);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update a line
 * PUT /api/metro-map/lines/:id
 */
exports.updateLine = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, stations, curved, description, transit_type, city } = req.body;
    const db = req.db;
    const now = Date.now();
    
    console.log('Updating line with transit_type:', transit_type);
    
    const stationsJson = JSON.stringify(stations || []);
    
    await db.run(
      `UPDATE metro_lines 
       SET name = ?, color = ?, stations = ?, curved = ?, description = ?, 
       transit_type = ?, city = ?, updated_at = ? 
       WHERE id = ?`,
      [name, color, stationsJson, curved || 0, description || '', 
       transit_type || 'metro', city || 'default', now, id]
    );
    
    const line = await db.get('SELECT * FROM metro_lines WHERE id = ?', id);
    
    if (!line) {
      return res.status(404).json({ error: 'Line not found' });
    }
    
    line.stations = JSON.parse(line.stations || '[]');
    
    res.json(line);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a line
 * DELETE /api/metro-map/lines/:id
 */
exports.deleteLine = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    await db.run('DELETE FROM metro_lines WHERE id = ?', id);
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add new endpoints for city-specific queries
exports.getStationsByCity = async (req, res) => {
  try {
    const { city } = req.params;
    const db = req.db;
    
    let stations;
    if (city === 'all') {
      // Return all stations
      stations = await db.all(
        'SELECT * FROM metro_stations ORDER BY sequence_id'
      );
    } else {
      // Return stations for specific city
      stations = await db.all(
        'SELECT * FROM metro_stations WHERE city = ? ORDER BY sequence_id',
        city
      );
    }
    
    res.json(stations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLinesByCity = async (req, res) => {
  try {
    const { city } = req.params;
    const db = req.db;
    
    let lines;
    if (city === 'all') {
      // Return all lines
      lines = await db.all(
        'SELECT * FROM metro_lines ORDER BY sequence_id'
      );
    } else {
      // Return lines for specific city
      lines = await db.all(
        'SELECT * FROM metro_lines WHERE city = ? ORDER BY sequence_id',
        city
      );
    }
    
    // Parse stations for each line
    lines.forEach(line => {
      line.stations = JSON.parse(line.stations || '[]');
    });
    
    res.json(lines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};