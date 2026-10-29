// Showroom exhibits, shared by the 3D scene and the lite version (no three.js here).
// Generic, fictional exhibits (no manufacturer data). Names are product types only.
export const PRODUCTS = [
  // Windows wall (left)
  { id: 'tilt', type: 'tilt', wall: 'left', u: 3.9, w: 1.9, h: 2.1, b: 0.85, tag: 'Langai', name: 'Varstomas-verčiamas langas' },
  { id: 'slide', type: 'slide', wall: 'left', u: 6.9, w: 3.3, h: 2.4, b: 0.7, tag: 'Langai', name: 'Stumdoma langų sistema' },
  { id: 'fixed', type: 'fixed', wall: 'left', u: 9.95, w: 1.9, h: 2.1, b: 0.85, tag: 'Langai', name: 'Langas su varstomu viršlangiu' },
  // Doors wall (right)
  { id: 'french', type: 'french', wall: 'right', u: 2.1, w: 1.7, h: 2.4, b: 0, tag: 'Durys', name: 'Dvivėrės stiklinės durys' },
  { id: 'patio', type: 'patio', wall: 'right', u: 5.0, w: 2.6, h: 2.4, b: 0, tag: 'Durys', name: 'Terasos stumdomos durys' },
  { id: 'entry', type: 'door', wall: 'right', u: 8.1, w: 1.15, h: 2.35, b: 0, tag: 'Durys', name: 'Lauko durys' },
];
