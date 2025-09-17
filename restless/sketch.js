/* Restless — GPU particle flow with bursts of clarity.
   Uses Olon (tiny WebGL helper) + Shox noise for transform feedback update + point render.
   Color cycles across electric blue → fiery orange → midnight purple.
   Every so often, motion eases and particles lock into a constellation-like figure before dissolving. */

import Olon, { Data } from "https://cdn.jsdelivr.net/npm/olon@0.0.0/src/Olon.js";
import * as Shox from "https://cdn.jsdelivr.net/npm/shox@1.1.0/src/Shox.js";

// ---------- helpers ----------
const random = (a = 0, b = 1) => Math.random() * (b - a) + a;
const floor = Math.floor;
const min = Math.min;

// ---------- sim params ----------
const MAX_AMOUNT = 850000;          // keep below 1M for mobile safety
const MIN_AGE = 2.2;
const MAX_AGE = 3.5;
const BIRTH_RATE = 0.55;            // particles per frame multiplier

// cadence for "focus" moments
const FOCUS_PERIOD = 11.0;          // seconds between peaks
const FOCUS_WIDTH = 2.8;            // seconds width of S-curve window

// canvas / GL setup
const size = Math.min(window.innerWidth, window.innerHeight);
const ol = Olon(size, size);
ol.enableCanvas2D();
ol.blend({ sfactor: ol.SRC_ALPHA, dfactor: ol.ONE_MINUS_SRC_ALPHA });
ol.enableBlend();

// ---------- shader sources ----------
const UPDATE_VERT = `
precision mediump float;

uniform float uTimeDelta;
uniform float uTime;
uniform vec2  uRandom;
uniform float uFocus;            // 0..1 ease into focus
uniform float uShape;            // 0=circle,1=square,2=heart,3=pyramid

in vec2  aPosition;
in float aAge;
in float aLife;
in vec2  aVel;

out vec2  vPosition;
out float vAge;
out float vLife;
out vec2  vVel;

${Shox.noiseMath}
${Shox.snoise3D}
${Shox.hash}

// nearest point on a segment AB
vec2 nearestOnSeg(vec2 A, vec2 B, vec2 P){
    vec2 AB = B - A; float ab2 = dot(AB, AB);
    float t = clamp(dot(P - A, AB) / max(ab2, 1e-5), 0.0, 1.0);
    return A + t * AB;
}

// constellation attractor driven by selected shape
vec2 focusField(vec2 p){
    float r = length(p)+1e-4;
    vec2 tang = vec2(-p.y, p.x)/r; // gentle breathing

    // round(uShape) used to branch
    float sid = floor(uShape + 0.5);

    // ---- circle (ring) ----
    if (sid < 0.5) {
        float R = 0.55;
        vec2 q = normalize(p) * R;
        float d = abs(length(p) - R);
        vec2 ringPull = normalize(q - p) * (1.0 / (0.15 + d));
        return ringPull + 0.08 * tang;
    }

    // ---- square ----
    if (sid < 1.5) {
        float s = 0.48;
        vec2 A = vec2(-s,-s), B = vec2( s,-s), C = vec2( s, s), D = vec2(-s, s);
        vec2 q; float best = 1e9; vec2 P;
        P = nearestOnSeg(A,B,p); float d = distance(p,P); if(d<best){best=d; q=P;}
        P = nearestOnSeg(B,C,p); d = distance(p,P); if(d<best){best=d; q=P;}
        P = nearestOnSeg(C,D,p); d = distance(p,P); if(d<best){best=d; q=P;}
        P = nearestOnSeg(D,A,p); d = distance(p,P); if(d<best){best=d; q=P;}
        vec2 linePull = normalize(q - p) * (1.0 / (0.18 + best));
        return 1.05*linePull + 0.06 * tang;
    }

    // ---- heart (polyline approximation) ----
    if (sid < 2.5) {
        vec2 p0 = vec2( 0.00,  0.30);
        vec2 p1 = vec2(-0.22,  0.22);
        vec2 p2 = vec2(-0.36,  0.02);
        vec2 p3 = vec2( 0.00, -0.40);
        vec2 p4 = vec2( 0.36,  0.02);
        vec2 p5 = vec2( 0.22,  0.22);
        vec2 pts[6]; pts[0]=p0; pts[1]=p1; pts[2]=p2; pts[3]=p3; pts[4]=p4; pts[5]=p5;
        vec2 q; float best = 1e9; for(int i=0;i<6;i++){
            vec2 A = pts[i]; vec2 B = pts[(i+1)%6];
            vec2 P = nearestOnSeg(A,B,p); float d = distance(p,P); if(d<best){best=d; q=P;}
        }
        vec2 linePull = normalize(q - p) * (1.0 / (0.16 + best));
        // extra pull toward the top cusp for the heart silhouette
        vec2 cuspPull = normalize(p0 - p) * 0.25;
        return 1.0*linePull + 0.25*cuspPull + 0.05*tang;
    }

    // ---- pyramid (triangle) ----
    {
        vec2 A = vec2( 0.00,  0.44);
        vec2 B = vec2(-0.46, -0.26);
        vec2 C = vec2( 0.46, -0.26);
        vec2 q; float best = 1e9; vec2 P;
        P = nearestOnSeg(A,B,p); float d = distance(p,P); if(d<best){best=d; q=P;}
        P = nearestOnSeg(B,C,p); d = distance(p,P); if(d<best){best=d; q=P;}
        P = nearestOnSeg(C,A,p); d = distance(p,P); if(d<best){best=d; q=P;}
        vec2 linePull = normalize(q - p) * (1.0 / (0.18 + best));
        vec2 apexPull = normalize(A - p) * 0.20;
        return 1.05*linePull + 0.20*apexPull + 0.06*tang;
    }
}

void main(){
    // layered noise field (fast color phase uses this motion)
    vec2 n2 = vec2(
        0.5 + 0.5*snoise(vec3(aPosition*7.0 + 200.0,  uTime*0.55)),
        0.5 + 0.5*snoise(vec3(aPosition*7.0 + 100.0, -uTime*0.45))
    );

    if(aAge >= aLife){
        // (re)spawn
        ivec2 coord = ivec2(gl_VertexID%1024, gl_VertexID/1024);
        vec2 rnd = hash22(vec2(coord));
        float px = snoise(vec3(rnd + vec2(uRandom.x),  uTime*0.10 + n2.x*0.10));
        float py = snoise(vec3(rnd - vec2(uRandom.y), -uTime*0.10 + n2.y*0.10));
        vPosition = 0.78*vec2(px, py);
        vVel = vPosition*0.0;
        vAge = 0.0;
        vLife = aLife;
    } else {
        // default flow
        float slow = mix(1.0, 0.12, uFocus);                 // slow time during focus
        vec2 force = 3.2*(2.0*n2-1.0) * (1.0 - 0.92*uFocus); // suppress turbulence
        // focus blending: steer toward constellation field & damp velocity
        vec2 ff = focusField(aPosition);
        vec2 blended = mix(force, ff, uFocus);
        float damp = mix(0.96, 0.82, uFocus);
        vVel = damp*aVel + blended*(uTimeDelta*slow)*3.2;
        vPosition = aPosition + vVel*(uTimeDelta*slow);
        vAge = aAge + (uTimeDelta * mix(1.0, 0.18, uFocus)); // much slower aging in focus
        vLife = aLife;
    }
}`;

const UPDATE_FRAG = `
precision mediump float;
void main(){ discard; }
`;

const RENDER_VERT = `
precision mediump float;
in vec4 aPosition;
in float aAge;
in float aLife;
uniform float uFocus;
out float vAge;
out float vLife;
void main(){
    vAge = aAge; vLife = aLife;
    gl_PointSize = (mix(1.5, 2.8, uFocus))*(1.0 - aAge/aLife);
    gl_Position = aPosition;
}`;

const RENDER_FRAG = `
precision mediump float;
in float vAge; in float vLife;
uniform float uTime;
uniform float uFocus;
out vec4 fragColor;

// vivid palette cycling fast; cools during focus
vec3 palette(float t){
    // t in seconds → wheel across blue → orange → purple
    float s = t*0.35; // speed
    vec3 c1 = vec3(0.1,0.6,1.0);   // electric blue
    vec3 c2 = vec3(1.0,0.5,0.05);  // fiery orange
    vec3 c3 = vec3(0.5,0.2,0.8);   // midnight purple
    vec3 a = mix(c1,c2,0.5+0.5*sin(s));
    vec3 b = mix(c2,c3,0.5+0.5*sin(s+2.094));
    vec3 c = mix(c3,c1,0.5+0.5*sin(s+4.188));
    vec3 mix1 = mix(a,b,0.5+0.5*sin(s*1.37));
    vec3 mix2 = mix(b,c,0.5+0.5*sin(s*1.61));
    vec3 base = mix(mix1,mix2,0.5);
    // desaturate slightly in focus so structure reads
    return mix(base, vec3(dot(base, vec3(0.2126,0.7152,0.0722))), uFocus*0.25);
}

void main(){
    float fade = 1.0 - vAge/vLife;
    float sparkle = smoothstep(0.0,0.2,fade) * (0.6+0.4*fract(sin(uTime*123.4)*43758.5453));
    vec3 col = palette(uTime) * (0.35 + 0.65*fade);
    // emphasize points a bit more during focus to form constellations
    float alpha = mix(0.7*fade, 1.0*fade + 0.15*sparkle, uFocus);
    fragColor = vec4(col, alpha);
}`;

// ---------- pipeline ----------
const TFV = ["vPosition", "vAge", "vLife", "vVel"];
const updateProgram = ol.createProgram(UPDATE_VERT, UPDATE_FRAG, TFV);
const renderProgram = ol.createProgram(RENDER_VERT, RENDER_FRAG);

const aPosition = { name: "aPosition", unit: "f32", size: 2 };
const aAge = { name: "aAge", unit: "f32", size: 1 };
const aLife = { name: "aLife", unit: "f32", size: 1 };
const aVel = { name: "aVel", unit: "f32", size: 2 };
const attributes = [aPosition, aAge, aLife, aVel];

const particleData = [];
for (let i = 0; i < MAX_AMOUNT; i++) {
    const life = random(MIN_AGE, MAX_AGE);
    particleData.push(0, 0);       // pos
    particleData.push(life + 1.0); // age
    particleData.push(life);       // life
    particleData.push(0, 0);       // vel
}
const initData = Data(particleData);

const buffer0 = ol.createBuffer(initData, ol.STREAM_DRAW);
const buffer1 = ol.createBuffer(initData, ol.STREAM_DRAW);

const vao0 = ol.createVAO(updateProgram, { buffer: buffer0, stride: 4 * 6, attributes });
const vao1 = ol.createVAO(updateProgram, { buffer: buffer1, stride: 4 * 6, attributes });
const buffers = [buffer0, buffer1];
const vaos = [vao0, vao1];
let read = 0, write = 1;

let lastTime = 0;
let bornAmount = 0;
ol.uniform("uRandom", [random() * 1024, random() * 4096]);
let currentShape = 0; // 0=circle,1=square,2=heart,3=pyramid

// switch shape every few focus peaks
let lastPeak = -1e9;

// compute a smooth 0..1 focus envelope based on time
function focusAmount(t) {
    float: {
        // center pulses at multiples of FOCUS_PERIOD using a raised cosine window
    }
    const phase = (t % FOCUS_PERIOD);
    const x = (phase - FOCUS_PERIOD * 0.5);
    const w = FOCUS_WIDTH * 0.5;
    const k = Math.max(0, 1 - Math.abs(x) / w);
    // ease for gentler slopes and a flat top
    return Math.pow(Math.max(0, k), 2.2);
}

ol.render(() => {
    const time = ol.frame / 60;
    const timeDelta = time - lastTime;
    lastTime = time;

    const nextAmount = floor(bornAmount + BIRTH_RATE * 9000);
    bornAmount = min(MAX_AMOUNT, nextAmount);

    const focus = focusAmount(time);
    // detect new focus peak to rotate shapes
    if (focus > 0.98 && (time - lastPeak) > (FOCUS_PERIOD * 0.6)) {
        lastPeak = time;
        currentShape = (currentShape + 1) % 4;
    }

    ol.clearColor(0, 0, 0, 0.6);
    ol.clearDepth();

    ol.use({ program: updateProgram }).run(() => {
        ol.uniform("uTimeDelta", timeDelta);
        ol.uniform("uTime", time);
        ol.uniform("uFocus", focus);
        ol.uniform("uShape", currentShape);
        ol.transformFeedback(vaos[read], buffers[write], ol.POINTS, () => {
            ol.points(0, bornAmount);
        });
    });

    ol.use({ program: renderProgram, VAO: vaos[write] }).run(() => {
        ol.uniform("uTime", time);
        ol.uniform("uFocus", focus);
        ol.points(0, bornAmount);
    });

    // ping-pong
    [read, write] = [write, read];
});


