/* Gentle Dandelions (light blue gradient, slim dark stems, floating seeds) */

let flowers = [];
let seeds = [];
const MAX_SEEDS = 900;
const N_FLOWERS = 15;
const SIDE_MARGIN = 90;
const GROUND_MARGIN = 48;

let groundY; // baseline where stems end
let t = 0;   // global time

function setup() {
    createCanvas(windowWidth, windowHeight);
    colorMode(HSB, 360, 100, 100, 100);
    angleMode(RADIANS);
    noStroke();

    groundY = height - GROUND_MARGIN;

    // single row, varied heights
    for (let i = 0; i < N_FLOWERS; i++) {
        const x = map(i, 0, N_FLOWERS - 1, SIDE_MARGIN, width - SIDE_MARGIN);
        // choose stem height category for natural variety
        let headY;
        const heightChoice = random();
        if (heightChoice < 0.3) {
            // short stems
            headY = random(groundY - 140, groundY - 90);
        } else if (heightChoice < 0.7) {
            // medium stems
            headY = random(groundY - 250, groundY - 170);
        } else {
            // tall stems
            headY = random(groundY - 380, groundY - 270);
        }
        flowers.push(new Dandelion(x, headY));
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    groundY = height - GROUND_MARGIN;
}

function draw() {
    drawGradientBackground();

    // stems behind heads
    for (const f of flowers) f.drawStem();

    // heads + periodic seed releases
    for (const f of flowers) {
        f.display();
        if (frameCount % f.releaseEvery === 0 && seeds.length < MAX_SEEDS) f.releaseSeed();
    }

    // wind / seed updates
    const breeze = map(noise(t * 0.1), 0, 1, 0.4, 1.1);
    for (let i = seeds.length - 1; i >= 0; i--) {
        const s = seeds[i];
        s.update(breeze);
        s.display();
        if (s.offscreen()) seeds.splice(i, 1);
    }

    t += 0.006;
}

function mousePressed() {
    // puff burst from nearest head
    let nearest = null, best = Infinity;
    for (const f of flowers) {
        const d = dist(mouseX, mouseY, f.x, f.y);
        if (d < best) { best = d; nearest = f; }
    }
    if (nearest && best < nearest.headR * 1.6) {
        const n = 18 + floor(random(8));
        for (let i = 0; i < n && seeds.length < MAX_SEEDS; i++) nearest.releaseSeed(true);
    }
}

/* -------- Background: light blue vertical gradient -------- */
function drawGradientBackground() {
    // soft sky tones
    const topCol = color(210, 50, 35);  // dark sky blue
    const midCol = color(210, 40, 65);  // mid-tone blue
    const botCol = color(210, 30, 95);  // light sky blue

    noFill();
    for (let y = 0; y < height; y++) {
        const p = y / height;
        const c = (p < 0.5)
            ? lerpColor(topCol, midCol, p * 2.0)
            : lerpColor(midCol, botCol, (p - 0.5) * 2.0);
        stroke(c);
        line(0, y, width, y);
    }
    noStroke();
}

/* ------------------ Classes ------------------ */

class Dandelion {
    constructor(x, headY) {
        this.x = x;
        this.y = headY;                 // head center
        // choose size category for stronger variety
        const sizeChoice = random();
        if (sizeChoice < 0.35) {
            // small heads
            this.headR = random(16, 26);
        } else if (sizeChoice < 0.75) {
            // medium heads
            this.headR = random(26, 40);
        } else {
            // large heads
            this.headR = random(40, 60);
        }

        // spoke count proportional to radius with some jitter
        this.spokes = floor(this.headR * 3 + random(-12, 12));
        this.releaseEvery = floor(random(60, 90));
        this.swing = random(TWO_PI);    // phase for sway
    }

    drawStem() {
        // subtle left-right sway at the top
        const sway = 6 * sin(t * 1.4 + this.swing);
        const stemTop = createVector(this.x + sway * 0.4, this.y);

        // slender, darker stems
        stroke(130, 40, 30, 25);   // more transparent deep muted green (25% alpha)
        strokeWeight(1.5);
        line(stemTop.x, stemTop.y, stemTop.x, groundY);
        noStroke();
    }

    display() {
        push();
        translate(this.x, this.y);

        // halo
        fill(205, 20, 96, 10);
        circle(0, 0, this.headR * 3);

        // tiny center
        fill(205, 18, 92);
        circle(0, 0, this.headR * 0.18);

        // spokes + small tuft
        stroke(210, 10, 98, 70); // almost white-blue
        strokeWeight(1);
        noFill();
        for (let i = 0; i < this.spokes; i++) {
            const a = (i / this.spokes) * TWO_PI;
            const wiggle = 0.08 * sin(t * 1.2 + i * 0.35);
            const r = this.headR * (0.84 + 0.05 * sin(t * 0.9 + i));
            const x = r * cos(a + wiggle);
            const y = r * sin(a + wiggle);
            line(0, 0, x, y);

            // tiny parachute hairs
            push();
            translate(x, y);
            rotate(a + wiggle);
            line(0, 0, 5, -2);
            line(0, 0, 5, 0);
            line(0, 0, 5, 2);
            pop();
        }
        pop();
    }

    releaseSeed(burst = false) {
        const theta = random(TWO_PI);
        const px = this.x + this.headR * cos(theta);
        const py = this.y + this.headR * sin(theta);
        seeds.push(new Seed(px, py));
    }
}

class Seed {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.vel = createVector(random(-0.15, 0.15), random(-0.9, -0.35));
        this.noiseKey = random(1000);
        this.size = random(2.1, 3.2);
        this.alpha = 100;
        this.spin = random(TWO_PI);
    }

    update(breeze) {
        // Perlin wind field for natural drift
        const n = noise(this.noiseKey + t * 0.7, this.pos.y * 0.003);
        const windX = (n - 0.5) * 1.8 * breeze;  // [-0.9..0.9] scaled
        const liftY = -0.05 * breeze;

        this.vel.x += windX * 0.05;
        this.vel.y += liftY * 0.05;

        // floaty damping
        this.vel.mult(0.996);

        this.pos.add(this.vel);
        this.alpha -= 0.18;
        this.spin += 0.02 + 0.02 * breeze;
    }

    display() {
        // seed body
        fill(210, 8, 98, this.alpha);
        noStroke();
        circle(this.pos.x, this.pos.y, this.size);

        // parachute tuft
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.spin);
        stroke(210, 12, 98, this.alpha * 0.7);
        strokeWeight(1);
        for (let i = 0; i < 5; i++) { line(0, 0, 7, 0); rotate(TWO_PI / 5); }
        pop();
    }

    offscreen() {
        return (
            this.alpha <= 0 ||
            this.pos.x < -60 || this.pos.x > width + 60 ||
            this.pos.y < -80 || this.pos.y > height + 80
        );
    }
}