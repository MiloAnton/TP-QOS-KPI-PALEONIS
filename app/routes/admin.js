// Routes /admin/* - permettent de piloter le chaos pendant le TP.
// IMPORTANT : ces routes sont AVANT chaosMiddleware dans server.js,
// donc elles continuent a repondre meme quand l'app est "down".

const express = require('express');
const { chaosState } = require('../middleware/chaos');

const router = express.Router();

// GET /admin/status - voir l'etat actuel du chaos
router.get('/status', (req, res) => {
  res.json({
    errorRate: chaosState.errorRate,
    extraLatencyMs: chaosState.extraLatencyMs,
    isDown: chaosState.isDown,
  });
});

// POST /admin/error-rate?rate=0.5 - definir un taux d'erreur (0 a 1)
router.post('/error-rate', (req, res) => {
  const rate = parseFloat(req.query.rate || req.body?.rate);
  if (isNaN(rate) || rate < 0 || rate > 1) {
    return res.status(400).json({ error: 'rate doit etre un nombre entre 0 et 1' });
  }
  chaosState.errorRate = rate;
  res.json({ message: `Taux d erreur fixe a ${rate * 100}%`, errorRate: rate });
});

// POST /admin/latency?ms=500 - injecter de la latence (en ms)
router.post('/latency', (req, res) => {
  const ms = parseInt(req.query.ms || req.body?.ms, 10);
  if (isNaN(ms) || ms < 0 || ms > 10000) {
    return res.status(400).json({ error: 'ms doit etre un entier entre 0 et 10000' });
  }
  chaosState.extraLatencyMs = ms;
  res.json({ message: `Latence supplementaire fixee a ${ms}ms`, extraLatencyMs: ms });
});

// POST /admin/down - mode panne totale (toutes les routes metier renvoient 503)
router.post('/down', (req, res) => {
  chaosState.isDown = true;
  res.json({ message: 'Service mis en panne (mode down active)' });
});

// POST /admin/up - retour a la normale
router.post('/up', (req, res) => {
  chaosState.isDown = false;
  res.json({ message: 'Service remis en route' });
});

// POST /admin/reset - tout remettre a zero
router.post('/reset', (req, res) => {
  chaosState.errorRate = 0;
  chaosState.extraLatencyMs = 0;
  chaosState.isDown = false;
  res.json({ message: 'Chaos remis a zero', state: chaosState });
});

// ----- Scenarios pre-configures pour gagner du temps -----

// POST /admin/scenario/incident-perf - simule un incident de performance
//   latence 1500ms + 2% d erreurs (cas du Mardi/Mercredi de ShopFast)
router.post('/scenario/incident-perf', (req, res) => {
  chaosState.errorRate = 0.02;
  chaosState.extraLatencyMs = 1500;
  chaosState.isDown = false;
  res.json({
    message: 'Scenario incident-perf active : +1500ms latence, 2% erreurs 5xx',
    state: chaosState,
  });
});

// POST /admin/scenario/incident-fiab - simule un incident de fiabilite
//   20% d erreurs sans latence (1 commande sur 5 echoue)
router.post('/scenario/incident-fiab', (req, res) => {
  chaosState.errorRate = 0.2;
  chaosState.extraLatencyMs = 0;
  chaosState.isDown = false;
  res.json({
    message: 'Scenario incident-fiab active : 20% erreurs 5xx',
    state: chaosState,
  });
});

// POST /admin/scenario/panne - simule une panne totale (Lundi de ShopFast)
router.post('/scenario/panne', (req, res) => {
  chaosState.errorRate = 0;
  chaosState.extraLatencyMs = 0;
  chaosState.isDown = true;
  res.json({
    message: 'Scenario panne active : 503 sur tous les endpoints metier',
    state: chaosState,
  });
});

// POST /admin/scenario/degradation-progressive
//   La latence monte progressivement sur 60 secondes
router.post('/scenario/degradation-progressive', (req, res) => {
  let step = 0;
  const stepCount = 12;
  const stepDurationMs = 5000;

  if (chaosState.latencyTimer) clearInterval(chaosState.latencyTimer);

  chaosState.latencyTimer = setInterval(() => {
    step++;
    chaosState.extraLatencyMs = step * 200; // 200, 400, 600... jusqu a 2400ms
    if (step >= stepCount) {
      clearInterval(chaosState.latencyTimer);
      chaosState.latencyTimer = null;
    }
  }, stepDurationMs);

  res.json({
    message: 'Degradation progressive lancee : +200ms toutes les 5s pendant 60s',
  });
});

module.exports = router;
