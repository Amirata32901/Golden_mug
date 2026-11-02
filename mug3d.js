import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

(() => {
  const host = document.getElementById("mug3d-viewer");
  if (!host) return;
  const counter = document.getElementById("mug3d-counter");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 1.7, 5.8);
  camera.lookAt(0, 0.65, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  host.insertBefore(renderer.domElement, host.firstChild);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x29143d, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 3.5);
  key.position.set(3, 5, 5);
  scene.add(key);
  const glow = new THREE.PointLight(0x9b4dff, 20, 12);
  glow.position.set(-3, 2, -2);
  scene.add(glow);
  const gold = new THREE.PointLight(0xffc928, 13, 10);
  gold.position.set(3, 3, 3);
  scene.add(gold);

  const colors = [0x7136a8,0x17151c,0xf0e4d2,0x8d244e,0x176b70,0xe1a52d,0x31558e,0xc65b32,0x5b7b48,0xd7b7d9,0x30343b,0xe7c7a5,0x6f294f,0x368b9b,0x9a754b,0x8b91c9,0x47704d,0xb84242,0xddd9cf,0x542c83];
  const goldMat = new THREE.MeshStandardMaterial({color:0xffd15a,metalness:.7,roughness:.25});

  function makeCup(i) {
    const group = new THREE.Group();
    const radius = .66 + (i % 4) * .035;
    const height = 1.25 + (i % 5) * .055;
    const ceramic = new THREE.MeshPhysicalMaterial({
      color: colors[i], roughness: .2, metalness: .06,
      clearcoat: .95, clearcoatRoughness: .12
    });
    const shape = [
      new THREE.Vector2(0,.06), new THREE.Vector2(radius*.68,.06),
      new THREE.Vector2(radius*.83,.13), new THREE.Vector2(radius*.88,.23),
      new THREE.Vector2(radius,height-.13), new THREE.Vector2(radius,height-.035),
      new THREE.Vector2(radius*.94,height), new THREE.Vector2(radius*.82,height),
      new THREE.Vector2(radius*.8,height-.1), new THREE.Vector2(radius*.72,.28),
      new THREE.Vector2(radius*.62,.22), new THREE.Vector2(0,.22)
    ];
    group.add(new THREE.Mesh(new THREE.LatheGeometry(shape,80),ceramic));

    // These are handle-free cup designs.
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius*.96,.024,10,72),goldMat);
    rim.rotation.x = Math.PI/2;
    rim.position.y = height-.01;
    group.add(rim);

    const patternMaterial = i%2 ? goldMat : new THREE.MeshStandardMaterial({color:0xfff0dc,roughness:.3});
    if (i%4===0) {
      const badge = new THREE.Mesh(new THREE.CircleGeometry(.19,40),patternMaterial);
      badge.position.set(0,height*.56,radius+.012);
      group.add(badge);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.13,.012,8,48),goldMat);
      ring.position.set(0,height*.56,radius+.02);
      group.add(ring);
    } else if (i%4===1) {
      for(let n=-1;n<=1;n++){
        const dot = new THREE.Mesh(new THREE.CircleGeometry(.07,24),patternMaterial);
        dot.position.set(n*.2,height*.56+(n%2)*.12,radius+.012);
        group.add(dot);
      }
    } else if (i%4===2) {
      for(let n=0;n<4;n++){
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(radius*1.5,.025,.012),patternMaterial);
        stripe.position.set(0,height*(.32+n*.13),radius+.012);
        group.add(stripe);
      }
    } else {
      const flower = new THREE.Group();
      for(let n=0;n<6;n++){
        const petal = new THREE.Mesh(new THREE.CircleGeometry(.065,20),patternMaterial);
        const angle=n*Math.PI/3;
        petal.position.set(Math.cos(angle)*.1,Math.sin(angle)*.1,0);
        flower.add(petal);
      }
      flower.position.set(0,height*.56,radius+.014);
      group.add(flower);
    }
    return group;
  }

  const cups = Array.from({length:20},(_,i)=>makeCup(i));
  cups.forEach((cup,i)=>{ cup.visible=i===0; scene.add(cup); });
  let current=0, previous=-1, switchAt=performance.now()+3200;
  let transitionAt=performance.now(), dragging=false, lastX=0, lastY=0;

  function switchCup() {
    previous=current;
    current=(current+1)%cups.length;
    cups[current].visible=true;
    cups[current].scale.setScalar(.01);
    transitionAt=performance.now();
    switchAt=transitionAt+3400;
    if(counter) counter.textContent="مدل "+String(current+1).padStart(2,"0")+" از ۲۰";
  }
  if(counter) counter.textContent="مدل ۰۱ از ۲۰";

  renderer.domElement.addEventListener("pointerdown",e=>{
    const rect=renderer.domElement.getBoundingClientRect();
    const x=((e.clientX-rect.left)/rect.width)*2-1;
    const y=-((e.clientY-rect.top)/rect.height)*2+1;
    const ray=new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(x,y),camera);
    if(ray.intersectObject(cups[current],true).length){
      dragging=true;lastX=e.clientX;lastY=e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    }
  });
  renderer.domElement.addEventListener("pointermove",e=>{
    if(!dragging)return;
    cups[current].rotation.y+=(e.clientX-lastX)*.009;
    cups[current].rotation.x=Math.max(-.18,Math.min(.18,cups[current].rotation.x+(e.clientY-lastY)*.004));
    lastX=e.clientX;lastY=e.clientY;
  });
  const stop=()=>{dragging=false;};
  renderer.domElement.addEventListener("pointerup",stop);
  renderer.domElement.addEventListener("pointercancel",stop);
  renderer.domElement.addEventListener("lostpointercapture",stop);

  function resize(){
    const w=Math.max(1,host.clientWidth), h=Math.max(1,host.clientHeight);
    camera.aspect=w/h;
    camera.position.z=w<600?6.8:5.8;
    camera.updateProjectionMatrix();
    renderer.setSize(w,h,false);
  }
  new ResizeObserver(resize).observe(host);
  resize();

  let frame=0, visible=true;
  function animate(now){
    if(!visible)return;
    frame=requestAnimationFrame(animate);
    if(!dragging && now>=switchAt) switchCup();
    const p=Math.min(1,(now-transitionAt)/500);
    const ease=1-Math.pow(1-p,3);
    cups[current].scale.setScalar(ease);
    if(previous>=0 && previous!==current){
      cups[previous].scale.setScalar(Math.max(.001,1-ease));
      if(p>=1){cups[previous].visible=false;previous=-1;}
    }
    if(!dragging)cups[current].rotation.y+=.004;
    cups[current].position.y=Math.sin(now*.0015)*.035;
    renderer.render(scene,camera);
  }
  animate(performance.now());
  document.addEventListener("visibilitychange",()=>{
    visible=!document.hidden;
    if(!visible)cancelAnimationFrame(frame);
    else {switchAt=performance.now()+2600;animate(performance.now());}
  });
})();