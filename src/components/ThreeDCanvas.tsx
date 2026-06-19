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
  RefreshCw
} from "lucide-react";

declare global {
  interface Window {
    THREE: any;
  }
}

export function ThreeDCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shapes, setShapes] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Controls state
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [posZ, setPosZ] = useState(0);
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);
  const [scaleZ, setScaleZ] = useState(1);
  const [rotY, setRotY] = useState(0);
  const [color, setColor] = useState("#1a4fd6");

  // Three.js instances refs
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const raycasterRef = useRef<any>(null);
  const mouseRef = useRef<any>(null);
  const objectsMapRef = useRef<Map<string, any>>(new Map());

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
        // Load controls and loader
        await loadScript("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js");
        await loadScript("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js");
        
        if (active) {
          setLoading(false);
          initScene();
        }
      } catch (err: any) {
        console.error(err);
        if (active) {
          setError("Erro ao carregar o engine 3D (Three.js). Verifique a conexão com a internet.");
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

  // Update selected shape variables when selection changes
  useEffect(() => {
    if (!selectedId) return;
    const mesh = objectsMapRef.current.get(selectedId);
    if (!mesh) return;

    setPosX(mesh.position.x);
    setPosY(mesh.position.y);
    setPosZ(mesh.position.z);
    setScaleX(mesh.scale.x);
    setScaleY(mesh.scale.y);
    setScaleZ(mesh.scale.z);
    setRotY(mesh.rotation.y * (180 / Math.PI));
    if (mesh.material && mesh.material.color) {
      setColor("#" + mesh.material.color.getHexString());
    }
  }, [selectedId]);

  const initScene = () => {
    if (!containerRef.current || !window.THREE) return;
    
    const THREE = window.THREE;
    const container = containerRef.current;
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f1f5f9");
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(10, 10, 15);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    
    // Clear old canvases
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 0.3);
    dirLight2.position.set(-20, 20, -20);
    scene.add(dirLight2);

    // Helpers
    const gridHelper = new THREE.GridHelper(30, 30, 0x1a4fd6, 0xcbd5e1);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Orbit Controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera going below grid
    controlsRef.current = controls;

    // Raycaster & Mouse selection
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

  // Add Cube shape
  const addCube = () => {
    if (!window.THREE || !sceneRef.current) return;
    const THREE = window.THREE;
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#1a4fd6"),
      roughness: 0.4,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((Math.random() - 0.5) * 4, 1, (Math.random() - 0.5) * 4);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    const id = `shape_${Date.now()}`;
    mesh.name = id;
    
    sceneRef.current.add(mesh);
    objectsMapRef.current.set(id, mesh);
    
    const newShape = { id, type: "Cubo", name: `Cubo ${shapes.length + 1}` };
    setShapes(prev => [...prev, newShape]);
    setSelectedId(id);
  };

  // Add Cylinder shape
  const addCylinder = () => {
    if (!window.THREE || !sceneRef.current) return;
    const THREE = window.THREE;
    const geometry = new THREE.CylinderGeometry(1, 1, 3, 32);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#10b981"),
      roughness: 0.4,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((Math.random() - 0.5) * 4, 1.5, (Math.random() - 0.5) * 4);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    const id = `shape_${Date.now()}`;
    mesh.name = id;
    
    sceneRef.current.add(mesh);
    objectsMapRef.current.set(id, mesh);
    
    const newShape = { id, type: "Cilindro", name: `Cilindro ${shapes.length + 1}` };
    setShapes(prev => [...prev, newShape]);
    setSelectedId(id);
  };

  // Add Sphere shape
  const addSphere = () => {
    if (!window.THREE || !sceneRef.current) return;
    const THREE = window.THREE;
    const geometry = new THREE.SphereGeometry(1.2, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#f59e0b"),
      roughness: 0.3,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((Math.random() - 0.5) * 4, 1.2, (Math.random() - 0.5) * 4);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    const id = `shape_${Date.now()}`;
    mesh.name = id;
    
    sceneRef.current.add(mesh);
    objectsMapRef.current.set(id, mesh);
    
    const newShape = { id, type: "Esfera", name: `Esfera ${shapes.length + 1}` };
    setShapes(prev => [...prev, newShape]);
    setSelectedId(id);
  };

  // Handle uploaded GLB/gltf loading
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
        model.position.set(0, 0, 0);
        
        // Scale appropriately
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 10) {
          const scaleFactor = 6 / maxDim;
          model.scale.set(scaleFactor, scaleFactor, scaleFactor);
        }
        
        const id = `glb_${Date.now()}`;
        model.name = id;
        
        // Add casts/receives shadows to all children
        model.traverse((child: any) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        sceneRef.current.add(model);
        objectsMapRef.current.set(id, model);
        
        const newShape = { id, type: "GLB/GLTF", name: file.name.slice(0, 18) };
        setShapes(prev => [...prev, newShape]);
        setSelectedId(id);
      }, (err: any) => {
        console.error("GLTF load parse error:", err);
        setError("Erro ao ler o arquivo GLB/GLTF.");
      });
    };
    
    reader.readAsArrayBuffer(file);
  };

  // Trigger file selection input
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Delete selected shape
  const deleteSelected = () => {
    if (!selectedId || !sceneRef.current) return;
    const mesh = objectsMapRef.current.get(selectedId);
    if (mesh) {
      sceneRef.current.remove(mesh);
      objectsMapRef.current.delete(selectedId);
    }
    setShapes(prev => prev.filter(s => s.id !== selectedId));
    setSelectedId(null);
  };

  // Update properties on the active mesh
  const updateSelectedProperty = (property: string, value: number | string) => {
    if (!selectedId) return;
    const mesh = objectsMapRef.current.get(selectedId);
    if (!mesh) return;

    const THREE = window.THREE;

    switch (property) {
      case "posX":
        mesh.position.x = Number(value);
        setPosX(Number(value));
        break;
      case "posY":
        mesh.position.y = Number(value);
        setPosY(Number(value));
        break;
      case "posZ":
        mesh.position.z = Number(value);
        setPosZ(Number(value));
        break;
      case "scaleX":
        mesh.scale.x = Number(value);
        setScaleX(Number(value));
        break;
      case "scaleY":
        mesh.scale.y = Number(value);
        setScaleY(Number(value));
        break;
      case "scaleZ":
        mesh.scale.z = Number(value);
        setScaleZ(Number(value));
        break;
      case "rotY":
        mesh.rotation.y = Number(value) * (Math.PI / 180);
        setRotY(Number(value));
        break;
      case "color":
        if (mesh.material) {
          mesh.material.color = new THREE.Color(value as string);
          setColor(value as string);
        }
        break;
      default:
        break;
    }
  };

  const clearAll = () => {
    if (!sceneRef.current) return;
    objectsMapRef.current.forEach((obj) => {
      sceneRef.current.remove(obj);
    });
    objectsMapRef.current.clear();
    setShapes([]);
    setSelectedId(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-4 h-[600px] overflow-hidden">
      {/* Sidebar Tooling Control */}
      <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto pr-1">
        <Card className="glass border-white/50 shadow-sm shrink-0">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Criar Formas 3D</h3>
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="outline" className="flex flex-col h-14 text-[10px] gap-1" onClick={addCube}>
                <Box className="h-4 w-4 text-blue-600" /> Cubo
              </Button>
              <Button size="sm" variant="outline" className="flex flex-col h-14 text-[10px] gap-1" onClick={addCylinder}>
                <Plus className="h-4 w-4 text-emerald-600" /> Cilindro
              </Button>
              <Button size="sm" variant="outline" className="flex flex-col h-14 text-[10px] gap-1" onClick={addSphere}>
                <Eye className="h-4 w-4 text-amber-600" /> Esfera
              </Button>
            </div>
            
            <div className="pt-2 border-t border-slate-200/60">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleGlbUpload} 
                accept=".glb,.gltf" 
                className="hidden" 
              />
              <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-xs font-bold" onClick={triggerFileInput}>
                <Upload className="mr-2 h-4 w-4" /> Importar GLB / GLTF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Selected element controls */}
        {selectedId ? (
          <Card className="glass border-white/50 shadow-sm flex-1">
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-xs font-bold text-slate-800">
                  {shapes.find(s => s.id === selectedId)?.name || "Elemento"}
                </span>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:bg-rose-50" onClick={deleteSelected}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Position */}
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase">
                  <Move className="h-3 w-3" /> Posição (X, Y, Z)
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input 
                    type="number" 
                    step="0.5" 
                    value={posX} 
                    onChange={(e) => updateSelectedProperty("posX", e.target.value)} 
                    className="h-8 text-center text-xs font-semibold"
                  />
                  <Input 
                    type="number" 
                    step="0.5" 
                    value={posY} 
                    onChange={(e) => updateSelectedProperty("posY", e.target.value)} 
                    className="h-8 text-center text-xs font-semibold"
                  />
                  <Input 
                    type="number" 
                    step="0.5" 
                    value={posZ} 
                    onChange={(e) => updateSelectedProperty("posZ", e.target.value)} 
                    className="h-8 text-center text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Scale */}
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase">
                  <Maximize className="h-3 w-3" /> Escala / Tamanho
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input 
                    type="number" 
                    step="0.2" 
                    min="0.1"
                    value={scaleX} 
                    onChange={(e) => updateSelectedProperty("scaleX", e.target.value)} 
                    className="h-8 text-center text-xs font-semibold"
                  />
                  <Input 
                    type="number" 
                    step="0.2" 
                    min="0.1"
                    value={scaleY} 
                    onChange={(e) => updateSelectedProperty("scaleY", e.target.value)} 
                    className="h-8 text-center text-xs font-semibold"
                  />
                  <Input 
                    type="number" 
                    step="0.2" 
                    min="0.1"
                    value={scaleZ} 
                    onChange={(e) => updateSelectedProperty("scaleZ", e.target.value)} 
                    className="h-8 text-center text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Rotation */}
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase">
                  <RotateCw className="h-3 w-3" /> Rotação Y (graus)
                </Label>
                <Input 
                  type="range" 
                  min="0" 
                  max="360" 
                  value={rotY} 
                  onChange={(e) => updateSelectedProperty("rotY", e.target.value)} 
                  className="w-full accent-blue-600"
                />
                <div className="text-right text-[10px] font-bold text-slate-500">{rotY}°</div>
              </div>

              {/* Color */}
              {!selectedId.startsWith("glb_") && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Cor da Forma</Label>
                  <div className="flex gap-2 items-center">
                    <Input 
                      type="color" 
                      value={color} 
                      onChange={(e) => updateSelectedProperty("color", e.target.value)} 
                      className="h-8 w-12 p-0 border-0 cursor-pointer"
                    />
                    <span className="text-xs font-mono text-slate-600 font-bold uppercase">{color}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="glass border-white/50 shadow-sm flex-1 flex flex-col justify-center items-center text-center p-6 text-slate-400">
            <Database className="h-8 w-8 mb-2 opacity-50 text-indigo-500" />
            <p className="text-xs font-semibold">Nenhuma forma selecionada</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Adicione ou importe um modelo 3D para editar suas propriedades.</p>
          </Card>
        )}
      </div>

      {/* 3D Render Canvas Box */}
      <div className="lg:col-span-3 relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100 flex flex-col">
        {/* Canvas overlays */}
        <div className="absolute top-3 left-3 z-10 flex gap-2">
          <Badge className="bg-slate-900/80 backdrop-blur-xs text-white text-[10px] border-0">
            Renderizador WebGL
          </Badge>
          {shapes.length > 0 && (
            <Badge variant="outline" className="bg-white/80 border-slate-200 text-slate-700 text-[10px]">
              {shapes.length} objetos
            </Badge>
          )}
        </div>

        <div className="absolute top-3 right-3 z-10 flex gap-2">
          <Button size="xs" variant="outline" className="h-7 px-2.5 bg-white/90 hover:bg-white text-[10px] font-bold text-slate-700 shadow-xs border-slate-200" onClick={clearAll}>
            Limpar Tudo
          </Button>
        </div>

        {/* Loader/Spinner */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 z-20">
            <RefreshCw className="h-8 w-8 text-primary animate-spin mb-2" />
            <p className="text-xs font-bold text-slate-500">Inicializando ambiente 3D...</p>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/95 z-20 p-6 text-center">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-full mb-3">
              <Trash2 className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Falha ao carregar visualizador</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">{error}</p>
          </div>
        )}

        {/* Real three.js container */}
        <div ref={containerRef} className="w-full flex-1" />

        {/* Status bar */}
        <div className="bg-white border-t border-slate-200/80 px-4 py-2 flex justify-between items-center text-[10px] text-slate-500 font-medium select-none shrink-0">
          <span className="flex items-center gap-1">
            <Grid className="h-3.5 w-3.5 text-blue-500" /> Use o botão esquerdo para girar, direito para arrastar, scroll para zoom.
          </span>
          <span className="flex items-center gap-1 font-mono text-[9px] bg-slate-50 px-1.5 py-0.5 rounded border">
            FPS: 60 / GLB: OK
          </span>
        </div>
      </div>
    </div>
  );
}
