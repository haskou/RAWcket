import type { ReactElement } from 'react';
import type { PreviewAnalysis } from '@/contexts/projects/application/ports/PreviewRenderer';

export function HistogramPanel({ analysis }: { analysis: PreviewAnalysis | null }): ReactElement {
  return (
    <section className="histogram-panel" aria-label="Rendered frame histogram">
      <div className="histogram-heading"><span>Histogram</span><small>Rendered frame</small></div>
      {analysis === null ? <div className="histogram-loading">Measuring light and color…</div> : (
        <>
          <svg viewBox="0 0 64 1" preserveAspectRatio="none" aria-label="RGB and luminance histogram">
            <HistogramArea values={analysis.luminance} className="luminance" />
            <HistogramArea values={analysis.red} className="red" />
            <HistogramArea values={analysis.green} className="green" />
            <HistogramArea values={analysis.blue} className="blue" />
          </svg>
          <div className="clipping-readout">
            <span><i className={analysis.shadowClipping > 0.001 ? 'warning' : ''} /> Shadows {formatPercentage(analysis.shadowClipping)}</span>
            <span><i className={analysis.highlightClipping > 0.001 ? 'warning' : ''} /> Highlights {formatPercentage(analysis.highlightClipping)}</span>
          </div>
        </>
      )}
    </section>
  );
}

function HistogramArea({ values, className }: { values: number[]; className: string }): ReactElement {
  const points = [`0,1`, ...values.map((value, index) => `${index + 0.5},${1 - value}`), '64,1'].join(' ');
  return <polygon className={className} points={points} />;
}

function formatPercentage(value: number): string {
  if (value === 0) return '0%';
  if (value < 0.001) return '<0.1%';
  return `${(value * 100).toFixed(1)}%`;
}
