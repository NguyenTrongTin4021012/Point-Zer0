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
  if (kodeMonoFont) {
    textFont(kodeMonoFont);
  } else {
    textFont('monospace'); // fallback to system monospace font
  }
  galaxyW = windowWidth * 6;
  galaxyH = windowHeight * 6;
  galaxyBuffer = createGraphics(galaxyW, galaxyH);
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
  background(5, 5, 5);
  if (showLanding) {
    drawLandingScreen();
    return;
  }
  push();
  translate(width / 2, height / 2);
  // Draw main buffer
  image(galaxyBuffer, -offsetX, -offsetY, galaxyW, galaxyH);
  // Draw wraparound buffers for seamless edges
  if (offsetX < width / 2) {
    image(galaxyBuffer, -offsetX + galaxyW, -offsetY, galaxyW, galaxyH);
  }
  if (offsetX > galaxyW - width / 2) {
    image(galaxyBuffer, -offsetX - galaxyW, -offsetY, galaxyW, galaxyH);
  }
  if (offsetY < height / 2) {
    image(galaxyBuffer, -offsetX, -offsetY + galaxyH, galaxyW, galaxyH);
  }
  if (offsetY > galaxyH - height / 2) {
    image(galaxyBuffer, -offsetX, -offsetY - galaxyH, galaxyW, galaxyH);
  }
  // Draw corners for full seamlessness
  if (offsetX < width / 2 && offsetY < height / 2) {
    image(galaxyBuffer, -offsetX + galaxyW, -offsetY + galaxyH, galaxyW, galaxyH);
  }
  if (offsetX > galaxyW - width / 2 && offsetY < height / 2) {
    image(galaxyBuffer, -offsetX - galaxyW, -offsetY + galaxyH, galaxyW, galaxyH);
  }
  if (offsetX < width / 2 && offsetY > galaxyH - height / 2) {
    image(galaxyBuffer, -offsetX + galaxyW, -offsetY - galaxyH, galaxyW, galaxyH);
  }
  if (offsetX > galaxyW - width / 2 && offsetY > galaxyH - height / 2) {
    image(galaxyBuffer, -offsetX - galaxyW, -offsetY - galaxyH, galaxyW, galaxyH);
  }
  pop();
  handlePanning();
  drawLabel();
  drawInstructions();
  drawMouseCoords();
}
function drawLandingScreen() {
  if (kodeMonoFont) {
    textFont(kodeMonoFont);
  } else {
    textFont('monospace');
  }
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
  push();
  translate(cx, cy);
  rotate(starExplosionProgress * PI / 6 + oscRot);
  noStroke();
  fill(5, 5, 5, starAlpha);
  for (let d = -1; d <= 1; d += 2) {
    triangle(0, d * starSize, -starSize * 0.22, 0, starSize * 0.22, 0);
    triangle(d * starSize, 0, 0, -starSize * 0.22, 0, starSize * 0.22);
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
  if (panLeft) offsetX += panStep;
  if (panRight) offsetX -= panStep;
  if (panUp) offsetY += panStep;
  if (panDown) offsetY -= panStep;
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
function drawLabel() {
  if (kodeMonoFont) {
    textFont(kodeMonoFont);
  } else {
    textFont('monospace');
  }
  if (selectedObject && labelLineEnd && labelLineStart) {
    let animProgress = min(1, (millis() - labelAnimStart) / labelAnimDuration);
    let gap = 48;
    let dx = labelLineEnd.x - labelLineStart.x;
    let dy = labelLineEnd.y - labelLineStart.y;
    let dist = sqrt(dx * dx + dy * dy);
    let stopRatio = dist > gap ? (dist - gap) / dist : 0.95;
    let stopX = labelLineStart.x + dx * stopRatio;
    let stopY = labelLineStart.y + dy * stopRatio;
    let animStopX = labelLineStart.x + (stopX - labelLineStart.x) * animProgress;
    let animStopY = labelLineStart.y + (stopY - labelLineStart.y) * animProgress;
    push();
    stroke(255, 200);
    strokeWeight(1.2);
    line(labelLineStart.x, labelLineStart.y, animStopX, animStopY);
    if (!labelAnimActive || animProgress >= 1) {
      line(labelLineStart.x, labelLineStart.y, stopX, stopY);
      fill(255);
      stroke(40, 20, 0, 180);
      strokeWeight(2);
      textSize(28);
      textAlign(CENTER, BOTTOM);
      text(selectedName, labelLineEnd.x, labelLineEnd.y);
      textSize(20);
      noStroke();
      fill(200);
      let classLabel = "";
      if (selectedType === "galaxy") classLabel = "Galaxy";
      else if (selectedType === "blackhole") classLabel = "Black Hole";
      else if (selectedType === "nebula") classLabel = "Nebula";
      else if (selectedType === "starcluster") classLabel = "Star Cluster";
      else if (selectedType === "pulsar") classLabel = "Pulsar";
      else if (selectedType === "quasar") classLabel = "Quasar";
      text(classLabel, labelLineEnd.x, labelLineEnd.y + 28);
      labelAnimActive = false;
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
  // Creation guide (top, simplified)
  let creationText = "1: Nebula   2: Galaxy   3: Blackhole   4: Star Cluster   5: Pulsar   6: Quasar";
  let topBoxHeight = 40;
  let topBoxY = 0;
  noStroke();
  fill(10, 10, 10, 100);
  rect(0, topBoxY, width, topBoxHeight);
  fill(255);
  textSize(20);
  textAlign(CENTER, CENTER);
  text(creationText, width / 2, topBoxY + topBoxHeight / 2);

  // Navigation guide (bottom, simplified)
  let navigationText = "Pan: Mouse/Arrows   Select: Click";
  let bottomBoxHeight = 40;
  let bottomBoxY = height - bottomBoxHeight;
  noStroke();
  fill(10, 10, 10, 100);
  rect(0, bottomBoxY, width, bottomBoxHeight);
  fill(255);
  textSize(20);
  textAlign(CENTER, CENTER);
  text(navigationText, width / 2, bottomBoxY + bottomBoxHeight / 2);
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
  const nebSize = random(60, 105);
  const baseHue = random(360);
  const baseSat = random(60, 100);
  const baseBri = random(80, 100);
  const hueSpread = random(60, 220);
  const shapeFactor = random(0.5, 3.5);
  const rotation = random(TWO_PI);
  // Store all random properties for drawing
  const layers = int(random(2, 5));
  const layerSeeds = Array.from({length: layers}, () => random(10000));
  const layerRads = Array.from({length: layers}, (_, i) => nebSize * map(i, 0, layers - 1, 1, random(1.2, 3.2)));
  const layerAlphas = Array.from({length: layers}, (_, i) => map(i, 0, layers - 1, random(30, 140), random(8, 80)));
  const armCounts = Array.from({length: layers}, () => int(random(1, 15)));
  const armSpreads = Array.from({length: layers}, () => random(0.2, 4.2));
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
  const gSize = random(55, 155);
  const arms = int(random(2, 5));
  const gHue = random(360);
  const gSat = random(40, 100);
  const gBri = random(70, 100);
  const rotation = random(TWO_PI);
  // Store all random properties for drawing
  const points = int(gSize * random(2.5, 5));
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
function getGalaxyColor(t) {
  if (t < 0.2) return color(random(40, 60), random(10, 40), random(220, 255));
  if (t < 0.7) return color(random(200, 240), random(60, 120), random(180, 240));
  if (random() < 0.08) return color(random(30, 60), random(10, 40), random(30, 80));
  return color(random(270, 320), random(80, 160), random(120, 200));
}
function getNebulaColor(type) {
  if (type < 0.3) return color(random(0, 20), random(80, 160), random(120, 220));
  if (type < 0.6) return color(random(190, 240), random(80, 160), random(120, 220));
  if (type < 0.8) return color(random(90, 140), random(60, 120), random(100, 180));
  return color(random(30, 60), random(10, 40), random(30, 80));
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
      let col = getGalaxyColor(t);
      let sw = map(t, 0, 1, 3.5, 1.2) + 2.5 * depth + armRandoms[i][7];
      galaxyBuffer.stroke(255, 255, 255, alpha * 0.18);
      galaxyBuffer.strokeWeight(sw * 0.7);
      galaxyBuffer.point(px + 2, py + 2);
      galaxyBuffer.stroke(col);
      galaxyBuffer.strokeWeight(sw);
      galaxyBuffer.point(px, py);
    }
  }
  const burstLen = int(r * random(0.18, 0.38));
  for (let i = 0; i < burstLen; i++) {
    let angle = random(TWO_PI);
    let rad = random(0, r * random(0.09, 0.19));
    let px = g.x + cos(angle) * rad;
    let py = g.y + sin(angle) * rad;
    galaxyBuffer.stroke(255, 255, 255, random(120, 220));
    galaxyBuffer.strokeWeight(random(10, 18));
    galaxyBuffer.point(px, py);
    let col = color(random(40, 60), random(10, 40), random(220, 255));
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(random(7, 13));
    galaxyBuffer.point(px, py);
  }
  galaxyBuffer.pop();
}
function addBlackhole(x, y, doRedraw = true) {
  const bhSize = random(30, 60);
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
  let points = int(bh.r * random(24, 40)); // Fewer points for disk
  // Accretion disk
  for (let i = 0; i < points; i++) {
    let t = i / points;
    let swirl = random(2.5, 5.5) * pow(t, 1.5) * PI * sin(bhSeed + t * 2.5);
    let angle = t * TWO_PI + swirl + bh.diskTilt;
    let rad = bh.r * (1.2 + t * 2.8 + sin(angle * 2.5) * 0.2);
    let px = bh.x + cos(angle) * rad;
    let py = bh.y + sin(angle) * rad * bh.diskEcc;
    let alpha = map(t, 0, 1, 200, 10);
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
    galaxyBuffer.strokeWeight(random(2, 4));
    galaxyBuffer.point(px, py);
  }
  // Black core
  for (let i = 0; i < bh.corePoints; i++) {
    let angle = random(TWO_PI);
    let rad = random(0, bh.r * random(0.2, 0.7));
    let px = bh.x + cos(angle) * rad;
    let py = bh.y + sin(angle) * rad;
    let alpha = random(220, 255);
    let col = color(random(0, 20), random(0, 20), random(20, 60), alpha);
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(random(2, 5));
    galaxyBuffer.point(px, py);
  }
  // Warped lensing ring
  for (let i = 0; i < bh.ringPoints; i++) {
    let angle = random(TWO_PI);
    let rad = bh.r * random(2.5, 3.2);
    let px = bh.x + cos(angle) * rad + sin(angle * 3) * 8;
    let py = bh.y + sin(angle) * rad * bh.ringEcc + cos(angle * 2.5) * 6;
    let alpha = random(40, 100);
    let col = color(255, 240 + random(-10, 10), 220 + random(-20, 20), alpha);
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(random(1, 3));
    galaxyBuffer.point(px, py);
  }
  // Relativistic jets
  for (let j = -1; j <= 1; j += 2) {
    for (let i = 0; i < bh.jetPoints; i++) {
      let t = i / bh.jetPoints;
      let px = bh.x + random(-4, 4);
      let py = bh.y + j * (bh.r * 0.3 + t * bh.jetLen + random(-2, 2));
      let alpha = map(t, 0, 1, 120, 10);
      let col = color(180 + random(-20, 20), 220 + random(-20, 20), 255, alpha);
      galaxyBuffer.stroke(col);
      galaxyBuffer.strokeWeight(random(2, 4));
      galaxyBuffer.point(px, py);
    }
  }
  galaxyBuffer.pop();
}
function addStarCluster(x, y) {
  const count = int(random(20, 60));
  const r = random(40, 90);
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
    let col = color(255, 255, random(180, 255), alpha);
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(random(3, 7)); // Increased size
    galaxyBuffer.point(px, py);
  }
  galaxyBuffer.pop();
}
function addPulsar(x, y) {
  const r = random(18, 38);
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
  for (let i = 0; i < 10; i++) {
    let angle = random(TWO_PI);
    let rad = random(0, p.r * 0.3);
    let px = p.x + cos(angle) * rad;
    let py = p.y + sin(angle) * rad;
    let col = color(255, 255, 220, random(200, 255));
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(random(4, 8)); // Increased size
    galaxyBuffer.point(px, py);
  }
  for (let i = 0; i < 2; i++) {
    let angle = i * PI;
    for (let j = 0; j < 32; j++) {
      let t = j / 32;
      let bx = p.x + cos(angle) * p.r * (1.5 + t * 6.5);
      let by = p.y + sin(angle) * p.r * (1.5 + t * 6.5);
      let col = color(120, 200, 255, map(t, 0, 1, 220, 40));
      galaxyBuffer.stroke(col);
      galaxyBuffer.strokeWeight(3.5); // Increased size
      galaxyBuffer.point(bx, by);
    }
  }
  galaxyBuffer.pop();
}
function addQuasar(x, y) {
  const r = random(30, 60);
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
  for (let i = 0; i < 38; i++) {
    let angle = random(TWO_PI);
    let rad = random(0, q.r * 0.9);
    let px = q.x + cos(angle) * rad;
    let py = q.y + sin(angle) * rad;
    let col = color(255, 220, 80, random(180, 255));
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(random(5, 10)); // Increased size
    galaxyBuffer.point(px, py);
  }
  for (let i = 0; i < 24; i++) {
    let t = i / 24;
    let bx = q.x;
    let by = q.y - (q.r * 0.7 + t * q.r * 4.2);
    let col = color(255, 255, 200, map(t, 0, 1, 220, 40));
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(6); // Increased size
    galaxyBuffer.point(bx, by);
  }
  for (let i = 0; i < 32; i++) {
    let angle = random(TWO_PI);
    let rad = random(q.r * 1.0, q.r * 2.2);
    let px = q.x + cos(angle) * rad;
    let py = q.y + sin(angle) * rad;
    let col = color(255, 220, 80, random(18, 40));
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(random(2, 4)); // Increased size
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
  // Use typed arrays for stars
  for (let i = 0; i < 1200; i++) {
    galaxyBuffer.noStroke();
    galaxyBuffer.fill(255, 255, starsB[i], 230);
    galaxyBuffer.ellipse(starsX[i], starsY[i], starsR[i]);
  }
}
// =========================
// 8. Utility Functions
// =========================
function drawEllipse(buffer, x, y, w, h, col, strokeCol = null, strokeW = 1) {
  if (strokeCol) {
    buffer.stroke(strokeCol);
    buffer.strokeWeight(strokeW);
  } else {
    buffer.noStroke();
  }
  buffer.fill(col);
  buffer.ellipse(x, y, w, h);
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
    const steps = 48;
    const layerRad = n.layerRads[layer];
    const layerAlpha = n.layerAlphas[layer];
    const armCount = n.armCounts[layer];
    const armSpread = n.armSpreads[layer];
    let layerRandoms = Array(steps);
    for (let a = 0; a < steps; a++) {
      layerRandoms[a] = [random(), random(0, 60), random(-30, 30), random(0, 40), random(-20, 20)];
    }
    for (let a = 0; a < steps; a++) {
      let angle = map(a, 0, steps, 0, TWO_PI);
      let freq1 = 12, freq2 = 24, freq3 = 36, freq4 = 48;
      let noise1 = noise(layerSeed + cos(angle) * freq1, layerSeed + sin(angle) * freq1);
      let noise2 = noise(layerSeed + cos(angle) * freq2, layerSeed + sin(angle) * freq2);
      let noise3 = noise(layerSeed + cos(angle) * freq3, layerSeed + sin(angle) * freq3);
      let noise4 = noise(layerSeed + cos(angle) * freq4, layerSeed + sin(angle) * freq4);
      let armMod = sin(angle * armCount + layerSeed) * armSpread * 1.0;
      let noiseRad = layerRad * (0.18 + 1.7 * noise1 + 1.3 * noise2 + 0.7 * noise3 + 0.5 * noise4 + 1.1 * armMod);
      let modAngle = angle + sin(layerSeed + angle * 4.5) * 2.5 + cos(layerSeed + angle * 2.7) * 2.1;
      let density = 1.0;
      let px = n.x + cos(modAngle) * noiseRad * density;
      let py = n.y + sin(modAngle) * noiseRad * density;
      let distFromCore = dist(px, py, n.x, n.y);
      let depth = 1 - constrain(distFromCore / (n.r * 2.2), 0, 1);
      let colorType = layerRandoms[a][0];
      let col = getNebulaColor(colorType);
      let alpha = map(distFromCore, 0, n.r * 2.2, layerAlpha * 2.0, 20) * (0.7 + 0.6 * depth);
      let sw = map(distFromCore, 0, n.r * 2.2, 2.7, 0.5) + 1.2 * depth;
      drawEllipse(galaxyBuffer, px, py, sw, sw, color(red(col), green(col), blue(col), alpha));
    }
  }
  const nebLen = int(n.r * 0.8 * n.shapeFactor);
  for (let i = 0; i < nebLen; i++) {
    let angle = random(TWO_PI);
    let rad = random(0, n.r * 0.17 * n.shapeFactor);
    let px = n.x + cos(angle) * rad;
    let py = n.y + sin(angle) * rad;
    let colorType = random();
    let col = getNebulaColor(colorType);
    drawEllipse(galaxyBuffer, px, py, 6, 6, color(red(col), green(col), blue(col), 120));
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
  let mx = offsetX + (mouseX - width / 2);
  let my = offsetY + (mouseY - height / 2);
  let found = false;
  for (let n of nebulae) {
    if (dist(mx, my, n.x, n.y) < n.r * 0.5) {
      selectedObject = n;
      selectedType = "nebula";
      selectedName = n.name;
      found = true;
      break;
    }
  }
  if (!found) {
    for (let g of galaxies) {
      if (dist(mx, my, g.x, g.y) < g.r * 0.5) {
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
      if (dist(mx, my, bh.x, bh.y) < bh.r * 0.5) {
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
      if (dist(mx, my, sc.x, sc.y) < sc.r * 0.7) {
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
      if (dist(mx, my, p.x, p.y) < p.r * 0.7) {
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
      if (dist(mx, my, q.x, q.y) < q.r * 0.7) {
        selectedObject = q;
        selectedType = "quasar";
        selectedName = q.name;
        found = true;
        break;
      }
    }
  }
  if (found) {
    labelAnimStart = millis();
    labelAnimActive = true;
    let objScreenX = (selectedObject.x - offsetX) + width / 2;
    let objScreenY = (selectedObject.y - offsetY) + height / 2;
    let angle = PI / 4;
    let distOffset = selectedObject.r + 40;
    let labelX = objScreenX + cos(angle) * distOffset;
    let labelY = objScreenY - sin(angle) * distOffset;
    labelLineStart = {x: objScreenX, y: objScreenY};
    labelLineEnd = {x: labelX, y: labelY};
  } else {
    labelAnimActive = false;
    labelLineStart = null;
    labelLineEnd = null;
    selectedObject = null;
    selectedType = "";
    selectedName = "";
  }
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
  if (keyCode === LEFT_ARROW) panLeft = true;
  if (keyCode === RIGHT_ARROW) panRight = true;
  if (keyCode === UP_ARROW) panUp = true;
  if (keyCode === DOWN_ARROW) panDown = true;
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
  if (found) {
    labelAnimStart = millis();
    labelAnimActive = true;
    let angle
    labelLineEnd = {x: labelX, y: labelY};
  } else {
    labelAnimActive = false;
    labelLineStart = null;
    labelLineEnd = null;
  }
  if (!found) {
    selectedObject = null;
    selectedType = "";
    selectedName = "";
  }
}
function touchMoved() {
  if (dragging) {
    let dx = (touches[0].x - lastTouchX) / zoomLevel;
    let dy = (touches[0].y - lastTouchY) / zoomLevel;
    offsetX -= dx;
    offsetY -= dy;
    lastDragTime = millis();
    panVXAvg = panVXAvg * 0.7 - dx * 0.3;
    panVYAvg = panVYAvg * 0.7 - dy * 0.3;
    lastTouchX = touches[0].x;
    lastTouchY = touches[0].y;
    offsetX = constrain(offsetX, 0, galaxyW);
    offsetY = constrain(offsetY, 0, galaxyH);
  }
  return false;
}
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  galaxyW = windowWidth * 6;
  galaxyH = windowHeight * 6;
  galaxyBuffer = createGraphics(galaxyW, galaxyH);
  offsetX = galaxyW / 2;
  offsetY = galaxyH / 2;
  redrawBuffer();
}
