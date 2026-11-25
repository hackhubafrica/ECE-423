import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  RotateCcw,
  XCircle,
} from 'lucide-react';

interface SingularityItem {
  id: string;
  kind: 'pole' | 'zero';
  re: number;
  im: number;
  wn: number;
  zeta: number;
  cornerFreq: number;
  tau: number | null;
  stability: 'Stable (LHP)' | 'Marginal (jω)' | 'Unstable (RHP)';
  bodeEffect: string;
}

interface Preset3D {
  id: string;
  label: string;
  gainK: number;
  sigmaPole: number; // Real part of primary complex pair (negative = LHP)
  omegaPole: number; // Imag part of primary complex pair
  realPole: number | null; // Optional extra real pole
  zeroLoc: number | null; // Optional real zero
  probeOmega: number;
  note: string;
}

const PRESETS_3D: Preset3D[] = [
  {
    id: 'resonant_2nd',
    label: 'Resonant 2nd-Order (Underdamped)',
    gainK: 25,
    sigmaPole: -1.1,
    omegaPole: 4.5,
    realPole: null,
    zeroLoc: null,
    probeOmega: 4.5,
    note: 'Poles near the jω axis produce a sharp 3D peak that slices into a Bode resonance hump and rapid −180° phase drop.',
  },
  {
    id: 'lead_servo',
    label: '3-Pole Servo + Lead Zero',
    gainK: 36,
    sigmaPole: -2.0,
    omegaPole: 3.2,
    realPole: -6.5,
    zeroLoc: -2.2,
    probeOmega: 3.8,
    note: 'Lead zero at −2.2 carves a magnitude valley and lifts phase margin, countering lag from the 3 plant poles.',
  },
  {
    id: 'non_min_phase',
    label: 'Non-Minimum Phase (RHP Zero)',
    gainK: 16,
    sigmaPole: -1.8,
    omegaPole: 3.4,
    realPole: -5.0,
    zeroLoc: 2.8,
    probeOmega: 3.2,
    note: 'Zero at +2.8 lies in the RHP: Bode magnitude matches a LHP zero at −2.8, but phase suffers extra −90° lag!',
  },
  {
    id: 'unstable_rhp',
    label: 'Unstable RHP Pole Crossing',
    gainK: 22,
    sigmaPole: 0.7,
    omegaPole: 3.6,
    realPole: -4.5,
    zeroLoc: null,
    probeOmega: 3.6,
    note: 'Complex poles at +0.7 ± j3.6 cross into the RHP (σ > 0), creating an unstable diverging response.',
  },
];

// Complex polynomial evaluation: H(s) = K * prod(s - z_i) / prod(s - p_k)
function evalTfComplex(
  re: number,
  im: number,
  gainK: number,
  poles: { re: number; im: number }[],
  zeros: { re: number; im: number }[]
): { mag: number; magDb: number; phaseDeg: number } {
  let numRe = gainK;
  let numIm = 0;
  for (const z of zeros) {
    const dr = re - z.re;
    const di = im - z.im;
    const nr = numRe * dr - numIm * di;
    const ni = numRe * di + numIm * dr;
    numRe = nr;
    numIm = ni;
  }

  let denRe = 1;
  let denIm = 0;
  for (const p of poles) {
    const dr = re - p.re;
    const di = im - p.im;
    const nr = denRe * dr - denIm * di;
    const ni = denRe * di + denIm * dr;
    denRe = nr;
    denIm = ni;
  }

  const denMag2 = denRe * denRe + denIm * denIm + 1e-10;
  const hRe = (numRe * denRe + numIm * denIm) / denMag2;
  const hIm = (numIm * denRe - numRe * denIm) / denMag2;
  const mag = Math.hypot(hRe, hIm);
  const magDb = 20 * Math.log10(Math.max(1e-4, Math.min(250, mag)));
  const phaseDeg = (Math.atan2(hIm, hRe) * 180) / Math.PI;
  return { mag, magDb, phaseDeg };
}

// Reusable temp objects to keep render loop allocation-free
const _rayMouse = new THREE.Vector2();
const _color = new THREE.Color();

export const FreqResponse3DSection: React.FC = () => {
  const [presetId, setPresetId] = useState<string>(PRESETS_3D[0].id);
  const [gainK, setGainK] = useState<number>(PRESETS_3D[0].gainK);
  const [sigmaPole, setSigmaPole] = useState<number>(PRESETS_3D[0].sigmaPole);
  const [omegaPole, setOmegaPole] = useState<number>(PRESETS_3D[0].omegaPole);
  const [enableRealPole, setEnableRealPole] = useState<boolean>(false);
  const [realPole, setRealPole] = useState<number>(-5.5);
  const [enableZero, setEnableZero] = useState<boolean>(false);
  const [zeroLoc, setZeroLoc] = useState<number>(-2.2);
  const [probeOmega, setProbeOmega] = useState<number>(PRESETS_3D[0].probeOmega);
  const [sliceAtJw, setSliceAtJw] = useState<boolean>(false);
  const [cameraView, setCameraView] = useState<'iso' | 'bode' | 'top'>('iso');
  const [hoveredItem, setHoveredItem] = useState<SingularityItem | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  // Build normalized pole & zero list
  const { poles, zeros, singularities, isSystemStable } = useMemo(() => {
    const pList: { re: number; im: number }[] = [];
    if (Math.abs(omegaPole) > 0.08) {
      pList.push({ re: sigmaPole, im: omegaPole });
      pList.push({ re: sigmaPole, im: -omegaPole });
    } else {
      pList.push({ re: sigmaPole, im: 0 });
    }
    if (enableRealPole) {
      pList.push({ re: realPole, im: 0 });
    }

    const zList: { re: number; im: number }[] = [];
    if (enableZero) {
      zList.push({ re: zeroLoc, im: 0 });
    }

    const items: SingularityItem[] = [];
    pList.forEach((p, idx) => {
      const wn = Math.hypot(p.re, p.im);
      const zeta = wn > 1e-6 ? -p.re / wn : 0;
      const stability: SingularityItem['stability'] =
        p.re < -0.02
          ? 'Stable (LHP)'
          : p.re > 0.02
          ? 'Unstable (RHP)'
          : 'Marginal (jω)';
      const tau = Math.abs(p.re) > 0.02 ? 1 / Math.abs(p.re) : null;
      const isComplex = Math.abs(p.im) > 0.05;
      const bodeEffect =
        stability === 'Unstable (RHP)'
          ? `RHP pole at σ=+${p.re.toFixed(2)} causes exponential blow-up e^(+${p.re.toFixed(2)}t) and +90° phase lead distortion.`
          : isComplex
          ? `Complex pair (ζ=${zeta.toFixed(2)}) creates resonant peak near ω=${wn.toFixed(2)} rad/s, −40 dB/dec roll-off, −180° phase shift.`
          : `Real pole at ωc=${Math.abs(p.re).toFixed(2)} rad/s adds −20 dB/dec roll-off and −90° phase lag.`;

      items.push({
        id: `pole-${idx}`,
        kind: 'pole',
        re: p.re,
        im: p.im,
        wn,
        zeta,
        cornerFreq: wn,
        tau,
        stability,
        bodeEffect,
      });
    });

    zList.forEach((z, idx) => {
      const wn = Math.hypot(z.re, z.im);
      const stability: SingularityItem['stability'] =
        z.re < -0.02
          ? 'Stable (LHP)'
          : z.re > 0.02
          ? 'Unstable (RHP)'
          : 'Marginal (jω)';
      items.push({
        id: `zero-${idx}`,
        kind: 'zero',
        re: z.re,
        im: z.im,
        wn,
        zeta: wn > 1e-6 ? -z.re / wn : 0,
        cornerFreq: wn,
        tau: Math.abs(z.re) > 0.02 ? 1 / Math.abs(z.re) : null,
        stability,
        bodeEffect:
          z.re > 0.02
            ? `Non-minimum phase RHP zero adds +20 dB/dec slope above ω=${wn.toFixed(2)} rad/s but subtracts −90° phase (destabilizing!).`
            : `Minimum-phase LHP zero adds +20 dB/dec slope and +90° phase lead above ωc=${wn.toFixed(2)} rad/s.`,
      });
    });

    const stable = pList.every((p) => p.re < -1e-3);
    return { poles: pList, zeros: zList, singularities: items, isSystemStable: stable };
  }, [sigmaPole, omegaPole, enableRealPole, realPole, enableZero, zeroLoc]);

  // Compute 2D Bode Magnitude & Phase slice (ω from 0.2 to 20 rad/s along σ = 0)
  const bodeData = useMemo(() => {
    const pts: { w: number; magDb: number; phaseDeg: number }[] = [];
    const nPts = 130;
    const wMin = 0.2;
    const wMax = 20;
    let prevPh: number | null = null;

    // Anchor at low frequency
    const dcEval = evalTfComplex(0, wMin, gainK, poles, zeros);
    let anchor = dcEval.phaseDeg;
    if (anchor > 45) anchor -= 360;

    for (let i = 0; i < nPts; i++) {
      const w = wMin * Math.pow(wMax / wMin, i / (nPts - 1));
      const ev = evalTfComplex(0, w, gainK, poles, zeros);
      let ph = ev.phaseDeg;
      if (prevPh === null) {
        while (ph - anchor > 180) ph -= 360;
        while (ph - anchor < -180) ph += 360;
      } else {
        while (ph - prevPh > 180) ph -= 360;
        while (ph - prevPh < -180) ph += 360;
      }
      prevPh = ph;
      pts.push({
        w: Number(w.toFixed(3)),
        magDb: Number(ev.magDb.toFixed(2)),
        phaseDeg: Number(ph.toFixed(1)),
      });
    }
    return pts;
  }, [gainK, poles, zeros]);

  const probeEval = useMemo(() => {
    return evalTfComplex(0, probeOmega, gainK, poles, zeros);
  }, [probeOmega, gainK, poles, zeros]);

  // Nearest w on log Bode grid for Recharts ReferenceLine
  const nearestBodeProbeW = useMemo(() => {
    if (bodeData.length === 0) return probeOmega;
    let best = bodeData[0].w;
    let bestD = Math.abs(best - probeOmega);
    for (const pt of bodeData) {
      const d = Math.abs(pt.w - probeOmega);
      if (d < bestD) {
        bestD = d;
        best = pt.w;
      }
    }
    return best;
  }, [bodeData, probeOmega]);

  const activeSingularity =
    hoveredItem ||
    singularities.find((s) => s.id === selectedItemId) ||
    singularities[0] ||
    null;

  const nearestHoveredCornerW = useMemo(() => {
    if (!activeSingularity || bodeData.length === 0) return null;
    const target = activeSingularity.cornerFreq;
    if (target < 0.2 || target > 20) return null;
    let best = bodeData[0].w;
    let bestD = Math.abs(best - target);
    for (const pt of bodeData) {
      const d = Math.abs(pt.w - target);
      if (d < bestD) {
        bestD = d;
        best = pt.w;
      }
    }
    return best;
  }, [activeSingularity, bodeData]);

  // =========================================================================
  // THREE.JS SCENE LIFECYCLE & DYNAMIC SURFACE / POLE-ZERO BUILDER
  // =========================================================================
  const sceneStateRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    dynamicGroup: THREE.Group;
    hitTargets: THREE.Mesh[];
    requestRender: () => void;
    cameraTargetPos: THREE.Vector3 | null;
    cameraTargetLook: THREE.Vector3 | null;
  } | null>(null);

  const hoverCallbackRef = useRef(setHoveredItem);
  hoverCallbackRef.current = setHoveredItem;
  const selectCallbackRef = useRef(setSelectedItemId);
  selectCallbackRef.current = setSelectedItemId;

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // Detect software WebGL safely and free context
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param) || '');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('WebGL is unavailable in this browser environment.');
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || 760;
    const height = container.clientHeight || 470;
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError('WebGL context lost. Reload or reset the 3D viewport.');
    };
    const onContextRestored = () => {
      setWebglError(null);
      requestRender();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1120);
    scene.fog = new THREE.FogExp2(0x0b1120, 0.018);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 180);
    camera.position.set(11.5, 9.5, 13.5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 6;
    controls.maxDistance = 36;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(-1.5, 1.5, 0);

    // Three-Point Studio Lighting Rig
    const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x1e293b, 0.75);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff4e6, 1.65);
    keyLight.position.set(10, 16, 12);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rimLight.position.set(-12, 8, -10);
    scene.add(rimLight);

    // Static s-Plane Ground Baseplate (σ in [-9, 4], ω in [-9, 9])
    const staticGroup = new THREE.Group();
    scene.add(staticGroup);

    // LHP plate (σ <= 0)
    const lhpPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 18),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.85,
        metalness: 0.15,
      })
    );
    lhpPlate.rotation.x = -Math.PI / 2;
    lhpPlate.position.set(-4.5, -0.03, 0);
    lhpPlate.receiveShadow = true;
    staticGroup.add(lhpPlate);

    // RHP plate (σ > 0) subtle amber/rose tint
    const rhpPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 18),
      new THREE.MeshStandardMaterial({
        color: 0x2a141d,
        roughness: 0.85,
        metalness: 0.15,
      })
    );
    rhpPlate.rotation.x = -Math.PI / 2;
    rhpPlate.position.set(2.0, -0.028, 0);
    rhpPlate.receiveShadow = true;
    staticGroup.add(rhpPlate);

    // Gridlines on s-plane
    const gridLinesMat = new THREE.LineBasicMaterial({
      color: 0x334155,
      transparent: true,
      opacity: 0.55,
    });
    const gridPts: THREE.Vector3[] = [];
    for (let x = -9; x <= 4; x += 1) {
      gridPts.push(new THREE.Vector3(x, -0.01, -9), new THREE.Vector3(x, -0.01, 9));
    }
    for (let z = -9; z <= 9; z += 1.5) {
      gridPts.push(new THREE.Vector3(-9, -0.01, z), new THREE.Vector3(4, -0.01, z));
    }
    const gridGeo = new THREE.BufferGeometry().setFromPoints(gridPts);
    staticGroup.add(new THREE.LineSegments(gridGeo, gridLinesMat));

    // Glowing jω stability boundary line (σ = 0)
    const jwGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.01, -9),
      new THREE.Vector3(0, 0.01, 9),
    ]);
    const jwAxisLine = new THREE.Line(
      jwGeo,
      new THREE.LineBasicMaterial({ color: 0x34d399 })
    );
    staticGroup.add(jwAxisLine);

    // Real σ axis line (ω = 0)
    const sigmaGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-9, 0.01, 0),
      new THREE.Vector3(4, 0.01, 0),
    ]);
    staticGroup.add(
      new THREE.Line(sigmaGeo, new THREE.LineBasicMaterial({ color: 0x94a3b8 }))
    );

    const dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);

    // On-demand render scheduler (with software WebGL afterDraw pacing)
    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;
    let lastClock = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const poll = () => {
        if (disposed) return;
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        const now = performance.now();
        const delta = Math.min(0.05, Math.max(0.001, (now - lastClock) / 1000));
        lastClock = now;

        const st = sceneStateRef.current;
        let animatingCamera = false;
        if (st && st.cameraTargetPos && st.cameraTargetLook) {
          camera.position.x = THREE.MathUtils.damp(
            camera.position.x,
            st.cameraTargetPos.x,
            6.5,
            delta
          );
          camera.position.y = THREE.MathUtils.damp(
            camera.position.y,
            st.cameraTargetPos.y,
            6.5,
            delta
          );
          camera.position.z = THREE.MathUtils.damp(
            camera.position.z,
            st.cameraTargetPos.z,
            6.5,
            delta
          );
          controls.target.x = THREE.MathUtils.damp(
            controls.target.x,
            st.cameraTargetLook.x,
            6.5,
            delta
          );
          controls.target.y = THREE.MathUtils.damp(
            controls.target.y,
            st.cameraTargetLook.y,
            6.5,
            delta
          );
          controls.target.z = THREE.MathUtils.damp(
            controls.target.z,
            st.cameraTargetLook.z,
            6.5,
            delta
          );
          if (
            camera.position.distanceTo(st.cameraTargetPos) < 0.03 &&
            controls.target.distanceTo(st.cameraTargetLook) < 0.03
          ) {
            st.cameraTargetPos = null;
            st.cameraTargetLook = null;
          } else {
            animatingCamera = true;
          }
        }

        const moved = controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty || moved || animatingCamera) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    controls.addEventListener('start', () => {
      if (sceneStateRef.current) {
        sceneStateRef.current.cameraTargetPos = null;
        sceneStateRef.current.cameraTargetLook = null;
      }
    });
    controls.addEventListener('change', requestRender);

    // Raycasting for pole/zero hover & click (throttled to ~25fps)
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    let lastRay = 0;
    let activeHoverMeshId: string | null = null;

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastRay < 38) return;
      lastRay = now;

      const st = sceneStateRef.current;
      if (!st || st.hitTargets.length === 0) return;

      const rect = renderer.domElement.getBoundingClientRect();
      _rayMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _rayMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(_rayMouse, camera);
      const hits = raycaster.intersectObjects(st.hitTargets, false);
      if (hits.length > 0) {
        const item = hits[0].object.userData.singularity as SingularityItem | undefined;
        if (item && item.id !== activeHoverMeshId) {
          activeHoverMeshId = item.id;
          hoverCallbackRef.current(item);
        }
        renderer.domElement.style.cursor = 'pointer';
      } else {
        if (activeHoverMeshId !== null) {
          activeHoverMeshId = null;
          hoverCallbackRef.current(null);
        }
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const onClick = (e: MouseEvent) => {
      const st = sceneStateRef.current;
      if (!st || st.hitTargets.length === 0) return;
      const rect = renderer.domElement.getBoundingClientRect();
      _rayMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _rayMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_rayMouse, camera);
      const hits = raycaster.intersectObjects(st.hitTargets, false);
      if (hits.length > 0) {
        const item = hits[0].object.userData.singularity as SingularityItem | undefined;
        if (item) selectCallbackRef.current(item.id);
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 760;
      const h = container.clientHeight || 470;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    sceneStateRef.current = {
      scene,
      camera,
      controls,
      dynamicGroup,
      hitTargets: [],
      requestRender,
      cameraTargetPos: null,
      cameraTargetLook: null,
    };

    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      controls.dispose();
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) {
          (obj as THREE.Mesh).geometry.dispose();
        }
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
      renderer.dispose();
      sceneStateRef.current = null;
    };
  }, []);

  // =========================================================================
  // REBUILD 3D SURFACE, BODE SLICE RIBBON, POLES/ZEROS & PHASORS ON STATE CHANGE
  // =========================================================================
  useEffect(() => {
    const st = sceneStateRef.current;
    if (!st) return;

    const { dynamicGroup, requestRender } = st;
    // Dispose old dynamic children
    while (dynamicGroup.children.length > 0) {
      const child = dynamicGroup.children[0];
      dynamicGroup.remove(child);
      child.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) {
          (obj as THREE.Mesh).geometry.dispose();
        }
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
    }
    st.hitTargets = [];

    // 1. Build 3D Laplace Magnitude Surface |H(σ + jω)|_dB -> height Y
    const nx = 60;
    const nz = 60;
    const sigmaMin = -9.0;
    const sigmaMax = sliceAtJw ? 0.0 : 4.0;
    const omegaMin = -9.0;
    const omegaMax = 9.0;

    const dbToHeight = (db: number) => {
      // Map [-36, +40] dB -> [0.05, 5.2] world units
      const clamped = Math.max(-36, Math.min(40, db));
      return 0.05 + ((clamped + 36) / 76) * 5.15;
    };

    const positions = new Float32Array((nx + 1) * (nz + 1) * 3);
    const colors = new Float32Array((nx + 1) * (nz + 1) * 3);
    const indices: number[] = [];

    for (let iz = 0; iz <= nz; iz++) {
      const w = omegaMin + (iz / nz) * (omegaMax - omegaMin);
      for (let ix = 0; ix <= nx; ix++) {
        const sig = sigmaMin + (ix / nx) * (sigmaMax - sigmaMin);
        const ev = evalTfComplex(sig, w, gainK, poles, zeros);
        const y = dbToHeight(ev.magDb);

        const idx = iz * (nx + 1) + ix;
        positions[idx * 3] = sig;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = w;

        // Color ramp: deep indigo valley -> cyan mid -> amber/crimson pole peaks
        const normH = Math.max(0, Math.min(1, (y - 0.05) / 5.15));
        if (sig > 0.02) {
          // Slight warm coral shift in RHP to warn instability
          _color.setHSL(0.06 - normH * 0.06, 0.78, 0.25 + normH * 0.42);
        } else if (normH < 0.48) {
          const t = normH / 0.48;
          _color.setHSL(0.62 - t * 0.08, 0.65, 0.2 + t * 0.26);
        } else {
          const t = (normH - 0.48) / 0.52;
          _color.setHSL(0.54 - t * 0.48, 0.85, 0.46 + t * 0.16);
        }
        colors[idx * 3] = _color.r;
        colors[idx * 3 + 1] = _color.g;
        colors[idx * 3 + 2] = _color.b;
      }
    }

    for (let iz = 0; iz < nz; iz++) {
      for (let ix = 0; ix < nx; ix++) {
        const a = iz * (nx + 1) + ix;
        const b = a + 1;
        const c = a + (nx + 1);
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const surfGeo = new THREE.BufferGeometry();
    surfGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    surfGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    surfGeo.setIndex(indices);
    surfGeo.computeVertexNormals();

    const surfMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.48,
      metalness: 0.12,
      transparent: true,
      opacity: 0.84,
      side: THREE.DoubleSide,
    });
    const surfMesh = new THREE.Mesh(surfGeo, surfMat);
    surfMesh.receiveShadow = true;
    dynamicGroup.add(surfMesh);

    // 2. Vertical Bode Cross-Section Curtain & Glowing Ridge along σ = 0 (ω in [0, 9])
    const bodePts: THREE.Vector3[] = [];
    const curtainVerts: number[] = [];
    const curtainIdx: number[] = [];
    const nBode = 64;
    for (let i = 0; i <= nBode; i++) {
      const w = (i / nBode) * 9.0;
      const ev = evalTfComplex(0, w, gainK, poles, zeros);
      const y = dbToHeight(ev.magDb);
      bodePts.push(new THREE.Vector3(0, y + 0.04, w));
      curtainVerts.push(0, 0.01, w, 0, y, w);
      if (i < nBode) {
        const base = i * 2;
        curtainIdx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
      }
    }

    const curtainGeo = new THREE.BufferGeometry();
    curtainGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(curtainVerts, 3)
    );
    curtainGeo.setIndex(curtainIdx);
    curtainGeo.computeVertexNormals();
    const curtainMesh = new THREE.Mesh(
      curtainGeo,
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    dynamicGroup.add(curtainMesh);

    const bodeCurve = new THREE.CatmullRomCurve3(bodePts);
    const bodeRibbon = new THREE.Mesh(
      new THREE.TubeGeometry(bodeCurve, 72, 0.085, 8, false),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.65,
        roughness: 0.25,
        metalness: 0.3,
      })
    );
    dynamicGroup.add(bodeRibbon);

    // 3. Probe Point on jω axis (s = j*probeOmega) + Geometric Phasors
    const clampedProbeW = Math.min(9.0, Math.max(0.1, probeOmega));
    const probeSurfY = dbToHeight(probeEval.magDb);

    const probePin = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xeab308,
        emissiveIntensity: 0.7,
        roughness: 0.2,
      })
    );
    probePin.position.set(0, probeSurfY + 0.06, clampedProbeW);
    dynamicGroup.add(probePin);

    const probeBase = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.5 })
    );
    probeBase.position.set(0, 0.06, clampedProbeW);
    dynamicGroup.add(probeBase);

    const probeDropLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.06, clampedProbeW),
        new THREE.Vector3(0, probeSurfY + 0.06, clampedProbeW),
      ]),
      new THREE.LineBasicMaterial({ color: 0xfacc15 })
    );
    dynamicGroup.add(probeDropLine);

    // 4. Composite Multi-Part Pole & Zero Markers + Raycast Hit Spheres
    const activeId = activeSingularity?.id ?? null;

    singularities.forEach((item) => {
      const clampedX = Math.max(-8.8, Math.min(3.8, item.re));
      const clampedZ = Math.max(-8.8, Math.min(8.8, item.im));
      const isHighlighted = item.id === activeId;
      const group = new THREE.Group();
      group.position.set(clampedX, 0, clampedZ);

      if (item.kind === 'pole') {
        const isRhp = item.re > 0.02;
        const mainColor = isHighlighted
          ? 0xfef08a
          : isRhp
          ? 0xf43f5e
          : 0xf97316;

        // Part 1: Base collar ring
        const collar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.32, 0.38, 0.09, 20),
          new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            metalness: 0.7,
            roughness: 0.25,
          })
        );
        collar.position.y = 0.045;
        group.add(collar);

        // Part 2: Crossed X-bars on s-plane
        const barMat = new THREE.MeshStandardMaterial({
          color: mainColor,
          emissive: mainColor,
          emissiveIntensity: isHighlighted ? 0.85 : 0.45,
          roughness: 0.25,
          metalness: 0.4,
        });
        const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.09, 0.14), barMat);
        bar1.position.y = 0.12;
        bar1.rotation.y = Math.PI / 4;
        const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.09, 0.14), barMat);
        bar2.position.y = 0.12;
        bar2.rotation.y = -Math.PI / 4;
        group.add(bar1, bar2);

        // Part 3: Vertical spire piercing the magnitude peak
        const spireH = isHighlighted ? 5.65 : 5.35;
        const spire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.075, spireH, 12),
          new THREE.MeshStandardMaterial({
            color: mainColor,
            emissive: mainColor,
            emissiveIntensity: isHighlighted ? 0.7 : 0.3,
            roughness: 0.3,
          })
        );
        spire.position.y = spireH / 2;
        group.add(spire);

        // Part 4: Beacon tip sphere
        const tip = new THREE.Mesh(
          new THREE.SphereGeometry(isHighlighted ? 0.2 : 0.14, 16, 16),
          barMat
        );
        tip.position.y = spireH;
        group.add(tip);

        // Invisible hover collider on Layer 1
        const hitCol = new THREE.Mesh(
          new THREE.CylinderGeometry(0.65, 0.65, 5.8, 12),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        hitCol.position.y = 2.9;
        hitCol.layers.set(1);
        hitCol.userData.singularity = item;
        group.add(hitCol);
        st.hitTargets.push(hitCol);
      } else {
        const zColor = isHighlighted ? 0xa7f3d0 : 0x10b981;
        const zeroMat = new THREE.MeshStandardMaterial({
          color: zColor,
          emissive: zColor,
          emissiveIntensity: isHighlighted ? 0.85 : 0.4,
          roughness: 0.25,
          metalness: 0.45,
        });

        // Torus O-marker + central pin
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.075, 14, 28), zeroMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.12;
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.035, 1.4, 10),
          zeroMat
        );
        stem.position.y = 0.7;
        group.add(ring, stem);

        const hitCol = new THREE.Mesh(
          new THREE.CylinderGeometry(0.6, 0.6, 2.0, 12),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        hitCol.position.y = 1.0;
        hitCol.layers.set(1);
        hitCol.userData.singularity = item;
        group.add(hitCol);
        st.hitTargets.push(hitCol);
      }

      // Draw geometric phasor vector from singularity to probe jω* if highlighted or always subtle
      const phasorColor = item.kind === 'pole' ? 0xfb923c : 0x34d399;
      const phasorLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(clampedX, 0.12, clampedZ),
          new THREE.Vector3(0, 0.12, clampedProbeW),
        ]),
        new THREE.LineBasicMaterial({
          color: phasorColor,
          transparent: true,
          opacity: isHighlighted ? 0.95 : 0.4,
        })
      );
      dynamicGroup.add(phasorLine);
      dynamicGroup.add(group);
    });

    requestRender();
  }, [gainK, poles, zeros, singularities, probeOmega, probeEval.magDb, sliceAtJw, activeSingularity]);

  // Smoothly animate camera view presets
  const handleSelectCameraView = (view: 'iso' | 'bode' | 'top') => {
    setCameraView(view);
    const st = sceneStateRef.current;
    if (!st) return;
    if (view === 'iso') {
      st.cameraTargetPos = new THREE.Vector3(11.5, 9.5, 13.5);
      st.cameraTargetLook = new THREE.Vector3(-1.5, 1.5, 0);
    } else if (view === 'bode') {
      st.cameraTargetPos = new THREE.Vector3(14.0, 3.8, 3.8);
      st.cameraTargetLook = new THREE.Vector3(0.0, 2.4, 3.8);
    } else {
      st.cameraTargetPos = new THREE.Vector3(-2.0, 18.0, 0.01);
      st.cameraTargetLook = new THREE.Vector3(-2.0, 0.0, 0);
    }
    st.requestRender();
  };

  const applyPreset = (p: Preset3D) => {
    setPresetId(p.id);
    setGainK(p.gainK);
    setSigmaPole(p.sigmaPole);
    setOmegaPole(p.omegaPole);
    setEnableRealPole(p.realPole !== null);
    if (p.realPole !== null) setRealPole(p.realPole);
    setEnableZero(p.zeroLoc !== null);
    if (p.zeroLoc !== null) setZeroLoc(p.zeroLoc);
    setProbeOmega(p.probeOmega);
    setSelectedItemId(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Split: Controls + 3D Laplace Surface Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Controls */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-950">
                3D Pole-Zero &amp; Laplace Controls
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Drag poles across σ = 0 to watch Bode &amp; stability shift
              </p>
            </div>
            <button
              type="button"
              onClick={() => applyPreset(PRESETS_3D[0])}
              className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Presets */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-slate-700">System Presets</div>
            <div className="grid grid-cols-1 gap-1.5">
              {PRESETS_3D.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-left text-xs font-medium transition-colors ${
                    presetId === p.id
                      ? 'border-sky-500 bg-sky-50/70 text-sky-950 font-semibold'
                      : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Complex Pole Pair Sliders */}
          <div className="space-y-3 border-t border-slate-100 pt-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between">
                <label htmlFor="p3d-sigma" className="font-semibold text-slate-900">
                  Real Part σ (Stability Axis)
                </label>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    sigmaPole >= 0 ? 'text-red-700' : 'text-emerald-700'
                  }`}
                >
                  {sigmaPole >= 0 ? `+${sigmaPole.toFixed(2)}` : sigmaPole.toFixed(2)}
                </span>
              </div>
              <input
                id="p3d-sigma"
                type="range"
                min={-6.0}
                max={2.5}
                step={0.1}
                value={sigmaPole}
                onChange={(e) => setSigmaPole(parseFloat(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <label htmlFor="p3d-omega" className="font-semibold text-slate-900">
                  Imaginary Freq ±jω_d
                </label>
                <span className="font-mono font-bold text-sky-700 tabular-nums">
                  ±j{omegaPole.toFixed(2)} rad/s
                </span>
              </div>
              <input
                id="p3d-omega"
                type="range"
                min={0.0}
                max={8.0}
                step={0.1}
                value={omegaPole}
                onChange={(e) => setOmegaPole(parseFloat(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <label htmlFor="p3d-gain" className="font-semibold text-slate-900">
                  Overall Gain K
                </label>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {gainK.toFixed(1)}
                </span>
              </div>
              <input
                id="p3d-gain"
                type="range"
                min={1}
                max={80}
                step={1}
                value={gainK}
                onChange={(e) => setGainK(parseFloat(e.target.value))}
                className="w-full accent-slate-700 cursor-pointer"
              />
            </div>
          </div>

          {/* Optional Extra Pole & Zero */}
          <div className="space-y-2.5 border-t border-slate-100 pt-3 text-xs">
            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="font-semibold text-slate-800">Extra Real Pole</span>
              <input
                type="checkbox"
                checked={enableRealPole}
                onChange={(e) => setEnableRealPole(e.target.checked)}
                className="accent-sky-600"
              />
            </label>
            {enableRealPole && (
              <div className="space-y-1">
                <div className="flex justify-between font-mono text-[11px] text-slate-600">
                  <span>s_p3 = {realPole.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={-8.5}
                  max={1.5}
                  step={0.1}
                  value={realPole}
                  onChange={(e) => setRealPole(parseFloat(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>
            )}

            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="font-semibold text-slate-800">Add Transfer Zero</span>
              <input
                type="checkbox"
                checked={enableZero}
                onChange={(e) => setEnableZero(e.target.checked)}
                className="accent-emerald-600"
              />
            </label>
            {enableZero && (
              <div className="space-y-1">
                <div className="flex justify-between font-mono text-[11px] text-emerald-700">
                  <span>s_z1 = {zeroLoc >= 0 ? `+${zeroLoc.toFixed(2)} (RHP)` : zeroLoc.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={-8.0}
                  max={4.0}
                  step={0.1}
                  value={zeroLoc}
                  onChange={(e) => setZeroLoc(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* jω Probe Frequency */}
          <div className="space-y-1.5 border-t border-slate-100 pt-3 text-xs">
            <div className="flex justify-between">
              <label htmlFor="p3d-probe" className="font-semibold text-amber-800">
                jω* Bode Probe Frequency
              </label>
              <span className="font-mono font-bold text-amber-700 tabular-nums">
                ω* = {probeOmega.toFixed(2)} rad/s
              </span>
            </div>
            <input
              id="p3d-probe"
              type="range"
              min={0.3}
              max={9.0}
              step={0.1}
              value={probeOmega}
              onChange={(e) => setProbeOmega(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="font-mono text-[11px] text-slate-600 tabular-nums">
              |H(jω*)| = {probeEval.magDb.toFixed(1)} dB · ∠H(jω*) = {probeEval.phaseDeg.toFixed(1)}°
            </div>
          </div>
        </div>

        {/* Right 3D Canvas Viewport & Hover Stability Inspector */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative rounded-xl border border-slate-200 bg-slate-950 overflow-hidden">
            {/* Top Minimal Telemetry Ribbon inside Viewport */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-200">
              <div className="flex items-center gap-2.5">
                <span className="font-semibold text-white">
                  3D |H(σ + jω)| Surface &amp; jω Bode Slice
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span
                  className={`inline-flex items-center gap-1 font-mono font-semibold ${
                    isSystemStable ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isSystemStable ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>All Poles LHP (Stable)</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3.5 w-3.5" />
                      <span>RHP Singularity (Unstable)</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSliceAtJw((v) => !v)}
                  className={`cursor-pointer inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                    sliceAtJw
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  <span>{sliceAtJw ? 'Sliced at σ ≤ 0' : 'Slice at jω Wall'}</span>
                </button>
                <div className="inline-flex items-center rounded bg-slate-800 p-0.5 text-[11px]">
                  {[
                    { id: 'iso', label: '3D Iso' },
                    { id: 'bode', label: 'jω Bode View' },
                    { id: 'top', label: 'Top s-Plane' },
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleSelectCameraView(v.id as typeof cameraView)}
                      className={`cursor-pointer rounded px-2 py-0.5 font-semibold whitespace-nowrap ${
                        cameraView === v.id
                          ? 'bg-slate-600 text-white'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dedicated WebGL Mount Container */}
            <div className="relative h-[430px] w-full">
              {webglError ? (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-amber-300">
                  <div className="space-y-2 max-w-md">
                    <AlertTriangle className="h-6 w-6 mx-auto" />
                    <p>{webglError}</p>
                  </div>
                </div>
              ) : (
                <div
                  ref={canvasMountRef}
                  className="h-full w-full"
                  aria-label="Interactive 3D Laplace Magnitude Surface and Pole-Zero Plot"
                />
              )}

              {/* Bottom-Left Compact Legend (No backdrop-blur over WebGL) */}
              <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-[11px] text-slate-200 space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-orange-400">× Pole (LHP)</span>
                  <span className="font-mono text-rose-400">× Pole (RHP)</span>
                  <span className="font-mono text-emerald-400">○ Zero</span>
                  <span className="font-mono text-sky-400">━ jω Bode Slice</span>
                  <span className="font-mono text-amber-300">● Probe ω*</span>
                </div>
                <div className="text-slate-400">
                  Drag to orbit · Scroll to zoom · Hover any pole/zero spire to inspect stability
                </div>
              </div>
            </div>
          </div>

          {/* Pole/Zero Hover Stability Inspector Bar */}
          {activeSingularity && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-slate-950">
                    {hoveredItem ? 'Hovered' : 'Selected'}{' '}
                    {activeSingularity.kind === 'pole' ? 'Pole (×)' : 'Zero (○)'}:
                  </span>
                  <span className="font-mono font-bold text-sky-800 tabular-nums">
                    s = {activeSingularity.re.toFixed(2)}
                    {Math.abs(activeSingularity.im) > 0.02
                      ? ` ${activeSingularity.im >= 0 ? '+' : '−'} j${Math.abs(activeSingularity.im).toFixed(2)}`
                      : ''}
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span
                    className={`font-semibold ${
                      activeSingularity.stability === 'Stable (LHP)'
                        ? 'text-emerald-700'
                        : activeSingularity.stability === 'Unstable (RHP)'
                        ? 'text-red-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {activeSingularity.stability}
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-600 tabular-nums">
                  ωₙ = {activeSingularity.wn.toFixed(2)} rad/s · ζ ={' '}
                  {activeSingularity.zeta.toFixed(2)}
                  {activeSingularity.tau !== null
                    ? ` · τ = ${activeSingularity.tau.toFixed(2)}s`
                    : ''}
                </div>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {activeSingularity.bodeEffect}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Synchronized 2D Bode Magnitude & Phase Plots Linked to 3D Pole-Zero Geometry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-950">
                Corresponding Bode Magnitude |H(jω)| (dB)
              </h3>
              <p className="text-xs text-slate-500">
                Matches the cyan σ = 0 ridge · Orange line marks hovered pole corner ω_c
              </p>
            </div>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bodeData} margin={{ top: 8, right: 16, left: 0, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="w"
                  type="number"
                  scale="log"
                  domain={[0.2, 20]}
                  ticks={[0.2, 0.5, 1, 2, 5, 10, 20]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v) => `${v}dB`}
                  width={46}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelFormatter={(l) => `ω = ${Number(l).toFixed(2)} rad/s`}
                  formatter={(value) => [
                    `${typeof value === 'number' ? value.toFixed(2) : String(value ?? '')} dB`,
                    '|H(jω)|',
                  ]}
                />
                <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4" />
                <ReferenceLine x={nearestBodeProbeW} stroke="#eab308" strokeDasharray="3 3" />
                {nearestHoveredCornerW !== null && (
                  <ReferenceLine
                    x={nearestHoveredCornerW}
                    stroke="#f97316"
                    strokeDasharray="4 2"
                    label={{
                      value: `ωc=${activeSingularity?.cornerFreq.toFixed(1)}`,
                      position: 'insideTopRight',
                      fontSize: 10,
                      fill: '#ea580c',
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="magDb"
                  stroke="#0284c7"
                  strokeWidth={2.4}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-950">
                Corresponding Bode Phase ∠H(jω) (deg)
              </h3>
              <p className="text-xs text-slate-500">
                Sum of zero phasor angles minus pole phasor angles along jω
              </p>
            </div>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bodeData} margin={{ top: 8, right: 16, left: 0, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="w"
                  type="number"
                  scale="log"
                  domain={[0.2, 20]}
                  ticks={[0.2, 0.5, 1, 2, 5, 10, 20]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v) => `${v}°`}
                  width={46}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelFormatter={(l) => `ω = ${Number(l).toFixed(2)} rad/s`}
                  formatter={(value) => [
                    `${typeof value === 'number' ? value.toFixed(1) : String(value ?? '')}°`,
                    '∠H(jω)',
                  ]}
                />
                <ReferenceLine y={-180} stroke="#dc2626" strokeDasharray="4 4" />
                <ReferenceLine x={nearestBodeProbeW} stroke="#eab308" strokeDasharray="3 3" />
                {nearestHoveredCornerW !== null && (
                  <ReferenceLine x={nearestHoveredCornerW} stroke="#f97316" strokeDasharray="4 2" />
                )}
                <Line
                  type="monotone"
                  dataKey="phaseDeg"
                  stroke="#059669"
                  strokeWidth={2.4}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
