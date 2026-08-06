import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactElement } from 'react';
import type { PreviewAnalysis } from '@/contexts/projects/application/ports/PreviewRenderer';
import {
  ToneCurve,
  type CurveChannelPrimitive,
  type CurveSetPrimitives,
  type CurveInterpolationPrimitive,
  type ToneCurvePrimitives
} from '@/contexts/projects/domain/ToneCurve';
import { ToneCurvePathProjector } from '../editor/ToneCurvePathProjector';

type DragState = { pointerId: number; pointIndex: number; groupId: string };
const channels: Array<{ value: CurveChannelPrimitive; label: string }> = [
  { value: 'rgb', label: 'RGB' },
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'luminance', label: 'Luma' }
];

export function ToneCurveEditor({ curves, analysis, onChange }: {
  curves: CurveSetPrimitives;
  analysis: PreviewAnalysis | null;
  onChange: (channel: CurveChannelPrimitive, curve: ToneCurvePrimitives | null, groupId: string | null) => void;
}): ReactElement {
  const graph = useRef<SVGSVGElement>(null);
  const drag = useRef<DragState | null>(null);
  const keyboardGroup = useRef<string | null>(null);
  const [channel, setChannel] = useState<CurveChannelPrimitive>('rgb');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [copiedCurve, setCopiedCurve] = useState<ToneCurvePrimitives | null>(null);
  const [copiedChannel, setCopiedChannel] = useState<CurveChannelPrimitive | null>(null);
  const curve = curveForChannel(curves, channel);
  const selected = selectedIndex === null ? undefined : curve.points[selectedIndex];
  const identity = curve.points.length === 2
    && curve.points[0]?.x === 0 && curve.points[0].y === 0
    && curve.points[1]?.x === 1 && curve.points[1].y === 1;
  const selectedIsEndpoint = selectedIndex === 0 || selectedIndex === curve.points.length - 1;

  const graphPoint = (event: { clientX: number; clientY: number }): { x: number; y: number } | null => {
    const activeGraph = graph.current;
    const bounds = activeGraph?.getBoundingClientRect();
    if (bounds === undefined || bounds.width === 0 || bounds.height === 0) return null;
    const matrix = activeGraph?.getScreenCTM();
    if (matrix !== null && matrix !== undefined && typeof DOMPoint !== 'undefined') {
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      return {
        x: Math.min(1, Math.max(0, point.x)),
        y: Math.min(1, Math.max(0, 1 - point.y))
      };
    }
    return {
      x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      y: Math.min(1, Math.max(0, 1 - (event.clientY - bounds.top) / bounds.height))
    };
  };

  const movePoint = (index: number, x: number, y: number, groupId: string | null): void => {
    const latest = curveForChannel(curves, channel);
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

  const beginGraphDrag = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (event.target instanceof SVGCircleElement) return;
    const point = graphPoint(event);
    if (point === null || point.x <= 0 || point.x >= 1) return;
    const latest = curveForChannel(curves, channel);
    const points = [...latest.points, point].sort((left, right) => left.x - right.x);
    const index = points.findIndex((candidate) => candidate === point);
    const groupId = crypto.randomUUID();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, pointIndex: index, groupId };
    setSelectedIndex(index);
    onChange(channel, { ...latest, points }, groupId);
  };

  const beginDrag = (event: ReactPointerEvent<SVGCircleElement>, pointIndex: number): void => {
    event.stopPropagation();
    graph.current?.setPointerCapture(event.pointerId);
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
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const removeSelected = (): void => {
    if (selectedIndex === null || selectedIsEndpoint) return;
    onChange(channel, { ...curve, points: curve.points.filter((_, index) => index !== selectedIndex) }, null);
    setSelectedIndex(null);
  };

  const movePointWithKeyboard = (event: ReactKeyboardEvent<SVGCircleElement>, pointIndex: number): void => {
    const point = curve.points[pointIndex];
    if (point === undefined) return;
    if ((event.key === 'Delete' || event.key === 'Backspace') && pointIndex !== 0 && pointIndex !== curve.points.length - 1) {
      event.preventDefault();
      setSelectedIndex(pointIndex);
      onChange(channel, { ...curve, points: curve.points.filter((_, index) => index !== pointIndex) }, null);
      setSelectedIndex(null);
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    setSelectedIndex(pointIndex);
    keyboardGroup.current ??= crypto.randomUUID();
    const step = event.shiftKey ? 0.01 : 0.001;
    const x = point.x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0);
    const y = point.y + (event.key === 'ArrowDown' ? -step : event.key === 'ArrowUp' ? step : 0);
    movePoint(pointIndex, x, y, keyboardGroup.current);
  };

  const changeInterpolation = (interpolation: CurveInterpolationPrimitive): void => onChange(channel, { ...curve, interpolation }, null);
  const copyChannel = (): void => {
    setCopiedCurve(ToneCurve.fromPrimitives(curve).toPrimitives());
    setCopiedChannel(channel);
  };
  const pasteChannel = (): void => {
    if (copiedCurve === null) return;
    onChange(channel, ToneCurve.fromPrimitives(copiedCurve).toPrimitives(), null);
    setSelectedIndex(null);
  };
  const reset = (): void => {
    onChange(channel, channel === 'luminance' ? null : ToneCurve.identity().toPrimitives(), null);
    setSelectedIndex(null);
  };

  return (
    <div className="tone-curve-editor">
      <div className="curve-channel-tabs" role="tablist" aria-label="Tone curve channel">
        {channels.map((item) => <button role="tab" aria-selected={channel === item.value} className={channel === item.value ? 'active' : ''} type="button" key={item.value} onClick={() => { setChannel(item.value); setSelectedIndex(null); }}>{item.label}</button>)}
      </div>
      <svg
        ref={graph}
        className={`curve-graph channel-${channel}`}
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        aria-label={`${channel.toUpperCase()} tone curve. Click or drag to add a point.`}
        onPointerDown={beginGraphDrag}
        onPointerMove={dragPoint}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <CurveHistogramBackdrop analysis={analysis} channel={channel} />
        <path className="curve-grid" d="M0 .25H1 M0 .5H1 M0 .75H1 M.25 0V1 M.5 0V1 M.75 0V1" />
        <path className="curve-line-underlay" d={ToneCurvePathProjector.project(curve)} />
        <path className={`curve-line${identity ? ' identity' : ''}`} d={ToneCurvePathProjector.project(curve)} />
        {!identity && curve.points.map((point, index) => <circle className={index === selectedIndex ? 'selected' : ''} key={index} cx={point.x} cy={1 - point.y} r="0.022" tabIndex={0} role="button" aria-describedby="curve-keyboard-help" aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Delete Backspace" aria-label={`Curve point ${index + 1}: x ${point.x}, y ${point.y}`} onPointerDown={(event) => beginDrag(event, index)} onFocus={() => setSelectedIndex(index)} onBlur={() => { keyboardGroup.current = null; }} onKeyDown={(event) => movePointWithKeyboard(event, index)} onKeyUp={() => { keyboardGroup.current = null; }} />)}
      </svg>
      <div className="curve-tonal-scale" aria-label="Tone ranges from input black to input white"><span>Blacks</span><span>Shadows</span><span>Midtones</span><span>Highlights</span><span>Whites</span></div>
      <div className="curve-axis-labels"><span>Output (Y)</span><span>Input (X)</span></div>
      <p className="curve-interaction-hint" id="curve-keyboard-help">Click or drag to create a point. Focus one and use the arrow keys for 0.001 steps, Shift + arrow for 0.01, or Delete to remove it.</p>
      <p className="curve-selection-status" aria-live="polite">{selected === undefined ? 'Neutral curve · no control point selected' : `Control point ${selectedIndex === null ? '' : selectedIndex + 1} selected`}</p>
      <div className="curve-point-values">
        <label>X <input aria-label="Curve point X" type="number" min={0} max={1} step={0.001} disabled={selected === undefined || selectedIsEndpoint} value={selected?.x ?? ''} onChange={(event) => { if (selectedIndex !== null) movePoint(selectedIndex, event.currentTarget.valueAsNumber, selected?.y ?? 0, null); }} /></label>
        <label>Y <input aria-label="Curve point Y" type="number" min={0} max={1} step={0.001} disabled={selected === undefined} value={selected?.y ?? ''} onChange={(event) => { if (selectedIndex !== null) movePoint(selectedIndex, selected?.x ?? 0, event.currentTarget.valueAsNumber, null); }} /></label>
        <button type="button" disabled={selected === undefined || selectedIsEndpoint} onClick={removeSelected}>Remove point</button>
      </div>
      <div className="curve-footer">
        <select aria-label="Curve interpolation" value={curve.interpolation} onChange={(event) => changeInterpolation(event.target.value === 'linear' ? 'linear' : 'monotonic-cubic')}><option value="monotonic-cubic">Monotonic cubic</option><option value="linear">Linear</option></select>
        <button type="button" onClick={reset}>Reset channel</button>
        <button type="button" onClick={copyChannel}>Copy {channelLabel(channel)} curve</button>
        <button type="button" disabled={copiedCurve === null} onClick={pasteChannel}>{copiedChannel === null ? 'Paste curve' : `Paste ${channelLabel(copiedChannel)} to ${channelLabel(channel)}`}</button>
      </div>
    </div>
  );
}

function curveForChannel(curves: CurveSetPrimitives, channel: CurveChannelPrimitive): ToneCurvePrimitives {
  const curve = curves[channel];
  return curve ?? ToneCurve.identity().toPrimitives();
}

function channelLabel(channel: CurveChannelPrimitive): string {
  return channels.find((candidate) => candidate.value === channel)?.label ?? channel.toUpperCase();
}

function CurveHistogramBackdrop({ analysis, channel }: {
  analysis: PreviewAnalysis | null;
  channel: CurveChannelPrimitive;
}): ReactElement | null {
  if (analysis === null) return null;
  const areas = channel === 'rgb'
    ? [
        { values: analysis.luminance, className: 'luminance' },
        { values: analysis.red, className: 'red' },
        { values: analysis.green, className: 'green' },
        { values: analysis.blue, className: 'blue' }
      ]
    : [{
        values: channel === 'red' ? analysis.red : channel === 'green' ? analysis.green : channel === 'blue' ? analysis.blue : analysis.luminance,
        className: channel === 'luminance' ? 'luminance' : channel
      }];
  return (
    <svg className="curve-histogram-backdrop" x="0" y="0" width="1" height="1" viewBox="0 0 64 1" preserveAspectRatio="none" aria-hidden="true">
      {areas.map((area) => (
        <polygon key={area.className} className={area.className} points={['0,1', ...area.values.map((value, index) => `${index + 0.5},${1 - value}`), '64,1'].join(' ')} />
      ))}
    </svg>
  );
}
