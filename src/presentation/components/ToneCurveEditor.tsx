import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactElement } from 'react';
import type { PhotoProject } from '@/contexts/projects/domain/PhotoProject';
import {
  CurveChannel,
  ToneCurve,
  type CurveChannelPrimitive,
  type CurveInterpolationPrimitive,
  type ToneCurvePrimitives
} from '@/contexts/projects/domain/ToneCurve';

type DragState = { pointerId: number; pointIndex: number; groupId: string };
const channels: Array<{ value: CurveChannelPrimitive; label: string }> = [
  { value: 'rgb', label: 'RGB' },
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'luminance', label: 'Luma' }
];

export function ToneCurveEditor({ project, onChange }: {
  project: PhotoProject;
  onChange: (channel: CurveChannelPrimitive, curve: ToneCurvePrimitives | null, groupId: string | null) => void;
}): ReactElement {
  const graph = useRef<SVGSVGElement>(null);
  const drag = useRef<DragState | null>(null);
  const [channel, setChannel] = useState<CurveChannelPrimitive>('rgb');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const curve = project.getCurve(CurveChannel.fromPrimitives(channel))?.toPrimitives() ?? ToneCurve.identity().toPrimitives();
  const selected = curve.points[selectedIndex] ?? curve.points[0];

  const graphPoint = (event: { clientX: number; clientY: number }): { x: number; y: number } | null => {
    const bounds = graph.current?.getBoundingClientRect();
    if (bounds === undefined || bounds.width === 0 || bounds.height === 0) return null;
    return {
      x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      y: Math.min(1, Math.max(0, 1 - (event.clientY - bounds.top) / bounds.height))
    };
  };

  const movePoint = (index: number, x: number, y: number, groupId: string | null): void => {
    const latest = project.getCurve(CurveChannel.fromPrimitives(channel))?.toPrimitives() ?? ToneCurve.identity().toPrimitives();
    const point = latest.points[index];
    if (point === undefined) return;
    const previousX = latest.points[index - 1]?.x ?? 0;
    const nextX = latest.points[index + 1]?.x ?? 1;
    const nextPoints = latest.points.map((candidate, pointIndex) => pointIndex === index ? {
      x: index === 0 || index === latest.points.length - 1 ? candidate.x : Math.min(nextX - 0.001, Math.max(previousX + 0.001, x)),
      y: Math.min(1, Math.max(0, y))
    } : candidate);
    onChange(channel, { ...latest, points: nextPoints }, groupId);
  };

  const addPoint = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (event.detail < 2) return;
    const point = graphPoint(event);
    if (point === null || point.x <= 0 || point.x >= 1) return;
    const points = [...curve.points, point].sort((left, right) => left.x - right.x);
    const index = points.findIndex((candidate) => candidate === point);
    setSelectedIndex(index);
    onChange(channel, { ...curve, points }, null);
  };

  const beginDrag = (event: ReactPointerEvent<SVGCircleElement>, pointIndex: number): void => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, pointIndex, groupId: crypto.randomUUID() };
    setSelectedIndex(pointIndex);
  };

  const dragPoint = (event: ReactPointerEvent<SVGSVGElement>): void => {
    const active = drag.current;
    if (active?.pointerId !== event.pointerId) return;
    const point = graphPoint(event);
    if (point !== null) movePoint(active.pointIndex, point.x, point.y, active.groupId);
  };

  const endDrag = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  };

  const removeSelected = (): void => {
    if (selectedIndex === 0 || selectedIndex === curve.points.length - 1) return;
    onChange(channel, { ...curve, points: curve.points.filter((_, index) => index !== selectedIndex) }, null);
    setSelectedIndex(Math.max(0, selectedIndex - 1));
  };

  const changeInterpolation = (interpolation: CurveInterpolationPrimitive): void => onChange(channel, { ...curve, interpolation }, null);
  const reset = (): void => onChange(channel, channel === 'luminance' ? null : ToneCurve.identity().toPrimitives(), null);

  return (
    <div className="tone-curve-editor">
      <div className="curve-channel-tabs" role="tablist" aria-label="Tone curve channel">
        {channels.map((item) => <button role="tab" aria-selected={channel === item.value} className={channel === item.value ? 'active' : ''} type="button" key={item.value} onClick={() => { setChannel(item.value); setSelectedIndex(0); }}>{item.label}</button>)}
      </div>
      <svg
        ref={graph}
        className={`curve-graph channel-${channel}`}
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        aria-label={`${channel.toUpperCase()} tone curve. Double click to add a point.`}
        onPointerDown={addPoint}
        onPointerMove={dragPoint}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <path className="curve-grid" d="M0 .25H1 M0 .5H1 M0 .75H1 M.25 0V1 M.5 0V1 M.75 0V1" />
        <polyline className="curve-line" points={curve.points.map((point) => `${point.x},${1 - point.y}`).join(' ')} />
        {curve.points.map((point, index) => <circle className={index === selectedIndex ? 'selected' : ''} key={`${point.x}-${index}`} cx={point.x} cy={1 - point.y} r="0.025" tabIndex={0} aria-label={`Curve point ${index + 1}: x ${point.x}, y ${point.y}`} onPointerDown={(event) => beginDrag(event, index)} onFocus={() => setSelectedIndex(index)} />)}
      </svg>
      <div className="curve-point-values">
        <label>X <input aria-label="Curve point X" type="number" min={0} max={1} step={0.001} disabled={selectedIndex === 0 || selectedIndex === curve.points.length - 1} value={selected?.x ?? 0} onChange={(event) => movePoint(selectedIndex, event.currentTarget.valueAsNumber, selected?.y ?? 0, null)} /></label>
        <label>Y <input aria-label="Curve point Y" type="number" min={0} max={1} step={0.001} value={selected?.y ?? 0} onChange={(event) => movePoint(selectedIndex, selected?.x ?? 0, event.currentTarget.valueAsNumber, null)} /></label>
        <button type="button" disabled={selectedIndex === 0 || selectedIndex === curve.points.length - 1} onClick={removeSelected}>Remove point</button>
      </div>
      <div className="curve-footer">
        <select aria-label="Curve interpolation" value={curve.interpolation} onChange={(event) => changeInterpolation(event.target.value === 'linear' ? 'linear' : 'monotonic-cubic')}><option value="monotonic-cubic">Monotonic cubic</option><option value="linear">Linear</option></select>
        <button type="button" onClick={reset}>Reset channel</button>
      </div>
    </div>
  );
}
