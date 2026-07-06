const express = require('express');
const { formations } = require('../data/formations');

const router = express.Router();

// GET /api/formations - liste des formations disponibles
router.get('/', (req, res) => {
  res.json({
    count: formations.length,
    formations: formations,
  });
});

// GET /api/formations/:id - detail d'une formation
router.get('/:id', (req, res) => {
  const formation = formations.find((f) => f.id === req.params.id);
  if (!formation) {
    return res.status(404).json({ error: 'Formation non trouvee' });
  }
  res.json(formation);
});

module.exports = router;
