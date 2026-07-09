# Guide complet de la journée TP - QoS & KPI

Ce guide te conduit pas à pas pendant les 7 heures de TP. Suis les étapes dans l'ordre, fais les vérifications proposées, et lis les encadrés "Si ça bloque" si tu rencontres un souci.

> **Bon à savoir avant de commencer**
> - Toutes les commandes sont à taper telles quelles dans un terminal.
> - Quand tu vois un texte entre `<chevrons>`, ça veut dire que tu dois remplacer par ta propre valeur.
> - Si une étape te paraît bizarre, lis attentivement le texte juste au-dessus : on explique toujours pourquoi on fait ce qu'on fait.

---

## Sommaire

1. [Vue d'ensemble de la journée](#1-vue-densemble-de-la-journée)
2. [Avant de commencer - vérifier les outils](#2-avant-de-commencer---vérifier-les-outils)
3. [Setup - Lancer la stack PaLeonis](#3-setup---lancer-la-stack-paleonis)
4. [TP1 - Premiers pas avec Prometheus](#4-tp1---premiers-pas-avec-prometheus)
5. [TP2 - Les 4 KPI critiques de PaLeonis](#5-tp2---les-4-kpi-critiques-de-paleonis)
6. [TP3 - Construire le dashboard QoS](#6-tp3---construire-le-dashboard-qos)
7. [TP4 - Simuler des incidents et Error Budget](#7-tp4---simuler-des-incidents-et-error-budget)
8. [TP noté - Reproduire un dashboard cible](#8-tp-noté---reproduire-un-dashboard-cible)
9. [FAQ - Problèmes fréquents](#9-faq---problèmes-fréquents)

---

## 1. Vue d'ensemble de la journée

### Ce qu'on va faire concrètement

PaLeonis, l'organisme de formation que tu connais depuis le début du cours, t'a engagé comme consultant. Aujourd'hui, tu vas mettre en place leur **système de monitoring complet** : capturer des métriques techniques en temps réel, calculer les KPI vus en cours, construire un tableau de bord, et simuler des incidents pour valider que tout fonctionne.

À la fin de la journée, tu auras :
- Une stack Prometheus + Grafana qui tourne sur ta machine
- Une plateforme de réservation simulée (l'app PaLeonis) instrumentée
- 4 KPI prioritaires calculés en PromQL
- Un dashboard Grafana opérationnel
- L'expérience d'un cycle "incident détecté - mesuré - résolu"
- Un TP noté validé

### L'architecture que tu vas monter

```
   Toi (navigateur)
   |
   |---> Grafana (port 3001)         <-- pour visualiser les KPI
   |       |
   |       v
   |     Prometheus (port 9090)      <-- pour stocker les métriques
   |       |
   |       v (scrape toutes les 5s)
   |     App PaLeonis (port 3000)    <-- la plateforme à monitorer
```

Les trois services tournent dans des conteneurs Docker. Tu n'as rien à installer manuellement à part Docker.

### Le contexte PaLeonis (rappel express)

- Plateforme de réservation : Node.js + Express + MySQL
- 12 pannes en 2025, dont 2 de plus de 8h
- Disponibilité actuelle estimée : 99,57%
- Objectif fixé : 99,9% (3 nines)
- Aucun monitoring en place avant ton intervention

Pour le TP, on a créé une fausse plateforme PaLeonis qui simule le comportement réel : des endpoints de réservation, des utilisateurs actifs, et des moyens de déclencher des incidents à la demande pour s'entraîner.

---

## 2. Avant de commencer - vérifier les outils

### 2.1 - Docker

Docker est obligatoire. Si tu ne l'as pas, installe-le maintenant en suivant les instructions correspondant à ton système.

#### Sur Windows

1. Va sur https://www.docker.com/products/docker-desktop
2. Télécharge "Docker Desktop for Windows"
3. Lance l'installeur, suis les étapes par défaut
4. Redémarre ton ordinateur si demandé
5. Lance Docker Desktop depuis le menu Démarrer
6. Attends que l'icône en bas à droite passe au vert

#### Sur macOS

1. Va sur https://www.docker.com/products/docker-desktop
2. Télécharge la version qui correspond à ton processeur (Apple Silicon ou Intel)
3. Ouvre le `.dmg`, glisse Docker dans Applications
4. Lance Docker depuis Applications
5. Attends l'icône baleine dans la barre du haut

#### Sur Linux (Ubuntu/Debian)

```bash
# Installation rapide (script officiel Docker)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Pour pouvoir utiliser docker sans sudo
sudo usermod -aG docker $USER

# IMPORTANT : déconnecte-toi et reconnecte-toi pour que ça prenne effet
```

### 2.2 - Vérifier que Docker fonctionne

Ouvre un terminal et tape :

```bash
docker --version
docker compose version
```

**À vérifier** : tu dois voir deux lignes de version, par exemple :

```
Docker version 27.0.3, build 7d4bcd8
Docker Compose version v2.29.1
```

Puis teste que Docker tourne vraiment :

```bash
docker run --rm hello-world
```

**À vérifier** : tu dois voir un message qui commence par `Hello from Docker!`. Si oui, tu es prêt.

> **Si ça bloque**
> - "command not found" : Docker n'est pas installé ou pas dans le PATH. Sur Windows, redémarre Docker Desktop. Sur Linux, vérifie l'installation.
> - "permission denied" sur Linux : tu as oublié le `usermod -aG docker`. Refais-le et déconnecte-toi.
> - "Cannot connect to the Docker daemon" : Docker n'est pas démarré. Lance Docker Desktop (Windows/Mac) ou `sudo systemctl start docker` (Linux).

### 2.3 - curl (et idéalement jq)

`curl` sert à appeler l'API en ligne de commande. Sur Mac et Linux il est déjà là. Sur Windows 10/11 récent aussi (PowerShell). Vérifie :

```bash
curl --version
```

`jq` formate les réponses JSON pour qu'elles soient lisibles. Optionnel mais pratique :

- Ubuntu/Debian : `sudo apt install jq`
- macOS : `brew install jq`
- Windows : `choco install jq` ou `winget install jqlang.jq`

### 2.4 - Un éditeur de texte

VS Code est recommandé (https://code.visualstudio.com). Tout autre éditeur fait l'affaire (Sublime, Notepad++, etc.).

---

## 3. Setup - Lancer la stack PaLeonis

### 3.1 - Récupérer le projet

Le formateur t'a fourni le projet sous forme d'archive `paleonis-tp.zip` ou de lien Git. Décompresse l'archive ou clone le dépôt, puis place-toi dans le dossier :

```bash
# Si zip
cd ~/Downloads
unzip paleonis-tp.zip
cd paleonis-tp

# Si Git
git clone <url-fournie>
cd paleonis-tp
```

**À vérifier** : la commande `ls` (ou `dir` sur Windows) doit afficher au moins ces dossiers et fichiers :

```
README.md   docker-compose.yml   app/   prometheus/   grafana/   scripts/   docs/
```

### 3.2 - Lancer la stack

Une seule commande lance tout :

```bash
docker compose up -d
```

Le `-d` veut dire "détaché" : la stack tourne en arrière-plan, ton terminal reste libre.

> **Ce qui se passe pendant cette commande**
> 1. Docker télécharge les images Prometheus et Grafana depuis Docker Hub (~200 Mo)
> 2. Docker construit l'image de l'app PaLeonis (npm install, ~1 min)
> 3. Docker démarre les 3 conteneurs et les met en réseau
>
> Le premier lancement prend 2 à 3 minutes. Les suivants seront instantanés.

**À vérifier** : à la fin tu dois voir trois lignes "Started" :

```
[+] Running 3/3
 - Container paleonis-app          Started
 - Container paleonis-prometheus   Started
 - Container paleonis-grafana      Started
```

### 3.3 - Vérifier que les 3 services répondent

C'est l'étape la plus importante. Si une vérification échoue, ne passe pas à la suite, débugue d'abord.

#### Check 1 - L'app PaLeonis

```bash
curl http://localhost:3000/health
```

**Tu dois voir** :

```json
{"status":"ok","uptime":12.345}
```

#### Check 2 - Prometheus

Ouvre dans ton navigateur : **http://localhost:9090**

Tu dois voir l'interface Prometheus. Va dans le menu **Status > Targets**. Tu dois voir deux lignes, toutes les deux avec le statut **UP** (en vert) :

- `prometheus` (Prometheus se surveille lui-même)
- `paleonis-api` (Prometheus surveille notre app)

> **Si une ligne est DOWN**
> - Si `paleonis-api` est DOWN, c'est que Prometheus n'arrive pas à joindre l'app. Tape `docker compose logs app` pour voir les logs de l'app. L'erreur la plus fréquente : un autre programme utilise déjà le port 3000.
> - Attends 10-15 secondes et rafraîchis : Prometheus a besoin d'un cycle de scrape pour passer à UP.

#### Check 3 - Grafana

Ouvre dans ton navigateur : **http://localhost:3001**

Identifiants : **admin** / **paleonis**

À la première connexion, Grafana va te demander de changer le mot de passe : tu peux cliquer sur **Skip** pour l'instant.

Tu dois arriver sur l'écran d'accueil Grafana.

### 3.4 - Vérifier la connexion Grafana → Prometheus

Dans Grafana, dans le menu de gauche, va dans **Connections > Data sources**. Tu dois voir une ligne `Prometheus` déjà configurée. Clique dessus, puis tout en bas clique sur **Save & test**.

**À vérifier** : tu dois voir un message vert "Successfully queried the Prometheus API". Si oui, la chaîne complète fonctionne.

### 3.5 - Lancer un peu de trafic en arrière-plan

Pour avoir des données à monitorer, on lance un script qui envoie des requêtes en continu sur l'app. Ouvre un **deuxième terminal** (laisse Docker tranquille dans le premier) et place-toi dans le projet :

```bash
cd <chemin-vers-paleonis-tp>
./scripts/simulate-traffic.sh
```

> **Sur Windows**, si bash ne marche pas, ouvre Git Bash ou utilise WSL. Sinon, en PowerShell, tu peux taper en boucle :
> ```powershell
> while ($true) { curl http://localhost:3000/api/formations; Start-Sleep -Milliseconds 200 }
> ```

Tu dois voir défiler des lignes du genre :

```
[200] GET /api/formations - 0.012345s
[201] POST /api/reservations - 0.018765s
[200] GET /api/formations/qvt-01 - 0.009876s
```

Laisse ce terminal tourner pendant tout le TP. Ne le ferme pas.

### Récap setup

À ce stade tu dois avoir :

- Stack Docker qui tourne (3 conteneurs)
- App PaLeonis qui répond sur http://localhost:3000
- Prometheus qui scrape l'app, accessible sur http://localhost:9090
- Grafana connecté à Prometheus, accessible sur http://localhost:3001
- Un terminal qui génère du trafic en boucle

Si tout est OK, passe au TP1. Sinon va voir la FAQ tout en bas du document.

---

## 4. TP1 - Premiers pas avec Prometheus

**Durée estimée : 1h15**

### Objectif

Comprendre comment Prometheus collecte et stocke des métriques, et apprendre à interroger ces métriques avec PromQL (le langage de requête de Prometheus).

### Ce que tu vas apprendre

- Lire un endpoint `/metrics` au format Prometheus
- Comprendre les 3 types de métriques (counter, gauge, histogram)
- Écrire ses premières requêtes PromQL
- Visualiser les résultats dans l'interface Prometheus

---

### Étape 1.1 - Regarder ce qu'expose l'app

L'app PaLeonis expose ses métriques sur l'URL `/metrics`. C'est la convention Prometheus. Va voir ce que ça donne :

```bash
curl http://localhost:3000/metrics | head -40
```

Tu vas voir quelque chose comme :

```
# HELP http_requests_total Nombre total de requetes HTTP recues
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/formations",status="200",app="paleonis-api"} 142
http_requests_total{method="POST",route="/api/reservations",status="201",app="paleonis-api"} 38

# HELP http_request_duration_seconds Duree des requetes HTTP en secondes
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.01",app="paleonis-api",method="GET",route="/api/formations",status="200"} 130
http_request_duration_seconds_bucket{le="0.025",app="paleonis-api",method="GET",route="/api/formations",status="200"} 140
...
```

> **Comprendre ce format**
> - Lignes `# HELP` : description de la métrique
> - Lignes `# TYPE` : type (counter, gauge, histogram, summary)
> - Lignes de données : `nom_metrique{labels} valeur`
> - Les labels (entre accolades) servent à filtrer et agréger
>
> Ce format texte est volontairement simple. Chaque service qui veut être monitoré expose un tel endpoint, et Prometheus vient le lire à intervalle régulier (toutes les 5 secondes dans notre config).

**À vérifier** : tu vois bien plusieurs métriques `http_requests_total` avec des labels différents (un par couple méthode/route/status).

### Étape 1.2 - Voir Prometheus scraper l'app

Va sur http://localhost:9090, puis dans le menu **Status > Targets**.

Tu vois une cible `paleonis-api` avec :
- **State** : UP (en vert)
- **Last Scrape** : il y a quelques secondes
- **Scrape Duration** : quelques millisecondes

Clique sur le bouton "show more" pour voir les détails. Tu peux aussi cliquer sur l'URL (`http://app:3000/metrics`) — sauf que ça ne va pas marcher dans ton navigateur, parce que `app` est un nom interne au réseau Docker, pas accessible depuis ta machine.

> **À retenir**
> Prometheus utilise un modèle PULL : c'est lui qui va chercher les métriques toutes les 5 secondes, ce n'est pas l'app qui les pousse. Avantage : si l'app crashe, on s'en aperçoit immédiatement (le scrape échoue). Inconvénient : Prometheus doit savoir où chercher (configuré dans `prometheus.yml`).

### Étape 1.3 - Première requête PromQL

Va dans l'onglet **Graph** (en haut). Dans la barre de recherche, tape :

```promql
http_requests_total
```

Clique sur **Execute** puis sur l'onglet **Table**.

**À vérifier** : tu vois une ligne par combinaison de labels, avec la valeur totale du compteur.

Maintenant clique sur l'onglet **Graph**. Tu vois des courbes qui montent en escalier — c'est normal, un counter ne fait que monter.

### Étape 1.4 - Comprendre les types de métriques

Trois types principaux. Chacun s'exploite différemment.

#### Counter - un compteur qui ne fait que monter

Exemples : nombre total de requêtes, nombre total d'erreurs, nombre total de réservations.

Un counter brut n'est pas très utile (tu vois juste un cumul). Ce qui est intéressant, c'est sa **vitesse**, c'est-à-dire combien il augmente par seconde. La fonction `rate()` calcule ça :

```promql
rate(http_requests_total[1m])
```

Ce qui veut dire : "calcule le taux de croissance moyen de `http_requests_total` sur la dernière minute". Le résultat est exprimé en "événements par seconde".

Teste cette requête. Tu devrais voir des valeurs autour de 1 à 5 req/s (ça dépend de la cadence du script de trafic).

> **Attention au piège**
> `rate()` ne marche QUE sur les counters. Sur un gauge, il faut utiliser la métrique directement.

#### Gauge - une valeur qui peut monter ou descendre

Exemples : température, mémoire utilisée, nombre d'utilisateurs actifs, taille d'une file d'attente.

Pour un gauge, tu prends juste la valeur actuelle :

```promql
paleonis_active_users
```

Tu peux aussi l'agréger :

```promql
avg_over_time(paleonis_active_users[5m])
```

Ce qui donne la moyenne sur les 5 dernières minutes.

#### Histogram - une distribution de valeurs

Exemples : latences des requêtes, tailles de fichiers, durées de calcul.

Un histogram est composé de plusieurs séries internes (les "buckets"). C'est conçu pour calculer des percentiles. La requête classique pour le p95 (95e percentile) :

```promql
histogram_quantile(0.95,
  sum by (le) (rate(http_request_duration_seconds_bucket[1m]))
)
```

> **Lire cette requête de l'intérieur vers l'extérieur**
> 1. `http_request_duration_seconds_bucket` : la métrique "buckets" générée par l'histogram
> 2. `rate(...[1m])` : on prend la vitesse de remplissage des buckets sur 1 minute
> 3. `sum by (le)` : on regroupe par borne de bucket (`le` = "less or equal")
> 4. `histogram_quantile(0.95, ...)` : on calcule le 95e percentile à partir de cette distribution
>
> Le résultat est en secondes. Multiplie par 1000 pour avoir des millisecondes.

Teste cette requête. Tu devrais voir une valeur autour de 0.01 à 0.05 secondes (10 à 50 ms).

### Étape 1.5 - Filtrer avec des labels

Les labels sont l'arme principale de PromQL. Tu peux les utiliser pour filtrer :

```promql
# Seulement les requêtes en erreur 5xx
http_requests_total{status=~"5.."}

# Seulement les POST
http_requests_total{method="POST"}

# Seulement la route formations
http_requests_total{route="/api/formations"}

# Combinaison
rate(http_requests_total{method="POST", status="201"}[1m])
```

Les opérateurs disponibles :
- `=` : égalité stricte
- `!=` : différent
- `=~` : correspond à une regex
- `!~` : ne correspond pas à une regex

Teste ces requêtes une par une.

### Étape 1.6 - Premier graphe utile

Affichons le débit total réparti par status code :

```promql
sum by (status) (rate(http_requests_total[1m]))
```

Passe en vue **Graph**, puis dans **Last** (en haut à droite) sélectionne "5m" pour voir les 5 dernières minutes.

**À vérifier** : tu vois plusieurs courbes empilées, une par status code (200, 201, 400, 404...).

### Récap TP1

Tu sais maintenant :

- Lire l'endpoint `/metrics` et reconnaître les types de métriques
- Vérifier qu'une cible est bien scrapée par Prometheus
- Écrire des requêtes PromQL avec `rate()`, `sum by ()`, et `histogram_quantile()`
- Filtrer par labels

> **Pour aller plus loin (optionnel)**
> Dans Prometheus, va dans l'onglet **Graph** et dans la barre, tape juste `{` puis attends. Prometheus te propose en autocomplétion toutes les métriques disponibles. Très utile pour explorer.


---

## 5. TP2 - Les 4 KPI critiques de PaLeonis

**Durée estimée : 1h15**

### Objectif

Construire les 4 KPI prioritaires identifiés dans le cours théorique (chapitre 7, étape 6 du fil rouge PaLeonis), en PromQL. Ces requêtes serviront de base pour le dashboard du TP3.

### Rappel du cours

Pour la plateforme de réservation PaLeonis, les 4 KPI prioritaires sont :

| Famille | KPI | Objectif |
|---------|-----|----------|
| Disponibilité | Taux de disponibilité | ≥ 99,9% |
| Performance | Temps de réponse p95 | < 2 s |
| Fiabilité | Taux d'erreur 5xx | < 0,5% |
| Support | MTTR (approximation) | < 1 h |

Pour chaque KPI, tu vas écrire la requête PromQL, vérifier le résultat dans Prometheus, et noter ce que tu obtiens.

---

### Étape 2.1 - KPI 1 : Disponibilité

Le KPI le plus simple à construire. Prometheus expose automatiquement une métrique `up` qui vaut `1` si le scrape réussit, `0` sinon.

#### La requête de base

Ouvre Prometheus, onglet **Graph**, et tape :

```promql
up{job="paleonis-api"}
```

Tu vois la valeur instantanée. Tant que l'app tourne, c'est `1`.

#### La requête KPI : disponibilité moyenne sur 5 minutes (en %)

```promql
avg_over_time(up{job="paleonis-api"}[5m]) * 100
```

> **Comment ça marche**
> - `up` vaut 0 ou 1 à chaque scrape (toutes les 5s)
> - Sur 5 minutes, on a 60 valeurs (300s / 5s)
> - `avg_over_time` calcule la moyenne de ces 60 valeurs
> - Si tout est UP : moyenne = 1, donc 100% après le `* 100`
> - Si l'app est DOWN pendant 1 minute sur 5 : 48/60 = 0,8, donc 80%

**À faire** : tape la requête, note le résultat actuel. Normalement 100% (on n'a pas encore créé de panne).

> **Attention au piège classique**
> Beaucoup d'élèves écrivent `avg(up{...}) * 100`. Ça donne juste la valeur instantanée moyennée sur les targets, pas la disponibilité dans le temps. La fonction qui fait le calcul "dans le temps" c'est bien `avg_over_time`.

> **Limite de cette mesure**
> `up` mesure si Prometheus arrive à scraper le `/metrics`. Mais l'app peut tout à fait répondre sur `/metrics` tout en renvoyant des 503 sur les routes métier (on le verra au TP4). Pour une mesure plus fiable, il faut combiner `up` avec d'autres signaux. Pour ce TP, `up` suffit.

### Étape 2.2 - KPI 2 : Latence p95

#### La requête

```promql
histogram_quantile(0.95,
  sum by (le) (rate(http_request_duration_seconds_bucket[1m]))
)
```

Le résultat est en **secondes**. Pour avoir des millisecondes :

```promql
histogram_quantile(0.95,
  sum by (le) (rate(http_request_duration_seconds_bucket[1m]))
) * 1000
```

**À faire** : tape la requête, note la valeur. Tu devrais avoir entre 5 et 50 ms.

#### Variante par route

Si tu veux la latence p95 décomposée par route :

```promql
histogram_quantile(0.95,
  sum by (le, route) (rate(http_request_duration_seconds_bucket[1m]))
) * 1000
```

Tu vois maintenant une ligne par route. Quelle route est la plus lente ?

> **Pourquoi le p95 et pas la moyenne ?**
> Rappel du cours : si 99 requêtes prennent 100ms et 1 prend 60s, la moyenne est 700ms (qui ne reflète rien). Le p95 est 100ms et le p99 est 60s. Le p95/p99 reflète mieux l'expérience de tes utilisateurs lents, qui sont ceux qu'il faut surveiller.

> **Erreur fréquente**
> Si tu oublies `sum by (le)` autour du `rate`, le résultat est faux. Toujours penser à agréger sur `le` avant `histogram_quantile`.

### Étape 2.3 - KPI 3 : Taux d'erreur 5xx

#### La requête

```promql
sum(rate(http_requests_total{status=~"5.."}[5m]))
  /
sum(rate(http_requests_total[5m]))
  * 100
```

> **Lecture de la requête**
> - Numérateur : taux de requêtes 5xx par seconde
> - Dénominateur : taux de TOUTES les requêtes par seconde
> - Ratio = proportion d'erreurs
> - `* 100` pour avoir un pourcentage

**À faire** : tape la requête. Tant qu'on n'a pas injecté d'incident, le résultat doit être 0 ou très proche.

> **Note sur les résultats vides**
> Si tu n'as aucune erreur 5xx du tout, le numérateur peut être absent (et pas zéro). Dans ce cas la requête peut renvoyer `Empty query result`. Ce n'est pas une erreur de syntaxe, c'est juste qu'il n'y a rien à montrer. Une vraie courbe va apparaître dès la première erreur générée au TP4.

### Étape 2.4 - KPI 4 : Performance / débit

Ce n'est pas exactement un KPI du cours, mais c'est utile pour le dashboard. Le débit (throughput) en requêtes par seconde :

```promql
sum(rate(http_requests_total[1m]))
```

Si tu veux décomposer par status :

```promql
sum by (status) (rate(http_requests_total[1m]))
```

### Étape 2.5 - Bonus : KPI métier

PaLeonis vit de ses réservations. Combien sont créées par minute ?

```promql
rate(paleonis_reservations_total{status="created"}[5m]) * 60
```

Et le taux d'échec des réservations :

```promql
rate(paleonis_reservations_total{status="failed"}[5m])
  /
rate(paleonis_reservations_total[5m])
  * 100
```

### Étape 2.6 - Sauvegarder tes requêtes

Garde tes 4 requêtes dans un fichier texte ou dans un fichier `requetes-promql.md` que tu crées à côté. Tu vas les réutiliser dans le TP3 pour le dashboard.

Modèle :

```
KPI 1 - Disponibilite
avg_over_time(up{job="paleonis-api"}[5m]) * 100
Resultat actuel : 100%
Objectif : >= 99.9%

KPI 2 - Latence p95 (ms)
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[1m]))) * 1000
Resultat actuel : 23 ms
Objectif : < 2000 ms

KPI 3 - Taux erreur 5xx (%)
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100
Resultat actuel : 0%
Objectif : < 0.5%

KPI 4 - Debit (req/s)
sum(rate(http_requests_total[1m]))
Resultat actuel : 3.2 req/s
Objectif : informatif
```

### Récap TP2

Tu sais écrire les 4 KPI principaux pour piloter PaLeonis. Garde-les sous le coude, on les utilise au TP3.


---

## 6. TP3 - Construire le dashboard QoS

**Durée estimée : 1h15**

### Objectif

Transformer tes 4 requêtes PromQL en un tableau de bord Grafana professionnel, en respectant les règles d'or vues en cours (max 7±2 KPI, feux tricolores, tendances).

### Ce qu'on va construire

Un dashboard "QoS PaLeonis" avec 6 panneaux :

1. Disponibilité (single stat avec couleurs)
2. Taux d'erreur 5xx (single stat avec couleurs)
3. Latence p95 (single stat avec couleurs)
4. Latence p50/p95/p99 dans le temps (graphe temporel)
5. Requêtes par seconde par status (graphe temporel)
6. Utilisateurs actifs (gauge)

---

### Étape 3.1 - Créer un nouveau dashboard

Dans Grafana (http://localhost:3001) :

1. Dans le menu de gauche, clique sur **Dashboards**
2. Clique sur le bouton bleu **New** en haut à droite, puis **New dashboard**
3. Tu arrives sur un écran "Add visualization"
4. Clique sur cet encart, sélectionne **Prometheus** comme datasource

Tu es maintenant en train de créer ton premier panneau.

### Étape 3.2 - Panneau 1 : Disponibilité (single stat)

Dans l'éditeur de panneau :

1. **Visualisation** (en haut à droite) : choisis **Stat**
2. Dans la zone "Query" (en bas), section "A", clique sur **Code** (à droite, par défaut c'est "Builder") pour basculer en mode requête PromQL brute
3. Colle ta requête de disponibilité :
   ```
   avg_over_time(up{job="paleonis-api"}[5m]) * 100
   ```
4. Dans le panneau de droite, configure :
   - **Title** : `Disponibilite`
   - **Unit** : tape "percent" et choisis "Percent (0-100)"
   - **Decimals** : 2
5. Toujours à droite, déroule la section **Thresholds**. Configure les seuils :
   - Vert : Base (par défaut)
   - Orange : 99
   - Rouge : 0
   
   (Quand la valeur est sous le seuil, la couleur s'applique.)
6. Pour que la couleur teinte aussi la valeur, déroule **Stat styles** : "Color mode" → "Value".
7. En haut à droite, clique sur **Apply**.

**À vérifier** : le panneau affiche `100.00%` en vert.

### Étape 3.3 - Panneau 2 : Taux d'erreur 5xx

Sur le dashboard, en haut à droite, clique sur **Add** > **Visualization**.

1. Visualisation : **Stat**
2. Requête (mode Code) :
   ```
   sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100
   ```
3. **Title** : `Taux d erreur 5xx`
4. **Unit** : Percent (0-100)
5. **Decimals** : 2
6. **Thresholds** (attention, ici la logique est inversée : plus c'est haut, plus c'est mauvais) :
   - Vert : Base
   - Orange : 0.5
   - Rouge : 2
7. **No data**, déroule la section et configure : "Alias" = `0` (ça remplace les "no data" par 0%, sinon le panneau dit "No Data" tant qu'il n'y a pas eu d'erreur)

> **Astuce subtile**
> Sans erreurs, la division `0/X = 0` mais Prometheus peut juste ne pas renvoyer de série du tout. Pour forcer l'affichage de zéro, tu peux écrire :
> ```
> sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100
> or vector(0)
> ```
> Le `or vector(0)` veut dire "si la requête principale est vide, retourne 0".

**À vérifier** : le panneau affiche 0% en vert. Apply.

### Étape 3.4 - Panneau 3 : Latence p95

1. Add > Visualization
2. Stat
3. Requête :
   ```
   histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[1m]))) * 1000
   ```
4. **Title** : `Latence p95`
5. **Unit** : tape "milliseconds" et choisis "Milliseconds (ms)"
6. **Decimals** : 0
7. **Thresholds** :
   - Vert : Base
   - Orange : 500
   - Rouge : 2000

Apply.

### Étape 3.5 - Panneau 4 : Graphe latence p50/p95/p99 dans le temps

C'est le panneau le plus parlant pour spotter un incident.

1. Add > Visualization
2. Visualisation : **Time series** (par défaut)
3. Cette fois on va mettre **3 requêtes** (une par percentile). En bas de la zone Queries, clique sur **+ Add query** deux fois pour avoir A, B, C.
4. Dans **A** (Code) :
   ```
   histogram_quantile(0.50, sum by (le) (rate(http_request_duration_seconds_bucket[1m]))) * 1000
   ```
   Dans le champ "Legend" en dessous : `p50`
5. Dans **B** :
   ```
   histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[1m]))) * 1000
   ```
   Legend : `p95`
6. Dans **C** :
   ```
   histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[1m]))) * 1000
   ```
   Legend : `p99`
7. **Title** : `Latence par percentile`
8. **Unit** : Milliseconds (ms)

Apply.

**À vérifier** : tu vois 3 courbes superposées. p50 (en bas) < p95 (au milieu) < p99 (en haut). Quand un incident frappe, c'est le p99 qui bouge en premier.

### Étape 3.6 - Panneau 5 : Trafic par status code

1. Add > Visualization
2. Time series
3. Requête :
   ```
   sum by (status) (rate(http_requests_total[1m]))
   ```
4. **Title** : `Trafic par status code (req/s)`
5. **Unit** : tape "request" et choisis "Requests/sec"
6. À droite, dans **Graph styles**, change "Stack series" en **Normal** pour empiler les courbes.

Apply.

### Étape 3.7 - Panneau 6 : Utilisateurs actifs

1. Add > Visualization
2. Visualisation : **Gauge**
3. Requête :
   ```
   paleonis_active_users
   ```
4. **Title** : `Utilisateurs actifs`
5. **Min** : 0
6. **Max** : 150
7. **Thresholds** : laisse les valeurs par défaut (vert/orange/rouge automatiques)

Apply.

### Étape 3.8 - Organiser le dashboard

Sur le dashboard, tu peux :
- Glisser-déposer les panneaux pour les réorganiser
- Redimensionner en tirant le coin inférieur droit de chaque panneau

**Disposition recommandée** (3 colonnes, 2 lignes) :

```
+----------------+----------------+----------------+
| Disponibilite  | Erreur 5xx     | Latence p95    |
| (single stat)  | (single stat)  | (single stat)  |
+----------------+----------------+----------------+
| Latence p50/p95/p99 (graphe sur toute la largeur)|
+--------------------------------+-----------------+
| Trafic par status              | Users actifs    |
+--------------------------------+-----------------+
```

### Étape 3.9 - Configurer le rafraîchissement automatique

En haut à droite du dashboard :
- Sélectionne la plage temporelle : **Last 15 minutes**
- À côté, le menu de rafraîchissement : choisis **5s**

Le dashboard se met à jour tout seul toutes les 5 secondes.

### Étape 3.10 - Sauvegarder le dashboard

En haut à droite, clique sur l'icône disquette **Save dashboard** :

- **Title** : `QoS PaLeonis`
- **Folder** : laisse "General"
- Clique sur **Save**

### Récap TP3

Tu as un dashboard opérationnel avec 6 panneaux. Tu sais :

- Créer un dashboard et ajouter des panneaux
- Configurer single stat / time series / gauge
- Définir des seuils colorés (feux tricolores)
- Sauvegarder

> **Pour aller plus loin (optionnel)**
> Tu peux exporter ton dashboard en JSON : settings (icône engrenage) > JSON Model. Pratique pour le partager avec un collègue ou le mettre dans un repo Git.


---

## 7. TP4 - Simuler des incidents et Error Budget

**Durée estimée : 1h**

### Objectif

Mettre en pratique les concepts de MTBF, MTTR, Error Budget et SLO en provoquant volontairement des incidents sur l'app PaLeonis et en observant la réaction du dashboard.

### Préparation

Garde ouverts en parallèle :
- Le dashboard QoS PaLeonis dans Grafana (rafraîchissement 5s)
- Un terminal pour lancer les commandes chaos
- Le terminal qui fait tourner le script de trafic (depuis le setup)

Avant de commencer, remets tout à zéro :

```bash
./scripts/chaos-scenarios.sh reset
```

Vérifie l'état :

```bash
./scripts/chaos-scenarios.sh status
```

Tu dois voir :

```json
{
  "errorRate": 0,
  "extraLatencyMs": 0,
  "isDown": false
}
```

---

### Étape 4.1 - Baseline propre (5 min)

Avant tout incident, observe ton dashboard pendant 2-3 minutes pour avoir une "baseline" : c'est le comportement normal du système.

**À noter dans un fichier observations.md** :

```
Baseline (avant incident) :
- Disponibilite : ____%
- Latence p95 : ____ ms
- Taux erreur 5xx : ____%
- Debit : ____ req/s
```

Cette baseline sert de référence pour mesurer l'impact de chaque incident.

### Étape 4.2 - Incident 1 : Performance dégradée (10 min)

Scénario : "L'app devient lente, +1500ms de latence sur toutes les requêtes."

Lance l'incident :

```bash
./scripts/chaos-scenarios.sh latency 1500
```

Observe ton dashboard pendant 1 minute.

**À constater** :

| KPI | Avant | Après |
|-----|-------|-------|
| Disponibilité | 100% | toujours 100% (l'app répond, juste lentement) |
| Latence p95 | ~30 ms | ~1500-1800 ms |
| Taux d'erreur 5xx | 0% | toujours 0% |

**Question 1** : Quelle dimension de la QoS est touchée ? (Réponse : Performance. Pas Disponibilité, pas Fiabilité.)

**Question 2** : Si ton SLO de latence est "p95 < 500ms 99,9% du temps", combien de temps avant que tu sois en violation de SLO ?

> **Le piège classique du monitoring naïf**
> Si tu n'avais monitoré QUE la disponibilité (par exemple avec un simple `curl /health` toutes les minutes), tu aurais dit "tout va bien". Pourtant le service est inutilisable. C'est exactement la dimension Performance vs Disponibilité du cours.

Remets à zéro :

```bash
./scripts/chaos-scenarios.sh reset
```

### Étape 4.3 - Incident 2 : Fiabilité dégradée (10 min)

Scénario : "Une requête sur cinq échoue avec un 500 (cas du Mercredi de ShopFast vu en cours)."

Lance l'incident :

```bash
./scripts/chaos-scenarios.sh error 0.2
```

Observe ton dashboard.

**À constater** :

| KPI | Avant | Après |
|-----|-------|-------|
| Disponibilité | 100% | toujours 100% (app UP, mais erreurs métier) |
| Latence p95 | normale | normale |
| Taux d'erreur 5xx | 0% | environ 20% |

**Question** : `up{job="paleonis-api"}` vaut combien pendant cet incident ?

> **Réponse** : 1. Parce que `/metrics` répond toujours, donc Prometheus arrive à scraper. C'est pourquoi `up` seul ne suffit jamais à mesurer la qualité de service réelle. Il faut le combiner avec le taux d'erreur.

**Calcul** : si cet incident dure 30 minutes, combien de "minutes équivalentes d'indisponibilité" est-ce que ça représente du point de vue utilisateur ?

> **Élément de réponse** : 20% de 30 min = 6 minutes pendant lesquelles 1 utilisateur sur 5 voyait une erreur. Selon comment tu définis "indispo utilisateur", ça consomme entre 6 min et 30 min d'Error Budget.

Remets à zéro :

```bash
./scripts/chaos-scenarios.sh reset
```

### Étape 4.4 - Incident 3 : Panne totale (10 min)

Scénario : "L'app est en panne complète (cas du Lundi de ShopFast)."

Lance l'incident :

```bash
./scripts/chaos-scenarios.sh down
```

Observe.

**À constater** :

| KPI | Avant | Après |
|-----|-------|-------|
| Disponibilité (`up`) | 100% | toujours 100% (sic) |
| Taux d'erreur 5xx | 0% | environ 100% (toutes les requêtes métier renvoient 503) |
| Latence p95 | normale | très basse (les 503 sortent vite) |

**Discussion importante** : pourquoi `up` reste à 1 alors que l'app est "en panne" ?

> **Réponse** : parce qu'on a codé l'app pour que `/metrics` continue à répondre. C'est volontaire (et réaliste) : la plupart des frameworks de monitoring exposent `/metrics` même quand le métier est cassé. Pour mesurer une vraie indisponibilité utilisateur, il faut soit :
> - Faire un check applicatif sur une vraie route métier (avec un Blackbox Exporter)
> - Calculer un SLI métier basé sur le taux de réussite : `(2xx + 3xx + 4xx) / total` (les 4xx sont des erreurs côté client, donc l'app fonctionne)

Remets en route :

```bash
./scripts/chaos-scenarios.sh up
```

### Étape 4.5 - Incident 4 : Dégradation progressive (10 min)

Le scénario le plus réaliste : la latence monte tout doucement (comme une fuite mémoire ou une saturation BD).

```bash
./scripts/chaos-scenarios.sh degradation
```

La latence va monter de 200ms toutes les 5 secondes, jusqu'à atteindre ~2400ms. Pendant 60 secondes, observe le panneau "Latence par percentile" : tu vas voir une rampe progressive.

**Question** : à quel moment franchirait-on un seuil d'alerte fixé à "p95 > 500ms" ? (Approximativement après 12-15 secondes.)

**Question** : est-ce qu'un seuil sur le p99 alerterait avant ou après le p95 ? Pourquoi ? (Avant, parce que p99 monte plus vite que p95 sur une dégradation.)

Reset à la fin :

```bash
./scripts/chaos-scenarios.sh reset
```

### Étape 4.6 - Calcul de l'Error Budget consommé

Récapitule sur papier ou dans ton fichier observations :

```
Incidents declenches pendant la seance :
- Incident 1 (perf, latence 1500ms) : ~3 minutes
- Incident 2 (fiab, 20% erreurs)    : ~3 minutes
- Incident 3 (panne totale)         : ~3 minutes
- Incident 4 (degradation)          : ~1 minute

Hypothese : SLO = 99,9% sur 30 jours.
Error Budget mensuel = 30j x 24h x 60min x 0,001 = 43,2 minutes

Si on considere que la disponibilite "utilisateur" = 0
pendant les incidents 1, 2, 3, 4 :
Total consomme ce mois (pour l'instant) = ~10 minutes
Restant = 43,2 - 10 = 33,2 minutes (76% du budget)

Decision : on autorise les deploiements ? OUI, on a encore 76% du budget.
```

> **Pourquoi c'est important**
> L'Error Budget transforme une question politique ("on déploie ou pas ?") en une décision data-driven ("il reste X% du budget, donc oui/non"). C'est exactement ce qu'on a vu au chapitre 10 du cours.

### Bonus - Configurer une alerte Prometheus (15 min, pour les rapides)

Crée un fichier `prometheus/alerts.yml` :

```yaml
groups:
  - name: paleonis-alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[1m]))
          / sum(rate(http_requests_total[1m]))
          > 0.05
        for: 30s
        labels:
          severity: warning
        annotations:
          summary: "Taux d erreur 5xx superieur a 5%"
          description: "Le taux d erreur 5xx est de {{ $value | humanizePercentage }} depuis 30s"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.95,
            sum by (le) (rate(http_request_duration_seconds_bucket[1m]))
          ) > 1
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Latence p95 superieure a 1s"
```
Modifie `docker-compose.yml` pour charger en volume ce fichier : 

```yaml
prometheus:
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/alerts.yml:/etc/prometheus/alerts.yml   # <— ajoute ça
```

Modifie `prometheus/prometheus.yml` pour charger ce fichier d'alertes en ajoutant tout en haut, après `global:`, avec son chemin absolu déclaré dans le `docker-compose.yml` :

```yaml
rule_files:
  - '/etc/prometheus/alerts.yml'
```

Recharge Prometheus :

```bash
docker compose restart prometheus
```

Si ça ne fonctionne pas et que tes alertes ne sont pas prises en compte, un simple reload ne suffira pas, alors : 
```bash
docker compose up -d --force-recreate prometheus
```

Pour confirmer : 
```bash
docker compose exec prometheus ls -l /etc/prometheus   # alerts.yml est-il là ?
docker compose exec prometheus promtool check config /etc/prometheus/prometheus.yml
docker compose logs prometheus | grep -i rule
```

Va dans Prometheus > Alerts. Tu vois maintenant 2 alertes en état "Inactive". Active un incident :

```bash
./scripts/chaos-scenarios.sh error 0.2
```

Attends 30 secondes puis rafraîchis l'onglet Alerts. L'alerte `HighErrorRate` doit passer en "Pending" puis "Firing".

### Récap TP4

Tu as :

- Provoqué et observé 4 types d'incidents
- Compris pourquoi `up` seul est insuffisant
- Calculé une consommation d'Error Budget
- (Bonus) Configuré une alerte Prometheus


---

## 8. TP noté - Reproduire un dashboard cible

**Durée : 1h - travail individuel**

### Consignes

Le formateur va te fournir une capture d'écran d'un dashboard cible. Tu dois le reproduire en partant de zéro (crée un nouveau dashboard, ne modifie pas celui du TP3).

### Critères d'évaluation

| Critère | Points |
|---------|--------|
| Le dashboard contient le bon nombre de panneaux | 2 |
| Chaque panneau utilise la bonne visualisation (stat / time series / gauge / etc.) | 4 |
| Les requêtes PromQL renvoient le bon résultat | 6 |
| Les unités sont correctes (%, ms, req/s) | 2 |
| Les seuils colorés sont configurés | 3 |
| La disposition correspond à la cible | 2 |
| Le titre du dashboard est correct | 1 |
| **Total** | **20** |

### Comment rendre

À la fin de l'heure :

1. Sauvegarde ton dashboard dans Grafana
2. Va dans **Settings** (icône engrenage en haut à droite) > **JSON Model**
3. Copie tout le contenu JSON
4. Colle-le dans un fichier `<ton-nom>-dashboard.json`
5. Envoie le fichier au formateur (méthode indiquée par le formateur : email, dépôt, etc.)

### Astuces pour bien réussir

- **Lis bien la capture cible avant de commencer**. Note le nombre de panneaux, les visualisations utilisées, les couleurs, les unités.
- **Reprends tes requêtes du TP2**. Tu n'as pas besoin de les réécrire de zéro.
- **Configure les seuils dès la création du panneau**, c'est plus rapide que d'y revenir.
- **Garde le dashboard du TP3 ouvert dans un autre onglet** comme référence.
- **Sauvegarde régulièrement** (Ctrl+S ou icône disquette) pendant que tu travailles.

---

## 9. FAQ - Problèmes fréquents

### Setup Docker

**"docker compose up" me dit "Cannot connect to the Docker daemon"**

Docker Desktop n'est pas lancé (Windows/Mac) ou le service docker n'est pas démarré (Linux).
- Windows/Mac : ouvre Docker Desktop, attends que l'icône passe au vert.
- Linux : `sudo systemctl start docker`

**"Port is already allocated" ou "address already in use"**

Un autre programme utilise déjà le port 3000, 9090 ou 3001. Soit tu fermes ce programme, soit tu modifies le `docker-compose.yml` pour mapper un autre port. Par exemple, change `"3000:3000"` en `"3010:3000"` puis relance `docker compose up -d`. L'app sera alors sur http://localhost:3010.

**Le build de l'image Node prend une éternité**

Probablement à cause d'un proxy d'entreprise qui ralentit npm. Au pire, attends 5 minutes. Si ça échoue avec un timeout, essaie depuis un réseau différent (partage 4G du téléphone).

**"docker compose" me dit "command not found"**

Ta version de Docker est trop ancienne. Mets à jour Docker Desktop. Sur Linux ancien, utilise `docker-compose` (avec un tiret) à la place de `docker compose`.

### Prometheus

**Dans Targets, "paleonis-api" est DOWN**

1. Vérifie que l'app tourne : `curl http://localhost:3000/health`
2. Si oui, regarde les logs : `docker compose logs prometheus`
3. Cherche un message d'erreur du type "connection refused" : c'est probablement un problème de réseau Docker. Relance tout : `docker compose down && docker compose up -d`

**Mes requêtes PromQL renvoient "Empty query result"**

C'est normal s'il n'y a pas de données correspondant à ta requête. Par exemple, le taux d'erreur 5xx est vide tant qu'il n'y a pas eu d'erreur. Lance le générateur de trafic et déclenche un incident pour avoir des données.

**Mes requêtes PromQL renvoient une erreur de syntaxe**

Lis le message d'erreur, il est généralement précis. Erreurs classiques :
- Oubli de parenthèses dans `histogram_quantile()`
- Manque de `sum by (le)` autour du `rate` quand on utilise `histogram_quantile`
- Typo dans un nom de label (`status` ≠ `Status`)

### Grafana

**Mon dashboard affiche "No data" partout**

1. Va dans Settings > Datasources, clique sur Prometheus, "Save & test". Ça doit dire "Successfully queried".
2. Vérifie que le générateur de trafic tourne (sinon il n'y a rien à mesurer).
3. Vérifie la plage temporelle en haut à droite : tu cherches peut-être les 7 derniers jours alors qu'on a démarré il y a 5 minutes. Mets "Last 15 minutes".

**Je ne trouve plus le mode "Code" pour la requête PromQL**

Dans la zone "Query" en bas du panneau, regarde à droite : il y a deux boutons "Builder" et "Code". Clique sur "Code".

**Les seuils ne colorent pas la valeur**

Dans la configuration du panneau, à droite, déroule la section "Stat styles" (ou "Standard options" selon la version). "Color mode" doit être sur "Value" pour colorer le chiffre, ou "Background" pour colorer tout le fond.

### Scripts

**`./scripts/simulate-traffic.sh: Permission denied`**

Sur Linux/Mac, rends le script exécutable :

```bash
chmod +x scripts/*.sh
```

**Sur Windows, je ne peux pas lancer les scripts .sh**

Utilise WSL ou Git Bash. Sinon, lance les commandes manuellement en PowerShell :

```powershell
# Trafic basique
while ($true) { 
  Invoke-WebRequest -UseBasicParsing http://localhost:3000/api/formations | Out-Null
  Start-Sleep -Milliseconds 200
}

# Injecter un incident
Invoke-WebRequest -Method POST -UseBasicParsing "http://localhost:3000/admin/error-rate?rate=0.2"

# Reset
Invoke-WebRequest -Method POST -UseBasicParsing "http://localhost:3000/admin/reset"
```

### Général

**Comment je redémarre tout proprement ?**

```bash
docker compose down       # arrête tout (les volumes Prometheus/Grafana sont gardés)
docker compose up -d      # relance tout
```

Si tu veux repartir de zéro, en perdant les données Prometheus et Grafana :

```bash
docker compose down -v    # le -v supprime aussi les volumes
docker compose up -d
```

**Comment je vois les logs d'un service ?**

```bash
docker compose logs app           # logs de l'app PaLeonis
docker compose logs prometheus    # logs de Prometheus
docker compose logs grafana       # logs de Grafana
docker compose logs -f app        # logs en temps réel (Ctrl+C pour quitter)
```

**Comment je rentre dans un conteneur pour debug ?**

```bash
docker compose exec app sh        # shell dans le conteneur de l'app
docker compose exec prometheus sh # shell dans Prometheus
```

**Je suis perdu, où je trouve les références ?**

- `README.md` - vue d'ensemble du projet
- `docs/ENDPOINTS.md` - tous les endpoints de l'app
- `docs/METRICS.md` - description des métriques
- `docs/PROMQL-CHEATSHEET.md` - aide-mémoire PromQL avec les calculs des KPI
- Ce guide - les étapes de la journée

---

## Ce que tu retiens à la fin de la journée

- La QoS se mesure, pas se devine. Sans monitoring, impossible de savoir si on respecte ses SLA.
- Prometheus collecte (PULL toutes les 5s), Grafana visualise. Cette séparation est saine.
- Les 4 KPI minimum à monitorer : disponibilité, latence p95, taux d'erreur, débit.
- `up` ne suffit pas pour mesurer la vraie disponibilité utilisateur.
- Un seuil bien choisi déclenche les alertes au bon moment, ni trop tôt (bruit) ni trop tard (sinistre).
- L'Error Budget transforme la conversation "déploiement vs stabilité" en décision rationnelle.

Bonne séance.

