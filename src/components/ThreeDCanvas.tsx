import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Undo
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
  // Specific settings
  shelvesCount?: number;
  shelfAngle?: number;
  hasPegboard?: boolean;
  hasDrawers?: boolean;
  shelfCount?: number; // for Carrinho
  wheelsDiameter?: number;
  levelCount?: number; // for Estante
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
  
  // Projects & Components State
  const [components, setComponents] = useState<ParametricComponent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [currentProjectName, setCurrentProjectName] = useState("Projeto Isoflex Sem Nome");

  // Grid / Snap Configuration
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapInterval, setSnapInterval] = useState(100); // 100mm default
  const [showGrid, setShowGrid] = useState(true);
  
  // Selected component edit state
  const [selectedComp, setSelectedComp] = useState<ParametricComponent | null>(null);

  // Three.js instances refs
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const raycasterRef = useRef<any>(null);
  const mouseRef = useRef<any>(null);
  const objectsMapRef = useRef<Map<string, any>>(new Map());
  const gridHelperRef = useRef<any>(null);

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

  // Update parameters fields of selected component when selection changes
  useEffect(() => {
    if (selectedId) {
      const comp = components.find(c => c.id === selectedId);
      if (comp) {
        setSelectedComp(comp);
      }
    } else {
      setSelectedComp(null);
    }
  }, [selectedId, components]);

  const initScene = () => {
    if (!containerRef.current || !window.THREE) return;
    
    const THREE = window.THREE;
    const container = containerRef.current;
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0f172a"); // Charcoal/Dark CAD backdrop
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(4, 3, 5);
    cameraRef.current = camera;

    // Renderer (with preserveDrawingBuffer: true for PDF snapshots)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 0.3);
    dirLight2.position.set(-10, 10, -10);
    scene.add(dirLight2);

    // Grid Helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x3b82f6, 0x334155);
    gridHelper.position.y = 0;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // Orbit Controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Keep camera above grid
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

    // Click handler to select components
    const handleCanvasClick = (e: MouseEvent) => {
      if (!rendererRef.current || !cameraRef.current || !raycasterRef.current) return;
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      
      raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(scene.children, true);
      
      if (intersects.length > 0) {
        let obj = intersects[0].object;
        // Traverse up to find user group
        while (obj && obj.parent && obj.parent !== scene) {
          obj = obj.parent;
        }
        if (objectsMapRef.current.has(obj.name)) {
          setSelectedId(obj.name);
          return;
        }
      }
    };
    renderer.domElement.addEventListener("click", handleCanvasClick);

    // Render loop
    const animate = () => {
      requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();
  };

  // Custom materials creators
  const getSteelMaterial = (THREE: any, colorHex: string) => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: 0.3,
      metalness: 0.7,
    });
  };

  const getWoodMaterial = (THREE: any) => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#c29153"),
      roughness: 0.7,
      metalness: 0.05,
    });
  };

  const getPlasticMaterial = (THREE: any, colorHex: string) => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: 0.5,
      metalness: 0.1,
    });
  };

  const getCasterMaterial = (THREE: any) => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#1e293b"),
      roughness: 0.8,
      metalness: 0.2,
    });
  };

  // Parametric Assembly builders
  const rebuildThreeMesh = (comp: ParametricComponent) => {
    const THREE = window.THREE;
    if (!THREE || !sceneRef.current) return;

    // Remove old mesh
    const oldMesh = objectsMapRef.current.get(comp.id);
    if (oldMesh) {
      sceneRef.current.remove(oldMesh);
      objectsMapRef.current.delete(comp.id);
    }

    const group = new THREE.Group();
    group.name = comp.id;

    const w = comp.width / 1000;
    const h = comp.height / 1000;
    const d = comp.depth / 1000;

    const steelMat = getSteelMaterial(THREE, comp.color);
    const darkSteelMat = getSteelMaterial(THREE, "#334155");
    const woodMat = getWoodMaterial(THREE);
    const plasticMat = getPlasticMaterial(THREE, "#ef4444"); // Red bin boxes

    if (comp.type === "Bancada") {
      // 1. Tabletop
      const topGeo = new THREE.BoxGeometry(w, 0.03, d);
      const top = new THREE.Mesh(topGeo, woodMat);
      top.position.y = h - 0.015;
      top.castShadow = true;
      top.receiveShadow = true;
      group.add(top);

      // 2. Legs (4 corner columns)
      const legH = h - 0.03;
      const legGeo = new THREE.BoxGeometry(0.04, legH, 0.04);
      const corners = [
        [-w / 2 + 0.02, -d / 2 + 0.02],
        [-w / 2 + 0.02, d / 2 - 0.02],
        [w / 2 - 0.02, -d / 2 + 0.02],
        [w / 2 - 0.02, d / 2 - 0.02],
      ];
      corners.forEach(([cx, cz]) => {
        const leg = new THREE.Mesh(legGeo, steelMat);
        leg.position.set(cx, legH / 2, cz);
        leg.castShadow = true;
        leg.receiveShadow = true;
        group.add(leg);
      });

      // 3. Lower framing structure
      const supportGeo = new THREE.BoxGeometry(w - 0.08, 0.03, 0.03);
      const support = new THREE.Mesh(supportGeo, steelMat);
      support.position.set(0, 0.15, 0);
      support.castShadow = true;
      group.add(support);

      // 4. Optional Pegboard
      if (comp.hasPegboard) {
        const pegH = 0.6;
        const pegGeo = new THREE.BoxGeometry(w, pegH, 0.01);
        const pegboard = new THREE.Mesh(pegGeo, darkSteelMat);
        pegboard.position.set(0, h + pegH / 2, -d / 2 + 0.005);
        pegboard.castShadow = true;
        group.add(pegboard);

        // Top Shelf on Pegboard
        const pegShelfGeo = new THREE.BoxGeometry(w, 0.015, 0.2);
        const pegShelf = new THREE.Mesh(pegShelfGeo, woodMat);
        pegShelf.position.set(0, h + pegH - 0.05, -d / 2 + 0.1);
        pegShelf.castShadow = true;
        group.add(pegShelf);
      }

      // 5. Optional Drawers
      if (comp.hasDrawers) {
        const dW = 0.4;
        const dH = 0.25;
        const dD = d - 0.1;
        const drawerGeo = new THREE.BoxGeometry(dW, dH, dD);
        const drawer = new THREE.Mesh(drawerGeo, darkSteelMat);
        drawer.position.set(w / 4, h - 0.03 - dH / 2, 0);
        drawer.castShadow = true;
        group.add(drawer);

        // Drawer Handles
        const handleGeo = new THREE.BoxGeometry(0.15, 0.02, 0.02);
        const handle = new THREE.Mesh(handleGeo, steelMat);
        handle.position.set(w / 4, h - 0.03 - dH / 2, dD / 2 + 0.01);
        group.add(handle);
      }

    } else if (comp.type === "FlowRack") {
      const shelfCount = comp.shelvesCount || 3;
      const angleRad = ((comp.shelfAngle || 5) * Math.PI) / 180;

      // 1. Verticals post structure
      const uprightGeo = new THREE.BoxGeometry(0.04, h, 0.04);
      const positions = [
        [-w / 2 + 0.02, -d / 2 + 0.02],
        [-w / 2 + 0.02, d / 2 - 0.02],
        [w / 2 - 0.02, -d / 2 + 0.02],
        [w / 2 - 0.02, d / 2 - 0.02],
      ];
      positions.forEach(([cx, cz]) => {
        const upright = new THREE.Mesh(uprightGeo, steelMat);
        upright.position.set(cx, h / 2, cz);
        upright.castShadow = true;
        upright.receiveShadow = true;
        group.add(upright);
      });

      // 2. Slanted roller shelves
      for (let i = 0; i < shelfCount; i++) {
        const shelfH = 0.25 + (i * (h - 0.4)) / (shelfCount - 1 || 1);
        const shelfGroup = new THREE.Group();
        shelfGroup.position.set(0, shelfH, 0);
        shelfGroup.rotation.x = angleRad; // Slanted shelf

        // Shelf frame sides
        const frameGeo = new THREE.BoxGeometry(w, 0.03, 0.03);
        const frameF = new THREE.Mesh(frameGeo, darkSteelMat);
        frameF.position.set(0, 0, d / 2);
        frameF.castShadow = true;
        shelfGroup.add(frameF);

        const frameB = new THREE.Mesh(frameGeo, darkSteelMat);
        frameB.position.set(0, 0, -d / 2);
        frameB.castShadow = true;
        shelfGroup.add(frameB);

        // Roller rails (3 tracks per shelf)
        const railGeo = new THREE.BoxGeometry(0.02, 0.02, d);
        for (let r = 0; r < 3; r++) {
          const railX = -w / 3 + (r * w) / 3;
          const rail = new THREE.Mesh(railGeo, steelMat);
          rail.position.set(railX, 0.01, 0);
          rail.castShadow = true;
          shelfGroup.add(rail);

          // Add simulated small plastic boxes on these rails
          const binGeo = new THREE.BoxGeometry(0.2, 0.12, 0.3);
          const binMat = getPlasticMaterial(THREE, r === 0 ? "#1a4fd6" : r === 1 ? "#f59e0b" : "#ef4444");
          
          const bin1 = new THREE.Mesh(binGeo, binMat);
          bin1.position.set(railX, 0.07, -d / 4);
          bin1.castShadow = true;
          shelfGroup.add(bin1);

          const bin2 = new THREE.Mesh(binGeo, binMat);
          bin2.position.set(railX, 0.07, d / 4);
          bin2.castShadow = true;
          shelfGroup.add(bin2);
        }

        group.add(shelfGroup);
      }

    } else if (comp.type === "Carrinho") {
      const shCount = comp.shelfCount || 2;
      const wheelD = (comp.wheelsDiameter || 100) / 1000;

      // 1. Caster Wheels at bottom
      const wheelGeo = new THREE.CylinderGeometry(wheelD / 2, wheelD / 2, 0.03, 16);
      const wheelMat = getCasterMaterial(THREE);
      const wheelOffset = wheelD / 2;

      const baseCords = [
        [-w / 2 + 0.06, -d / 2 + 0.06],
        [-w / 2 + 0.06, d / 2 - 0.06],
        [w / 2 - 0.06, -d / 2 + 0.06],
        [w / 2 - 0.06, d / 2 - 0.06],
      ];

      baseCords.forEach(([wx, wz]) => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, wheelOffset, wz);
        wheel.castShadow = true;
        group.add(wheel);

        // Wheel bracket metal
        const bracketGeo = new THREE.BoxGeometry(0.04, wheelOffset, 0.04);
        const bracket = new THREE.Mesh(bracketGeo, steelMat);
        bracket.position.set(wx, wheelOffset * 1.5, wz);
        bracket.castShadow = true;
        group.add(bracket);
      });

      // 2. Upright structure post
      const startY = wheelD + 0.02;
      const rackH = h - startY;
      const legGeo = new THREE.BoxGeometry(0.03, rackH, 0.03);

      baseCords.forEach(([wx, wz]) => {
        const leg = new THREE.Mesh(legGeo, steelMat);
        leg.position.set(wx, startY + rackH / 2, wz);
        leg.castShadow = true;
        group.add(leg);
      });

      // 3. Shelves
      for (let s = 0; s < shCount; s++) {
        const shelfH = startY + (s * (rackH - 0.05)) / (shCount - 1 || 1);
        const shelfPlateGeo = new THREE.BoxGeometry(w, 0.02, d);
        const plate = new THREE.Mesh(shelfPlateGeo, steelMat);
        plate.position.set(0, shelfH, 0);
        plate.castShadow = true;
        plate.receiveShadow = true;
        group.add(plate);
      }

      // 4. Handle (puxador tubular)
      const handleGeo = new THREE.CylinderGeometry(0.015, 0.015, d - 0.1, 16);
      const handle = new THREE.Mesh(handleGeo, steelMat);
      handle.rotation.x = Math.PI / 2;
      handle.position.set(-w / 2, h - 0.05, 0);
      handle.castShadow = true;
      group.add(handle);

      const bracket1Geo = new THREE.BoxGeometry(0.1, 0.02, 0.02);
      const bracket1 = new THREE.Mesh(bracket1Geo, steelMat);
      bracket1.position.set(-w / 2 + 0.05, h - 0.05, -d / 2 + 0.08);
      group.add(bracket1);

      const bracket2 = bracket1.clone();
      bracket2.position.set(-w / 2 + 0.05, h - 0.05, d / 2 - 0.08);
      group.add(bracket2);

    } else if (comp.type === "Estante") {
      const lvlCount = comp.levelCount || 4;

      // 1. Angled uprights posts
      const postGeo = new THREE.BoxGeometry(0.04, h, 0.04);
      const cornerCoords = [
        [-w / 2 + 0.02, -d / 2 + 0.02],
        [-w / 2 + 0.02, d / 2 - 0.02],
        [w / 2 - 0.02, -d / 2 + 0.02],
        [w / 2 - 0.02, d / 2 - 0.02],
      ];
      cornerCoords.forEach(([cx, cz]) => {
        const post = new THREE.Mesh(postGeo, steelMat);
        post.position.set(cx, h / 2, cz);
        post.castShadow = true;
        post.receiveShadow = true;
        group.add(post);
      });

      // 2. Metal trays (levels)
      for (let l = 0; l < lvlCount; l++) {
        const levelH = 0.15 + (l * (h - 0.25)) / (lvlCount - 1 || 1);
        const trayGeo = new THREE.BoxGeometry(w, 0.025, d);
        const tray = new THREE.Mesh(trayGeo, steelMat);
        tray.position.set(0, levelH, 0);
        tray.castShadow = true;
        tray.receiveShadow = true;
        group.add(tray);
      }

      // 3. X-Bracing (cross diagonals for strength) at the back
      const braceLength = Math.sqrt(w * w + h * h) * 0.9;
      const braceGeo = new THREE.BoxGeometry(0.015, braceLength, 0.005);

      const brace1 = new THREE.Mesh(braceGeo, darkSteelMat);
      brace1.rotation.z = Math.atan2(h, w);
      brace1.position.set(0, h / 2, -d / 2 + 0.01);
      group.add(brace1);

      const brace2 = new THREE.Mesh(braceGeo, darkSteelMat);
      brace2.rotation.z = -Math.atan2(h, w);
      brace2.position.set(0, h / 2, -d / 2 + 0.01);
      group.add(brace2);
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
    };

    if (type === "Bancada") {
      newComp.hasPegboard = true;
      newComp.hasDrawers = true;
    } else if (type === "FlowRack") {
      newComp.shelvesCount = 3;
      newComp.shelfAngle = 5;
    } else if (type === "Carrinho") {
      newComp.shelfCount = 2;
      newComp.wheelsDiameter = 100;
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
    toast.success(`${type} adicionado com sucesso!`);
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
        
        // Perform 3D rebuild
        setTimeout(() => rebuildThreeMesh(updated), 20);
        return updated;
      }
      return c;
    }));
  };

  // Delete selected item
  const deleteComponent = (id: string) => {
    const mesh = objectsMapRef.current.get(id);
    if (mesh && sceneRef.current) {
      sceneRef.current.remove(mesh);
      objectsMapRef.current.delete(id);
    }
    setComponents(prev => prev.filter(c => c.id !== id));
    setSelectedId(null);
    toast.info("Componente removido do projeto");
  };

  const clearAll = () => {
    if (confirm("Deseja realmente limpar toda a área de trabalho?")) {
      objectsMapRef.current.forEach((obj) => {
        if (sceneRef.current) sceneRef.current.remove(obj);
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
      if (sceneRef.current) sceneRef.current.remove(obj);
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
      const w = comp.width / 1000;
      const h = comp.height / 1000;
      const d = comp.depth / 1000;

      if (comp.type === "Bancada") {
        // Legs (4 * leg height) + frames
        steelMeters += 4 * (h - 0.03) + 2 * w + 2 * d + 0.8; 
        woodSqMeters += w * d;
        connectors += 16;
        if (comp.hasPegboard) {
          steelMeters += 2 * 0.6 + w; // structural frame pegboard
          woodSqMeters += w * 0.2; // wood shelf on pegboard
          connectors += 4;
        }
        if (comp.hasDrawers) {
          connectors += 6;
        }
      } else if (comp.type === "FlowRack") {
        const sh = comp.shelvesCount || 3;
        steelMeters += 4 * h + 2 * sh * w + 2 * sh * d; // Uprights + shelf borders
        plasticBins += sh * 6; // 6 bins per level standard
        connectors += 24;
      } else if (comp.type === "Carrinho") {
        const sh = comp.shelfCount || 2;
        steelMeters += 4 * h + 2 * d; // frame pushbar
        metalShelves += sh;
        wheels += 4;
        connectors += 12;
      } else if (comp.type === "Estante") {
        const lvls = comp.levelCount || 4;
        steelMeters += 4 * h; // L-shaped uprights
        metalShelves += lvls;
        connectors += lvls * 8;
        steelMeters += Math.sqrt(w * w + h * h) * 2; // cross braces
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

  // Export 3D as GLTF
  const handleExportGLTF = (binary: boolean = true) => {
    const THREE = window.THREE;
    if (!THREE || !sceneRef.current) {
      toast.error("Três.js não inicializado.");
      return;
    }

    const exporter = new THREE.GLTFExporter();
    
    // Group all user-created meshes to export clean geometry (omit lighting, helper grids)
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
          toast.success("GLB binário baixado!");
        } else {
          const output = JSON.stringify(result, null, 2);
          const blob = new Blob([output], { type: "application/json" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `${currentProjectName.toLowerCase().replace(/\s+/g, "-")}.gltf`;
          link.click();
          toast.success("GLTF estruturado baixado!");
        }
      },
      (err: any) => {
        console.error("Export failure:", err);
        toast.error("Ocorreu um erro ao exportar o modelo 3D.");
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

    // Capture current 3D canvas snapshot
    const imgData = rendererRef.current.domElement.toDataURL("image/png");
    
    // Create new print window
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
          <title>Isoflex - Folha Técnica de Engenharia</title>
          <style>
            @media print {
              body {
                background: white;
                color: black;
              }
              .no-print { display: none; }
            }
            body {
              font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              margin: 30px;
              color: #1e293b;
              background-color: #ffffff;
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
            }
            .header-table td {
              border: 2px solid #0f172a;
              padding: 12px;
            }
            .logo-title {
              font-size: 24px;
              font-weight: 900;
              color: #1a4fd6;
              letter-spacing: 1px;
            }
            .doc-title {
              font-size: 18px;
              font-weight: 700;
              text-transform: uppercase;
            }
            .viewport-container {
              border: 2px solid #0f172a;
              text-align: center;
              padding: 15px;
              margin-bottom: 25px;
              background: #f8fafc;
            }
            .viewport-img {
              max-width: 100%;
              max-height: 400px;
              object-fit: contain;
            }
            .bom-title {
              font-size: 14px;
              font-weight: 800;
              text-transform: uppercase;
              margin-bottom: 10px;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 4px;
            }
            .bom-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .bom-table th, .bom-table td {
              border: 1px solid #94a3b8;
              padding: 8px 12px;
              text-align: left;
              font-size: 12px;
            }
            .bom-table th {
              background-color: #f1f5f9;
              font-weight: 700;
            }
            .legend-block {
              font-size: 10px;
              color: #64748b;
              margin-top: 50px;
              text-align: center;
              border-top: 1px dashed #cbd5e1;
              padding-top: 15px;
            }
            .btn-print {
              background-color: #1a4fd6;
              color: white;
              border: none;
              padding: 10px 20px;
              font-weight: bold;
              border-radius: 6px;
              cursor: pointer;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <button class="btn-print no-print" onclick="window.print()">Imprimir / Salvar como PDF</button>
          
          <table class="header-table">
            <tr>
              <td width="30%" align="center">
                <div class="logo-title">ISOFLEX</div>
                <div style="font-size: 9px; font-weight: bold; margin-top: 4px;">ORGANIZAÇÃO INDUSTRIAL</div>
              </td>
              <td width="45%">
                <div class="doc-title">${currentProjectName}</div>
                <div style="font-size: 11px; margin-top: 6px;">FOLHA DE ESPECIFICAÇÃO TÉCNICA E CAD</div>
              </td>
              <td width="25%" style="font-size: 11px; line-height: 1.6;">
                <strong>Data:</strong> ${dateStr}<br/>
                <strong>Status:</strong> Aprovado p/ Fabricação<br/>
                <strong>Autor:</strong> Configurator 3D
              </td>
            </tr>
          </table>

          <div class="viewport-container">
            <img class="viewport-img" src="${imgData}" alt="Vista CAD 3D" />
            <div style="font-size: 10px; color: #64748b; margin-top: 8px;">Modelo Isométrico do Equipamento Configurado</div>
          </div>

          <div class="bom-title">Lista Geral de Materiais (BOM)</div>
          <table class="bom-table">
            <thead>
              <tr>
                <th>Item / Insumo</th>
                <th>Especificação Industrial</th>
                <th>Quantidade Estimada</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Perfis Tubulares de Aço</td>
                <td>Aço Estrutural Carbono / Pintura Epóxi</td>
                <td>${bomDetails.steelMeters} metros lineares</td>
              </tr>
              <tr>
                <td>Placa de Tampo/Divisória</td>
                <td>MDF Revestido Melamínico / Borracha</td>
                <td>${bomDetails.woodSqMeters} m²</td>
              </tr>
              <tr>
                <td>Prateleiras Metálicas</td>
                <td>Chapa Conformada Isoflex</td>
                <td>${bomDetails.metalShelves} unidades</td>
              </tr>
              <tr>
                <td>Gavetas e Pegboard</td>
                <td>Sistema de Encaixe com Trilhos e Ganchos</td>
                <td>Simulado na montagem</td>
              </tr>
              <tr>
                <td>Caixas Plásticas Bin</td>
                <td>Polipropileno de Alta Densidade</td>
                <td>${bomDetails.plasticBins} peças</td>
              </tr>
              <tr>
                <td>Rodízios Giratórios</td>
                <td>Rodas PU Reforçadas (Rolamento de Esfera)</td>
                <td>${bomDetails.wheels} unidades</td>
              </tr>
              <tr>
                <td>Conectores e Parafusos</td>
                <td>Fixadores Rápidos de Canto</td>
                <td>${bomDetails.connectors} unidades</td>
              </tr>
              <tr style="font-weight: bold; background-color: #f8fafc;">
                <td>Estimativa de Peso Geral</td>
                <td>Calculado com base nas densidades</td>
                <td>~${bomDetails.weightKg} kg</td>
              </tr>
            </tbody>
          </table>

          <div class="legend-block">
            Isoflex Organização do Trabalho Ltda. • Desenho gerado automaticamente pelo modelador paramétrico. • Todos os direitos reservados.
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Camera views preset
  const setCameraPreset = (view: "front" | "top" | "side" | "isometric") => {
    if (!cameraRef.current || !controlsRef.current) return;
    const THREE = window.THREE;
    if (!THREE) return;

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
    <div className="grid gap-6 lg:grid-cols-4 h-[750px] overflow-hidden select-none text-slate-100">
      
      {/* Sidebar - Component Library and Settings */}
      <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto pr-1 bg-slate-900/50 p-3 rounded-2xl border border-slate-800">
        
        {/* Project Name Setup */}
        <div className="space-y-1 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
          <Label className="text-[10px] uppercase font-bold text-slate-400">Nome do Projeto</Label>
          <div className="flex gap-2">
            <Input 
              value={currentProjectName}
              onChange={(e) => setCurrentProjectName(e.target.value)}
              className="bg-slate-900 border-slate-700 text-xs font-semibold h-8 text-slate-100"
            />
            <Button size="xs" className="h-8 bg-blue-600 hover:bg-blue-700" onClick={saveProject}>
              <Save className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Add Equipment Panel */}
        <Card className="bg-slate-950/40 border-slate-800 shadow-sm shrink-0">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Biblioteca Isoflex</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button size="xs" variant="outline" className="flex flex-col h-14 text-[9px] gap-1 bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white" onClick={() => addComponent("Bancada")}>
                <Wrench className="h-4 w-4 text-blue-500" /> Bancada
              </Button>
              <Button size="xs" variant="outline" className="flex flex-col h-14 text-[9px] gap-1 bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white" onClick={() => addComponent("FlowRack")}>
                <Layers className="h-4 w-4 text-amber-500" /> Flow Rack
              </Button>
              <Button size="xs" variant="outline" className="flex flex-col h-14 text-[9px] gap-1 bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white" onClick={() => addComponent("Carrinho")}>
                <Layers3 className="h-4 w-4 text-emerald-500" /> Carrinho
              </Button>
              <Button size="xs" variant="outline" className="flex flex-col h-14 text-[9px] gap-1 bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white" onClick={() => addComponent("Estante")}>
                <Box className="h-4 w-4 text-purple-500" /> Estante
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Snap and Grid Controls */}
        <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Grid className="h-3.5 w-3.5" /> Encaixe Automático (Snap)
            </span>
            <input 
              type="checkbox" 
              checked={snapEnabled} 
              onChange={() => setSnapEnabled(!snapEnabled)}
              className="rounded bg-slate-800 border-slate-700 accent-blue-600"
            />
          </div>
          {snapEnabled && (
            <div className="space-y-1">
              <Label className="text-[9px] text-slate-500 font-semibold uppercase">Grade de Alinhamento (mm)</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {[50, 100, 200, 500].map((step) => (
                  <Button 
                    key={step} 
                    size="xs" 
                    variant={snapInterval === step ? "default" : "outline"} 
                    className={`h-6 text-[9px] px-0 ${snapInterval === step ? "bg-blue-600 text-white" : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"}`}
                    onClick={() => setSnapInterval(step)}
                  >
                    {step}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Edit Parameter Panel (Reactive) */}
        {selectedComp ? (
          <Card className="bg-slate-950/60 border-slate-800 shadow-sm flex-1 flex flex-col justify-between overflow-hidden">
            <CardHeader className="p-3 pb-1 border-b border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold text-blue-400">{selectedComp.name}</CardTitle>
                <CardDescription className="text-[9px] text-slate-500">Configuração de Medidas</CardDescription>
              </div>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-500 hover:bg-rose-950/50" onClick={() => deleteComponent(selectedComp.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>

            <CardContent className="p-3 pt-3 space-y-3 overflow-y-auto flex-1">
              {/* Dimensions (W, H, D) */}
              <div className="space-y-1.5">
                <Label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Maximize className="h-3 w-3" /> Dimensões (Largura, Altura, Profundidade em mm)
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <span className="text-[8px] text-slate-500 block mb-0.5">Largura (W)</span>
                    <Input 
                      type="number" 
                      value={selectedComp.width} 
                      onChange={(e) => updateComponentProperty(selectedComp.id, "width", Number(e.target.value))} 
                      className="h-7 text-center text-xs font-semibold bg-slate-900 border-slate-700"
                    />
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-500 block mb-0.5">Altura (H)</span>
                    <Input 
                      type="number" 
                      value={selectedComp.height} 
                      onChange={(e) => updateComponentProperty(selectedComp.id, "height", Number(e.target.value))} 
                      className="h-7 text-center text-xs font-semibold bg-slate-900 border-slate-700"
                    />
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-500 block mb-0.5">Prof. (D)</span>
                    <Input 
                      type="number" 
                      value={selectedComp.depth} 
                      onChange={(e) => updateComponentProperty(selectedComp.id, "depth", Number(e.target.value))} 
                      className="h-7 text-center text-xs font-semibold bg-slate-900 border-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Coordinates (X, Y, Z) */}
              <div className="space-y-1.5">
                <Label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Move className="h-3 w-3" /> Posição na Grade (X, Y, Z em mm)
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <Input 
                      type="number" 
                      step={snapInterval}
                      value={selectedComp.posX} 
                      onChange={(e) => updateComponentProperty(selectedComp.id, "posX", Number(e.target.value))} 
                      className="h-7 text-center text-xs font-semibold bg-slate-900 border-slate-700"
                    />
                  </div>
                  <div>
                    <Input 
                      type="number" 
                      step={snapInterval}
                      value={selectedComp.posY} 
                      onChange={(e) => updateComponentProperty(selectedComp.id, "posY", Number(e.target.value))} 
                      className="h-7 text-center text-xs font-semibold bg-slate-900 border-slate-700"
                    />
                  </div>
                  <div>
                    <Input 
                      type="number" 
                      step={snapInterval}
                      value={selectedComp.posZ} 
                      onChange={(e) => updateComponentProperty(selectedComp.id, "posZ", Number(e.target.value))} 
                      className="h-7 text-center text-xs font-semibold bg-slate-900 border-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Rotation Y */}
              <div className="space-y-1.5">
                <Label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <RotateCw className="h-3 w-3" /> Orientação Y ({selectedComp.rotY}°)
                </Label>
                <input 
                  type="range" 
                  min="0" 
                  max="360" 
                  step="45"
                  value={selectedComp.rotY} 
                  onChange={(e) => updateComponentProperty(selectedComp.id, "rotY", Number(e.target.value))} 
                  className="w-full accent-blue-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Dynamic Parameter Settings */}
              {selectedComp.type === "Bancada" && (
                <div className="space-y-2 border-t border-slate-800 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 text-[10px]">Painel de Ferramentas (Pegboard)</span>
                    <input 
                      type="checkbox" 
                      checked={selectedComp.hasPegboard} 
                      onChange={(e) => updateComponentProperty(selectedComp.id, "hasPegboard", e.target.checked)}
                      className="rounded bg-slate-900 accent-blue-600"
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 text-[10px]">Gaveteiro sob Tampo</span>
                    <input 
                      type="checkbox" 
                      checked={selectedComp.hasDrawers} 
                      onChange={(e) => updateComponentProperty(selectedComp.id, "hasDrawers", e.target.checked)}
                      className="rounded bg-slate-900 accent-blue-600"
                    />
                  </div>
                </div>
              )}

              {selectedComp.type === "FlowRack" && (
                <div className="space-y-2 border-t border-slate-800 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[8px] text-slate-500 block mb-0.5">Quant. Prateleiras</span>
                      <Input 
                        type="number" 
                        min="2" 
                        max="5"
                        value={selectedComp.shelvesCount} 
                        onChange={(e) => updateComponentProperty(selectedComp.id, "shelvesCount", Number(e.target.value))} 
                        className="h-7 text-xs bg-slate-900 border-slate-700"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-500 block mb-0.5">Inclinação (Graus)</span>
                      <Input 
                        type="number" 
                        min="0" 
                        max="15"
                        value={selectedComp.shelfAngle} 
                        onChange={(e) => updateComponentProperty(selectedComp.id, "shelfAngle", Number(e.target.value))} 
                        className="h-7 text-xs bg-slate-900 border-slate-700"
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedComp.type === "Carrinho" && (
                <div className="space-y-2 border-t border-slate-800 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[8px] text-slate-500 block mb-0.5">Quant. Níveis</span>
                      <Input 
                        type="number" 
                        min="1" 
                        max="4"
                        value={selectedComp.shelfCount} 
                        onChange={(e) => updateComponentProperty(selectedComp.id, "shelfCount", Number(e.target.value))} 
                        className="h-7 text-xs bg-slate-900 border-slate-700"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-500 block mb-0.5">Diâm. Rodas (mm)</span>
                      <Input 
                        type="number" 
                        min="50" 
                        max="150"
                        step="25"
                        value={selectedComp.wheelsDiameter} 
                        onChange={(e) => updateComponentProperty(selectedComp.id, "wheelsDiameter", Number(e.target.value))} 
                        className="h-7 text-xs bg-slate-900 border-slate-700"
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedComp.type === "Estante" && (
                <div className="space-y-2 border-t border-slate-800 pt-2">
                  <div>
                    <span className="text-[8px] text-slate-500 block mb-0.5">Prateleiras / Níveis</span>
                    <Input 
                      type="number" 
                      min="2" 
                      max="7"
                      value={selectedComp.levelCount} 
                      onChange={(e) => updateComponentProperty(selectedComp.id, "levelCount", Number(e.target.value))} 
                      className="h-7 text-xs bg-slate-900 border-slate-700"
                    />
                  </div>
                </div>
              )}

              {/* Isoflex paint finish colors selector */}
              <div className="space-y-1.5 border-t border-slate-800 pt-2">
                <Label className="text-[9px] font-bold text-slate-400 uppercase">Cor da Pintura (Padrão)</Label>
                <div className="flex flex-wrap gap-1">
                  {isoflexColors.map((col) => (
                    <button 
                      key={col.hex} 
                      style={{ backgroundColor: col.hex }} 
                      className={`h-5 w-5 rounded-full border border-slate-950 transition-all ${selectedComp.color === col.hex ? "ring-2 ring-blue-500 scale-110" : "opacity-80 hover:opacity-100"}`}
                      title={col.name}
                      onClick={() => updateComponentProperty(selectedComp.id, "color", col.hex)}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-950/40 border-slate-800 flex-1 flex flex-col justify-center items-center text-center p-4 text-slate-500">
            <Database className="h-7 w-7 mb-2 opacity-50 text-blue-500 animate-pulse" />
            <p className="text-[11px] font-bold">Nenhum componente selecionado</p>
            <p className="text-[9px] text-slate-500 mt-1 max-w-[150px]">Adicione um equipamento da biblioteca ou clique nele no visualizador para configurar.</p>
          </Card>
        )}
      </div>

      {/* Main 3D Viewport CAD layout */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        
        {/* Render space */}
        <div className="flex-1 relative rounded-2xl overflow-hidden border border-slate-800 shadow-inner bg-slate-950/80 flex flex-col min-h-[400px]">
          
          {/* Overlay Info & Camera Angles Toolbar */}
          <div className="absolute top-3 left-3 z-10 flex gap-2">
            <Badge className="bg-slate-900/80 backdrop-blur-xs text-blue-400 text-[10px] border border-slate-800">
              CAD viewport
            </Badge>
            <div className="flex gap-1 bg-slate-900/85 backdrop-blur-xs px-2 py-0.5 rounded-lg border border-slate-800 text-[9px] font-bold text-slate-400">
              <span>W: {selectedComp?.width || 0}mm</span>
              <span className="text-slate-600">|</span>
              <span>H: {selectedComp?.height || 0}mm</span>
            </div>
          </div>

          {/* Preset Camera Views */}
          <div className="absolute top-3 right-3 z-10 flex gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800">
            <Button size="xs" variant="ghost" className="h-6 text-[9px] text-slate-400 hover:text-white" onClick={() => setCameraPreset("isometric")}>ISO</Button>
            <Button size="xs" variant="ghost" className="h-6 text-[9px] text-slate-400 hover:text-white" onClick={() => setCameraPreset("top")}>Topo</Button>
            <Button size="xs" variant="ghost" className="h-6 text-[9px] text-slate-400 hover:text-white" onClick={() => setCameraPreset("front")}>Frente</Button>
            <Button size="xs" variant="ghost" className="h-6 text-[9px] text-slate-400 hover:text-white" onClick={() => setCameraPreset("side")}>Lateral</Button>
            <span className="w-[1px] bg-slate-800 mx-1"></span>
            <Button size="xs" variant="ghost" className="h-6 px-1 text-slate-400 hover:text-white" onClick={toggleGrid} title="Grade">
              <Grid className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Loader/Spinner */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-20">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mb-2" />
              <p className="text-xs font-bold text-slate-500">Montando engine paramétrico...</p>
            </div>
          )}

          {/* Real three.js container */}
          <div ref={containerRef} className="w-full flex-1" />

          {/* Quick status bar */}
          <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 flex justify-between items-center text-[10px] text-slate-500 font-medium select-none shrink-0">
            <span className="flex items-center gap-1 text-[9px]">
              <Grid className="h-3.5 w-3.5 text-blue-600" /> Botão Esquerdo (Girar) • Direito (Arrastar) • Scroll (Zoom) • Clique (Selecionar)
            </span>
            <span className="flex items-center gap-1 font-mono text-[9px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-blue-400">
              Isoflex 3D V2
            </span>
          </div>
        </div>

        {/* Lower Toolbar: Projects History, BOM details and Exporters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
          
          {/* History / Project list */}
          <Card className="bg-slate-950/40 border-slate-800">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <FolderOpen className="h-3.5 w-3.5" /> Projetos Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1 space-y-1.5 max-h-[130px] overflow-y-auto">
              {savedProjects.length === 0 ? (
                <div className="text-[10px] text-slate-600 text-center py-4">Nenhum projeto salvo.</div>
              ) : (
                savedProjects.map((p) => (
                  <div key={p.id} className="flex justify-between items-center bg-slate-900/60 p-1.5 rounded-lg border border-slate-850">
                    <span className="text-[10px] font-bold truncate text-slate-300 max-w-[120px] cursor-pointer hover:text-blue-400" onClick={() => loadProject(p)}>{p.name}</span>
                    <div className="flex gap-1.5">
                      <Button size="xs" variant="ghost" className="h-5 px-1.5 text-[9px] text-slate-400 hover:text-white" onClick={() => loadProject(p)}>Abrir</Button>
                      <Button size="xs" variant="ghost" className="h-5 px-1 text-rose-500 hover:bg-rose-950/30" onClick={() => deleteProject(p.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* BOM (Bill of Materials) estimation */}
          <Card className="bg-slate-950/40 border-slate-800">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 animate-bounce" /> Lista de Materiais (BOM)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1 text-[10px] space-y-1 text-slate-400">
              <div className="flex justify-between">
                <span>Perfis Metálicos:</span>
                <span className="font-bold text-slate-200">{bom.steelMeters} m</span>
              </div>
              <div className="flex justify-between">
                <span>Tampos (MDF):</span>
                <span className="font-bold text-slate-200">{bom.woodSqMeters} m²</span>
              </div>
              <div className="flex justify-between">
                <span>Rodízios (Rodas):</span>
                <span className="font-bold text-slate-200">{bom.wheels} un</span>
              </div>
              <div className="flex justify-between">
                <span>Caixas Plásticas:</span>
                <span className="font-bold text-slate-200">{bom.plasticBins} un</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1.5 font-bold text-slate-300">
                <span>Peso Estimado:</span>
                <span className="text-slate-100">~{bom.weightKg} kg</span>
              </div>
            </CardContent>
          </Card>

          {/* File Exporters */}
          <Card className="bg-slate-950/40 border-slate-800 flex flex-col justify-between">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Download className="h-3.5 w-3.5" /> Exportar Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <Button size="xs" className="h-8 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[10px] font-semibold text-slate-200" onClick={() => handleExportGLTF(true)}>
                  <Download className="mr-1.5 h-3.5 w-3.5 text-blue-500" /> GLB 3D
                </Button>
                <Button size="xs" className="h-8 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[10px] font-semibold text-slate-200" onClick={() => handleExportGLTF(false)}>
                  <Download className="mr-1.5 h-3.5 w-3.5 text-blue-500" /> GLTF JSON
                </Button>
              </div>
              <Button size="xs" className="w-full h-8 bg-blue-600 hover:bg-blue-700 text-[10px] font-bold text-white" onClick={handleExportPDF}>
                <FileText className="mr-1.5 h-3.5 w-3.5" /> Exportar PDF Técnico (BOM + Desenho)
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
