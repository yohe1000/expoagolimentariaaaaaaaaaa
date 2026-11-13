import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Compass,
  Play,
  Square,
  ChevronDown,
  ChevronUp,
  Eye,
  RotateCcw,
  Box,
} from 'lucide-react';
import {
  VENUE_DIMENSIONS,
  STAND_TYPE_META,
  STAND_STATUS_META,
  StandStatus,
} from '../config/venue';
import { PublicStandView } from '../data/store';

export type CameraPresetId =
  | 'general'
  | 'entrada'
  | 'exposicion'
  | 'conferencias'
  | 'automotriz'
  | 'agroecologico';

export interface Maquette3DStats {
  triangles: number;
  drawCalls: number;
  geometries: number;
  textures: number;
  isSoftwareGl: boolean;
  dpr: number;
}

declare global {
  interface Window {
    __MAQUETTE_3D_STATS__?: Maquette3DStats;
  }
}

interface Maquette3DCanvasProps {
  stands: PublicStandView[];
  filteredCodes: Set<string>;
  selectedStandCode: string | null;
  onSelectStand: (code: string | null) => void;
  onStatsUpdate?: (stats: Maquette3DStats) => void;
}

// Coordinate mapping from Salón de Exposiciones local meters (0..38, 0..21.5) to centered 3D World meters
const SALON_ORIGIN_X = -19.0; // Salón spans X: -19.0 to +19.0 (38.0m)
const SALON_ORIGIN_Z = -24.0; // Salón spans Z: -24.0 to -2.5 (21.5m)

// Coordinate mapping from Expoauto lot meters (0..68, 0..32) to 3D World meters
const EXPOAUTO_ORIGIN_X = -38.0;
const EXPOAUTO_ORIGIN_Z = -2.0;

function getStandWorldCenter(stand: PublicStandView): { wx: number; wz: number; w: number; d: number } {
  if (stand.zone_id === 'zone-exposicion') {
    const wx = SALON_ORIGIN_X + stand.x + stand.width / 2;
    const wz = SALON_ORIGIN_Z + stand.z + stand.depth / 2;
    return { wx, wz, w: stand.width, d: stand.depth };
  } else {
    // Map the 8 Expoauto zones accurately around the front courtyard & Conference Hall
    const num = parseInt(stand.code.replace('EA-0', ''), 10);
    const layoutMap: Record<number, { wx: number; wz: number; w: number; d: number }> = {
      1: { wx: 21.0, wz: 19.0, w: 12.0, d: 14.0 }, // Right of main entrance (170 m²)
      2: { wx: -3.0, wz: 22.0, w: 10.0, d: 10.0 }, // Front row right (100 m²)
      3: { wx: -13.5, wz: 22.0, w: 10.0, d: 10.0 }, // Front row mid-right (100 m²)
      4: { wx: -24.0, wz: 22.0, w: 10.0, d: 10.0 }, // Front row mid-left (100 m²)
      5: { wx: -34.5, wz: 22.0, w: 10.0, d: 10.0 }, // Front row far-left (100 m²)
      6: { wx: -33.5, wz: 8.5, w: 11.0, d: 10.0 }, // Upper perimeter left (110 m²)
      7: { wx: -21.5, wz: 6.5, w: 11.5, d: 12.0 }, // Upper perimeter center (140 m²)
      8: { wx: -9.5, wz: 5.5, w: 11.5, d: 14.5 }, // Next to Conference Hall (170 m²)
    };
    return (
      layoutMap[num] || {
        wx: EXPOAUTO_ORIGIN_X + stand.x * 0.85,
        wz: EXPOAUTO_ORIGIN_Z + stand.z * 0.85,
        w: stand.width,
        d: stand.depth,
      }
    );
  }
}

const CAMERA_PRESETS: Record<
  CameraPresetId,
  { label: string; pos: [number, number, number]; target: [number, number, number] }
> = {
  general: {
    label: 'Vista general',
    pos: [0, 42, 62],
    target: [-2, 0, 4],
  },
  entrada: {
    label: 'Entrada',
    pos: [8, 12, 48],
    target: [6, 2, 24],
  },
  exposicion: {
    label: 'Salón de exposición',
    pos: [-2, 23, 2],
    target: [0, 1, -13.25],
  },
  conferencias: {
    label: 'Conferencias',
    pos: [24, 16, 24],
    target: [8, 2.5, 6.5],
  },
  automotriz: {
    label: 'Automotriz',
    pos: [-22, 24, 42],
    target: [-18, 1, 15],
  },
  agroecologico: {
    label: 'Agroecológico',
    pos: [-14, 15, 64],
    target: [0, 1.5, 43],
  },
};

// Reusable scratch math objects at module scope (zero GC in render loop)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();

/**
 * Creates a crisp procedural CanvasTexture for a stand's top plaque / sign.
 */
function createStandPlaqueTexture(
  stand: PublicStandView,
  isSelected: boolean,
  isFilteredOut: boolean,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const status: StandStatus = stand.effective_status;
  const typeMeta = STAND_TYPE_META[stand.type];

  // Background fill by status and official Cenexpo type color
  let bgHex = typeMeta.color;
  let headerHex = '#0F3D22';
  let textHex = '#1F2421';
  let badgeText = 'DISPONIBLE';

  if (status === 'vendido') {
    bgHex = '#1F4E9C';
    headerHex = '#092552';
    textHex = '#FFFFFF';
    badgeText = 'VENDIDO';
  } else if (status === 'reservado') {
    bgHex = '#E8A317';
    headerHex = '#7A4F04';
    textHex = '#1F2421';
    badgeText = 'RESERVADO 48H';
  } else if (status === 'bloqueado') {
    bgHex = '#9AA59F';
    headerHex = '#49504C';
    textHex = '#FFFFFF';
    badgeText = 'BLOQUEADO';
  } else {
    headerHex = '#2F9E44';
    badgeText = stand.price_usd ? `$${stand.price_usd} BCV` : 'DISPONIBLE';
  }

  ctx.fillStyle = isFilteredOut ? '#CFD6D2' : bgHex;
  ctx.fillRect(0, 0, 256, 128);

  // Top status ribbon
  ctx.fillStyle = isSelected ? '#F4C20D' : headerHex;
  ctx.fillRect(0, 0, 256, 34);

  // Border frame
  ctx.lineWidth = isSelected ? 8 : 4;
  ctx.strokeStyle = isSelected ? '#F4C20D' : '#1F2421';
  ctx.strokeRect(2, 2, 252, 124);

  // Status badge text in header
  ctx.fillStyle = isSelected ? '#1F2421' : '#FFFFFF';
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, 128, 18);

  // Stand Code (large & bold)
  ctx.fillStyle = isFilteredOut ? '#6E7571' : textHex;
  ctx.font = '900 44px sans-serif';
  ctx.fillText(stand.code, 128, 72);

  // Subtitle: Exhibitor name (if sold) or Area m²
  const subLabel = stand.exhibitor?.name
    ? stand.exhibitor.name.slice(0, 20).toUpperCase()
    : `${stand.area_m2} m² · ${stand.width}×${stand.depth}m`;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = status === 'vendido' ? '#F4C20D' : textHex;
  ctx.fillText(subLabel, 128, 108);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Creates a procedural banner texture for architecture labels (Show Bisnet, Casino Entrance, etc.)
 */
function createBannerTexture(
  title: string,
  subtitle: string,
  bgHex: string,
  fgHex: string,
  accentHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 120);

  ctx.fillStyle = fgHex;
  ctx.font = '900 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 256, 48);

  ctx.fillStyle = accentHex;
  ctx.font = 'bold 21px sans-serif';
  ctx.fillText(subtitle, 256, 92);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Builds a composite 6-part 3D agro-industrial truck / tractor (`THREE.Group`) for Expoauto zones
 */
function createCompositeAgroVehicle(bodyColorHex: string, isTractor: boolean): THREE.Group {
  const group = new THREE.Group();

  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0x222624,
    roughness: 0.75,
    metalness: 0.35,
  });
  const bodyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(bodyColorHex),
    roughness: 0.32,
    metalness: 0.45,
  });
  const cabGlassMat = new THREE.MeshStandardMaterial({
    color: 0x1a2c38,
    roughness: 0.12,
    metalness: 0.85,
  });
  const cargoMat = new THREE.MeshStandardMaterial({
    color: 0xeef2ef,
    roughness: 0.65,
    metalness: 0.15,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0xf4c20d,
    roughness: 0.25,
    metalness: 0.7,
  });

  // 1. Contact shadow disc on ground
  const shadowGeo = new THREE.CircleGeometry(2.8, 20);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x0a140e,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.position.y = 0.02;
  group.add(shadowMesh);

  if (isTractor) {
    // Primary hull: Tractor engine + chassis
    const engine = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 2.8), bodyMat);
    engine.position.set(0, 1.0, 0.4);
    group.add(engine);

    // Secondary read: Operator cab canopy
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 1.5), cabGlassMat);
    cab.position.set(0, 2.0, -0.4);
    group.add(cab);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.16, 1.7), cargoMat);
    roof.position.set(0, 2.7, -0.4);
    group.add(roof);

    // 4 wheels (large rear, medium front)
    const rearWheelGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.45, 16);
    rearWheelGeo.rotateZ(Math.PI / 2);
    const frontWheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.35, 16);
    frontWheelGeo.rotateZ(Math.PI / 2);

    [-0.95, 0.95].forEach((wx) => {
      const rw = new THREE.Mesh(rearWheelGeo, chassisMat);
      rw.position.set(wx, 0.75, -0.55);
      group.add(rw);

      const fw = new THREE.Mesh(frontWheelGeo, chassisMat);
      fw.position.set(wx * 0.9, 0.48, 1.35);
      group.add(fw);
    });

    // Accent detail: exhaust stack + front grille
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 8), chassisMat);
    exhaust.position.set(0.55, 1.9, 0.9);
    group.add(exhaust);

    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.08), accentMat);
    grille.position.set(0, 1.0, 1.82);
    group.add(grille);
  } else {
    // Heavy Agro-Cargo Truck (Mack / DFT style)
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.4, 5.4), chassisMat);
    frame.position.set(0, 0.55, 0);
    group.add(frame);

    // Cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.65, 1.7), bodyMat);
    cab.position.set(0, 1.55, 1.7);
    group.add(cab);

    // Windshield visor
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.65, 0.1), cabGlassMat);
    windshield.position.set(0, 1.85, 2.53);
    group.add(windshield);

    // Cargo Box
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.1, 3.4), cargoMat);
    cargo.position.set(0, 1.8, -0.95);
    group.add(cargo);

    // 6 Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.32, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    [-1.05, 1.05].forEach((wx) => {
      [1.8, -0.6, -1.8].forEach((wz) => {
        const w = new THREE.Mesh(wheelGeo, chassisMat);
        w.position.set(wx, 0.48, wz);
        group.add(w);
      });
    });

    // Headlight & grille trim
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.32, 0.18), accentMat);
    bumper.position.set(0, 0.65, 2.6);
    group.add(bumper);
  }

  return group;
}

export const Maquette3DCanvas: React.FC<Maquette3DCanvasProps> = ({
  stands,
  filteredCodes,
  selectedStandCode,
  onSelectStand,
  onStatsUpdate,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [activePreset, setActivePreset] = useState<CameraPresetId>('general');
  const [isWalkthroughActive, setIsWalkthroughActive] = useState(false);
  const [walkthroughStepLabel, setWalkthroughStepLabel] = useState<string>('');
  const [showRoofCutaway, setShowRoofCutaway] = useState(true);
  const [isHudCollapsed, setIsHudCollapsed] = useState(false);
  const [stats, setStats] = useState<Maquette3DStats | null>(null);

  // Keep latest props & callbacks in refs so React UI updates never recreate the WebGL context
  const onSelectStandRef = useRef(onSelectStand);
  onSelectStandRef.current = onSelectStand;

  const onStatsUpdateRef = useRef(onStatsUpdate);
  onStatsUpdateRef.current = onStatsUpdate;

  const sceneApiRef = useRef<{
    flyToPreset: (preset: CameraPresetId) => void;
    flyToStand: (code: string) => void;
    startWalkthrough: () => void;
    stopWalkthrough: () => void;
    setRoofVisible: (visible: boolean) => void;
    updateStandsVisuals: (
      standsData: PublicStandView[],
      filteredSet: Set<string>,
      selectedCode: string | null
    ) => void;
  } | null>(null);

  // Initialize WebGLRenderer & Scene once on mount
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // 1. Software-WebGL Detection from GPU renderer string (per threejs skill)
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Respect user performance budget: dpr up to 1.5 (1.0 on software WebGL)
    const appliedDpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(appliedDpr);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const initialW = container.clientWidth || 800;
    const initialH = container.clientHeight || 520;
    renderer.setSize(initialW, initialH);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.setAttribute('data-testid', 'maquette-3d-canvas');

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    // 2. Scene, Horizon Fog & Studio RoomEnvironment
    const scene = new THREE.Scene();
    const skyHorizonColor = new THREE.Color('#DCE4DF');
    scene.background = skyHorizonColor;
    scene.fog = new THREE.Fog(skyHorizonColor, 75, 195);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Camera & OrbitControls
    const camera = new THREE.PerspectiveCamera(42, initialW / initialH, 0.5, 260);
    camera.position.set(...CAMERA_PRESETS.general.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMERA_PRESETS.general.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.04; // Never clip below ground
    controls.minDistance = 6;
    controls.maxDistance = 125;
    controls.update();

    // 4. Studio Warm/Cool Lighting Rig (<= 1 shadow caster)
    const hemiLight = new THREE.HemisphereLight(0xeef2ef, 0x2b2e1e, 0.95);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4dc, 1.65);
    keyLight.position.set(36, 52, 38);
    keyLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -55;
      keyLight.shadow.camera.right = 55;
      keyLight.shadow.camera.top = 55;
      keyLight.shadow.camera.bottom = -55;
      keyLight.shadow.camera.near = 5;
      keyLight.shadow.camera.far = 140;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xcbe0f5, 0.55);
    rimLight.position.set(-40, 28, -35);
    scene.add(rimLight);

    // -------------------------------------------------------------------------
    // 5. BUILD CASINO MILITAR DE LA GRITA 3D ARCHITECTURE (EXACT METERS)
    // -------------------------------------------------------------------------

    // A. Extended Andean Valley Terrain & Natural Mountain Perimeter
    const terrainGeo = new THREE.PlaneGeometry(280, 280, 1, 1);
    terrainGeo.rotateX(-Math.PI / 2);
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0xcfd8d2,
      roughness: 0.92,
      metalness: 0.02,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.position.y = -0.06;
    scene.add(terrain);

    // Low-poly Andean Mountain Ridges on North/East/West horizon
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x1e462b,
      roughness: 0.88,
      metalness: 0.05,
    });
    const mountainPeaks = [
      { x: -65, z: -78, r: 42, h: 28 },
      { x: -15, z: -85, r: 48, h: 34 },
      { x: 42, z: -80, r: 44, h: 30 },
      { x: 85, z: -45, r: 38, h: 24 },
      { x: -85, z: -38, r: 36, h: 22 },
    ];
    mountainPeaks.forEach((pk) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(pk.r, pk.h, 7), mountainMat);
      cone.position.set(pk.x, pk.h / 2 - 0.5, pk.z);
      scene.add(cone);
    });

    // Instanced Andean Trees around the venue perimeter (28 trees = 1 InstancedMesh for trunks + 1 for canopies)
    const treeCoords = [
      [-45, -26], [-45, -14], [-45, -2], [-45, 10], [-45, 22],
      [26, -26], [28, -12], [28, 2], [32, 16], [32, 26],
      [-32, -30], [-18, -30], [-4, -30], [10, -30], [22, -30],
      [-38, 42], [-26, 44], [-14, 45], [14, 45], [26, 44],
      [-36, 52], [-20, 53], [0, 54], [20, 53],
    ];
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.32, 1.8, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4028, roughness: 0.9 });
    const canopyGeo = new THREE.ConeGeometry(1.65, 3.8, 8);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x246332, roughness: 0.78 });

    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCoords.length);
    const canopyInst = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCoords.length);

    treeCoords.forEach(([tx, tz], i) => {
      const scaleVar = 0.88 + ((i * 17) % 25) / 100;
      _pos.set(tx, 0.9 * scaleVar, tz);
      _quat.identity();
      _scale.set(scaleVar, scaleVar, scaleVar);
      _mat4.compose(_pos, _quat, _scale);
      trunkInst.setMatrixAt(i, _mat4);

      _pos.set(tx, 3.1 * scaleVar, tz);
      _mat4.compose(_pos, _quat, _scale);
      canopyInst.setMatrixAt(i, _mat4);
      canopyInst.setColorAt(
        i,
        _color.setHex(i % 2 === 0 ? 0x1e7a34 : 0x2d6a3e)
      );
    });
    trunkInst.instanceMatrix.needsUpdate = true;
    canopyInst.instanceMatrix.needsUpdate = true;
    if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;
    trunkInst.computeBoundingSphere();
    canopyInst.computeBoundingSphere();
    scene.add(trunkInst);
    scene.add(canopyInst);

    // B. Calle Vía Llano Los Zambranos (South Front Roadway: Z = 30.5 to 37.5)
    const roadGeo = new THREE.PlaneGeometry(110, 7.5);
    roadGeo.rotateX(-Math.PI / 2);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x383d3b,
      roughness: 0.85,
      metalness: 0.08,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.position.set(-4, 0.01, 34.0);
    scene.add(roadMesh);

    // Road dashed center stripe
    const stripeGeo = new THREE.PlaneGeometry(3.2, 0.22);
    stripeGeo.rotateX(-Math.PI / 2);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf4c20d });
    const stripeInst = new THREE.InstancedMesh(stripeGeo, stripeMat, 14);
    for (let i = 0; i < 14; i++) {
      _pos.set(-46 + i * 7, 0.025, 34.0);
      _quat.identity();
      _scale.set(1, 1, 1);
      _mat4.compose(_pos, _quat, _scale);
      stripeInst.setMatrixAt(i, _mat4);
    }
    stripeInst.instanceMatrix.needsUpdate = true;
    stripeInst.computeBoundingSphere();
    scene.add(stripeInst);

    // Street name ground plaque
    const streetTex = createBannerTexture(
      'CALLE VÍA LLANO LOS ZAMBRANOS',
      'ACCESO ÚNICO AL CASINO MILITAR DE LA GRITA (1.440 m s. n. m.)',
      '#1F2421',
      '#EEF2EF',
      '#F4C20D',
      maxAnisotropy
    );
    const streetSignGeo = new THREE.PlaneGeometry(18, 3.2);
    streetSignGeo.rotateX(-Math.PI / 2);
    const streetSign = new THREE.Mesh(
      streetSignGeo,
      new THREE.MeshBasicMaterial({ map: streetTex })
    );
    streetSign.position.set(6.0, 0.03, 34.0);
    scene.add(streetSign);

    // C. ZONE 4: Entrada y Salida Única (Main Archway & Check-in QR Gate at X=6.0, Z=29.5)
    const gateGroup = new THREE.Group();
    gateGroup.position.set(6.0, 0, 29.5);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x0f3d22,
      roughness: 0.5,
      metalness: 0.2,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf4c20d,
      roughness: 0.3,
      metalness: 0.6,
    });

    const leftGatePillar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 5.2, 0.9), pillarMat);
    leftGatePillar.position.set(-4.2, 2.6, 0);
    gateGroup.add(leftGatePillar);

    const rightGatePillar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 5.2, 0.9), pillarMat);
    rightGatePillar.position.set(4.2, 2.6, 0);
    gateGroup.add(rightGatePillar);

    const gateHeader = new THREE.Mesh(new THREE.BoxGeometry(9.6, 1.5, 1.1), pillarMat);
    gateHeader.position.set(0, 5.4, 0);
    gateGroup.add(gateHeader);

    const gateBannerTex = createBannerTexture(
      '4. ENTRADA Y SALIDA · CASINO MILITAR',
      'EXPO AGROALIMENTARIA LA GRITA 2026 · CHECK-IN PASE QR',
      '#0F3D22',
      '#FFFFFF',
      '#F4C20D',
      maxAnisotropy
    );
    const gateBanner = new THREE.Mesh(
      new THREE.PlaneGeometry(9.2, 1.35),
      new THREE.MeshBasicMaterial({ map: gateBannerTex })
    );
    gateBanner.position.set(0, 5.4, 0.57);
    gateGroup.add(gateBanner);

    const gateBannerBack = gateBanner.clone();
    gateBannerBack.rotation.y = Math.PI;
    gateBannerBack.position.set(0, 5.4, -0.57);
    gateGroup.add(gateBannerBack);

    scene.add(gateGroup);

    // D. ZONE 5: Salón Agroecológico (Across the street, Z = 40.5 to 50.0)
    const agroGroup = new THREE.Group();
    agroGroup.position.set(0, 0, 44.5);

    const agroPad = new THREE.Mesh(
      new THREE.BoxGeometry(30, 0.12, 10),
      new THREE.MeshStandardMaterial({ color: 0xd7e3d4, roughness: 0.85 })
    );
    agroPad.position.y = 0.06;
    agroGroup.add(agroPad);

    // 4 Pitched White Agroecological Tents (composite group: 4 legs + pyramidal canopy + bio-bed)
    const tentRoofMat = new THREE.MeshStandardMaterial({
      color: 0xfafcfa,
      roughness: 0.45,
      metalness: 0.1,
    });
    const soilBedMat = new THREE.MeshStandardMaterial({
      color: 0x4e3620,
      roughness: 0.95,
    });
    const cropMat = new THREE.MeshStandardMaterial({
      color: 0x2f9e44,
      roughness: 0.65,
    });

    [-10.5, -3.5, 3.5, 10.5].forEach((tx) => {
      const tentRoof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.8, 4), tentRoofMat);
      tentRoof.rotation.y = Math.PI / 4;
      tentRoof.position.set(tx, 3.4, 0);
      agroGroup.add(tentRoof);

      // Soil regeneration demo bed inside each tent
      const bed = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.45, 2.2), soilBedMat);
      bed.position.set(tx, 0.28, 0);
      agroGroup.add(bed);

      const cropStrip = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.25, 1.8), cropMat);
      cropStrip.position.set(tx, 0.62, 0);
      agroGroup.add(cropStrip);
    });

    const agroSignTex = createBannerTexture(
      '5. SALÓN AGROECOLÓGICO (FRENTE A LA VÍA)',
      'REGENERACIÓN DE SUELOS · APICULTURA · BIOINSUMOS',
      '#1E7A34',
      '#FFFFFF',
      '#F4C20D',
      maxAnisotropy
    );
    const agroSign = new THREE.Mesh(
      new THREE.PlaneGeometry(11.5, 2.1),
      new THREE.MeshBasicMaterial({ map: agroSignTex, side: THREE.DoubleSide })
    );
    agroSign.position.set(0, 4.9, -3.8);
    agroGroup.add(agroSign);
    scene.add(agroGroup);

    // E. ZONE 2: Salón de Conferencias y Rueda de Negocios (22.0m x 18.0m = 396 m², 3 stories)
    // Positioned in front of the Exhibition Hall: X from -3.0 to +19.0 (22.0m), Z from -2.5 to +15.5 (18.0m)
    const confGroup = new THREE.Group();
    const confX = 8.0; // center of [-3.0, +19.0]
    const confZ = 6.5; // center of [-2.5, +15.5]
    const confW = VENUE_DIMENSIONS.CONF_HALL.width; // 22.0m
    const confL = VENUE_DIMENSIONS.CONF_HALL.length; // 18.0m

    const confFloor = new THREE.Mesh(
      new THREE.BoxGeometry(confW, 0.18, confL),
      new THREE.MeshStandardMaterial({ color: 0xf6eac2, roughness: 0.75 })
    );
    confFloor.position.set(confX, 0.09, confZ);
    confGroup.add(confFloor);

    // Low perimeter cutaway walls for Conference Hall so interior auditorium & B2B tables are visible
    const confWallMat = new THREE.MeshStandardMaterial({
      color: 0xfde488,
      roughness: 0.6,
      metalness: 0.1,
    });
    const confEastWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.2, confL), confWallMat);
    confEastWall.position.set(confX + confW / 2, 1.6, confZ);
    confGroup.add(confEastWall);

    const confWestWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.2, confL - 4), confWallMat);
    confWestWall.position.set(confX - confW / 2, 1.1, confZ);
    confGroup.add(confWestWall);

    // Entrance Porch (Marquesina 6.0m x 5.0m at South facade of Conference Hall)
    const porchRoof = new THREE.Mesh(
      new THREE.BoxGeometry(
        VENUE_DIMENSIONS.CONF_HALL.porchWidth,
        0.35,
        VENUE_DIMENSIONS.CONF_HALL.porchDepth
      ),
      goldMat
    );
    porchRoof.position.set(confX - 1.5, 3.4, confZ + confL / 2 + 2.5);
    confGroup.add(porchRoof);

    // Conference stage + lectern inside Conference Hall
    const confStage = new THREE.Mesh(
      new THREE.BoxGeometry(8.5, 0.45, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x0f3d22, roughness: 0.5 })
    );
    confStage.position.set(confX + 4.5, 0.3, confZ - 5.5);
    confGroup.add(confStage);

    // Conference Hall overhead banner
    const confBannerTex = createBannerTexture(
      '2. SALÓN DE CONFERENCIAS Y RUEDA DE NEGOCIOS',
      'EDIFICIO PRINCIPAL CASINO MILITAR · 22,0 × 18,0 m (396 m²)',
      '#1F4E9C',
      '#FFFFFF',
      '#F4C20D',
      maxAnisotropy
    );
    const confBanner = new THREE.Mesh(
      new THREE.PlaneGeometry(13.5, 2.4),
      new THREE.MeshBasicMaterial({ map: confBannerTex, side: THREE.DoubleSide })
    );
    confBanner.position.set(confX, 5.2, confZ);
    confGroup.add(confBanner);
    scene.add(confGroup);

    // F. ZONE 1: Salón de Exposición (38.0m x 21.5m = 817 m², height 6.5m, 51 Stands + 7 Round Tables + Show Bisnet)
    const hallGroup = new THREE.Group();
    const hallW = VENUE_DIMENSIONS.HALL_W; // 38.0m
    const hallL = VENUE_DIMENSIONS.HALL_L; // 21.5m
    const hallCenterZ = SALON_ORIGIN_Z + hallL / 2; // -13.25m

    // Main polished exhibition floor slab
    const hallFloor = new THREE.Mesh(
      new THREE.BoxGeometry(hallW + 0.6, 0.16, hallL + 0.6),
      new THREE.MeshStandardMaterial({
        color: 0xeef1f4,
        roughness: 0.65,
        metalness: 0.08,
      })
    );
    hallFloor.position.set(0, 0.08, hallCenterZ);
    hallFloor.receiveShadow = !isSoftwareGl;
    hallGroup.add(hallFloor);

    // Perimeter Architectural Walls (North wall, East wall behind Show Bisnet, West wall with 3.0m entrance door)
    const hallWallMat = new THREE.MeshStandardMaterial({
      color: 0xdce2e6,
      roughness: 0.7,
      metalness: 0.1,
    });
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(hallW, 3.2, 0.3), hallWallMat);
    northWall.position.set(0, 1.6, SALON_ORIGIN_Z - 0.15);
    hallGroup.add(northWall);

    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.5, hallL), hallWallMat);
    eastWall.position.set(SALON_ORIGIN_X + hallW + 0.15, 2.25, hallCenterZ);
    hallGroup.add(eastWall);

    // West wall split for the official 3.0m entrance/exit opening (ENTRANCE_DOOR_Z = 16.5m)
    const westWallNorth = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.2, 14.8), hallWallMat);
    westWallNorth.position.set(SALON_ORIGIN_X - 0.15, 1.6, SALON_ORIGIN_Z + 7.4);
    hallGroup.add(westWallNorth);

    // Structural Pillars along the south row (matching bottomPillarsX in StandPlan2D)
    const bottomPillarsX = [0.0, 5.0, 10.0, 15.0, 20.0, 25.0, 31.5];
    const pillarGeo = new THREE.BoxGeometry(0.45, 3.4, 0.45);
    const hallPillarMat = new THREE.MeshStandardMaterial({ color: 0x5a5d58, roughness: 0.6 });
    bottomPillarsX.forEach((px) => {
      const p = new THREE.Mesh(pillarGeo, hallPillarMat);
      p.position.set(SALON_ORIGIN_X + px, 1.7, SALON_ORIGIN_Z + 18.5);
      hallGroup.add(p);
    });

    // SHOW BISNET Stage (Right side of Exhibition Hall: x = 31.5 to 38.0m -> width 6.5m, length 18.5m = 120.25 m²)
    const sbW = VENUE_DIMENSIONS.SHOW_BISNET.width; // 6.5m
    const sbL = VENUE_DIMENSIONS.SHOW_BISNET.length; // 18.5m
    const sbWorldX = SALON_ORIGIN_X + VENUE_DIMENSIONS.SHOW_BISNET.xMin + sbW / 2; // 15.75m
    const sbWorldZ = SALON_ORIGIN_Z + sbL / 2; // -14.75m

    const stageDeck = new THREE.Mesh(
      new THREE.BoxGeometry(sbW - 0.2, 0.55, sbL - 0.2),
      new THREE.MeshStandardMaterial({
        color: 0xe8c5b8,
        roughness: 0.5,
        metalness: 0.15,
      })
    );
    stageDeck.position.set(sbWorldX, 0.35, sbWorldZ);
    hallGroup.add(stageDeck);

    // Show Bisnet LED Backdrop Screen & Truss Frame
    const ledBannerTex = createBannerTexture(
      'TARIMA SHOW BISNET',
      '6,50 × 18,50 m (120,25 m²) · PONENCIAS Y SHOW DE MARCAS',
      '#0F3D22',
      '#FFFFFF',
      '#F4C20D',
      maxAnisotropy
    );
    const ledScreen = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 3.4, 9.5),
      new THREE.MeshBasicMaterial({ map: ledBannerTex })
    );
    ledScreen.position.set(SALON_ORIGIN_X + 37.6, 2.35, sbWorldZ);
    hallGroup.add(ledScreen);

    // 7 Round Networking Tables + 42 Chairs (InstancedMesh) in ROUND_TABLES_ZONE (x = 25.0..31.5m)
    const roundTablesCoords = [
      { id: 1, x: 26.4, z: 6.2 },
      { id: 2, x: 26.4, z: 9.8 },
      { id: 3, x: 26.4, z: 13.4 },
      { id: 4, x: 29.1, z: 4.5 },
      { id: 5, x: 29.1, z: 8.1 },
      { id: 6, x: 29.1, z: 11.7 },
      { id: 7, x: 29.1, z: 15.3 },
    ];
    const tableTopGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.08, 18);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.1,
    });
    const tableInst = new THREE.InstancedMesh(tableTopGeo, tableMat, roundTablesCoords.length);

    const chairGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.48, 10);
    const chairMat = new THREE.MeshStandardMaterial({
      color: 0x1f4e9c,
      roughness: 0.6,
    });
    const chairInst = new THREE.InstancedMesh(chairGeo, chairMat, roundTablesCoords.length * 6);

    let chairIdx = 0;
    roundTablesCoords.forEach((tb, tIdx) => {
      const twx = SALON_ORIGIN_X + tb.x;
      const twz = SALON_ORIGIN_Z + tb.z;
      _pos.set(twx, 0.78, twz);
      _quat.identity();
      _scale.set(1, 1, 1);
      _mat4.compose(_pos, _quat, _scale);
      tableInst.setMatrixAt(tIdx, _mat4);

      for (let c = 0; c < 6; c++) {
        const rad = (c * 60 * Math.PI) / 180;
        _pos.set(twx + Math.cos(rad) * 1.18, 0.26, twz + Math.sin(rad) * 1.18);
        _mat4.compose(_pos, _quat, _scale);
        chairInst.setMatrixAt(chairIdx++, _mat4);
      }
    });
    tableInst.instanceMatrix.needsUpdate = true;
    chairInst.instanceMatrix.needsUpdate = true;
    tableInst.computeBoundingSphere();
    chairInst.computeBoundingSphere();
    hallGroup.add(tableInst);
    hallGroup.add(chairInst);

    // Optional Cutaway Roof Trusses over Salón de Exposición (HALL_H = 6.5m)
    const roofGroup = new THREE.Group();
    const trussGeo = new THREE.BoxGeometry(hallW, 0.22, 0.22);
    const trussMat = new THREE.MeshStandardMaterial({
      color: 0x3b423e,
      roughness: 0.4,
      metalness: 0.7,
      transparent: true,
      opacity: 0.45,
    });
    for (let zOff = 0; zOff <= hallL; zOff += 4.3) {
      const beam = new THREE.Mesh(trussGeo, trussMat);
      beam.position.set(0, VENUE_DIMENSIONS.HALL_H, SALON_ORIGIN_Z + zOff);
      roofGroup.add(beam);
    }
    roofGroup.visible = false; // default cutaway true => roof hidden for unobstructed stand inspection
    hallGroup.add(roofGroup);

    scene.add(hallGroup);

    // G. ZONE 3: Expoauto Asphalt Pad + 4 Composite 3D Agro-Industrial Vehicles
    const expoautoPad = new THREE.Mesh(
      new THREE.BoxGeometry(44, 0.1, 28),
      new THREE.MeshStandardMaterial({ color: 0xd8dee2, roughness: 0.85 })
    );
    expoautoPad.position.set(-19, 0.04, 15);
    scene.add(expoautoPad);

    const demoVehicles = [
      { x: 21.0, z: 18.5, rot: -0.35, color: '#B23A2E', tractor: false }, // Zone EA-01 Mack truck
      { x: -13.5, z: 22.0, rot: 0.2, color: '#1E7A34', tractor: true },  // Zone EA-03 Tractor
      { x: -33.5, z: 8.5, rot: 0.8, color: '#F4C20D', tractor: true },   // Zone EA-06 Tractor
      { x: -9.5, z: 5.5, rot: -0.25, color: '#1F4E9C', tractor: false }, // Zone EA-08 Cargo truck
    ];
    demoVehicles.forEach((v) => {
      const veh = createCompositeAgroVehicle(v.color, v.tractor);
      veh.position.set(v.x, 0.08, v.z);
      veh.rotation.y = v.rot;
      scene.add(veh);
    });

    // -------------------------------------------------------------------------
    // 6. INSTANCED STAND SHELLS + INTERACTIVE PLAQUES FOR ALL 59 SPACES
    // -------------------------------------------------------------------------
    const salonStandsList = stands.filter((s) => s.zone_id === 'zone-exposicion');
    const standShellGeo = new THREE.BoxGeometry(1, 1, 1);
    const standShellMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.55,
      metalness: 0.12,
    });
    // 51 interior booth partition structures rendered via 1 InstancedMesh (back wall + counter + carpet)
    const carpetInst = new THREE.InstancedMesh(standShellGeo, standShellMat, salonStandsList.length);
    const backWallInst = new THREE.InstancedMesh(standShellGeo, standShellMat, salonStandsList.length);
    const counterInst = new THREE.InstancedMesh(standShellGeo, standShellMat, salonStandsList.length);

    salonStandsList.forEach((st, idx) => {
      const { wx, wz, w, d } = getStandWorldCenter(st);
      const h = VENUE_DIMENSIONS.STAND_HEIGHT; // 2.4m

      // 1. Floor carpet pad
      _pos.set(wx, 0.19, wz);
      _quat.identity();
      _scale.set(w - 0.08, 0.06, d - 0.08);
      _mat4.compose(_pos, _quat, _scale);
      carpetInst.setMatrixAt(idx, _mat4);

      // 2. Back partition wall based on `facing`
      const backZ = st.facing === '+z' ? wz - d / 2 + 0.08 : wz + d / 2 - 0.08;
      _pos.set(wx, h / 2 + 0.16, backZ);
      _scale.set(w - 0.06, h, 0.12);
      _mat4.compose(_pos, _quat, _scale);
      backWallInst.setMatrixAt(idx, _mat4);

      // 3. Reception counter at front corner
      const frontZ = st.facing === '+z' ? wz + d / 2 - 0.35 : wz - d / 2 + 0.35;
      _pos.set(wx - w * 0.22, 0.62, frontZ);
      _scale.set(0.85, 0.9, 0.42);
      _mat4.compose(_pos, _quat, _scale);
      counterInst.setMatrixAt(idx, _mat4);
    });

    carpetInst.instanceMatrix.needsUpdate = true;
    backWallInst.instanceMatrix.needsUpdate = true;
    counterInst.instanceMatrix.needsUpdate = true;
    carpetInst.computeBoundingSphere();
    backWallInst.computeBoundingSphere();
    counterInst.computeBoundingSphere();
    scene.add(carpetInst);
    scene.add(backWallInst);
    scene.add(counterInst);

    // Interactive pickable stand boxes + crisp overhead CanvasTexture plaques for all 59 spaces
    const interactableMeshes: THREE.Mesh[] = [];
    const standMeshMap = new Map<
      string,
      {
        hitbox: THREE.Mesh;
        plaque: THREE.Mesh;
        plaqueMat: THREE.MeshBasicMaterial;
        borderMesh: THREE.Mesh;
        borderMat: THREE.MeshStandardMaterial;
        salonIdx: number | null;
      }
    >();

    const plaqueGeo = new THREE.PlaneGeometry(1, 1);
    plaqueGeo.rotateX(-Math.PI / 2);

    const hitboxGeo = new THREE.BoxGeometry(1, 1, 1);

    let salonCounter = 0;
    stands.forEach((st) => {
      const { wx, wz, w, d } = getStandWorldCenter(st);
      const isSalon = st.zone_id === 'zone-exposicion';
      const h = isSalon ? VENUE_DIMENSIONS.STAND_HEIGHT : 0.45;
      const currentSalonIdx = isSalon ? salonCounter++ : null;

      // Translucent volume / pad for selection highlight & raycasting
      const borderMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(STAND_TYPE_META[st.type].color),
        roughness: 0.45,
        metalness: 0.15,
        transparent: true,
        opacity: isSalon ? 0.32 : 0.78,
      });
      const borderMesh = new THREE.Mesh(hitboxGeo, borderMat);
      borderMesh.scale.set(w - 0.12, isSalon ? h * 0.85 : 0.22, d - 0.12);
      borderMesh.position.set(wx, isSalon ? h * 0.42 + 0.16 : 0.18, wz);
      borderMesh.userData = { standCode: st.code };
      scene.add(borderMesh);
      interactableMeshes.push(borderMesh);

      // Top horizontal plaque with code, price, status & exhibitor
      const tex = createStandPlaqueTexture(st, false, false, maxAnisotropy);
      const plaqueMat = new THREE.MeshBasicMaterial({
        map: tex,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
      const plaqueW = isSalon ? w - 0.16 : Math.min(w * 0.78, 8.5);
      const plaqueD = isSalon ? d - 0.16 : Math.min(d * 0.65, 5.5);
      plaque.scale.set(plaqueW, 1, plaqueD);
      plaque.position.set(wx, isSalon ? h + 0.2 : 0.32, wz);
      plaque.userData = { standCode: st.code };
      scene.add(plaque);
      interactableMeshes.push(plaque);

      standMeshMap.set(st.code, {
        hitbox: borderMesh,
        plaque,
        plaqueMat,
        borderMesh,
        borderMat,
        salonIdx: currentSalonIdx,
      });
    });

    // Selection Beacon Ring (floats gently above the currently selected stand)
    const ringGeo = new THREE.RingGeometry(0.9, 1.35, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf4c20d,
      side: THREE.DoubleSide,
    });
    const selectionRing = new THREE.Mesh(ringGeo, ringMat);
    selectionRing.visible = false;
    scene.add(selectionRing);

    // -------------------------------------------------------------------------
    // 7. ON-DEMAND RENDERING, CAMERA TRANSITIONS & "RECORRIDO" PATH
    // -------------------------------------------------------------------------
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let isDisposed = false;

    // Active smooth camera transition state
    let transitionActive = false;
    const desiredCamPos = new THREE.Vector3(...CAMERA_PRESETS.general.pos);
    const desiredTarget = new THREE.Vector3(...CAMERA_PRESETS.general.target);

    // "Recorrido" guided camera path along the official visitor route
    let walkthroughActive = false;
    let walkthroughProgress = 0;
    let lastTickTime = performance.now();

    const walkthroughPosCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(10, 14, 48),   // 1. Calle Vía Llano Los Zambranos
      new THREE.Vector3(6, 7.5, 26),   // 2. Entrada única Casino Militar
      new THREE.Vector3(-16, 14, 24),  // 3. Vista hacia Expoauto (8 zonas)
      new THREE.Vector3(6, 10, 11),    // 4. Salón de Conferencias y Rueda de Negocios
      new THREE.Vector3(-12, 11, -5),  // 5. Entrada al Salón de Exposición (Stands 01-09 & Isla B / B05)
      new THREE.Vector3(0, 12, -13),   // 6. Islas centrales Turquesa (10 al 51)
      new THREE.Vector3(11, 11, -13),  // 7. Mesas de Negocios y Tarima Show Bisnet
      new THREE.Vector3(0, 42, 62),    // 8. Regreso a Vista General
    ]);

    const walkthroughLookCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(6, 2, 29),
      new THREE.Vector3(6, 2, 12),
      new THREE.Vector3(-20, 1.5, 14),
      new THREE.Vector3(8, 2, 4),
      new THREE.Vector3(-6, 1.5, -12),
      new THREE.Vector3(0, 1.5, -15),
      new THREE.Vector3(15.5, 2, -14),
      new THREE.Vector3(-2, 0, 4),
    ]);

    function afterDraw(cb: () => void) {
      if (isDisposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (sync && state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function publishRenderStats() {
      const nextStats: Maquette3DStats = {
        triangles: renderer.info.render.triangles,
        drawCalls: renderer.info.render.calls,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        isSoftwareGl,
        dpr: appliedDpr,
      };
      window.__MAQUETTE_3D_STATS__ = nextStats;
      setStats((prev) => {
        if (prev && prev.triangles === nextStats.triangles && prev.drawCalls === nextStats.drawCalls) {
          return prev;
        }
        return nextStats;
      });
      onStatsUpdateRef.current?.(nextStats);
    }

    function requestRender() {
      if (isDisposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        if (isDisposed) return;
        renderDirty = false;
        const dt = Math.min((now - lastTickTime) / 1000, 0.1);
        lastTickTime = now;

        if (walkthroughActive) {
          walkthroughProgress += dt * 0.075; // ~13.3 seconds full guided tour
          if (walkthroughProgress >= 1) {
            walkthroughProgress = 1;
            walkthroughActive = false;
            setIsWalkthroughActive(false);
            setWalkthroughStepLabel('');
          } else {
            if (walkthroughProgress < 0.18) {
              setWalkthroughStepLabel('1/5 · Calle Vía Llano Los Zambranos → Entrada Casino Militar');
            } else if (walkthroughProgress < 0.36) {
              setWalkthroughStepLabel('2/5 · Área Festival Automotriz Expoauto (8 zonas)');
            } else if (walkthroughProgress < 0.55) {
              setWalkthroughStepLabel('3/5 · Salón de Conferencias y Rueda de Negocios (396 m²)');
            } else if (walkthroughProgress < 0.80) {
              setWalkthroughStepLabel('4/5 · Salón de Exposición: 51 Stands e Isla B (B05)');
            } else {
              setWalkthroughStepLabel('5/5 · Zona de 7 Mesas B2B y Tarima Show Bisnet');
            }
          }
          walkthroughPosCurve.getPointAt(walkthroughProgress, camera.position);
          walkthroughLookCurve.getPointAt(walkthroughProgress, controls.target);
          controls.update();
          renderDirty = walkthroughActive;
        } else if (transitionActive) {
          const alpha = isSoftwareGl ? 0.38 : 1 - Math.exp(-8 * Math.max(dt, 0.016));
          camera.position.lerp(desiredCamPos, alpha);
          controls.target.lerp(desiredTarget, alpha);
          controls.update();

          if (
            camera.position.distanceToSquared(desiredCamPos) < 0.08 &&
            controls.target.distanceToSquared(desiredTarget) < 0.08
          ) {
            camera.position.copy(desiredCamPos);
            controls.target.copy(desiredTarget);
            controls.update();
            transitionActive = false;
          } else {
            renderDirty = true;
          }
        } else {
          controls.update();
        }

        renderer.render(scene, camera);
        publishRenderStats();

        const done = () => {
          renderBusy = false;
          if (renderDirty && !isDisposed) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    // Cancel scripted transitions when user grabs OrbitControls manually
    const onControlStart = () => {
      transitionActive = false;
      if (walkthroughActive) {
        walkthroughActive = false;
        setIsWalkthroughActive(false);
        setWalkthroughStepLabel('');
      }
    };
    const onControlChange = () => {
      requestRender();
    };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('change', onControlChange);

    // Pre-compile shaders on hardware GPUs
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting on pointer click/tap (distinguish click from drag)
    const raycaster = new THREE.Raycaster();
    const pointerDownPos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos.x = e.clientX;
      pointerDownPos.y = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (dx * dx + dy * dy > 36) return; // dragged orbit controls

      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const hits = raycaster.intersectObjects(interactableMeshes, false);
      if (hits.length > 0) {
        const hitCode = hits[0].object.userData?.standCode;
        if (hitCode) {
          onSelectStandRef.current(hitCode);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // Responsive ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
          requestRender();
        }
      }
    });
    resizeObserver.observe(container);

    // Expose scene API to React controls
    sceneApiRef.current = {
      flyToPreset: (presetId: CameraPresetId) => {
        const p = CAMERA_PRESETS[presetId];
        if (!p) return;
        walkthroughActive = false;
        setIsWalkthroughActive(false);
        setWalkthroughStepLabel('');
        desiredCamPos.set(...p.pos);
        desiredTarget.set(...p.target);
        transitionActive = true;
        lastTickTime = performance.now();
        requestRender();
      },
      flyToStand: (code: string) => {
        const st = stands.find((s) => s.code.toUpperCase() === code.toUpperCase());
        if (!st) return;
        const { wx, wz, w } = getStandWorldCenter(st);
        walkthroughActive = false;
        setIsWalkthroughActive(false);
        setWalkthroughStepLabel('');
        const dist = st.zone_id === 'zone-exposicion' ? 11.5 : 22.0;
        desiredTarget.set(wx, 1.2, wz);
        desiredCamPos.set(wx + (w > 5 ? 6 : 2.5), dist, wz + dist * 0.85);
        transitionActive = true;
        lastTickTime = performance.now();
        requestRender();
      },
      startWalkthrough: () => {
        transitionActive = false;
        walkthroughActive = true;
        walkthroughProgress = 0;
        lastTickTime = performance.now();
        setIsWalkthroughActive(true);
        requestRender();
      },
      stopWalkthrough: () => {
        walkthroughActive = false;
        setIsWalkthroughActive(false);
        setWalkthroughStepLabel('');
        requestRender();
      },
      setRoofVisible: (visible: boolean) => {
        roofGroup.visible = visible;
        requestRender();
      },
      updateStandsVisuals: (
        standsData: PublicStandView[],
        filteredSet: Set<string>,
        selectedCode: string | null
      ) => {
        let selectedFound = false;

        standsData.forEach((st) => {
          const entry = standMeshMap.get(st.code);
          if (!entry) return;
          const isSelected = selectedCode?.toUpperCase() === st.code.toUpperCase();
          const isFilteredOut = !filteredSet.has(st.code);

          // Update plaque texture
          const oldTex = entry.plaqueMat.map;
          const newTex = createStandPlaqueTexture(st, isSelected, isFilteredOut, maxAnisotropy);
          entry.plaqueMat.map = newTex;
          entry.plaqueMat.opacity = isFilteredOut ? 0.35 : 1.0;
          entry.plaqueMat.transparent = isFilteredOut;
          entry.plaqueMat.needsUpdate = true;
          if (oldTex) oldTex.dispose();

          // Update 3D box tint by status
          let tintHex = STAND_TYPE_META[st.type].color;
          if (st.effective_status === 'vendido') tintHex = '#1F4E9C';
          else if (st.effective_status === 'reservado') tintHex = '#E8A317';
          else if (st.effective_status === 'bloqueado') tintHex = '#9AA59F';

          entry.borderMat.color.set(isSelected ? '#F4C20D' : tintHex);
          entry.borderMat.opacity = isFilteredOut
            ? 0.12
            : isSelected
            ? 0.88
            : st.zone_id === 'zone-exposicion'
            ? 0.35
            : 0.78;

          if (entry.salonIdx !== null) {
            _color.set(isFilteredOut ? '#CFD6D2' : tintHex);
            carpetInst.setColorAt(entry.salonIdx, _color);
            _color.set(isSelected ? '#F4C20D' : isFilteredOut ? '#E2E6E4' : '#FFFFFF');
            backWallInst.setColorAt(entry.salonIdx, _color);
            counterInst.setColorAt(entry.salonIdx, _color);
          }

          if (isSelected) {
            selectedFound = true;
            const { wx, wz, w, d } = getStandWorldCenter(st);
            const ringScale = Math.max(w, d) * 0.55;
            selectionRing.scale.set(ringScale, ringScale, 1);
            selectionRing.position.set(
              wx,
              st.zone_id === 'zone-exposicion' ? VENUE_DIMENSIONS.STAND_HEIGHT + 0.28 : 0.42,
              wz
            );
            selectionRing.visible = true;
          }
        });

        if (!selectedFound) {
          selectionRing.visible = false;
        }
        if (carpetInst.instanceColor) carpetInst.instanceColor.needsUpdate = true;
        if (backWallInst.instanceColor) backWallInst.instanceColor.needsUpdate = true;
        if (counterInst.instanceColor) counterInst.instanceColor.needsUpdate = true;

        requestRender();
      },
    };

    // Initial stands visual sync & first frame render
    sceneApiRef.current.updateStandsVisuals(stands, filteredCodes, selectedStandCode);
    requestRender();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('change', onControlChange);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Re-sync stand textures, colors, and filters whenever `stands`, `filteredCodes`, or `selectedStandCode` changes
  useEffect(() => {
    sceneApiRef.current?.updateStandsVisuals(stands, filteredCodes, selectedStandCode);
  }, [stands, filteredCodes, selectedStandCode]);

  // Focus camera when selectedStandCode changes to a valid stand
  useEffect(() => {
    if (selectedStandCode) {
      sceneApiRef.current?.flyToStand(selectedStandCode);
    }
  }, [selectedStandCode]);

  const handleSelectPreset = (presetId: CameraPresetId) => {
    setActivePreset(presetId);
    sceneApiRef.current?.flyToPreset(presetId);
  };

  const handleToggleWalkthrough = () => {
    if (isWalkthroughActive) {
      sceneApiRef.current?.stopWalkthrough();
    } else {
      sceneApiRef.current?.startWalkthrough();
    }
  };

  const handleToggleRoof = () => {
    const nextCutaway = !showRoofCutaway;
    setShowRoofCutaway(nextCutaway);
    sceneApiRef.current?.setRoofVisible(!nextCutaway);
  };

  return (
    <div
      data-testid="maquette-3d-root"
      className="relative w-full overflow-hidden rounded-[12px] border border-[#1F2421]/20 bg-[#DCE4DF]"
    >
      {/* Top-Left Minimal Spec & Telemetry Badge (No backdrop-filter over WebGL, no pulsating dots) */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-[4px] border border-[#1F2421]/20 bg-[#0F3D22] px-3 py-1.5 text-[12px] font-semibold text-[#EEF2EF] shadow-sm">
          <Box className="h-3.5 w-3.5 text-[#F4C20D]" aria-hidden="true" />
          <span>Maqueta 3D · Casino Militar (Escala 1:1 en metros)</span>
          {stats && (
            <span className="hidden sm:inline font-mono text-[11px] text-[#F4C20D] tabular-nums">
              · {stats.triangles.toLocaleString('es-VE')} triángulos · DPR {stats.dpr}
            </span>
          )}
        </div>

        {walkthroughStepLabel && (
          <div className="inline-flex items-center gap-2 rounded-[4px] border border-[#F4C20D] bg-[#1F2421] px-3 py-1.5 text-[12px] font-bold text-[#F4C20D]">
            <span>{walkthroughStepLabel}</span>
          </div>
        )}
      </div>

      {/* Dedicated isolated WebGL Canvas Mount Container */}
      <div
        ref={canvasMountRef}
        className="h-[360px] sm:h-[540px] lg:h-[600px] w-full cursor-grab active:cursor-grabbing"
        aria-label="Visor interactivo 3D de la maqueta del Casino Militar de La Grita"
      />

      {/* Unified Collapsible Bottom Control Dock (Zero Side-Panel Clutter, Zero backdrop-filter, No double-transform) */}
      <div className="relative sm:absolute sm:bottom-3 sm:left-3 sm:right-3 z-10 mx-auto w-full sm:w-auto max-w-[920px]">
        {/* Collapse / Expand Tab (desktop overlay toggle) */}
        <div className="hidden sm:flex justify-center">
          <button
            type="button"
            onClick={() => setIsHudCollapsed((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-t-[6px] border border-b-0 border-[#1F2421]/25 bg-[#0F3D22] px-3.5 py-1 text-[12px] font-semibold text-[#EEF2EF] hover:bg-[#1E7A34]"
          >
            {isHudCollapsed ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 text-[#F4C20D]" aria-hidden="true" />
                Mostrar controles 3D
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5 text-[#F4C20D]" aria-hidden="true" />
                Ocultar controles
              </>
            )}
          </button>
        </div>

        {/* Main Dock Body */}
        {!isHudCollapsed && (
          <div className="rounded-b-[10px] sm:rounded-[8px] border-t sm:border border-[#1F2421]/25 bg-[#0F3D22] p-2.5 text-[#EEF2EF] shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* 6 Camera Presets */}
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Vistas de cámara 3D">
                <span className="mr-1 hidden xl:inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#F4C20D]">
                  <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                  Cámara:
                </span>
                {(Object.keys(CAMERA_PRESETS) as CameraPresetId[]).map((presetKey) => {
                  const preset = CAMERA_PRESETS[presetKey];
                  const isActive = activePreset === presetKey && !isWalkthroughActive;
                  return (
                    <button
                      key={presetKey}
                      type="button"
                      data-testid={`preset-btn-${presetKey}`}
                      onClick={() => handleSelectPreset(presetKey)}
                      className={`min-h-[34px] rounded-[4px] px-2.5 py-1 text-[12px] font-semibold transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-[#F4C20D] text-[#1F2421]'
                          : 'bg-[#144A29] text-[#EEF2EF] hover:bg-[#1E7A34]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Action buttons: Recorrido + Cutaway Roof + Reset */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  data-testid="walkthrough-btn"
                  onClick={handleToggleWalkthrough}
                  className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-[4px] px-3 py-1 text-[12px] font-bold transition-colors whitespace-nowrap ${
                    isWalkthroughActive
                      ? 'bg-[#B23A2E] text-white'
                      : 'bg-[#1E7A34] text-white hover:bg-[#2F9E44]'
                  }`}
                >
                  {isWalkthroughActive ? (
                    <>
                      <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      Detener recorrido
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      Recorrido
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleToggleRoof}
                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-[4px] border border-[#EEF2EF]/20 bg-[#144A29] px-2.5 py-1 text-[12px] font-semibold text-[#EEF2EF] hover:bg-[#1E7A34] whitespace-nowrap"
                >
                  <Eye className="h-3.5 w-3.5 text-[#F4C20D]" aria-hidden="true" />
                  {showRoofCutaway ? 'Estructura techo' : 'Corte interior'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('general')}
                  aria-label="Restablecer vista general"
                  className="inline-flex min-h-[34px] items-center gap-1 rounded-[4px] border border-[#EEF2EF]/20 bg-[#144A29] px-2.5 py-1 text-[12px] font-semibold text-[#EEF2EF] hover:bg-[#1E7A34]"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Quick 4-Status Legend Strip inside the bottom dock */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF2EF]/15 pt-2 text-[11px] text-[#EEF2EF]/90">
              <div className="flex flex-wrap items-center gap-3">
                {(Object.keys(STAND_STATUS_META) as StandStatus[]).map((stKey) => {
                  const meta = STAND_STATUS_META[stKey];
                  return (
                    <span key={stKey} className="inline-flex items-center gap-1.5 font-medium">
                      <span
                        className="h-3 w-3 rounded-[2px] border border-white/40"
                        style={{ backgroundColor: stKey === 'vendido' ? '#1F4E9C' : meta.color }}
                        aria-hidden="true"
                      />
                      {meta.label}
                    </span>
                  );
                })}
              </div>
              <span className="text-[#F4C20D] font-semibold">
                Toca cualquier stand (01–51, B05 o EA-01..08) para abrir su ficha
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Maquette3DCanvas;
