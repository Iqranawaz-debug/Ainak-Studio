// The product details for each frame, shown in the collection and its details drawer.
//   style: the category tag on the card
//   tags: everything else this frame can be found by, in the filters and in search
//   description: one short line for the details drawer
//   lensType, lensTint and finish: what the frame comes with, until someone makes their own choice
const CLEAR = { lensType: 'clear', lensTint: 'neutral' }
const SUNGLASS = { lensType: 'sunglass', lensTint: 'brown' }
const GLOSSY = { finish: 'glossy' }
const METALLIC = { finish: 'metallic' }

export const frameCatalog = {
  round: { style: 'Round', tags: ['Round'], description: 'A fine metal circle with a keyhole bridge, for a soft and bookish look.', ...CLEAR, ...METALLIC },
  square: { style: 'Square', tags: ['Square'], description: 'Clean squared lenses with softened corners, in a slim acetate rim.', ...CLEAR, ...GLOSSY },
  aviator: { style: 'Sunglasses', tags: ['Sunglasses'], description: 'Teardrop lenses and a double bridge in slim metal.', ...SUNGLASS, ...METALLIC },
  catEye: { style: 'Cat-eye', tags: ['Cat-eye'], description: 'Lenses that sweep up to a point at the outer corners, in slim acetate.', ...CLEAR, ...GLOSSY },

  'real-round': { style: 'Round', tags: ['Round'], description: 'Generous round lenses in a bold rim, with a sculpted bridge.', ...CLEAR, ...GLOSSY },
  'real-square': { style: 'Square', tags: ['Square'], description: 'A strong squared shape with riveted corners and a straight bridge.', ...CLEAR, ...GLOSSY },
  'real-rectangle': { style: 'Square', tags: ['Square', 'Rectangle'], description: 'Long, shallow lenses with a heavy brow and a fine lower rim.', ...CLEAR, ...GLOSSY },
  'real-wayfarer': { style: 'Square', tags: ['Square'], description: 'The familiar thick-rimmed shape, with slim detail at the outer corners.', ...CLEAR, ...GLOSSY },
  'real-aviator': { style: 'Sunglasses', tags: ['Sunglasses'], description: 'Wide teardrop sunglasses with a top bar, in slim dark red metal.', ...SUNGLASS, ...METALLIC },
  'real-cat-eye': { style: 'Cat-eye', tags: ['Cat-eye'], description: 'A dramatic upswept shape with a thick, sweeping rim.', ...CLEAR, ...GLOSSY },
  'real-oversized': { style: 'Cat-eye', tags: ['Cat-eye', 'Oversized'], description: 'Large butterfly lenses in a rounded rim, the widest shape here.', ...CLEAR, ...GLOSSY },
  'real-tinted': { style: 'Sunglasses', tags: ['Sunglasses', 'Square'], description: 'Long, shallow lenses with a light tint, for a sporty look.', lensType: 'light', lensTint: 'green', ...GLOSSY },
}

// The category filters. Group filters match a frame's group in the panel, and the rest match its tags.
export const catalogFilters = ['Classic', 'More styles', 'Sunglasses', 'Cat-eye', 'Round', 'Square']
