// Middleware "chaos" - permet d'injecter des erreurs, de la latence et des pannes
// pour simuler des incidents pendant le TP. Pilote via les endpoints /admin/*.

// Etat global du chaos. Modifie par les routes /admin/*.
const chaosState = {
  errorRate: 0,        // 0 a 1 - probabilite d'erreur 5xx
  extraLatencyMs: 0,   // latence supplementaire en ms
  isDown: false,       // mode panne totale (503 sur tous les endpoints metier)
  errorRateTimer: null,
  latencyTimer: null,
};

// Wrapper Promise pour setTimeout
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Middleware applique uniquement aux routes metier (pas a /metrics ni a /admin)
async function chaosMiddleware(req, res, next) {
  // 1) Mode panne totale
  if (chaosState.isDown) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Le service est en panne (mode chaos active)',
    });
  }

  // 2) Latence injectee
  if (chaosState.extraLatencyMs > 0) {
    // On ajoute aussi un peu de jitter pour faire realiste (+/- 20%)
    const jitter = (Math.random() - 0.5) * 0.4 * chaosState.extraLatencyMs;
    await sleep(chaosState.extraLatencyMs + jitter);
  }

  // 3) Erreurs aleatoires
  if (chaosState.errorRate > 0 && Math.random() < chaosState.errorRate) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erreur simulee (chaos active)',
    });
  }

  next();
}

module.exports = { chaosMiddleware, chaosState };
