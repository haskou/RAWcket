import type { ReactElement } from 'react';
import type { ReviewedImportCandidate } from '@/contexts/projects/application/review-import-candidates/ReviewImportCandidates';
import { useObjectUrl } from '../hooks/useObjectUrl';

export function ImportSelectionDialog({ candidates, selected, onSelect, onCancel, onContinue }: {
  candidates: ReviewedImportCandidate[];
  selected: number;
  onSelect: (index: number) => void;
  onCancel: () => void;
  onContinue: () => void;
}): ReactElement {
  return <div className="dialog-backdrop" role="presentation" onMouseDown={onCancel}>
    <section className="dialog import-selection-dialog" role="dialog" aria-modal="true" aria-labelledby="import-selection-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="dialog-heading"><div><span className="eyebrow">AI Companion contact sheet</span><h2 id="import-selection-title">Choose the strongest photograph</h2></div><button className="icon-button" type="button" onClick={onCancel} aria-label="Close photo selection">×</button></div>
      <p className="muted">OpenAI compared reduced previews by what each photograph could become after editing: usable focus, crop and reframing options, recoverable light and color, visual interest, and story. The recommendation is advisory; you choose the original.</p>
      <div className="import-candidate-grid">
        {candidates.map((candidate, index) => <CandidateCard candidate={candidate} index={index} selected={selected === index} onSelect={() => onSelect(index)} key={`${candidate.file.name}-${index}`} />)}
      </div>
      <div className="dialog-actions"><button className="button ghost" type="button" onClick={onCancel}>Cancel</button><button className="button primary" type="button" onClick={onContinue}>Continue with {candidates[selected]?.file.name ?? 'selection'}</button></div>
    </section>
  </div>;
}

function CandidateCard({ candidate, index, selected, onSelect }: {
  candidate: ReviewedImportCandidate;
  index: number;
  selected: boolean;
  onSelect: () => void;
}): ReactElement {
  const previewUrl = useObjectUrl(candidate.preview);
  return <button className={`import-candidate ${selected ? 'selected' : ''}`} type="button" aria-pressed={selected} onClick={onSelect}>
    <div>{previewUrl !== null && <img src={previewUrl} alt="" />}<span>{index === 0 ? 'Recommended' : `Score ${candidate.score}`}</span></div>
    <strong>{candidate.file.name}</strong>
    <small>{candidate.score}/100</small>
    <ul>{candidate.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
    <dl className="candidate-evaluation">
      <div><dt>Focus</dt><dd>{candidate.evaluation.focusPotential}</dd></div>
      <div><dt>Reframing</dt><dd>{candidate.evaluation.reframingPotential}</dd></div>
      <div><dt>Edit potential</dt><dd>{candidate.evaluation.editingPotential}</dd></div>
      <div><dt>Interest</dt><dd>{candidate.evaluation.visualInterest}</dd></div>
      <div><dt>Story</dt><dd>{candidate.evaluation.story}</dd></div>
    </dl>
  </button>;
}
