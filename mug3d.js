import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

(() => {
  const host = document.getElementById("mug3d-viewer");
  if (!host) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 2.05, 9.7);
  camera.lookAt(0, 0.72, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  host.insertBefore(renderer.domElement, host.firstChild);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x261238, 2.1));
  const key = new THREE.DirectionalLight(0xffffff, 3.1);
  key.position.set(2, 5, 6);
  scene.add(key);
  const purple = new THREE.PointLight(0x9b4dff, 24, 14);
  purple.position.set(-3, 2, -2);
  scene.add(purple);
  const gold = new THREE.PointLight(0xffc928, 15, 12);
  gold.position.set(3, 3, 4);
  scene.add(gold);

  const goldMat = new THREE.MeshStandardMaterial({color:0xffcc45,metalness:.72,roughness:.24});
  const creamMat = new THREE.MeshStandardMaterial({color:0xffe9ce,roughness:.3});
  const darkMat = new THREE.MeshStandardMaterial({color:0x291638,roughness:.32});

  function addStar(group, x, y, z, size, material) {
    const shape = new THREE.Shape();
    for (let i=0;i<10;i++) {
      const angle = Math.PI/2 + i*Math.PI/5;
      const radius = i%2===0 ? size : size*.43;
      const px=Math.cos(angle)*radius, py=Math.sin(angle)*radius;
      if(i===0) shape.moveTo(px,py); else shape.lineTo(px,py);
    }
    shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape),material);
    mesh.position.set(x,y,z);
    group.add(mesh);
  }

  function makeMug(options) {
    const group = new THREE.Group();
    const w=options.width, h=options.height;
    const ceramic = new THREE.MeshPhysicalMaterial({
      color:options.color,metalness:.08,roughness:.2,
      clearcoat:.95,clearcoatRoughness:.12
    });
    const profile=[
      new THREE.Vector2(0,.07),
      new THREE.Vector2(w*.68,.07),
      new THREE.Vector2(w*.82,.14),
      new THREE.Vector2(w*.87,.25),
      new THREE.Vector2(w,h-.16),
      new THREE.Vector2(w,h-.045),
      new THREE.Vector2(w*.94,h),
      new THREE.Vector2(w*.84,h),
      new THREE.Vector2(w*.82,h-.11),
      new THREE.Vector2(w*.74,.29),
      new THREE.Vector2(w*.64,.24),
      new THREE.Vector2(0,.24)
    ];
    const body=new THREE.Mesh(new THREE.LatheGeometry(profile,80),ceramic);
    body.castShadow=true;
    group.add(body);

    // The handle faces the viewer: the torus stays in the XY plane.
    const handle=new THREE.Mesh(
      new THREE.TorusGeometry(options.handle,.085,16,64,Math.PI*1.88),
      ceramic
    );
    handle.position.set(w*.94,h*.53,0);
    group.add(handle);

    const rim=new THREE.Mesh(new THREE.TorusGeometry(w*.965,.025,10,72),goldMat);
    rim.rotation.x=Math.PI/2;
    rim.position.y=h-.012;
    group.add(rim);

    // Different decorative patterns on each mug.
    if(options.pattern===0){
      const medallion=new THREE.Mesh(new THREE.CircleGeometry(.19,48),goldMat);
      medallion.position.set(0,h*.57,w+.012);
      group.add(medallion);
      addStar(group,0,h*.57,w+.022,.12,darkMat);
      addStar(group,-.28,h*.78,w+.012,.055,goldMat);
      addStar(group,.29,h*.35,w+.012,.055,goldMat);
    } else if(options.pattern===1){
      for(let k=-1;k<=1;k++){
        const stripe=new THREE.Mesh(new THREE.TorusGeometry(w*.86,.018,8,64),goldMat);
        stripe.rotation.x=Math.PI/2;
        stripe.position.set(0,h*.52+k*.19,w*.42);
        group.add(stripe);
      }
      addStar(group,0,h*.62,w+.012,.14,goldMat);
    } else if(options.pattern===2){
      const flower=new THREE.Group();
      for(let k=0;k<6;k++){
        const petal=new THREE.Mesh(new THREE.CircleGeometry(.07,24),goldMat);
        const a=k*Math.PI/3;
        petal.position.set(Math.cos(a)*.105,Math.sin(a)*.105,0);
        flower.add(petal);
      }
      const center=new THREE.Mesh(new THREE.CircleGeometry(.055,24),darkMat);
      center.position.z=.006;
      flower.add(center);
      flower.position.set(0,h*.58,w+.015);
      group.add(flower);
      addStar(group,-.28,h*.35,w+.012,.05,goldMat);
      addStar(group,.28,h*.78,w+.012,.05,goldMat);
    } else {
      const badge=new THREE.Mesh(new THREE.CircleGeometry(.18,48),creamMat);
      badge.position.set(0,h*.58,w+.012);
      group.add(badge);
      const inner=new THREE.Mesh(new THREE.TorusGeometry(.12,.012,8,48),goldMat);
      inner.position.set(0,h*.58,w+.02);
      group.add(inner);
      addStar(group,0,h*.58,w+.03,.075,darkMat);
    }

    group.scale.setScalar(options.scale);
    return group;
  }

  const mugs=[
    makeMug({color:0x7136a8,width:.69,height:1.38,handle:.37,scale:.84,pattern:0}),
    makeMug({color:0x19171e,width:.73,height:1.30,handle:.36,scale:.84,pattern:1}),
    makeMug({color:0xf0dfc9,width:.76,height:1.22,handle:.34,scale:.84,pattern:2}),
    makeMug({color:0x8d244e,width:.68,height:1.45,handle:.39,scale:.80,pattern:3})
  ];
  const desktopX=[-3.25,-1.08,1.08,3.25];
  const desktopY=-.55;
  mugs.forEach((mug,i)=>{
    mug.position.set(desktopX[i],desktopY,0);
    mug.rotation.y=-.12;
    scene.add(mug);
  });

  let activeMug=null, dragging=false, lastX=0, lastY=0;
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();

  function chooseMug(event) {
    const rect=renderer.domElement.getBoundingClientRect();
    pointer.x=((event.clientX-rect.left)/rect.width)*2-1;
    pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;
    raycaster.setFromCamera(pointer,camera);
    const hits=raycaster.intersectObjects(mugs,true);
    if(!hits.length) return null;
    let object=hits[0].object;
    while(object.parent && !mugs.includes(object)) object=object.parent;
    return mugs.includes(object)?object:null;
  }

  renderer.domElement.addEventListener("pointerdown",event=>{
    activeMug=chooseMug(event);
    if(!activeMug) return;
    dragging=true;lastX=event.clientX;lastY=event.clientY;
    renderer.domElement.setPointerCapture(event.pointerId);
  });
  renderer.domElement.addEventListener("pointermove",event=>{
    if(!dragging||!activeMug) return;
    activeMug.rotation.y+=(event.clientX-lastX)*.009;
    activeMug.rotation.x=Math.max(-.18,Math.min(.18,
      activeMug.rotation.x+(event.clientY-lastY)*.004));
    lastX=event.clientX;lastY=event.clientY;
  });
  const stop=()=>{dragging=false;activeMug=null;};
  renderer.domElement.addEventListener("pointerup",stop);
  renderer.domElement.addEventListener("pointercancel",stop);
  renderer.domElement.addEventListener("lostpointercapture",stop);

  function resize(){
    const width=Math.max(1,host.clientWidth);
    const height=Math.max(1,host.clientHeight);
    const mobile=width<650;
    camera.aspect=width/height;
    if(mobile){
      camera.position.set(0,2.05,8.8);
      camera.lookAt(0,.8,0);
      const spots=[[-1.22,.45],[1.22,.45],[-1.22,-1.12],[1.22,-1.12]];
      mugs.forEach((mug,i)=>{
        mug.position.set(spots[i][0],spots[i][1],0);
        mug.scale.setScalar(.66);
      });
    }else{
      camera.position.set(0,2.05,9.7);
      camera.lookAt(0,.72,0);
      mugs.forEach((mug,i)=>{
        mug.position.set(desktopX[i],desktopY,0);
        mug.scale.setScalar([.84,.84,.84,.80][i]);
      });
    }
    camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);
  }
  const observer=new ResizeObserver(resize);
  observer.observe(host);
  resize();

  let frame=0,visible=true;
  function animate(){
    if(!visible)return;
    frame=requestAnimationFrame(animate);
    const t=performance.now()*.001;
    mugs.forEach((mug,i)=>{
      if(mug!==activeMug){
        mug.rotation.y+=.0022+i*.00025;
        mug.position.y+=(Math.sin(t*1.15+i*.8)*.035+mug.position.y)*0.0;
      }
    });
    renderer.render(scene,camera);
  }
  animate();
  document.addEventListener("visibilitychange",()=>{
    visible=!document.hidden;
    if(!visible)cancelAnimationFrame(frame);else animate();
  });
})();