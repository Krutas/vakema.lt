// "The Assembly" – one master timeline with named beats.
// Tune timings here; every beat starts at the label time.
import * as THREE from 'three';
import gsap from 'gsap';

export const BEATS = {
  speed: 0.0,     // logo speed lines streak to the figure
  wire: 0.9,      // gold grid + wireframe draw outward
  structure: 2.7, // walls solidify, frames extrude, sashes lock
  glass: 4.0,     // glass slides in, sunset appears
  light: 5.3,     // studio lights, sweep, V mark
  ui: 6.9,        // navigation + copy reveal
};

export function createIntro(world, rig, overview, { onUiReveal }) {
  const { mats, products, lights, scene } = world;
  const tl = gsap.timeline({ paused: true });
  const B = BEATS;

  // Initial states
  for (const p of products) {
    p.root.visible = false;
    p.body.scale.z = 0.02;
    p.sashes.forEach((s) => (s.obj[s.key] = s.from));
    p.glass.forEach((g, i) => {
      g.userData.x0 = g.position.x;
      g.position.x += (i % 2 ? 1 : -1) * 0.35;
    });
  }
  world.vMark.group.scale.setScalar(0.001);
  world.vMark.rules.forEach((r) => (r.scale.x = 0.001));

  // Camera: one smooth crane path from overhead to the resting view
  const posCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 13, 2.2),
    new THREE.Vector3(4.8, 6.0, 6.8),
    new THREE.Vector3(-3.2, 2.9, 7.6),
    new THREE.Vector3(1.2, 2.0, 8.0),
    overview.pos.clone(),
  ], false, 'centripetal');
  const tgtCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, -0.6),
    new THREE.Vector3(0, 0.9, -1.8),
    new THREE.Vector3(0, 1.3, -1.8),
    new THREE.Vector3(-0.3, 1.5, -1.6),
    overview.tgt.clone(),
  ], false, 'centripetal');
  const path = { u: 0 };
  const applyPath = () => {
    posCurve.getPointAt(path.u, rig.pos);
    tgtCurve.getPointAt(path.u, rig.tgt);
  };
  applyPath();
  tl.to(path, { u: 1, duration: 7.6, ease: 'power1.inOut', onUpdate: applyPath }, 0.2);

  // 1 · Speed lines
  world.speedLines.forEach((l) => {
    const at = B.speed + 0.05 + Math.random() * 0.5;
    const dur = 0.9 + Math.random() * 0.35;
    tl.fromTo(l.position, { x: -26 - Math.random() * 10 }, { x: l.userData.endX, duration: dur, ease: 'power3.out' }, at);
    tl.fromTo(l.scale, { x: 9 + Math.random() * 6 }, { x: 0.3, duration: dur, ease: 'power3.out' }, at);
    tl.to(l.material, { opacity: 0, duration: 0.35 }, at + dur - 0.2);
  });
  tl.to(world.floorLine.scale, { x: 5, duration: 0.6, ease: 'expo.out' }, B.speed + 0.85);
  tl.to(world.floorLine.material, { opacity: 0, duration: 0.6 }, B.wire + 0.7);

  // 2 · Grid + wireframe
  const fu = world.floorUniforms;
  tl.to(fu.uReveal, { value: 24, duration: 2.6, ease: 'power2.in' }, B.wire);
  tl.to(fu.uRing, { value: 0, duration: 0.6 }, B.structure + 0.3);
  const total = world.wire.geometry.attributes.position.count;
  tl.to(world.wire.geometry.drawRange, { count: total, duration: 2.0, ease: 'power1.inOut', snap: { count: 2 } }, B.wire + 0.2);

  // 3 · Structure
  tl.to(mats.wall, { opacity: 1, duration: 1.2, ease: 'power1.inOut' }, B.structure);
  tl.to(mats.wire, { opacity: 0.35, duration: 0.8 }, B.structure + 0.5);
  products.forEach((p, i) => {
    tl.set(p.root, { visible: true }, B.structure);
    tl.to(p.body.scale, { z: 1, duration: 0.7, ease: 'power3.out' }, B.structure + i * 0.12);
    p.sashes.forEach((s, j) => {
      tl.to(s.obj, { [s.key]: s.closed, duration: 0.95, ease: 'back.out(2.2)' }, B.structure + 0.4 + i * 0.1 + j * 0.08);
    });
  });
  tl.to(mats.figure, { opacity: 1, duration: 1.0 }, B.structure + 0.3);
  tl.to(world.figureShadow.material, { opacity: 1, duration: 1.0 }, B.structure + 0.3);

  // 4 · Glass + sunset
  tl.to(world.sky.material.uniforms.uIntensity, { value: 1, duration: 1.8, ease: 'power1.inOut' }, B.glass - 0.2);
  tl.to(lights.sun, { intensity: 1.6, duration: 2.0 }, B.glass);
  tl.to(mats.glass, { opacity: 0.13, duration: 1.2 }, B.glass + 0.1);
  products.forEach((p, i) => p.glass.forEach((g, j) => {
    tl.to(g.position, { x: g.userData.x0, duration: 1.1, ease: 'power3.out' }, B.glass + 0.1 + i * 0.06 + j * 0.03);
  }));
  tl.to(scene, { environmentIntensity: 1, duration: 1.8 }, B.glass + 0.4);

  // 5 · Lights
  tl.to(mats.ceiling, { opacity: 1, duration: 0.8 }, B.light - 0.3);
  world.strips.forEach((s, i) => {
    const c = s.material.color;
    const on = (v, d) => ({ r: v, g: v, b: v * 0.97, duration: d });
    tl.to(c, { keyframes: [on(2.2, 0.05), on(0.2, 0.06), on(2.2, 0.05), on(0.6, 0.08), on(2.2, 0.25)] }, B.light + i * 0.15);
  });
  tl.to(lights.hemi, { intensity: 0.35, duration: 1.0 }, B.light + 0.2);
  tl.to(lights.fill, { intensity: 0.35, duration: 1.0 }, B.light + 0.2);
  tl.to(lights.key, { intensity: 16, duration: 0.6 }, B.light + 0.3);
  products.forEach((p, i) => tl.to(p.spot, { intensity: p.spotBase, duration: 0.5 }, B.light + 0.4 + i * 0.08));
  tl.to(lights.sweep.position, { x: 8, duration: 1.6, ease: 'power1.inOut' }, B.light + 0.5);
  tl.to(lights.sweep, { keyframes: [{ intensity: 60, duration: 0.4 }, { intensity: 60, duration: 0.8 }, { intensity: 0, duration: 0.4 }] }, B.light + 0.5);
  tl.to(world.vMark.group.scale, { x: 1, y: 1, z: 1, duration: 1.2, ease: 'expo.out' }, B.light + 0.7);
  tl.fromTo(world.vMark.group.rotation, { y: -1.2 }, { y: 0, duration: 1.4, ease: 'expo.out' }, B.light + 0.7);
  world.vMark.rules.forEach((r) => tl.to(r.scale, { x: 1, duration: 0.9, ease: 'expo.out' }, B.light + 1.1));
  tl.to(mats.wire, { opacity: 0, duration: 1.0 }, B.light + 0.6);
  tl.to(fu.uGrid, { value: 0.12, duration: 1.0 }, B.light + 0.6);

  // 6 · UI
  tl.call(onUiReveal, null, B.ui);

  return tl;
}
