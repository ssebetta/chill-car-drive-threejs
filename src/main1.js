import * as THREE from 'three';

// Main class for the driving simulation
class DrivingSimulation {
  constructor() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    
    // Camera setup
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 5, -10);
    this.camera.lookAt(0, 0, 0);

    this.engine = new Audio('/sounds/v12-motor-engine.mp3');
    this.brake = new Audio('/sounds/handbrake.mp3');
    this.wind = new Audio('/sounds/wind.mp3');

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);
    
    // Lights
    this.addLights();
    
    // Add world elements
    // this.createRoad();
    this.createEnvironment();
    
    // Create car
    this.car = this.createCar();
    this.scene.add(this.car);

    this.road = null;
    this.roadMarkings = null;
    this.createRoad();
    
    // Car physics properties
    this.carSpeed = 0;
    this.maxSpeed = 0.5;
    this.acceleration = 0.01;
    this.deceleration = 0.005;
    this.turnSpeed = 0.03;
    
    // Input controls
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false
    };
    
    // Set up user controls
    this.setupControls();
    
    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
    
    // Start animation loop
    this.animate();
  }
  
  addLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    // Directional light (sun)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    this.scene.add(dirLight);
  }
  
  // createRoad() {
  //   // Create a simple road
  //   const roadGeometry = new THREE.PlaneGeometry(20, 500);
  //   const roadMaterial = new THREE.MeshStandardMaterial({ 
  //     color: 0x333333,
  //     roughness: 0.8
  //   });
  //   const road = new THREE.Mesh(roadGeometry, roadMaterial);
  //   road.rotation.x = -Math.PI / 2;
  //   road.receiveShadow = true;
  //   this.scene.add(road);
    
  //   // Add road markings
  //   const markingsGeometry = new THREE.PlaneGeometry(0.5, 500);
  //   const markingsMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
  //   const markings = new THREE.Mesh(markingsGeometry, markingsMaterial);
  //   markings.rotation.x = -Math.PI / 2;
  //   markings.position.y = 0.01; // Slightly above road
  //   this.scene.add(markings);
  // }

  createRoad() {
    // Remove any existing road elements
    if (this.road) this.scene.remove(this.road);
    if (this.roadMarkings) this.scene.remove(this.roadMarkings);
  
    // Create road
    const roadGeometry = new THREE.PlaneGeometry(20, 500);
    const roadMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      roughness: 0.8
    });
    this.road = new THREE.Mesh(roadGeometry, roadMaterial);
    this.road.rotation.x = -Math.PI / 2;
    this.road.receiveShadow = true;
    
    // Add road markings
    const markingsGeometry = new THREE.PlaneGeometry(0.5, 500);
    const markingsMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    this.roadMarkings = new THREE.Mesh(markingsGeometry, markingsMaterial);
    this.roadMarkings.rotation.x = -Math.PI / 2;
    this.roadMarkings.position.y = 0.01; // Slightly above road
    
    // Add to scene
    this.scene.add(this.road);
    this.scene.add(this.roadMarkings);
  }

  // Add a method to update road position
  // updateRoadPosition() {
  //   const roadSegmentLength = 500;
    
  //   // Adjust road position based on car's movement
  //   this.road.position.z = Math.floor(this.car.position.z / roadSegmentLength) * roadSegmentLength;
  //   this.roadMarkings.position.z = this.road.position.z;
  // }

  updateRoadPosition() {
    const roadSegmentLength = 500;
    
    // Check if car is approaching the end of the current road
    if (Math.abs(this.car.position.z) > roadSegmentLength * 0.4) {
      // Create a new road segment at the end of the current road
      const newRoad = this.road.clone();
      const newMarkings = this.roadMarkings.clone();
      
      // Position the new road segment
      newRoad.position.z = this.road.position.z + roadSegmentLength;
      newMarkings.position.z = newRoad.position.z;
      
      // Add new road to the scene
      this.scene.add(newRoad);
      this.scene.add(newMarkings);
    }
  }
  
  createEnvironment() {
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x267F00,
      roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1; // Slightly below road
    ground.receiveShadow = true;
    this.scene.add(ground);
    
    // Add some trees and rocks
    this.addTrees();
    this.addMountains();
  }
  
  addTrees() {
    // Function to create a simple tree
    const createTree = (x, z) => {
      const tree = new THREE.Group();
      
      // Tree trunk
      const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 2, 8);
      const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.y = 1;
      trunk.castShadow = true;
      tree.add(trunk);
      
      // Tree top
      const topGeometry = new THREE.ConeGeometry(2, 4, 8);
      const topMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
      const top = new THREE.Mesh(topGeometry, topMaterial);
      top.position.y = 4;
      top.castShadow = true;
      tree.add(top);
      
      // Position the tree
      tree.position.set(x, 0, z);
      return tree;
    };
    
    // Add trees at random positions
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 200 - 100;
      const z = Math.random() * 200 - 100;
      
      // Don't place trees on the road
      if (Math.abs(x) > 15) {
        const tree = createTree(x, z);
        this.scene.add(tree);
      }
    }
  }
  
  addMountains() {
    // Create distant mountains
    const mountainGeometry = new THREE.ConeGeometry(30, 50, 4);
    const mountainMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x888888,
      roughness: 1
    });
    
    // Add multiple mountains
    for (let i = 0; i < 10; i++) {
      const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
      const x = Math.random() * 400 - 200;
      const z = Math.random() * 400 - 200;
      
      // Don't place mountains on the road
      if (Math.abs(x) > 50) {
        mountain.position.set(x, 0, z);
        mountain.rotation.y = Math.random() * Math.PI;
        this.scene.add(mountain);
      }
    }
  }
  
  createCar() {
    const car = new THREE.Group();
    
    // Car body
    const bodyGeometry = new THREE.BoxGeometry(2, 1, 4);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    body.castShadow = true;
    car.add(body);
    
    // Car roof
    const roofGeometry = new THREE.BoxGeometry(1.5, 0.7, 2);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0xaa0000 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 1.35;
    roof.position.z = -0.5;
    roof.castShadow = true;
    car.add(roof);
    
    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    // Front left wheel
    const wheelFL = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelFL.position.set(-1.2, 0.5, 1.2);
    wheelFL.rotation.z = Math.PI / 2;
    wheelFL.castShadow = true;
    car.add(wheelFL);
    
    // Front right wheel
    const wheelFR = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelFR.position.set(1.2, 0.5, 1.2);
    wheelFR.rotation.z = Math.PI / 2;
    wheelFR.castShadow = true;
    car.add(wheelFR);
    
    // Back left wheel
    const wheelBL = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelBL.position.set(-1.2, 0.5, -1.2);
    wheelBL.rotation.z = Math.PI / 2;
    wheelBL.castShadow = true;
    car.add(wheelBL);
    
    // Back right wheel
    const wheelBR = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelBR.position.set(1.2, 0.5, -1.2);
    wheelBR.rotation.z = Math.PI / 2;
    wheelBR.castShadow = true;
    car.add(wheelBR);
    
    // Headlights
    const headlightGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const headlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    
    // Left headlight
    const headlightL = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightL.position.set(-0.7, 0.7, 2);
    car.add(headlightL);
    
    // Right headlight
    const headlightR = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightR.position.set(0.7, 0.7, 2);
    car.add(headlightR);
    
    // Window glass
    const windshieldGeometry = new THREE.PlaneGeometry(1.4, 0.7);
    const windowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x88ccff,
      transparent: true,
      opacity: 0.7
    });
    
    // Front windshield
    const frontWindshield = new THREE.Mesh(windshieldGeometry, windowMaterial);
    frontWindshield.position.set(0, 1.35, 0.5);
    frontWindshield.rotation.x = Math.PI / 2.5;
    car.add(frontWindshield);
    
    // Back windshield
    const backWindshield = new THREE.Mesh(windshieldGeometry, windowMaterial);
    backWindshield.position.set(0, 1.35, -1.5);
    backWindshield.rotation.x = -Math.PI / 2.5;
    car.add(backWindshield);
    
    return car;
  }
  
  setupControls() {
    // Keyboard controls
    document.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'ArrowUp':
        case 'w':
          this.keys.forward = true;
          this.wind.loop = true;
          this.wind.muted = true;
          this.wind.play();
          this.wind.muted = false; // Unmute after playing starts
          this.engine.loop = true;
          this.engine.muted = true;
          this.engine.play();
          this.engine.muted = false; // Unmute after playing starts
          break;
        case 'ArrowDown':
        case 's':
          this.keys.backward = true;
          this.brake.play().then(() => {
            setTimeout(() => {
              this.brake.pause();
            }, 2000);  // Add a time in milliseconds
          });
          break;
        case 'ArrowLeft':
        case 'a':
          this.keys.left = true;
          break;
        case 'ArrowRight':
        case 'd':
          this.keys.right = true;
          break;
      }
    });
    
    document.addEventListener('keyup', (event) => {
      switch (event.key) {
        case 'ArrowUp':
        case 'w':
          this.keys.forward = false;
          this.engine.pause();
          break;
        case 'ArrowDown':
        case 's':
          this.keys.backward = false;
          break;
        case 'ArrowLeft':
        case 'a':
          this.keys.left = false;
          break;
        case 'ArrowRight':
        case 'd':
          this.keys.right = false;
          break;
      }
    });
  }
  
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  updateCarPosition() {
    // Handle acceleration and deceleration
    if (this.keys.forward) {
      this.carSpeed += this.acceleration;
      if (this.carSpeed > this.maxSpeed) {
        this.carSpeed = this.maxSpeed;
      }
    } else if (this.keys.backward) {
      this.carSpeed -= this.acceleration;
      if (this.carSpeed < -this.maxSpeed / 2) {
        this.carSpeed = -this.maxSpeed / 2;
      }
    } else {
      // Decelerate when no keys are pressed
      if (this.carSpeed > 0) {
        this.carSpeed -= this.deceleration;
        if (this.carSpeed < 0) this.carSpeed = 0;
      } else if (this.carSpeed < 0) {
        this.carSpeed += this.deceleration;
        if (this.carSpeed > 0) this.carSpeed = 0;
      }
    }
    
    // Rotate car based on input
    if (this.keys.left) {
      this.car.rotation.y += this.turnSpeed;
    }
    if (this.keys.right) {
      this.car.rotation.y -= this.turnSpeed;
    }
    
    // Move car forward based on its rotation
    const moveX = Math.sin(this.car.rotation.y) * this.carSpeed;
    const moveZ = Math.cos(this.car.rotation.y) * this.carSpeed;
    this.car.position.x += moveX;
    this.car.position.z += moveZ;
    
    // Update camera position to follow the car
    this.camera.position.x = this.car.position.x + Math.sin(this.car.rotation.y) * -10;
    this.camera.position.z = this.car.position.z + Math.cos(this.car.rotation.y) * -10;
    this.camera.position.y = this.car.position.y + 5;
    this.camera.lookAt(this.car.position);
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    
    this.updateCarPosition();
    this.updateRoadPosition(); // Add this line
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize the simulation when the page loads
window.onload = () => {
  new DrivingSimulation();
};