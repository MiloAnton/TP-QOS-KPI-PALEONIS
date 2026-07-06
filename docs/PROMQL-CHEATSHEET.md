# PromQL - Cheat sheet pour le TP PaLeonis

## Vocabulaire de base

| Terme | Quoi |
|-------|------|
| **Counter** | Compteur qui ne fait que monter (ex: `http_requests_total`). Toujours utiliser `rate()` ou `increase()` pour l'exploiter. |
| **Gauge** | Valeur qui monte ET descend (ex: temperature, nb d utilisateurs, memoire). S'utilise directement. |
| **Histogram** | Distribution de valeurs (ex: latences). S'utilise avec `histogram_quantile()`. |
| **Label** | Cle/valeur qui categorise une metrique (ex: `status="500"`, `route="/api/formations"`). |

## Les fonctions essentielles

### `rate()` - taux par seconde

Le couteau suisse des counters. Calcule la pente moyenne sur une fenetre.

```promql
# Requetes par seconde sur 1 minute
rate(http_requests_total[1m])
```

### `sum()` - agrege

```promql
# Total des requetes par seconde, tous statuts confondus
sum(rate(http_requests_total[1m]))

# Par status
sum by (status) (rate(http_requests_total[1m]))

# Par route
sum by (route) (rate(http_requests_total[1m]))
```

### `histogram_quantile()` - percentiles

```promql
# Latence au p95 (= 95% des requetes sont plus rapides que cette valeur)
histogram_quantile(0.95,
  sum by (le) (rate(http_request_duration_seconds_bucket[1m]))
)

# Idem p99
histogram_quantile(0.99,
  sum by (le) (rate(http_request_duration_seconds_bucket[1m]))
)
```

`le` = "less or equal" : c'est le label qui designe les bornes des buckets.

### `up` - disponibilite

Cette metrique vaut `1` si Prometheus arrive a scraper la cible, `0` sinon.

```promql
# Etat actuel
up{job="paleonis-api"}

# Disponibilite moyenne sur 5 minutes (en %)
avg_over_time(up{job="paleonis-api"}[5m]) * 100
```

## Calculs des KPI du cours

### Disponibilite (%)

```promql
avg_over_time(up{job="paleonis-api"}[5m]) * 100
```

### Taux d erreur 5xx (%)

```promql
sum(rate(http_requests_total{status=~"5.."}[5m]))
  /
sum(rate(http_requests_total[5m]))
  * 100
```

### Taux de succes (%)

```promql
sum(rate(http_requests_total{status=~"2.."}[5m]))
  /
sum(rate(http_requests_total[5m]))
  * 100
```

### Latence p95 (en ms)

```promql
histogram_quantile(0.95,
  sum by (le) (rate(http_request_duration_seconds_bucket[1m]))
) * 1000
```

### Debit (req/s)

```promql
sum(rate(http_requests_total[1m]))
```

### Apdex (basique, T = 500ms)

```promql
(
  sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m]))
  +
  sum(rate(http_request_duration_seconds_bucket{le="2"}[5m]))
) / 2
  /
sum(rate(http_request_duration_seconds_count[5m]))
```

## Operateurs et filtres utiles

| Operateur | Exemple | Sens |
|-----------|---------|------|
| `=` | `status="200"` | egalite stricte |
| `!=` | `status!="200"` | inegalite |
| `=~` | `status=~"5.."` | regex match (toutes les 5xx) |
| `!~` | `status!~"2.."` | regex no-match (tout sauf les 2xx) |

## Pieges classiques

- `rate()` ne marche QUE sur des counters. Sur un gauge il faut utiliser la metrique directement.
- La fenetre `[1m]` doit contenir au moins 2 echantillons. Avec un scrape toutes les 5s, `[1m]` = OK.
- `histogram_quantile()` a besoin de `sum by (le)` autour du `rate()`, sinon le resultat est faux.
- `avg(up)` te donne une valeur entre 0 et 1, pas un pourcentage. Multiplie par 100.

## Pour aller plus loin

- Documentation officielle : https://prometheus.io/docs/prometheus/latest/querying/basics/
- Cheat sheet PromQL : https://promlabs.com/promql-cheat-sheet/
