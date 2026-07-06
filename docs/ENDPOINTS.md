# Endpoints de l'API PaLeonis

URL de base : `http://localhost:3000`

## Endpoints metier (soumis au chaos)

### Formations

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/formations` | Liste des formations disponibles |
| GET | `/api/formations/:id` | Detail d'une formation |

Exemple :
```bash
curl http://localhost:3000/api/formations
curl http://localhost:3000/api/formations/qvt-01
```

### Reservations

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/reservations` | Liste des reservations |
| GET | `/api/reservations/:id` | Detail d'une reservation |
| POST | `/api/reservations` | Creer une reservation |

Exemple :
```bash
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"formationId":"qvt-01","email":"jean@test.fr","nom":"Jean Dupont"}'
```

## Endpoints systeme (jamais affectes par le chaos)

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Page d'accueil |
| GET | `/health` | Health check (liveness) |
| GET | `/metrics` | Metriques Prometheus |

## Endpoints admin (pour piloter les incidents)

### Etat

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/admin/status` | Etat actuel du chaos |
| POST | `/admin/reset` | Tout remettre a zero |

### Erreurs

```bash
# Fixer le taux d erreur a 20%
curl -X POST "http://localhost:3000/admin/error-rate?rate=0.2"

# Plus aucune erreur
curl -X POST "http://localhost:3000/admin/error-rate?rate=0"
```

### Latence

```bash
# Ajouter 1.5s de latence
curl -X POST "http://localhost:3000/admin/latency?ms=1500"

# Retirer la latence
curl -X POST "http://localhost:3000/admin/latency?ms=0"
```

### Panne totale

```bash
# Mettre l'app en panne (toutes les routes metier renvoient 503)
curl -X POST "http://localhost:3000/admin/down"

# Remettre en route
curl -X POST "http://localhost:3000/admin/up"
```

### Scenarios pre-configures

| Endpoint | Effet |
|----------|-------|
| `POST /admin/scenario/incident-perf` | Latence 1500ms + 2% erreurs 5xx |
| `POST /admin/scenario/incident-fiab` | 20% d erreurs 5xx (1 sur 5) |
| `POST /admin/scenario/panne` | Panne totale (503) |
| `POST /admin/scenario/degradation-progressive` | Latence qui monte progressivement sur 60s |

Exemple :
```bash
curl -X POST http://localhost:3000/admin/scenario/incident-perf
```
