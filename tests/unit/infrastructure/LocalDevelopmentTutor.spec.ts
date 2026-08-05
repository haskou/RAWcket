import { LocalDevelopmentTutor } from '@/contexts/projects/infrastructure/advisors/LocalDevelopmentTutor';

describe('LocalDevelopmentTutor', () => {
  const tutor = new LocalDevelopmentTutor();

  it('explains measured clipping and links it to light controls', () => {
    const guidance = tutor.review({
      highlightClipping: 0.09,
      shadowClipping: 0.06,
      adjustments: {}
    });

    expect(guidance).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Highlights touch the output ceiling', severity: 'warning', targetPanel: 'light' }),
      expect.objectContaining({ title: 'Some shadows have no output detail', targetPanel: 'light' })
    ]));
    expect(guidance[0]?.evidence).toContain('9.0%');
  });

  it('distinguishes suggestions inferred from the current recipe', () => {
    const guidance = tutor.review({
      highlightClipping: 0,
      shadowClipping: 0,
      adjustments: { shadows: 70, noiseReduction: 0, clarity: 70, sharpness: 80 }
    });

    expect(guidance).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'suggestion', title: 'Lifted shadows may reveal noise' }),
      expect.objectContaining({ kind: 'suggestion', title: 'Strong edge treatments can compound' })
    ]));
  });

  it('stays quiet when there is no material technical warning', () => {
    expect(tutor.review({ highlightClipping: 0, shadowClipping: 0, adjustments: {} })).toEqual([]);
  });
});
