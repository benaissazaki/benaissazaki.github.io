import * as THREE from '/vendor/three/three.module.min.js';

// A small low-poly room with one bookcase: books on top, games in the middle, movies at the bottom.
// Items are boxes with canvas or image textures; click one to pick it up, drag to turn it over.

const root = document.getElementById('library-room');
const canvas = root.querySelector('canvas');
const tip = root.querySelector('.library-room__tip');
const card = root.querySelector('.library-room__card');
const loading = root.querySelector('.library-room__loading');
const data = JSON.parse(document.getElementById('library-data').textContent);

const css = getComputedStyle(document.documentElement);
const token = function (name) { return css.getPropertyValue(name).trim(); };
const C = {
    ink: token('--ink'), paper: token('--paper'), accent: token('--accent'),
    sun: token('--sun'), teal: token('--teal'), bg: token('--bg'), grid: token('--bg-grid')
};
const PIXEL_FONT = '"Departure Mono", monospace';
const EMOJI_FONT = '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';

let renderer;
try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
} catch (e) {
    root.classList.add('is-unsupported');
    loading.textContent = 'Your browser can\'t show the 3D room, sorry. Try a recent Firefox or Chrome.';
    throw e;
}

await document.fonts.load('24px ' + PIXEL_FONT).catch(function () {});

/* ---------- textures ---------- */

function canvasTexture(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
}

function wrap(ctx, text, maxWidth) {
    const lines = [];
    let line = '';
    text.split(' ').forEach(function (word) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = test;
        }
    });
    if (line) lines.push(line);
    return lines;
}

function fitFont(ctx, text, maxWidth, size) {
    do {
        ctx.font = size + 'px ' + PIXEL_FONT;
        size -= 1;
    } while (ctx.measureText(text).width > maxWidth && size > 8);
}

function shade(hex, amount) {
    const c = new THREE.Color(hex);
    c.offsetHSL(0, 0, amount);
    return '#' + c.getHexString();
}

function frontCover(item, kind) {
    return canvasTexture(256, 360, function (ctx, w, h) {
        ctx.fillStyle = item.color;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = C.ink;
        ctx.fillRect(0, 0, w, 38);
        ctx.fillStyle = C.sun;
        ctx.font = '18px ' + PIXEL_FONT;
        ctx.textBaseline = 'middle';
        ctx.fillText(kind === 'games' ? item.platform : 'FILM', 12, 20);
        ctx.textAlign = 'right';
        ctx.fillText(String(item.year), w - 12, 20);

        ctx.textAlign = 'center';
        ctx.fillStyle = shade(item.color, 0.12);
        ctx.beginPath();
        ctx.arc(w / 2, 140, 74, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '96px ' + EMOJI_FONT;
        ctx.fillText(item.motif || '★', w / 2, 146);

        ctx.fillStyle = C.paper;
        ctx.font = '25px ' + PIXEL_FONT;
        const lines = wrap(ctx, item.title.toUpperCase(), w - 28).slice(0, 3);
        lines.forEach(function (l, i) { ctx.fillText(l, w / 2, 248 + i * 28); });
        ctx.fillStyle = C.sun;
        ctx.font = '15px ' + PIXEL_FONT;
        ctx.fillText(item.by, w / 2, h - 22);
    });
}

function backCover(item) {
    return canvasTexture(256, 360, function (ctx, w, h) {
        ctx.fillStyle = shade(item.color, -0.08);
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = C.paper;
        ctx.font = '20px ' + PIXEL_FONT;
        wrap(ctx, item.title, w - 32).slice(0, 3).forEach(function (l, i) { ctx.fillText(l, 16, 40 + i * 24); });
        ctx.fillStyle = C.sun;
        ctx.font = '15px ' + PIXEL_FONT;
        ctx.fillText(item.by + ' · ' + item.year, 16, 124);
        ctx.fillStyle = C.paper;
        ctx.font = '14px ' + PIXEL_FONT;
        wrap(ctx, item.note || '', w - 32).slice(0, 6).forEach(function (l, i) {
            ctx.fillText(l, 16, 160 + i * 20);
        });
        // a fake barcode, because every back cover has one
        ctx.fillStyle = C.paper;
        ctx.fillRect(w - 110, h - 70, 94, 54);
        ctx.fillStyle = C.ink;
        let x = w - 104;
        let seed = hash(item.title);
        while (x < w - 24) {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            const bar = 1 + (seed % 3);
            ctx.fillRect(x, h - 64, bar, 40);
            x += bar + 1 + (seed % 2);
        }
        ctx.font = '11px ' + PIXEL_FONT;
        ctx.fillStyle = C.paper;
        ctx.fillText('benaissazaki.space', 16, h - 40);
        ctx.fillText('/library', 16, h - 24);
    });
}

function spine(item, w, h, size) {
    return canvasTexture(w, h, function (ctx) {
        ctx.fillStyle = item.color;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = C.sun;
        ctx.fillRect(0, 10, w, 4);
        ctx.fillRect(0, h - 14, w, 4);
        ctx.save();
        ctx.translate(w / 2, 24);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = C.paper;
        fitFont(ctx, item.title.toUpperCase(), h - 48, size);
        ctx.textBaseline = 'middle';
        ctx.fillText(item.title.toUpperCase(), 0, 0);
        ctx.restore();
    });
}

const pagesTexture = canvasTexture(64, 64, function (ctx, w, h) {
    ctx.fillStyle = '#efe6cf';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#d8ccae';
    for (let y = 2; y < h; y += 4) ctx.fillRect(0, y, w, 1);
});

function hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}

const loader = new THREE.TextureLoader();

function imageMaterial(url, fallback) {
    const mat = new THREE.MeshLambertMaterial({ map: fallback });
    loader.load(url, function (tex) {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        mat.map = tex;
        mat.needsUpdate = true;
    });
    return mat;
}

const lambert = function (opts) { return new THREE.MeshLambertMaterial(opts); };

/* ---------- scene ---------- */

const scene = new THREE.Scene();
scene.background = new THREE.Color(C.ink);
const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 20);
const LOOK = new THREE.Vector3(0, 0.66, 0);

const hemi = new THREE.HemisphereLight(0xfff4e0, 0x404860, 1.9);
const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(0.8, 2, 2.5);
const lamp = new THREE.PointLight(0xffc27a, 2.2, 4, 1.5);
lamp.position.set(1.04, 1.35, 0.4);
scene.add(hemi, key, lamp);

function box(w, h, d, material, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
}

// room
const wallpaper = canvasTexture(64, 64, function (ctx, w, h) {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = C.grid;
    ctx.fillRect(0, 0, w, 2);
    ctx.fillRect(0, 0, 2, h);
});
wallpaper.wrapS = wallpaper.wrapT = THREE.RepeatWrapping;
wallpaper.repeat.set(24, 8);
const wallMat = lambert({ map: wallpaper });
box(8, 3, 0.05, wallMat, 0, 1.5, -0.22);
const sideWall = lambert({ map: wallpaper.clone() });
sideWall.map.repeat.set(10, 8);
sideWall.map.needsUpdate = true;
box(0.05, 3, 4, sideWall, -1.9, 1.5, 1.7);
box(0.05, 3, 4, sideWall, 1.9, 1.5, 1.7);

const planks = canvasTexture(128, 128, function (ctx, w, h) {
    for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 ? '#7a4f2e' : '#6c4428';
        ctx.fillRect(0, i * 16, w, 16);
        ctx.fillStyle = '#4a2e18';
        ctx.fillRect(0, i * 16, w, 1);
        ctx.fillRect(((i * 37) % w), i * 16, 1, 16);
    }
});
planks.wrapS = planks.wrapT = THREE.RepeatWrapping;
planks.repeat.set(6, 6);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), lambert({ map: planks }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
box(8, 0.08, 0.03, lambert({ color: C.paper }), 0, 0.04, -0.19);

const rug = canvasTexture(128, 64, function (ctx, w, h) {
    ctx.fillStyle = C.accent;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = C.sun;
    ctx.fillRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = C.accent;
    ctx.fillRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = C.ink;
    for (let x = 18; x < w - 18; x += 12) ctx.fillRect(x, h / 2 - 2, 6, 4);
});
const rugMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), lambert({ map: rug }));
rugMesh.rotation.x = -Math.PI / 2;
rugMesh.position.set(0, 0.002, 0.75);
scene.add(rugMesh);

// bookcase
const WOOD = lambert({ color: '#8a5a33' });
const WOOD_DARK = lambert({ color: '#5e3b20' });
const CASE_W = 1.36, SHELF_H = 0.34, T = 0.025, DEPTH = 0.3, BASE = 0.08;
const CASE_H = 3 * SHELF_H + 4 * T;
box(CASE_W, CASE_H + BASE, 0.02, WOOD_DARK, 0, (CASE_H + BASE) / 2, -DEPTH / 2);
box(T, CASE_H + BASE, DEPTH, WOOD, -CASE_W / 2, (CASE_H + BASE) / 2, 0);
box(T, CASE_H + BASE, DEPTH, WOOD, CASE_W / 2, (CASE_H + BASE) / 2, 0);
box(CASE_W, BASE, DEPTH, WOOD_DARK, 0, BASE / 2, 0.005);
const shelfFloor = [];
for (let i = 0; i < 4; i++) {
    const y = BASE + T / 2 + i * (SHELF_H + T);
    box(CASE_W, T, DEPTH, WOOD, 0, y, 0);
    shelfFloor.push(y + T / 2);
}

function plate(text, y) {
    const tex = canvasTexture(128, 32, function (ctx, w, h) {
        ctx.fillStyle = '#c9a227';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#6e5511';
        ctx.fillRect(2, 2, w - 4, h - 4);
        ctx.fillStyle = '#e8c860';
        ctx.fillRect(4, 4, w - 8, h - 8);
        ctx.fillStyle = C.ink;
        ctx.font = '18px ' + PIXEL_FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, w / 2, h / 2 + 1);
    });
    box(0.16, 0.04, 0.004, lambert({ map: tex }), 0, y, DEPTH / 2 + 0.003);
}
plate('MOVIES', shelfFloor[0] - T / 2);
plate('GAMES', shelfFloor[1] - T / 2);
plate('BOOKS', shelfFloor[2] - T / 2);

// a sign above the bookcase
const sign = canvasTexture(256, 64, function (ctx, w, h) {
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = C.sun;
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = C.sun;
    ctx.font = '30px ' + PIXEL_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('~ LIBRARY ~', w / 2, h / 2 + 2);
});
box(0.62, 0.155, 0.02, lambert({ map: sign, emissive: 0x332200 }), 0, CASE_H + BASE + 0.16, -0.19);

// floor lamp
box(0.02, 1.3, 0.02, lambert({ color: C.ink }), 1.04, 0.65, 0.35);
box(0.24, 0.02, 0.24, lambert({ color: C.ink }), 1.04, 0.01, 0.35);
const shade3 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.17, 0.2, 8, 1, true),
    lambert({ color: C.sun, emissive: 0x996a10, side: THREE.DoubleSide }));
shade3.position.set(1.04, 1.38, 0.35);
scene.add(shade3);

// a snake plant in a terracotta pot
(function () {
    const PX = -1.02, PZ = 0.3;
    const terracotta = lambert({ color: '#c4622d' });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.06, 0.16, 8), terracotta);
    pot.position.set(PX, 0.08, PZ);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.03, 8), lambert({ color: '#a94f22' }));
    rim.position.set(PX, 0.16, PZ);
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.01, 8), lambert({ color: '#3b2615' }));
    soil.position.set(PX, 0.17, PZ);
    scene.add(pot, rim, soil);
    // tall, flat, pointed leaves fanning out from the soil
    const greens = [lambert({ color: '#3f7a3a' }), lambert({ color: '#5a9a48' })];
    [[0, 0.46, 0, 0], [0.03, 0.38, 0.25, 0.9], [-0.03, 0.4, -0.22, 2.1], [0.02, 0.33, 0.35, 3.3],
        [-0.02, 0.36, -0.3, 4.4], [0.035, 0.28, 0.45, 5.4], [-0.035, 0.3, -0.45, 1.5]].forEach(function (l, i) {
        const h = l[1];
        const geo = new THREE.ConeGeometry(0.028, h, 4);
        geo.translate(0, h / 2, 0);
        geo.scale(1, 1, 0.3);
        const leaf = new THREE.Mesh(geo, greens[i % 2]);
        leaf.position.set(PX + l[0], 0.17, PZ + l[0] * 0.6);
        leaf.rotation.set(0, l[3], l[2]);
        scene.add(leaf);
    });
})();

/* ---------- items ---------- */

const items = [];
const FRONT = DEPTH / 2 - 0.015;

function addItem(mesh, item, kind, index) {
    // item textures are seen up close and at an angle
    mesh.material.forEach(function (m) {
        if (m.map) m.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
    });
    mesh.userData = {
        item: item, kind: kind, index: index,
        home: mesh.position.clone(), homeQuat: mesh.quaternion.clone(),
        hover: 0
    };
    scene.add(mesh);
    items.push(mesh);
}

// books stand spine-out; the front cover is the +x face
(function () {
    const W = 0.17;
    const list = data.books;
    const thick = list.map(function (b) { return 0.04 + (hash(b.title) % 25) / 1000; });
    const total = thick.reduce(function (a, b) { return a + b + 0.004; }, 0);
    let x = -0.42 - total / 2;
    list.forEach(function (b, i) {
        const h = b.aspect ? Math.min(0.3, W * b.aspect) : 0.25 + (hash(b.by + b.title) % 35) / 1000;
        const t = thick[i];
        const back = backCover(b);
        const front = b.cover ? imageMaterial(b.cover, frontCover(b, 'books')) : lambert({ map: frontCover(b, 'books') });
        const pages = lambert({ map: pagesTexture });
        const mats = [front, lambert({ map: back }), pages, pages, lambert({ map: spine(b, 48, 320, 22) }), pages];
        const m = new THREE.Mesh(new THREE.BoxGeometry(t, h, W), mats);
        m.position.set(x + t / 2, shelfFloor[2] + h / 2, FRONT - W / 2);
        x += t + 0.004;
        addItem(m, b, 'books', i);
    });
    // bookends
    box(0.02, 0.14, 0.12, lambert({ color: C.ink }), -0.42 - total / 2 - 0.012, shelfFloor[2] + 0.07, FRONT - 0.09);
    box(0.02, 0.14, 0.12, lambert({ color: C.ink }), -0.42 + total / 2 + 0.01, shelfFloor[2] + 0.07, FRONT - 0.09);
    // a stack of nameless books and a floppy disk on the rest of the shelf
    [['#2a9d8f', 0.30], ['#5c3dbd', 0.27], ['#141b33', 0.31]].forEach(function (s, i) {
        box(s[1] * 0.75, 0.035, 0.18, lambert({ color: s[0] }), 0.32, shelfFloor[2] + 0.0175 + i * 0.036, FRONT - 0.1);
    });
    const floppy = canvasTexture(64, 64, function (ctx, w, h) {
        ctx.fillStyle = C.ink;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#9aa4b8';
        ctx.fillRect(16, 0, 32, 20);
        ctx.fillStyle = C.paper;
        ctx.fillRect(10, 30, 44, 30);
        ctx.fillStyle = C.accent;
        ctx.fillRect(14, 34, 36, 4);
    });
    const f = box(0.09, 0.09, 0.004, lambert({ map: floppy }), 0.32, shelfFloor[2] + 0.15, FRONT - 0.08);
    f.rotation.set(-0.25, 0.3, 0.1);
})();

// games and movies stand face-out, leaning back a little; the front is the +z face
function caseRow(list, kind, shelf) {
    const gap = 0.022;
    const sizes = list.map(function (g) {
        // real covers set the case's proportions so they aren't stretched
        if (g.aspect) return [0.135, Math.min(0.205, 0.135 * g.aspect)];
        if (g.platform === 'PS1') return [0.142, 0.124];
        if (g.platform === 'PS5') return [0.135, 0.17];
        return [0.135, 0.19];
    });
    const total = sizes.reduce(function (a, s) { return a + s[0] + gap; }, -gap);
    let x = -total / 2;
    list.forEach(function (g, i) {
        const w = sizes[i][0], h = sizes[i][1], d = 0.014;
        const front = g.cover ? imageMaterial(g.cover, frontCover(g, kind)) : lambert({ map: frontCover(g, kind) });
        const edge = lambert({ color: shade(g.color, -0.1) });
        const mats = [edge, lambert({ map: spine(g, 24, 280, 14) }), edge, edge, front, lambert({ map: backCover(g) })];
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
        m.rotation.x = -0.12;
        m.position.set(x + w / 2, shelfFloor[shelf] + h / 2 * Math.cos(0.12), FRONT - 0.05 - h / 2 * Math.sin(0.12));
        x += w + gap;
        addItem(m, g, kind, i);
    });
}
caseRow(data.games, 'games', 1);
caseRow(data.movies, 'movies', 0);

/* ---------- inspecting ---------- */

const dim = new THREE.Mesh(new THREE.PlaneGeometry(4, 4),
    new THREE.MeshBasicMaterial({ color: 0x0a0e1c, transparent: true, opacity: 0, depthWrite: false }));
dim.position.set(0, 0, -0.8);
camera.add(dim);
// a light from the viewer's side, only while something is held, so covers read clearly
const inspectLight = new THREE.DirectionalLight(0xffffff, 0);
inspectLight.position.set(0.2, 0.3, 0);
inspectLight.target.position.set(0, 0, -1);
camera.add(inspectLight, inspectLight.target);
scene.add(camera);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(9, 9);
const parallax = new THREE.Vector2();
let hovered = null;
let held = null;
let anim = null;
let drag = null;
let spin = { x: 0, y: 0 };
const KIND_LABEL = { books: 'Book', games: 'Video game', movies: 'Movie' };

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

function inspectPose(mesh) {
    // on narrow screens the info card sits at the bottom, so hold things higher and further away
    const narrow = camera.aspect < 1;
    const pos = new THREE.Vector3(0, narrow ? 0.05 : 0, narrow ? -0.72 : -0.5).applyMatrix4(camera.matrixWorld);
    const q = camera.quaternion.clone();
    if (mesh.userData.kind === 'books') q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0)));
    return { pos: pos, quat: q };
}

function pickUp(mesh) {
    if (anim) return;
    if (held && held !== mesh) putBack(function () { pickUp(mesh); });
    if (held) return;
    held = mesh;
    spin = { x: 0, y: 0 };
    const pose = inspectPose(mesh);
    anim = { mesh: mesh, from: mesh.position.clone(), fromQ: mesh.quaternion.clone(), to: pose.pos, toQ: pose.quat, t: 0, dim: 0.6 };
    const it = mesh.userData.item;
    card.querySelector('.library-room__kind').textContent = KIND_LABEL[mesh.userData.kind] + (it.platform ? ' · ' + it.platform : '');
    card.querySelector('.library-room__title').textContent = it.title;
    card.querySelector('.library-room__meta').textContent = it.by + ', ' + it.year;
    card.querySelector('.library-room__note').textContent = it.note || '';
    card.hidden = false;
    tip.hidden = true;
}

function putBack(done) {
    if (!held || anim) return;
    const mesh = held;
    anim = {
        mesh: mesh, from: mesh.position.clone(), fromQ: mesh.quaternion.clone(),
        to: mesh.userData.home, toQ: mesh.userData.homeQuat, t: 0, dim: 0,
        done: function () { held = null; if (done) done(); }
    };
    card.hidden = true;
}

function setPointer(e) {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    return r;
}

canvas.addEventListener('pointermove', function (e) {
    const r = setPointer(e);
    if (drag && held && !anim) {
        spin.y += (e.clientX - drag.x) * 0.012;
        spin.x = Math.max(-1.2, Math.min(1.2, spin.x + (e.clientY - drag.y) * 0.012));
        drag.moved += Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y);
        drag.x = e.clientX;
        drag.y = e.clientY;
    }
    if (hovered && !held) {
        tip.textContent = hovered.userData.item.title;
        tip.style.left = (e.clientX - r.left) + 'px';
        tip.style.top = (e.clientY - r.top) + 'px';
    }
});

canvas.addEventListener('pointerleave', function () { pointer.set(9, 9); });

canvas.addEventListener('pointerdown', function (e) {
    setPointer(e);
    drag = { x: e.clientX, y: e.clientY, moved: 0 };
    if (held) canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointerup', function (e) {
    const moved = drag ? drag.moved : 0;
    drag = null;
    if (moved > 6) return;
    if (held) {
        raycaster.setFromCamera(pointer, camera);
        if (!raycaster.intersectObject(held).length) putBack();
    } else if (hovered) {
        pickUp(hovered);
    }
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && held) putBack();
});
card.querySelector('.library-room__back').addEventListener('click', function () { putBack(); });

/* ---------- loop ---------- */

function resize() {
    const w = root.clientWidth, h = root.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // back off until the whole bookcase (and a bit of room) fits
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // on narrow screens frame just the bookcase; on wide ones show the lamp and plant too
    camera.position.z = Math.max(0.82 / tan, (camera.aspect < 1 ? 0.78 : 1.45) / (tan * camera.aspect));
    camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(root);
resize();

const clock = new THREE.Clock();
const tmpQ = new THREE.Quaternion();

function frame() {
    const dt = Math.min(0.05, clock.getDelta());

    if (!held) {
        parallax.lerp(pointer.x > 2 ? new THREE.Vector2() : pointer, 0.05);
        camera.position.x = parallax.x * 0.12;
        camera.position.y = 0.72 + parallax.y * 0.06;
        camera.lookAt(LOOK);
    }
    camera.updateMatrixWorld();

    // hover: pull the item slightly towards you
    if (!held && !anim && pointer.x < 2) {
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(items)[0];
        hovered = hit ? hit.object : null;
    } else if (pointer.x > 2) {
        hovered = null;
    }
    canvas.style.cursor = held ? 'grab' : (hovered ? 'pointer' : 'default');
    tip.hidden = !hovered || !!held;
    items.forEach(function (m) {
        if (m === held || (anim && anim.mesh === m)) return;
        m.userData.hover += ((m === hovered ? 1 : 0) - m.userData.hover) * 0.2;
        m.position.copy(m.userData.home);
        m.position.z += m.userData.hover * 0.05;
        m.position.y += m.userData.hover * 0.01;
    });

    if (anim) {
        anim.t = Math.min(1, anim.t + dt / 0.45);
        const k = easeOut(anim.t);
        anim.mesh.position.lerpVectors(anim.from, anim.to, k);
        anim.mesh.quaternion.slerpQuaternions(anim.fromQ, anim.toQ, k);
        dim.material.opacity += (anim.dim - dim.material.opacity) * 0.25;
        inspectLight.intensity = anim.dim ? 1.6 * k : 1.6 * (1 - k);
        if (anim.t >= 1) {
            const done = anim.done;
            anim = null;
            if (done) done();
        }
    } else if (held) {
        const pose = inspectPose(held);
        tmpQ.copy(pose.quat)
            .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(spin.x, spin.y, 0, 'YXZ')));
        held.quaternion.slerp(tmpQ, 0.25);
        held.position.lerp(pose.pos, 0.25);
        dim.material.opacity += (0.6 - dim.material.opacity) * 0.25;
    } else {
        dim.material.opacity += (0 - dim.material.opacity) * 0.25;
    }

    renderer.render(scene, camera);
    if (loading) loading.hidden = true;
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.eggs.library = { pickUp: pickUp, items: items };
