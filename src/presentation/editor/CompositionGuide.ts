export const compositionGuides = ['none', 'thirds', 'grid', 'diagonals', 'golden-ratio'] as const;
export type CompositionGuide = (typeof compositionGuides)[number];
