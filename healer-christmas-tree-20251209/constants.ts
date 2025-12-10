import * as THREE from 'three';

export const COLORS = {
  bg: '#021a12', // Deep Emerald/Black
  needleLight: '#0f4d2a',
  needleDark: '#032614',
  gold: '#ffcc00',
  goldHot: '#fff5aa',
};

export const CONFIG = {
  particleCount: 4000, // Increased from 2500 for a denser look
  scatterRadius: 25,   // Increased from 15 to match scale
  treeHeight: 14,      // Increased from 8 to make it taller
  treeBaseRadius: 6.5, // Increased from 3.5 to make it wider
  lerpSpeed: 0.08,     // Speed of transition
};

export const TEXTURE_URL = "https://assets.codepen.io/127738/dotTexture.png";