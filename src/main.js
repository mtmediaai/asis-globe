import * as Cesium from 'cesium';
import { MTM_COLORS, createMTMGlobeMaterials, MTM_GLOBE_CONFIG } from './styles/mtm-globe.js';
import { mtmThermalShader } from './styles/mtm-thermal.js';
import { DataLayerManager } from './data/manager.js';
import flightsLayer from './data/flights.js';
import militaryFlightsLayer from './data/militaryFlights.js';
import earthquakesLayer from './data/earthquakes.js';
import satellitesLayer from './data/satellites.js';
import rocketLaunchesLayer from './data/rocketLaunches.js';
import trafficLayer from './data/traffic.js';
import cctvLayer from './data/cctv.js';
import radioLayer from './data/radio.js';
import bikeshareLayer from './data/bikeshare.js';
import aisLiveVesselsLayer from './data/aisLiveVessels.js';
import militaryInstallationsLayer from './data/militaryInstallations.js';
import militaryAwarenessLayer from './data/militaryAwareness.js';
import localDataLayers from './data/localLayers.js';
import { LAYER_STATE_REGISTRY } from './data/layerState.js';
import { registerDataCredits } from './data/dataCredits.js';
import { SceneDirector } from './scenes/director.js';
import { MapStackController } from './mapStackController.js';
import { initAnnotations } from './annotations/index.js';
import { installRenderGovernor, governorRequestRender } from './renderGovernor.js';
import { installScopeMask } from './scopeMask.js';
import { initFirstRunExperience } from './firstRunExperience.js';
import { StyleManager } from './ui.js';

// MTM Globe Entry Point
class MTMGlobe {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      apiKey: options.apiKey || null, // Google Maps API key
      cesiumToken: options.cesiumToken || null, // Cesium Ion token
      thermalMode: options.thermalMode || false,
      defaultLocation: options.defaultLocation || 'houston',
      ...MTM_GLOBE_CONFIG,
    };
    
    this.viewer = null;
    this.dataManager = null;
    this.sceneDirector = null;
    this.mapStack = null;
    this.styleManager = null;
    this.isInitialized = false;
  }
  
  async initialize() {
    if (this.isInitialized) return this;
    
    // Configure Cesium
    Cesium.Ion.defaultAccessToken = this.options.cesiumToken || '';
    
    // Create viewer with MTM configuration
    this.viewer = new Cesium.Viewer(this.container, {
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: false,
      creditContainer: this.options.creditContainer || undefined,
      creditViewport: this.options.creditViewport || undefined,
      scene3DOnly: true,
      useDefaultRenderLoop: false, // We'll control render loop
      requestRenderMode: true,
      maximumRenderTimeChange: Infinity,
      ...this.options.lighting,
    });
    
    // Apply MTM Globe Materials
    const materials = createMTMGlobeMaterials(this.viewer);
    this.materials = materials;
    
    // Apply globe styling
    this.viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString(MTM_COLORS.obsidian);
    this.viewer.scene.globe.showGroundAtmosphere = false;
    this.viewer.scene.globe.enableLighting = true;
    this.viewer.scene.globe.depthTestAgainstTerrain = true;
    
    // Set up sky atmosphere
    this.viewer.scene.skyAtmosphere.show = true;
    this.viewer.scene.skyAtmosphere.hueShift = -0.1;
    this.viewer.scene.skyAtmosphere.saturationShift = -0.3;
    this.viewer.scene.skyAtmosphere.brightnessShift = -0.2;
    
    // Initialize data layer manager
    this.dataManager = new DataLayerManager(this.viewer);
    
    // Register all data layers
    this.registerLayers();
    
    // Initialize scene director for cinematic sequences
    this.sceneDirector = new SceneDirector(this.viewer, this.dataManager);
    
    // Initialize map stack controller
    this.mapStack = new MapStackController(this.viewer, this.dataManager);
    
    // Initialize style manager
    this.styleManager = new StyleManager(this.viewer);
    
    // Install render governor for performance
    installRenderGovernor(this.viewer);
    
    // Install scope mask
    installScopeMask(this.viewer);
    
    // Initialize annotations
    initAnnotations(this.viewer, this.dataManager);
    
    // Register data credits
    registerDataCredits(this.viewer);
    
    // Initialize first run experience
    initFirstRunExperience(this.viewer);
    
    // Set default camera
    this.flyToDefault();
    
    // Enable default layers
    this.enableDefaultLayers();
    
    // Apply thermal mode if requested
    if (this.options.thermalMode) {
      this.enableThermalMode();
    }
    
    this.isInitialized = true;
    
    // Start render loop
    this.startRenderLoop();
    
    return this;
  }
  
  registerLayers() {
    // Core telemetry layers
    this.dataManager.addLayer(flightsLayer);
    this.dataManager.addLayer(militaryFlightsLayer);
    this.dataManager.addLayer(earthquakesLayer);
    this.dataManager.addLayer(satellitesLayer);
    this.dataManager.addLayer(rocketLaunchesLayer);
    this.dataManager.addLayer(trafficLayer);
    this.dataManager.addLayer(cctvLayer);
    this.dataManager.addLayer(radioLayer);
    this.dataManager.addLayer(bikeshareLayer);
    this.dataManager.addLayer(aisLiveVesselsLayer);
    this.dataManager.addLayer(militaryInstallationsLayer);
    this.dataManager.addLayer(militaryAwarenessLayer);
    
    // Local layers
    Object.values(localDataLayers).forEach(layer => {
      if (layer) this.dataManager.addLayer(layer);
    });
  }
  
  enableDefaultLayers() {
    MTM_GLOBE_CONFIG.defaultLayers.forEach(layerId => {
      this.dataManager.setLayerVisibility(layerId, true, 'init');
    });
  }
  
  enableThermalMode() {
    // Apply MTM thermal shader to globe
    const globe = this.viewer.scene.globe;
    if (globe && globe.material) {
      globe.material = mtmThermalShader;
    }
    this.options.thermalMode = true;
  }
  
  disableThermalMode() {
    // Revert to standard MTM globe materials
    const globe = this.viewer.scene.globe;
    if (globe && this.materials) {
      globe.material = this.materials.landMaterial;
    }
    this.options.thermalMode = false;
  }
  
  flyToDefault() {
    const { destination, orientation } = MTM_GLOBE_CONFIG.defaultCamera;
    this.viewer.camera.flyTo({ destination, orientation, duration: 2.0 });
  }
  
  flyToLocation(name, options = {}) {
    // Delegate to scene director or camera verbs
    return this.sceneDirector.flyTo(name, options);
  }
  
  // MTM-specific: Fly to visitor's geo-centroid (from sovereign-core pulse)
  flyToGeoCentroid(lat, lon, options = {}) {
    const destination = Cesium.Cartesian3.fromDegrees(lon, lat, options.altitude || 500000);
    this.viewer.camera.flyTo({
      destination,
      orientation: options.orientation || {
        heading: 0,
        pitch: -Math.PI / 3,
        roll: 0,
      },
      duration: options.duration || 1.5,
      complete: options.onComplete,
    });
  }
  
  // MTM-specific: Render AI Visibility nodes on globe
  renderAIVisibilityNodes(nodes) {
    // nodes: [{ lat, lon, citationScore, entityName, entityType, ... }]
    const entities = nodes.map(node => ({
      position: Cesium.Cartesian3.fromDegrees(node.lon, node.lat, node.altitude || 1000),
      point: {
        pixelSize: 8 + (node.citationScore * 20),
        color: Cesium.Color.fromCssColorString(
          node.citationScore > 0.7 ? MTM_COLORS.midasGold : 
          node.citationScore > 0.3 ? MTM_COLORS.lightningBlue : MTM_COLORS.obsidian
        ),
        outlineColor: Cesium.Color.fromCssColorString(MTM_COLORS.chrome),
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
      label: {
        text: node.entityName,
        font: '14px "Merriweather", serif',
        fillColor: Cesium.Color.fromCssColorString(MTM_COLORS.platinum),
        outlineColor: Cesium.Color.fromCssColorString(MTM_COLORS.obsidian),
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -16),
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString(MTM_COLORS.obsidian + 'CC'),
        backgroundPadding: new Cesium.Cartesian2(8, 4),
      },
      properties: {
        entityType: node.entityType,
        citationScore: node.citationScore,
        ...node,
      },
    }));
    
    // Add to a custom data source
    const dataSource = new Cesium.CustomDataSource('mtm-ai-visibility');
    entities.forEach(e => dataSource.entities.add(e));
    this.viewer.dataSources.add(dataSource);
    
    return dataSource;
  }
  
  // MTM-specific: Render territory scarcity nodes
  renderTerritoryNodes(territories) {
    // territories: [{ zip, lat, lon, status: 'contested'|'clock'|'sealed', partner }]
    const colorMap = {
      contested: MTM_COLORS.chrome,      // Green → Chrome
      clock: MTM_COLORS.lightningBlue,   // Amber/Red → Lightning Blue
      sealed: MTM_COLORS.midasGold,      // Gold → Midas Gold
    };
    
    const dataSource = new Cesium.CustomDataSource('mtm-territories');
    territories.forEach(t => {
      const entity = dataSource.entities.add({
        position: Cesium.Cartesian3.fromDegrees(t.lon, t.lat, 2000),
        cylinder: {
          length: 5000,
          topRadius: 2000,
          bottomRadius: 2000,
          material: Cesium.Color.fromCssColorString(colorMap[t.status] + '80'),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString(colorMap[t.status]),
          outlineWidth: 2,
        },
        label: {
          text: `${t.zip} • ${t.status.toUpperCase()}`,
          font: '12px "Merriweather", serif',
          fillColor: Cesium.Color.fromCssColorString(MTM_COLORS.platinum),
          outlineColor: Cesium.Color.fromCssColorString(MTM_COLORS.obsidian),
          outlineWidth: 2,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -24),
        },
        properties: t,
      });
    });
    
    this.viewer.dataSources.add(dataSource);
    return dataSource;
  }
  
  startRenderLoop() {
    const render = () => {
      governorRequestRender(this.viewer);
      this.viewer.scene.render();
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }
  
  destroy() {
    this.viewer?.destroy();
    this.isInitialized = false;
  }
}

// Export for ES modules and global
export { MTMGlobe, MTM_COLORS, MTM_GLOBE_CONFIG, mtmThermalShader };

// Global registration for browser usage
if (typeof window !== 'undefined') {
  window.MTMGlobe = MTMGlobe;
  window.MTM_COLORS = MTM_COLORS;
  window.MTM_GLOBE_CONFIG = MTM_GLOBE_CONFIG;
  window.mtmThermalShader = mtmThermalShader;
}

export default MTMGlobe;