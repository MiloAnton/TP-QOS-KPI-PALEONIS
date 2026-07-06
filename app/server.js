// PaLeonis API - serveur principal
// Plateforme de reservation simulee, instrumentee Prometheus,
// avec endpoints /admin/* pour injecter des incidents pendant le TP.

const express = require('express');

const { register, metricsMiddleware, activeUsers } = require('./middleware/metrics');
const { chaosMiddleware } = require('./middleware/chaos');

const formationsRouter = require('./routes/formations');
const reservationsRouter = require('./routes/reservations');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(metricsMiddleware); // capture toutes les requetes pour Prometheus

// ----- Routes systeme (jamais affectees par le chaos) -----

// Endpoint Prometheus
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// Health check (liveness probe)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Page d'accueil simple
app.get('/', (req, res) => {
  res.json({
    name: 'PaLeonis API',
    version: '1.0.0',
    description: 'Plateforme de reservation - app instrumentee pour TP QoS/KPI',
    endpoints: {
      formations: '/api/formations',
      reservations: '/api/reservations',
      health: '/health',
      metrics: '/metrics',
      admin: '/admin/status',
    },
  });
});

// Routes /admin AVANT le middleware chaos (pour pouvoir piloter meme en panne)
app.use('/admin', adminRouter);

// ----- Routes metier (soumises au chaos) -----
app.use('/api/formations', chaosMiddleware, formationsRouter);
app.use('/api/reservations', chaosMiddleware, reservationsRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// ----- Simulation d utilisateurs actifs -----
// On fait varier la jauge "active users" pour avoir un signal visuel sympa
setInterval(() => {
  // Entre 20 et 100, avec une oscillation lente
  const t = Date.now() / 60000; // minutes
  const base = 60 + Math.sin(t) * 30;
  const jitter = (Math.random() - 0.5) * 10;
  activeUsers.set(Math.max(0, Math.round(base + jitter)));
}, 2000);

// ----- Demarrage -----
app.listen(PORT, () => {
  console.log(`PaLeonis API demarree sur le port ${PORT}`);
  console.log(`  - Endpoint metrics : http://localhost:${PORT}/metrics`);
  console.log(`  - Endpoint health  : http://localhost:${PORT}/health`);
  console.log(`  - Admin status     : http://localhost:${PORT}/admin/status`);
});

// Gestion propre du SIGTERM (Docker stop)
process.on('SIGTERM', () => {
  console.log('SIGTERM recu, arret du serveur...');
  process.exit(0);
});
