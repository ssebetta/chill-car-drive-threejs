import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';

class EnhancedDrivingSimulation {
  constructor() {
    // Configuration options
    this.config = {
      season: 'summer', // summer, autumn, winter, spring
      timeOfDay: 'afternoon', // early-morning, morning, afternoon, evening, night
      headlightsOn: false,
      carColor: 0xff0000,
      carModel: 'sedan', // sedan, suv, sports
      headlightIntensity: 1.0 // configurable headlight intensity
    };

    // Scene setup
    this.scene = new THREE.Scene();
    
    // Camera setup
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.set(0, 5, -10);
    this.camera.lookAt(0, 0, 0);
    
    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.5;
    document.body.appendChild(this.renderer.domElement);

    // Clock for time-based animations
    this.clock = new THREE.Clock();

    // Initialize noise generator
    this.noise = new ImprovedNoise();
    
    // Setup key game components
    this.setupSkyAndLighting();
    this.createTerrain();
    this.createWaterFeatures();
    this.car = this.createCar();
    this.scene.add(this.car);
    this.addAnimalsTrees();
    
    // Car physics properties
    this.carPhysics = {
      speed: 0,
      maxSpeed: 0.8,
      acceleration: 0.01,
      deceleration: 0.005,
      turnSpeed: 0.03,
      brakingForce: 0.02,
      gravity: 0.01,
      groundHeight: 0,
      suspension: 0.5
    };
    
    // Input controls
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      brake: false,
      headlights: false
    };
    
    // UI Setup
    this.setupUI();
    
    // Set up user controls
    this.setupControls();
    
    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
    
    // Start animation loop
    this.animate();
  }

  // Sky and lighting setup based on time of day
  setupSkyAndLighting() {
    // Create sky
    this.sky = new Sky();
    this.sky.scale.setScalar(10000);
    this.scene.add(this.sky);

    // Create sun
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    this.sunLight.shadow.camera.left = -100;
    this.sunLight.shadow.camera.right = 100;
    this.sunLight.shadow.camera.top = 100;
    this.sunLight.shadow.camera.bottom = -100;
    this.scene.add(this.sunLight);

    // Ambient light for overall scene illumination
    this.ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(this.ambientLight);

    // Update sky and lighting based on current time of day
    this.updateEnvironment();
  }

  // Update environment based on time and season
  updateEnvironment() {
    const skyUniforms = this.sky.material.uniforms;
    
    // Configure sky and lighting based on time of day
    let sunElevation, sunAzimuth, sunIntensity, ambientIntensity, fogColor, fogDensity;
    
    switch(this.config.timeOfDay) {
      case 'early-morning':
        sunElevation = 0.15;
        sunAzimuth = 0.25;
        sunIntensity = 0.6;
        ambientIntensity = 0.2;
        fogColor = new THREE.Color(0xffc8a0);
        fogDensity = 0.01;
        break;
      case 'morning':
        sunElevation = 0.4;
        sunAzimuth = 0.35;
        sunIntensity = 0.8;
        ambientIntensity = 0.4;
        fogColor = new THREE.Color(0xffefd5);
        fogDensity = 0.002;
        break;
      case 'afternoon':
        sunElevation = 0.8;
        sunAzimuth = 1.0;
        sunIntensity = 1.0;
        ambientIntensity = 0.6;
        fogColor = new THREE.Color(0xadd8e6);
        fogDensity = 0.001;
        break;
      case 'evening':
        sunElevation = 0.3;
        sunAzimuth = 2.0;
        sunIntensity = 0.7;
        ambientIntensity = 0.3;
        fogColor = new THREE.Color(0xffb347);
        fogDensity = 0.005;
        break;
      case 'night':
        sunElevation = -0.1;
        sunAzimuth = 2.5;
        sunIntensity = 0.1;
        ambientIntensity = 0.1;
        fogColor = new THREE.Color(0x000033);
        fogDensity = 0.008;
        break;
    }
    
    // Apply sky settings
    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = this.config.timeOfDay === 'night' ? 2 : 1;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;
    
    // Sun position
    const phi = THREE.MathUtils.degToRad(90 - sunElevation * 90);
    const theta = THREE.MathUtils.degToRad(sunAzimuth * 180);
    
    const sunPosition = new THREE.Vector3();
    sunPosition.setFromSphericalCoords(1, phi, theta);
    skyUniforms['sunPosition'].value.copy(sunPosition);
    
    // Update sun light
    this.sunLight.position.copy(sunPosition.multiplyScalar(300));
    this.sunLight.intensity = sunIntensity;
    
    // Adjust light color based on time
    if (this.config.timeOfDay === 'evening') {
      this.sunLight.color.setHex(0xffb347);
    } else if (this.config.timeOfDay === 'night') {
      this.sunLight.color.setHex(0x3333aa);
    } else {
      this.sunLight.color.setHex(0xffffff);
    }
    
    // Update ambient light
    this.ambientLight.intensity = ambientIntensity;
    
    // Apply fog
    this.scene.fog = new THREE.FogExp2(fogColor, fogDensity);
    this.scene.background = this.config.timeOfDay === 'night' ? new THREE.Color(0x000022) : null;
    
    // Apply seasonal changes
    this.updateSeason();
  }
  
  // Update elements based on season
  updateSeason() {
    // Get all trees in the scene
    const trees = [];
    this.scene.traverse((object) => {
      if (object.userData && object.userData.type === 'tree') {
        trees.push(object);
      }
    });
    
    // Update trees based on season
    trees.forEach(tree => {
      const leaves = tree.children.find(child => child.userData && child.userData.part === 'leaves');
      if (leaves) {
        switch(this.config.season) {
          case 'summer':
            leaves.material.color.setHex(0x228B22); // Deep green
            break;
          case 'autumn':
            leaves.material.color.setHex(0xD2691E); // Orange/brown
            break;
          case 'winter':
            leaves.material.color.setHex(0xffffff); // White for snow
            leaves.material.opacity = 0.7;
            leaves.material.transparent = true;
            break;
          case 'spring':
            leaves.material.color.setHex(0x90EE90); // Light green
            break;
        }
      }
    });
    
    // Update ground based on season
    let groundColor;
    switch(this.config.season) {
      case 'summer':
        groundColor = 0x3a9d23;
        break;
      case 'autumn':
        groundColor = 0x836539;
        break;
      case 'winter':
        groundColor = 0xf0f0f0;
        break;
      case 'spring':
        groundColor = 0x7cfc00;
        break;
    }
    
    // Update terrain colors
    this.terrain.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material.color.setHex(groundColor);
      }
    });
  }
  
  // Create procedural terrain with hills
  createTerrain() {
    const size = 1000;
    const resolution = 128;
    const maxHeight = 30;
    
    // Generate heightmap using Perlin noise
    const heightMap = this.generateHeightMap(resolution, resolution);
    
    // Create terrain geometry
    const geometry = new THREE.PlaneGeometry(size, size, resolution - 1, resolution - 1);
    geometry.rotateX(-Math.PI / 2);
    
    // Apply heightmap to geometry vertices
    const vertices = geometry.attributes.position.array;
    for (let i = 0, j = 0, l = vertices.length; i < l; i++, j += 3) {
      // Vertex y position (height)
      vertices[j + 1] = heightMap[i] * maxHeight;
    }
    
    // Need to update normals after modifying vertices
    geometry.computeVertexNormals();
    
    // Create material
    const material = new THREE.MeshStandardMaterial({
      color: 0x3a9d23,
      roughness: 0.8,
      metalness: 0.1
    });
    
    // Create mesh
    this.terrain = new THREE.Mesh(geometry, material);
    this.terrain.receiveShadow = true;
    this.terrain.castShadow = true;
    this.scene.add(this.terrain);
    
    // Create a collision function to check height at any position
    this.getHeightAtPosition = (x, z) => {
      // Convert world position to terrain coordinates
      const terrainX = (x + size / 2) / size;
      const terrainZ = (z + size / 2) / size;
      
      if (terrainX < 0 || terrainX > 1 || terrainZ < 0 || terrainZ > 1) {
        return 0; // Outside terrain bounds
      }
      
      // Get nearest heightmap indices
      const xIndex = Math.min(Math.floor(terrainX * (resolution - 1)), resolution - 2);
      const zIndex = Math.min(Math.floor(terrainZ * (resolution - 1)), resolution - 2);
      
      // Get fractions for interpolation
      const xFrac = (terrainX * (resolution - 1)) - xIndex;
      const zFrac = (terrainZ * (resolution - 1)) - zIndex;
      
      // Get the four corner heights
      const h00 = heightMap[zIndex * resolution + xIndex] * maxHeight;
      const h10 = heightMap[zIndex * resolution + xIndex + 1] * maxHeight;
      const h01 = heightMap[(zIndex + 1) * resolution + xIndex] * maxHeight;
      const h11 = heightMap[(zIndex + 1) * resolution + xIndex + 1] * maxHeight;
      
      // Bilinear interpolation of heights
      const h0 = h00 * (1 - xFrac) + h10 * xFrac;
      const h1 = h01 * (1 - xFrac) + h11 * xFrac;
      const height = h0 * (1 - zFrac) + h1 * zFrac;
      
      return height;
    };
    
    // Create a simple road that follows terrain
    this.createRoad();
  }
  
  // Generate height map data
  generateHeightMap(width, height) {
    const size = width * height;
    const data = new Float32Array(size);
    const perlin = new ImprovedNoise();
    const z = Math.random() * 100;
    
    let quality = 1;
    const steps = 4;
    
    for (let j = 0; j < steps; j++) {
      for (let i = 0; i < size; i++) {
        const x = i % width;
        const y = ~~(i / width);
        data[i] += Math.abs(perlin.noise(x / quality, y / quality, z) * quality);
      }
      quality *= 4;
    }
    
    // Normalize data to 0-1 range
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;
    
    for (let i = 0; i < size; i++) {
      data[i] = (data[i] - min) / range;
    }
    
    return data;
  }
  
  // Create a road that follows terrain
  createRoad() {
    const roadWidth = 15;
    const roadLength = 1000;
    const roadSegments = 100;
    
    // Create a curved road path
    const roadCurve = new THREE.CurvePath();
    
    // Generate control points with some curves
    const controlPoints = [];
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      const angle = t * Math.PI * 4;
      const radius = 200 - t * 100;
      
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius - 200;
      
      controlPoints.push(new THREE.Vector3(x, 0, z));
    }
    
    // Create a smooth spline curve
    for (let i = 0; i < controlPoints.length - 1; i++) {
      const curve = new THREE.CatmullRomCurve3([
        controlPoints[i],
        controlPoints[i + 1]
      ]);
      roadCurve.add(curve);
    }
    
    // Create road geometry that follows the curve
    const roadGeometry = new THREE.PlaneGeometry(roadWidth, roadLength, 1, roadSegments);
    roadGeometry.rotateX(-Math.PI / 2);
    
    // Adjust vertices to follow the curve
    const positions = roadGeometry.attributes.position.array;
    
    for (let i = 0; i <= roadSegments; i++) {
      const t = i / roadSegments;
      const point = roadCurve.getPoint(t);
      const height = this.getHeightAtPosition(point.x, point.z) + 0.2; // Slightly above terrain
      
      // Get normal to curve at this point for road width orientation
      const tangent = roadCurve.getTangent(t);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      
      // Set positions for this segment's vertices
      for (let j = 0; j <= 1; j++) {
        const vertexIndex = (i * 2 + j) * 3;
        const width = (j === 0 ? -1 : 1) * roadWidth / 2;
        
        positions[vertexIndex] = point.x + normal.x * width;
        positions[vertexIndex + 1] = height;
        positions[vertexIndex + 2] = point.z + normal.z * width;
      }
    }
    
    // Update the geometry
    roadGeometry.attributes.position.needsUpdate = true;
    roadGeometry.computeVertexNormals();
    
    // Create road material
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.9,
      metalness: 0.1
    });
    
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.receiveShadow = true;
    this.scene.add(road);
    
    // Add road markings
    this.addRoadMarkings(roadCurve); //,height
    
    // Store road data for car positioning
    this.roadCurve = roadCurve;
    
    // Position car on the road
    const startPoint = roadCurve.getPoint(0);
    const startTangent = roadCurve.getTangent(0);
    this.carStartPosition = new THREE.Vector3(
      startPoint.x,
      this.getHeightAtPosition(startPoint.x, startPoint.z) + 1,
      startPoint.z
    );
    this.carStartRotation = Math.atan2(startTangent.x, startTangent.z);
  }
  
  // Add lane markings to the road
  addRoadMarkings(roadCurve, heightOffset = 0.1) {
    const numDashes = 200;
    const dashLength = 2;
    const dashGap = 2;
    const markingWidth = 0.5;
    
    // Create dashed center line
    const markingsMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    
    for (let i = 0; i < numDashes; i++) {
      const t = (i * (dashLength + dashGap)) / (numDashes * (dashLength + dashGap));
      
      if (t > 1) break;
      
      const point = roadCurve.getPoint(t);
      const endT = t + dashLength / (numDashes * (dashLength + dashGap));
      
      if (endT > 1) break;
      
      const endPoint = roadCurve.getPoint(endT);
      const tangent = roadCurve.getTangent(t);
      
      // Create a geometry for this dash
      const dashGeometry = new THREE.PlaneGeometry(markingWidth, dashLength);
      
      // Rotate and position the dash to align with the road curve
      const angle = Math.atan2(tangent.x, tangent.z);
      dashGeometry.rotateY(angle);
      dashGeometry.rotateX(-Math.PI / 2);
      
      // Create mesh and position it
      const dash = new THREE.Mesh(dashGeometry, markingsMaterial);
      dash.position.set(
        (point.x + endPoint.x) / 2,
        this.getHeightAtPosition(point.x, point.z) + heightOffset,
        (point.z + endPoint.z) / 2
      );
      dash.receiveShadow = true;
      
      this.scene.add(dash);
    }
  }
  
  // Create water features (lakes and rivers)
  createWaterFeatures() {
    // Create a lake
    this.createLake(100, 70, new THREE.Vector3(-150, 0, 150));
    
    // Create a river
    this.createRiver();
  }

  // Create a lake with realistic water
  createLake(width, length, position) {
    // Water geometry
    const waterGeometry = new THREE.PlaneGeometry(width, length, 10, 10);
    
    // Water material using Three.js Water
    const waterMaterial = new Water(waterGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load(
        'https://threejs.org/examples/textures/waternormals.jpg', 
        function(texture) {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }
      ),
      sunDirection: new THREE.Vector3(0.5, 0.7, -0.5),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: this.scene.fog !== undefined
    });
    
    // Create water mesh
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.copy(position);
    water.position.y = 0; // Set to appropriate height
    
    // Add to scene
    this.scene.add(water);
    
    // Store for animation
    this.water = water;
    
    // Create a shore around the lake
    const shoreGeometry = new THREE.RingGeometry(width/2, width/2 + 5, 32);
    const shoreMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xd2b48c,
      roughness: 1.0
    });
    
    const shore = new THREE.Mesh(shoreGeometry, shoreMaterial);
    shore.rotation.x = -Math.PI / 2;
    shore.position.copy(position);
    shore.position.y = 0.1; // Slightly above water
    
    this.scene.add(shore);
  }
  
  // Create a river with flowing water
  createRiver() {
    const riverWidth = 10;
    const riverLength = 300;
    const riverSegments = 20;
    
    // Create a curved path for the river
    const riverCurve = new THREE.CurvePath();
    
    // Control points for the river
    const points = [
      new THREE.Vector3(100, 0, -200),
      new THREE.Vector3(80, 0, -150),
      new THREE.Vector3(90, 0, -100),
      new THREE.Vector3(120, 0, -50),
      new THREE.Vector3(150, 0, 0),
      new THREE.Vector3(170, 0, 50)
    ];
    
    // Create smooth spline
    for (let i = 0; i < points.length - 1; i++) {
      const curve = new THREE.CatmullRomCurve3([
        points[i],
        points[i + 1]
      ]);
      riverCurve.add(curve);
    }
    
    // Create river geometry
    const riverGeometry = new THREE.PlaneGeometry(riverWidth, riverLength, 1, riverSegments);
    riverGeometry.rotateX(-Math.PI / 2);
    
    // Adjust vertices to follow the curve
    const positions = riverGeometry.attributes.position.array;
    
    for (let i = 0; i <= riverSegments; i++) {
      const t = i / riverSegments;
      const point = riverCurve.getPoint(t);
      const height = -0.5; // River slightly below ground
      
      // Get normal to curve at this point for river width orientation
      const tangent = riverCurve.getTangent(t);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      
      // Set positions for this segment's vertices
      for (let j = 0; j <= 1; j++) {
        const vertexIndex = (i * 2 + j) * 3;
        const width = (j === 0 ? -1 : 1) * riverWidth / 2;
        
        positions[vertexIndex] = point.x + normal.x * width;
        positions[vertexIndex + 1] = height;
        positions[vertexIndex + 2] = point.z + normal.z * width;
      }
    }
    
    // Update geometry
    riverGeometry.attributes.position.needsUpdate = true;
    riverGeometry.computeVertexNormals();
    
    // Create water material
    const waterMaterial = new Water(riverGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load(
        'https://threejs.org/examples/textures/waternormals.jpg', 
        function(texture) {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }
      ),
      sunDirection: new THREE.Vector3(0.5, 0.7, -0.5),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: this.scene.fog !== undefined
    });
    
    // Create river mesh
    const river = new THREE.Mesh(riverGeometry, waterMaterial);
    river.receiveShadow = true;
    
    // Add to scene
    this.scene.add(river);
    
    // Store for animation
    this.river = river;
    
    // Create riverbanks
    const bankWidth = 3;
    const bankMaterial = new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 1.0 });
    
    // Create left and right banks
    for (let side = -1; side <= 1; side += 2) {
      const bankGeometry = new THREE.PlaneGeometry(bankWidth, riverLength, 1, riverSegments);
      bankGeometry.rotateX(-Math.PI / 2);
      
      // Adjust vertices to follow the curve
      const bankPositions = bankGeometry.attributes.position.array;
      
      for (let i = 0; i <= riverSegments; i++) {
        const t = i / riverSegments;
        const point = riverCurve.getPoint(t);
        const height = 0; // Bank at ground level
        
        // Get normal for orientation
        const tangent = riverCurve.getTangent(t);
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
        
        // Set positions
        for (let j = 0; j <= 1; j++) {
          const vertexIndex = (i * 2 + j) * 3;
          const offset = riverWidth / 2 * side;
          const width = (j === 0 ? 0 : side) * bankWidth;
          
          bankPositions[vertexIndex] = point.x + normal.x * (offset + width);
          bankPositions[vertexIndex + 1] = height;
          bankPositions[vertexIndex + 2] = point.z + normal.z * (offset + width);
        }
      }
      
      // Update geometry
      bankGeometry.attributes.position.needsUpdate = true;
      bankGeometry.computeVertexNormals();
      
      // Create bank mesh
      const bank = new THREE.Mesh(bankGeometry, bankMaterial);
      bank.receiveShadow = true;
      
      // Add to scene
      this.scene.add(bank);
    }
  }
  
  // Create the car with working headlights and multiple models
  createCar(carModel = this.config.carModel) {
    const car = new THREE.Group();
    
    // Dimensions based on car model
    let dimensions;
    switch(carModel) {
      case 'sedan':
        dimensions = {
          bodyWidth: 2.2,
          bodyHeight: 1.1,
          bodyLength: 4.5,
          roofWidth: 1.8,
          roofHeight: 0.7,
          roofLength: 2.8
        };
        break;
      case 'suv':
        dimensions = {
          bodyWidth: 2.4,
          bodyHeight: 1.3,
          bodyLength: 4.8,
          roofWidth: 2.2,
          roofHeight: 1.1,
          roofLength: 3.5
        };
        break;
      case 'sports':
        dimensions = {
          bodyWidth: 2.4,
          bodyHeight: 1.0,
          bodyLength: 4.5,
          roofWidth: 1.8,
          roofHeight: 0.6,
          roofLength: 2.5
        };
        break;
    }
    
    // Car body
    const bodyGeometry = new THREE.BoxGeometry(
      dimensions.bodyWidth, 
      dimensions.bodyHeight, 
      dimensions.bodyLength
    );
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: this.config.carColor,
      roughness: 0.2,
      metalness: 0.5
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = dimensions.bodyHeight / 2;
    body.castShadow = true;
    car.add(body);
    
    // Car roof
    const roofGeometry = new THREE.BoxGeometry(
      dimensions.roofWidth, 
      dimensions.roofHeight, 
      dimensions.roofLength
    );
    const roofMaterial = new THREE.MeshStandardMaterial({ 
      color: this.config.carColor,
      roughness: 0.2,
      metalness: 0.5
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = dimensions.bodyHeight + dimensions.roofHeight / 2;
    
    // Adjust roof position based on car model
    if (carModel === 'sedan') {
      roof.position.z = -0.2;
    } else if (carModel === 'suv') {
      roof.position.z = 0;
    } else if (carModel === 'sports') {
      roof.position.z = -0.5;
    }
    
    roof.castShadow = true;
    car.add(roof);
    
    // Wheels
    const wheelRadius = carModel === 'suv' ? 0.6 : 0.5;
    const wheelThickness = 0.3;
    const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 24);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    // Wheel positions
    const wheelOffsetX = dimensions.bodyWidth / 2 * 0.9;
    const wheelOffsetZ = dimensions.bodyLength / 2 * 0.8;
    
    // Create wheels
    const wheels = [];
    
    // Front left wheel
    const wheelFL = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelFL.position.set(-wheelOffsetX, wheelRadius, wheelOffsetZ);
    wheelFL.rotation.z = Math.PI / 2;
    wheelFL.castShadow = true;
    car.add(wheelFL);
    wheels.push({ mesh: wheelFL, steering: true });
    
    // Front right wheel
    const wheelFR = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelFR.position.set(wheelOffsetX, wheelRadius, wheelOffsetZ);
    wheelFR.rotation.z = Math.PI / 2;
    wheelFR.castShadow = true;
    car.add(wheelFR);
    wheels.push({ mesh: wheelFR, steering: true });
    
    // Rear left wheel
    const wheelRL = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelRL.position.set(-wheelOffsetX, wheelRadius, -wheelOffsetZ);
    wheelRL.rotation.z = Math.PI / 2;
    wheelRL.castShadow = true;
    car.add(wheelRL);
    wheels.push({ mesh: wheelRL, steering: false });
    
    // Rear right wheel
    const wheelRR = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelRR.position.set(wheelOffsetX, wheelRadius, -wheelOffsetZ);
    wheelRR.rotation.z = Math.PI / 2;
    wheelRR.castShadow = true;
    car.add(wheelRR);
    wheels.push({ mesh: wheelRR, steering: false });
    
    // Add headlights
    const headlightGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const headlightMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffcc,
      emissive: 0xffffcc,
      emissiveIntensity: this.config.headlightsOn ? 1 : 0
    });
    
    // Left headlight
    const headlightL = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightL.position.set(-dimensions.bodyWidth / 2 * 0.8, dimensions.bodyHeight / 2, dimensions.bodyLength / 2 * 0.95);
    car.add(headlightL);
    
    // Right headlight
    const headlightR = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightR.position.set(dimensions.bodyWidth / 2 * 0.8, dimensions.bodyHeight / 2, dimensions.bodyLength / 2 * 0.95);
    car.add(headlightR);
    
    // Headlight spotlights (visible light beams)
    const spotlightL = new THREE.SpotLight(0xffffcc, this.config.headlightsOn ? 2 : 0, 100, Math.PI / 4, 0.5, 1);
    spotlightL.position.copy(headlightL.position);
    spotlightL.target.position.set(headlightL.position.x, 0, headlightL.position.z + 10);
    car.add(spotlightL);
    car.add(spotlightL.target);
    
    const spotlightR = new THREE.SpotLight(0xffffcc, this.config.headlightsOn ? 2 : 0, 100, Math.PI / 4, 0.5, 1);
    spotlightR.position.copy(headlightR.position);
    spotlightR.target.position.set(headlightR.position.x, 0, headlightR.position.z + 10);
    car.add(spotlightR);
    car.add(spotlightR.target);
    
    // Taillights
    const taillightGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const taillightMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.5
    });
    
    // Left taillight
    const taillightL = new THREE.Mesh(taillightGeometry, taillightMaterial);
    taillightL.position.set(-dimensions.bodyWidth / 2 * 0.8, dimensions.bodyHeight / 2, -dimensions.bodyLength / 2 * 0.95);
    car.add(taillightL);
    
    // Right taillight
    const taillightR = new THREE.Mesh(taillightGeometry, taillightMaterial);
    taillightR.position.set(dimensions.bodyWidth / 2 * 0.8, dimensions.bodyHeight / 2, -dimensions.bodyLength / 2 * 0.95);
    car.add(taillightR);
    
    // Store references for later use
    car.userData = {
      wheels: wheels,
      headlights: {
        meshes: [headlightL, headlightR],
        spotlights: [spotlightL, spotlightR]
      },
      taillights: [taillightL, taillightR]
    };
    
    return car;
  }
  
  // Create trees and add animals
  addAnimalsTrees() {
    this.addTrees();
    this.addAnimals();
  }
  
  // Add trees to the scene
  addTrees() {
    const treeCount = 100;
    const maxDistance = 400;
    
    for (let i = 0; i < treeCount; i++) {
      // Random position within bounds
      const angle = Math.random() * Math.PI * 2;
      const distance = 50 + Math.random() * maxDistance;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      
      // Get height at position
      const y = this.getHeightAtPosition(x, z);
      
      // Create tree
      const tree = this.createTree();
      tree.position.set(x, y, z);
      
      // Random rotation and scale
      tree.rotation.y = Math.random() * Math.PI * 2;
      const scale = 0.8 + Math.random() * 0.7;
      tree.scale.set(scale, scale, scale);
      
      this.scene.add(tree);
    }
  }
  
  // Create a single tree
  createTree() {
    const tree = new THREE.Group();
    tree.userData = { type: 'tree' };
    
    // Tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 5, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.9
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 2.5;
    trunk.castShadow = true;
    trunk.userData = { part: 'trunk' };
    tree.add(trunk);
    
    // Tree leaves/foliage
    const leavesGeometry = new THREE.ConeGeometry(3, 6, 8);
    const leavesMaterial = new THREE.MeshStandardMaterial({
      color: 0x228B22,
      roughness: 0.8
    });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.y = 7;
    leaves.castShadow = true;
    leaves.userData = { part: 'leaves' };
    tree.add(leaves);
    
    return tree;
  }
  
  // Add animals to the scene
  addAnimals() {
    // Add deer
    this.addDeer(new THREE.Vector3(50, 0, 100));
    this.addDeer(new THREE.Vector3(-100, 0, 80));
    this.addDeer(new THREE.Vector3(200, 0, -150));
    
    // Add birds
    for (let i = 0; i < 10; i++) {
      const x = (Math.random() - 0.5) * 400;
      const z = (Math.random() - 0.5) * 400;
      const y = 10 + Math.random() * 20;
      this.addBird(new THREE.Vector3(x, y, z));
    }
  }
  
  // Create a deer
  addDeer(position) {
    const deer = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.CapsuleGeometry(1, 2, 4, 8);
    bodyGeometry.rotateZ(Math.PI / 2);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xC19A6B });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    deer.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.6, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xC19A6B });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(1.5, 1.2, 0);
    head.castShadow = true;
    deer.add(head);
    
    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    
    // Front legs
    const legFL = new THREE.Mesh(legGeometry, legMaterial);
    legFL.position.set(0.8, -1.2, 0.6);
    legFL.castShadow = true;
    deer.add(legFL);
    
    const legFR = new THREE.Mesh(legGeometry, legMaterial);
    legFR.position.set(0.8, -1.2, -0.6);
    legFR.castShadow = true;
    deer.add(legFR);
    
    // Back legs
    const legBL = new THREE.Mesh(legGeometry, legMaterial);
    legBL.position.set(-0.8, -1.2, 0.6);
    legBL.castShadow = true;
    deer.add(legBL);
    
    const legBR = new THREE.Mesh(legGeometry, legMaterial);
    legBR.position.set(-0.8, -1.2, -0.6);
    legBR.castShadow = true;
    deer.add(legBR);
    
    // Antlers (if male)
    if (Math.random() > 0.5) {
      const antlerGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 4);
      const antlerMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
      
      const antlerL = new THREE.Mesh(antlerGeometry, antlerMaterial);
      antlerL.position.set(1.5, 2, 0.3);
      antlerL.rotation.z = Math.PI / 4;
      antlerL.rotation.x = Math.PI / 6;
      antlerL.castShadow = true;
      deer.add(antlerL);
      
      const antlerR = new THREE.Mesh(antlerGeometry, antlerMaterial);
      antlerR.position.set(1.5, 2, -0.3);
      antlerR.rotation.z = Math.PI / 4;
      antlerR.rotation.x = -Math.PI / 6;
      antlerR.castShadow = true;
      deer.add(antlerR);
    }
    
    // Position on terrain
    const groundY = this.getHeightAtPosition(position.x, position.z);
    deer.position.set(position.x, groundY + 2, position.z);
    
    // Random rotation
    deer.rotation.y = Math.random() * Math.PI * 2;
    
    // Add animation data
    deer.userData = {
      type: 'animal',
      species: 'deer',
      animation: {
        state: 'idle',
        time: 0,
        moveTarget: new THREE.Vector3(
          position.x + (Math.random() - 0.5) * 50,
          0,
          position.z + (Math.random() - 0.5) * 50
        ),
        moveSpeed: 0.05 + Math.random() * 0.03
      }
    };
    
    this.scene.add(deer);
  }
  
  // Create a bird
  addBird(position) {
    const bird = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: Math.random() > 0.5 ? 0x6495ED : 0xFF4500 
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    bird.add(body);
    
    // Wings
    const wingGeometry = new THREE.PlaneGeometry(1.2, 0.5);
    const wingMaterial = new THREE.MeshStandardMaterial({ 
      color: bodyMaterial.color,
      side: THREE.DoubleSide
    });
    
    const wingL = new THREE.Mesh(wingGeometry, wingMaterial);
    wingL.position.set(0, 0, 0.5);
    wingL.rotation.y = Math.PI / 2;
    wingL.castShadow = true;
    bird.add(wingL);
    
    const wingR = new THREE.Mesh(wingGeometry, wingMaterial);
    wingR.position.set(0, 0, -0.5);
    wingR.rotation.y = Math.PI / 2;
    wingR.castShadow = true;
    bird.add(wingR);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.set(0.3, 0.1, 0);
    head.castShadow = true;
    bird.add(head);
    
    // Beak
    const beakGeometry = new THREE.ConeGeometry(0.05, 0.2, 4);
    const beakMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
    const beak = new THREE.Mesh(beakGeometry, beakMaterial);
    beak.position.set(0.5, 0.1, 0);
    beak.rotation.z = -Math.PI / 2;
    beak.castShadow = true;
    bird.add(beak);
    
    // Position in air
    bird.position.copy(position);
    
    // Add animation data
    bird.userData = {
      type: 'animal',
      species: 'bird',
      animation: {
        wingDirection: 1,
        wingPosition: 0,
        moveTarget: new THREE.Vector3(
          position.x + (Math.random() - 0.5) * 100,
          position.y + (Math.random() - 0.5) * 10,
          position.z + (Math.random() - 0.5) * 100
        ),
        moveSpeed: 0.1 + Math.random() * 0.1
      }
    };
    
    this.scene.add(bird);
  }
  
  // Set up controls for keyboard/touch input
  setupControls() {
    // Keyboard controls
    document.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          this.keys.forward = true;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          this.keys.backward = true;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.keys.left = true;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.keys.right = true;
          break;
        case ' ':
          this.keys.brake = true;
          break;
        case 'h':
        case 'H':
          this.toggleHeadlights();
          break;
      }
    });
    
    document.addEventListener('keyup', (event) => {
      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          this.keys.forward = false;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          this.keys.backward = false;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.keys.left = false;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.keys.right = false;
          break;
        case ' ':
          this.keys.brake = false;
          break;
      }
    });
    
    // Touch controls for mobile
    const touchZones = {
      forward: { x: window.innerWidth / 2, y: window.innerHeight / 4, radius: window.innerHeight / 4 },
      backward: { x: window.innerWidth / 2, y: window.innerHeight * 3/4, radius: window.innerHeight / 4 },
      left: { x: window.innerWidth / 4, y: window.innerHeight / 2, radius: window.innerWidth / 4 },
      right: { x: window.innerWidth * 3/4, y: window.innerHeight / 2, radius: window.innerWidth / 4 }
    };
    
    const touchHandler = (event) => {
      event.preventDefault();
      
      // Reset keys
      this.keys.forward = false;
      this.keys.backward = false;
      this.keys.left = false;
      this.keys.right = false;
      
      // Check each touch
      for (let i = 0; i < event.touches.length; i++) {
        const touch = event.touches[i];
        
        // Check if touch is in any control zone
        for (const [key, zone] of Object.entries(touchZones)) {
          const dx = touch.clientX - zone.x;
          const dy = touch.clientY - zone.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < zone.radius) {
            this.keys[key] = true;
          }
        }
      }
    };
    
    document.addEventListener('touchstart', touchHandler);
    document.addEventListener('touchmove', touchHandler);
    document.addEventListener('touchend', touchHandler);
  }
  
  // Toggle car headlights
  toggleHeadlights() {
    this.config.headlightsOn = !this.config.headlightsOn;
    
    // Update headlight materials
    this.car.userData.headlights.meshes.forEach(light => {
      light.material.emissiveIntensity = this.config.headlightsOn ? 1 : 0;
    });
      spotlight.intensity = this.config.headlightsOn ? this.config.headlightIntensity : 0;
    // Update spotlights
    this.car.userData.headlights.spotlights.forEach(spotlight => {
      spotlight.intensity = this.config.headlightsOn ? 2 : 0;
    });
  }
  
  // Set up UI elements
  setupUI() {
    // Create UI container
    const uiContainer = document.createElement('div');
    uiContainer.style.position = 'absolute';
    uiContainer.style.bottom = '20px';
    uiContainer.style.right = '20px';
    uiContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    uiContainer.style.padding = '10px';
    uiContainer.style.borderRadius = '5px';
    uiContainer.style.color = 'white';
    uiContainer.style.fontFamily = 'Arial, sans-serif';
    document.body.appendChild(uiContainer);
    
    // Time of day selector
    const timeLabel = document.createElement('label');
    timeLabel.textContent = 'Time of Day: ';
    uiContainer.appendChild(timeLabel);
    
    const timeSelect = document.createElement('select');
    const timeOptions = ['early-morning', 'morning', 'afternoon', 'evening', 'night'];
    timeOptions.forEach(time => {
      const option = document.createElement('option');
      option.value = time;
      option.textContent = time.charAt(0).toUpperCase() + time.slice(1).replace('-', ' ');
      if (time === this.config.timeOfDay) {
        option.selected = true;
      }
      timeSelect.appendChild(option);
    });
    
    timeSelect.addEventListener('change', () => {
      this.config.timeOfDay = timeSelect.value;
      this.updateEnvironment();
    });
    
    uiContainer.appendChild(timeSelect);
    uiContainer.appendChild(document.createElement('br'));
    
    // Season selector
    const seasonLabel = document.createElement('label');
    seasonLabel.textContent = 'Season: ';
    uiContainer.appendChild(seasonLabel);
    
    const seasonSelect = document.createElement('select');
    const seasonOptions = ['summer', 'autumn', 'winter', 'spring'];
    seasonOptions.forEach(season => {
      const option = document.createElement('option');
      option.value = season;
      option.textContent = season.charAt(0).toUpperCase() + season.slice(1);
      if (season === this.config.season) {
        option.selected = true;
      }
      seasonSelect.appendChild(option);
    });
    
    seasonSelect.addEventListener('change', () => {
      this.config.season = seasonSelect.value;
      this.updateEnvironment();
    });
    
    uiContainer.appendChild(seasonSelect);
    uiContainer.appendChild(document.createElement('br'));
    
    // Headlights toggle
    const headlightsLabel = document.createElement('label');
    headlightsLabel.textContent = 'Headlights: ';
    uiContainer.appendChild(headlightsLabel);
    
    const headlightsCheckbox = document.createElement('input');
    headlightsCheckbox.type = 'checkbox';
    headlightsCheckbox.checked = this.config.headlightsOn;
    headlightsCheckbox.addEventListener('change', () => {
      this.toggleHeadlights();
    });
    
    uiContainer.appendChild(headlightsCheckbox);
    uiContainer.appendChild(document.createElement('br'));
    
    // Car model selector
    const carModelLabel = document.createElement('label');
    carModelLabel.textContent = 'Car Model: ';
    uiContainer.appendChild(carModelLabel);
    
    const carModelSelect = document.createElement('select');
    const carModelOptions = ['sedan', 'suv', 'sports'];
    carModelOptions.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model.charAt(0).toUpperCase() + model.slice(1);
      if (model === this.config.carModel) {
        option.selected = true;
      }
      carModelSelect.appendChild(option);
    });
    
    carModelSelect.addEventListener('change', () => {
      this.config.carModel = carModelSelect.value;
      // Remove old car
      this.scene.remove(this.car);
      // Create new car
      this.car = this.createCar();
      this.scene.add(this.car);
    });
    
    uiContainer.appendChild(carModelSelect);
    uiContainer.appendChild(document.createElement('br'));
    
    // Car color picker
    const carColorLabel = document.createElement('label');
    carColorLabel.textContent = 'Car Color: ';
    uiContainer.appendChild(carColorLabel);
    
    const carColorPicker = document.createElement('input');
    carColorPicker.type = 'color';
    carColorPicker.value = '#' + this.config.carColor.toString(16).padStart(6, '0');
    carColorPicker.addEventListener('change', () => {
      this.config.carColor = parseInt(carColorPicker.value.substring(1), 16);
      // Update car color
      this.car.traverse((child) => {
        if (child instanceof THREE.Mesh && 
            child.material && 
            !child.userData.part && 
            child.material.color && 
            child !== this.car.userData.headlights.meshes[0] &&
            child !== this.car.userData.headlights.meshes[1] &&
            !this.car.userData.taillights.includes(child) &&
            !this.car.userData.wheels.some(wheel => wheel.mesh === child)) {
          child.material.color.setHex(this.config.carColor);
        }
      });
    });
    
    uiContainer.appendChild(carColorPicker);
  }
  
  // Handle window resize
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  // Update car physics and movement
  updateCarPhysics(deltaTime) {
    // Apply acceleration or deceleration based on input
    if (this.keys.forward) {
      this.carPhysics.speed += this.carPhysics.acceleration * deltaTime;
    } else if (this.keys.backward) {
      this.carPhysics.speed -= this.carPhysics.acceleration * deltaTime;
    } else {
      // Apply deceleration when no input
      if (this.carPhysics.speed > 0) {
        this.carPhysics.speed -= this.carPhysics.deceleration * deltaTime;
        if (this.carPhysics.speed < 0) this.carPhysics.speed = 0;
      } else if (this.carPhysics.speed < 0) {
        this.carPhysics.speed += this.carPhysics.deceleration * deltaTime;
        if (this.carPhysics.speed > 0) this.carPhysics.speed = 0;
      }
    }
    
    // Apply brakes
    if (this.keys.brake) {
      if (this.carPhysics.speed > 0) {
        this.carPhysics.speed -= this.carPhysics.brakingForce * deltaTime;
        if (this.carPhysics.speed < 0) this.carPhysics.speed = 0;
      } else if (this.carPhysics.speed < 0) {
        this.carPhysics.speed += this.carPhysics.brakingForce * deltaTime;
        if (this.carPhysics.speed > 0) this.carPhysics.speed = 0;
      }
    }
    
    // Clamp speed
    this.carPhysics.speed = THREE.MathUtils.clamp(
      this.carPhysics.speed, 
      -this.carPhysics.maxSpeed * 0.5, 
      this.carPhysics.maxSpeed
    );
    
    // Apply turning based on input
    let turnAmount = 0;
    if (this.keys.left) turnAmount = this.carPhysics.turnSpeed * deltaTime;
    if (this.keys.right) turnAmount = -this.carPhysics.turnSpeed * deltaTime;
    
    // Only turn when moving
    if (Math.abs(this.carPhysics.speed) > 0.01) {
      // Reduced turning effect when reversing
      const turnFactor = this.carPhysics.speed > 0 ? 1 : 0.5;
      this.car.rotation.y += turnAmount * turnFactor;
      
      // Apply steering to front wheels
      this.car.userData.wheels.forEach(wheel => {
        if (wheel.steering) {
          wheel.mesh.rotation.y = turnAmount * 10;
        }
      });
    }
    
    // Calculate movement vector based on car's rotation
    const moveX = Math.sin(this.car.rotation.y) * this.carPhysics.speed * deltaTime;
    const moveZ = Math.cos(this.car.rotation.y) * this.carPhysics.speed * deltaTime;
    
    // Update position
    this.car.position.x += moveX;
    this.car.position.z += moveZ;
    
    // Update camera to follow car
    const cameraOffset = new THREE.Vector3(
      -Math.sin(this.car.rotation.y) * 10,
      5,
      -Math.cos(this.car.rotation.y) * 10
    );
    
    this.camera.position.copy(this.car.position).add(cameraOffset);
    this.camera.lookAt(this.car.position);
    
    // Get terrain height at car position and adjust car height
    const terrainHeight = this.getHeightAtPosition(this.car.position.x, this.car.position.z);
    
    // Apply suspension and smoothing
    const targetHeight = terrainHeight + this.carPhysics.suspension + 1;
    this.car.position.y += (targetHeight - this.car.position.y) * 0.1;
    
    // Apply tilt based on terrain slope
    const forwardPos = new THREE.Vector3(
      this.car.position.x + Math.sin(this.car.rotation.y) * 2,
      0,
      this.car.position.z + Math.cos(this.car.rotation.y) * 2
    );
    
    const backwardPos = new THREE.Vector3(
      this.car.position.x - Math.sin(this.car.rotation.y) * 2,
      0,
      this.car.position.z - Math.cos(this.car.rotation.y) * 2
    );
    
    const rightPos = new THREE.Vector3(
      this.car.position.x + Math.sin(this.car.rotation.y + Math.PI/2) * 1,
      0,
      this.car.position.z + Math.cos(this.car.rotation.y + Math.PI/2) * 1
    );
    
    const leftPos = new THREE.Vector3(
        this.car.position.x + Math.sin(this.car.rotation.y - Math.PI/2) * 1,
        0,
        this.car.position.z + Math.cos(this.car.rotation.y - Math.PI/2) * 1
      );
      
      const forwardHeight = this.getHeightAtPosition(forwardPos.x, forwardPos.z);
      const backwardHeight = this.getHeightAtPosition(backwardPos.x, backwardPos.z);
      const rightHeight = this.getHeightAtPosition(rightPos.x, rightPos.z);
      const leftHeight = this.getHeightAtPosition(leftPos.x, leftPos.z);
      
      // Calculate pitch and roll based on terrain
      const pitchAngle = Math.atan2(forwardHeight - backwardHeight, 4);
      const rollAngle = Math.atan2(rightHeight - leftHeight, 2);
      
      // Apply pitch and roll with smoothing
      this.car.rotation.x += (pitchAngle - this.car.rotation.x) * 0.1;
      this.car.rotation.z += (rollAngle - this.car.rotation.z) * 0.1;
      
      // Animate wheels
      const wheelSpeed = this.carPhysics.speed * 2;
      this.car.userData.wheels.forEach(wheel => {
        wheel.mesh.rotation.x += wheelSpeed * deltaTime;
      });
    }
    
    // Get height at a specific position based on terrain
    getHeightAtPosition(x, z) {
      // Use Perlin noise for terrain height
      const scale = 0.01;
      const octaves = 4;
      let height = 0;
      let amplitude = 1;
      let frequency = 1;
      
      for (let i = 0; i < octaves; i++) {
        height += this.noise.perlin2(x * scale * frequency, z * scale * frequency) * amplitude;
        amplitude *= 0.5;
        frequency *= 2;
      }
      
      // Create valleys and mountains
      height = height * 15;
      
      // Add seasonal effects
      if (this.config.season === 'winter') {
        // Snow coverage - smoother terrain
        height *= 0.8;
        height += 2;
      }
      
      // Special height for water areas
      const waterHeight = -3;
      if (height < waterHeight && this.config.season !== 'winter') {
        return waterHeight;
      }
      
      return height;
    }
    
    // Update environment based on time of day and season
    updateEnvironment() {
      // Update light colors and intensities based on time of day
      const lightConfigs = {
        'early-morning': {
          ambientColor: 0x9999ff,
          ambientIntensity: 0.3,
          directionalColor: 0xffddcc,
          directionalIntensity: 0.6,
          fogColor: 0xccccff,
          fogDensity: 0.01,
          skyColor: 0x87ceeb
        },
        'morning': {
          ambientColor: 0xffffff,
          ambientIntensity: 0.5,
          directionalColor: 0xffffee,
          directionalIntensity: 0.8,
          fogColor: 0xffffff,
          fogDensity: 0.003,
          skyColor: 0x87ceeb
        },
        'afternoon': {
          ambientColor: 0xffffff,
          ambientIntensity: 0.7,
          directionalColor: 0xffffff,
          directionalIntensity: 1.0,
          fogColor: 0xffffff,
          fogDensity: 0.001,
          skyColor: 0x87ceeb
        },
        'evening': {
          ambientColor: 0xffddcc,
          ambientIntensity: 0.5,
          directionalColor: 0xff9900,
          directionalIntensity: 0.7,
          fogColor: 0xffddcc,
          fogDensity: 0.005,
          skyColor: 0xff9966
        },
        'night': {
          ambientColor: 0x334455,
          ambientIntensity: 0.2,
          directionalColor: 0x334455,
          directionalIntensity: 0.3,
          fogColor: 0x000011,
          fogDensity: 0.01,
          skyColor: 0x000033
        }
      };
      
      // Get current time of day settings
      const config = lightConfigs[this.config.timeOfDay];
      
      // Update lighting
      this.ambientLight.color.setHex(config.ambientColor);
      this.ambientLight.intensity = config.ambientIntensity;
      this.sunLight.color.setHex(config.directionalColor);
      this.sunLight.intensity = config.directionalIntensity;
      
      // Update fog
      if(this.scene.fog) {
        this.scene.fog.color.setHex(config.fogColor);
        this.scene.fog.density = config.fogDensity;
      }
      
      // Update sky color
      if(this.scene.background){
        this.scene.background.setHex(config.skyColor);
      }
      
      // Update for seasons
      if (this.config.season === 'winter') {
        // Adjust light for winter
        this.ambientLight.intensity *= 1.2;
        this.sunLight.intensity *= 1.1;
        
        // Update terrain material
        this.terrain.material.color.setHex(0xffffff);
        
        // Update trees for winter
        this.scene.traverse(object => {
          if (object.userData && object.userData.type === 'tree') {
            object.traverse(child => {
              if (child.userData && child.userData.part === 'leaves') {
                // Snow-covered or bare trees
                child.material.color.setHex(0xffffff);
              }
            });
          }
        });
        
        // Update water for winter (frozen)
        if (this.water) {
          this.water.material.opacity = 0.7;
          this.water.material.color.setHex(0xaaddff);
        }
      } 
      else if (this.config.season === 'autumn') {
        // Adjust light for autumn
        this.ambientLight.intensity *= 0.9;
        
        // Update terrain material
        this.terrain.material.color.setHex(0xCC9966);
        
        // Update trees for autumn
        this.scene.traverse(object => {
          if (object.userData && object.userData.type === 'tree') {
            object.traverse(child => {
              if (child.userData && child.userData.part === 'leaves') {
                const autumnColors = [0xff6600, 0xcc6600, 0xffcc00, 0xcc3300];
                child.material.color.setHex(autumnColors[Math.floor(Math.random() * autumnColors.length)]);
              }
            });
          }
        });
        
        // Update water for autumn
        if (this.water) {
          this.water.material.opacity = 0.8;
          this.water.material.color.setHex(0x3377ff);
        }
      }
      else if (this.config.season === 'spring') {
        // Adjust light for spring
        this.ambientLight.intensity *= 1.1;
        
        // Update terrain material
        this.terrain.material.color.setHex(0x66cc66);
        
        // Update trees for spring
        this.scene.traverse(object => {
          if (object.userData && object.userData.type === 'tree') {
            object.traverse(child => {
              if (child.userData && child.userData.part === 'leaves') {
                const springColors = [0x66cc66, 0x99cc66, 0x66dd66];
                child.material.color.setHex(springColors[Math.floor(Math.random() * springColors.length)]);
              }
            });
          }
        });
        
        // Update water for spring
        if (this.water) {
          this.water.material.opacity = 0.8;
          this.water.material.color.setHex(0x66aaff);
        }
      }
      else { // Summer
        // Adjust light for summer
        this.ambientLight.intensity *= 1.0;
        
        // Update terrain material
        if (this.terrain) {
            this.terrain.material.color.setHex(0x669933);   
        }
        
        // Update trees for summer
        this.scene.traverse(object => {
          if (object.userData && object.userData.type === 'tree') {
            object.traverse(child => {
              if (child.userData && child.userData.part === 'leaves') {
                const summerColors = [0x228B22, 0x006400, 0x32CD32];
                child.material.color.setHex(summerColors[Math.floor(Math.random() * summerColors.length)]);
              }
            });
          }
        });
        
        // Update water for summer
        if (this.water) {
          this.water.material.opacity = 0.8;
          this.water.material.color.setHex(0x3399ff);
        }
      }
    }
    
    // Update animal animations
    updateAnimals(deltaTime) {
      this.scene.traverse(object => {
        if (object.userData && object.userData.type === 'animal') {
          if (object.userData.species === 'deer') {
            this.updateDeer(object, deltaTime);
          } else if (object.userData.species === 'bird') {
            this.updateBird(object, deltaTime);
          }
        }
      });
    }
    
    // Update deer animation
    updateDeer(deer, deltaTime) {
      const anim = deer.userData.animation;
      anim.time += deltaTime;
      
      if (anim.state === 'idle') {
        // Slight head movement during idle
        deer.children[1].rotation.x = Math.sin(anim.time * 0.5) * 0.05;
        
        // Occasionally change to walking state
        if (Math.random() < 0.005) {
          anim.state = 'walking';
          anim.moveTarget.set(
            deer.position.x + (Math.random() - 0.5) * 50,
            0,
            deer.position.z + (Math.random() - 0.5) * 50
          );
          
          // Face the target direction
          const direction = new THREE.Vector3()
            .subVectors(anim.moveTarget, deer.position)
            .normalize();
          deer.rotation.y = Math.atan2(direction.x, direction.z);
        }
      } 
      else if (anim.state === 'walking') {
        // Animate legs while walking
        const legAnimSpeed = 5;
        const legAnimAmp = 0.2;
        
        deer.children[3].rotation.x = Math.sin(anim.time * legAnimSpeed) * legAnimAmp;
        deer.children[4].rotation.x = Math.sin(anim.time * legAnimSpeed + Math.PI) * legAnimAmp;
        deer.children[5].rotation.x = Math.sin(anim.time * legAnimSpeed + Math.PI) * legAnimAmp;
        deer.children[6].rotation.x = Math.sin(anim.time * legAnimSpeed) * legAnimAmp;
        
        // Move towards target
        const direction = new THREE.Vector3()
          .subVectors(anim.moveTarget, deer.position)
          .normalize();
        deer.position.x += direction.x * anim.moveSpeed;
        deer.position.z += direction.z * anim.moveSpeed;
        
        // Adjust height based on terrain
        const terrainHeight = this.getHeightAtPosition(deer.position.x, deer.position.z);
        deer.position.y = terrainHeight + 2;
        
        // Check if we're close to the target
        const distanceToTarget = deer.position.distanceTo(anim.moveTarget);
        if (distanceToTarget < 2) {
          anim.state = 'idle';
          anim.time = 0;
        }
        
        // Avoid getting too close to the car
        const distanceToCar = deer.position.distanceTo(this.car.position);
        if (distanceToCar < 15) {
          // Run away from car
          anim.moveTarget.set(
            deer.position.x + (deer.position.x - this.car.position.x) * 2,
            0,
            deer.position.z + (deer.position.z - this.car.position.z) * 2
          );
          anim.moveSpeed = 0.2; // Run faster
          
          // Face away from car
          const direction = new THREE.Vector3()
            .subVectors(deer.position, this.car.position)
            .normalize();
          deer.rotation.y = Math.atan2(direction.x, direction.z);
        }
      }
    }
    
    // Update bird animation
    updateBird(bird, deltaTime) {
      const anim = bird.userData.animation;
      
      // Flap wings
      anim.wingPosition += anim.wingDirection * deltaTime * 5;
      if (anim.wingPosition > 0.5) {
        anim.wingDirection = -1;
      } else if (anim.wingPosition < -0.5) {
        anim.wingDirection = 1;
      }
      
      bird.children[1].rotation.x = anim.wingPosition;
      bird.children[2].rotation.x = -anim.wingPosition;
      
      // Move towards target
      const direction = new THREE.Vector3()
        .subVectors(anim.moveTarget, bird.position)
        .normalize();
      bird.position.x += direction.x * anim.moveSpeed;
      bird.position.y += direction.y * anim.moveSpeed;
      bird.position.z += direction.z * anim.moveSpeed;
      
      // Face the direction of movement
      bird.rotation.y = Math.atan2(direction.x, direction.z);
      
      // Check if we're close to the target
      const distanceToTarget = bird.position.distanceTo(anim.moveTarget);
      if (distanceToTarget < 5) {
        // Set new target
        anim.moveTarget.set(
          bird.position.x + (Math.random() - 0.5) * 100,
          10 + Math.random() * 20,
          bird.position.z + (Math.random() - 0.5) * 100
        );
      }
    }
    
    // Update water animation
    updateWater(deltaTime) {
      if (this.water && this.config.season !== 'winter') {
        if (this.water.material && this.water.material.uniforms) {
            this.water.material.uniforms.time.value += deltaTime;
        }
      }
    }
    
    // Main animation loop
    animate() {
      requestAnimationFrame(this.animate.bind(this));
      
      const deltaTime = this.clock.getDelta();
      
      // Update car physics
      this.updateCarPhysics(deltaTime);
      
      // Update animals
      this.updateAnimals(deltaTime);
      
      // Update water
      this.updateWater(deltaTime);
      
      // Render scene
      this.renderer.render(this.scene, this.camera);
    }
  }
  
  // Initialize the game when the page loads
  window.addEventListener('load', () => {
    const game = new EnhancedDrivingSimulation();
  });