# TP QoS / KPI - Plateforme PaLeonis

Stack pratique pour la journee de TP du module QoS & KPI.
Objectif : monitorer la "plateforme de reservation" PaLeonis, calculer les KPI
vus en cours, simuler des incidents et construire des dashboards.

## Architecture

```
                                    ┌─────────────────┐
                                    │     Grafana     │
                                    │ (dashboards)    │
                                    │  localhost:3001 │
                                    └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
   curl/scripts ────────────────►   │   Prometheus    │
                                    │  (collecte/TSDB)│
                                    │  localhost:9090 │
                                    └────────┬────────┘
                                             │ scrape /metrics toutes les 5s
                                             ▼
                                    ┌─────────────────┐
   curl/scripts ────────────────►   │  PaLeonis API   │
                                    │  (Node/Express) │
                                    │  localhost:3000 │
                                    └─────────────────┘
```

## Demarrage rapide

### 1. Prerequis

- Docker (>= 20.10) et Docker Compose
- Un terminal avec `curl` (et `jq` pour les scripts)
- Ports libres : 3000, 3001, 9090

### 2. Lancer la stack

```bash
docker compose up -d
```

Premier lancement : ~2 min (build de l'image Node + pull de Prometheus/Grafana).

### 3. Verifier que tout tourne

```bash
# L'app PaLeonis
curl http://localhost:3000/health

# Les metriques au format Prometheus
curl http://localhost:3000/metrics

# Prometheus
open http://localhost:9090         # Mac
xdg-open http://localhost:9090     # Linux
# Sur Windows : ouvre http://localhost:9090 dans ton navigateur

# Grafana (login : admin / paleonis)
open http://localhost:3001
```

### 4. Generer un peu de trafic

Dans un terminal a part, laisse tourner :

```bash
./scripts/simulate-traffic.sh
```

Tu devrais voir des metriques apparaitre dans Prometheus en quelques secondes.

## Structure du repo

```
paleonis-tp/
├── README.md                       # Ce fichier
├── docker-compose.yml              # Orchestration de la stack
├── app/                            # Application Node/Express instrumentee
│   ├── server.js
│   ├── routes/                     # Routes metier + admin (chaos)
│   ├── middleware/                 # metrics.js + chaos.js
│   └── data/formations.js          # Catalogue de formations
├── prometheus/
│   └── prometheus.yml              # Config Prometheus (scrape toutes les 5s)
├── grafana/
│   └── provisioning/               # Datasource Prometheus pre-configuree
├── scripts/
│   ├── simulate-traffic.sh         # Generateur de trafic
│   └── chaos-scenarios.sh          # Helpers pour declencher des incidents
└── docs/
    ├── ENDPOINTS.md                # Liste de tous les endpoints
    ├── METRICS.md                  # Description des metriques exposees
    └── PROMQL-CHEATSHEET.md        # Cheat sheet PromQL
```

## Liens utiles

- Prometheus UI : http://localhost:9090
  - Onglet Status > Targets : verifier que `paleonis-api` est UP
  - Onglet Graph : pour tester des requetes PromQL
- Grafana : http://localhost:3001 (admin / paleonis)
- Endpoints app : voir [docs/ENDPOINTS.md](docs/ENDPOINTS.md)
- Metriques exposees : voir [docs/METRICS.md](docs/METRICS.md)
- Aide PromQL : voir [docs/PROMQL-CHEATSHEET.md](docs/PROMQL-CHEATSHEET.md)

## Simuler un incident en 10 secondes

```bash
# Voir l'etat actuel
./scripts/chaos-scenarios.sh status

# Injecter 1.5s de latence
./scripts/chaos-scenarios.sh latency 1500

# 20% d erreurs 5xx
./scripts/chaos-scenarios.sh error 0.2

# Panne totale
./scripts/chaos-scenarios.sh down

# Tout remettre a zero
./scripts/chaos-scenarios.sh reset
```

Ou en direct par curl :

```bash
curl -X POST "http://localhost:3000/admin/scenario/incident-perf"
curl -X POST "http://localhost:3000/admin/reset"
```

## Arret / nettoyage

```bash
# Arret en gardant les donnees
docker compose stop

# Arret + suppression des conteneurs (les donnees Prometheus/Grafana persistent)
docker compose down

# Tout supprimer (y compris les volumes Prometheus / Grafana)
docker compose down -v
```

## Troubleshooting

**Port deja utilise** : modifie les `ports:` du `docker-compose.yml` (ex: `"3002:3000"` au lieu de `"3000:3000"`).

**Prometheus ne voit pas l'app** : verifie sur http://localhost:9090/targets que la cible `paleonis-api` est UP. Si DOWN, regarde les logs : `docker compose logs prometheus`.

**Grafana ne montre rien** : verifie que la datasource Prometheus est OK dans Configuration > Data sources. L'URL doit etre `http://prometheus:9090` (PAS localhost - on est dans le reseau Docker).

**Build qui rame derriere un proxy d entreprise** : ajoute `--build-arg HTTPS_PROXY=...` ou configure ton Docker daemon.
