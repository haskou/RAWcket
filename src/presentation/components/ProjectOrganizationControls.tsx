import { useState, type ReactElement } from 'react';
import type { PhotoProjectSummary } from '@/contexts/projects/domain/PhotoProjectSummary';

export function ProjectOrganizationControls({ project, onRate, onTags }: {
  project: PhotoProjectSummary;
  onRate: (rating: number) => void;
  onTags: (tags: string[]) => void;
}): ReactElement {
  const name = project.getName().valueOf();
  const rating = project.getRating().valueOf();
  const tags = project.getTags().getAll();
  const [editingTags, setEditingTags] = useState(false);
  const [tagDraft, setTagDraft] = useState('');

  const beginTagEdit = (): void => {
    setTagDraft(tags.map((tag) => tag.valueOf()).join(', '));
    setEditingTags(true);
  };

  const saveTags = (): void => {
    onTags(tagDraft.split(',').map((tag) => tag.trim()).filter((tag) => tag.length > 0));
    setEditingTags(false);
  };

  return <div className="project-organization" onClick={(event) => event.stopPropagation()}>
    <div className="project-rating" role="group" aria-label={`Rating for ${name}`}>
      {[1, 2, 3, 4, 5].map((value) => <button
        type="button"
        key={value}
        className={value <= rating ? 'rated' : ''}
        aria-label={`Rate ${name} ${value} ${value === 1 ? 'star' : 'stars'}`}
        aria-pressed={value === rating}
        onClick={() => onRate(value === rating ? 0 : value)}
      >★</button>)}
    </div>
    {!editingTags && <div className="project-tags">
      <div>{tags.length === 0 ? <small>No tags</small> : tags.map((tag) => <span key={tag.valueOf()}>{tag.valueOf()}</span>)}</div>
      <button type="button" onClick={beginTagEdit}>Edit tags</button>
    </div>}
    {editingTags && <div className="project-tag-editor">
      <label htmlFor={`tags-${project.getId().valueOf()}`}>Comma-separated tags</label>
      <input id={`tags-${project.getId().valueOf()}`} value={tagDraft} maxLength={200} onChange={(event) => setTagDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveTags(); if (event.key === 'Escape') setEditingTags(false); }} />
      <button type="button" onClick={() => setEditingTags(false)}>Cancel</button>
      <button type="button" onClick={saveTags}>Save tags</button>
    </div>}
  </div>;
}
