export type DevelopmentTutorPanel = 'light' | 'color' | 'detail' | 'curves';

export type DevelopmentTutorContext = {
  shadowClipping: number;
  highlightClipping: number;
  adjustments: Record<string, number>;
};

export type DevelopmentGuidanceItem = {
  kind: 'measurement' | 'suggestion';
  severity: 'neutral' | 'notice' | 'warning';
  title: string;
  detail: string;
  evidence: string;
  targetPanel: DevelopmentTutorPanel;
};

export interface DevelopmentTutor {
  review(context: DevelopmentTutorContext): DevelopmentGuidanceItem[];
}
