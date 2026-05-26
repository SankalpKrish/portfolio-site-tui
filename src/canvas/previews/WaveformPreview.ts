import * as THREE from 'three';
import { ProjectPreview } from './ProjectPreview';

export class WaveformPreview extends ProjectPreview {
  private bars: THREE.Mesh[] = [];

  protected build() {
    for (let i = 0; i < 32; i++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1, 0.08),
        new THREE.MeshBasicMaterial({ color: 0xa6e3a1 }),
      );
      m.position.x = (i - 16) * 0.12;
      this.scene.add(m);
      this.bars.push(m);
    }
  }

  protected tick(t: number) {
    this.bars.forEach((b, i) => {
      b.scale.y = 0.2 + Math.abs(Math.sin(t * 2 + i * 0.4)) * 1.2;
    });
  }
}
