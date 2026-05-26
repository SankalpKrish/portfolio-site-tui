import * as THREE from 'three';
import { ProjectPreview } from './ProjectPreview';

export class NodeGraphPreview extends ProjectPreview {
  private nodes: THREE.Mesh[] = [];
  private edges: THREE.Line[] = [];

  protected build() {
    const pos = Array.from({ length: 8 }, () =>
      new THREE.Vector3((Math.random()-0.5)*4, (Math.random()-0.5)*3, 0)
    );
    pos.forEach(p => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xcba6f7 }),
      );
      m.position.copy(p);
      this.scene.add(m);
      this.nodes.push(m);
    });
    pos.forEach((p, i) => {
      const geo = new THREE.BufferGeometry().setFromPoints([p, pos[(i+1)%pos.length]]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x89b4fa, transparent: true, opacity: 0.4 }));
      this.scene.add(line);
      this.edges.push(line);
    });
  }

  protected tick(t: number) {
    this.nodes.forEach((n, i) => { n.position.y += Math.sin(t + i) * 0.002; });
    this.edges.forEach((e, i) => {
      (e.material as THREE.LineBasicMaterial).opacity = 0.2 + Math.abs(Math.sin(t*0.8+i))*0.5;
    });
  }
}
