// Instrumentation Prometheus pour l'app PaLeonis
// Toutes les metriques exposees sur /metrics sont definies ici.

const client = require('prom-client');

// Registre par defaut + collecte des metriques systeme (CPU, memoire, GC...)
const register = new client.Registry();
register.setDefaultLabels({ app: 'paleonis-api' });
client.collectDefaultMetrics({ register });

// ----- Metriques HTTP -----

// Compteur du nombre total de requetes HTTP
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Nombre total de requetes HTTP recues',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

// Histogramme de la duree des requetes (pour calcul des p50/p95/p99)
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duree des requetes HTTP en secondes',
  labelNames: ['method', 'route', 'status'],
  // Buckets adaptes a une API web : de 10ms a 5s
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

// ----- Metriques metier -----

// Compteur des reservations (succes / echec)
const reservationsTotal = new client.Counter({
  name: 'paleonis_reservations_total',
  help: 'Nombre total de tentatives de reservation',
  labelNames: ['status', 'formation'],
  registers: [register],
});

// Jauge des utilisateurs actifs (simulee)
const activeUsers = new client.Gauge({
  name: 'paleonis_active_users',
  help: 'Nombre approximatif d utilisateurs actifs en ce moment',
  registers: [register],
});

// Info sur l'application
const appInfo = new client.Gauge({
  name: 'paleonis_app_info',
  help: 'Informations sur l app (version)',
  labelNames: ['version', 'env'],
  registers: [register],
});
appInfo.labels('1.0.0', process.env.NODE_ENV || 'tp').set(1);

// Middleware Express qui mesure chaque requete
function metricsMiddleware(req, res, next) {
  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationSeconds = diff[0] + diff[1] / 1e9;

    // On utilise req.route?.path pour eviter l'explosion de cardinalite
    // (sinon /api/reservations/123, /api/reservations/124... = 1 label par id)
    const route = req.route?.path || req.baseUrl + (req.route?.path || '') || 'unknown';
    const labels = {
      method: req.method,
      route: route,
      status: res.statusCode,
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, durationSeconds);
  });

  next();
}

module.exports = {
  register,
  metricsMiddleware,
  reservationsTotal,
  activeUsers,
};
