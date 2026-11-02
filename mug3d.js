import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

(() => {
  const host = document.getElementById("mug3d-viewer");
  if (!host) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(3.2, 2.0, 4.8);
  camera.lookAt(0, 0.72, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  host.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x241033, 2.1));
  const key = new THREE.DirectionalLight(0xffffff, 3.0);
  key.position.set(3, 5, 4);
  scene.add(key);
  const purpleLight = new THREE.PointLight(0x9b4dff, 22, 8);
  purpleLight.position.set(-2, 1.2, -1);
  scene.add(purpleLight);
  const goldLight = new THREE.PointLight(0xffc928, 12, 7);
  goldLight.position.set(2, 2, 2);
  scene.add(goldLight);

  const mug = new THREE.Group();
  scene.add(mug);

  const profile = [
    new THREE.Vector2(0.00, 0.08),
    new THREE.Vector2(0.48, 0.08),
    new THREE.Vector2(0.57, 0.12),
    new THREE.Vector2(0.62, 0.22),
    new THREE.Vector2(0.72, 1.22),
    new THREE.Vector2(0.73, 1.34),
    new THREE.Vector2(0.70, 1.40),
    new THREE.Vector2(0.61, 1.40),
    new THREE.Vector2(0.59, 1.32),
    new THREE.Vector2(0.57, 1.20),
    new THREE.Vector2(0.48, 0.28),
    new THREE.Vector2(0.00, 0.28)
  ];
  const bodyGeometry = new THREE.LatheGeometry(profile, 96);
  bodyGeometry.computeVertexNormals();

  const ceramic = new THREE.MeshPhysicalMaterial({
    color: 0x7136a8, metalness: 0.18, roughness: 0.19,
    clearcoat: 0.9, clearcoatRoughness: 0.12
  });
  const body = new THREE.Mesh(bodyGeometry, ceramic);
  body.castShadow = true;
  body.receiveShadow = true;
  mug.add(body);

  const gold = new THREE.MeshStandardMaterial({
    color: 0xffcc38, metalness: 0.82, roughness: 0.22
  });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.665, 0.025, 12, 96), gold);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.395;
  mug.add(rim);

  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.51, 0.018, 10, 80), gold);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.105;
  mug.add(baseRing);

  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.43, 0.105, 18, 72, Math.PI * 1.92),
    ceramic
  );
  handle.rotation.y = Math.PI / 2;
  handle.position.set(0.72, 0.76, 0);
  mug.add(handle);

  // A subtle gold emblem on the front of the cup.
  const emblem = new THREE.Mesh(
    new THREE.CircleGeometry(0.19, 48),
    new THREE.MeshStandardMaterial({ color: 0xffd34e, metalness: 0.55, roughness: 0.3 })
  );
  emblem.position.set(0, 0.82, 0.713);
  mug.add(emblem);
  const emblemInner = new THREE.Mesh(
    new THREE.TorusGeometry(0.125, 0.012, 8, 48),
    new THREE.MeshStandardMaterial({ color: 0x4b1c75, metalness: 0.25, roughness: 0.3 })
  );
  emblemInner.position.set(0, 0.82, 0.722);
  mug.add(emblemInner);

  mug.position.y = -0.72;
  mug.rotation.y = -0.35;

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let spin = 0.0035;

  renderer.domElement.addEventListener("pointerdown", event => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    renderer.domElement.setPointerCapture(event.pointerId);
  });
  renderer.domElement.addEventListener("pointermove", event => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    mug.rotation.y += dx * 0.009;
    mug.rotation.x = Math.max(-0.22, Math.min(0.22, mug.rotation.x + dy * 0.004));
    lastX = event.clientX;
    lastY = event.clientY;
    spin = 0;
  });
  const stopDrag = () => { dragging = false; };
  renderer.domElement.addEventListener("pointerup", stopDrag);
  renderer.domElement.addEventListener("pointercancel", stopDrag);
  renderer.domElement.addEventListener("lostpointercapture", stopDrag);

  const resize = () => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  const clock = new THREE.Clock();
  let frame = 0;
  function animate() {
    frame = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    if (!dragging) {
      mug.rotation.y += spin;
      mug.position.y = -0.72 + Math.sin(t * 1.25) * 0.035;
    }
    renderer.render(scene, camera);
  }
  animate();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(frame);
    else animate();
  });
})();
