import * as THREE from 'three';

export enum AppState {
  SCATTERED = 'SCATTERED',
  TREE_SHAPE = 'TREE_SHAPE',
  TEXT_SHAPE = 'TEXT_SHAPE',
}

export interface ParticleData {
  id: number;
  scatterPosition: THREE.Vector3;
  treePosition: THREE.Vector3;
  textPosition: THREE.Vector3; // Position for "WYX" text
  currentPosition: THREE.Vector3; // Track current position for smooth multi-state lerping
  color: THREE.Color;
  scale: number;
  rotationSpeed: THREE.Vector3;
  type: 'needle' | 'ornament';
}

export interface GestureControlProps {
  onStateChange: (state: AppState) => void;
  currentState: AppState;
}