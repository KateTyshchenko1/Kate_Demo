
import * as d3 from "https://esm.sh/d3@7";

/* =========================
   Kate • Life Themes (creative cut)
   ========================= */

const data = {
    name: "applied chaos",
    value: 10,
    children: [
        // ———————————————————
        // Journeys & Roots
        {
            name: "journeys & roots", value: 9, children: [
                {
                    name: "early pages", value: 8, children: [
                        { name: "border town memories", value: 7 },
                        { name: "libraries & long afternoons", value: 9 },
                        { name: "curiosity without a map", value: 8 },
                        { name: "libraries as schools", value: 7 },
                        { name: "from plans to paths", value: 8 }
                    ]
                },
                {
                    name: "becoming", value: 8, children: [
                        { name: "rooms that unlock you", value: 8 },
                        { name: "toy-store campus", value: 8 },
                        { name: "contests & crews", value: 7 },
                        { name: "hands that build", value: 8 },
                        { name: "the connector thread", value: 8 },
                        { name: "promises you make to yourself", value: 7 }
                    ]
                }
            ]
        },

        // ———————————————————
        // Peace & Care
        {
            name: "peace & care", value: 10, children: [
                {
                    name: "after the sirens", value: 9, children: [
                        { name: "field notes from storms", value: 9 },
                        { name: "refuge, then purpose", value: 9 },
                        { name: "hands that rebuild", value: 9 },
                        { name: "letters into action", value: 7 },
                        { name: "grief that learns to move", value: 8 }
                    ]
                },
                {
                    name: "women", value: 9, children: [
                        { name: "sisters of resilience", value: 8 },
                        { name: "small circles, big courage", value: 8 },
                        { name: "practice of leadership", value: 8 },
                        { name: "hope as craft", value: 8 }
                    ]
                }
            ]
        },

        // ———————————————————
        // Minds & Learning
        {
            name: "minds & learning", value: 9, children: [
                {
                    name: "attention", value: 8, children: [
                        { name: "what the mind follows", value: 8 },
                        { name: "reward & rhythm", value: 7 },
                        { name: "designing focus", value: 7 }
                    ]
                },
                {
                    name: "memory", value: 9, children: [
                        { name: "palaces & paths", value: 8 },
                        { name: "dark forest memory", value: 8 },
                        { name: "stories as glue", value: 8 },
                        { name: "thunderstorms in the countryside", value: 8 }
                    ]
                },
                {
                    name: "learning craft", value: 8, children: [
                        { name: "learning how to learn", value: 9 },
                        { name: "feedback with kindness", value: 7 },
                        { name: "practice > theory", value: 7 },
                        { name: "maps, not lists", value: 7 }
                    ]
                }
            ]
        },

        // ———————————————————
        // Influence & Inquiry
        {
            name: "influence & inquiry", value: 9, children: [
                {
                    name: "language & power", value: 8, children: [
                        { name: "frames that steer", value: 8 },
                        { name: "voices of reason", value: 7 },
                        { name: "clean arguments", value: 7 },
                        { name: "listening harder", value: 7 }
                    ]
                },
                {
                    name: "investigation", value: 8, children: [
                        { name: "quiet questions", value: 7 },
                        { name: "signals & secrecy", value: 7 },
                        { name: "targeting for good", value: 8 }
                    ]
                },
                {
                    name: "artificial empathy", value: 9, children: [
                        { name: "mirror not window", value: 9 },
                        { name: "judgment-free rooms", value: 8 },
                        { name: "diary that writes back", value: 8 }
                    ]
                },
                {
                    name: "persuasion experiments", value: 8, children: [
                        { name: "the bot that changed minds", value: 8 },
                        { name: "nudges & guardrails", value: 7 }
                    ]
                }
            ]
        },

        // ———————————————————
        // Art & Sound
        {
            name: "art & sound", value: 8, children: [
                {
                    name: "deeper than words", value: 9, children: [
                        { name: "Bach’s architecture", value: 9 },
                        { name: "EDM pulse", value: 8 },
                        { name: "classic rock echoes", value: 8 },
                        { name: "ambient drift", value: 7 },
                        { name: "handpan circles", value: 9 }
                    ]
                },
                {
                    name: "city orchestra", value: 7, children: [
                        { name: "street rhythms", value: 7 },
                        { name: "echoes in concrete", value: 6 },
                        { name: "crowd harmonics", value: 6 }
                    ]
                }
            ]
        },

        // ———————————————————
        // Wild & Bodycraft (renamed)
        {
            name: "wild & bodycraft", value: 9, children: [
                { name: "scuba blue silence", value: 9 },
                { name: "horses", value: 8 },
                { name: "gentlest yoga", value: 8 },
                { name: "forest breathing", value: 9 }
            ]
        },

        // ———————————————————
        // Design & Play (bites & bits)
        {
            name: "design & play", value: 9, children: [
                { name: "malleable software", value: 9 },
                { name: "gen UI", value: 8 },
                { name: "bites & bits", value: 8 },
                { name: "toys for thinking", value: 8 },
                { name: "living interfaces", value: 9 }
            ]
        },

        // ———————————————————
        // Data & Patterncraft
        {
            name: "data & patterncraft", value: 9, children: [
                { name: "beauty in numbers", value: 8 },
                { name: "storytelling from data", value: 9 },
                { name: "noise to order", value: 9 },
                { name: "Turing’s morphogenesis", value: 8 },
                { name: "maps of the invisible", value: 9 }
            ]
        },

        // ———————————————————
        // Cities & Systems
        {
            name: "cities & systems", value: 8, children: [
                {
                    name: "urban questions", value: 8, children: [
                        { name: "movement & access", value: 7 },
                        { name: "neighborhood math", value: 7 },
                        { name: "public rooms that work", value: 8 }
                    ]
                },
                {
                    name: "safety & justice", value: 9, children: [
                        { name: "crime & consequence", value: 8 },
                        { name: "policing incentives", value: 8 },
                        { name: "care over cages", value: 8 },
                        { name: "better measures", value: 7 }
                    ]
                },
                {
                    name: "care economies", value: 8, children: [
                        { name: "who gets helped", value: 8 },
                        { name: "who slips through", value: 7 },
                        { name: "designing nets", value: 8 }
                    ]
                }
            ]
        },

        // ———————————————————
        // Post-Work Futures (renamed)
        {
            name: "post-work futures", value: 8, children: [
                {
                    name: "after the job", value: 9, children: [
                        { name: "new crafts", value: 8 },
                        { name: "community as safety net", value: 8 },
                        { name: "learning on demand", value: 7 },
                        { name: "dignity in automation", value: 8 }
                    ]
                },
                {
                    name: "listening machines", value: 8, children: [
                        { name: "soft dialogue", value: 8 },
                        { name: "personas with boundaries", value: 8 },
                        { name: "memoryful surfaces", value: 8 },
                        { name: "careful defaults", value: 7 }
                    ]
                }
            ]
        },

        // ———————————————————
        // Memory & Self
        {
            name: "memory & self", value: 8, children: [
                {
                    name: "integration", value: 9, children: [
                        { name: "shadow work", value: 9 },
                        { name: "becoming honest", value: 8 },
                        { name: "from guilt to service", value: 8 }
                    ]
                },
                {
                    name: "steadiness", value: 7, children: [
                        { name: "rituals that hold", value: 7 },
                        { name: "less but alive", value: 7 },
                        { name: "kind limits", value: 7 }
                    ]
                }
            ]
        },

        // ———————————————————
        // Kinship & Belonging
        {
            name: "kinship & belonging", value: 9, children: [
                {
                    name: "tables & circles", value: 9, children: [
                        { name: "rooms that hold", value: 9 },
                        { name: "tables of strangers", value: 9 },
                        { name: "play as glue", value: 8 },
                        { name: "shared rituals", value: 8 },
                        { name: "signals of trust", value: 8 }
                    ]
                },
                {
                    name: "soft governance", value: 7, children: [
                        { name: "care in norms", value: 7 },
                        { name: "lightweight rules", value: 7 },
                        { name: "welcomes & farewells", value: 7 }
                    ]
                }
            ]
        },

        // ———————————————————
        // Curiosity Cabinet
        {
            name: "curiosity cabinet", value: 7, children: [
                {
                    name: "mind & society", value: 8, children: [
                        { name: "behavioral evolution", value: 8 },
                        { name: "moral psychology", value: 7 },
                        { name: "media vs mind", value: 7 },
                        { name: "why some things spread", value: 7 }
                    ]
                },
                {
                    name: "history’s loops", value: 7, children: [
                        { name: "echoes & rhyme", value: 7 },
                        { name: "threshold years", value: 7 },
                        { name: "lessons that stick", value: 7 }
                    ]
                },
                {
                    name: "edges of knowledge", value: 7, children: [
                        { name: "questions with teeth", value: 7 },
                        { name: "fog that invites", value: 6 }
                    ]
                }
            ]
        },

        // ———————————————————
        // Cosmos & Awareness (swap + Feynman)
        {
            name: "cosmos & awareness", value: 9, children: [
                { name: "when the universe observes", value: 9 },
                { name: "uncertainty principle", value: 8 },
                { name: "Feynman questions", value: 8 },
                { name: "double-slit wonder", value: 8 }
            ]
        },

        // ———————————————————
        // Awareness & Agency (kept with prior edits)
        {
            name: "awareness & agency", value: 10, children: [
                {
                    name: "questions first", value: 9, children: [
                        { name: "what are your questions", value: 9 },
                        { name: "pause & see", value: 9 },
                        { name: "answers already inside", value: 9 },
                        { name: "vector of why", value: 9 }
                    ]
                },
                {
                    name: "roles & projection", value: 8, children: [
                        { name: "switch roles anytime", value: 8 },
                        { name: "projection dial", value: 8 },
                        { name: "send out what you seek", value: 8 },
                        { name: "be clear when you ask", value: 8 }
                    ]
                },
                {
                    name: "energy & time", value: 8, children: [
                        { name: "body energy budget", value: 8 },
                        { name: "extend the good moment", value: 8 },
                        { name: "stillness has power", value: 9 }
                    ]
                },
                {
                    name: "craft of knowing", value: 9, children: [
                        { name: "do not outsource awareness", value: 9 },
                        { name: "deep & broad", value: 8 },
                        { name: "pulled by a real problem", value: 8 },
                        { name: "attention to the signal", value: 8 }
                    ]
                },
                {
                    name: "ultimate market", value: 10, children: [
                        { name: "math, story, engineering", value: 7 },
                        { name: "inaction with a reason", value: 7 }
                    ]
                },
                {
                    name: "compass", value: 8, children: [
                        { name: "create • serve • solve • rest", value: 9 },
                        { name: "start with noticing", value: 8 },
                        { name: "design for open minds", value: 8 },
                        { name: "lessons from Heisenberg", value: 7 },
                        { name: "two-person constellation", value: 7 },
                        { name: "notice when joy appears", value: 8 }
                    ]
                }
            ]
        },

        // ———————————————————
        // Books & Stories (curated; add The Idiot)
        {
            name: "books & stories", value: 9, children: [
                {
                    name: "sci-fi & wonder", value: 9, children: [
                        { name: "Project Hail Mary", value: 10 },
                        { name: "Solaris", value: 9 },
                        { name: "Roadside Picnic", value: 9 },
                        { name: "The Martian Chronicles", value: 9 },
                        { name: "1984", value: 9 },
                        { name: "Brave New World", value: 9 },
                        { name: "Hitchhiker’s Guide", value: 9 },
                        { name: "Dandelion Wine", value: 8 },
                        { name: "I, Robot", value: 8 }
                    ]
                },
                {
                    name: "minds & makers", value: 9, children: [
                        { name: "A Mind at Play (Shannon)", value: 9 },
                        { name: "The Innovators", value: 8 },
                        { name: "Einstein: His Life & Universe", value: 8 },
                        { name: "Empires of light", value: 8 },
                        { name: "Surely You’re Joking, Mr. Feynman!", value: 9 }
                    ]
                },
                {
                    name: "behavior & society", value: 9, children: [
                        { name: "Thinking, Fast and Slow", value: 10 },
                        { name: "Behave", value: 9 },
                        { name: "Misbehaving", value: 7 },
                        { name: "Nudge", value: 8 },
                        { name: "Lucifer effect", value: 8 },
                        { name: "Sapiens", value: 9 },
                        { name: "Language Instinct", value: 8 }
                    ]
                },
                {
                    name: "classics", value: 8, children: [
                        { name: "The Master & Margarita", value: 10 },
                        { name: "The Idiot", value: 9 }
                    ]
                }
            ]
        }
    ]
};

/* === Colors: branch → color === */
const branchColors = new Map([
    ["journeys & roots", "#674ea7"],
    ["peace & care", "#3EC9A7"],
    ["minds & learning", "#8E8DF0"],
    ["influence & inquiry", "#F59E0B"],
    ["art & sound", "#F472B6"],
    ["wild & bodycraft", "#22C55E"],
    ["design & play", "#06B6D4"],
    ["data & patterncraft", "#709cb1"],
    ["cities & systems", "#94A3B8"],
    ["post-work futures", "#60A5FA"],
    ["memory & self", "#A78BFA"],
    ["kinship & belonging", "#38761d"],
    ["curiosity cabinet", "#8AF5B8"],
    ["cosmos & awareness", "#C084FC"],
    ["awareness & agency", "#38BDF8"],
    ["books & stories", "#F59EAE"]
]);

const topBranch = d => {
    const a = d.ancestors();
    return a.length > 1 ? a[a.length - 2].data.name : d.data.name;
};
const rScale = d3.scaleSqrt().domain([0, 10]).range([1.8, 4.5]); // slightly smaller max circle

/* === Chart (responsive radial cluster) === */
// ---- responsive layout -----------------------
const M = 20;              // outer margin
const LEGEND_W = 240;      // fixed legend column width

const W = window.innerWidth;
const H = window.innerHeight;
const availW = W - LEGEND_W - 2 * M;
const availH = H - 2 * M;
const size = Math.min(availW, availH); // square area for cluster
const radius = size / 2 - 80;          // leave room for leaf labels

const cx = LEGEND_W + availW / 2 + M;  // cluster center X
const cy = H / 2;                      // center vertically

const svg = d3.create("svg")
    .attr("viewBox", [0, 0, W, H])
    .attr("style", "width:100vw;height:100vh;display:block;font:10px system-ui, sans-serif;background:#fff;");

const gMain = svg.append("g").attr("transform", `translate(${cx},${cy})`);

const tree = d3.cluster()
    .size([2 * Math.PI, radius])
    .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

const root = tree(
    d3.hierarchy(data)
        .sum(d => d.value ?? 0)
        .sort((a, b) => d3.ascending(a.data.name, b.data.name))
);

/* Links */
gMain.append("g")
    .attr("fill", "none")
    .attr("stroke", "#555")
    .attr("stroke-opacity", 0.35)
    .attr("stroke-width", 1.2)
    .selectAll()
    .data(root.links())
    .join("path")
    .attr("d", d3.linkRadial()
        .angle(d => d.x)
        .radius(d => d.y));

/* Nodes */
gMain.append("g")
    .selectAll()
    .data(root.descendants())
    .join("circle")
    .attr("transform", d => `rotate(${(d.x * 180 / Math.PI) - 90}) translate(${d.y},0)`)
    .attr("fill", d => branchColors.get(topBranch(d)) ?? "#999")
    .attr("r", d => rScale(d.value || d.data.value || 0));

/* Labels (exclude root for custom center text) */
gMain.append("g")
    .attr("stroke-linejoin", "round")
    .attr("stroke-width", 3)
    .selectAll()
    .data(root.descendants().filter(d => d.depth !== 0))
    .join("text")
    .attr("transform", d =>
        `rotate(${(d.x * 180 / Math.PI) - 90}) translate(${d.y},0) rotate(${d.x >= Math.PI ? 180 : 0})`)
    .attr("dy", "0.31em")
    .attr("x", d => (d.x < Math.PI) === !d.children ? 6 : -6)
    .attr("text-anchor", d => (d.x < Math.PI) === !d.children ? "start" : "end")
    .attr("paint-order", "stroke")
    .attr("stroke", "white")
    .attr("fill", d => branchColors.get(topBranch(d)) ?? "currentColor")
    .text(d => d.data.name);

/* Legend (top-left) */
const legendY = 160; // leave room for copy above
const legendInnerX = 24; // padding before bullets
const legend = svg.append('g')
    .attr('font-size', 14)
    .attr('transform', `translate(${M + legendInnerX}, ${legendY})`);

legend.selectAll('g')
    .data(Array.from(branchColors.entries()))
    .join('g')
    .attr('transform', (_, i) => `translate(${(i % 2) * 160}, ${Math.floor(i / 2) * 22})`)
    .call(g => g.append('circle').attr('r', 7).attr('fill', d => d[1]))
    .call(g => g.append('text').attr('x', 14).attr('dy', '0.32em').style('font-size', '13px').text(d => d[0]));

/* === Interactivity === */
const nodes = gMain.selectAll('circle');
const links = gMain.selectAll('path');
const labelsTxt = gMain.selectAll('g text');

// Center label for focus state
const centerLabel = gMain.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .attr('font-size', 18)
    .attr('font-weight', 600)
    .attr('fill', '#111')
    .attr('opacity', 0);

let focused = null;
function applyFocus(branch) {
    focused = branch;
    centerLabel
        .text(branch)
        .attr('opacity', 1)
        .attr('fill', branchColors.get(branch) ?? '#333')
        .attr('font-size', 16);
    nodes.transition().style('opacity', d => topBranch(d) === branch ? 1 : 0.1);
    labelsTxt.transition().style('opacity', d => topBranch(d) === branch ? 1 : 0.1);
    links.transition().style('stroke-opacity', d => topBranch(d.source) === branch ? 0.35 : 0.05);
}
function clearFocus() {
    focused = null;
    centerLabel.attr('opacity', 0);
    nodes.transition().style('opacity', 1);
    labelsTxt.transition().style('opacity', 1);
    links.transition().style('stroke-opacity', 0.35);
}

// Legend click handlers
legend.selectAll('g').style('cursor', 'pointer').on('click', (_, d) => {
    const branch = d[0];
    if (focused === branch) clearFocus(); else applyFocus(branch);
});

// Hover path highlight
function highlightPath(d) {
    const pathNodes = new Set(d.ancestors());
    nodes.style('opacity', n => pathNodes.has(n) ? 1 : 0.15);
    labelsTxt.style('opacity', n => pathNodes.has(n) ? 1 : 0.15);
    links.style('stroke-opacity', l => (pathNodes.has(l.source) && pathNodes.has(l.target)) ? 0.6 : 0.05);
}
function clearHover() {
    if (focused) { applyFocus(focused); return; }
    nodes.style('opacity', 1);
    labelsTxt.style('opacity', 1);
    links.style('stroke-opacity', 0.35);
}

nodes.on('mouseover', (event, d) => highlightPath(d))
    .on('mouseout', clearHover);
labelsTxt.on('mouseover', (event, d) => highlightPath(d))
    .on('mouseout', clearHover);

// Tooltip (simple)
const tooltip = d3.select('body').append('div')
    .style('position', 'fixed')
    .style('pointer-events', 'none')
    .style('padding', '4px 8px')
    .style('font', '12px/1.3 -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif')
    .style('background', 'rgba(0,0,0,0.7)')
    .style('color', '#fff')
    .style('border-radius', '4px')
    .style('opacity', 0);

function showTip(event, d) {
    const crumbs = d.ancestors().reverse().map(n => n.data.name).join(' › ');
    tooltip.text(crumbs)
        .style('left', (event.clientX + 12) + 'px')
        .style('top', (event.clientY + 12) + 'px')
        .transition().style('opacity', 1);
}
function hideTip() { tooltip.transition().style('opacity', 0); }

nodes.on('mousemove', showTip).on('mouseleave', hideTip);
labelsTxt.on('mousemove', showTip).on('mouseleave', hideTip);

// Hide legend in thumbnail
if (window.self !== window.top) {
    legend.attr('display', 'none');
}

// Center title removed as per design feedback

// append SVG to DOM then draw legend box
document.body.appendChild(svg.node());

const legendBox = legend.node().getBBox();
legend.insert("rect", ":first-child")
    .attr("x", legendBox.x - legendInnerX + 4)
    .attr("y", legendBox.y - 12)
    .attr("width", legendBox.width + legendInnerX + 8)
    .attr("height", legendBox.height + 24)
    .attr("fill", "white")
    .attr("stroke", "none")
    .attr("rx", 6);