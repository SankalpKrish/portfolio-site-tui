import * as THREE from 'three';
import { ProjectPreview } from './ProjectPreview';

export class ClockPreview extends ProjectPreview {
  private hands: THREE.Mesh[] = [];

  protected build() {
    const positions: [number, number][] = [
      [0,0],[-1.2,0.8],[1.2,0.8],[-1.2,-0.8],[1.2,-0.8],[0,1.4],[0,-1.4],
    ];
    positions.forEach(([x, y]) => {
      this.scene.add(Object.assign(
        new THREE.Mesh(new THREE.CircleGeometry(0.4,32), new THREE.MeshBasicMaterial({ color: 0x313244 })),
        { position: new THREE.Vector3(x, y, 0) }
      ));
      const hand = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.28, 0.01),
        new THREE.MeshBasicMaterial({ color: 0xb4befe }),
      );
      hand.position.set(x, y, 0.01);
      this.scene.add(hand);
      this.hands.push(hand);
    });
  }

  protected tick(t: number) {
    this.hands.forEach((h, i) => { h.rotation.z = -t * (0.5 + i * 0.3); });
  }
}
