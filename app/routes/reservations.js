const express = require('express');
const { formations } = require('../data/formations');
const { reservationsTotal } = require('../middleware/metrics');

const router = express.Router();

// "Base de donnees" en memoire
const reservations = new Map();
let nextId = 1;

// POST /api/reservations - creer une reservation
router.post('/', (req, res) => {
  const { formationId, email, nom } = req.body || {};

  // Validation basique
  if (!formationId || !email || !nom) {
    reservationsTotal.inc({ status: 'failed', formation: formationId || 'unknown' });
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Les champs formationId, email et nom sont obligatoires',
    });
  }

  const formation = formations.find((f) => f.id === formationId);
  if (!formation) {
    reservationsTotal.inc({ status: 'failed', formation: formationId });
    return res.status(404).json({ error: 'Formation non trouvee' });
  }

  if (formation.placesDisponibles <= 0) {
    reservationsTotal.inc({ status: 'failed', formation: formationId });
    return res.status(409).json({ error: 'Plus de places disponibles' });
  }

  // OK on cree la reservation
  const id = `RES-${String(nextId++).padStart(6, '0')}`;
  const reservation = {
    id,
    formationId,
    formationTitre: formation.titre,
    email,
    nom,
    creeLe: new Date().toISOString(),
    statut: 'confirmee',
  };
  reservations.set(id, reservation);
  formation.placesDisponibles -= 1;

  reservationsTotal.inc({ status: 'created', formation: formationId });

  res.status(201).json(reservation);
});

// GET /api/reservations/:id - detail d'une reservation
router.get('/:id', (req, res) => {
  const reservation = reservations.get(req.params.id);
  if (!reservation) {
    return res.status(404).json({ error: 'Reservation non trouvee' });
  }
  res.json(reservation);
});

// GET /api/reservations - liste (utile pour les apprenants)
router.get('/', (req, res) => {
  res.json({
    count: reservations.size,
    reservations: Array.from(reservations.values()),
  });
});

module.exports = router;
