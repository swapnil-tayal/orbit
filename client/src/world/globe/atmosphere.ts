import { AdditiveBlending, BackSide, Color, FrontSide, Mesh, ShaderMaterial, SphereGeometry } from "three";
import { COLORS, R } from "./constants.ts";

const haloVertex = `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const haloFragment = `
uniform vec3 cyan;
uniform vec3 pink;
uniform float opacity;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float i = pow(max(0.0, 0.65 - dot(vNormal, vView)), 2.5);
  vec3 col = mix(pink, cyan, smoothstep(0.3, 0.95, i));
  gl_FragColor = vec4(col * i * 1.6, i * opacity);
}
`;

const rimFragment = `
uniform vec3 cyan;
uniform float opacity;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float f = pow(1.0 - max(dot(vNormal, vView), 0.0), 3.5);
  gl_FragColor = vec4(cyan * f, f * opacity);
}
`;

export function createHalo(): Mesh<SphereGeometry, ShaderMaterial> {
  const mat = new ShaderMaterial({
    vertexShader: haloVertex,
    fragmentShader: haloFragment,
    uniforms: { cyan: { value: new Color(COLORS.cyan) }, pink: { value: new Color(COLORS.pink) }, opacity: { value: 1 } },
    side: BackSide,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  return new Mesh(new SphereGeometry(R * 1.03, 96, 48), mat);
}

export function createRim(): Mesh<SphereGeometry, ShaderMaterial> {
  const mat = new ShaderMaterial({
    vertexShader: haloVertex,
    fragmentShader: rimFragment,
    uniforms: { cyan: { value: new Color(COLORS.cyan) }, opacity: { value: 0.85 } },
    side: FrontSide,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  return new Mesh(new SphereGeometry(R * 1.004, 192, 96), mat);
}
