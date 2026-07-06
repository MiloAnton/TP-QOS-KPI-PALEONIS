#!/bin/bash
# simulate-traffic.sh
# Genere du trafic continu sur l'API PaLeonis pour avoir des donnees
# qui s'affichent dans Prometheus / Grafana.
#
# Usage : ./simulate-traffic.sh [URL]
# Defaut : http://localhost:3000

set -e

URL="${1:-http://localhost:3000}"

echo "Generation de trafic sur $URL..."
echo "Ctrl+C pour arreter."
echo ""

# Liste des formations existantes (cf. app/data/formations.js)
FORMATIONS=("qvt-01" "apa-01" "mental-01" "sst-01" "sst-mac" "incendie-01")

# Boucle infinie de requetes
i=0
while true; do
  i=$((i + 1))

  # 70% : lecture liste formations
  if [ $((RANDOM % 10)) -lt 7 ]; then
    curl -s -o /dev/null -w "[%{http_code}] GET /api/formations - %{time_total}s\n" \
      "$URL/api/formations"
  fi

  # 30% : lecture detail
  if [ $((RANDOM % 10)) -lt 3 ]; then
    f=${FORMATIONS[$RANDOM % ${#FORMATIONS[@]}]}
    curl -s -o /dev/null -w "[%{http_code}] GET /api/formations/$f - %{time_total}s\n" \
      "$URL/api/formations/$f"
  fi

  # 20% : POST reservation
  if [ $((RANDOM % 10)) -lt 2 ]; then
    f=${FORMATIONS[$RANDOM % ${#FORMATIONS[@]}]}
    curl -s -o /dev/null -w "[%{http_code}] POST /api/reservations - %{time_total}s\n" \
      -X POST "$URL/api/reservations" \
      -H "Content-Type: application/json" \
      -d "{\"formationId\":\"$f\",\"email\":\"user$i@test.fr\",\"nom\":\"User $i\"}"
  fi

  # 10% : requete invalide (genere des 400)
  if [ $((RANDOM % 10)) -lt 1 ]; then
    curl -s -o /dev/null -w "[%{http_code}] POST /api/reservations (invalide) - %{time_total}s\n" \
      -X POST "$URL/api/reservations" \
      -H "Content-Type: application/json" \
      -d "{}"
  fi

  # Pause aleatoire entre 50ms et 500ms
  sleep "0.$((RANDOM % 5 + 1))"
done
