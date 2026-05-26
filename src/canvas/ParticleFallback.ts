import * as THREE from 'three';

export class ParticleFallback {
  private renderer: THREE.WebGLRenderer;
  private scene    = new THREE.Scene();
  private camera   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private points!: THREE.Points;
  private raf = 0;
  private N = 50_000;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const pos = new Float32Array(this.N * 3);
    for (let i = 0; i < this.N; i++) {
      pos[i*3]   = (Math.random()-0.5)*2;
      pos[i*3+1] = (Math.random()-0.5)*2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xb4befe, size: 0.003, transparent: true, opacity: 0.7 }));
    this.scene.add(this.points);
    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });
    this.frame();
  }

  private resize() { this.renderer.setSize(window.innerWidth, window.innerHeight); }

  private frame() {
    this.raf = requestAnimationFrame(() => this.frame());
    this.points.rotation.z += 0.00005;
    this.renderer.render(this.scene, this.camera);
  }

  destroy() { cancelAnimationFrame(this.raf); this.renderer.dispose(); }
}
