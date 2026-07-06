# Metriques exposees par l'API PaLeonis

L'endpoint `/metrics` expose toutes les metriques au format Prometheus.

Pour les voir directement : `curl http://localhost:3000/metrics`

## Metriques HTTP

### `http_requests_total` (counter)

Nombre total de requetes HTTP recues, ventile par methode, route et code de reponse.

**Labels :**
- `method` : GET, POST, PUT, DELETE...
- `route` : la route Express (ex: `/api/formations`, `/api/reservations/:id`)
- `status` : code HTTP (200, 404, 500...)

**Usages typiques :**
```promql
# Taux de requetes par seconde
rate(http_requests_total[1m])

# Taux d erreurs 5xx
sum(rate(http_requests_total{status=~"5.."}[1m]))
  / sum(rate(http_requests_total[1m]))
```

### `http_request_duration_seconds` (histogram)

Distribution de la duree des requetes HTTP en secondes.

**Labels :** memes que ci-dessus.

**Buckets :** `0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5` secondes.

**Usages typiques :**
```promql
# Latence p95 sur 1 minute
histogram_quantile(0.95,
  sum by (le) (rate(http_request_duration_seconds_bucket[1m]))
)

# Latence p99 par route
histogram_quantile(0.99,
  sum by (le, route) (rate(http_request_duration_seconds_bucket[5m]))
)
```

## Metriques metier

### `paleonis_reservations_total` (counter)

Nombre total de tentatives de reservation.

**Labels :**
- `status` : `created` ou `failed`
- `formation` : id de la formation

**Usages :**
```promql
# Taux de reservations creees par seconde
rate(paleonis_reservations_total{status="created"}[5m])

# Taux d echec
rate(paleonis_reservations_total{status="failed"}[5m])
  / rate(paleonis_reservations_total[5m])
```

### `paleonis_active_users` (gauge)

Nombre approximatif d'utilisateurs actifs en ce moment (simule).

```promql
paleonis_active_users
```

### `paleonis_app_info` (gauge)

Informations sur l'application (version, environnement). Vaut toujours 1.

## Metriques systeme (auto)

Le client prom-client expose automatiquement les metriques Node.js / process :

- `process_cpu_seconds_total`
- `process_resident_memory_bytes`
- `process_open_fds`
- `nodejs_eventloop_lag_seconds`
- `nodejs_heap_size_total_bytes`
- ... (voir la liste complete sur `/metrics`)

## Metriques Prometheus lui-meme

Quand vous etes connecte a Prometheus, vous avez aussi `up` :

```promql
# Le service paleonis-api est-il up ?
up{job="paleonis-api"}
```

`up == 1` quand Prometheus arrive a scraper l'app, `up == 0` sinon.
**C'est la base pour calculer la disponibilite.**
