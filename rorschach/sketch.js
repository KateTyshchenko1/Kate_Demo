// Rorschach Bubble-Chamber — smoother growth (decelerate + center throttle + fade-in)

let gDots, gRings, gPulse, paper;
let seeds = [];
let placed = [];
let appearing = [];          // fade-in queue: {x,y,R,col,tier,age}
let paused = false;

let TOTAL_BUDGET = 0;
let buildBudget = 0;
let t = 0;

// Tweak: paper background color
// Example: warmer paper → const BG = "#faf7f3";
const BG = "#f7f7f6";

// Tweak: ink palette and weights (higher weight = appears more)
// Example: more gray, less yellow
// const PALETTE = [
//     { hex: "#7866F2", weight: 0.40 },
//     { hex: "#6E6E73", weight: 0.45 },
//     { hex: "#F2B84B", weight: 0.15 },
// ];
// palette: purple / gray / yellow
const PALETTE = [
    { hex: "#2f1255", weight: 0.30 }, // purple
    { hex: "#4f00c2", weight: 0.34 }, // gray
    { hex: "#a05fff", weight: 0.36 }  // yellow
];

// Brighter look: keep paper grain quieter so colors pop
const PAPER_NOISE_MAX = 6;

// Tweak: cluster field (where circles prefer to land)
// - CLUSTER_FREQ controls blob size (higher = smaller, more islands)
// - CLUSTER_BIAS shifts permissiveness (negative = more permissive)
// Example: const CLUSTER_FREQ = 0.0032; const CLUSTER_BIAS = 0.04;
const CLUSTER_FREQ = 0.0026;
const CLUSTER_BIAS = -0.02;   // negative = more permissive overall

// Tweak: new-circle fade-in duration (frames at ~48fps)
// Example: const FADE_FRAMES = 10; // faster appearance
const FADE_FRAMES = 16;       // ~0.33s @48fps

// Tweak: micro structure opacities — pushed brighter
const HALO_OPA = { big: 0.120, med: 0.100, small: 0.090 };
const RIM_ALPHA = 190;
const RIM_STROKE = 0.32;
const RINGPOINT_ALPHA = 190;
const RINGPOINT_W = 0.24;
const SPOKE_ALPHA = 170;
const SPOKE_STROKE = 0.26;

// Optional: long straight bursts (Tarbell-style). Lower probs to disable.
const BURST_PROB = { big: 0.86, med: 0.60, small: 0.12 }; // chance a bubble gets bursts
const BURST_COUNT = { big: [60, 110], med: [28, 60], small: [8, 22] }; // rays per bubble
const BURST_TOTAL_LEN = [1.2, 4.6];   // total ray length in multiples of R
const BURST_SEG_LEN = [0.10, 0.28]; // each drawn segment length (×R)
const BURST_GAP_LEN = [0.05, 0.16]; // gap between segments (×R)
const BURST_THICK = [0.35, 0.85]; // strokeWeight (px)
const BURST_ALPHA = 150;           // opacity 0–255

// Tweak: circle radii bands (px)
const BIG_R = [26, 44];
const MED_R = [12, 24];
const SMALL_R = [6, 12];
const XL_CHANCE = 0.20;          // ~14% of big bubbles are XL
const XL_SCALE = [1.5, 2.7];    // multiply the chosen R by this range

let BIG_COUNT, MED_COUNT, SMALL_COUNT;
let SEED = null;

// -------- seed helpers --------
function getStableSeed() {
    const urlSeed = new URLSearchParams(location.search).get("seed");
    if (urlSeed && !Number.isNaN(parseInt(urlSeed))) return parseInt(urlSeed);
    const stored = localStorage.getItem("inkblotSeed");
    if (stored) return parseInt(stored);
    const s = Math.floor(Math.random() * 9217);
    localStorage.setItem("inkblotSeed", String(s));
    return s;
}

// -------- p5 lifecycle --------
function setup() {
    const size = Math.min(windowWidth, windowHeight);
    createCanvas(size, size);
    frameRate(48);
    pixelDensity(1);

    SEED = getStableSeed();
    randomSeed(SEED);
    noiseSeed(SEED);

    // Tweak: how many circles at each scale (auto-scales by area)
    // Example: denser lace → SMALL_COUNT = int(290 * scaleA * 1.4)
    const scaleA = (width * height) / (900 * 900);
    BIG_COUNT = int(8 * scaleA);
    MED_COUNT = int(52 * scaleA);
    SMALL_COUNT = int(290 * scaleA);

    TOTAL_BUDGET = BIG_COUNT + MED_COUNT + SMALL_COUNT;
    buildBudget = TOTAL_BUDGET;

    gDots = createGraphics(width, height);
    gRings = createGraphics(width, height);
    gPulse = createGraphics(width, height);
    paper = makePaper(width, height, PAPER_NOISE_MAX);

    background(BG);

    const m = width * 0.08;
    seeds = [];
    // Tweak: number of tracers (more seeds = more concurrent motion)
    // Example: for (let i = 0; i < 64; i++) { ... }
    for (let i = 0; i < 48; i++) {
        seeds.push(createVector(random(m, width / 2 - m), random(m, height - m)));
    }

    placed.length = 0;
    appearing.length = 0;
    gDots.clear(); gRings.clear(); gPulse.clear();
}
function radiateBursts(g, x, y, R, rays, col) {
    g.push(); g.translate(x, y);
    g.stroke(col.r, col.g, col.b, BURST_ALPHA);
    g.strokeWeight(random(BURST_THICK[0], BURST_THICK[1]));
    for (let i = 0; i < rays; i++) {
        const a = random(TWO_PI);
        let rCur = R * random(0.25, 0.9);                              // start a bit away from center
        let remaining = R * random(BURST_TOTAL_LEN[0], BURST_TOTAL_LEN[1]);
        while (remaining > 0) {
            const seg = R * random(BURST_SEG_LEN[0], BURST_SEG_LEN[1]);  // draw
            g.line(cos(a) * rCur, sin(a) * rCur, cos(a) * (rCur + seg), sin(a) * (rCur + seg));
            const gap = R * random(BURST_GAP_LEN[0], BURST_GAP_LEN[1]);  // skip
            rCur += seg + gap;
            remaining -= seg + gap;
        }
    }
    g.pop();
}

function draw() {
    if (paused) return;

    // ---------- build (stamps per frame decelerates over time) ----------
    if (buildBudget > 0) {
        const m = width * 0.08;
        const cx = width * 0.25, cy = height * 0.50;
        const rx = (width / 2 - m * 1.6), ry = height * 0.44;

        const progress = 1 - buildBudget / TOTAL_BUDGET;             // 0..1
        // Tweak: overall build speed (early → late stamps per frame)
        // Example: faster start → round(lerp(130, 24, easeInOutCubic(progress)))
        const stampsThisFrame = round(lerp(110, 22, easeInOutCubic(progress)));

        for (let s = 0; s < stampsThisFrame && buildBudget > 0; s++) {
            const p = seeds[floor(random(seeds.length))];

            // Tweak: seed flow field (buckets & step size)
            // Example: more buckets & smaller step → smoother drift
            const theta = quantize(noise(p.x * 0.003, p.y * 0.003) * TWO_PI, 900);
            p.add(0.18 * sin(theta), 0.18 * cos(theta));
            p.x = constrain(p.x, m, width / 2 - m);
            p.y = constrain(p.y, m, height - m);

            let tier = "small", Rrange = SMALL_R;
            if (buildBudget > SMALL_COUNT + MED_COUNT) { tier = "big"; Rrange = BIG_R; }
            else if (buildBudget > SMALL_COUNT) { tier = "med"; Rrange = MED_R; }

            const R = random(Rrange[0], Rrange[1]);

            if (allowHere(p.x, p.y, cx, cy, rx, ry, tier) && notTooClose(p.x, p.y, R, tier)) {
                const col = pickInkWeighted();
                appearing.push({ x: p.x, y: p.y, R, col, tier, age: 0 });   // fade-in instead of instant bake
                placed.push({ x: p.x, y: p.y, R, col });
                buildBudget--;
            }
        }
    }
    function coreBloom(g, x, y, R, col, strength = 0.55) {
        g.push(); g.translate(x, y);
        const ctx = g.drawingContext;
        const r0 = R * 0.28;  // core radius
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r0);
        grad.addColorStop(0.00, `rgba(${col.r},${col.g},${col.b},${0.75 * strength})`);
        grad.addColorStop(0.60, `rgba(${col.r},${col.g},${col.b},${0.35 * strength})`);
        grad.addColorStop(1.00, `rgba(${col.r},${col.g},${col.b},0)`);
        ctx.fillStyle = grad;
        g.noStroke(); g.circle(0, 0, r0 * 2);
        g.pop();
    }

    // ---------- fade-in queue ----------
    gPulse.clear();
    if (appearing.length) {
        const survivors = [];
        for (const a of appearing) {
            const k = constrain(a.age / FADE_FRAMES, 0, 1);           // 0..1
            // draw soft halo while appearing
            halo(gPulse, a.x, a.y, a.R * 1.1, (0.035 + 0.065 * k), a.col);
            if (k >= 1) {
                // commit to main layers once fully faded-in
                paintBubble(gRings, gDots, a.x, a.y, a.R, a.col, a.tier);
            } else {
                a.age++;
                survivors.push(a);
            }
        }
        appearing = survivors;
    }

    // ---------- composite & mirror ----------
    clear(); background(BG);
    image(gRings, 0, 0); image(gDots, 0, 0); image(gPulse, 0, 0);
    push(); translate(width, 0); scale(-1, 1);
    image(gRings, 0, 0); image(gDots, 0, 0); image(gPulse, 0, 0);
    pop();
    image(paper, 0, 0);
    // Note: all drawing occurs on the left-half buffers (gRings/gDots/gPulse)
    // and then is mirrored here. To change left margin, edit `const m = width * 0.08;` in setup.

    // fold seam
    noStroke();
    for (let i = -2; i <= 2; i++) { fill(0, 10 - Math.abs(i) * 2); rect(width / 2 + i, 0, 1, height); }

    t += 0.015;
}

// -------- gating (with center throttle) --------
function allowHere(x, y, cx, cy, rx, ry, tier) {
    // ellipse membership + cluster mask
    const nx = (x - cx) / rx, ny = (y - cy) / ry, d2 = nx * nx + ny * ny;        // 0 center → 1 rim
    const em = (d2 > 1.15) ? 0 : constrain(map(d2, 0.90, 1.15, 1, 0), 0, 1);
    if (em <= 0) return false;

    const cm = clusterMask(x, y);

    // Tweak: center throttle — increase to discourage center crowding
    // Example: const centerPenalty = map(d2, 0.0, 0.9, 1.20, 1.00, true);
    const centerPenalty = map(d2, 0.0, 0.9, 1.35, 1.00, true); // 1.35 at center → 1.0 towards rim

    // Tweak: base acceptance threshold by tier (lower = denser)
    const base = (tier === "big" ? 0.20 : tier === "med" ? 0.16 : 0.10); // small easiest to place
    return (cm * em) / centerPenalty > base;
}

function notTooClose(x, y, R, tier) {
    // Tweak: separation factor (higher = more spacing/lace)
    // Example: big:0.90, med:0.80, small:0.68
    const minSep = (tier === "big" ? 0.86 : tier === "med" ? 0.78 : 0.64);
    for (const p of placed) if (dist(x, y, p.x, p.y) < (p.R + R) * minSep) return false;
    return true;
}

function clusterMask(x, y) {
    const a = noise(x * CLUSTER_FREQ, y * CLUSTER_FREQ);
    const b = noise(x * CLUSTER_FREQ * 0.55 + 1000, y * CLUSTER_FREQ * 0.55 + 2000);
    const v = 0.65 * a + 0.35 * b;
    return smoothstep(0.20 + CLUSTER_BIAS, 0.72, v);
}

// -------- stamps --------
// Note: To make the work more monochrome, set all PALETTE entries to the same hex.
// To increase contrast, use a darker hex for rims/spokes by lowering RIM_ALPHA/SPOKE_ALPHA less than halos.
function hexToRgb(h) { const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h); return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 0, g: 0, b: 0 }; }
function pickInkWeighted() { const t = PALETTE.reduce((s, p) => s + p.weight, 0); let x = random(t); for (const p of PALETTE) { x -= p.weight; if (x <= 0) return hexToRgb(p.hex); } return hexToRgb(PALETTE[0].hex); }
function quantize(theta, buckets) { return (TWO_PI / buckets) * int((theta / TWO_PI) * buckets); }

function halo(g, x, y, R, aFrac, col) {
    g.push(); g.translate(x, y);
    const ctx = g.drawingContext, grad = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    // Slightly narrower inner falloff to appear brighter at the core
    grad.addColorStop(0.00, `rgba(${col.r},${col.g},${col.b},0)`);
    grad.addColorStop(0.18, `rgba(${col.r},${col.g},${col.b},${aFrac})`);
    grad.addColorStop(0.85, `rgba(${col.r},${col.g},${col.b},0)`);
    ctx.fillStyle = grad; g.noStroke(); g.circle(0, 0, R * 2); g.pop();
}

function thinRing(g, x, y, R, col, alphaFrac) {
    g.push(); g.translate(x, y); g.noFill();
    g.stroke(col.r, col.g, col.b, alphaFrac * 255); g.strokeWeight(0.25);
    g.circle(0, 0, R * 2 * random(0.98, 1.02)); g.pop();
}

function rimDots(g, x, y, R, alpha255, strokeW, col) {
    g.push(); g.translate(x, y);
    g.stroke(col.r, col.g, col.b, alpha255); g.strokeWeight(strokeW);
    const N = int(180 + R * 5.5);
    for (let i = 0; i < N; i++) {
        const rr = (1 - random(random(random()))) * R * random(1.08, 1.65);
        const ang = random(TWO_PI);
        g.point(cos(ang) * rr, sin(ang) * rr);
    }
    g.pop();
}

function ringPoints(g, x, y, R, count, alpha255, w, col) {
    g.push(); g.translate(x, y);
    g.stroke(col.r, col.g, col.b, alpha255); g.strokeWeight(w);
    for (let i = 0; i < count; i++) {
        const ang = i * (TWO_PI / count) + random(-0.03, 0.03);
        const rr = R + random(-0.6, 0.6);
        g.point(cos(ang) * rr, sin(ang) * rr);
    }
    g.pop();
}

function spokes(g, x, y, R, count, alpha255, strokeW, col) {
    g.push(); g.translate(x, y);
    g.stroke(col.r, col.g, col.b, alpha255); g.strokeWeight(strokeW);
    for (let i = 0; i < count; i++) {
        const ang = random(TWO_PI);
        const len = R * random(0.25, 0.95);
        const t0 = R * random(0.10, 0.60);
        const x0 = cos(ang) * t0, y0 = sin(ang) * t0;
        const x1 = cos(ang) * (t0 + len), y1 = sin(ang) * (t0 + len);
        const cut = random(0.2, 0.8);
        g.line(x0, y0, lerp(x0, x1, cut), lerp(y0, y1, cut));
        if (random() < 0.55) g.line(lerp(x0, x1, cut + 0.1), lerp(y0, y1, cut + 0.1), x1, y1);
    }
    g.pop();
}

function paintBubble(rings, dots, x, y, R, col, tier) {
    const a = (tier === 'big' ? HALO_OPA.big : tier === 'med' ? HALO_OPA.med : HALO_OPA.small);
    // Global brighten: mix ink 15% toward white
    const ink = { r: col.r + (255 - col.r) * 0.15, g: col.g + (255 - col.g) * 0.15, b: col.b + (255 - col.b) * 0.15 };
    halo(rings, x, y, R * 1.05, a * 1.00, ink);
    if (random() < 0.95) halo(rings, x, y, R * 1.35, a * 0.80, ink);
    if (random() < 0.75) halo(rings, x, y, R * 1.75, a * 0.60, ink);

    if (random() < 0.35) thinRing(rings, x, y, R * random(0.90, 1.08), ink, 0.22);
    if (random() < 0.55) ringPoints(dots, x, y, R * random(0.85, 1.20), int(36 + R * 0.8), RINGPOINT_ALPHA, RINGPOINT_W, ink);

    rimDots(dots, x, y, R * random(0.95, 1.25), RIM_ALPHA, RIM_STROKE, ink);
    sprayNoise(dots, x, y, R, int(60 + R * 4), ink, 70); // slightly stronger grit

    const n = (tier === 'big' ? int(random(30, 46)) : tier === 'med' ? int(random(18, 32)) : int(random(9, 18)));
    spokes(dots, x, y, R, n, SPOKE_ALPHA, SPOKE_STROKE, ink);
}

// -------- utils --------
function makePaper(w, h, maxA = 6) {
    const g = createGraphics(w, h); g.loadPixels();
    for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) {
            // Denser/finer/more visible dots: higher frequency + stronger alpha
            // (equivalent to using noise(i/2.2, j/2.2, (i*j)/40) * random(12..30) in a filter)
            const a = noise(i / 2.2, j / 2.2, (i * j) / 40) * (maxA * 1.8);
            g.set(i, j, color(0, 0, 0, a));
        }
    }
    g.updatePixels(); return g;
    // inside makePaper(...):
    const a = noise(i / 3, j / 3, (i * j) / 40) * maxA; // /60 → /40 adds fine pepper
}
function sprayNoise(g, x, y, R, count, col, alpha255) {
    g.push(); g.translate(x, y);
    g.stroke(col.r, col.g, col.b, alpha255);
    g.strokeWeight(0.2);
    for (let i = 0; i < count; i++) {
        const rr = (1 - random(random())) * R * random(0.9, 1.8); // edge-biased
        const ang = random(TWO_PI);
        g.point(cos(ang) * rr, sin(ang) * rr);
    }
    g.pop();
}
function smoothstep(a, b, x) { x = constrain((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); }
function easeInOutCubic(x) { return x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2; }

function keyTyped() {
    if (key === 's' || key === 'S') saveCanvas('inkblot', 'png');
    if (key === 'p' || key === 'P') paused = !paused;
    if (key === 'r' || key === 'R') {
        const s = Math.floor(Math.random() * 9217);
        localStorage.setItem("inkblotSeed", String(s));
        setup();
    }
}
function windowResized() { setup(); }
// Example only: to enable long straight bursts, place this inside paintBubble(...)
// if (tier === 'big' && random() < BURST_PROB.big) {
//     radiateBursts(dots, x, y, R, int(random(BURST_COUNT.big[0], BURST_COUNT.big[1])), col);
// } else if (tier === 'med' && random() < BURST_PROB.med) {
//     radiateBursts(dots, x, y, R, int(random(BURST_COUNT.med[0], BURST_COUNT.med[1])), col);
// } else if (tier === 'small' && random() < BURST_PROB.small) {
//     radiateBursts(dots, x, y, R, int(random(BURST_COUNT.small[0], BURST_COUNT.small[1])), col);
// }