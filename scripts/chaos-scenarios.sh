#!/bin/bash
# chaos-scenarios.sh
# Helpers pour declencher rapidement des incidents pendant le TP.
#
# Usage : ./chaos-scenarios.sh <scenario>
# Scenarios disponibles :
#   status                  - voir l'etat actuel
#   reset                   - tout remettre a zero
#   error <0..1>            - fixer le taux d erreur (ex: 0.2 = 20%)
#   latency <ms>            - injecter de la latence (ex: 1500)
#   down                    - panne totale (503)
#   up                      - retour a la normale
#   incident-perf           - latence 1500ms + 2% erreurs
#   incident-fiab           - 20% erreurs
#   panne                   - panne totale
#   degradation             - degradation progressive sur 60s

URL="${URL:-http://localhost:3000}"

case "$1" in
  status)
    curl -s "$URL/admin/status" | jq .
    ;;
  reset)
    curl -s -X POST "$URL/admin/reset" | jq .
    ;;
  error)
    curl -s -X POST "$URL/admin/error-rate?rate=$2" | jq .
    ;;
  latency)
    curl -s -X POST "$URL/admin/latency?ms=$2" | jq .
    ;;
  down)
    curl -s -X POST "$URL/admin/down" | jq .
    ;;
  up)
    curl -s -X POST "$URL/admin/up" | jq .
    ;;
  incident-perf)
    curl -s -X POST "$URL/admin/scenario/incident-perf" | jq .
    ;;
  incident-fiab)
    curl -s -X POST "$URL/admin/scenario/incident-fiab" | jq .
    ;;
  panne)
    curl -s -X POST "$URL/admin/scenario/panne" | jq .
    ;;
  degradation)
    curl -s -X POST "$URL/admin/scenario/degradation-progressive" | jq .
    ;;
  *)
    echo "Usage : $0 <scenario>"
    echo ""
    echo "Scenarios :"
    echo "  status              - Voir l'etat actuel"
    echo "  reset               - Tout remettre a zero"
    echo "  error <0..1>        - Fixer le taux d erreur (ex: 0.2)"
    echo "  latency <ms>        - Injecter de la latence (ex: 1500)"
    echo "  down                - Panne totale (503)"
    echo "  up                  - Retour a la normale"
    echo "  incident-perf       - Latence 1500ms + 2% erreurs"
    echo "  incident-fiab       - 20% erreurs"
    echo "  panne               - Panne totale"
    echo "  degradation         - Degradation progressive sur 60s"
    exit 1
    ;;
esac
