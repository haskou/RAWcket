import { LocalDevelopmentTutor } from '@/contexts/projects/infrastructure/advisors/LocalDevelopmentTutor';

describe('LocalDevelopmentTutor', () => {
  const tutor = new LocalDevelopmentTutor();

  it('explains measured clipping and links it to light controls', () => {
    const guidance = tutor.review({
      highlightClipping: 0.024,
      shadowClipping: 0.003,
      adjustments: {}
    });

    expect(guidance).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Highlights touch the output ceiling', severity: 'warning', targetPanel: 'light' }),
      expect.objectContaining({ title: 'Some shadows have no output detail', targetPanel: 'light' })
    ]));
    expect(guidance[0]?.evidence).toContain('2.4%');
  });

  it('distinguishes suggestions inferred from the current recipe', () => {
    const guidance = tutor.review({
      highlightClipping: 0,
      shadowClipping: 0,
      adjustments: { shadows: 60, noiseReduction: 0, clarity: 50, sharpness: 60 }
    });

    expect(guidance).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'suggestion', title: 'Lifted shadows may reveal noise' }),
      expect.objectContaining({ kind: 'suggestion', title: 'Strong edge treatments can compound' })
    ]));
  });

  it('states when there is no material technical warning without prescribing an aesthetic', () => {
    expect(tutor.review({ highlightClipping: 0, shadowClipping: 0, adjustments: {} })).toEqual([
      expect.objectContaining({ severity: 'neutral', targetPanel: 'curves' })
    ]);
  });
});
