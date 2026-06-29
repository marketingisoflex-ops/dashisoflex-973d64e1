import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Box, 
  Trash2, 
  Plus, 
  Move, 
  Maximize, 
  RotateCw, 
  Upload, 
  Grid, 
  Sun, 
  Eye, 
  Database,
  RefreshCw,
  Download,
  FileText,
  Save,
  FolderOpen,
  HelpCircle,
  Layers,
  Wrench,
  Camera,
  Layers3,
  Undo,
  Maximize2,
  Minimize2,
  Play,
  Settings,
  List,
  Compass,
  FileCode,
  Info,
  PanelRight,
  X as XIcon
} from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    THREE: any;
  }
}

interface ParametricComponent {
  id: string;
  type: "Bancada" | "FlowRack" | "Carrinho" | "Estante" | "GLB";
  name: string;
  width: number; // mm
  height: number; // mm
  depth: number; // mm
  posX: number; // mm
  posY: number; // mm
  posZ: number; // mm
  rotY: number; // degrees
  color: string;
  // Tube settings
  tubeType?: "quadrado" | "redondo";
  tubeDiameter?: number;
  connectorColor?: string;
  // Wheels/Casters settings
  hasWheels?: boolean;
  wheelsDiameter?: number;
  wheelsType?: "giratorio" | "com_trava";
  // Specific settings
  shelvesCount?: number;
  shelfAngle?: number;
  hasPegboard?: boolean;
  hasDrawers?: boolean;
  shelfCount?: number; // for Carrinho
  levelCount?: number; // for Estante
  // Flow rack specific
  flowLanesCount?: number;
  binColor?: string;
}

interface SavedProject {
  id: string;
  name: string;
  createdAt: string;
  components: ParametricComponent[];
}

export function ThreeDCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const safeDisposeMesh = (object: any) => {
    if (!object) return;
    object.traverse((child: any) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  };
  
  // Projects & Components State
  const [components, setComponents] = useState<ParametricComponent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [currentProjectName, setCurrentProjectName] = useState("Projeto Isoflex");

  // Grid / Snap Configuration
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapInterval, setSnapInterval] = useState(100); // 100mm default
  const [showGrid, setShowGrid] = useState(true);
  
  // 3D Viewport background theme
  const [bgTheme, setBgTheme] = useState<"studio_dark" | "studio_light" | "blueprint" | "workshop">("studio_dark");
  
  // Selected component edit state
  const [selectedComp, setSelectedComp] = useState<ParametricComponent | null>(null);

  // Active properties tab: 'object' | 'parametric' | 'material'
  const [propertiesTab, setPropertiesTab] = useState<"object" | "parametric" | "material">("object");

  // Mobile properties panel toggle
  const [mobilePropsOpen, setMobilePropsOpen] = useState(false);

  // Three.js instances refs
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const raycasterRef = useRef<any>(null);
  const mouseRef = useRef<any>(null);
  const objectsMapRef = useRef<Map<string, any>>(new Map());
  const gridHelperRef = useRef<any>(null);
  const selectionHelperRef = useRef<any>(null);
  const groundRef = useRef<any>(null);

  // Colors Palette Isoflex
  const isoflexColors = [
    { name: "Azul Isoflex", hex: "#1a4fd6" },
    { name: "Amarelo Isoflex", hex: "#f59e0b" },
    { name: "Cinza Industrial", hex: "#64748b" },
    { name: "Grafite Escuro", hex: "#334155" },
    { name: "Verde Organização", hex: "#10b981" },
    { name: "Vermelho Segurança", hex: "#ef4444" },
    { name: "Branco Técnico", hex: "#f8fafc" }
  ];

  // Load Three.js dynamically
  useEffect(() => {
    let active = true;
    
    const loadScript = (url: string) => {
      return new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = url;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load: ${url}`));
        document.head.appendChild(script);
      });
    };

    const initAll = async () => {
      try {
        if (!window.THREE) {
          await loadScript("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js");
        }
        await loadScript("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js");
        await loadScript("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js");
        await loadScript("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js");
        
        if (active) {
          setLoading(false);
          initScene();
          loadProjectsFromStorage();
        }
      } catch (err: any) {
        console.error(err);
        if (active) {
          setError("Erro ao carregar os módulos 3D. Por favor, recarregue a página.");
          setLoading(false);
        }
      }
    };

    initAll();

    return () => {
      active = false;
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Update Background, Fog, and Grid Helper dynamically based on theme
  useEffect(() => {
    const THREE = window.THREE;
    if (!THREE || !sceneRef.current) return;

    const scene = sceneRef.current;
    let bgColor = "#121212";
    let fogColor = "#121212";
    let fogDensity = 0.04;
    let enableFog = true;

    if (bgTheme === "studio_dark") {
      bgColor = "#0d0d0d";
      fogColor = "#0d0d0d";
      fogDensity = 0.06;
    } else if (bgTheme === "studio_light") {
      bgColor = "#f3f4f6";
      fogColor = "#f3f4f6";
      fogDensity = 0.03;
    } else if (bgTheme === "blueprint") {
      bgColor = "#020617";
      enableFog = false;
    } else if (bgTheme === "workshop") {
      bgColor = "#1e1b18";
      fogColor = "#1e1b18";
      fogDensity = 0.04;
    }

    scene.background = new THREE.Color(bgColor);
    if (enableFog) {
      scene.fog = new THREE.FogExp2(fogColor, fogDensity);
    } else {
      scene.fog = null;
    }

    // Update Ground Material Color and Reflective values based on Theme
    if (groundRef.current) {
      let floorColor = 0x1a1a1a;
      let floorRoughness = 0.6;
      let floorMetalness = 0.2;
      
      if (bgTheme === "studio_dark") {
        floorColor = 0x111111;
        floorRoughness = 0.35; // high reflection
        floorMetalness = 0.8;
      } else if (bgTheme === "studio_light") {
        floorColor = 0xe5e7eb;
        floorRoughness = 0.8;
        floorMetalness = 0.0;
      } else if (bgTheme === "blueprint") {
        floorColor = 0x070c1e;
        floorRoughness = 0.9;
        floorMetalness = 0.1;
      } else if (bgTheme === "workshop") {
        floorColor = 0x272421;
        floorRoughness = 0.55;
        floorMetalness = 0.3;
      }
      
      if (groundRef.current.material) {
        groundRef.current.material.color.setHex(floorColor);
        groundRef.current.material.roughness = floorRoughness;
        groundRef.current.material.metalness = floorMetalness;
        groundRef.current.material.needsUpdate = true;
      }
    }

    // Grid helper setup
    if (gridHelperRef.current) {
      scene.remove(gridHelperRef.current);
      gridHelperRef.current = null;
    }

    if (showGrid) {
      let gridColor1 = 0x444444;
      let gridColor2 = 0x222222;
      
      if (bgTheme === "studio_light") {
        gridColor1 = 0x9ca3af;
        gridColor2 = 0xd1d5db;
      } else if (bgTheme === "blueprint") {
        gridColor1 = 0x0ea5e9;
        gridColor2 = 0x0369a1;
      } else if (bgTheme === "workshop") {
        gridColor1 = 0xd97706; // amber tint for industrial safety lines
        gridColor2 = 0x78350f;
      }

      const gridHelper = new THREE.GridHelper(30, 30, gridColor1, gridColor2);
      gridHelper.position.y = 0.002; // slight offset to prevent z-fighting
      scene.add(gridHelper);
      gridHelperRef.current = gridHelper;
    }
  }, [bgTheme, showGrid]);

  // Update selection box and active parameters on component click
  useEffect(() => {
    const THREE = window.THREE;
    if (!THREE || !sceneRef.current) return;

    if (selectedId) {
      const comp = components.find(c => c.id === selectedId);
      if (comp) {
        setSelectedComp(comp);
      }

      // Update Selection Orange Box Highlight (Blender style)
      const selectedMesh = objectsMapRef.current.get(selectedId);
      if (selectedMesh) {
        if (selectionHelperRef.current) {
          sceneRef.current.remove(selectionHelperRef.current);
        }
        const boxHelper = new THREE.BoxHelper(selectedMesh, 0xf27b13); // Blender Orange
        sceneRef.current.add(boxHelper);
        selectionHelperRef.current = boxHelper;
      }
    } else {
      setSelectedComp(null);
      if (selectionHelperRef.current && sceneRef.current) {
        sceneRef.current.remove(selectionHelperRef.current);
        selectionHelperRef.current = null;
      }
    }
  }, [selectedId, components]);

  const initScene = () => {
    if (!containerRef.current || !window.THREE) return;
    
    const THREE = window.THREE;
    const container = containerRef.current;
    
    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(4, 3, 5);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isMobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(8, 15, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 40;
    const d = 10;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x3b82f6, 0.35); // organization cool tint
    fillLight.position.set(-8, 8, -8);
    scene.add(fillLight);

    // Ground plane with reflective premium qualities
    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x141414,
      roughness: 0.5,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);
    groundRef.current = ground;

    // Orbit Controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.01;
    controlsRef.current = controls;

    // Raycasting & Mouse setup
    raycasterRef.current = new THREE.Raycaster();
    mouseRef.current = new THREE.Vector2();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    // Mouse drag checking to prevent deselection/selection while orbiting
    let startX = 0;
    let startY = 0;
    
    const handleMouseDown = (e: MouseEvent) => {
      startX = e.clientX;
      startY = e.clientY;
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      const diffX = Math.abs(e.clientX - startX);
      const diffY = Math.abs(e.clientY - startY);
      
      // If user dragged the mouse (like to orbit), don't trigger selection
      if (diffX > 5 || diffY > 5) return;
      
      if (!rendererRef.current || !cameraRef.current || !raycasterRef.current) return;
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      
      raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(scene.children, true);
      
      let found = false;
      if (intersects.length > 0) {
        let obj = intersects[0].object;
        // Traverse up to find user group
        while (obj && obj.parent && obj.parent !== scene) {
          obj = obj.parent;
        }
        if (objectsMapRef.current.has(obj.name)) {
          setSelectedId(obj.name);
          found = true;
        }
      }
      
      if (!found) {
        setSelectedId(null);
      }
    };
    
    renderer.domElement.addEventListener("mousedown", handleMouseDown);
    renderer.domElement.addEventListener("mouseup", handleMouseUp);

    // Render loop
    const animate = () => {
      requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      
      // Keep Selection BoxHelper updated with moves/scales
      if (selectionHelperRef.current && selectedId) {
        const mesh = objectsMapRef.current.get(selectedId);
        if (mesh) selectionHelperRef.current.update(mesh);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();
  };

  // Custom materials creators - upgraded for realistic visual results
  const getSteelMaterial = (THREE: any, colorHex: string) => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(colorHex),
      roughness: 0.18,
      metalness: 0.85,
      clearcoat: 0.4,
      clearcoatRoughness: 0.1,
    });
  };

  const getWoodMaterial = (THREE: any) => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#d4a373"),
      roughness: 0.45,
      metalness: 0.0,
    });
  };

  const getPlasticMaterial = (THREE: any, colorHex: string) => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(colorHex),
      roughness: 0.22,
      metalness: 0.08,
      clearcoat: 0.2,
      clearcoatRoughness: 0.2,
    });
  };

  const getCasterMaterial = (THREE: any) => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#1e293b"), // Slate dark rubber tire
      roughness: 0.7,
      metalness: 0.1,
    });
  };

  // Parametric Assembly builders
  const rebuildThreeMesh = (comp: ParametricComponent) => {
    const THREE = window.THREE;
    if (!THREE || !sceneRef.current) return;

    // Skip rebuild for imported GLB structures since they are loaded once
    if (comp.type === "GLB") {
      const glbMesh = objectsMapRef.current.get(comp.id);
      if (glbMesh) {
        glbMesh.position.set(comp.posX / 1000, comp.posY / 1000, comp.posZ / 1000);
        glbMesh.rotation.y = (comp.rotY * Math.PI) / 180;
      }
      return;
    }

    // Remove old mesh
    const oldMesh = objectsMapRef.current.get(comp.id);
    if (oldMesh) {
      safeDisposeMesh(oldMesh);
      sceneRef.current.remove(oldMesh);
      objectsMapRef.current.delete(comp.id);
    }

    const group = new THREE.Group();
    group.name = comp.id;

    const w = comp.width / 1000;
    const h = comp.height / 1000;
    const d = comp.depth / 1000;

    const steelMat = getSteelMaterial(THREE, comp.color);
    const darkSteelMat = getSteelMaterial(THREE, "#2e2e2e"); // Dark/black steel structure
    const woodMat = getWoodMaterial(THREE);

    // Helpers for tubes and profiles
    const dTube = (comp.tubeDiameter || 28) / 1000;
    const isRound = comp.tubeType === "redondo";

    const createTubeOrProfile = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => {
      const p1 = new THREE.Vector3(x1, y1, z1);
      const p2 = new THREE.Vector3(x2, y2, z2);
      const direction = new THREE.Vector3().subVectors(p2, p1);
      const length = direction.length();
      if (length < 0.001) return new THREE.Group(); // prevent crash

      let geo;
      if (isRound) {
        geo = new THREE.CylinderGeometry(dTube / 2, dTube / 2, length, 16);
      } else {
        geo = new THREE.BoxGeometry(dTube, length, dTube);
      }

      const mesh = new THREE.Mesh(geo, steelMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Midpoint
      const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      mesh.position.copy(midpoint);

      // Orientation
      const up = new THREE.Vector3(0, 1, 0);
      direction.normalize();
      mesh.quaternion.setFromUnitVectors(up, direction);

      return mesh;
    };

    // Shared materials & geometries for joints to prevent multiple allocations
    const connectorMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(comp.connectorColor || "#27272a"),
      roughness: 0.35,
      metalness: 0.8,
    });

    const jointGeo = isRound
      ? new THREE.SphereGeometry(dTube * 0.82, isMobile ? 6 : 12, isMobile ? 6 : 12)
      : new THREE.BoxGeometry(dTube * 1.25, dTube * 1.25, dTube * 1.25);

    const boltGeo = new THREE.CylinderGeometry(dTube * 0.18, dTube * 0.18, dTube * 0.3, 6);
    const boltMat = getSteelMaterial(THREE, "#94a3b8");

    const addConnectorJoint = (x: number, y: number, z: number) => {
      const joint = new THREE.Mesh(jointGeo, connectorMat);
      joint.position.set(x, y, z);
      joint.castShadow = !isMobile;
      group.add(joint);
      
      // Bolt details for realistic modular joint visual
      const bolt = new THREE.Mesh(boltGeo, boltMat);
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(x, y, z + dTube * 0.58);
      bolt.castShadow = !isMobile;
      group.add(bolt);
    };

    // Casters/Wheels Helper (highly detailed double yoke, rim and red safety brakes)
    const hasWheels = comp.hasWheels || comp.type === "Carrinho";
    const wheelsD = comp.wheelsDiameter || 100;
    const wheelD = wheelsD / 1000;
    const baseOffset = hasWheels ? (wheelD + 0.05) : 0;

    // Shared geometries and materials for Caster Wheels to prevent multiple allocations
    const forkMat = getSteelMaterial(THREE, comp.connectorColor || "#27272a");
    const plateGeo = new THREE.BoxGeometry(wheelD * 0.7, 0.005, wheelD * 0.7);
    const armW = wheelD * 0.08;
    const armH = baseOffset - wheelD / 2 - 0.005;
    const armD = wheelD * 0.35;
    const armGeo = new THREE.BoxGeometry(armW, armH, armD);
    const tireGeo = new THREE.CylinderGeometry(wheelD / 2, wheelD / 2, wheelD * 0.24, isMobile ? 12 : 24);
    const tireMat = getCasterMaterial(THREE);
    const rimGeo = new THREE.CylinderGeometry(wheelD * 0.34, wheelD * 0.34, wheelD * 0.26, isMobile ? 8 : 16);
    const rimMat = getSteelMaterial(THREE, "#cbd5e1");
    const axleGeo = new THREE.CylinderGeometry(wheelD / 8, wheelD / 8, wheelD * 0.44, 8);
    const axleMat = getSteelMaterial(THREE, "#475569");
    const brakeGeo = new THREE.BoxGeometry(wheelD * 0.1, wheelD * 0.35, wheelD * 0.16);
    const brakeMat = getPlasticMaterial(THREE, "#ef4444");

    const addCasterWheel = (x: number, z: number) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(x, 0, z);

      // Caster top bracket plate
      const plate = new THREE.Mesh(plateGeo, forkMat);
      plate.position.y = baseOffset - 0.005;
      plate.castShadow = !isMobile;
      wheelGroup.add(plate);

      // Left Fork Arm
      const armL = new THREE.Mesh(armGeo, forkMat);
      armL.position.set(-wheelD * 0.18, wheelD / 2 + armH / 2, 0);
      armL.castShadow = !isMobile;
      wheelGroup.add(armL);
      
      // Right Fork Arm
      const armR = new THREE.Mesh(armGeo, forkMat);
      armR.position.set(wheelD * 0.18, wheelD / 2 + armH / 2, 0);
      armR.castShadow = !isMobile;
      wheelGroup.add(armR);

      // Wheel outer tire (silicone/rubber texture)
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.position.y = wheelD / 2;
      tire.castShadow = !isMobile;
      wheelGroup.add(tire);
      
      // Wheel core/rim (shiny metallic center)
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.y = wheelD / 2;
      wheelGroup.add(rim);

      // Center metal axle bolt
      const axle = new THREE.Mesh(axleGeo, axleMat);
      axle.rotation.z = Math.PI / 2;
      axle.position.y = wheelD / 2;
      wheelGroup.add(axle);

      // Red Brake Lever
      if (comp.wheelsType === "com_trava") {
        const brake = new THREE.Mesh(brakeGeo, brakeMat);
        brake.position.set(0, wheelD * 0.78, wheelD * 0.22);
        brake.rotation.x = Math.PI / 6;
        brake.castShadow = !isMobile;
        wheelGroup.add(brake);
      }

      group.add(wheelGroup);
    };

    if (comp.type === "Bancada") {
      const legH = h - baseOffset - 0.03;
      const corners = [
        [-w / 2 + dTube, -d / 2 + dTube],
        [-w / 2 + dTube, d / 2 - dTube],
        [w / 2 - dTube, -d / 2 + dTube],
        [w / 2 - dTube, d / 2 - dTube],
      ];

      // 1. Tabletop
      const topGeo = new THREE.BoxGeometry(w, 0.03, d);
      const top = new THREE.Mesh(topGeo, woodMat);
      top.position.y = h - 0.015;
      top.castShadow = true;
      top.receiveShadow = true;
      group.add(top);

      // 2. Vertical legs & Joints
      corners.forEach(([cx, cz]) => {
        group.add(createTubeOrProfile(cx, baseOffset, cz, cx, h - 0.03, cz));
        addConnectorJoint(cx, baseOffset + 0.15, cz);
        addConnectorJoint(cx, h - 0.05, cz);
      });

      // 3. Lower & Upper Rails
      const lowerY = baseOffset + 0.15;
      const upperY = h - 0.05;
      
      // Connect corners with tubes
      group.add(createTubeOrProfile(corners[0][0], lowerY, corners[0][1], corners[2][0], lowerY, corners[2][1]));
      group.add(createTubeOrProfile(corners[1][0], lowerY, corners[1][1], corners[3][0], lowerY, corners[3][1]));
      group.add(createTubeOrProfile(corners[0][0], lowerY, corners[0][1], corners[1][0], lowerY, corners[1][1]));
      group.add(createTubeOrProfile(corners[2][0], lowerY, corners[2][1], corners[3][0], lowerY, corners[3][1]));

      group.add(createTubeOrProfile(corners[0][0], upperY, corners[0][1], corners[2][0], upperY, corners[2][1]));
      group.add(createTubeOrProfile(corners[1][0], upperY, corners[1][1], corners[3][0], upperY, corners[3][1]));
      group.add(createTubeOrProfile(corners[0][0], upperY, corners[0][1], corners[1][0], upperY, corners[1][1]));
      group.add(createTubeOrProfile(corners[2][0], upperY, corners[2][1], corners[3][0], upperY, corners[3][1]));

      // 4. Caster wheels
      if (hasWheels) {
        corners.forEach(([cx, cz]) => addCasterWheel(cx, cz));
      }

      // 5. Pegboard
      if (comp.hasPegboard) {
        const pegH = 0.6;
        const pegGeo = new THREE.BoxGeometry(w - 0.04, pegH, 0.015);
        const pegboard = new THREE.Mesh(pegGeo, darkSteelMat);
        pegboard.position.set(0, h + pegH / 2, -d / 2 + 0.015);
        pegboard.castShadow = true;
        group.add(pegboard);

        // Supporting tubes behind pegboard
        group.add(createTubeOrProfile(corners[1][0], h - 0.03, corners[1][1], corners[1][0], h + pegH, corners[1][1]));
        group.add(createTubeOrProfile(corners[3][0], h - 0.03, corners[3][1], corners[3][0], h + pegH, corners[3][1]));

        // Top Shelf
        const pegShelfGeo = new THREE.BoxGeometry(w - 0.04, 0.015, 0.22);
        const pegShelf = new THREE.Mesh(pegShelfGeo, woodMat);
        pegShelf.position.set(0, h + pegH - 0.03, -d / 2 + 0.13);
        pegShelf.castShadow = true;
        group.add(pegShelf);
      }

      // 6. Drawers
      if (comp.hasDrawers) {
        const dW = 0.4;
        const dH = 0.25;
        const dD = d - 0.1;
        const drawerGeo = new THREE.BoxGeometry(dW, dH, dD);
        const drawer = new THREE.Mesh(drawerGeo, darkSteelMat);
        drawer.position.set(w / 4, h - 0.03 - dH / 2, 0);
        drawer.castShadow = true;
        group.add(drawer);

        const handleGeo = new THREE.BoxGeometry(0.15, 0.02, 0.02);
        const handle = new THREE.Mesh(handleGeo, steelMat);
        handle.position.set(w / 4, h - 0.03 - dH / 2, dD / 2 + 0.01);
        group.add(handle);
      }

    } else if (comp.type === "FlowRack") {
      const shelfCount = comp.shelvesCount || 3;
      const angleRad = ((comp.shelfAngle || 5) * Math.PI) / 180;
      const lanes = comp.flowLanesCount || 2;
      const binColorHex = comp.binColor || "#1a4fd6";

      const corners = [
        [-w / 2 + dTube, -d / 2 + dTube],
        [-w / 2 + dTube, d / 2 - dTube],
        [w / 2 - dTube, -d / 2 + dTube],
        [w / 2 - dTube, d / 2 - dTube],
      ];

      // 1. Vertical columns
      corners.forEach(([cx, cz]) => {
        group.add(createTubeOrProfile(cx, baseOffset, cz, cx, h, cz));
        addConnectorJoint(cx, baseOffset + 0.15, cz);
        for (let i = 0; i < shelfCount; i++) {
          const shelfH = baseOffset + 0.35 + (i * (h - baseOffset - 0.55)) / (shelfCount - 1 || 1);
          addConnectorJoint(cx, shelfH, cz);
        }
      });

      // Bottom rails
      const lowerY = baseOffset + 0.15;
      group.add(createTubeOrProfile(corners[0][0], lowerY, corners[0][1], corners[2][0], lowerY, corners[2][1]));
      group.add(createTubeOrProfile(corners[1][0], lowerY, corners[1][1], corners[3][0], lowerY, corners[3][1]));
      group.add(createTubeOrProfile(corners[0][0], lowerY, corners[0][1], corners[1][0], lowerY, corners[1][1]));
      group.add(createTubeOrProfile(corners[2][0], lowerY, corners[2][1], corners[3][0], lowerY, corners[3][1]));

      // 2. Shelves & Lanes & Bins
      for (let i = 0; i < shelfCount; i++) {
        const shelfH = baseOffset + 0.35 + (i * (h - baseOffset - 0.55)) / (shelfCount - 1 || 1);
        const shelfGroup = new THREE.Group();
        shelfGroup.position.set(0, shelfH, 0);
        shelfGroup.rotation.x = angleRad;

      // 2. Shelves & Lanes & Bins (Optimized)
      const frameGeo = new THREE.BoxGeometry(w, 0.03, 0.03);
      const sideFrameGeo = new THREE.BoxGeometry(0.03, 0.03, d);
      const railGeo = new THREE.BoxGeometry(0.01, 0.015, d - 0.06);

      const rollerCount = isMobile ? 4 : 10;
      const rollerRadius = 0.01;
      const rollerWidth = 0.08;
      const rollerGeo = new THREE.CylinderGeometry(rollerRadius, rollerRadius, rollerWidth, isMobile ? 5 : 8);
      const rollerMat = getPlasticMaterial(THREE, "#eab308");

      const laneW = w / lanes;
      const binW = laneW * 0.72;
      const binH = 0.12;
      const binD = d * 0.4;
      const binMat = getPlasticMaterial(THREE, binColorHex);

      const botGeo = new THREE.BoxGeometry(binW, 0.008, binD);
      const backGeo = new THREE.BoxGeometry(binW, binH, 0.008);
      const sideGeo = new THREE.BoxGeometry(0.008, binH, binD);
      const frontGeo = new THREE.BoxGeometry(binW, binH * 0.4, 0.008);

      const createIndustrialBin = () => {
        const binGroup = new THREE.Group();
        
        // Bottom Plate
        const bot = new THREE.Mesh(botGeo, binMat);
        bot.position.y = 0.004;
        bot.castShadow = !isMobile;
        binGroup.add(bot);
        
        // Back wall
        const back = new THREE.Mesh(backGeo, binMat);
        back.position.set(0, binH / 2, -binD / 2 + 0.004);
        back.castShadow = !isMobile;
        binGroup.add(back);
        
        // Side walls
        const sideL = new THREE.Mesh(sideGeo, binMat);
        sideL.position.set(-binW / 2 + 0.004, binH / 2, 0);
        sideL.castShadow = !isMobile;
        binGroup.add(sideL);
        
        const sideR = new THREE.Mesh(sideGeo, binMat);
        sideR.position.set(binW / 2 - 0.004, binH / 2, 0);
        sideR.castShadow = !isMobile;
        binGroup.add(sideR);
        
        // Slanted Front Panel
        const front = new THREE.Mesh(frontGeo, binMat);
        front.position.set(0, binH * 0.2, binD / 2 - 0.004);
        front.castShadow = !isMobile;
        binGroup.add(front);
        
        return binGroup;
      };

      for (let i = 0; i < shelfCount; i++) {
        const shelfH = baseOffset + 0.35 + (i * (h - baseOffset - 0.55)) / (shelfCount - 1 || 1);
        const shelfGroup = new THREE.Group();
        shelfGroup.position.set(0, shelfH, 0);
        shelfGroup.rotation.x = angleRad;

        // Shelf frames
        const frameF = new THREE.Mesh(frameGeo, darkSteelMat);
        frameF.position.set(0, 0, d / 2);
        frameF.castShadow = !isMobile;
        shelfGroup.add(frameF);

        const frameB = new THREE.Mesh(frameGeo, darkSteelMat);
        frameB.position.set(0, 0, -d / 2);
        frameB.castShadow = !isMobile;
        shelfGroup.add(frameB);

        const frameL = new THREE.Mesh(sideFrameGeo, darkSteelMat);
        frameL.position.set(-w / 2 + 0.015, 0, 0);
        frameL.castShadow = !isMobile;
        shelfGroup.add(frameL);

        const frameR = new THREE.Mesh(sideFrameGeo, darkSteelMat);
        frameR.position.set(w / 2 - 0.015, 0, 0);
        frameR.castShadow = !isMobile;
        shelfGroup.add(frameR);

        for (let lane = 0; lane < lanes; lane++) {
          const laneX = -w / 2 + laneW * (lane + 0.5);

          // Render metal guide profiles
          const rail1 = new THREE.Mesh(railGeo, steelMat);
          rail1.position.set(laneX - 0.05, 0.007, 0);
          rail1.castShadow = !isMobile;
          shelfGroup.add(rail1);

          const rail2 = new THREE.Mesh(railGeo, steelMat);
          rail2.position.set(laneX + 0.05, 0.007, 0);
          rail2.castShadow = !isMobile;
          shelfGroup.add(rail2);

          // Draw rollers (reusing geometry)
          for (let r = 0; r < rollerCount; r++) {
            const rZ = -d / 2 + 0.05 + (r * (d - 0.1)) / (rollerCount - 1);
            const roller = new THREE.Mesh(rollerGeo, rollerMat);
            roller.rotation.z = Math.PI / 2;
            roller.position.set(laneX, 0.012, rZ);
            roller.castShadow = !isMobile;
            shelfGroup.add(roller);
          }

          const bin1 = createIndustrialBin();
          bin1.position.set(laneX, 0.016, -d / 4);
          shelfGroup.add(bin1);

          const bin2 = createIndustrialBin();
          bin2.position.set(laneX, 0.016, d / 4);
          shelfGroup.add(bin2);
        }

        group.add(shelfGroup);
      }

      // Wheels
      if (hasWheels) {
        corners.forEach(([cx, cz]) => addCasterWheel(cx, cz));
      }

    } else if (comp.type === "Carrinho") {
      const shCount = comp.shelfCount || 2;
      const corners = [
        [-w / 2 + dTube, -d / 2 + dTube],
        [-w / 2 + dTube, d / 2 - dTube],
        [w / 2 - dTube, -d / 2 + dTube],
        [w / 2 - dTube, d / 2 - dTube],
      ];

      // 1. Upright structure post
      const startY = baseOffset;
      const rackH = h - startY;

      corners.forEach(([cx, cz]) => {
        group.add(createTubeOrProfile(cx, startY, cz, cx, h - 0.05, cz));
        addConnectorJoint(cx, startY + 0.02, cz);
        addConnectorJoint(cx, h - 0.05, cz);
      });

      // 2. Shelves
      for (let s = 0; s < shCount; s++) {
        const shelfH = startY + 0.02 + (s * (rackH - 0.1)) / (shCount - 1 || 1);
        const shelfPlateGeo = new THREE.BoxGeometry(w, 0.02, d);
        const plate = new THREE.Mesh(shelfPlateGeo, steelMat);
        plate.position.set(0, shelfH, 0);
        plate.castShadow = true;
        plate.receiveShadow = true;
        group.add(plate);

        // Outer shelf frame rails
        group.add(createTubeOrProfile(-w/2, shelfH, -d/2, w/2, shelfH, -d/2));
        group.add(createTubeOrProfile(-w/2, shelfH, d/2, w/2, shelfH, d/2));
        group.add(createTubeOrProfile(-w/2, shelfH, -d/2, -w/2, shelfH, d/2));
        group.add(createTubeOrProfile(w/2, shelfH, -d/2, w/2, shelfH, d/2));
      }

      // 3. Ergonomic Push Handle (rounded tubes instead of boxes)
      const handleGeo = new THREE.CylinderGeometry(0.014, 0.014, d - 0.16, 16);
      const handle = new THREE.Mesh(handleGeo, steelMat);
      handle.rotation.x = Math.PI / 2;
      handle.position.set(-w / 2 - 0.1, h - 0.05, 0);
      handle.castShadow = true;
      group.add(handle);

      // Curved tubular brackets
      const bracketGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.1, 16);
      
      const bracket1 = new THREE.Mesh(bracketGeo, steelMat);
      bracket1.rotation.z = Math.PI / 2;
      bracket1.position.set(-w / 2 - 0.05, h - 0.05, -d / 2 + 0.08);
      bracket1.castShadow = true;
      group.add(bracket1);

      const bracket2 = bracket1.clone();
      bracket2.position.set(-w / 2 - 0.05, h - 0.05, d / 2 - 0.08);
      group.add(bracket2);

      // Caster Wheels
      if (hasWheels) {
        corners.forEach(([cx, cz]) => addCasterWheel(cx, cz));
      }

    } else if (comp.type === "Estante") {
      const lvlCount = comp.levelCount || 4;
      const corners = [
        [-w / 2 + dTube, -d / 2 + dTube],
        [-w / 2 + dTube, d / 2 - dTube],
        [w / 2 - dTube, -d / 2 + dTube],
        [w / 2 - dTube, d / 2 - dTube],
      ];

      // 1. Vertical columns
      corners.forEach(([cx, cz]) => {
        group.add(createTubeOrProfile(cx, baseOffset, cz, cx, h, cz));
        addConnectorJoint(cx, baseOffset + 0.15, cz);
        for (let l = 0; l < lvlCount; l++) {
          const levelH = baseOffset + 0.2 + (l * (h - baseOffset - 0.4)) / (lvlCount - 1 || 1);
          addConnectorJoint(cx, levelH, cz);
        }
      });

      // 2. Shelves/Levels
      for (let l = 0; l < lvlCount; l++) {
        const levelH = baseOffset + 0.2 + (l * (h - baseOffset - 0.4)) / (lvlCount - 1 || 1);
        const trayGeo = new THREE.BoxGeometry(w, 0.025, d);
        const tray = new THREE.Mesh(trayGeo, steelMat);
        tray.position.set(0, levelH, 0);
        tray.castShadow = true;
        tray.receiveShadow = true;
        group.add(tray);
      }

      // 3. Diagonal Bracing
      const braceLength = Math.sqrt(w * w + (h - baseOffset) * (h - baseOffset)) * 0.95;
      const braceGeo = new THREE.BoxGeometry(0.015, braceLength, 0.005);

      const brace1 = new THREE.Mesh(braceGeo, darkSteelMat);
      brace1.rotation.z = Math.atan2(h - baseOffset, w);
      brace1.position.set(0, baseOffset + (h - baseOffset) / 2, -d / 2 + 0.015);
      group.add(brace1);

      const brace2 = new THREE.Mesh(braceGeo, darkSteelMat);
      brace2.rotation.z = -Math.atan2(h - baseOffset, w);
      brace2.position.set(0, baseOffset + (h - baseOffset) / 2, -d / 2 + 0.015);
      group.add(brace2);

      // Caster wheels
      if (hasWheels) {
        corners.forEach(([cx, cz]) => addCasterWheel(cx, cz));
      }
    }

    // Apply exact positioning coordinates (meters)
    group.position.set(comp.posX / 1000, comp.posY / 1000, comp.posZ / 1000);
    group.rotation.y = (comp.rotY * Math.PI) / 180;

    sceneRef.current.add(group);
    objectsMapRef.current.set(comp.id, group);
  };

  // Add a component to the dashboard scene
  const addComponent = (type: "Bancada" | "FlowRack" | "Carrinho" | "Estante") => {
    const id = `comp_${Date.now()}`;
    let newComp: ParametricComponent = {
      id,
      type,
      name: `${type} ${components.filter(c => c.type === type).length + 1}`,
      width: type === "Bancada" ? 1500 : type === "FlowRack" ? 1200 : type === "Carrinho" ? 900 : 1000,
      height: type === "Bancada" ? 900 : type === "FlowRack" ? 1600 : type === "Carrinho" ? 850 : 2000,
      depth: type === "Bancada" ? 750 : type === "FlowRack" ? 1000 : type === "Carrinho" ? 600 : 500,
      posX: (Math.random() - 0.5) * 2000, // randomized within 2 meters
      posY: 0,
      posZ: (Math.random() - 0.5) * 2000,
      rotY: 0,
      color: "#1a4fd6", // default Isoflex Blue
      tubeType: "redondo",
      tubeDiameter: 28,
      connectorColor: "#27272a",
      hasWheels: type === "Carrinho" ? true : false,
      wheelsDiameter: 100,
      wheelsType: "giratorio",
      flowLanesCount: 2,
      binColor: "#1a4fd6"
    };

    if (type === "Bancada") {
      newComp.hasPegboard = true;
      newComp.hasDrawers = true;
    } else if (type === "FlowRack") {
      newComp.shelvesCount = 3;
      newComp.shelfAngle = 5;
    } else if (type === "Carrinho") {
      newComp.shelfCount = 2;
    } else if (type === "Estante") {
      newComp.levelCount = 4;
    }

    // Apply snap if enabled
    if (snapEnabled) {
      newComp.posX = snapCoordinate(newComp.posX, snapInterval);
      newComp.posZ = snapCoordinate(newComp.posZ, snapInterval);
    }

    setComponents(prev => [...prev, newComp]);
    setSelectedId(id);
    
    // Defer three rebuild after state update
    setTimeout(() => rebuildThreeMesh(newComp), 50);
    toast.success(`${type} adicionado à cena Blender!`);
  };

  // Helper snap algorithm
  const snapCoordinate = (val: number, step: number) => {
    return Math.round(val / step) * step;
  };

  // Update values re-render
  const updateComponentProperty = (id: string, prop: keyof ParametricComponent, value: any) => {
    setComponents(prev => prev.map(c => {
      if (c.id === id) {
        let updated = { ...c, [prop]: value };
        
        // Handle snap on coordinates
        if (snapEnabled && (prop === "posX" || prop === "posY" || prop === "posZ")) {
          updated[prop] = snapCoordinate(Number(value), snapInterval);
        }
        
        // Perform 3D rebuild / updates
        setTimeout(() => rebuildThreeMesh(updated), 20);
        return updated;
      }
      return c;
    }));
  };

  // GLB / GLTF Import Mechanism
  const handleGlbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !window.THREE || !sceneRef.current) return;
    
    const THREE = window.THREE;
    const reader = new FileReader();
    
    reader.onload = function(evt) {
      const contents = evt.target?.result as ArrayBuffer;
      const loader = new THREE.GLTFLoader();
      
      loader.parse(contents, "", (gltf: any) => {
        const model = gltf.scene;
        
        // Scale and center appropriately
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 10) {
          const scaleFactor = 3 / maxDim;
          model.scale.set(scaleFactor, scaleFactor, scaleFactor);
        }
        
        const id = `glb_${Date.now()}`;
        model.name = id;
        
        // Add casts/receives shadows
        model.traverse((child: any) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        sceneRef.current.add(model);
        objectsMapRef.current.set(id, model);
        
        const newComp: ParametricComponent = {
          id,
          type: "GLB",
          name: file.name.replace(/\.[^/.]+$/, ""), // remove extension
          width: Math.round(size.x * 1000),
          height: Math.round(size.y * 1000),
          depth: Math.round(size.z * 1000),
          posX: 0,
          posY: 0,
          posZ: 0,
          rotY: 0,
          color: "#ffffff"
        };
        
        setComponents(prev => [...prev, newComp]);
        setSelectedId(id);
        toast.success(`Importado: ${newComp.name}`);
      }, (err: any) => {
        console.error(err);
        toast.error("Erro ao importar GLB.");
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Delete selected item
  const deleteComponent = (id: string) => {
    const mesh = objectsMapRef.current.get(id);
    if (mesh && sceneRef.current) {
      safeDisposeMesh(mesh);
      sceneRef.current.remove(mesh);
      objectsMapRef.current.delete(id);
    }
    setComponents(prev => prev.filter(c => c.id !== id));
    setSelectedId(null);
    toast.info("Componente removido do projeto");
  };

  // Duplicate / Clone component with offset
  const duplicateComponent = (comp: ParametricComponent) => {
    const id = `comp_${Date.now()}`;
    const cloned: ParametricComponent = {
      ...comp,
      id,
      name: `${comp.name} (Cópia)`,
      posX: comp.posX + 300,
      posZ: comp.posZ + 300,
    };
    
    setComponents(prev => [...prev, cloned]);
    setSelectedId(id);
    
    setTimeout(() => rebuildThreeMesh(cloned), 50);
    toast.success(`Componente duplicado!`);
  };

  const clearAll = () => {
    if (confirm("Deseja realmente limpar toda a área de trabalho do Blender?")) {
      objectsMapRef.current.forEach((obj) => {
        if (sceneRef.current) {
          safeDisposeMesh(obj);
          sceneRef.current.remove(obj);
        }
      });
      objectsMapRef.current.clear();
      setComponents([]);
      setSelectedId(null);
      toast.info("Área de trabalho limpa");
    }
  };

  // Save projects to LocalStorage
  const saveProject = () => {
    const projId = `project_${Date.now()}`;
    const newProject: SavedProject = {
      id: projId,
      name: currentProjectName,
      createdAt: new Date().toLocaleDateString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      components
    };

    const updated = [newProject, ...savedProjects.filter(p => p.name !== currentProjectName)];
    setSavedProjects(updated);
    localStorage.setItem("isoflex_3d_projects", JSON.stringify(updated));
    toast.success(`Projeto "${currentProjectName}" salvo no navegador!`);
  };

  // Load project
  const loadProject = (project: SavedProject) => {
    // Clear current scene meshes
    objectsMapRef.current.forEach((obj) => {
      if (sceneRef.current) {
        safeDisposeMesh(obj);
        sceneRef.current.remove(obj);
      }
    });
    objectsMapRef.current.clear();

    setComponents(project.components);
    setCurrentProjectName(project.name);
    setSelectedId(null);

    // Rebuild meshes
    project.components.forEach(comp => {
      setTimeout(() => rebuildThreeMesh(comp), 50);
    });
    toast.success(`Projeto "${project.name}" carregado.`);
  };

  const deleteProject = (id: string) => {
    const filtered = savedProjects.filter(p => p.id !== id);
    setSavedProjects(filtered);
    localStorage.setItem("isoflex_3d_projects", JSON.stringify(filtered));
    toast.info("Projeto removido do histórico");
  };

  const loadProjectsFromStorage = () => {
    const data = localStorage.getItem("isoflex_3d_projects");
    if (data) {
      setSavedProjects(JSON.parse(data));
    }
  };

  // Toggle grid visual
  const toggleGrid = () => {
    if (gridHelperRef.current && sceneRef.current) {
      if (showGrid) {
        sceneRef.current.remove(gridHelperRef.current);
      } else {
        sceneRef.current.add(gridHelperRef.current);
      }
      setShowGrid(!showGrid);
    }
  };

  // Calculate Materials automatically (BOM List)
  const calculateBOM = () => {
    let steelMeters = 0;
    let woodSqMeters = 0;
    let connectors = 0;
    let plasticBins = 0;
    let wheels = 0;
    let metalShelves = 0;

    components.forEach(comp => {
      if (comp.type === "GLB") return; // Skip calculation for imported glb files

      const w = comp.width / 1000;
      const h = comp.height / 1000;
      const d = comp.depth / 1000;

      if (comp.type === "Bancada") {
        steelMeters += 4 * (h - 0.03) + 2 * w + 2 * d + 0.8; 
        woodSqMeters += w * d;
        connectors += 16;
        if (comp.hasPegboard) {
          steelMeters += 2 * 0.6 + w;
          woodSqMeters += w * 0.2;
          connectors += 4;
        }
        if (comp.hasDrawers) {
          connectors += 6;
        }
      } else if (comp.type === "FlowRack") {
        const sh = comp.shelvesCount || 3;
        steelMeters += 4 * h + 2 * sh * w + 2 * sh * d;
        plasticBins += sh * 6;
        connectors += 24;
      } else if (comp.type === "Carrinho") {
        const sh = comp.shelfCount || 2;
        steelMeters += 4 * h + 2 * d;
        metalShelves += sh;
        wheels += 4;
        connectors += 12;
      } else if (comp.type === "Estante") {
        const lvls = comp.levelCount || 4;
        steelMeters += 4 * h;
        metalShelves += lvls;
        connectors += lvls * 8;
        steelMeters += Math.sqrt(w * w + h * h) * 2;
      }
    });

    const weightKg = (steelMeters * 2.2) + (woodSqMeters * 12.0) + (metalShelves * 4.5) + (plasticBins * 0.3) + (wheels * 0.8);
    const estimatedCost = (steelMeters * 45) + (woodSqMeters * 180) + (metalShelves * 110) + (plasticBins * 18) + (wheels * 35) + (connectors * 8);

    return {
      steelMeters: steelMeters.toFixed(1),
      woodSqMeters: woodSqMeters.toFixed(2),
      connectors,
      plasticBins,
      wheels,
      metalShelves,
      weightKg: weightKg.toFixed(1),
      cost: estimatedCost.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    };
  };

  const bom = calculateBOM();

  // Export 3D as GLTF/GLB (Including imported GLB models)
  const handleExportGLTF = (binary: boolean = true) => {
    const THREE = window.THREE;
    if (!THREE || !sceneRef.current) {
      toast.error("Three.js não inicializado.");
      return;
    }

    const exporter = new THREE.GLTFExporter();
    
    // Group all user-created and uploaded objects
    const exportGroup = new THREE.Group();
    objectsMapRef.current.forEach((obj) => {
      exportGroup.add(obj.clone());
    });

    exporter.parse(
      exportGroup,
      (result: any) => {
        if (binary) {
          const blob = new Blob([result], { type: "application/octet-stream" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `${currentProjectName.toLowerCase().replace(/\s+/g, "-")}.glb`;
          link.click();
          toast.success("Modelo GLB Exportado!");
        } else {
          const output = JSON.stringify(result, null, 2);
          const blob = new Blob([output], { type: "application/json" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `${currentProjectName.toLowerCase().replace(/\s+/g, "-")}.gltf`;
          link.click();
          toast.success("Modelo GLTF Exportado!");
        }
      },
      (err: any) => {
        console.error("Export failure:", err);
        toast.error("Ocorreu um erro ao exportar.");
      },
      { binary }
    );
  };

  // Generate Professional blueprint Technical PDF
  const handleExportPDF = () => {
    if (!rendererRef.current) {
      toast.error("Renderizador 3D inativo.");
      return;
    }

    const imgData = rendererRef.current.domElement.toDataURL("image/png");
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Falha ao abrir visualizador de impressão. Permita popups.");
      return;
    }

    const dateStr = new Date().toLocaleDateString("pt-BR");
    const bomDetails = calculateBOM();

    const htmlContent = `
      <html>
        <head>
          <title>Blender Isoflex - Technical Report</title>
          <style>
            @media print {
              body { background: white; color: black; }
              .no-print { display: none; }
            }
            body { font-family: 'Segoe UI', sans-serif; margin: 30px; color: #1e293b; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            .header-table td { border: 2px solid #f27b13; padding: 12px; }
            .logo-title { font-size: 24px; font-weight: 900; color: #f27b13; }
            .doc-title { font-size: 18px; font-weight: 700; text-transform: uppercase; }
            .viewport-container { border: 2px solid #334155; text-align: center; padding: 15px; margin-bottom: 25px; background: #282828; }
            .viewport-img { max-width: 100%; max-height: 400px; }
            .bom-title { font-size: 14px; font-weight: 800; text-transform: uppercase; margin-bottom: 10px; border-bottom: 2px solid #f27b13; padding-bottom: 4px; }
            .bom-table { width: 100%; border-collapse: collapse; }
            .bom-table th, .bom-table td { border: 1px solid #94a3b8; padding: 8px 12px; font-size: 12px; }
            .bom-table th { background-color: #f1f5f9; }
          </style>
        </head>
        <body>
          <button class="no-print" style="background:#f27b13;color:white;border:none;padding:8px 16px;cursor:pointer;font-weight:bold;margin-bottom:15px;" onclick="window.print()">Imprimir PDF</button>
          <table class="header-table">
            <tr>
              <td><div class="logo-title">BLENDER ISOFLEX</div></td>
              <td><div class="doc-title">${currentProjectName}</div></td>
              <td><strong>Data:</strong> ${dateStr}</td>
            </tr>
          </table>
          <div class="viewport-container">
            <img class="viewport-img" src="${imgData}" />
          </div>
          <div class="bom-title">BOM - Lista de Materiais</div>
          <table class="bom-table">
            <thead>
              <tr><th>Item</th><th>Quantidade</th></tr>
            </thead>
            <tbody>
              <tr><td>Perfis Metálicos</td><td>${bomDetails.steelMeters} m</td></tr>
              <tr><td>MDF</td><td>${bomDetails.woodSqMeters} m²</td></tr>
              <tr><td>Prateleiras Metálicas</td><td>${bomDetails.metalShelves} un</td></tr>
              <tr><td>Bins Plásticos</td><td>${bomDetails.plasticBins} un</td></tr>
              <tr><td>Rodízios</td><td>${bomDetails.wheels} un</td></tr>
              <tr><td>Peso Geral</td><td>~${bomDetails.weightKg} kg</td></tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const setCameraPreset = (view: "front" | "top" | "side" | "isometric") => {
    if (!cameraRef.current || !controlsRef.current) return;
    controlsRef.current.reset();
    if (view === "front") {
      cameraRef.current.position.set(0, 1.5, 4);
    } else if (view === "top") {
      cameraRef.current.position.set(0, 4, 0.01);
    } else if (view === "side") {
      cameraRef.current.position.set(4, 1.5, 0);
    } else {
      cameraRef.current.position.set(3, 2.5, 3);
    }
    controlsRef.current.update();
  };

  return (
    <div className="flex flex-col h-[95vh] md:h-[750px] bg-[#1e1e1e] text-[#c4c4c4] rounded-2xl overflow-hidden border border-[#2e2e2e] shadow-2xl font-mono text-xs select-none">
      
      {/* Hidden file uploader for GLB */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleGlbUpload} 
        accept=".glb,.gltf" 
        className="hidden" 
      />

      {/* 1. Blender Style Header Menu Bar */}
      <div className="h-auto min-h-9 py-1 md:py-0 bg-[#2e2e2e] border-b border-[#1a1a1a] flex flex-wrap items-center px-2 md:px-4 justify-between gap-1 md:gap-2 select-none shrink-0">
        <div className="flex items-center gap-3 md:gap-6">
          {/* Logo icon Blender Style */}
          <div className="flex items-center gap-1.5 font-black text-white">
            <div className="h-4 w-4 bg-[#f27b13] rounded-full flex items-center justify-center text-[10px] text-white">B</div>
            <span className="hidden sm:inline tracking-tight text-slate-100">Blender Isoflex 3D</span>
          </div>

          {/* Menus */}
          <div className="flex gap-2 md:gap-4 text-[#a3a3a3]">
            <div className="group relative cursor-pointer hover:text-white py-1">
              File
              <div className="absolute top-7 left-0 bg-[#2e2e2e] border border-[#1a1a1a] rounded shadow-xl hidden group-hover:block z-30 w-44 py-1">
                <div className="px-3 py-1.5 hover:bg-[#f27b13] hover:text-white" onClick={saveProject}>Save Project</div>
                <div className="px-3 py-1.5 hover:bg-[#f27b13] hover:text-white" onClick={triggerFileInput}>Import GLB/GLTF...</div>
                <div className="px-3 py-1.5 hover:bg-[#f27b13] hover:text-white" onClick={() => handleExportGLTF(true)}>Export GLB (.glb)</div>
                <div className="px-3 py-1.5 hover:bg-[#f27b13] hover:text-white" onClick={() => handleExportGLTF(false)}>Export GLTF (.gltf)</div>
                <hr className="border-[#1a1a1a] my-1"/>
                <div className="px-3 py-1.5 hover:bg-rose-600 hover:text-white text-rose-400" onClick={clearAll}>New Scene</div>
              </div>
            </div>
            
            <div className="group relative cursor-pointer hover:text-white py-1">
              Add
              <div className="absolute top-7 left-0 bg-[#2e2e2e] border border-[#1a1a1a] rounded shadow-xl hidden group-hover:block z-30 w-44 py-1">
                <div className="px-3 py-1 hover:bg-[#f27b13] hover:text-white" onClick={() => addComponent("Bancada")}>Mesh: Bancada</div>
                <div className="px-3 py-1 hover:bg-[#f27b13] hover:text-white" onClick={() => addComponent("FlowRack")}>Mesh: Flow Rack</div>
                <div className="px-3 py-1 hover:bg-[#f27b13] hover:text-white" onClick={() => addComponent("Carrinho")}>Mesh: Carrinho</div>
                <div className="px-3 py-1 hover:bg-[#f27b13] hover:text-white" onClick={() => addComponent("Estante")}>Mesh: Estante</div>
              </div>
            </div>

            <div className="cursor-pointer hover:text-white py-1" onClick={handleExportPDF}>Render</div>
          </div>
        </div>

        {/* Project Name Selector */}
        <div className="flex items-center gap-2">
          <Input 
            value={currentProjectName}
            onChange={(e) => setCurrentProjectName(e.target.value)}
            className="bg-[#1e1e1e] border-[#3d3d3d] h-6 text-white text-[11px] w-28 md:w-48 rounded font-mono px-2 focus-visible:ring-[#f27b13]"
          />
          <Badge className="hidden sm:inline-flex bg-[#f27b13]/25 text-[#f27b13] border border-[#f27b13]/40 text-[9px] px-2 py-0.5">ACTIVE</Badge>
        </div>
      </div>

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Left Toolbar - Mode Toggles (Blender style) */}
        <div className="w-full md:w-12 h-auto py-2 md:py-4 px-4 md:px-0 bg-[#2a2a2a] border-b md:border-b-0 md:border-r border-[#1a1a1a] flex flex-row md:flex-col items-center justify-around md:justify-start gap-3 text-[#8a8a8a] shrink-0">
          <button className={`p-2 rounded-lg hover:text-white ${selectedId ? "text-[#f27b13]" : ""}`} title="Select Object">
            <Compass className="h-5 w-5" />
          </button>
          <button className="p-2 rounded-lg hover:text-white" title="Translate / Move">
            <Move className="h-5 w-5" />
          </button>
          <button className="p-2 rounded-lg hover:text-white" title="Rotate">
            <RotateCw className="h-5 w-5" />
          </button>
          <button className="p-2 rounded-lg hover:text-white" title="Scale">
            <Maximize className="h-5 w-5" />
          </button>
          <span className="hidden md:block w-6 h-[1px] bg-[#3d3d3d] my-1"></span>
          <button className="p-2 rounded-lg hover:text-white text-[#ef4444]" onClick={clearAll} title="Limpar Cena">
            <Trash2 className="h-5 w-5" />
          </button>
        </div>

        {/* Middle Area: Viewport Canvas */}
        <div className="flex-1 flex flex-col bg-[#3d3d3d] relative min-h-[350px] md:min-h-0">
          
          {/* Top Viewport Header */}
          <div className="absolute top-2 left-2 z-10 flex gap-2">
            <span className="bg-[#1e1e1e]/90 text-white px-2 py-0.5 rounded text-[10px] border border-[#2e2e2e]">User Perspective</span>
            {snapEnabled && (
              <span className="bg-[#f27b13]/20 text-[#f27b13] px-2 py-0.5 rounded text-[10px] border border-[#f27b13]/40">Snap: {snapInterval}mm</span>
            )}
          </div>

          {/* Top Right Gizmo & Snap controls */}
          <div className="absolute top-2 right-2 z-10 flex gap-1 md:gap-1.5 bg-[#2e2e2e]/90 p-1 rounded-lg border border-[#1a1a1a] items-center">
            <select
              value={bgTheme}
              onChange={(e) => setBgTheme(e.target.value as any)}
              className="h-5 bg-[#1e1e1e] border-none text-[#c4c4c4] text-[9px] font-mono outline-none cursor-pointer rounded px-1 focus:ring-1 focus:ring-[#f27b13] hidden sm:block"
              title="Cenário"
            >
              <option value="studio_dark">Dark Studio</option>
              <option value="studio_light">Light Studio</option>
              <option value="blueprint">Blueprint</option>
              <option value="workshop">Fábrica</option>
            </select>
            <span className="w-[1px] bg-[#3d3d3d] h-3 mx-0.5 hidden sm:block"></span>
            <Button size="xs" variant="ghost" className="h-5 text-[9px] text-[#c4c4c4] hover:text-white px-1.5" onClick={() => setCameraPreset("isometric")}>ISO</Button>
            <Button size="xs" variant="ghost" className="h-5 text-[9px] text-[#c4c4c4] hover:text-white px-1.5 hidden sm:inline-flex" onClick={() => setCameraPreset("top")}>TOP</Button>
            <Button size="xs" variant="ghost" className="h-5 text-[9px] text-[#c4c4c4] hover:text-white px-1.5 hidden sm:inline-flex" onClick={() => setCameraPreset("front")}>FRONT</Button>
            <span className="w-[1px] bg-[#3d3d3d] h-3 mx-0.5"></span>
            <Button size="xs" variant="ghost" className={`h-5 px-1 ${showGrid ? "text-[#f27b13]" : "text-[#c4c4c4]"}`} onClick={toggleGrid} title="Grade">
              <Grid className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Mobile: Floating Properties Toggle Button */}
          {isMobile && (
            <button
              onClick={() => setMobilePropsOpen(!mobilePropsOpen)}
              className="absolute bottom-14 right-3 z-20 bg-[#f27b13] hover:bg-[#d3680e] text-white p-2.5 rounded-full shadow-lg shadow-black/40 transition-all active:scale-95"
              title="Propriedades"
            >
              <PanelRight className="h-5 w-5" />
            </button>
          )}

          {/* Loader */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1e1e1e] z-20">
              <RefreshCw className="h-8 w-8 text-[#f27b13] animate-spin mb-2" />
              <p className="text-xs text-[#a3a3a3]">Inicializando Blender 3D Engine...</p>
            </div>
          )}

          {/* Canvas */}
          <div ref={containerRef} className="w-full flex-1" />

          {/* Timeline / Animation Bar Mockup (Highly Blender-like visual detail) */}
          <div className="h-10 bg-[#282828] border-t border-[#1a1a1a] flex items-center px-4 gap-3 text-[10px] select-none text-[#a3a3a3]">
            <Play className="h-4 w-4 text-[#f27b13] fill-[#f27b13] cursor-pointer hover:scale-110 transition-all" />
            <span className="text-white font-bold">Timeline:</span>
            <div className="flex-1 bg-[#1e1e1e] h-2.5 rounded relative border border-[#121212] overflow-hidden">
              <div className="absolute left-[35%] top-0 bottom-0 w-0.5 bg-[#f27b13]" />
              <div className="absolute left-0 right-0 top-0 bottom-0 bg-[linear-gradient(to_right,#3d3d3d_1px,transparent_1px)] bg-[size:40px_100%] opacity-20" />
            </div>
            <span className="font-mono text-[9px]">Frame: 1 / 250</span>
          </div>
        </div>

        {/* Right Sidebar - Blender Outliner & Property Editor */}
        {/* On mobile: absolute overlay panel that slides in */}
        {(!isMobile || mobilePropsOpen) && (
        <div 
          className={`${isMobile ? "absolute inset-y-0 right-0 z-30 w-72 shadow-2xl shadow-black/50" : "w-72"} bg-[#2e2e2e] border-l border-[#1a1a1a] flex flex-col overflow-hidden`}
          style={isMobile ? { animation: "slideInRight 0.2s ease-out" } : undefined}
        >
          {/* Mobile close button */}
          {isMobile && (
            <button
              onClick={() => setMobilePropsOpen(false)}
              className="absolute top-1 right-1 z-40 bg-[#1e1e1e] hover:bg-rose-600 text-white p-1 rounded-full transition-colors"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
          
          {/* Outliner (List of Scene Objects) */}
          <div className="h-44 border-b border-[#1a1a1a] flex flex-col overflow-hidden">
            <div className="h-7 bg-[#252525] px-3 flex items-center justify-between text-[10px] uppercase font-bold text-[#8a8a8a] border-b border-[#1a1a1a]">
              <span className="flex items-center gap-1"><List className="h-3 w-3" /> Scene Collection</span>
              <span>{components.length} objects</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-[#282828]">
              {components.map((c) => (
                <div 
                  key={c.id} 
                  className={`flex justify-between items-center px-2 py-1 rounded cursor-pointer transition-all ${selectedId === c.id ? "bg-[#f27b13] text-white" : "hover:bg-[#3d3d3d] text-[#c4c4c4]"}`}
                  onClick={() => setSelectedId(c.id)}
                >
                  <span className="flex items-center gap-1.5 truncate max-w-[170px]">
                    <Box className="h-3 w-3" /> {c.name}
                  </span>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={(e) => { e.stopPropagation(); duplicateComponent(c); }} 
                      className="hover:text-[#f27b13] text-slate-400"
                      title="Duplicar"
                    >
                      <Layers3 className="h-3 w-3" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteComponent(c.id); }} 
                      className="hover:text-rose-500 text-slate-400"
                      title="Excluir"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
              {components.length === 0 && (
                <div className="text-[10px] text-center text-slate-600 py-6">Empty Collection</div>
              )}
            </div>
          </div>

          {/* Properties Editor Tabs */}
          <div className="h-7 bg-[#252525] border-b border-[#1a1a1a] flex text-[10px] select-none text-[#8a8a8a]">
            <button 
              className={`flex-1 text-center font-bold border-r border-[#1a1a1a] hover:text-white ${propertiesTab === "object" ? "bg-[#2e2e2e] text-[#f27b13]" : ""}`}
              onClick={() => setPropertiesTab("object")}
            >
              Transform
            </button>
            <button 
              className={`flex-1 text-center font-bold border-r border-[#1a1a1a] hover:text-white ${propertiesTab === "parametric" ? "bg-[#2e2e2e] text-[#f27b13]" : ""}`}
              onClick={() => setPropertiesTab("parametric")}
            >
              Params
            </button>
            <button 
              className={`flex-1 text-center font-bold hover:text-white ${propertiesTab === "material" ? "bg-[#2e2e2e] text-[#f27b13]" : ""}`}
              onClick={() => setPropertiesTab("material")}
            >
              Material
            </button>
          </div>

          {/* Properties Editor content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-[#2e2e2e] text-[#c4c4c4]">
            {selectedComp ? (
              <>
                {/* 1. Transform Section */}
                {propertiesTab === "object" && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] uppercase font-bold text-slate-500 border-b border-[#3d3d3d] pb-1">Dimensions (mm)</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[8px] text-slate-500 block mb-0.5">Width</span>
                        <Input 
                          type="number" 
                          value={selectedComp.width}
                          disabled={selectedComp.type === "GLB"}
                          onChange={(e) => updateComponentProperty(selectedComp.id, "width", Number(e.target.value))}
                          className="h-6 text-center text-xs font-semibold bg-[#1e1e1e] border-[#3d3d3d] text-white rounded p-0"
                        />
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-500 block mb-0.5">Height</span>
                        <Input 
                          type="number" 
                          value={selectedComp.height}
                          disabled={selectedComp.type === "GLB"}
                          onChange={(e) => updateComponentProperty(selectedComp.id, "height", Number(e.target.value))}
                          className="h-6 text-center text-xs font-semibold bg-[#1e1e1e] border-[#3d3d3d] text-white rounded p-0"
                        />
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-500 block mb-0.5">Depth</span>
                        <Input 
                          type="number" 
                          value={selectedComp.depth}
                          disabled={selectedComp.type === "GLB"}
                          onChange={(e) => updateComponentProperty(selectedComp.id, "depth", Number(e.target.value))}
                          className="h-6 text-center text-xs font-semibold bg-[#1e1e1e] border-[#3d3d3d] text-white rounded p-0"
                        />
                      </div>
                    </div>

                    <h4 className="text-[10px] uppercase font-bold text-slate-500 border-b border-[#3d3d3d] pb-1 pt-2">Location X/Y/Z (mm)</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Input 
                          type="number" 
                          step={snapInterval}
                          value={selectedComp.posX} 
                          onChange={(e) => updateComponentProperty(selectedComp.id, "posX", Number(e.target.value))}
                          className="h-6 text-center text-xs font-semibold bg-[#1e1e1e] border-[#3d3d3d] text-white rounded p-0"
                        />
                      </div>
                      <div>
                        <Input 
                          type="number" 
                          step={snapInterval}
                          value={selectedComp.posY} 
                          onChange={(e) => updateComponentProperty(selectedComp.id, "posY", Number(e.target.value))}
                          className="h-6 text-center text-xs font-semibold bg-[#1e1e1e] border-[#3d3d3d] text-white rounded p-0"
                        />
                      </div>
                      <div>
                        <Input 
                          type="number" 
                          step={snapInterval}
                          value={selectedComp.posZ} 
                          onChange={(e) => updateComponentProperty(selectedComp.id, "posZ", Number(e.target.value))}
                          className="h-6 text-center text-xs font-semibold bg-[#1e1e1e] border-[#3d3d3d] text-white rounded p-0"
                        />
                      </div>
                    </div>

                    <h4 className="text-[10px] uppercase font-bold text-slate-500 border-b border-[#3d3d3d] pb-1 pt-2">Rotation Y (Degrees)</h4>
                    <div className="space-y-1">
                      <input 
                        type="range" 
                        min="0" 
                        max="360" 
                        step="45"
                        value={selectedComp.rotY} 
                        onChange={(e) => updateComponentProperty(selectedComp.id, "rotY", Number(e.target.value))}
                        className="w-full accent-[#f27b13] h-1 bg-[#1e1e1e] rounded appearance-none cursor-pointer"
                      />
                      <div className="text-right text-[10px] text-slate-400 font-bold">{selectedComp.rotY}°</div>
                    </div>
                  </div>
                )}

                {/* 2. Parametric Config */}
                {propertiesTab === "parametric" && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] uppercase font-bold text-slate-500 border-b border-[#3d3d3d] pb-1">Parametric Modifiers</h4>
                    
                    {selectedComp.type === "GLB" && (
                      <div className="text-xs text-slate-500 py-4 flex gap-1 items-center">
                        <Info className="h-4 w-4" /> No modifiers for GLB structures.
                      </div>
                    )}

                    {/* ── Tube / Profile Settings (all non-GLB types) ── */}
                    {selectedComp.type !== "GLB" && (
                      <div className="space-y-2 border border-[#3d3d3d] rounded p-2 bg-[#252525]">
                        <h5 className="text-[9px] uppercase font-bold text-[#f27b13]">Perfil / Tubo</h5>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[8px] text-slate-500 block mb-0.5">Tipo Perfil</span>
                            <select
                              value={selectedComp.tubeType || "redondo"}
                              onChange={(e) => updateComponentProperty(selectedComp.id, "tubeType", e.target.value)}
                              className="w-full h-6 bg-[#1e1e1e] border border-[#3d3d3d] text-white text-[10px] rounded px-1 outline-none focus:ring-1 focus:ring-[#f27b13]"
                            >
                              <option value="redondo">Tubo Redondo</option>
                              <option value="quadrado">Perfil Quadrado</option>
                            </select>
                          </div>
                          <div>
                            <span className="text-[8px] text-slate-500 block mb-0.5">Diâmetro (mm)</span>
                            <Input
                              type="number"
                              min="20"
                              max="50"
                              step="2"
                              value={selectedComp.tubeDiameter || 28}
                              onChange={(e) => updateComponentProperty(selectedComp.id, "tubeDiameter", Number(e.target.value))}
                              className="h-6 bg-[#1e1e1e] border-[#3d3d3d] text-white rounded px-2 text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-500 block mb-0.5">Cor Conectores</span>
                          <div className="flex gap-1.5">
                            {[
                              { hex: "#27272a", name: "Preto" },
                              { hex: "#374151", name: "Grafite" },
                              { hex: "#1a4fd6", name: "Azul" },
                              { hex: "#f59e0b", name: "Amarelo" },
                              { hex: "#ef4444", name: "Vermelho" },
                            ].map((cc) => (
                              <button
                                key={cc.hex}
                                style={{ backgroundColor: cc.hex }}
                                className={`h-5 w-5 rounded-sm border border-slate-700 transition-all ${selectedComp.connectorColor === cc.hex ? "ring-2 ring-[#f27b13] scale-110" : "opacity-70 hover:opacity-100"}`}
                                title={cc.name}
                                onClick={() => updateComponentProperty(selectedComp.id, "connectorColor", cc.hex)}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── Rodízios / Wheels (all non-GLB types) ── */}
                    {selectedComp.type !== "GLB" && (
                      <div className="space-y-2 border border-[#3d3d3d] rounded p-2 bg-[#252525]">
                        <h5 className="text-[9px] uppercase font-bold text-[#f27b13]">Rodízios / Casters</h5>
                        <div className="flex justify-between items-center text-[10px]">
                          <span>Ativar Rodízios</span>
                          <input
                            type="checkbox"
                            checked={selectedComp.hasWheels || selectedComp.type === "Carrinho"}
                            onChange={(e) => updateComponentProperty(selectedComp.id, "hasWheels", e.target.checked)}
                            className="rounded bg-[#1e1e1e] border-[#3d3d3d] accent-[#f27b13]"
                          />
                        </div>
                        {(selectedComp.hasWheels || selectedComp.type === "Carrinho") && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[8px] text-slate-500 block mb-0.5">Diâmetro (mm)</span>
                              <Input
                                type="number"
                                min="50"
                                max="200"
                                step="25"
                                value={selectedComp.wheelsDiameter || 100}
                                onChange={(e) => updateComponentProperty(selectedComp.id, "wheelsDiameter", Number(e.target.value))}
                                className="h-6 bg-[#1e1e1e] border-[#3d3d3d] text-white rounded px-2 text-xs"
                              />
                            </div>
                            <div>
                              <span className="text-[8px] text-slate-500 block mb-0.5">Tipo Rodízio</span>
                              <select
                                value={selectedComp.wheelsType || "giratorio"}
                                onChange={(e) => updateComponentProperty(selectedComp.id, "wheelsType", e.target.value)}
                                className="w-full h-6 bg-[#1e1e1e] border border-[#3d3d3d] text-white text-[10px] rounded px-1 outline-none focus:ring-1 focus:ring-[#f27b13]"
                              >
                                <option value="giratorio">Giratório</option>
                                <option value="com_trava">Com Trava</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Type-Specific Controls ── */}
                    {selectedComp.type === "Bancada" && (
                      <div className="space-y-2 border border-[#3d3d3d] rounded p-2 bg-[#252525]">
                        <h5 className="text-[9px] uppercase font-bold text-[#f27b13]">Bancada Opções</h5>
                        <div className="flex justify-between items-center text-[10px]">
                          <span>Pegboard Panel</span>
                          <input 
                            type="checkbox" 
                            checked={selectedComp.hasPegboard} 
                            onChange={(e) => updateComponentProperty(selectedComp.id, "hasPegboard", e.target.checked)}
                            className="rounded bg-[#1e1e1e] border-[#3d3d3d] accent-[#f27b13]"
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span>Drawers Module</span>
                          <input 
                            type="checkbox" 
                            checked={selectedComp.hasDrawers} 
                            onChange={(e) => updateComponentProperty(selectedComp.id, "hasDrawers", e.target.checked)}
                            className="rounded bg-[#1e1e1e] border-[#3d3d3d] accent-[#f27b13]"
                          />
                        </div>
                      </div>
                    )}

                    {selectedComp.type === "FlowRack" && (
                      <div className="space-y-2 border border-[#3d3d3d] rounded p-2 bg-[#252525]">
                        <h5 className="text-[9px] uppercase font-bold text-[#f27b13]">Flow Rack Config</h5>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[8px] text-slate-500 block mb-0.5">Nº Prateleiras</span>
                            <Input 
                              type="number" 
                              min="2" 
                              max="6"
                              value={selectedComp.shelvesCount} 
                              onChange={(e) => updateComponentProperty(selectedComp.id, "shelvesCount", Number(e.target.value))}
                              className="h-6 bg-[#1e1e1e] border-[#3d3d3d] text-white rounded px-2 text-xs"
                            />
                          </div>
                          <div>
                            <span className="text-[8px] text-slate-500 block mb-0.5">Ângulo (°)</span>
                            <Input 
                              type="number" 
                              min="0" 
                              max="20"
                              value={selectedComp.shelfAngle} 
                              onChange={(e) => updateComponentProperty(selectedComp.id, "shelfAngle", Number(e.target.value))}
                              className="h-6 bg-[#1e1e1e] border-[#3d3d3d] text-white rounded px-2 text-xs"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[8px] text-slate-500 block mb-0.5">Nº Pistas (Lanes)</span>
                            <Input 
                              type="number" 
                              min="1" 
                              max="5"
                              value={selectedComp.flowLanesCount || 2} 
                              onChange={(e) => updateComponentProperty(selectedComp.id, "flowLanesCount", Number(e.target.value))}
                              className="h-6 bg-[#1e1e1e] border-[#3d3d3d] text-white rounded px-2 text-xs"
                            />
                          </div>
                          <div>
                            <span className="text-[8px] text-slate-500 block mb-0.5">Cor Bins</span>
                            <div className="flex gap-1">
                              {["#1a4fd6", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6"].map((bc) => (
                                <button
                                  key={bc}
                                  style={{ backgroundColor: bc }}
                                  className={`h-5 w-5 rounded-sm border border-slate-700 transition-all ${(selectedComp.binColor || "#1a4fd6") === bc ? "ring-2 ring-[#f27b13] scale-110" : "opacity-70 hover:opacity-100"}`}
                                  onClick={() => updateComponentProperty(selectedComp.id, "binColor", bc)}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedComp.type === "Carrinho" && (
                      <div className="space-y-2 border border-[#3d3d3d] rounded p-2 bg-[#252525]">
                        <h5 className="text-[9px] uppercase font-bold text-[#f27b13]">Carrinho Config</h5>
                        <div>
                          <span className="text-[8px] text-slate-500 block mb-0.5">Nº Prateleiras</span>
                          <Input 
                            type="number" 
                            min="1" 
                            max="5"
                            value={selectedComp.shelfCount} 
                            onChange={(e) => updateComponentProperty(selectedComp.id, "shelfCount", Number(e.target.value))}
                            className="h-6 bg-[#1e1e1e] border-[#3d3d3d] text-white rounded px-2 text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {selectedComp.type === "Estante" && (
                      <div className="space-y-2 border border-[#3d3d3d] rounded p-2 bg-[#252525]">
                        <h5 className="text-[9px] uppercase font-bold text-[#f27b13]">Estante Config</h5>
                        <div>
                          <span className="text-[8px] text-slate-500 block mb-0.5">Nº Níveis</span>
                          <Input 
                            type="number" 
                            min="2" 
                            max="8"
                            value={selectedComp.levelCount} 
                            onChange={(e) => updateComponentProperty(selectedComp.id, "levelCount", Number(e.target.value))}
                            className="h-6 bg-[#1e1e1e] border-[#3d3d3d] text-white rounded px-2 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Materials / Colors */}
                {propertiesTab === "material" && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] uppercase font-bold text-slate-500 border-b border-[#3d3d3d] pb-1">Blender Finishes</h4>
                    
                    {selectedComp.type === "GLB" && (
                      <div className="text-xs text-slate-500 py-4 flex gap-1 items-center">
                        <Info className="h-4 w-4" /> GLB meshes use embedded textures.
                      </div>
                    )}
                    
                    {selectedComp.type !== "GLB" && (
                      <div className="grid grid-cols-4 gap-2">
                        {isoflexColors.map((col) => (
                          <button 
                            key={col.hex} 
                            style={{ backgroundColor: col.hex }} 
                            className={`h-7 w-7 rounded border border-slate-950 transition-all ${selectedComp.color === col.hex ? "ring-2 ring-[#f27b13] scale-110" : "opacity-75 hover:opacity-100"}`}
                            title={col.name}
                            onClick={() => updateComponentProperty(selectedComp.id, "color", col.hex)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-slate-500 py-12 flex flex-col items-center">
                <Info className="h-6 w-6 mb-2 text-[#f27b13]" />
                Select an object from the Collection to edit properties.
              </div>
            )}
          </div>
        </div>
        )}

      </div>

      {/* 3. Bottom Blender spreadsheet / BOM list / Projects Panel */}
      <div className={`${isMobile ? "h-auto max-h-60 overflow-y-auto" : "h-32"} bg-[#252525] border-t border-[#1a1a1a] grid grid-cols-1 md:grid-cols-3 text-[10px] overflow-hidden`}>
        
        {/* Recent projects */}
        <div className="border-r border-[#1a1a1a] flex flex-col overflow-hidden">
          <div className="h-6 bg-[#2e2e2e] px-2 flex items-center justify-between font-bold border-b border-[#1a1a1a] text-[#8a8a8a]">
            <span>Recent Scenes</span>
            <FolderOpen className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {savedProjects.length === 0 ? (
              <div className="text-[9px] text-[#5c5c5c] text-center py-4">No recent Blender files.</div>
            ) : (
              savedProjects.map((p) => (
                <div key={p.id} className="flex justify-between items-center bg-[#1e1e1e] p-1 rounded border border-[#2e2e2e]">
                  <span className="truncate max-w-[130px] text-[#c4c4c4] cursor-pointer hover:text-[#f27b13]" onClick={() => loadProject(p)}>{p.name}</span>
                  <div className="flex gap-1.5">
                    <button className="text-[9px] hover:text-white text-[#8a8a8a]" onClick={() => loadProject(p)}>OPEN</button>
                    <button onClick={() => deleteProject(p.id)} className="hover:text-rose-500 text-[#8a8a8a]">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Real-time Material spreadsheet (BOM) */}
        <div className="border-r border-[#1a1a1a] flex flex-col overflow-hidden">
          <div className="h-6 bg-[#2e2e2e] px-2 flex items-center justify-between font-bold border-b border-[#1a1a1a] text-[#8a8a8a]">
            <span>BOM Spreadsheet</span>
            <FileCode className="h-3.5 w-3.5 text-[#f27b13]" />
          </div>
          <div className="flex-1 p-2 grid grid-cols-2 gap-x-4 gap-y-1 bg-[#282828] text-slate-400">
            <div className="flex justify-between"><span>Steel Profiles:</span><strong className="text-white">{bom.steelMeters}m</strong></div>
            <div className="flex justify-between"><span>Castors:</span><strong className="text-white">{bom.wheels} un</strong></div>
            <div className="flex justify-between"><span>Timber MDF:</span><strong className="text-white">{bom.woodSqMeters}m²</strong></div>
            <div className="flex justify-between"><span>Metal Shelves:</span><strong className="text-white">{bom.metalShelves} un</strong></div>
            <div className="flex justify-between border-t border-[#3d3d3d] pt-1"><span>Est. Weight:</span><strong className="text-[#f27b13]">~{bom.weightKg}kg</strong></div>
            <div className="flex justify-between border-t border-[#3d3d3d] pt-1"><span>Est. Cost:</span><strong className="text-[#f27b13]">R$ {bom.cost}</strong></div>
          </div>
        </div>

        {/* Exporters and quick settings */}
        <div className="flex flex-col overflow-hidden bg-[#2e2e2e]">
          <div className="h-6 bg-[#252525] px-2 flex items-center justify-between font-bold border-b border-[#1a1a1a] text-[#8a8a8a]">
            <span>Export & Print Panel</span>
            <Settings className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 p-2 flex flex-col gap-2 justify-center">
            <div className="grid grid-cols-2 gap-2">
              <Button size="xs" className="h-7 bg-[#1e1e1e] hover:bg-[#3d3d3d] text-white border border-[#1a1a1a]" onClick={() => handleExportGLTF(true)}>
                Export GLB (3D)
              </Button>
              <Button size="xs" className="h-7 bg-[#1e1e1e] hover:bg-[#3d3d3d] text-white border border-[#1a1a1a]" onClick={() => handleExportGLTF(false)}>
                Export GLTF
              </Button>
            </div>
            <Button size="xs" className="h-7 bg-[#f27b13] hover:bg-[#d3680e] text-white font-bold" onClick={handleExportPDF}>
              Render Technical Blueprint (PDF)
            </Button>
          </div>
        </div>

      </div>

    </div>
  );
}
