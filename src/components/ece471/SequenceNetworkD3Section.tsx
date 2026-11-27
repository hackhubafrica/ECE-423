import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  AlertTriangle,
  Cable,
  CirclePlus,
  Crosshair,
  MousePointer,
  Plus,
  RotateCcw,
  Trash2,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { FaultHistoryEntry, LiveFaultCurrentPanel } from './LiveFaultCurrentPanel';
import {
  cFmtPolar,
  cFmtRect,
  cMag,
  convertPerUnitImpedance,
  FaultType,
  SEQUENCE_NETWORK_TEMPLATES,
  SeqBranchEdge,
  SeqBusNode,
  SeqGeneratorUnit,
  SeqLineBranch,
  SeqTransformerBranch,
  SequenceGraphSolveResult,
  SequenceNetworkGraph,
  TxWindingConfig,
} from '../../utils/powerMath';

type CanvasToolMode =
  | 'select'
  | 'add_bus'
  | 'add_line'
  | 'add_tx'
  | 'add_gen'
  | 'set_fault'
  | 'delete';

type SequenceViewMode = 'one_line' | 'z1' | 'z2' | 'z0';

type SelectedEntity =
  | { kind: 'bus'; id: string }
  | { kind: 'generator'; id: string }
  | { kind: 'branch'; id: string }
  | null;

const WINDING_LABELS: Record<TxWindingConfig, string> = {
  yg_yg: 'Yg – Yg',
  yg_delta: 'Yg – Δ',
  delta_yg: 'Δ – Yg',
  delta_delta: 'Δ – Δ',
  y_yg: 'Y – Yg',
  y_y: 'Y – Y',
};

const SVG_WIDTH = 820;
const SVG_HEIGHT = 450;
const REF_BUS_Y = 396;
const MAX_BUS_Y = 310;

export function cloneSequenceGraph(g: SequenceNetworkGraph): SequenceNetworkGraph {
  return {
    ...g,
    buses: g.buses.map((b) => ({ ...b })),
    generators: g.generators.map((gen) => ({ ...gen })),
    branches: g.branches.map((br) => ({ ...br })),
  };
}

export interface SequenceNetworkD3SectionProps {
  templateId: string;
  onTemplateIdChange: (id: string) => void;
  graph: SequenceNetworkGraph;
  onGraphChange: React.Dispatch<React.SetStateAction<SequenceNetworkGraph>>;
  solved: SequenceGraphSolveResult;
  historyEntries?: FaultHistoryEntry[];
  onAddHistoryEntry?: (entry: FaultHistoryEntry) => void;
  onClearHistory?: () => void;
  onRestoreSimulation?: (entry: FaultHistoryEntry) => void;
}

export const SequenceNetworkD3Section: React.FC<SequenceNetworkD3SectionProps> = ({
  templateId,
  onTemplateIdChange: setTemplateId,
  graph,
  onGraphChange: setGraph,
  solved,
  historyEntries,
  onAddHistoryEntry,
  onClearHistory,
  onRestoreSimulation,
}) => {
  const [viewMode, setViewMode] = useState<SequenceViewMode>('one_line');
  const [filterOpenInSequence, setFilterOpenInSequence] = useState<boolean>(true);
  const [toolMode, setToolMode] = useState<CanvasToolMode>('select');
  const [pendingFromBusId, setPendingFromBusId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedEntity>({ kind: 'branch', id: 'br1' });
  const [pointerWorld, setPointerWorld] = useState<{ x: number; y: number } | null>(null);

  // Quick single-element per-unit formula converter state (below main bench)
  const [qZOld, setQZOld] = useState(0.12);
  const [qSOld, setQSOld] = useState(50);
  const [qSNew, setQSNew] = useState(100);
  const [qVOld, setQVOld] = useState(13.8);
  const [qVNew, setQVNew] = useState(13.8);
  const qZNew = useMemo(
    () => convertPerUnitImpedance(qZOld, qSOld, qSNew, qVOld, qVNew),
    [qZOld, qSOld, qSNew, qVOld, qVNew]
  );

  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const zoomTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);

  // Latest callbacks/refs so D3 event listeners always read fresh mode & handlers
  const toolModeRef = useRef(toolMode);
  toolModeRef.current = toolMode;
  const pendingFromRef = useRef(pendingFromBusId);
  pendingFromRef.current = pendingFromBusId;
  const graphRef = useRef(graph);
  graphRef.current = graph;

  // Helper to update a single bus
  const updateBus = (id: string, patch: Partial<SeqBusNode>) => {
    setGraph((prev) => ({
      ...prev,
      buses: prev.buses.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  };

  const updateGenerator = (id: string, patch: Partial<SeqGeneratorUnit>) => {
    setGraph((prev) => ({
      ...prev,
      generators: prev.generators.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }));
  };

  const updateBranch = (id: string, patch: Partial<SeqLineBranch> | Partial<SeqTransformerBranch>) => {
    setGraph((prev) => ({
      ...prev,
      branches: prev.branches.map((br) =>
        br.id === id ? ({ ...br, ...patch } as SeqBranchEdge) : br
      ),
    }));
  };

  const deleteBus = (busId: string) => {
    setGraph((prev) => {
      const nextBuses = prev.buses.filter((b) => b.id !== busId);
      const nextFault =
        prev.faultBusId === busId ? nextBuses[0]?.id ?? '' : prev.faultBusId;
      return {
        ...prev,
        faultBusId: nextFault,
        buses: nextBuses,
        generators: prev.generators.filter((g) => g.busId !== busId),
        branches: prev.branches.filter(
          (br) => br.fromBusId !== busId && br.toBusId !== busId
        ),
      };
    });
    if (selected?.kind === 'bus' && selected.id === busId) setSelected(null);
  };

  const deleteGenerator = (genId: string) => {
    setGraph((prev) => ({
      ...prev,
      generators: prev.generators.filter((g) => g.id !== genId),
    }));
    if (selected?.kind === 'generator' && selected.id === genId) setSelected(null);
  };

  const deleteBranch = (branchId: string) => {
    setGraph((prev) => ({
      ...prev,
      branches: prev.branches.filter((br) => br.id !== branchId),
    }));
    if (selected?.kind === 'branch' && selected.id === branchId) setSelected(null);
  };

  const loadTemplate = (id: string) => {
    const preset = SEQUENCE_NETWORK_TEMPLATES.find((t) => t.id === id);
    if (!preset) return;
    setTemplateId(id);
    setGraph(cloneSequenceGraph(preset.graph));
    setPendingFromBusId(null);
    setSelected(
      preset.graph.branches[0]
        ? { kind: 'branch', id: preset.graph.branches[0].id }
        : preset.graph.buses[0]
        ? { kind: 'bus', id: preset.graph.buses[0].id }
        : null
    );
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(220)
        .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  const clearCanvas = () => {
    setTemplateId('custom');
    setGraph({
      sBaseMva: 100,
      faultBusId: 'b1',
      faultType: 'slg',
      rfPu: 0,
      buses: [{ id: 'b1', name: 'Bus 1', x: 220, y: 185, vBaseKv: 13.8 }],
      generators: [],
      branches: [],
    });
    setPendingFromBusId(null);
    setSelected({ kind: 'bus', id: 'b1' });
    setToolMode('add_bus');
  };

  const handleBusClickAction = (busId: string) => {
    const mode = toolModeRef.current;
    if (mode === 'delete') {
      deleteBus(busId);
      return;
    }
    if (mode === 'set_fault') {
      setGraph((prev) => ({ ...prev, faultBusId: busId }));
      setSelected({ kind: 'bus', id: busId });
      setToolMode('select');
      return;
    }
    if (mode === 'add_gen') {
      const bus = graphRef.current.buses.find((b) => b.id === busId);
      if (!bus) return;
      const newId = `g_${Date.now().toString(36)}`;
      const nextNum = graphRef.current.generators.length + 1;
      const newGen: SeqGeneratorUnit = {
        id: newId,
        busId: bus.id,
        name: `Gen G${nextNum}`,
        sRatedMva: graphRef.current.sBaseMva,
        vRatedKv: bus.vBaseKv,
        rPu: 0,
        x1Pu: 0.18,
        x2Pu: 0.18,
        x0Pu: 0.06,
        grounded: true,
        xnPu: 0.05,
      };
      setGraph((prev) => ({ ...prev, generators: [...prev.generators, newGen] }));
      setSelected({ kind: 'generator', id: newId });
      setToolMode('select');
      return;
    }
    if (mode === 'add_line' || mode === 'add_tx') {
      const fromId = pendingFromRef.current;
      if (!fromId) {
        setPendingFromBusId(busId);
        setSelected({ kind: 'bus', id: busId });
        return;
      }
      if (fromId === busId) {
        setPendingFromBusId(null);
        return;
      }
      const fromBus = graphRef.current.buses.find((b) => b.id === fromId);
      const toBus = graphRef.current.buses.find((b) => b.id === busId);
      if (!fromBus || !toBus) {
        setPendingFromBusId(null);
        return;
      }
      const newId = `br_${Date.now().toString(36)}`;
      const nextNum = graphRef.current.branches.length + 1;
      if (mode === 'add_line') {
        const line: SeqLineBranch = {
          id: newId,
          kind: 'line',
          name: `Line L${nextNum}`,
          fromBusId: fromBus.id,
          toBusId: toBus.id,
          inputMode: 'pu',
          r1: 0,
          x1: 0.15,
          r0: 0,
          x0: 0.4,
          sOrigMva: graphRef.current.sBaseMva,
          vOrigKv: fromBus.vBaseKv,
        };
        setGraph((prev) => ({ ...prev, branches: [...prev.branches, line] }));
      } else {
        const tx: SeqTransformerBranch = {
          id: newId,
          kind: 'transformer',
          name: `Tx T${nextNum}`,
          fromBusId: fromBus.id,
          toBusId: toBus.id,
          sRatedMva: graphRef.current.sBaseMva,
          vPrimaryKv: fromBus.vBaseKv,
          vSecondaryKv: toBus.vBaseKv,
          rPu: 0,
          xPu: 0.1,
          winding: 'delta_yg',
          xnPrimaryPu: 0,
          xnSecondaryPu: 0,
        };
        setGraph((prev) => ({ ...prev, branches: [...prev.branches, tx] }));
      }
      setPendingFromBusId(null);
      setPointerWorld(null);
      setSelected({ kind: 'branch', id: newId });
      setToolMode('select');
      return;
    }
    setSelected({ kind: 'bus', id: busId });
  };

  // Initialize D3 zoom & SVG background click once
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.65, 2.2])
      .filter((event) => {
        // Allow wheel zoom and drag pan on background; let node drag handle bus clicks
        if (event.type === 'wheel') return true;
        const target = event.target as Element | null;
        if (target?.closest('[data-bus-node="true"]')) return false;
        return toolModeRef.current === 'select';
      })
      .on('zoom', (event) => {
        zoomTransformRef.current = event.transform;
        svg.select<SVGGElement>('g.zoom-layer').attr('transform', event.transform.toString());
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    return () => {
      svg.on('.zoom', null);
    };
  }, []);

  // Render interactive D3 network scene whenever graph, viewMode, selection, or solved data changes
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    const root = svg.select<SVGGElement>('g.zoom-layer');
    root.selectAll('*').remove();

    const busMap = new Map<string, SeqBusNode>();
    graph.buses.forEach((b) => busMap.set(b.id, b));

    const seqAccent =
      viewMode === 'z1'
        ? '#047857'
        : viewMode === 'z2'
        ? '#0284C7'
        : viewMode === 'z0'
        ? '#D97706'
        : '#0F172A';

    // 1. Sequence Reference Busbar (shown in Z1, Z2, Z0 views)
    const refLayer = root.append('g').attr('class', 'reference-layer');
    if (viewMode !== 'one_line') {
      refLayer
        .append('line')
        .attr('x1', 36)
        .attr('y1', REF_BUS_Y)
        .attr('x2', SVG_WIDTH - 36)
        .attr('y2', REF_BUS_Y)
        .attr('stroke', '#334155')
        .attr('stroke-width', 3);

      refLayer
        .append('text')
        .attr('x', 40)
        .attr('y', REF_BUS_Y + 20)
        .attr('font-size', 11)
        .attr('font-weight', 700)
        .attr('fill', '#334155')
        .text(
          viewMode === 'z1'
            ? 'Positive-Sequence Reference Bus (Neutral / 0 V)'
            : viewMode === 'z2'
            ? 'Negative-Sequence Reference Bus (Neutral / 0 V)'
            : 'Zero-Sequence Reference Bus (Ground Potential)'
        );
    }

    // Group parallel branches so multi-circuit links curve cleanly apart
    const pairGroups = new Map<string, SeqBranchEdge[]>();
    for (const br of graph.branches) {
      const a = br.fromBusId < br.toBusId ? br.fromBusId : br.toBusId;
      const b = br.fromBusId < br.toBusId ? br.toBusId : br.fromBusId;
      const key = `${a}__${b}`;
      const arr = pairGroups.get(key) ?? [];
      arr.push(br);
      pairGroups.set(key, arr);
    }

    // 2. Branches Layer (Lines & Transformers)
    const branchLayer = root.append('g').attr('class', 'branches-layer');

    for (const br of graph.branches) {
      const fromBus = busMap.get(br.fromBusId);
      const toBus = busMap.get(br.toBusId);
      if (!fromBus || !toBus) continue;

      const conv = solved.convertedBranches[br.id];
      const key =
        br.fromBusId < br.toBusId
          ? `${br.fromBusId}__${br.toBusId}`
          : `${br.toBusId}__${br.fromBusId}`;
      const siblings = pairGroups.get(key) ?? [br];
      const idx = siblings.findIndex((s) => s.id === br.id);
      const offsetMag = (idx - (siblings.length - 1) / 2) * 52;

      const dx = toBus.x - fromBus.x;
      const dy = toBus.y - fromBus.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      // Canonical normal direction independent of from/to swap
      const flip = br.fromBusId < br.toBusId ? 1 : -1;
      const nx = ((-dy / len) * flip);
      const ny = ((dx / len) * flip);

      const mx = (fromBus.x + toBus.x) / 2 + nx * offsetMag;
      const my = (fromBus.y + toBus.y) / 2 + ny * offsetMag;
      // Midpoint on quadratic bezier t=0.5 is 0.25*P0 + 0.5*C + 0.25*P1 -> set control point for curve pass-through
      const cx = (fromBus.x + toBus.x) / 2 + nx * offsetMag * 1.85;
      const cy = (fromBus.y + toBus.y) / 2 + ny * offsetMag * 1.85;

      const isSelected = selected?.kind === 'branch' && selected.id === br.id;
      const gBr = branchLayer
        .append('g')
        .attr('cursor', toolMode === 'delete' ? 'not-allowed' : 'pointer')
        .on('click', (event) => {
          event.stopPropagation();
          if (toolModeRef.current === 'delete') {
            deleteBranch(br.id);
            return;
          }
          setSelected({ kind: 'branch', id: br.id });
        });

      const activeZ =
        viewMode === 'z0'
          ? conv?.z0Pu
          : viewMode === 'z2'
          ? conv?.z2Pu
          : conv?.z1Pu;

      // Helper for impedance tag text
      const zText =
        activeZ && !(viewMode === 'z0' && conv?.z0Mode === 'open')
          ? Math.abs(activeZ.re) > 0.002
            ? `${activeZ.re.toFixed(3)}+j${activeZ.im.toFixed(3)}`
            : `j${activeZ.im.toFixed(3)} pu`
          : 'OPEN (Z₀)';

      if (viewMode === 'one_line') {
        // Solid conductor curve
        gBr
          .append('path')
          .attr('d', `M ${fromBus.x} ${fromBus.y} Q ${cx} ${cy} ${toBus.x} ${toBus.y}`)
          .attr('fill', 'none')
          .attr('stroke', isSelected ? '#0284C7' : '#334155')
          .attr('stroke-width', isSelected ? 3.2 : 2.2);

        // Wide transparent click target
        gBr
          .append('path')
          .attr('d', `M ${fromBus.x} ${fromBus.y} Q ${cx} ${cy} ${toBus.x} ${toBus.y}`)
          .attr('fill', 'none')
          .attr('stroke', 'transparent')
          .attr('stroke-width', 16);

        if (br.kind === 'transformer') {
          // Twin overlapping ANSI/IEC circles
          const ux = dx / len;
          const uy = dy / len;
          const txG = gBr.append('g').attr('transform', `translate(${mx}, ${my})`);
          txG
            .append('circle')
            .attr('cx', -ux * 6)
            .attr('cy', -uy * 6)
            .attr('r', 11)
            .attr('fill', '#FFFFFF')
            .attr('stroke', isSelected ? '#0284C7' : '#0F172A')
            .attr('stroke-width', 2);
          txG
            .append('circle')
            .attr('cx', ux * 6)
            .attr('cy', uy * 6)
            .attr('r', 11)
            .attr('fill', '#FFFFFF')
            .attr('fill-opacity', 0.85)
            .attr('stroke', isSelected ? '#0284C7' : '#0F172A')
            .attr('stroke-width', 2);

          gBr
            .append('text')
            .attr('x', mx)
            .attr('y', my - 18)
            .attr('text-anchor', 'middle')
            .attr('font-size', 10)
            .attr('font-weight', 700)
            .attr('fill', isSelected ? '#0369A1' : '#0F172A')
            .text(`${br.name} · ${WINDING_LABELS[br.winding]}`);

          gBr
            .append('text')
            .attr('x', mx)
            .attr('y', my + 24)
            .attr('text-anchor', 'middle')
            .attr('font-size', 10)
            .attr('font-family', 'monospace')
            .attr('fill', '#475569')
            .text(`X=${conv ? conv.z1Pu.im.toFixed(3) : br.xPu.toFixed(3)} pu`);
        } else {
          // Line label badge (clean hairline box)
          gBr
            .append('rect')
            .attr('x', mx - 44)
            .attr('y', my - 11)
            .attr('width', 88)
            .attr('height', 22)
            .attr('rx', 4)
            .attr('fill', '#FFFFFF')
            .attr('stroke', isSelected ? '#0284C7' : '#CBD5E1')
            .attr('stroke-width', isSelected ? 1.8 : 1);

          gBr
            .append('text')
            .attr('x', mx)
            .attr('y', my + 3.5)
            .attr('text-anchor', 'middle')
            .attr('font-size', 10)
            .attr('font-family', 'monospace')
            .attr('font-weight', 600)
            .attr('fill', isSelected ? '#0369A1' : '#0F172A')
            .text(conv ? `j${conv.z1Pu.im.toFixed(3)} pu` : br.name);

          gBr
            .append('text')
            .attr('x', mx)
            .attr('y', my - 16)
            .attr('text-anchor', 'middle')
            .attr('font-size', 10)
            .attr('font-weight', 600)
            .attr('fill', '#475569')
            .text(br.name);
        }
      } else {
        // SEQUENCE VIEW MODE (Z1, Z2, or Z0)
        const isTx = br.kind === 'transformer';
        const z0Mode = conv?.z0Mode ?? 'series';

        if (viewMode === 'z0' && isTx && z0Mode !== 'series') {
          if (!filterOpenInSequence) {
            // Optional open-circuit series break visualization in Z0
            gBr
              .append('path')
              .attr('d', `M ${fromBus.x} ${fromBus.y} Q ${cx} ${cy} ${toBus.x} ${toBus.y}`)
              .attr('fill', 'none')
              .attr('stroke', '#CBD5E1')
              .attr('stroke-width', 1.6)
              .attr('stroke-dasharray', '5 5');

            // Wide hit target
            gBr
              .append('path')
              .attr('d', `M ${fromBus.x} ${fromBus.y} Q ${cx} ${cy} ${toBus.x} ${toBus.y}`)
              .attr('fill', 'none')
              .attr('stroke', 'transparent')
              .attr('stroke-width', 16);

            // Series break symbol at midpoint
            gBr
              .append('rect')
              .attr('x', mx - 38)
              .attr('y', my - 11)
              .attr('width', 76)
              .attr('height', 22)
              .attr('rx', 4)
              .attr('fill', '#FFFBEB')
              .attr('stroke', isSelected ? '#0284C7' : '#F59E0B')
              .attr('stroke-width', isSelected ? 2 : 1.2);
            gBr
              .append('text')
              .attr('x', mx)
              .attr('y', my + 3.5)
              .attr('text-anchor', 'middle')
              .attr('font-size', 9.5)
              .attr('font-weight', 700)
              .attr('fill', '#B45309')
              .text(
                z0Mode === 'open'
                  ? 'OPEN · Z₀'
                  : z0Mode === 'shunt_from'
                  ? 'Δ Open →'
                  : '← Δ Open'
              );
          }

          // Draw shunt drop to Zero-Sequence Reference Bus on Yg side!
          if (z0Mode === 'shunt_from' || z0Mode === 'shunt_to') {
            const anchorBus = z0Mode === 'shunt_from' ? fromBus : toBus;
            const otherBus = z0Mode === 'shunt_from' ? toBus : fromBus;
            const dir = otherBus.x >= anchorBus.x ? 1 : -1;
            const tapX = anchorBus.x + dir * 48;
            const tapY = anchorBus.y;

            // Tap wire from Yg bus horizontally then down to REF_BUS_Y
            gBr
              .append('path')
              .attr('d', `M ${anchorBus.x} ${tapY} L ${tapX} ${tapY} L ${tapX} ${REF_BUS_Y}`)
              .attr('fill', 'none')
              .attr('stroke', isSelected ? '#0284C7' : '#D97706')
              .attr('stroke-width', isSelected ? 3 : 2.2);

            const boxY = (tapY + REF_BUS_Y) / 2 - 14;
            gBr
              .append('rect')
              .attr('x', tapX - 38)
              .attr('y', boxY)
              .attr('width', 76)
              .attr('height', 28)
              .attr('rx', 4)
              .attr('fill', '#FFFFFF')
              .attr('stroke', isSelected ? '#0284C7' : '#D97706')
              .attr('stroke-width', 1.6);
            gBr
              .append('text')
              .attr('x', tapX)
              .attr('y', boxY + 11)
              .attr('text-anchor', 'middle')
              .attr('font-size', 9)
              .attr('font-weight', 700)
              .attr('fill', '#92400E')
              .text(`${br.name.split(' ')[0]} Yg→Ref`);
            gBr
              .append('text')
              .attr('x', tapX)
              .attr('y', boxY + 22)
              .attr('text-anchor', 'middle')
              .attr('font-size', 9.5)
              .attr('font-family', 'monospace')
              .attr('font-weight', 700)
              .attr('fill', '#0F172A')
              .text(zText);
          }
        } else {
          // Connected series impedance box in Z1 / Z2 / Z0 (for lines or Yg-Yg tx)
          gBr
            .append('path')
            .attr('d', `M ${fromBus.x} ${fromBus.y} Q ${cx} ${cy} ${toBus.x} ${toBus.y}`)
            .attr('fill', 'none')
            .attr('stroke', isSelected ? '#0284C7' : seqAccent)
            .attr('stroke-width', isSelected ? 3.2 : 2.2);

          gBr
            .append('path')
            .attr('d', `M ${fromBus.x} ${fromBus.y} Q ${cx} ${cy} ${toBus.x} ${toBus.y}`)
            .attr('fill', 'none')
            .attr('stroke', 'transparent')
            .attr('stroke-width', 16);

          gBr
            .append('rect')
            .attr('x', mx - 46)
            .attr('y', my - 14)
            .attr('width', 92)
            .attr('height', 28)
            .attr('rx', 4)
            .attr('fill', '#FFFFFF')
            .attr('stroke', isSelected ? '#0284C7' : seqAccent)
            .attr('stroke-width', isSelected ? 2 : 1.5);

          gBr
            .append('text')
            .attr('x', mx)
            .attr('y', my - 2)
            .attr('text-anchor', 'middle')
            .attr('font-size', 9)
            .attr('font-weight', 700)
            .attr('fill', '#475569')
            .text(br.name);

          gBr
            .append('text')
            .attr('x', mx)
            .attr('y', my + 9.5)
            .attr('text-anchor', 'middle')
            .attr('font-size', 9.5)
            .attr('font-family', 'monospace')
            .attr('font-weight', 700)
            .attr('fill', seqAccent)
            .text(zText);
        }
      }
    }

    // 3. Generators Layer
    const genLayer = root.append('g').attr('class', 'generators-layer');
    const gensByBus = new Map<string, SeqGeneratorUnit[]>();
    for (const g of graph.generators) {
      const list = gensByBus.get(g.busId) ?? [];
      list.push(g);
      gensByBus.set(g.busId, list);
    }

    for (const gen of graph.generators) {
      const bus = busMap.get(gen.busId);
      if (!bus) continue;
      const convG = solved.convertedGenerators[gen.id];
      const siblings = gensByBus.get(gen.busId) ?? [gen];
      const gIdx = siblings.findIndex((s) => s.id === gen.id);
      const xOffset = (gIdx - (siblings.length - 1) / 2) * 58;
      const isSel = selected?.kind === 'generator' && selected.id === gen.id;

      const gNode = genLayer
        .append('g')
        .attr('cursor', toolMode === 'delete' ? 'not-allowed' : 'pointer')
        .on('click', (event) => {
          event.stopPropagation();
          if (toolModeRef.current === 'delete') {
            deleteGenerator(gen.id);
            return;
          }
          setSelected({ kind: 'generator', id: gen.id });
        });

      if (viewMode === 'one_line') {
        const gx = bus.x + xOffset;
        const gy = bus.y - 68;
        gNode
          .append('line')
          .attr('x1', bus.x)
          .attr('y1', bus.y - 20)
          .attr('x2', gx)
          .attr('y2', gy + 17)
          .attr('stroke', isSel ? '#0284C7' : '#334155')
          .attr('stroke-width', isSel ? 2.6 : 1.8);

        gNode
          .append('circle')
          .attr('cx', gx)
          .attr('cy', gy)
          .attr('r', 17)
          .attr('fill', '#FFFFFF')
          .attr('stroke', isSel ? '#0284C7' : '#0F172A')
          .attr('stroke-width', isSel ? 2.6 : 2);

        gNode
          .append('text')
          .attr('x', gx)
          .attr('y', gy + 4.5)
          .attr('text-anchor', 'middle')
          .attr('font-size', 13)
          .attr('font-weight', 800)
          .attr('fill', '#0F172A')
          .text('G');

        gNode
          .append('text')
          .attr('x', gx)
          .attr('y', gy - 23)
          .attr('text-anchor', 'middle')
          .attr('font-size', 10)
          .attr('font-weight', 700)
          .attr('fill', isSel ? '#0369A1' : '#0F172A')
          .text(`${gen.name} (${gen.grounded ? 'Yg' : 'Y'})`);

        gNode
          .append('text')
          .attr('x', gx + 23)
          .attr('y', gy + 4)
          .attr('font-size', 9.5)
          .attr('font-family', 'monospace')
          .attr('fill', '#475569')
          .text(convG ? `j${convG.z1Pu.im.toFixed(3)}` : '');
      } else {
        // Sequence diagram: drop vertically from Bus to Reference Busbar
        const sx = bus.x + xOffset;
        const topY = bus.y + 24;
        const midY = (topY + REF_BUS_Y) / 2;
        const isZeroOpen = viewMode === 'z0' && !gen.grounded;
        const strokeCol = isSel ? '#0284C7' : isZeroOpen ? '#94A3B8' : seqAccent;

        if (isZeroOpen) {
          if (filterOpenInSequence) {
            continue;
          }
          gNode
            .append('line')
            .attr('x1', sx)
            .attr('y1', topY)
            .attr('x2', sx)
            .attr('y2', midY - 14)
            .attr('stroke', '#94A3B8')
            .attr('stroke-width', 1.8)
            .attr('stroke-dasharray', '4 4');

          gNode
            .append('line')
            .attr('x1', sx)
            .attr('y1', midY + 14)
            .attr('x2', sx)
            .attr('y2', REF_BUS_Y)
            .attr('stroke', '#CBD5E1')
            .attr('stroke-width', 1.4)
            .attr('stroke-dasharray', '4 4');

          gNode
            .append('rect')
            .attr('x', sx - 42)
            .attr('y', midY - 13)
            .attr('width', 84)
            .attr('height', 26)
            .attr('rx', 4)
            .attr('fill', '#FFFBEB')
            .attr('stroke', isSel ? '#0284C7' : '#F59E0B')
            .attr('stroke-width', isSel ? 2 : 1.2);

          gNode
            .append('text')
            .attr('x', sx)
            .attr('y', midY - 1)
            .attr('text-anchor', 'middle')
            .attr('font-size', 8.5)
            .attr('font-weight', 700)
            .attr('fill', '#B45309')
            .text(`${gen.name} OPEN`);

          gNode
            .append('text')
            .attr('x', sx)
            .attr('y', midY + 9.5)
            .attr('text-anchor', 'middle')
            .attr('font-size', 8.5)
            .attr('fill', '#92400E')
            .text('Ungrounded');
        } else {
          gNode
            .append('line')
            .attr('x1', sx)
            .attr('y1', topY)
            .attr('x2', sx)
            .attr('y2', REF_BUS_Y)
            .attr('stroke', strokeCol)
            .attr('stroke-width', isSel ? 2.8 : 2);

          const zVal =
            viewMode === 'z1'
              ? convG?.z1Pu
              : viewMode === 'z2'
              ? convG?.z2Pu
              : convG?.z0Pu;

          const boxCenterY = viewMode === 'z1' ? midY - 22 : midY;
          gNode
            .append('rect')
            .attr('x', sx - 40)
            .attr('y', boxCenterY - 14)
            .attr('width', 80)
            .attr('height', 28)
            .attr('rx', 4)
            .attr('fill', '#FFFFFF')
            .attr('stroke', strokeCol)
            .attr('stroke-width', isSel ? 2 : 1.5);

          gNode
            .append('text')
            .attr('x', sx)
            .attr('y', boxCenterY - 2)
            .attr('text-anchor', 'middle')
            .attr('font-size', 9)
            .attr('font-weight', 700)
            .attr('fill', '#475569')
            .text(viewMode === 'z0' ? `${gen.name} Z₀+3Zn` : gen.name);

          gNode
            .append('text')
            .attr('x', sx)
            .attr('y', boxCenterY + 9.5)
            .attr('text-anchor', 'middle')
            .attr('font-size', 9.5)
            .attr('font-family', 'monospace')
            .attr('font-weight', 700)
            .attr('fill', strokeCol)
            .text(zVal ? `j${zVal.im.toFixed(3)} pu` : '—');

          // Internal 1∠0° EMF source in Positive sequence only
          if (viewMode === 'z1') {
            const emfY = REF_BUS_Y - 40;
            gNode
              .append('circle')
              .attr('cx', sx)
              .attr('cy', emfY)
              .attr('r', 13)
              .attr('fill', '#ECFDF5')
              .attr('stroke', '#047857')
              .attr('stroke-width', 1.6);
            gNode
              .append('text')
              .attr('x', sx)
              .attr('y', emfY + 3.5)
              .attr('text-anchor', 'middle')
              .attr('font-size', 8.5)
              .attr('font-family', 'monospace')
              .attr('font-weight', 700)
              .attr('fill', '#065F46')
              .text('1∠0°');
          }
        }
      }
    }

    // 4. Buses Layer (with d3.drag)
    const busLayer = root.append('g').attr('class', 'buses-layer');

    const dragBehavior = d3
      .drag<SVGGElement, SeqBusNode>()
      .filter(() => toolModeRef.current === 'select')
      .on('drag', function (event, d) {
        const clampedX = Math.max(52, Math.min(SVG_WIDTH - 52, Math.round(event.x / 5) * 5));
        const clampedY = Math.max(58, Math.min(MAX_BUS_Y, Math.round(event.y / 5) * 5));
        d.x = clampedX;
        d.y = clampedY;
        d3.select(this).attr('transform', `translate(${clampedX}, ${clampedY})`);
      })
      .on('end', (_event, d) => {
        updateBus(d.id, { x: d.x, y: d.y });
      });

    const busSelection = busLayer
      .selectAll<SVGGElement, SeqBusNode>('g.bus-node')
      .data(graph.buses, (d) => d.id)
      .enter()
      .append('g')
      .attr('class', 'bus-node')
      .attr('data-bus-node', 'true')
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`)
      .attr('cursor', toolMode === 'select' ? 'grab' : 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        handleBusClickAction(d.id);
      });

    busSelection.call(dragBehavior);

    busSelection.each(function (d) {
      const g = d3.select(this);
      const isFault = d.id === graph.faultBusId;
      const isPending = d.id === pendingFromBusId;
      const isSel = selected?.kind === 'bus' && selected.id === d.id;

      // Highlight halo
      if (isSel || isPending || isFault) {
        g.append('rect')
          .attr('x', -10)
          .attr('y', -28)
          .attr('width', 20)
          .attr('height', 56)
          .attr('rx', 6)
          .attr('fill', isFault ? '#FEE2E2' : '#E0F2FE')
          .attr('stroke', isFault ? '#DC2626' : '#0284C7')
          .attr('stroke-width', 1.4)
          .attr('stroke-dasharray', isPending ? '3 2' : 'none');
      }

      // Main heavy busbar
      g.append('rect')
        .attr('x', -4.5)
        .attr('y', -23)
        .attr('width', 9)
        .attr('height', 46)
        .attr('rx', 2.5)
        .attr('fill', isFault ? '#B91C1C' : isSel ? '#0284C7' : '#0F172A');

      // Bus name label
      g.append('text')
        .attr('x', 0)
        .attr('y', -33)
        .attr('text-anchor', 'middle')
        .attr('font-size', 11)
        .attr('font-weight', 700)
        .attr('fill', isFault ? '#B91C1C' : '#0F172A')
        .text(d.name);

      // Voltage base tag
      g.append('text')
        .attr('x', 0)
        .attr('y', 38)
        .attr('text-anchor', 'middle')
        .attr('font-size', 10)
        .attr('font-family', 'monospace')
        .attr('fill', '#475569')
        .text(`${d.vBaseKv} kV`);

      // Fault marker symbol
      if (isFault) {
        const faultG = g.append('g').attr('transform', 'translate(16, -24)');
        faultG
          .append('path')
          .attr('d', 'M 0 0 L -5 10 L 1 10 L -3 20 L 7 8 L 1 8 Z')
          .attr('fill', '#DC2626');
        faultG
          .append('text')
          .attr('x', 11)
          .attr('y', 11)
          .attr('font-size', 9.5)
          .attr('font-weight', 800)
          .attr('fill', '#DC2626')
          .text(`FAULT (${graph.faultType.toUpperCase()})`);
      }
    });
  }, [graph, viewMode, filterOpenInSequence, toolMode, pendingFromBusId, selected, solved]);

  const handleSvgBackgroundClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (toolMode === 'add_line' || toolMode === 'add_tx') {
      if (pendingFromBusId) {
        setPendingFromBusId(null);
        setPointerWorld(null);
      }
      return;
    }
    if (toolMode !== 'add_bus') return;

    const svgEl = svgRef.current;
    if (!svgEl) return;
    const pt = d3.pointer(e.nativeEvent, svgEl);
    const inv = zoomTransformRef.current.invert(pt);
    const x = Math.max(52, Math.min(SVG_WIDTH - 52, Math.round(inv[0] / 10) * 10));
    const y = Math.max(64, Math.min(MAX_BUS_Y, Math.round(inv[1] / 10) * 10));
    const nextNum = graph.buses.length + 1;
    const newBus: SeqBusNode = {
      id: `b_${Date.now().toString(36)}`,
      name: `Bus ${nextNum}`,
      x,
      y,
      vBaseKv: 132,
    };
    setGraph((prev) => ({
      ...prev,
      faultBusId: prev.faultBusId || newBus.id,
      buses: [...prev.buses, newBus],
    }));
    setSelected({ kind: 'bus', id: newBus.id });
    setToolMode('select');
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((toolMode !== 'add_line' && toolMode !== 'add_tx') || !pendingFromBusId) {
      if (pointerWorld) setPointerWorld(null);
      return;
    }
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const pt = d3.pointer(e.nativeEvent, svgEl);
    const inv = zoomTransformRef.current.invert(pt);
    setPointerWorld({ x: inv[0], y: inv[1] });
  };

  const zoomStep = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(180)
      .call(zoomBehaviorRef.current.scaleBy, factor);
  };

  const resetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(200)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  const selectedBus =
    selected?.kind === 'bus' ? graph.buses.find((b) => b.id === selected.id) ?? null : null;
  const selectedGen =
    selected?.kind === 'generator'
      ? graph.generators.find((g) => g.id === selected.id) ?? null
      : null;
  const selectedBranch =
    selected?.kind === 'branch'
      ? graph.branches.find((br) => br.id === selected.id) ?? null
      : null;

  const pendingFromBus = pendingFromBusId
    ? graph.buses.find((b) => b.id === pendingFromBusId) ?? null
    : null;

  const toolHint =
    toolMode === 'add_bus'
      ? 'Click anywhere inside the canvas grid to place a new bus.'
      : toolMode === 'add_line'
      ? pendingFromBus
        ? `Select destination bus to connect Line from ${pendingFromBus.name}.`
        : 'Click the starting bus for the new Transmission Line.'
      : toolMode === 'add_tx'
      ? pendingFromBus
        ? `Select secondary bus to connect Transformer from ${pendingFromBus.name}.`
        : 'Click the primary bus for the new Transformer.'
      : toolMode === 'add_gen'
      ? 'Click any bus to attach a synchronous generator unit.'
      : toolMode === 'set_fault'
      ? 'Click any busbar to move the active fault location.'
      : toolMode === 'delete'
      ? 'Click any bus, generator, or branch to remove it from the network.'
      : 'Drag buses to reposition, or click any bus, generator, line, or transformer to edit.';

  return (
    <div className="space-y-6">
      {/* Main Interactive D3 Sequence Builder */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        {/* Header & System Base / Template Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-950">
              Interactive D3.js Per-Unit &amp; Sequence Network Builder
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Draw multi-bus grids, convert MVA/kV/Ω ratings onto system base, switch Z₁ / Z₂ / Z₀ views, and solve live nodal faults.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <span className="text-slate-600 font-medium whitespace-nowrap">Template</span>
              <select
                value={templateId}
                onChange={(e) => loadTemplate(e.target.value)}
                className="bg-transparent font-semibold text-slate-900 focus:outline-none"
              >
                {SEQUENCE_NETWORK_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
                {templateId === 'custom' && <option value="custom">Custom Sketch</option>}
              </select>
            </label>

            <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <span className="text-slate-600 font-medium whitespace-nowrap">S_base (MVA)</span>
              <input
                type="number"
                min={1}
                step={10}
                value={graph.sBaseMva}
                onChange={(e) =>
                  setGraph((prev) => ({
                    ...prev,
                    sBaseMva: Math.max(1, Number(e.target.value) || 100),
                  }))
                }
                className="w-16 bg-white rounded border border-slate-200 px-1.5 py-0.5 font-mono tabular-nums text-slate-900"
              />
            </label>

            <button
              type="button"
              onClick={clearCanvas}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Blank Grid
            </button>
          </div>
        </div>

        {/* Authoring Tools + Sequence View Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Authoring Tool Palette */}
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
            {(
              [
                { id: 'select', label: 'Select / Move', icon: MousePointer },
                { id: 'add_bus', label: 'Add Bus', icon: Plus },
                { id: 'add_line', label: 'Line', icon: Cable },
                { id: 'add_tx', label: 'Transformer', icon: CirclePlus },
                { id: 'add_gen', label: 'Generator', icon: Zap },
                { id: 'set_fault', label: 'Fault Bus', icon: Crosshair },
                { id: 'delete', label: 'Delete', icon: Trash2 },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              const active = toolMode === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setToolMode(t.id);
                    setPendingFromBusId(null);
                    setPointerWorld(null);
                  }}
                  className={`inline-flex items-center gap-1.5 cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? t.id === 'delete'
                        ? 'bg-red-700 text-white'
                        : 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Synchronized Sequence Filter Toggles (One-Line / Z1 / Z2 / Z0) */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Sequence Component Network Filter"
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1"
            >
              {(
                [
                  { id: 'one_line', label: 'One-Line', tone: 'bg-slate-900 text-white' },
                  { id: 'z1', label: 'Z₁ Positive', tone: 'bg-emerald-700 text-white' },
                  { id: 'z2', label: 'Z₂ Negative', tone: 'bg-sky-700 text-white' },
                  { id: 'z0', label: 'Z₀ Zero', tone: 'bg-amber-700 text-white' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={viewMode === m.id}
                  onClick={() => setViewMode(m.id)}
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    viewMode === m.id ? m.tone : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {viewMode !== 'one_line' && (
              <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={filterOpenInSequence}
                  onChange={(e) => setFilterOpenInSequence(e.target.checked)}
                  className="rounded border-slate-300 accent-slate-900"
                />
                <span>Active {viewMode.toUpperCase()} connections only</span>
              </label>
            )}
          </div>
        </div>

        {/* Asymmetric Split: Left D3 Stage (64%) + Right Inspector & Fault Readout (36%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Interactive D3 Canvas */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-2.5">
            <div className="relative rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
              {/* Top-left Mode Context + Top-right Zoom Controls */}
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 bg-white/95 text-xs">
                <span className="font-medium text-slate-700 truncate">
                  {viewMode === 'one_line'
                    ? toolHint
                    : `Sequence Filter: ${
                        viewMode === 'z1'
                          ? 'Positive (Z₁) impedance network'
                          : viewMode === 'z2'
                          ? 'Negative (Z₂) impedance network'
                          : 'Zero (Z₀) impedance connections'
                      }${filterOpenInSequence ? ' (connected paths only)' : ' (with open breaks)'}`}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => zoomStep(1.2)}
                    title="Zoom in"
                    className="cursor-pointer rounded border border-slate-200 bg-white p-1 text-slate-700 hover:bg-slate-50"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => zoomStep(0.84)}
                    title="Zoom out"
                    className="cursor-pointer rounded border border-slate-200 bg-white p-1 text-slate-700 hover:bg-slate-50"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={resetZoom}
                    title="Reset zoom and pan"
                    className="cursor-pointer rounded border border-slate-200 bg-white p-1 text-slate-700 hover:bg-slate-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <svg
                ref={svgRef}
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                onClick={handleSvgBackgroundClick}
                onMouseMove={handleSvgMouseMove}
                className={`w-full h-auto min-h-[380px] select-none ${
                  toolMode === 'add_bus' ? 'cursor-crosshair' : 'cursor-default'
                }`}
                aria-label="Interactive D3 Sequence Network Canvas"
              >
                <defs>
                  <pattern
                    id="seq-grid-pattern"
                    width="24"
                    height="24"
                    patternUnits="userSpaceOnUse"
                  >
                    <circle cx="1" cy="1" r="1" fill="#CBD5E1" />
                  </pattern>
                </defs>
                <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#seq-grid-pattern)" />

                {/* Main D3-managed graph layer */}
                <g className="zoom-layer" />

                {/* Lightweight two-click rubber-band preview */}
                {pendingFromBus && pointerWorld && (
                  <line
                    x1={
                      pendingFromBus.x * zoomTransformRef.current.k +
                      zoomTransformRef.current.x
                    }
                    y1={
                      pendingFromBus.y * zoomTransformRef.current.k +
                      zoomTransformRef.current.y
                    }
                    x2={
                      pointerWorld.x * zoomTransformRef.current.k +
                      zoomTransformRef.current.x
                    }
                    y2={
                      pointerWorld.y * zoomTransformRef.current.k +
                      zoomTransformRef.current.y
                    }
                    stroke="#0284C7"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    pointerEvents="none"
                  />
                )}
              </svg>

              {graph.buses.length === 0 && (
                <div className="px-4 py-3 text-xs text-slate-600 border-t border-slate-200 bg-white">
                  Canvas is empty. Select Add Bus and click the grid to place Bus 1.
                </div>
              )}
            </div>

            {solved.warnings.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>{solved.warnings[0]}</div>
              </div>
            )}
          </div>

          {/* Right Inspector & Live Sequence / Fault Telemetry Deck */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            {/* 1. Selected Element Editor */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Element Inspector
                </h3>
                {selected && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selected.kind === 'bus') deleteBus(selected.id);
                      else if (selected.kind === 'generator') deleteGenerator(selected.id);
                      else deleteBranch(selected.id);
                    }}
                    className="inline-flex items-center gap-1 cursor-pointer text-xs font-semibold text-red-700 hover:text-red-900"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              {!selectedBus && !selectedGen && !selectedBranch && (
                <p className="text-xs text-slate-600">
                  Click any bus, generator, line, or transformer on the D3 diagram to inspect and edit its ratings and per-unit conversion.
                </p>
              )}

              {/* Bus Inspector */}
              {selectedBus && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Bus Name</label>
                      <input
                        type="text"
                        value={selectedBus.name}
                        onChange={(e) => updateBus(selectedBus.id, { name: e.target.value })}
                        className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">
                        Zone V_base (kV)
                      </label>
                      <input
                        type="number"
                        step={0.1}
                        min={0.4}
                        value={selectedBus.vBaseKv}
                        onChange={(e) =>
                          updateBus(selectedBus.id, {
                            vBaseKv: Math.max(0.4, Number(e.target.value) || 0.4),
                          })
                        }
                        className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 font-mono tabular-nums text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 font-mono tabular-nums text-[11px] text-slate-700">
                    <span>
                      Z_base ={' '}
                      {((selectedBus.vBaseKv * selectedBus.vBaseKv) / graph.sBaseMva).toFixed(2)} Ω
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setGraph((prev) => ({ ...prev, faultBusId: selectedBus.id }))
                      }
                      className="cursor-pointer font-sans font-semibold text-red-700 hover:underline"
                    >
                      {graph.faultBusId === selectedBus.id ? 'Active Fault Bus' : 'Set as Fault Bus'}
                    </button>
                  </div>
                </div>
              )}

              {/* Generator Inspector */}
              {selectedGen && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="block text-[11px] text-slate-600 mb-1">Name</label>
                      <input
                        type="text"
                        value={selectedGen.name}
                        onChange={(e) => updateGenerator(selectedGen.id, { name: e.target.value })}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">S_rated (MVA)</label>
                      <input
                        type="number"
                        min={1}
                        step={5}
                        value={selectedGen.sRatedMva}
                        onChange={(e) =>
                          updateGenerator(selectedGen.id, {
                            sRatedMva: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">V_rated (kV)</label>
                      <input
                        type="number"
                        min={0.4}
                        step={0.1}
                        value={selectedGen.vRatedKv}
                        onChange={(e) =>
                          updateGenerator(selectedGen.id, {
                            vRatedKv: Math.max(0.4, Number(e.target.value) || 0.4),
                          })
                        }
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 font-mono tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {(
                      [
                        { label: 'X₁″', key: 'x1Pu', val: selectedGen.x1Pu },
                        { label: 'X₂', key: 'x2Pu', val: selectedGen.x2Pu },
                        { label: 'X₀', key: 'x0Pu', val: selectedGen.x0Pu },
                        { label: 'X_n', key: 'xnPu', val: selectedGen.xnPu },
                      ] as const
                    ).map((f) => (
                      <div key={f.key}>
                        <label className="block text-[11px] text-slate-600 mb-1">{f.label}</label>
                        <input
                          type="number"
                          step={0.01}
                          min={0}
                          value={f.val}
                          onChange={(e) =>
                            updateGenerator(selectedGen.id, {
                              [f.key]: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 font-mono tabular-nums"
                        />
                      </div>
                    ))}
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={selectedGen.grounded}
                      onChange={(e) =>
                        updateGenerator(selectedGen.id, { grounded: e.target.checked })
                      }
                      className="rounded border-slate-300 accent-amber-700"
                    />
                    <span>Neutral Grounded (includes X₀ + 3X_n in Z₀)</span>
                  </label>

                  {solved.convertedGenerators[selectedGen.id] && (
                    <div className="rounded border border-slate-200 bg-white p-2.5 font-mono tabular-nums text-[11px] text-slate-700 space-y-1">
                      <div>
                        Base scale = ×
                        {solved.convertedGenerators[selectedGen.id].conversionScale.toFixed(3)}
                      </div>
                      <div className="text-slate-950 font-semibold">
                        Z₁=j{solved.convertedGenerators[selectedGen.id].z1Pu.im.toFixed(4)} · Z₂=j
                        {solved.convertedGenerators[selectedGen.id].z2Pu.im.toFixed(4)} · Z₀=
                        {selectedGen.grounded
                          ? `j${solved.convertedGenerators[selectedGen.id].z0Pu.im.toFixed(4)}`
                          : '∞ (Open)'}{' '}
                        pu
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Line or Transformer Inspector */}
              {selectedBranch && selectedBranch.kind === 'line' && (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={selectedBranch.name}
                      onChange={(e) => updateBranch(selectedBranch.id, { name: e.target.value })}
                      className="flex-1 rounded border border-slate-200 bg-white px-2.5 py-1 font-semibold"
                    />
                    <div className="flex rounded border border-slate-200 bg-white p-0.5 text-[11px]">
                      {(['pu', 'ohm'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => updateBranch(selectedBranch.id, { inputMode: m })}
                          className={`cursor-pointer rounded px-2 py-0.5 font-semibold ${
                            selectedBranch.inputMode === m
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-600'
                          }`}
                        >
                          {m === 'pu' ? 'p.u.' : 'Ω'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedBranch.inputMode === 'pu' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-1">
                          S_orig (MVA)
                        </label>
                        <input
                          type="number"
                          min={1}
                          step={10}
                          value={selectedBranch.sOrigMva}
                          onChange={(e) =>
                            updateBranch(selectedBranch.id, {
                              sOrigMva: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 font-mono tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-1">
                          V_orig (kV)
                        </label>
                        <input
                          type="number"
                          min={0.4}
                          step={1}
                          value={selectedBranch.vOrigKv}
                          onChange={(e) =>
                            updateBranch(selectedBranch.id, {
                              vOrigKv: Math.max(0.4, Number(e.target.value) || 0.4),
                            })
                          }
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 font-mono tabular-nums"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-2">
                    {(
                      [
                        { label: 'R₁', key: 'r1', val: selectedBranch.r1 },
                        { label: 'X₁', key: 'x1', val: selectedBranch.x1 },
                        { label: 'R₀', key: 'r0', val: selectedBranch.r0 },
                        { label: 'X₀', key: 'x0', val: selectedBranch.x0 },
                      ] as const
                    ).map((f) => (
                      <div key={f.key}>
                        <label className="block text-[11px] text-slate-600 mb-1">
                          {f.label} ({selectedBranch.inputMode})
                        </label>
                        <input
                          type="number"
                          step={selectedBranch.inputMode === 'ohm' ? 0.5 : 0.01}
                          min={0}
                          value={f.val}
                          onChange={(e) =>
                            updateBranch(selectedBranch.id, {
                              [f.key]: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 font-mono tabular-nums"
                        />
                      </div>
                    ))}
                  </div>

                  {solved.convertedBranches[selectedBranch.id] && (
                    <div className="rounded border border-slate-200 bg-white p-2.5 font-mono tabular-nums text-[11px] text-slate-700 space-y-0.5">
                      <div>
                        Z_base = {solved.convertedBranches[selectedBranch.id].zBaseOhm.toFixed(2)} Ω
                      </div>
                      <div className="text-slate-950 font-semibold">
                        Z₁=Z₂={cFmtRect(solved.convertedBranches[selectedBranch.id].z1Pu, 3)} pu
                      </div>
                      <div className="text-amber-800 font-semibold">
                        Z₀={cFmtRect(solved.convertedBranches[selectedBranch.id].z0Pu, 3)} pu
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedBranch && selectedBranch.kind === 'transformer' && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Name</label>
                      <input
                        type="text"
                        value={selectedBranch.name}
                        onChange={(e) => updateBranch(selectedBranch.id, { name: e.target.value })}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">
                        Winding Topology
                      </label>
                      <select
                        value={selectedBranch.winding}
                        onChange={(e) =>
                          updateBranch(selectedBranch.id, {
                            winding: e.target.value as TxWindingConfig,
                          })
                        }
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 font-semibold"
                      >
                        {Object.entries(WINDING_LABELS).map(([k, lbl]) => (
                          <option key={k} value={k}>
                            {lbl}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">S_rated (MVA)</label>
                      <input
                        type="number"
                        min={1}
                        step={5}
                        value={selectedBranch.sRatedMva}
                        onChange={(e) =>
                          updateBranch(selectedBranch.id, {
                            sRatedMva: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">V_pri (kV)</label>
                      <input
                        type="number"
                        min={0.4}
                        step={0.5}
                        value={selectedBranch.vPrimaryKv}
                        onChange={(e) =>
                          updateBranch(selectedBranch.id, {
                            vPrimaryKv: Math.max(0.4, Number(e.target.value) || 0.4),
                          })
                        }
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">X_t (pu)</label>
                      <input
                        type="number"
                        min={0.005}
                        step={0.01}
                        value={selectedBranch.xPu}
                        onChange={(e) =>
                          updateBranch(selectedBranch.id, {
                            xPu: Math.max(0.005, Number(e.target.value) || 0.01),
                          })
                        }
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 font-mono tabular-nums"
                      />
                    </div>
                  </div>

                  {solved.convertedBranches[selectedBranch.id] && (
                    <div className="rounded border border-slate-200 bg-white p-2.5 font-mono tabular-nums text-[11px] text-slate-700 space-y-0.5">
                      <div>
                        Base scale = ×
                        {solved.convertedBranches[selectedBranch.id].conversionScale.toFixed(3)}
                      </div>
                      <div className="text-slate-950 font-semibold">
                        Z₁=Z₂=j{solved.convertedBranches[selectedBranch.id].z1Pu.im.toFixed(4)} pu · Z₀ mode:{' '}
                        {solved.convertedBranches[selectedBranch.id].z0Mode.replace('_', ' ')}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Thévenin Equivalents at Fault Bus */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Thévenin Z at {solved.faultBus?.name ?? 'Bus'}
                </h3>
                <span className="font-mono tabular-nums text-[11px] text-slate-500">
                  V_base = {solved.faultBus?.vBaseKv ?? 0} kV
                </span>
              </div>

              <div className="space-y-1.5 font-mono tabular-nums text-xs">
                <div className="flex items-center justify-between rounded border border-emerald-200 bg-emerald-50/70 px-3 py-1.5">
                  <span className="font-bold text-emerald-900">Z₁ (Pos)</span>
                  <span className="text-emerald-950 font-semibold">
                    {solved.thevenin1.isOpenCircuit
                      ? '∞ (Open)'
                      : `${cFmtRect(solved.thevenin1.zEq, 4)} pu`}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded border border-sky-200 bg-sky-50/70 px-3 py-1.5">
                  <span className="font-bold text-sky-900">Z₂ (Neg)</span>
                  <span className="text-sky-950 font-semibold">
                    {solved.thevenin2.isOpenCircuit
                      ? '∞ (Open)'
                      : `${cFmtRect(solved.thevenin2.zEq, 4)} pu`}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded border border-amber-200 bg-amber-50/70 px-3 py-1.5">
                  <span className="font-bold text-amber-900">Z₀ (Zero)</span>
                  <span className="text-amber-950 font-semibold">
                    {solved.thevenin0.isOpenCircuit
                      ? '∞ (Isolated)'
                      : `${cFmtRect(solved.thevenin0.zEq, 4)} pu`}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Live Fault Solver Control & Current Readout */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Fault Simulation
                </h3>
                <div className="flex items-center gap-1 rounded border border-slate-200 bg-slate-100 p-0.5 text-[11px]">
                  {(
                    [
                      { id: '3ph', label: '3ϕ' },
                      { id: 'slg', label: 'SLG' },
                      { id: 'll', label: 'LL' },
                      { id: 'dlg', label: 'DLG' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() =>
                        setGraph((prev) => ({ ...prev, faultType: f.id as FaultType }))
                      }
                      className={`cursor-pointer rounded px-2 py-0.5 font-semibold ${
                        graph.faultType === f.id
                          ? 'bg-red-700 text-white'
                          : 'text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-600">Fault Impedance R_f (pu)</span>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={graph.rfPu}
                  onChange={(e) =>
                    setGraph((prev) => ({
                      ...prev,
                      rfPu: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  className="w-20 rounded border border-slate-200 px-2 py-1 font-mono tabular-nums text-xs"
                />
              </div>

              {solved.faultResult ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono tabular-nums">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="font-sans text-[11px] text-slate-500">Fault MVA</div>
                      <div className="text-sm font-bold text-slate-950">
                        {solved.faultResult.faultMva.toFixed(1)} MVA
                      </div>
                    </div>
                    <div className="rounded-lg border border-red-200 bg-red-50/70 px-3 py-2">
                      <div className="font-sans text-[11px] text-red-700">Max |I_fault|</div>
                      <div className="text-sm font-bold text-red-900">
                        {solved.faultResult.faultCurrentKa.toFixed(3)} kA
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 font-mono tabular-nums text-[11px] space-y-1 text-slate-800">
                    <div className="flex justify-between">
                      <span>I_base @ {solved.faultBus?.vBaseKv} kV</span>
                      <span>{solved.faultResult.iBaseKa.toFixed(3)} kA</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1">
                      <span>I₀ / I₁ / I₂ (pu)</span>
                      <span>
                        {cMag(solved.faultResult.i0).toFixed(2)} /{' '}
                        {cMag(solved.faultResult.i1).toFixed(2)} /{' '}
                        {cMag(solved.faultResult.i2).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>I_a</span>
                      <span>{cFmtPolar(solved.faultResult.ia, 3)} pu</span>
                    </div>
                    <div className="flex justify-between">
                      <span>I_b</span>
                      <span>{cFmtPolar(solved.faultResult.ib, 3)} pu</span>
                    </div>
                    <div className="flex justify-between">
                      <span>I_c</span>
                      <span>{cFmtPolar(solved.faultResult.ic, 3)} pu</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                  No active Positive-sequence source reaches the selected Fault Bus.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Live Symmetrical & Asymmetrical Fault Current Panel synced with D3 Canvas */}
      <LiveFaultCurrentPanel
        title="Live Symmetrical & Asymmetrical Fault Current Panel"
        z1={solved.thevenin1.zEq}
        z2={solved.thevenin2.zEq}
        z0={solved.thevenin0.zEq}
        z0Open={solved.thevenin0.isOpenCircuit}
        z1Open={solved.thevenin1.isOpenCircuit}
        rfPu={graph.rfPu}
        sBaseMva={graph.sBaseMva}
        vBaseKv={solved.faultBus?.vBaseKv ?? 132}
        faultBusName={solved.faultBus?.name ?? 'Fault Bus'}
        selectedFaultType={graph.faultType}
        onSelectFaultType={(ft) =>
          setGraph((prev) => ({ ...prev, faultType: ft }))
        }
        sourceMode="d3"
        currentGraph={graph}
        historyEntries={historyEntries}
        onAddHistoryEntry={onAddHistoryEntry}
        onClearHistory={onClearHistory}
        onRestoreSimulation={onRestoreSimulation}
      />

      {/* Standalone Quick Per-Unit Base Converter Strip */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-950">
              Quick Per-Unit Base Impedance Formula Check
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              Z_new = Z_old · (S_new / S_old) · (V_old / V_new)²
            </p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-right">
            <div className="text-[10px] font-semibold uppercase text-emerald-800">
              Converted Z_new
            </div>
            <div className="font-mono tabular-nums text-sm font-bold text-emerald-950">
              {qZNew.toFixed(4)} pu
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          {[
            { label: 'Z_old (pu)', val: qZOld, set: setQZOld, step: 0.01 },
            { label: 'S_old (MVA)', val: qSOld, set: setQSOld, step: 5 },
            { label: 'S_new (MVA)', val: qSNew, set: setQSNew, step: 5 },
            { label: 'V_old (kV)', val: qVOld, set: setQVOld, step: 0.5 },
            { label: 'V_new (kV)', val: qVNew, set: setQVNew, step: 0.5 },
          ].map((f) => (
            <div key={f.label}>
              <label className="block text-[11px] text-slate-600 mb-1">{f.label}</label>
              <input
                type="number"
                step={f.step}
                value={f.val}
                onChange={(e) => f.set(Number(e.target.value))}
                className="w-full rounded border border-slate-200 px-2.5 py-1.5 font-mono tabular-nums text-xs"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
