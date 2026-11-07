/**
 * Prize catalogue used by the Live Draw.
 *
 * `drawOrder` runs smallest -> grandest so the 300sqm plot is drawn last (maximum suspense).
 * `quantity` is how many winners that prize can have. Edit and restart the server: the
 * catalogue is synced on boot and the `awarded` counters are never reset.
 */
export const PRIZES = [
  { key: 'clipper', name: 'Clipper', quantity: 1, drawOrder: 1 },
  { key: 'hair-dryer', name: 'Hair Dryer', quantity: 1, drawOrder: 2 },
  { key: 'power-banks', name: 'Power Banks', quantity: 1, drawOrder: 3 },
  { key: 'electric-kettle', name: 'Electric Kettle', quantity: 1, drawOrder: 4 },
  { key: 'iron', name: 'Iron', quantity: 1, drawOrder: 5 },
  { key: 'blender', name: 'Blender', quantity: 1, drawOrder: 6 },
  { key: 'microwave', name: 'Microwave', quantity: 1, drawOrder: 7 },
  { key: 'solar-fan', name: 'Solar Fan', quantity: 1, drawOrder: 8 },
  { key: 'tv-32', name: '32-inch TV', quantity: 1, drawOrder: 9 },
  { key: 'land-300sqm', name: '300sqm Area of Land', quantity: 1, drawOrder: 10, isGrand: true },
];
