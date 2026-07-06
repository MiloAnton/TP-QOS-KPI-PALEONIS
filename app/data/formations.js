// Catalogue des formations PaLeonis (donnees fictives, fideles au scenario)

const formations = [
  {
    id: 'qvt-01',
    titre: 'Qualite de Vie au Travail - fondamentaux',
    duree: '2 jours',
    prix: 850,
    placesDisponibles: 12,
    theme: 'QVT',
  },
  {
    id: 'apa-01',
    titre: 'Activite Physique Adaptee en entreprise',
    duree: '3 jours',
    prix: 1200,
    placesDisponibles: 8,
    theme: 'APA',
  },
  {
    id: 'mental-01',
    titre: 'Preparation mentale - perfectionnement',
    duree: '5 jours',
    prix: 2400,
    placesDisponibles: 6,
    theme: 'Preparation mentale',
  },
  {
    id: 'sst-01',
    titre: 'Sauveteur Secouriste du Travail (SST)',
    duree: '2 jours',
    prix: 450,
    placesDisponibles: 15,
    theme: 'Secourisme',
  },
  {
    id: 'sst-mac',
    titre: 'SST - Maintien et Actualisation des Competences',
    duree: '1 jour',
    prix: 250,
    placesDisponibles: 20,
    theme: 'Secourisme',
  },
  {
    id: 'incendie-01',
    titre: 'Equipier de premiere intervention incendie',
    duree: '1 jour',
    prix: 320,
    placesDisponibles: 10,
    theme: 'Securite incendie',
  },
];

module.exports = { formations };
