import * as THREE from 'three';

export abstract class ProjectPreview {
  protected renderer: THREE.WebGLRenderer;
  protected scene  = new THREE.Scene();
  protected camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  private raf = 0;

  constructor(protected canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth || 220, canvas.clientHeight || 120);
    this.camera.position.z = 3;
    this.build();
    this.frame();
  }

  protected abstract build(): void;
  protected abstract tick(t: number): void;

  private frame() {
    this.raf = requestAnimationFrame(() => this.frame());
    this.tick(performance.now() / 1000);
    this.renderer.render(this.scene, this.camera);
  }

  destroy() { cancelAnimationFrame(this.raf); this.renderer.dispose(); }
}
