import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

(() => {
  const host = document.getElementById("mug3d-viewer");
  if (!host) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 2.35, 9.4);
  camera.lookAt(0, 0.55, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  host.insertBefore(renderer.domElement, host.firstChild);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x241033, 2.0));
  const key = new THREE.DirectionalLight(0xffffff, 3.2);
  key.position.set(3, 5, 5);
  scene.add(key);
  const purpleLight = new THREE.PointLight(0x9b4dff, 20, 12);
  purpleLight.position.set(-3, 2, -2);
  scene.add(purpleLight);
  const goldLight = new THREE.PointLight(0xffc928, 14, 12);
  goldLight.position.set(3, 3, 3);
  scene.add(goldLight);

  function makeMug(bodyColor, trimColor, scale, style) {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: bodyColor, metalness: 0.12, roughness: 0.2,
      clearcoat: 0.95, clearcoatRoughness: 0.13
    });
    const trim = new THREE.MeshStandardMaterial({
      color: trimColor, metalness: 0.78, roughness: 0.2
    });

    const width = style === 1 ? 0.78 : (style === 2 ? 0.88 : 0.72);
    const height = style === 2 ? 1.22 : (style === 3 ? 1.48 : 1.38);
    const profile = [
      new THREE.Vector2(0, 0.08),
      new THREE.Vector2(width * 0.68, 0.08),
      new THREE.Vector2(width * 0.79, 0.15),
      new THREE.Vector2(width * 0.84, 0.25),
      new THREE.Vector2(width, height - 0.16),
      new THREE.Vector2(width, height - 0.05),
      new THREE.Vector2(width * 0.96, height),
      new THREE.Vector2(width * 0.84, height),
      new THREE.Vector2(width * 0.82, height - 0.10),
      new THREE.Vector2(width * 0.75, 0.30),
      new THREE.Vector2(width * 0.66, 0.25),
      new THREE.Vector2(0, 0.25)
    ];
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 72), bodyMaterial);
    group.add(body);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(width * 0.96, 0.025, 10, 64), trim
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = height - 0.005;
    group.add(rim);

    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(height * 0.29, 0.085, 14, 56, Math.PI * 1.9),
      bodyMaterial
    );
    handle.rotation.y = Math.PI / 2;
    handle.position.set(width * 0.98, height * 0.53, 0);
    group.add(handle);

    const badge = new THREE.Mesh(
      new THREE.CircleGeometry(0.15, 40),
      new THREE.MeshStandardMaterial({ color: trimColor, metalness: 0.55, roughness: 0.28 })
    );
    badge.position.set(0, height * 0.58, width * 1.002);
    group.add(badge);

    const badgeRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.105, 0.012, 8, 40),
      new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.35 })
    );
    badgeRing.position.set(0, height * 0.58, width * 1.012);
    group.add(badgeRing);

    group.scale.setScalar(scale);
    return group;
  }

  const mugs = [
    makeMug(0x7136a8, 0xffcc38, 0.78, 0),
    makeMug(0x17151c, 0xffcc38, 0.78, 1),
    makeMug(0xf0e6d5, 0x8b4bd1, 0.78, 2),
    makeMug(0x8d244e, 0xffd35b, 0.73, 3)
  ];
  const positions = [-3.05, -1.02, 1.02, 3.05];
  mugs.forEach((mug, index) => {
    mug.position.set(positions[index], -0.62, 0);
    mug.rotation.y = -0.35 + index * 0.17;
    scene.add(mug);
  });

  let activeMug = null;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let pointerStartX = 0;

  renderer.domElement.addEventListener("pointerdown", event => {
    const rect = renderer.domElement.getBoundingClientRect();
    const normalizedX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const index = Math.max(0, Math.min(3, Math.floor((normalizedX + 1) * 2)));
    activeMug = mugs[index];
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    pointerStartX = event.clientX;
    renderer.domElement.setPointerCapture(event.pointerId);
  });

  renderer.domElement.addEventListener("pointermove", event => {
    if (!dragging || !activeMug) return;
    activeMug.rotation.y += (event.clientX - lastX) * 0.009;
    activeMug.rotation.x = Math.max(-0.2, Math.min(0.2,
      activeMug.rotation.x + (event.clientY - lastY) * 0.004));
    lastX = event.clientX;
    lastY = event.clientY;
  });

  const stopDrag = () => { dragging = false; activeMug = null; };
  renderer.domElement.addEventListener("pointerup", stopDrag);
  renderer.domElement.addEventListener("pointercancel", stopDrag);
  renderer.domElement.addEventListener("lostpointercapture", stopDrag);

  function resize() {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  let frame = 0;
  let visible = true;
  function animate() {
    if (!visible) return;
    frame = requestAnimationFrame(animate);
    const t = performance.now() * 0.001;
    mugs.forEach((mug, index) => {
      if (mug !== activeMug) {
        mug.rotation.y += 0.003 + index * 0.00035;
        mug.position.y = -0.62 + Math.sin(t * 1.25 + index) * 0.045;
      }
    });
    renderer.render(scene, camera);
  }
  animate();

  document.addEventListener("visibilitychange", () => {
    visible = !document.hidden;
    if (!visible) cancelAnimationFrame(frame);
    else animate();
  });
})();
