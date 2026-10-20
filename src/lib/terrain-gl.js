// GPU terrain for the story map: animated contour lines, haze, a soft fake
// depth of field toward the edges, and film grain, all in one fragment shader.
// Uses the same world <-> screen mapping as the 2D overlay so roads stay put.
// Returns null when WebGL (with derivatives) is unavailable; callers fall back.

const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Simplex noise: Ashima Arts / Stefan Gustavson (MIT).
const FRAGMENT = `
#extension GL_OES_standard_derivatives : enable
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_res;
uniform float u_dpr;
uniform vec2 u_origin;
uniform float u_scale;
uniform vec2 u_cam;
uniform float u_time;
uniform float u_grainTime;
uniform float u_intro;
uniform float u_light;
uniform vec3 u_bg;
uniform vec3 u_line;
uniform vec3 u_haze0;
uniform vec3 u_haze1;
uniform vec3 u_haze2;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float haze(vec2 uv, vec2 center, float radius, float aspect) {
  vec2 d = (uv - center) * vec2(aspect, 1.0);
  return smoothstep(radius, 0.0, length(d));
}

void main() {
  vec2 css = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) / u_dpr;
  vec2 view = u_res / u_dpr;
  vec2 uv = css / view;
  float aspect = view.x / view.y;

  vec2 w = (css - u_origin) / u_scale + u_cam;
  float z = u_time * 0.028;
  float height = snoise(vec3(w * 1.6, z)) * 0.55 + snoise(vec3(w * 4.1 + 7.0, z * 1.6)) * 0.18;

  // Contours every 1/8 of height; every 4th line is a heavier index contour.
  float level = height * 8.0;
  float dist = abs(fract(level + 0.5) - 0.5) / fwidth(level);
  float edge = length((uv - vec2(0.55, 0.47)) * vec2(aspect, 1.0));
  float blur = smoothstep(0.3, 0.95, edge);
  float halfWidth = mix(0.45, 1.3, blur);
  float line = 1.0 - smoothstep(halfWidth, halfWidth + 1.0 + blur * 1.6, dist);
  float index = 1.0 - step(0.5, mod(floor(level + 0.5), 4.0));
  float alpha = (u_light > 0.5 ? 0.11 : 0.08) + clamp(height + 0.5, 0.0, 1.0) * 0.07 + index * 0.07;
  alpha *= mix(1.0, 0.45, blur) * (0.35 + 0.65 * u_intro);

  vec3 color = u_bg;
  if (u_light < 0.5) {
    float t = u_time;
    color += u_haze0 * 0.06 * haze(uv, vec2(0.25 + sin(t * 0.03) * 0.05, 0.3 + cos(t * 0.025) * 0.05), 0.55, aspect);
    color += u_haze1 * 0.05 * haze(uv, vec2(0.8 + sin(t * 0.03 + 2.0) * 0.05, 0.7 + cos(t * 0.025 + 1.0) * 0.05), 0.5, aspect);
    color += u_haze2 * 0.045 * haze(uv, vec2(0.6 + sin(t * 0.03 + 4.0) * 0.05, 0.15 + cos(t * 0.025 + 2.0) * 0.05), 0.4, aspect);
  }
  color = mix(color, u_line, line * alpha);

  float grain = fract(sin(dot(gl_FragCoord.xy + u_grainTime * 97.0, vec2(12.9898, 78.233))) * 43758.5453);
  color += (grain - 0.5) * (u_light > 0.5 ? 0.05 : 0.035);
  gl_FragColor = vec4(color, 1.0);
}
`;

const toVec3 = (rgb) => rgb.split(",").map((part) => Number(part) / 255);

export function createTerrain(canvas) {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: "low-power" });
  if (!gl || !gl.getExtension("OES_standard_derivatives")) return null;

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("terrain shader:", gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  };
  const vertex = compile(gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vertex || !fragment) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  // One triangle that covers the screen.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "a_pos");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = Object.fromEntries(
    ["u_res", "u_dpr", "u_origin", "u_scale", "u_cam", "u_time", "u_grainTime", "u_intro", "u_light", "u_bg", "u_line", "u_haze0", "u_haze1", "u_haze2"].map((name) => [
      name,
      gl.getUniformLocation(program, name),
    ]),
  );
  let dpr = 1;
  let lost = false;
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    lost = true;
  });

  return {
    get lost() {
      return lost;
    },
    resize(width, height, ratio) {
      dpr = ratio;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    render({ origin, scale, camera, time, grainTime, intro, light, colors }) {
      if (lost) return;
      gl.uniform2f(uniforms.u_res, canvas.width, canvas.height);
      gl.uniform1f(uniforms.u_dpr, dpr);
      gl.uniform2f(uniforms.u_origin, origin.x, origin.y);
      gl.uniform1f(uniforms.u_scale, scale);
      gl.uniform2f(uniforms.u_cam, camera.x, camera.y);
      gl.uniform1f(uniforms.u_time, time);
      gl.uniform1f(uniforms.u_grainTime, grainTime);
      gl.uniform1f(uniforms.u_intro, intro);
      gl.uniform1f(uniforms.u_light, light ? 1 : 0);
      gl.uniform3fv(uniforms.u_bg, toVec3(colors.bg));
      gl.uniform3fv(uniforms.u_line, toVec3(colors.line));
      gl.uniform3fv(uniforms.u_haze0, toVec3(colors.agent));
      gl.uniform3fv(uniforms.u_haze1, toVec3(colors.life));
      gl.uniform3fv(uniforms.u_haze2, toVec3(colors.web3));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    // Free our objects but keep the context: the same canvas may be set up again
    // (React remounts effects), and a lost context can't be reused.
    destroy() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    },
  };
}
