// =========================
// Interactive Galaxy Map - p5.js
// Optimized & Cleaned
// =========================
let showLanding = true;
let starExploding = false;
let starExplosionProgress = 0;
let stars = [];
let nebulae = [];
let galaxies = [];
let blackholes = [];
let galaxyW, galaxyH;
let galaxyBuffer;
let offsetX = 0, offsetY = 0;
let dragging = false;
let lastMouseX, lastMouseY;
let panVX = 0, panVY = 0;
let panVXAvg = 0, panVYAvg = 0;
let selectedObject = null;
let selectedType = "";
let selectedName = "";
let panLeft = false, panRight = false, panUp = false, panDown = false;
let labelAnimStart = 0;
let labelAnimDuration = 200;
let labelAnimActive = false;
let labelAnimReverse = false;
let labelLineStart = null;
let labelLineEnd = null;
const MAX_PAN_VEL = 1000;
let zoomLevel = 1.0;
let kodeMonoFont;
// --- Add new object arrays ---
let starClusters = [];
let pulsars = [];
let quasars = [];
// Use typed arrays for stars for faster access
let starsX = new Float32Array(1200);
let starsY = new Float32Array(1200);
let starsR = new Float32Array(1200);
let starsB = new Uint8Array(1200);
// =========================
// 2. Setup & Initialization
// =========================
function preload() {
  // Try to load Kode Mono font, fallback to null if missing
  try {
    kodeMonoFont = loadFont('KodeMono-Regular.ttf');
  } catch (e) {
    kodeMonoFont = null;
  }
}
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(RGB, 255, 255, 255, 255); // Switch to RGB color mode
  if (kodeMonoFont) {
    textFont(kodeMonoFont);
  } else {
    textFont('monospace'); // fallback to system monospace font
  }
  galaxyW = windowWidth * 6;
  galaxyH = windowHeight * 6;
  galaxyBuffer = createGraphics(galaxyW, galaxyH);
  galaxyBuffer.colorMode(RGB, 255, 255, 255, 255); // Also set for buffer
  // Generate stars using typed arrays
  for (let i = 0; i < 1200; i++) {
    starsX[i] = random(galaxyW);
    starsY[i] = random(galaxyH);
    starsR[i] = random(0.5, 2.5);
    starsB[i] = random(180, 255);
  }
  // Batch generate nebulae, galaxies, and blackholes
  let nebulaBatch = [];
  for (let i = 0; i < 3; i++) nebulaBatch.push([random(galaxyW), random(galaxyH)]);
  nebulaBatch.forEach(pos => addNebula(pos[0], pos[1], false));
  let galaxyBatch = [];
  for (let i = 0; i < 3; i++) galaxyBatch.push([random(galaxyW), random(galaxyH)]);
  galaxyBatch.forEach(pos => addGalaxy(pos[0], pos[1], false));
  let blackholeBatch = [];
  for (let i = 0; i < 2; i++) blackholeBatch.push([random(galaxyW), random(galaxyH)]);
  blackholeBatch.forEach(pos => addBlackhole(pos[0], pos[1], false));
  offsetX = galaxyW / 2;
  offsetY = galaxyH / 2;
  redrawBuffer();
}
// =========================
// 3. Main Rendering Loop
// =========================
function draw() {
  const w2 = width >> 1, h2 = height >> 1;
  background(5, 5, 5);
  cursor(CROSS);
  if (showLanding) {
    drawLandingScreen();
    return;
  }
  // Cache offset and zoom calculations
  let ox = offsetX, oy = offsetY, gw = galaxyW, gh = galaxyH, zl = zoomLevel;
  push();
  translate(w2, h2);
  scale(zl);
  image(galaxyBuffer, -ox, -oy, gw, gh);
  // Only check wraparound if near edge (avoid unnecessary checks)
  if (ox < w2) image(galaxyBuffer, -ox + gw, -oy, gw, gh);
  if (ox > gw - w2) image(galaxyBuffer, -ox - gw, -oy, gw, gh);
  if (oy < h2) image(galaxyBuffer, -ox, -oy + gh, gw, gh);
  if (oy > gh - h2) image(galaxyBuffer, -ox, -oy - gh, gw, gh);
  if (ox < w2 && oy < h2) image(galaxyBuffer, -ox + gw, -oy + gh, gw, gh);
  if (ox > gw - w2 && oy < h2) image(galaxyBuffer, -ox - gw, -oy + gh, gw, gh);
  if (ox < w2 && oy > gh - h2) image(galaxyBuffer, -ox + gw, -oy - gh, gw, gh);
  if (ox > gw - w2 && oy > gh - h2) image(galaxyBuffer, -ox - gw, -oy - gh, gw, gh);
  pop();
  handlePanning();
  drawLabel();
  drawInstructions();
  drawMouseCoords();
}
function drawLandingScreen() {
  // Cache font and text settings
  let cachedFont = kodeMonoFont || 'monospace';
  textFont(cachedFont);
  fill(255, 255, 255, 230);
  rect(0, 0, width, height);
  fill(30, 30, 30);
  textSize(54);
  textAlign(CENTER, CENTER);
  text("Point Zer0", width / 2, height * 0.32);
  let cx = width / 2, cy = height / 2;
  let t = millis() * 0.002;
  let oscSize = 1 + sin(t * 2.1) * 0.08;
  let oscRot = sin(t * 1.3) * 0.12;
  let baseStarSize = 70;
  let starSize = (baseStarSize + starExplosionProgress * 60) * oscSize;
  let starAlpha = 255 - starExplosionProgress * 180;
  // Glitch logic
  // Use a single global for glitch state
  if (!window.starGlitch) {
    window.starGlitch = {active: false, next: millis() + random(1800, 4000), end: 0, scale: 1, rot: 0};
  }
  let glitch = window.starGlitch;
  let now = millis();
  if (!glitch.active && now > glitch.next) {
    glitch.active = true;
    glitch.end = now + random(30, 70);
    glitch.scale = random(0.7, 1.3);
    glitch.rot = random(-0.5, 0.5);
  }
  if (glitch.active && now > glitch.end) {
    glitch.active = false;
    glitch.next = now + random(1800, 4000);
  }
  let drawCx = cx, drawCy = cy, drawSize = starSize, drawRot = starExplosionProgress * PI / 6 + oscRot;
  if (glitch.active) {
    drawCx += random(-18, 18);
    drawCy += random(-18, 18);
    drawSize *= glitch.scale;
    drawRot += glitch.rot;
  }
  push();
  translate(drawCx, drawCy);
  rotate(drawRot);
  noStroke();
  let glitchColor = glitch.active
    ? ([ [255,40,40], [40,255,40], [40,40,255] ])[Math.floor(Math.random()*3)]
    : [5,5,5];
  fill(glitchColor[0], glitchColor[1], glitchColor[2], starAlpha);
  for (let d = -1; d <= 1; d += 2) {
    triangle(0, d * drawSize, -drawSize * 0.22, 0, drawSize * 0.22, 0);
    triangle(d * drawSize, 0, 0, -drawSize * 0.22, 0, drawSize * 0.22);
  }
  pop();
  if (starExploding) {
    starExplosionProgress += 0.07;
    let expandSize = starSize + starExplosionProgress * max(width, height) * 2.2;
    let expandAlpha = min(255, starExplosionProgress * 320);
    push();
    translate(cx, cy);
    rotate(starExplosionProgress * PI / 6 + oscRot);
    noStroke();
    fill(5, 5, 5, expandAlpha);
    for (let d = -1; d <= 1; d += 2) {
      triangle(0, d * expandSize, -expandSize * 0.22, 0, expandSize * 0.22, 0);
      triangle(d * expandSize, 0, 0, -expandSize * 0.22, 0, expandSize * 0.22);
    }
    pop();
    if (expandSize > max(width, height) * 2.1) showLanding = false;
  }
  fill(5, 5, 5);
  textSize(28);
  textAlign(CENTER, CENTER);
  text("Create your universe", width / 2, height * 0.75);
}
// =========================
// 4. Panning & Zooming
// =========================
function handlePanning() {
  const panStep = 30;
  if (panLeft) offsetX -= panStep;
  if (panRight) offsetX += panStep;
  if (panUp) offsetY -= panStep;
  if (panDown) offsetY += panStep;
  offsetX += panVX;
  offsetY += panVY;
  panVX *= 0.97;
  panVY *= 0.97;
  panVX = constrain(panVX, -MAX_PAN_VEL, MAX_PAN_VEL);
  panVY = constrain(panVY, -MAX_PAN_VEL, MAX_PAN_VEL);
  if (abs(panVX) < 0.08) panVX = 0;
  if (abs(panVY) < 0.08) panVY = 0;
  // Wraparound for seamless transition
  if (offsetX < 0) offsetX += galaxyW;
  if (offsetX >= galaxyW) offsetX -= galaxyW;
  if (offsetY < 0) offsetY += galaxyH;
  if (offsetY >= galaxyH) offsetY -= galaxyH;
}
// =========================
// 5. Label & Info Display
// =========================
let prevSelectedObject = null, prevSelectedType = "", prevSelectedName = "", prevLabelLineStart = null, prevLabelLineEnd = null;
function getBorderScale(type) {
  switch (type) {
    case "nebula": return 0.5;
    case "galaxy": return 1;
    case "starcluster": return 1;
    case "quasar": return 4;
    case "blackhole":
    case "pulsar": return 6;
    default: return 1;
  }
}
function drawLabel() {
  textFont(kodeMonoFont || 'monospace');
  let obj = labelAnimReverse && prevSelectedObject ? prevSelectedObject : selectedObject;
  let type = labelAnimReverse && prevSelectedType ? prevSelectedType : selectedType;
  let name = labelAnimReverse && prevSelectedName ? prevSelectedName : selectedName;
  let lineStart = labelAnimReverse && prevLabelLineStart ? prevLabelLineStart : labelLineStart;
  let lineEnd = labelAnimReverse && prevLabelLineEnd ? prevLabelLineEnd : labelLineEnd;
  if (obj && lineEnd && lineStart) {
    let animProgress = min(1, (millis() - labelAnimStart) / labelAnimDuration);
    if (labelAnimReverse) animProgress = 1 - animProgress;
    let r = obj.r || 40;
    let borderScale = getBorderScale(type);
    let side = r * zoomLevel * borderScale;
    let half = side / 2;
    let len = side * 0.22;
    let objScreenX = (obj.x - offsetX) + width / 2;
    let objScreenY = (obj.y - offsetY) + height / 2;
    // Clamp border to viewport
    objScreenX = constrain(objScreenX, half + 2, width - half - 2);
    objScreenY = constrain(objScreenY, half + 2, height - half - 2);
    let wipeLen = len * animProgress;
    blendMode(DIFFERENCE);
    stroke(255, 255, 0, 230);
    strokeWeight(3);
    noFill();
    // Border corners (clamped)
    line(objScreenX - half, objScreenY - half, objScreenX - half + wipeLen, objScreenY - half);
    line(objScreenX - half, objScreenY - half, objScreenX - half, objScreenY - half + wipeLen);
    line(objScreenX + half, objScreenY - half, objScreenX + half - wipeLen, objScreenY - half);
    line(objScreenX + half, objScreenY - half, objScreenX + half, objScreenY - half + wipeLen);
    line(objScreenX - half, objScreenY + half, objScreenX - half + wipeLen, objScreenY + half);
    line(objScreenX - half, objScreenY + half, objScreenX - half, objScreenY + half - wipeLen);
    line(objScreenX + half, objScreenY + half, objScreenX + half - wipeLen, objScreenY + half);
    line(objScreenX + half, objScreenY + half, objScreenX + half, objScreenY + half - wipeLen);
    blendMode(BLEND);
    // Label text
    if (!labelAnimReverse && animProgress >= 1) {
      fill(255);
      stroke(40, 20, 0, 180);
      strokeWeight(2);
      textSize(28);
      textAlign(LEFT, TOP);
      let labelX = objScreenX + half + 16;
      let labelY = objScreenY - half;
      // Clamp label to viewport (right and bottom edges)
      let labelWidth = textWidth(name) + 8;
      let labelHeight = 28 + 20 + 8;
      if (labelX + labelWidth > width) labelX = width - labelWidth;
      if (labelY + labelHeight > height) labelY = height - labelHeight;
      if (labelX < 0) labelX = 0;
      if (labelY < 0) labelY = 0;
      text(name, labelX, labelY);
      textSize(20);
      noStroke();
      fill(200);
      let classLabel = "";
      if (type === "galaxy") classLabel = "Galaxy";
      else if (type === "blackhole") classLabel = "Black Hole";
      else if (type === "nebula") classLabel = "Nebula";
      else if (type === "starcluster") classLabel = "Star Cluster";
      else if (type === "pulsar") classLabel = "Pulsar";
      else if (type === "quasar") classLabel = "Quasar";
      text(classLabel, labelX, labelY + 28);
      labelAnimActive = false;
    }
    if (labelAnimReverse && animProgress <= 0) {
      labelAnimActive = false;
      prevSelectedObject = null;
      prevSelectedType = "";
      prevSelectedName = "";
      prevLabelLineStart = null;
      prevLabelLineEnd = null;
    }
    pop();
  }
}
// =========================
// 6. Instructions & Mouse Coordinates
// =========================
function drawInstructions() {
  if (kodeMonoFont) {
    textFont(kodeMonoFont);
  } else {
    textFont('monospace');
  }
  // Responsive sizing
  let boxHeight = max(28, min(0.045 * height, 44));
  let fontSize = max(12, min(0.018 * width, 22));
  // Creation guide (top, simplified)
  let creationText = "1: Nebula   2: Galaxy   3: Blackhole   4: Star Cluster   5: Pulsar   6: Quasar   7: Size   8: Density   9: Color";
  let topBoxY = 0;
  noStroke();
  fill(10, 10, 10, 100);
  rect(0, topBoxY, width, boxHeight);
  fill(255);
  textSize(fontSize);
  textAlign(CENTER, CENTER);
  // Shrink font if text is too wide
  let maxTextWidth = width - 32;
  let actualFontSize = fontSize;
  while (textWidth(creationText) > maxTextWidth && actualFontSize > 10) {
    actualFontSize -= 1;
    textSize(actualFontSize);
  }
  text(creationText, width / 2, topBoxY + boxHeight / 2);

  // Navigation & actions guide (bottom, expanded)
  let navigationText = "Pan: Mouse/WASD/Arrows   Select: Click   H: Recenter   +/-: Zoom   Backspace: Delete Last   Delete: Delete All   Esc: Restart";
  let bottomBoxY = height - boxHeight;
  noStroke();
  fill(10, 10, 10, 100);
  rect(0, bottomBoxY, width, boxHeight);
  fill(255);
  textSize(fontSize);
  actualFontSize = fontSize;
  while (textWidth(navigationText) > maxTextWidth && actualFontSize > 10) {
    actualFontSize -= 1;
    textSize(actualFontSize);
  }
  text(navigationText, width / 2, bottomBoxY + boxHeight / 2);
}
function drawMouseCoords() {
  if (kodeMonoFont) {
    textFont(kodeMonoFont);
  } else {
    textFont('monospace');
  }
  let bufferX = offsetX + (mouseX - width / 2);
  let bufferY = offsetY + (mouseY - height / 2);
  let longitude = map(bufferX, 0, galaxyW, -180, 180);
  let latitude = map(bufferY, 0, galaxyH, 90, -90);
  let coordText = `Lon: ${longitude.toFixed(2)}°, Lat: ${latitude.toFixed(2)}°`;
  fill(10, 10, 10, 100);
  noStroke();
  rect(mouseX + 12, mouseY - 8, textWidth(coordText) + 16, 28, 7);
  fill(255);
  textSize(16);
  textAlign(LEFT, CENTER);
  text(coordText, mouseX + 20, mouseY + 6);
}
// =========================
// 7. Object Generation
// =========================
function addNebula(x, y, doRedraw = true) {
  const nebSize = random(420, 630); // 30% smaller
  // Assign baseHue fully random for each nebula
  let baseHue = random(360);
  const baseSat = random(40, 100);
  const baseBri = random(60, 120);
  const hueSpread = random(30, 60);
  const shapeFactor = random(0.4, 4.2);
  const rotation = random(TWO_PI);
  // Store all random properties for drawing
  const layers = int(random(2, 7)); // more layers for shape
  const layerSeeds = Array.from({length: layers}, () => random(10000));
  const layerRads = Array.from({length: layers}, (_, i) => nebSize * map(i, 0, layers - 1, 1, random(1.2, 4.2)));
  const layerAlphas = Array.from({length: layers}, (_, i) => map(i, 0, layers - 1, random(30, 140), random(8, 80)));
  const armCounts = Array.from({length: layers}, () => int(random(2, 22))); // more arms
  const armSpreads = Array.from({length: layers}, () => random(0.2, 6.2)); // more spread
  const nebulaSeed = random(10000);
  nebulae.push({
    x, y, r: nebSize, baseHue, baseSat, baseBri, hueSpread, shapeFactor,
    col: color(baseHue, baseSat, baseBri, 80),
    name: generateName("nebula"),
    rotation,
    layers,
    layerSeeds,
    layerRads,
    layerAlphas,
    armCounts,
    armSpreads,
    nebulaSeed
  });
  if (doRedraw) redrawBuffer();
}
function addGalaxy(x, y, doRedraw = true) {
  const gSize = random(238, 476); // 30% smaller
  let gHue = random(360);
  const arms = int(random(3, 10)); // more arms
  const gSat = random(40, 100);
  const gBri = random(70, 100);
  const rotation = random(TWO_PI);
  const points = int(gSize * random(5, 12)); // much denser
  const armSeeds = Array.from({length: arms}, () => random(10000));
  const armAngles = Array.from({length: arms}, (v, arm) => (TWO_PI / arms) * arm + random(-0.3, 0.3));
  const swirlStrength = random(1.2, 3.2);
  const armSpread = random(0.7, 2.2);
  const bulgeFactors = Array.from({length: points}, () => random(0.08, 0.18));
  const dustFactors = Array.from({length: points}, () => random(0.0, 0.12));
  galaxies.push({
    x, y, r: gSize, arms, baseHue: gHue, baseSat: gSat, baseBri: gBri,
    name: generateName("galaxy"),
    rotation,
    points,
    armSeeds,
    armAngles,
    swirlStrength,
    armSpread,
    bulgeFactors,
    dustFactors
  });
  if (doRedraw) redrawBuffer();
}
// Helper for realistic color selection
function getGalaxyColor(t, baseHue) {
  let hue = (baseHue + t * 60 + random(-20, 20)) % 360;
  let rgb = hsvToRgb(hue / 360, random(0.7, 1.0), random(0.7, 1.0));
  return color(rgb[0], rgb[1], rgb[2]);
}
function getNebulaColor(type, baseHue, hueSpread) {
  // Map baseHue to RGB
  let hue = (baseHue + type * hueSpread + random(-8, 8)) % 360;
  let rgb = hsvToRgb(hue / 360, random(0.7, 1.0), random(0.7, 1.0));
  return color(rgb[0], rgb[1], rgb[2]);
}
// HSV to RGB conversion helper
function hsvToRgb(h, s, v) {
  let r, g, b;
  let i = Math.floor(h * 6);
  let f = h * 6 - i;
  let p = v * (1 - s);
  let q = v * (1 - f * s);
  let t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }
  return [int(r * 255), int(g * 255), int(b * 255)];
}
function drawGalaxy(g) {
  galaxyBuffer.push();
  galaxyBuffer.translate(g.x, g.y);
  galaxyBuffer.rotate(g.rotation || 0);
  galaxyBuffer.translate(-g.x, -g.y);
  const armsLen = g.arms;
  const pointsLen = g.points;
  const swirlStrength = g.swirlStrength;
  const r = g.r;
  const bulgeFactors = g.bulgeFactors;
  const dustFactors = g.dustFactors;
  for (let arm = 0; arm < armsLen; arm++) {
    const armSeed = g.armSeeds[arm];
    const armAngle = g.armAngles[arm];
    let armRandoms = Array(pointsLen);
    for (let i = 0; i < pointsLen; i++) {
      armRandoms[i] = [random(1.5, 2.7), random(8, 18), random(0.3, 1.1), random(2.5, 6.5), random(0.7, 1.2), random(-8, 8), random(-8, 8), random(0.2, 1.7), random(0.7, 1.2)];
    }
    for (let i = 0; i < pointsLen; i++) {
      let t = i / pointsLen;
      let swirl = swirlStrength * pow(t, 1.5) * PI * sin(armSeed + t * 2.5);
      let angle = armAngle + t * TWO_PI * armRandoms[i][0] + swirl + sin(armSeed + t * armRandoms[i][1]) * armRandoms[i][2];
      let freq = armRandoms[i][3];
      let rad = r * t * (armRandoms[i][4] + 0.7 * noise(armSeed + arm * 100 + t * freq));
      let bulge = exp(-pow(t * 2.2, 2)) * r * bulgeFactors[i];
      let dust = sin(angle * 2.5 + t * 8) * dustFactors[i] * r * (1 - t);
      let px = g.x + cos(angle) * (rad + bulge + dust) + armRandoms[i][5];
      let py = g.y + sin(angle) * (rad + bulge + dust) + armRandoms[i][6];
      let depth = 1 - constrain(t, 0, 1);
      let alpha = map(t, 0, 1, 255, 60) * (0.7 + 0.6 * depth) * armRandoms[i][8];
      let col = getGalaxyColor(t, g.baseHue);
  let sw = map(t, 0, 1, 2.2, 0.7) + 1.2 * depth + armRandoms[i][7] * 0.5; // smaller dots
  galaxyBuffer.stroke(255, 255, 255, alpha * 0.18);
  galaxyBuffer.strokeWeight(sw * 0.5);
  galaxyBuffer.point(px + 2, py + 2);
  galaxyBuffer.stroke(col);
  galaxyBuffer.strokeWeight(sw * 0.7);
  galaxyBuffer.point(px, py);
    }
  }
  const burstLen = int(r * random(0.18, 0.38));
  for (let i = 0; i < burstLen; i++) {
    let angle = random(TWO_PI);
    let rad = random(0, r * random(0.04, 0.09)); // reduced spread for compact core
    let px = g.x + cos(angle) * rad;
    let py = g.y + sin(angle) * rad;
    galaxyBuffer.stroke(255, 255, 255, random(120, 220));
    galaxyBuffer.strokeWeight(random(2.2, 4.2));
    galaxyBuffer.point(px, py);
    let col = color(random(40, 60), random(10, 40), random(220, 255));
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(random(1.2, 2.8));
    galaxyBuffer.point(px, py);
  }
  galaxyBuffer.pop();
}
function addBlackhole(x, y, doRedraw = true) {
  const bhSize = random(10.5, 14); // 30% smaller
  const rotation = random(TWO_PI);
  // Store all random properties for drawing
  const diskTilt = random(-PI/8, PI/8);
  const diskEcc = random(0.5, 0.8);
  const corePoints = int(bhSize * random(32, 60));
  const ringPoints = int(bhSize * random(16, 28));
  const ringEcc = random(0.7, 1.0);
  const jetLen = bhSize * random(2.5, 4.5);
  const jetPoints = int(bhSize * random(4, 8));
  blackholes.push({
    x, y, r: bhSize,
    name: generateName("blackhole"),
    rotation,
    diskTilt,
    diskEcc,
    corePoints,
    ringPoints,
    ringEcc,
    jetLen,
    jetPoints
  });
  if (doRedraw) redrawBuffer();
}
function drawBlackhole(bh) {
  galaxyBuffer.push();
  galaxyBuffer.translate(bh.x, bh.y);
  galaxyBuffer.rotate(bh.rotation || 0);
  galaxyBuffer.translate(-bh.x, -bh.y);
  // Use stored random properties
  let bhSeed = random(10000);
  let points = int(bh.r * random(24, 40));
  // Accretion disk (sharper, less blur)
  for (let i = 0; i < points; i++) {
    let t = i / points;
    let swirl = random(2.5, 5.5) * pow(t, 1.5) * PI * sin(bhSeed + t * 2.5);
    let angle = t * TWO_PI + swirl + bh.diskTilt;
    let rad = bh.r * (1.2 + t * 2.8 + sin(angle * 2.5) * 0.2);
    let px = bh.x + cos(angle) * rad;
    let py = bh.y + sin(angle) * rad * bh.diskEcc;
    let alpha = map(t, 0, 1, 255, 60); // higher contrast
    let col;
    if (t < 0.2) {
      col = color(255, 255, 255, alpha);
    } else if (t < 0.5) {
      col = color(255, 220, 80, alpha);
    } else if (t < 0.8) {
      col = color(255, 140, 40, alpha);
    } else {
      col = color(220, 40, 40, alpha);
    }
    galaxyBuffer.stroke(col);
  galaxyBuffer.strokeWeight(1.2); // smaller dots
    galaxyBuffer.point(px, py);
  }
  // Black core (point-based)
  for (let i = 0; i < bh.corePoints * 2; i++) {
    let angle = random(TWO_PI);
    let rad = random(0, bh.r * 0.6);
    let px = bh.x + cos(angle) * rad;
    let py = bh.y + sin(angle) * rad;
    let alpha = random(220, 255);
    let col = color(10, 10, 20, alpha);
    galaxyBuffer.stroke(col);
  galaxyBuffer.strokeWeight(1.2);
    galaxyBuffer.point(px, py);
  }
  // Warped lensing ring (sharper)
  for (let i = 0; i < bh.ringPoints; i++) {
    let angle = random(TWO_PI);
    let rad = bh.r * random(2.5, 3.2);
    let px = bh.x + cos(angle) * rad + sin(angle * 3) * 8;
    let py = bh.y + sin(angle) * rad * bh.ringEcc + cos(angle * 2.5) * 6;
    let alpha = random(120, 220); // higher contrast
    let col = color(255, 240, 220, alpha);
    galaxyBuffer.stroke(col);
  galaxyBuffer.strokeWeight(1.2);
    galaxyBuffer.point(px, py);
  }
  // Relativistic jets (dotted streams)
  for (let j = -1; j <= 1; j += 2) {
    for (let i = 0; i < bh.jetPoints * 2; i++) {
      let t = i / (bh.jetPoints * 2);
      // More scatter at the end of each jet
      let scatter = map(t, 0.7, 1, 2, 16);
      if (t < 0.7) scatter = 2;
      let px = bh.x + random(-scatter, scatter);
      let py = bh.y + j * (bh.r * 0.3 + t * bh.jetLen) + random(-scatter, scatter);
      let alpha = map(t, 0, 1, 220, 60);
      let col = color(180 + random(-20,20), 220 + random(-20,20), 255, alpha);
      galaxyBuffer.stroke(col);
  galaxyBuffer.strokeWeight(random(0.7, 1.5));
      galaxyBuffer.point(px, py);
    }
  }
  galaxyBuffer.pop();
}
function addStarCluster(x, y) {
  const count = int(random(60, 140));
  const r = random(42, 63); // 30% smaller
  const rotation = random(TWO_PI);
  const name = generateName("starcluster");
  starClusters.push({ x, y, r, count, rotation, name });
  redrawBuffer();
}
function drawStarCluster(sc) {
  galaxyBuffer.push();
  galaxyBuffer.translate(sc.x, sc.y);
  galaxyBuffer.rotate(sc.rotation || 0);
  galaxyBuffer.translate(-sc.x, -sc.y);
  for (let i = 0; i < sc.count; i++) {
    let angle = random(TWO_PI);
    let rad = sc.r * pow(random(), 0.7);
    let px = sc.x + cos(angle) * rad;
    let py = sc.y + sin(angle) * rad;
    let alpha = map(rad, 0, sc.r, 255, 80);
    // More randomized color
    let rCol = random(200, 255);
    let gCol = random(200, 255);
    let bCol = random(180, 255) + random(-40, 40);
    let col = color(rCol, gCol, bCol, alpha);
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(random(2, 5)); // Slightly smaller for more particles
    galaxyBuffer.point(px, py);
  }
  galaxyBuffer.pop();
}
function addPulsar(x, y) {
  const r = random(10.5, 14); // 30% smaller
  const rotation = random(TWO_PI);
  const name = generateName("pulsar");
  pulsars.push({ x, y, r, rotation, name });
  redrawBuffer();
}
function drawPulsar(p) {
  galaxyBuffer.push();
  galaxyBuffer.translate(p.x, p.y);
  galaxyBuffer.rotate(p.rotation || 0);
  galaxyBuffer.translate(-p.x, -p.y);
  // Compact, bright core
  for (let i = 0; i < 40; i++) {
    let angle = random(TWO_PI);
    let rad = random(0, p.r * 0.25);
    let px = p.x + cos(angle) * rad;
    let py = p.y + sin(angle) * rad;
    let col = color(255, 255, random(180, 255), random(220,255));
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(random(2, 5));
    galaxyBuffer.point(px, py);
  }
  // Faint elliptical halo
  for (let i = 0; i < 30; i++) {
    let angle = random(TWO_PI);
    let rad = p.r * random(0.7, 1.2);
    let px = p.x + cos(angle) * rad * 1.2;
    let py = p.y + sin(angle) * rad * 0.7;
    let col = color(180, 220, 255, random(30, 80));
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(random(1, 2));
    galaxyBuffer.point(px, py);
  }
  // Two narrow, straight jets
  for (let j = -1; j <= 1; j += 2) {
    for (let i = 0; i < 40; i++) {
      let t = i / 40;
      let bx = p.x;
      let by = p.y + j * (p.r * 0.5 + t * p.r * 7.5);
      let col = color(120, 200, 255, map(t, 0, 1, 220, 30));
      galaxyBuffer.stroke(col);
      galaxyBuffer.strokeWeight(2.5 + random(-1, 1));
      galaxyBuffer.point(bx, by);
    }
  }
  galaxyBuffer.pop();
}
function addQuasar(x, y) {
  const r = random(21, 42); // 30% smaller
  const rotation = random(TWO_PI);
  const name = generateName("quasar");
  quasars.push({ x, y, r, rotation, name });
  redrawBuffer();
}
function drawQuasar(q) {
  galaxyBuffer.push();
  galaxyBuffer.translate(q.x, q.y);
  galaxyBuffer.rotate(q.rotation || 0);
  galaxyBuffer.translate(-q.x, -q.y);
  // Large, diffuse core (more dots, higher alpha)
  for (let i = 0; i < 220; i++) {
    let angle = random(TWO_PI);
    let rad = random(0, q.r * 0.95);
    let px = q.x + cos(angle) * rad * random(1.0, 1.3);
    let py = q.y + sin(angle) * rad * random(1.0, 1.3);
    let col = color(255, random(180,255), random(80,180), random(210,255));
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(random(1.2, 2.8));
    galaxyBuffer.point(px, py);
  }
  // Bright, wide accretion disk (more dots, higher alpha)
  for (let i = 0; i < 200; i++) {
    let angle = random(TWO_PI);
    let rad = q.r * random(1.2, 2.8);
    let px = q.x + cos(angle) * rad * 2.2;
    let py = q.y + sin(angle) * rad * 0.5;
    let col = color(255, 255, random(80,180), random(140,220));
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(random(0.8, 1.8));
    galaxyBuffer.point(px, py);
  }
  // Two broad, curved jets
  for (let j = -1; j <= 1; j += 2) {
    for (let i = 0; i < 60; i++) {
      let t = i / 60;
      let curve = sin(t * PI) * 38 * j;
      let bx = q.x + curve;
      let by = q.y + j * (q.r * 0.7 + t * q.r * 14.2);
      let col = color(255, 255, 200, map(t, 0, 1, 220, 30));
      galaxyBuffer.stroke(col);
  galaxyBuffer.strokeWeight(1.2 + random(-0.5, 0.5));
      galaxyBuffer.point(bx, by);
    }
  }
  // Dramatic halo (more dots, higher alpha)
  for (let i = 0; i < 320; i++) {
    let angle = random(TWO_PI);
    let rad = random(q.r * 1.8, q.r * 4.2);
    let px = q.x + cos(angle) * rad * random(0.8, 1.5);
    let py = q.y + sin(angle) * rad * random(0.7, 1.3);
    let col = color(255, 220, 80, random(40, 110));
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(random(0.7, 1.5));
    galaxyBuffer.point(px, py);
  }
  galaxyBuffer.pop();
}
function redrawBuffer() {
  galaxyBuffer.background(5, 5, 5);
  galaxyBuffer.blendMode(ADD);
  for (let n of nebulae) drawNebula(n);
  for (let g of galaxies) drawGalaxy(g);
  for (let bh of blackholes) drawBlackhole(bh);
  for (let sc of starClusters) drawStarCluster(sc);
  for (let p of pulsars) drawPulsar(p);
  for (let q of quasars) drawQuasar(q);
  galaxyBuffer.blendMode(BLEND);
  colorMode(RGB, 255);
  // Use points for stars
  for (let i = 0; i < 1200; i++) {
    galaxyBuffer.stroke(255, 255, starsB[i], 230);
    galaxyBuffer.strokeWeight(starsR[i]);
    galaxyBuffer.point(starsX[i], starsY[i]);
  }
}
// =========================
// 8. Utility Functions
// =========================
function drawEllipse(buffer, x, y, w, h, col, strokeCol = null, strokeW = 1) {
  // Point-only rendering for all items
  buffer.stroke(col);
  buffer.strokeWeight(strokeW);
  buffer.point(x, y);
}
function generateName(type) {
  const nebulaPrefixes = ["Zeta", "Orion", "Vega", "Cygnus", "Nova", "Astra", "Nebul", "Luma", "Pyra", "Xylo", "Epsilon", "Delta", "Theta", "Lyra", "Sirius", "Altair", "Draco", "Hydra", "Aurora", "Celest"];
  const nebulaSuffixes = ["Cloud", "Mist", "Veil", "Field", "Cluster", "Wisp", "Shroud", "Echo", "Spire", "Arc", "Wave", "Glow", "Stream", "Pulse", "Flare", "Drift", "Halo", "Dawn", "Shade", "Ray"];
  const galaxyPrefixes = ["Andromeda", "Sagitta", "Cassiopeia", "Perseus", "Phoenix", "Helios", "Aquila", "Gemini", "Taurus", "Leo", "Scorpius", "Pegasus", "Corona", "Vulpecula", "Eridanus", "Carina", "Centauri", "Lynx", "Pavo", "Volans"];
  const galaxySuffixes = ["Spiral", "Cluster", "Core", "Arm", "Wheel", "Ring", "Crown", "Disk", "Swirl", "Web", "Array", "Bridge", "Stream", "Burst", "Loop", "Shell", "Belt", "Zone", "Field", "Nexus"];
  const blackholePrefixes = ["Cygnus", "Sagittarius", "Vortex", "Event", "Shadow", "Abyss", "Oblivion", "Null", "Singularity", "Phantom"];
  const blackholeSuffixes = ["Hole", "Core", "Point", "Well", "Gate", "Eye", "Zone", "Rift", "Pit", "Collapse"];
  const starClusterPrefixes = ["Omega", "Sigma", "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Tau", "Pi", "Rho", "Kappa", "Iota", "Zeta", "Theta", "Lambda", "Mu", "Nu", "Xi", "Omicron", "Upsilon"];
  const starClusterSuffixes = ["Cluster", "Group", "Pack", "Swarm", "Nest", "Ring", "Field", "Core", "Belt", "Zone", "Array", "Shell", "Crown", "Bridge", "Stream", "Burst", "Loop", "Web", "Nexus", "Cloud"];
  const pulsarPrefixes = ["PSR", "Pulse", "Spin", "Magnet", "Radiant", "Beacon", "Flash", "Nova", "Vibe", "Echo", "Blitz", "Spark", "Quake", "Volt", "Wave", "Ray", "Flicker", "Glint", "Twist", "Jolt"];
  const pulsarSuffixes = ["Star", "Pulse", "Source", "Emitter", "Beacon", "Node", "Point", "Core", "Axis", "Focus", "Ray", "Burst", "Flash", "Spin", "Drift", "Glow", "Stream", "Flare", "Drift", "Halo"];
  const quasarPrefixes = ["QSO", "Quanta", "Quark", "Quantum", "Radiant", "Blazar", "Flash", "Nova", "Pulse", "Echo", "Spark", "Volt", "Wave", "Ray", "Flicker", "Glint", "Twist", "Jolt", "Blitz", "Quasar"];
  const quasarSuffixes = ["Source", "Core", "Point", "Emitter", "Node", "Focus", "Ray", "Burst", "Flash", "Spin", "Drift", "Glow", "Stream", "Flare", "Drift", "Halo", "Jet", "Axis", "Zone", "Nexus"];
  if (type === "nebula") {
    return nebulaPrefixes[int(random(nebulaPrefixes.length))] + " " + nebulaSuffixes[int(random(nebulaSuffixes.length))];
  } else if (type === "galaxy") {
    return galaxyPrefixes[int(random(galaxyPrefixes.length))] + " " + galaxySuffixes[int(random(galaxySuffixes.length))];
  } else if (type === "blackhole") {
    return blackholePrefixes[int(random(blackholePrefixes.length))] + " " + blackholeSuffixes[int(random(blackholeSuffixes.length))];
  } else if (type === "starcluster") {
    return starClusterPrefixes[int(random(starClusterPrefixes.length))] + " " + starClusterSuffixes[int(random(starClusterSuffixes.length))];
  } else if (type === "pulsar") {
    return pulsarPrefixes[int(random(pulsarPrefixes.length))] + " " + pulsarSuffixes[int(random(pulsarSuffixes.length))];
  } else if (type === "quasar") {
    return quasarPrefixes[int(random(quasarPrefixes.length))] + " " + quasarSuffixes[int(random(quasarSuffixes.length))];
  }
}
function drawNebula(n) {
  galaxyBuffer.push();
  galaxyBuffer.translate(n.x, n.y);
  galaxyBuffer.rotate(n.rotation || 0);
  galaxyBuffer.translate(-n.x, -n.y);
  const layersLen = n.layers;
  for (let layer = 0; layer < layersLen; layer++) {
    const layerSeed = n.layerSeeds[layer];
    const points = 180 + int(random(-40, 60));
    const layerRad = n.layerRads[layer] * 0.65; // reduce spread for compactness
    const layerAlpha = n.layerAlphas[layer];
    const armCount = n.armCounts[layer];
    const armSpread = n.armSpreads[layer] * 0.6; // tighten filaments
    // --- Mix polar and cartesian clouds, filaments, and voids ---
  let cloudGroups = int(random(2, 5)); // fewer, larger clusters
    for (let g = 0; g < cloudGroups; g++) {
  let cx = n.x + random(-layerRad * 0.9, layerRad * 0.9);
  let cy = n.y + random(-layerRad * 0.9, layerRad * 0.9);
  let groupRad = layerRad * random(0.28, 0.65); // larger clusters
  let groupPoints = int(points / cloudGroups * random(1.2, 2.2)); // denser clusters
      for (let i = 0; i < groupPoints; i++) {
        // Cartesian cluster
        let px = cx + random(-groupRad, groupRad) + random(-18, 18);
        let py = cy + random(-groupRad, groupRad) + random(-18, 18);
        if (random() < 0.7) {
          let colorType = random();
          let col = getNebulaColor(colorType, n.baseHue, n.hueSpread);
          let distFromCore = dist(px, py, n.x, n.y);
          let density = exp(-pow(distFromCore / (layerRad * 0.8), 2));
          let alpha = map(distFromCore, 0, layerRad * 1.1, layerAlpha * 5.2, 18) * density * random(0.8, 1.5);
          galaxyBuffer.stroke(red(col) + random(-40,40), green(col) + random(-40,40), blue(col) + random(-40,40), alpha);
          galaxyBuffer.strokeWeight(random(1.2, 2.2));
          galaxyBuffer.point(px, py);
        }
      }
    }
    // --- Add filaments ---
  let filamentCount = int(random(4, 9)); // more filaments
    for (let f = 0; f < filamentCount; f++) {
      let fx = n.x + random(-layerRad * 0.6, layerRad * 0.6);
      let fy = n.y + random(-layerRad * 0.6, layerRad * 0.6);
  let filamentLen = layerRad * random(1.2, 2.2); // longer filaments
      let filamentAngle = random(TWO_PI);
      for (let i = 0; i < int(points / 4); i++) {
        let t = i / (points / 4);
        let px = fx + cos(filamentAngle) * filamentLen * t + random(-8, 8);
        let py = fy + sin(filamentAngle) * filamentLen * t + random(-8, 8);
        if (random() < 0.5) {
          let colorType = random();
          let col = getNebulaColor(colorType, n.baseHue, n.hueSpread);
          let distFromCore = dist(px, py, n.x, n.y);
          let density = exp(-pow(distFromCore / (layerRad * 0.8), 2));
          let alpha = map(distFromCore, 0, layerRad * 1.1, layerAlpha * 6.2, 12) * density * random(0.7, 1.7);
          galaxyBuffer.stroke(red(col) + random(-60,60), green(col) + random(-60,60), blue(col) + random(-60,60), alpha);
          galaxyBuffer.strokeWeight(random(1.2, 2.2));
          galaxyBuffer.point(px, py);
        }
      }
    }
    // --- Leave voids/gaps by skipping some regions ---
    // (No code needed, just don't fill everywhere)
  }
  // Add some scattered knots and filaments (more compact)
  const knotCount = int(n.r * 0.25 * n.shapeFactor);
  for (let i = 0; i < knotCount; i++) {
    let angle = random(TWO_PI);
    let rad = random(n.r * 0.15, n.r * 0.7);
    let px = n.x + cos(angle) * rad + random(-8, 8);
    let py = n.y + sin(angle) * rad * random(0.85, 1.05) + random(-8, 8);
    let colorType = random();
    let col = getNebulaColor(colorType, n.baseHue, n.hueSpread);
    galaxyBuffer.stroke(red(col), green(col), blue(col), random(180, 255));
    galaxyBuffer.strokeWeight(random(1.5, 3.2));
    galaxyBuffer.point(px, py);
  }
  galaxyBuffer.pop();
}
// =========================
// 9. Mouse & Keyboard Interaction
// =========================
function mousePressed() {
  if (showLanding && !starExploding) {
    let cx = width / 2, cy = height / 2;
    let d = dist(mouseX, mouseY, cx, cy);
    if (d < 90) {
      starExploding = true;
      starExplosionProgress = 0;
      return;
    }
  }
  dragging = true;
  lastMouseX = mouseX;
  lastMouseY = mouseY;
  panVX = 0;
  panVY = 0;
  panVXAvg = 0;
  panVYAvg = 0;
  // --- Check for nebula/galaxy/blackhole/starcluster/pulsar/quasar click ---
  function isInBorder(obj, type) {
    let borderScale = getBorderScale(type);
    let side = obj.r * zoomLevel * borderScale;
    let half = side / 2;
    let objScreenX = (obj.x - offsetX) * zoomLevel + width / 2;
    let objScreenY = (obj.y - offsetY) * zoomLevel + height / 2;
    return (
      mouseX >= objScreenX - half && mouseX <= objScreenX + half &&
      mouseY >= objScreenY - half && mouseY <= objScreenY + half
    );
  }
  // Check all objects for hit, return early on first match
  const objectTypes = [
    { list: nebulae, type: "nebula" },
    { list: galaxies, type: "galaxy" },
    { list: blackholes, type: "blackhole" },
    { list: starClusters, type: "starcluster" },
    { list: pulsars, type: "pulsar" },
    { list: quasars, type: "quasar" }
  ];
  for (const { list, type } of objectTypes) {
    for (const obj of list) {
      if (isInBorder(obj, type)) {
        selectedObject = obj;
        selectedType = type;
        selectedName = obj.name;
        labelAnimStart = millis();
        labelAnimActive = true;
        labelAnimReverse = false;
        let objScreenX = (selectedObject.x - offsetX) + width / 2;
        let objScreenY = (selectedObject.y - offsetY) + height / 2;
        let angle = PI / 4;
        let distOffset = selectedObject.r + 40;
        let labelX = objScreenX + cos(angle) * distOffset;
        let labelY = objScreenY - sin(angle) * distOffset;
        labelLineStart = {x: objScreenX, y: objScreenY};
        labelLineEnd = {x: labelX, y: labelY};
        // Clear previous
        prevSelectedObject = null;
        prevSelectedType = "";
        prevSelectedName = "";
        prevLabelLineStart = null;
        prevLabelLineEnd = null;
        return;
      }
    }
  }
  // No object found, start reverse animation
  if (selectedObject) {
    labelAnimStart = millis();
    labelAnimActive = true;
    labelAnimReverse = true;
    prevSelectedObject = selectedObject;
    prevSelectedType = selectedType;
    prevSelectedName = selectedName;
    prevLabelLineStart = labelLineStart;
    prevLabelLineEnd = labelLineEnd;
  } else {
    labelAnimActive = false;
  }
  labelLineStart = null;
  labelLineEnd = null;
  selectedObject = null;
  selectedType = "";
  selectedName = "";
}
function mouseDragged() {
  if (dragging) {
    let dx = mouseX - lastMouseX;
    let dy = mouseY - lastMouseY;
    offsetX -= dx;
    offsetY -= dy;
    panVXAvg = panVXAvg * 0.7 - dx * 0.3;
    panVYAvg = panVYAvg * 0.7 - dy * 0.3;
    lastMouseX = mouseX;
    lastMouseY = mouseY;
    offsetX = constrain(offsetX, 0, galaxyW);
    offsetY = constrain(offsetY, 0, galaxyH);
  }
}
function mouseReleased() {
  dragging = false;
  panVX = panVXAvg;
  panVY = panVYAvg;
}
function keyPressed() {
  if (keyCode === LEFT_ARROW || key === 'a' || key === 'As') panLeft = true;
  if (keyCode === RIGHT_ARROW || key === 'd' || key === 'D') panRight = true;
  if (keyCode === UP_ARROW || key === 'w' || key === 'W') panUp = true;
  if (keyCode === DOWN_ARROW || key === 's' || key === 'S') panDown = true;
  if (key === '1') {
    let bx = offsetX + (mouseX - width / 2);
    let by = offsetY + (mouseY - height / 2);
    addNebula(bx, by);
  }
  if (key === '2') {
    let bx = offsetX + (mouseX - width / 2);
    let by = offsetY + (mouseY - height / 2);
    addGalaxy(bx, by);
  }
  if (key === '3') {
    let bx = offsetX + (mouseX - width / 2);
    let by = offsetY + (mouseY - height / 2);
    addBlackhole(bx, by);
  }
  if (key === '4') {
    let bx = offsetX + (mouseX - width / 2);
    let by = offsetY + (mouseY - height / 2);
    addStarCluster(bx, by);
  }
  if (key === '5') {
    let bx = offsetX + (mouseX - width / 2);
    let by = offsetY + (mouseY - height / 2);
    addPulsar(bx, by);
  }
  if (key === '6') {
    let bx = offsetX + (mouseX - width / 2);
    let by = offsetY + (mouseY - height / 2);
    addQuasar(bx, by);
  }
  if (key === 'h' || key === 'H') {
    offsetX = galaxyW / 2;
    offsetY = galaxyH / 2;
  }
  // --- Map Zoom Controls ---
  // Gradual zoom in with + or =
  if (key === '+' || key === '=') {
    zoomLevel = constrain(zoomLevel + 0.08, 0.2, 5.0);
  }
  // Gradual zoom out with - or _
  if (key === '-' || key === '_') {
    zoomLevel = constrain(zoomLevel - 0.08, 0.2, 5.0);
  }
  // Delete most recent item with backspace
  if (keyCode === BACKSPACE) {
    let lists = [nebulae, galaxies, blackholes, starClusters, pulsars, quasars];
    let found = false;
    for (let i = lists.length - 1; i >= 0; i--) {
      if (lists[i].length > 0) {
        lists[i].pop();
        found = true;
        break;
      }
    }
    if (found) redrawBuffer();
    // If all lists are empty, keep allowing backspace (no-op)
  }
  // Delete all items with delete key
  if (keyCode === DELETE) {
    nebulae.length = 0;
    galaxies.length = 0;
    blackholes.length = 0;
    starClusters.length = 0;
    pulsars.length = 0;
    quasars.length = 0;
    redrawBuffer();
  }
  // Restart everything with Escape
  if (keyCode === ESCAPE) {
    nebulae.length = 0;
    galaxies.length = 0;
    blackholes.length = 0;
    starClusters.length = 0;
    pulsars.length = 0;
    quasars.length = 0;
    // Regenerate stars
    for (let i = 0; i < 1200; i++) {
      starsX[i] = random(galaxyW);
      starsY[i] = random(galaxyH);
      starsR[i] = random(0.5, 2.5);
      starsB[i] = random(180, 255);
    }
    offsetX = galaxyW / 2;
    offsetY = galaxyH / 2;
    showLanding = true;
    starExploding = false;
    starExplosionProgress = 0;
    redrawBuffer();
  }
  // --- Property cycling for selected item ---
  if (selectedObject) {
    // 7: Cycle size (expanded ranges)
    if (key === '7') {
      if (selectedType === 'nebula') {
        let minR = 420, maxR = 630;
        selectedObject.r += 42;
        if (selectedObject.r > maxR) selectedObject.r = minR;
        selectedObject.layerRads = Array.from({length: selectedObject.layers}, (_, i) => selectedObject.r * map(i, 0, selectedObject.layers - 1, 1, random(1.2, 4.2)));
      } else if (selectedType === 'galaxy') {
        let minR = 238, maxR = 476;
        selectedObject.r += 24;
        if (selectedObject.r > maxR) selectedObject.r = minR;
      } else if (selectedType === 'starcluster') {
        let minR = 42, maxR = 63;
        selectedObject.r += 7;
        if (selectedObject.r > maxR) selectedObject.r = minR;
      } else if (selectedType === 'quasar') {
        let minR = 21, maxR = 42;
        selectedObject.r += 4;
        if (selectedObject.r > maxR) selectedObject.r = minR;
      } else if (selectedType === 'blackhole') {
        let minR = 10.5, maxR = 14;
        selectedObject.r += 1;
        if (selectedObject.r > maxR) selectedObject.r = minR;
      } else if (selectedType === 'pulsar') {
        let minR = 10.5, maxR = 14;
        selectedObject.r += 1;
        if (selectedObject.r > maxR) selectedObject.r = minR;
      }
      redrawBuffer();
    }
    // 8: Cycle density (expanded ranges)
    if (key === '8') {
      if (selectedType === 'nebula') {
        let minLayers = 4, maxLayers = 14;
        selectedObject.layers++;
        if (selectedObject.layers > maxLayers) selectedObject.layers = minLayers;
        selectedObject.layerSeeds = Array.from({length: selectedObject.layers}, () => random(10000));
        selectedObject.layerRads = Array.from({length: selectedObject.layers}, (_, i) => selectedObject.r * map(i, 0, selectedObject.layers - 1, 1, random(1.2, 4.2)));
        selectedObject.layerAlphas = Array.from({length: selectedObject.layers}, (_, i) => map(i, 0, selectedObject.layers - 1, random(30, 140), random(8, 80)));
        selectedObject.armCounts = Array.from({length: selectedObject.layers}, () => int(random(2, 22)));
        selectedObject.armSpreads = Array.from({length: selectedObject.layers}, () => random(0.2, 6.2));
      } else if (selectedType === 'galaxy') {
        let minArms = 3, maxArms = 10;
        selectedObject.arms++;
        if (selectedObject.arms > maxArms) selectedObject.arms = minArms;
        selectedObject.armSeeds = Array.from({length: selectedObject.arms}, () => random(10000));
        selectedObject.armAngles = Array.from({length: selectedObject.arms}, (v, arm) => (TWO_PI / selectedObject.arms) * arm + random(-0.3, 0.3));
      } else if (selectedType === 'starcluster') {
        let minCount = 140, maxCount = 280;
        selectedObject.count += 28;
        if (selectedObject.count > maxCount) selectedObject.count = minCount;
      } else if (selectedType === 'quasar') {
        let minR = 60, maxR = 120;
        selectedObject.r += 12;
        if (selectedObject.r > maxR) selectedObject.r = minR;
      }
      redrawBuffer();
    }
    // 9: Cycle hue
    if (key === '9') {
      if (selectedType === 'nebula') {
        selectedObject.baseHue = (selectedObject.baseHue + 30) % 360;
      } else if (selectedType === 'galaxy') {
        selectedObject.baseHue = (selectedObject.baseHue + 30) % 360;
      } else if (selectedType === 'quasar') {
        selectedObject.baseHue = (selectedObject.baseHue + 30) % 360;
      }
      // For blackhole, pulsar, starcluster: cycle color by shifting a property if present
      else if (selectedType === 'blackhole') {
        // No baseHue, but could add a color shift property if desired
        selectedObject.colorShift = (selectedObject.colorShift || 0) + 30;
      } else if (selectedType === 'pulsar') {
        selectedObject.colorShift = (selectedObject.colorShift || 0) + 30;
      } else if (selectedType === 'starcluster') {
        selectedObject.colorShift = (selectedObject.colorShift || 0) + 30;
      }
      redrawBuffer();
    }
  }
}
function keyReleased() {
  if ([LEFT_ARROW, RIGHT_ARROW, UP_ARROW, DOWN_ARROW].includes(keyCode) ||
      ['a','A','d','D','w','W','s','S'].includes(key)) {
    panLeft = panRight = panUp = panDown = false;
  }
}
// =========================
// 10. Touch Interaction Support
// =========================
let lastTouchX, lastTouchY;
function touchStarted() {
  if (showLanding && !starExploding) {
    let cx = width / 2;
    let cy = height / 2;
    let d = dist(touches[0].x, touches[0].y, cx, cy);
    if (d < 90) {
      starExploding = true;
      starExplosionProgress = 0;
      return false;
    }
  }
  dragging = true;
  lastTouchX = touches[0].x;
  lastTouchY = touches[0].y;
  panVX = 0;
  panVY = 0;
  panVXAvg = 0;
  panVYAvg = 0;
  // Check for nebula/galaxy/blackhole/starcluster/pulsar/quasar tap
  let found = false;
  let tx = offsetX + (touches[0].x - width / 2);
  let ty = offsetY + (touches[0].y - height / 2);
  for (let n of nebulae) {
    if (dist(tx, ty, n.x, n.y) < n.r * 0.5) {
      selectedObject = n;
      selectedType = "nebula";
      selectedName = n.name;
      found = true;
      break;
    }
  }
  if (!found) {
    for (let g of galaxies) {
      if (dist(tx, ty, g.x, g.y) < g.r * 0.5) {
        selectedObject = g;
        selectedType = "galaxy";
        selectedName = g.name;
        found = true;
        break;
      }
    }
  }
  if (!found) {
    for (let bh of blackholes) {
      if (dist(tx, ty, bh.x, bh.y) < bh.r * 0.5) {
        selectedObject = bh;
        selectedType = "blackhole";
        selectedName = bh.name;
        found = true;
        break;
      }
    }
  }
  if (!found) {
    for (let sc of starClusters) {
      if (dist(tx, ty, sc.x, sc.y) < sc.r * 0.7) {
        selectedObject = sc;
        selectedType = "starcluster";
        selectedName = sc.name;
        found = true;
        break;
      }
    }
  }
  if (!found) {
    for (let p of pulsars) {
      if (dist(tx, ty, p.x, p.y) < p.r * 0.7) {
        selectedObject = p;
        selectedType = "pulsar";
        selectedName = p.name;
        found = true;
        break;
      }
    }
  }
  if (!found) {
    for (let q of quasars) {
      if (dist(tx, ty, q.x, q.y) < q.r * 0.7) {
        selectedObject = q;
        selectedType = "quasar";
        selectedName = q.name;
        found = true;
        break;
      }
    }
  }
  galaxyBuffer = createGraphics(galaxyW, galaxyH);
  offsetX = galaxyW / 2;
  offsetY = galaxyH / 2;
  redrawBuffer();
}
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // Recenter viewport
  offsetX = galaxyW / 2;
  offsetY = galaxyH / 2;
  redrawBuffer();
}
