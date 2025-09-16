
// =========================
// Interactive Galaxy Map - p5.js
// Optimized & Cleaned
// =========================

// ===== 1. GLOBALS & CONSTANTS =====
// --- State & Data ---
let mouseInViewport = true;
let canvas, viewportW, viewportH;
let zoom = 1, targetZoom = 1, minZoom = 0.2, maxZoom = 2.5;
let panX = 0, panY = 0, targetPanX = 0, targetPanY = 0;
let dragging = false, dragStartX = 0, dragStartY = 0, dragOriginX = 0, dragOriginY = 0;
let stars = [], planets = [], nebulae = [], blackHoles = [], galaxies = [];
let selectedObject = null, hoveredObject = null;
let showInstructions = true;
let showInfoOverlay = false;
let infoOverlayAnim = 0; // 0 = closed, 1 = open
let infoTypingIndex = 0, infoTypingTimer = 0;
let zoomBarDragging = false;
const BG_COLOR = [10, 10, 20];
const STAR_COLOR = [255, 255, 200];
const PLANET_COLORS = [[120,180,255],[255,180,120],[180,255,120]];
const NEBULA_COLORS = [[180,80,255,80],[80,180,255,80],[255,80,180,80]];
const BLACKHOLE_COLOR = [30,30,40];
const GALAXY_COLOR = [200,200,255,60];
let lastFrameTime = 0;
let hoverObject = null, hoverType = "", hoverName = "", hoverLabelLineStart = null, hoverLabelLineEnd = null;
let showLanding = true;
let starExploding = false;
let starExplosionProgress = 0;
let blackholes = [];
let galaxyW, galaxyH;
let galaxyBuffer;
let offsetX = 0, offsetY = 0;
let lastMouseX, lastMouseY;
let panVX = 0, panVY = 0;
let panVXAvg = 0, panVYAvg = 0;
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
let starClusters = [];
let pulsars = [];
let quasars = [];
let starsX = new Float32Array(1200);
let starsY = new Float32Array(1200);
let starsR = new Float32Array(1200);
let starsB = new Uint8Array(1200);
let instructionFontSize = 12; // 20% smaller
let infoOverlayStartTime = 0;
let infoOverlayTypedChars = 0;
let infoOverlayTarget = 0; // 0 or 1
let infoOverlayScroll = 0;
let infoOverlayScrollMax = 0;
let infoOverlayScrollVel = 0;
let prevSelectedObject = null;
let prevSelectedType = "";
let prevSelectedName = "";
let prevLabelLineStart = null;
let prevLabelLineEnd = null;
// Touch globals must be declared before use

// ===== 2. EVENT HANDLERS =====
function mouseOut() { mouseInViewport = false; }
function mouseOver() { mouseInViewport = true; }

// Helper: Set main font
function setMainFont() {
  // Only call textFont if it exists (p5.js loaded)
  if (typeof textFont === 'function') {
    if (kodeMonoFont) {
      textFont(kodeMonoFont);
    } else {
      textFont('monospace');
    }
  }
}

// Efficient object hit-testing (returns {obj, type, name} or null)
function getObjectAtScreen(x, y) {
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
      let borderScale = getBorderScale(type);
      let side = obj.r * zoomLevel * borderScale;
      let half = side / 2;
      let objScreenX = (obj.x - offsetX) + width / 2;
      let objScreenY = (obj.y - offsetY) + height / 2;
      if (
        x >= objScreenX - half && x <= objScreenX + half &&
        y >= objScreenY - half && y <= objScreenY + half
      ) {
        return { obj, type, name: obj.name };
      }
    }
  }
  return null;
}

// ===== 2. SETUP & INITIALIZATION =====
function preload() {
// ===== 2. SETUP & INITIALIZATION =====
  try {
    kodeMonoFont = loadFont('KodeMono-Regular.ttf');
  } catch (e) {
    kodeMonoFont = null;
  }
}
function setup() {
  pixelDensity(1); // Optimize for performance (no retina)
  frameRate(60); // Cap frame rate for consistency
  createCanvas(windowWidth, windowHeight);
  colorMode(RGB, 255, 255, 255, 255);
  if (kodeMonoFont) {
    textFont(kodeMonoFont);
  } else {
    textFont('monospace');
  }
  galaxyW = windowWidth * 6;
  galaxyH = windowHeight * 6;
  galaxyBuffer = createGraphics(galaxyW, galaxyH);
  galaxyBuffer.colorMode(RGB, 255, 255, 255, 255);
  galaxyBuffer.noSmooth(); // Sharper points, better perf
  for (let i = 0; i < 1200; i++) {
    starsX[i] = random(galaxyW);
    starsY[i] = random(galaxyH);
    starsR[i] = random(0.5, 2.5);
    starsB[i] = random(180, 255);
  }
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

  // Register mouseOver/mouseOut events for the canvas
  let cnv = document.querySelector('canvas');
  if (cnv) {
    cnv.addEventListener('mouseout', mouseOut);
    cnv.addEventListener('mouseover', mouseOver);
  }
}

// ===== 3. MAIN RENDERING LOOP =====
function draw() {
// ===== 3. MAIN RENDERING LOOP =====
  // Cache values for performance
  const w2 = width >> 1, h2 = height >> 1;
  const ox = offsetX, oy = offsetY, gw = galaxyW, gh = galaxyH, zl = zoomLevel;
  background(5, 5, 5);
  cursor(CROSS);
  if (showLanding) {
    drawLandingScreen();
    return;
  }
  // Only one push/pop for all transforms
  push();
  translate(w2, h2);
  scale(zl);
  image(galaxyBuffer, -ox, -oy, gw, gh);
  // Only draw wraparound images if needed
  if (ox < w2) image(galaxyBuffer, -ox + gw, -oy, gw, gh);
  if (ox > gw - w2) image(galaxyBuffer, -ox - gw, -oy, gw, gh);
  if (oy < h2) image(galaxyBuffer, -ox, -oy + gh, gw, gh);
  if (oy > gh - h2) image(galaxyBuffer, -ox, -oy - gh, gw, gh);
  if (ox < w2 && oy < h2) image(galaxyBuffer, -ox + gw, -oy + gh, gw, gh);
  if (ox > gw - w2 && oy < h2) image(galaxyBuffer, -ox - gw, -oy + gh, gw, gh);
  if (ox < w2 && oy > gh - h2) image(galaxyBuffer, -ox + gw, -oy - gh, gw, gh);
  if (ox > gw - w2 && oy > gh - h2) image(galaxyBuffer, -ox - gw, -oy - gh, gw, gh);
  pop();
  // Cache font size for all UI (compute only if width changes)
  if (window._lastWidth !== width) {
    instructionFontSize = Math.max(16, Math.min(0.018 * width, 12 ));
    window._lastWidth = width;
  }
  handlePanning();
  // --- Hover detection (was in mouseMoved) ---
  if (mouseInViewport) {
    let hoverResult = getObjectAtScreen(mouseX, mouseY);
    if (hoverResult) {
      hoverObject = hoverResult.obj;
      hoverType = hoverResult.type;
      hoverName = hoverResult.name;
    } else {
      hoverObject = null; hoverType = ""; hoverName = "";
    }
  }
  // Draw UI in a single pass
  drawLabel();
  // Draw center cursor indicator if mouse is not in viewport (identical to browser crosshair)
  if (!mouseInViewport) {
    push();
    const cx = w2;
    const cy = h2;
    stroke(255);
    strokeWeight(1);
    line(cx - 10, cy, cx + 10, cy);
    line(cx, cy - 10, cx, cy + 10);
    pop();
  }
  drawHoverLabel();
  drawTaskBar();
  drawInstructions();
  drawZoomBar();
  drawMouseCoords();
  drawInfoOverlay();
}

// Draws a white border and label for hovered object (if not selected)
function drawHoverLabel() {
  if (!hoverObject || hoverObject === selectedObject) {
    window._hoverAnimStart = null;
    return;
  }
  let obj = hoverObject;
  let type = hoverType;
  let name = hoverName;
  let r = obj.r || 40;
  let borderScale = getBorderScale(type);
  let side = r * zoomLevel * borderScale;
  let half = side / 2;
  let objScreenX = (obj.x - offsetX) + width / 2;
  let objScreenY = (obj.y - offsetY) + height / 2;
  // Clamp border to viewport
  objScreenX = constrain(objScreenX, half + 2, width - half - 2);
  objScreenY = constrain(objScreenY, half + 2, height - half - 2);
  // --- Animated border ---
  if (!window._hoverAnimStart) window._hoverAnimStart = millis();
  let animProgress = min(1, (millis() - window._hoverAnimStart) / labelAnimDuration);
  let animSide = side * animProgress;
  push();
  blendMode(DIFFERENCE);
  stroke(255);
  strokeWeight(3);
  noFill();
  rectMode(CENTER);
  rect(objScreenX, objScreenY, animSide, animSide);
  rectMode(CORNER);
  pop(); // restore blendMode
  // Draw label
  fill(255,255,0,255); // High-contrast yellow for name
  stroke(0,0,0,220); // Black outline for visibility
  strokeWeight(3);
  textSize(instructionFontSize * 1.27);
  textAlign(LEFT, TOP);
  let labelX = objScreenX + half + 16;
  let labelY = objScreenY - half;
  let labelWidth = textWidth(name) + 8;
  let labelHeight = instructionFontSize * 1.27 + instructionFontSize + 8;
  if (labelX + labelWidth > width) labelX = width - labelWidth;
  if (labelY + labelHeight > height) labelY = height - labelHeight;
  if (labelX < 0) labelX = 0;
  if (labelY < 0) labelY = 0;
  text(name, labelX, labelY);
  textSize(instructionFontSize);
  noStroke();
  fill(255,255,255,230); // White for class label
  let classLabel = "";
  if (type === "galaxy") classLabel = "Galaxy";
  else if (type === "blackhole") classLabel = "Black Hole";
  else if (type === "nebula") classLabel = "Nebula";
  else if (type === "starcluster") classLabel = "Star Cluster";
  else if (type === "pulsar") classLabel = "Pulsar";
  else if (type === "quasar") classLabel = "Quasar";
  text(classLabel, labelX, labelY + instructionFontSize * 1.27);
}
// (mouseMoved removed; now handled in draw)
  drawInstructions();
  drawZoomBar();
  drawMouseCoords();
  drawInfoOverlay();
// Draws a vertical zoom size bar on the right side of the viewport
function drawZoomBar() {
  // Bar settings (ultra minimal: just lines)
  let barHeight = Math.max(120, Math.min(0.32 * height, 220));
  let barX = width - 24;
  let barY = (height - barHeight) / 2;
  let minZoom = 0.2, maxZoom = 5.0;
  stroke(255, 180);
  strokeWeight(2);
  // Draw main vertical line
  line(barX, barY, barX, barY + barHeight);
  // Indicator position (top=min, bottom=max)
  let t = (zoomLevel - minZoom) / (maxZoom - minZoom);
  t = constrain(t, 0, 1);
  let indicatorY = barY + t * barHeight;
  // Draw indicator: short horizontal line
  stroke(255);
  strokeWeight(3);
  line(barX - 10, indicatorY, barX + 10, indicatorY);
  // Draw min/max zoom values (use unified font size)
  noStroke();
  // Use only one overBar variable for both bar and indicator
  let overBar = mouseX >= barX - 12 && mouseX <= barX + 12 && mouseY >= barY && mouseY <= barY + barHeight && mouseInViewport;
  let isTouchActive = window._lastTouch && window._lastTouch.x >= barX - 12 && window._lastTouch.x <= barX + 12 && window._lastTouch.y >= barY && window._lastTouch.y <= barY + barHeight;
  if (overBar || isTouchActive) {
    fill(255, 255, 0);
  } else {
    fill(180);
  }
  textAlign(RIGHT, CENTER);
  textSize(instructionFontSize);
  text(nfc(minZoom, 1), barX - 14, barY);
  text(nfc(maxZoom, 1), barX - 14, barY + barHeight);
  // Draw current zoom value (left of indicator)
  if (overBar || isTouchActive) {
    fill(255, 255, 0);
  } else {
    fill(220);
  }
  textSize(instructionFontSize);
  text(nfc(zoomLevel, 2), barX - 14, indicatorY);

  // --- Interactivity: Drag to zoom ---
  if (!window._zoomBarDrag) window._zoomBarDrag = {active: false, offset: 0};
  let drag = window._zoomBarDrag;
  // Check if mouse is over the indicator line (within 8px vertically)
  // (removed duplicate overBar declaration)
  // Start drag
  if (mouseIsPressed && overBar && !drag.active) {
    drag.active = true;
    drag.offset = mouseY - indicatorY;
  }
  // End drag
  if (!mouseIsPressed) drag.active = false;
  // While dragging, update zoomLevel
  if (drag.active) {
    let newY = mouseY - drag.offset;
    let newT = constrain((newY - barY) / barHeight, 0, 1);
    zoomLevel = minZoom + newT * (maxZoom - minZoom);
  }
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
    let expandSize = starSize + starExplosionProgress * Math.max(width, height) * 2.2;
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
  if (expandSize > Math.max(width, height) * 2.1) showLanding = false;
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
    // Only use blendMode for the border, not for UI
    push();
    blendMode(DIFFERENCE);
    stroke(255, 255, 0, 230);
    strokeWeight(3);
    noFill();
    // Animated square border (clamped)
    let animSide = side * animProgress;
    rectMode(CENTER);
    rect(objScreenX, objScreenY, animSide, animSide);
    rectMode(CORNER);
    pop(); // restore blendMode
    // Label text
    if (!labelAnimReverse && animProgress >= 1) {
  fill(255,255,0,255); // High-contrast yellow for name
  stroke(0,0,0,220); // Black outline for visibility
  strokeWeight(3);
  textSize(instructionFontSize * 1.27);
  textAlign(LEFT, TOP);
  let labelX = objScreenX + half + 16;
  let labelY = objScreenY - half;
  let labelWidth = textWidth(name) + 8;
  let labelHeight = instructionFontSize * 1.27 + instructionFontSize + 8;
  if (labelX + labelWidth > width) labelX = width - labelWidth;
  if (labelY + labelHeight > height) labelY = height - labelHeight;
  if (labelX < 0) labelX = 0;
  if (labelY < 0) labelY = 0;
  text(name, labelX, labelY);
  textSize(instructionFontSize);
  noStroke();
  fill(255,255,255,230); // White for class label
  let classLabel = "";
  if (type === "galaxy") classLabel = "Galaxy";
  else if (type === "blackhole") classLabel = "Black Hole";
  else if (type === "nebula") classLabel = "Nebula";
  else if (type === "starcluster") classLabel = "Star Cluster";
  else if (type === "pulsar") classLabel = "Pulsar";
  else if (type === "quasar") classLabel = "Quasar";
  text(classLabel, labelX, labelY + instructionFontSize * 1.27);
      labelAnimActive = false;
    }
    if (labelAnimReverse && animProgress <= 0) {
      labelAnimActive = false;
      prevSelectedObject = null;
      prevSelectedType = "";
      prevSelectedName = "";
      prevLabelLineStart = null;
      prevLabelLineEnd = null;
      deselectObject(); // Only clear selection state after reverse animation completes
    }
  }
}

function deselectObject() {
  selectedObject = null;
  selectedType = "";
  selectedName = "";
  labelAnimActive = false;
  labelAnimReverse = false;
  labelLineStart = null;
  labelLineEnd = null;
}

// =========================
// 6. Instructions & Mouse Coordinates
// =========================
function drawInstructions() {
  // --- Clickable instruction bar regions ---
  // Store clickable regions for mousePressed
  if (!window._instructionBarRegions) window._instructionBarRegions = [];
  window._instructionBarRegions.length = 0;
// ===== 4. UI & OVERLAY DRAWING =====
// ===== 5. OBJECT RENDERING & LABELING =====
  setMainFont();
  // Responsive sizing
  let boxHeight = Math.max(28, Math.min(0.045 * height, 44));
  // instructionFontSize is now set globally in draw()
  // Creation guide (top, unified keybind style)
  let creationText = "Nebula: 1   Galaxy: 2   Blackhole: 3   Star Cluster: 4   Pulsar: 5   Quasar: 6";
  let topBoxY = 0;
  noStroke();
  fill(10, 10, 10, 100);
  rect(0, topBoxY, width, boxHeight);
  fill(255);
  textSize(instructionFontSize);
  textAlign(CENTER, CENTER);
  // Shrink font if text is too wide (cache textWidth)
  let maxTextWidth = width - 32;
  let actualFontSize = instructionFontSize;
  let cachedWidth = textWidth(creationText);
  while (cachedWidth > maxTextWidth && actualFontSize > 10) {
    actualFontSize -= 1;
    textSize(actualFontSize);
    cachedWidth = textWidth(creationText);
  }
  // Draw and record clickable regions for creation keys
  let creationKeys = [
    {key: '1', label: 'Nebula'},
    {key: '2', label: 'Galaxy'},
    {key: '3', label: 'Blackhole'},
    {key: '4', label: 'Star Cluster'},
    {key: '5', label: 'Pulsar'},
    {key: '6', label: 'Quasar'}
  ];
  let x = width / 2 - textWidth(creationText) / 2;
  let y = topBoxY + boxHeight / 2 - actualFontSize / 2;
  for (let i = 0; i < creationKeys.length; i++) {
    let keyLabel = creationKeys[i].key;
    let label = creationKeys[i].label;
    let keyText = label + ': ' + keyLabel;
    let tw = textWidth(label + ': ' + keyLabel + '   ');
    let region = {x, y, w: tw, h: actualFontSize + 8, key: keyLabel};
    window._instructionBarRegions.push(region);
    let isHovered = mouseX >= x && mouseX <= x + tw && mouseY >= y && mouseY <= y + actualFontSize + 8 && mouseInViewport;
    let isTouchActive = window._lastTouch && window._lastTouch.x >= x && window._lastTouch.x <= x + tw && window._lastTouch.y >= y && window._lastTouch.y <= y + actualFontSize + 8;
    if (isHovered || isTouchActive) {
      fill(255, 255, 0);
    } else {
      fill(255);
    }
    text(keyText, x + tw / 2, topBoxY + boxHeight / 2);
    x += tw;
  }

  // Navigation & actions guide (bottom, expanded)
  let navigationText = "Pan: Mouse/WASD/Arrows   Select: Click   H: Recenter   +/-: Zoom   ";
  let bottomBoxY = height - boxHeight;
  noStroke();
  fill(10, 10, 10, 100);
  rect(0, bottomBoxY, width, boxHeight);
  fill(255);
  textSize(instructionFontSize);
  actualFontSize = instructionFontSize;
  let cachedNavWidth = textWidth(navigationText);
  while (cachedNavWidth > maxTextWidth && actualFontSize > 10) {
    actualFontSize -= 1;
    textSize(actualFontSize);
    cachedNavWidth = textWidth(navigationText);
  }
  // Draw and record clickable regions for navigation keys
  let navKeys = [
    {key: 'pan', label: 'Pan: Mouse/WASD/Arrows', isRegion: true},
    {key: 'select', label: 'Select: Click', isRegion: true},
    {key: 'h', label: 'H: Recenter'},
    {key: '+', label: '+: Zoom In'},
    {key: '-', label: '-: Zoom Out'}
  ];
  x = width / 2 - textWidth(navigationText) / 2;
  y = bottomBoxY + boxHeight / 2 - actualFontSize / 2;
  for (let i = 0; i < navKeys.length; i++) {
    let keyLabel = navKeys[i].key;
    let label = navKeys[i].label;
    let keyText = label;
    let tw = textWidth(keyText + '   ');
    let region = {x, y, w: tw, h: actualFontSize + 8, key: keyLabel, isRegion: !!navKeys[i].isRegion};
    window._instructionBarRegions.push(region);
    let isHovered = mouseX >= x && mouseX <= x + tw && mouseY >= y && mouseY <= y + actualFontSize + 8 && mouseInViewport;
    let isTouchActive = window._lastTouch && window._lastTouch.x >= x && window._lastTouch.x <= x + tw && window._lastTouch.y >= y && window._lastTouch.y <= y + actualFontSize + 8;
    if (isHovered || isTouchActive) {
      fill(255, 255, 0);
    } else {
      fill(255);
    }
    text(keyText, x + tw / 2, bottomBoxY + boxHeight / 2);
    x += tw;
  }
}
function drawMouseCoords() {
  setMainFont();
  let bufferX = offsetX + (mouseX - width / 2);
  let bufferY = offsetY + (mouseY - height / 2);
  let longitude = map(bufferX, 0, galaxyW, -180, 180);
  let latitude = map(bufferY, 0, galaxyH, 90, -90);
  let coordText = `Lon: ${longitude.toFixed(2)}°, Lat: ${latitude.toFixed(2)}°`;
  fill(10, 10, 10, 100);
  noStroke();
  rect(mouseX + 12, mouseY - 8, textWidth(coordText) + 16, instructionFontSize + 12, 7);
  fill(255);
  textSize(instructionFontSize);
  textAlign(LEFT, CENTER);
  text(coordText, mouseX + 20, mouseY + 6);
}
// =========================
// 7. Object Generation
// =========================
function addNebula(x, y, doRedraw = true) {
// ===== 6. OBJECT GENERATION & UTILITIES =====
  // Nebula: visually large, but smaller than galaxy
  const minDim = Math.min(windowWidth, windowHeight);
  const maxNebula = 0.18 * minDim;
  const minNebula = 0.10 * minDim;
  const nebSize = random(minNebula, maxNebula);
  let baseHue = random(360);
  const baseSat = random(40, 100);
  const baseBri = random(60, 120);
  const hueSpread = random(30, 60);
  const shapeFactor = random(0.4, 4.2);
  const rotation = random(TWO_PI);
  const layers = int(random(2, 7));
  // Use typed arrays for speed
  const layerSeeds = new Float32Array(layers);
  const layerRads = new Float32Array(layers);
  const layerAlphas = new Float32Array(layers);
  const armCounts = new Uint8Array(layers);
  const armSpreads = new Float32Array(layers);
  for (let i = 0; i < layers; i++) {
    layerSeeds[i] = random(10000);
    layerRads[i] = nebSize * map(i, 0, layers - 1, 1, random(1.2, 4.2));
    layerAlphas[i] = map(i, 0, layers - 1, random(30, 140), random(8, 80));
    armCounts[i] = int(random(2, 22));
    armSpreads[i] = random(0.2, 6.2);
  }
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
  // Galaxy: largest object
  const minDim = Math.min(windowWidth, windowHeight);
  const maxGalaxy = 0.32 * minDim;
  const minGalaxy = 0.22 * minDim;
  const gSize = random(minGalaxy, maxGalaxy);
  let gHue = random(360);
  const arms = int(random(3, 6));
  const gSat = random(40, 100);
  const gBri = random(70, 100);
  const rotation = random(TWO_PI);
  // Denser: more points per unit size
  const points = int(gSize * random(7, 12));
  // Arm structure
  const armSeeds = new Float32Array(arms);
  const armAngles = new Float32Array(arms);
  for (let i = 0; i < arms; i++) {
    armSeeds[i] = random(10000);
    armAngles[i] = (TWO_PI / arms) * i + random(-0.25, 0.25);
  }
  // Bulge and dust for each point
  const bulgeFactors = new Float32Array(points);
  const dustFactors = new Float32Array(points);
  for (let i = 0; i < points; i++) {
    bulgeFactors[i] = random(0.10, 0.22);
    dustFactors[i] = random(0.0, 0.18);
  }
  // Clump seeds for realism
  const clumpSeeds = new Float32Array(arms);
  for (let i = 0; i < arms; i++) clumpSeeds[i] = random(10000);
  galaxies.push({
    x, y, r: gSize, arms, baseHue: gHue, baseSat: gSat, baseBri: gBri,
    name: generateName("galaxy"),
    rotation,
    points,
    armSeeds,
    armAngles,
    bulgeFactors,
    dustFactors,
    clumpSeeds
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
  const r = g.r;
  const bulgeFactors = g.bulgeFactors;
  const dustFactors = g.dustFactors;
  const clumpSeeds = g.clumpSeeds;
  // Draw core: dense, bright, color gradient (use old color function for core)
  let corePoints = Math.floor(pointsLen * 0.18);
  for (let i = 0; i < corePoints; i++) {
    let t = i / corePoints;
    let angle = random(TWO_PI);
    let rad = random(0, r * 0.13 * (0.7 + 0.5 * t));
    let px = g.x + cos(angle) * rad;
    let py = g.y + sin(angle) * rad;
    let col = getGalaxyColor(t, g.baseHue);
  col.setAlpha(255 - t * 60); // Brighter core and arms
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(2.8);
    galaxyBuffer.point(px, py);
  }
  // Draw arms: logarithmic spiral, clumpy, color-varying (use old color function)
  // Make spiral arms more pronounced and tighter
  let spiralA = 0.16 + random(-0.03, 0.03); // tighter spiral
  let spiralB = 0.44 + random(-0.08, 0.08); // more spiral turns
  for (let arm = 0; arm < armsLen; arm++) {
    const armSeed = g.armSeeds[arm];
    const armAngle = g.armAngles[arm];
    const clumpSeed = clumpSeeds[arm];
    let armLen = Math.floor(pointsLen * 0.82 / armsLen);
    for (let i = 0; i < armLen; i++) {
      let t = i / armLen;
      // Logarithmic spiral: r = a * exp(b * theta)
      let theta = t * 4.5 * PI + random(-0.04, 0.04);
      let spiralR = spiralA * exp(spiralB * theta);
      let baseRad = r * spiralR * (0.7 + 0.3 * t);
      let angle = armAngle + theta + sin(armSeed + t * 12.0) * 0.13;
      // Clumping: use noise for natural gaps and random clusters
      let clump = 1.0 + 0.7 * noise(clumpSeed + t * 2.5) + (random() < 0.08 ? random(0.7, 2.2) : 0);
      let rad = baseRad * clump;
      // Bulge and dust
      let bulge = exp(-pow(t * 2.1, 2)) * r * bulgeFactors[i % bulgeFactors.length];
      let dust = sin(angle * 2.5 + t * 8) * dustFactors[i % dustFactors.length] * r * (1 - t);
      let px = g.x + cos(angle) * (rad + bulge + dust);
      let py = g.y + sin(angle) * (rad + bulge + dust);
      let col = getGalaxyColor(t, g.baseHue);
  let alpha = lerp(255, 80, t) * (0.8 + 0.7 * noise(clumpSeed + t * 3.5));
  col.setAlpha(alpha);
      galaxyBuffer.stroke(col);
      galaxyBuffer.strokeWeight(2.8);
      // Only draw some points for sparser arms
      if (random() < lerp(1, 0.45, t)) {
        galaxyBuffer.point(px, py);
      }
      // Occasional dust lane (darken)
      if (random() < 0.04 && t > 0.3 && t < 0.9) {
        galaxyBuffer.stroke(30, 30, 40, 60);
        galaxyBuffer.strokeWeight(2.7);
        galaxyBuffer.point(px + random(-2,2), py + random(-2,2));
      }
    }
  }
  // Faint halo: random outliers
  let haloPoints = Math.floor(pointsLen * 0.12);
  for (let i = 0; i < haloPoints; i++) {
    let t = i / haloPoints;
    let angle = random(TWO_PI);
    let rad = r * (0.9 + random(0.1, 0.7));
    let px = g.x + cos(angle) * rad + random(-8, 8);
    let py = g.y + sin(angle) * rad + random(-8, 8);
    let col = getGalaxyColor(t, g.baseHue);
  col.setAlpha(random(40, 90));
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(2.2);
    galaxyBuffer.point(px, py);
  }
  galaxyBuffer.pop();
}
function addBlackhole(x, y, doRedraw = true) {
  // Black hole: visually tiny
  const minDim = Math.min(windowWidth, windowHeight);
  const minBH = 0.012 * minDim;
  const maxBH = 0.022 * minDim;
  const bhSize = random(minBH, maxBH);
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
    jetPoints,
    baseHue: random(360)
  });
  if (doRedraw) redrawBuffer();
}
function drawBlackhole(bh) {
  galaxyBuffer.push();
  galaxyBuffer.translate(bh.x, bh.y);
  galaxyBuffer.rotate(bh.rotation || 0);
  galaxyBuffer.translate(-bh.x, -bh.y);
  // Dense dark core (event horizon) - points only
  for (let i = 0; i < bh.corePoints; i++) {
    let angle = random(TWO_PI);
    let rad = random(0, bh.r * 0.7);
    let px = bh.x + cos(angle) * rad;
    let py = bh.y + sin(angle) * rad;
  let alpha = random(230, 255);
    // Use baseHue for core color
    let hue = (bh.baseHue || 0) % 360;
    let rgb = hsvToRgb(hue / 360, 0.7, 0.12);
    let col = color(rgb[0], rgb[1], rgb[2], alpha);
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(2.2);
    galaxyBuffer.point(px, py);
  }
  // Accretion disk (sparse, realistic, spiral structure, color/brightness variation)
  let diskPoints = Math.max(18, Math.floor(bh.ringPoints * 1.1));
  let spiralTurns = 2.2;
  for (let i = 0; i < diskPoints; i++) {
    let t = i / diskPoints;
    // Logarithmic spiral for disk structure
    let theta = spiralTurns * TWO_PI * t;
    let spiralA = bh.r * 1.13;
    let spiralB = 0.13;
    let rad = spiralA * Math.exp(spiralB * theta);
    let angle = theta;
    // Doppler beaming: brighter on one side
    let beaming = 0.7 + 0.7 * cos(angle - PI/2);
    // Disk thickness varies with angle (relativistic effect)
    let thickness = lerp(1.1, 1.35, 0.5 + 0.5 * sin(angle - PI/2));
    let px = bh.x + cos(angle) * rad * thickness;
    let py = bh.y + sin(angle) * rad * bh.diskEcc * thickness;
    // Color gradient: blue-white-yellow-orange-red
    let baseCol;
    if (t < 0.18) baseCol = color(180, 220, 255);
    else if (t < 0.45) baseCol = color(255, 255, 255);
    else if (t < 0.7) baseCol = color(255, 220, 80);
    else if (t < 0.9) baseCol = color(255, 140, 40);
    else baseCol = color(220, 40, 40);
    // Hot spots: randomly brighten some points
    let hot = (random() < 0.07) ? 1.5 : 1.0;
  let alpha = 180 + 120 * beaming * hot;
    let col = color(
      red(baseCol) * beaming * hot,
      green(baseCol) * beaming * hot,
      blue(baseCol) * beaming * hot,
      constrain(alpha, 60, 255)
    );
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(2.2);
    galaxyBuffer.point(px, py);
    // Outer faint disk (points only, sparser)
    if (random() < 0.08) {
      let rad2 = rad * random(1.05, 1.18);
      let px2 = bh.x + cos(angle) * rad2 * thickness;
      let py2 = bh.y + sin(angle) * rad2 * bh.diskEcc * thickness;
  let col2 = color(red(baseCol), green(baseCol), blue(baseCol), 60);
      galaxyBuffer.stroke(col2);
      galaxyBuffer.strokeWeight(1.1);
      galaxyBuffer.point(px2, py2);
    }
  }
  // Faint lensing ring
  for (let i = 0; i < bh.ringPoints; i++) {
    let t = i / bh.ringPoints;
    let angle = t * TWO_PI;
    let rad = bh.r * random(1.45, 1.7);
    let px = bh.x + cos(angle) * rad;
    let py = bh.y + sin(angle) * rad * bh.ringEcc;
  let col = color(200, 220, 255, 80);
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(1.2);
    galaxyBuffer.point(px, py);
  }
  // Relativistic jets (collimated, blue-white)
  for (let j = -1; j <= 1; j += 2) {
    for (let i = 0; i < bh.jetPoints * 2; i++) {
      let t = i / (bh.jetPoints * 2);
      let px = bh.x + random(-1.5, 1.5);
      let py = bh.y + j * (bh.r * 0.3 + t * bh.jetLen) + random(-2, 2);
      let alpha = map(t, 0, 1, 220, 40);
      let col = lerpColor(color(180, 220, 255, alpha), color(255, 255, 255, alpha), t * 0.7);
      galaxyBuffer.stroke(col);
      galaxyBuffer.strokeWeight(1.3);
      galaxyBuffer.point(px, py);
    }
  }
  galaxyBuffer.pop();
}
function addStarCluster(x, y) {
  const count = int(random(15, 35));
  // Star cluster: similar to nebula, but slightly smaller
  const minDim = Math.min(windowWidth, windowHeight);
  const minSC = 0.07 * minDim;
  const maxSC = 0.11 * minDim;
  const r = random(minSC, maxSC);
  const rotation = random(TWO_PI);
  const name = generateName("starcluster");
  starClusters.push({ x, y, r, count, rotation, name, baseHue: random(360) });
  redrawBuffer();
}
function drawStarCluster(sc) {
  galaxyBuffer.push();
  galaxyBuffer.translate(sc.x, sc.y);
  galaxyBuffer.rotate(sc.rotation || 0);
  galaxyBuffer.translate(-sc.x, -sc.y);
  // Main cluster: King-like profile (denser core, sparser halo)
  for (let i = 0; i < sc.count; i++) {
    let angle = random(TWO_PI);
    let isCore = random() < 0.7;
    let rad = isCore ? sc.r * 0.45 * sqrt(random()) : sc.r * pow(random(), 0.35);
    let px = sc.x + cos(angle) * rad;
    let py = sc.y + sin(angle) * rad;
    // Use baseHue for color
    let hue = ((sc.baseHue || 0) + map(rad, 0, sc.r, 0, 40)) % 360;
    let sat = map(rad, 0, sc.r, 0.7, 0.3);
    let bri = map(rad, 0, sc.r, 1.0, 0.7);
    let rgb = hsvToRgb(hue / 360, sat, bri);
  let alpha = map(rad, 0, sc.r, 255, 160);
    let col = color(rgb[0], rgb[1], rgb[2], alpha);
    // Occasionally a bright giant
    let sw = (random() < 0.04) ? random(5, 8) : random(2, 3.5);
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(sw);
    galaxyBuffer.point(px, py);
  }
  // Outlier halo stars
  for (let i = 0; i < Math.floor(sc.count * 0.12); i++) {
    let angle = random(TWO_PI);
    let rad = sc.r * random(1.05, 1.35);
    let px = sc.x + cos(angle) * rad;
    let py = sc.y + sin(angle) * rad;
  let col = color(random(220,255), random(220,255), random(200,255), random(80, 160));
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(random(1.2, 2.2));
    galaxyBuffer.point(px, py);
  }
  galaxyBuffer.pop();
}
function addPulsar(x, y) {
  // Pulsar: visually tiny, similar to black hole
  const minDim = Math.min(windowWidth, windowHeight);
  const minP = 0.014 * minDim;
  const maxP = 0.025 * minDim;
  const r = random(minP, maxP);
  const rotation = random(TWO_PI);
  const name = generateName("pulsar");
  pulsars.push({ x, y, r, rotation, name, baseHue: random(360) });
  redrawBuffer();
}
function drawPulsar(p) {
  galaxyBuffer.push();
  galaxyBuffer.translate(p.x, p.y);
  galaxyBuffer.rotate(p.rotation || 0);
  galaxyBuffer.translate(-p.x, -p.y);
  for (let i = 0; i < 10; i++) {
    let angle = random(TWO_PI);
    let rad = random(0, p.r * 0.25);
    let px = p.x + cos(angle) * rad;
    let py = p.y + sin(angle) * rad;
    // Use baseHue for color
    let hue = ((p.baseHue || 0) + map(rad, 0, p.r, 0, 60)) % 360;
    let rgb = hsvToRgb(hue / 360, 0.1 + 0.9 * random(), 1.0);
  let col = color(rgb[0], rgb[1], rgb[2], 255);
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(random(2, 5) * 1.25 * 1.25);
    galaxyBuffer.point(px, py);
  }
  for (let i = 0; i < 7; i++) {
    let angle = random(TWO_PI);
    let rad = p.r * random(0.7, 1.2);
    let px = p.x + cos(angle) * rad * 1.2;
    let py = p.y + sin(angle) * rad * 0.7;
  let col = color(180, 220, 255, random(120, 180));
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(random(1, 2) * 1.25 * 1.25);
    galaxyBuffer.point(px, py);
  }
  for (let j = -1; j <= 1; j += 2) {
    for (let i = 0; i < 10; i++) {
      let t = i / 40;
      let bx = p.x;
      let by = p.y + j * (p.r * 0.5 + t * p.r * 7.5);
  let col = color(120, 200, 255, map(t, 0, 1, 255, 80));
      galaxyBuffer.stroke(col);
      galaxyBuffer.strokeWeight((2.5 + random(-1, 1)) * 1.25 * 1.25);
      galaxyBuffer.point(bx, by);
    }
  }
  galaxyBuffer.pop();
}
function addQuasar(x, y) {
  // Quasar: between star cluster and nebula
  const minDim = Math.min(windowWidth, windowHeight);
  const minQ = 0.08 * minDim;
  const maxQ = 0.13 * minDim;
  const r = random(minQ, maxQ);
  const rotation = random(TWO_PI);
  const name = generateName("quasar");
  quasars.push({ x, y, r, rotation, name, baseHue: random(360) });
  redrawBuffer();
}
function drawQuasar(q) {
  galaxyBuffer.push();
  galaxyBuffer.translate(q.x, q.y);
  galaxyBuffer.rotate(q.rotation || 0);
  galaxyBuffer.translate(-q.x, -q.y);
  for (let i = 0; i < 55; i++) {
    let angle = random(TWO_PI);
    let rad = random(0, q.r * 0.95);
    let px = q.x + cos(angle) * rad * random(1.0, 1.3);
    let py = q.y + sin(angle) * rad * random(1.0, 1.3);
    // Use baseHue for color
    let hue = ((q.baseHue || 0) + map(rad, 0, q.r, 0, 60)) % 360;
    let rgb = hsvToRgb(hue / 360, 0.7, 1.0);
  let col = color(rgb[0], rgb[1], rgb[2], 255);
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(random(3.2, 5.2));
    galaxyBuffer.point(px, py);
  }
  for (let i = 0; i < 50; i++) {
    let angle = random(TWO_PI);
    let rad = q.r * random(1.2, 2.8);
    let px = q.x + cos(angle) * rad * 2.2;
    let py = q.y + sin(angle) * rad * 0.5;
  let col = color(255, 255, random(120,220), random(200,255));
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(random(0.8, 1.8) * 1.25 * 1.25);
    galaxyBuffer.point(px, py);
  }
  for (let j = -1; j <= 1; j += 2) {
    for (let i = 0; i < 15; i++) {
      let t = i / 60;
      let curve = sin(t * PI) * 38 * j;
      let bx = q.x + curve;
      let by = q.y + j * (q.r * 0.7 + t * q.r * 14.2);
      let col = color(255, 255, 200, map(t, 0, 1, 220, 30));
      galaxyBuffer.stroke(col);
      galaxyBuffer.strokeWeight((1.2 + random(-0.5, 0.5)) * 1.25 * 1.25);
      galaxyBuffer.point(bx, by);
    }
  }
  for (let i = 0; i < 80; i++) {
    let angle = random(TWO_PI);
    let rad = random(q.r * 1.8, q.r * 4.2);
    let px = q.x + cos(angle) * rad * random(0.8, 1.5);
    let py = q.y + sin(angle) * rad * random(0.7, 1.3);
  let col = color(255, 220, 80, random(120, 200));
    galaxyBuffer.stroke(col);
    galaxyBuffer.strokeWeight(random(0.7, 1.5) * 1.25 * 1.25);
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
      for (let i = 0; i < Math.floor(groupPoints / 4); i++) {
        // Cartesian cluster
        let px = cx + random(-groupRad, groupRad) + random(-18, 18);
        let py = cy + random(-groupRad, groupRad) + random(-18, 18);
        if (random() < 0.7) {
          let colorType = random();
          let col = getNebulaColor(colorType, n.baseHue, n.hueSpread);
          let distFromCore = dist(px, py, n.x, n.y);
          let density = exp(-pow(distFromCore / (layerRad * 0.8), 2));
          let alpha = map(distFromCore, 0, layerRad * 1.1, layerAlpha * 7.2, 38) * density * random(1.1, 1.7);
          galaxyBuffer.stroke(red(col) + random(-40,40), green(col) + random(-40,40), blue(col) + random(-40,40), alpha);
          galaxyBuffer.strokeWeight(random(1.2, 2.2) * 1.25 * 1.25);
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
      for (let i = 0; i < Math.floor(points / 16); i++) {
        let t = i / (points / 4);
        let px = fx + cos(filamentAngle) * filamentLen * t + random(-8, 8);
        let py = fy + sin(filamentAngle) * filamentLen * t + random(-8, 8);
        if (random() < 0.5) {
          let colorType = random();
          let col = getNebulaColor(colorType, n.baseHue, n.hueSpread);
          let distFromCore = dist(px, py, n.x, n.y);
          let density = exp(-pow(distFromCore / (layerRad * 0.8), 2));
          let alpha = map(distFromCore, 0, layerRad * 1.1, layerAlpha * 8.2, 28) * density * random(1.1, 2.0);
          galaxyBuffer.stroke(red(col) + random(-60,60), green(col) + random(-60,60), blue(col) + random(-60,60), alpha);
          galaxyBuffer.strokeWeight(random(1.2, 2.2) * 1.25 * 1.25);
          galaxyBuffer.point(px, py);
        }
      }
    }
    // --- Leave voids/gaps by skipping some regions ---
    // (No code needed, just don't fill everywhere)
  }
  // Add some scattered knots and filaments (more compact)
  const knotCount = int(n.r * 0.25 * n.shapeFactor);
  for (let i = 0; i < Math.floor(knotCount / 4); i++) {
    let angle = random(TWO_PI);
    let rad = random(n.r * 0.15, n.r * 0.7);
    let px = n.x + cos(angle) * rad + random(-8, 8);
    let py = n.y + sin(angle) * rad * random(0.85, 1.05) + random(-8, 8);
    let colorType = random();
    let col = getNebulaColor(colorType, n.baseHue, n.hueSpread);
  galaxyBuffer.stroke(red(col), green(col), blue(col), random(230, 255));
    galaxyBuffer.strokeWeight(random(1.5, 3.2) * 1.25 * 1.25);
    galaxyBuffer.point(px, py);
  }
  galaxyBuffer.pop();
}
// =========================
// 9. Mouse & Keyboard Interaction
// =========================
function mousePressed() {
  // Check if click is on instruction bar region
  if (window._instructionBarRegions) {
    for (let region of window._instructionBarRegions) {
      if (mouseX >= region.x && mouseX <= region.x + region.w && mouseY >= region.y && mouseY <= region.y + region.h) {
        // If this is a creation key (1-6), generate at center of screen
        if (["1","2","3","4","5","6"].includes(region.key)) {
          let cx = offsetX + (width / 2 - width / 2); // = offsetX
          let cy = offsetY + (height / 2 - height / 2); // = offsetY
          // But we want the center of the viewport in galaxy coordinates:
          cx = offsetX + (width / 2 - width / 2);
          cy = offsetY + (height / 2 - height / 2);
          // Actually, the correct formula is:
          cx = offsetX;
          cy = offsetY;
          if (region.key === "1") addNebula(cx, cy);
          else if (region.key === "2") addGalaxy(cx, cy);
          else if (region.key === "3") addBlackhole(cx, cy);
          else if (region.key === "4") addStarCluster(cx, cy);
          else if (region.key === "5") addPulsar(cx, cy);
          else if (region.key === "6") addQuasar(cx, cy);
          return false;
        } else {
          // Simulate key press for the region's key
          keyPressed.call({key: region.key, keyCode: region.key.charCodeAt(0)});
          return false;
        }
      }
    }
  }
  // Check if click is on task bar region
  if (window._taskBarRegions) {
    for (let region of window._taskBarRegions) {
      if (mouseX >= region.x && mouseX <= region.x + region.w && mouseY >= region.y && mouseY <= region.y + region.h) {
        // Only allow actions if an item is selected, except for info, save, and restart
        if (["size","density","color","deleteSelected"].includes(region.action)) {
          if (selectedObject) {
            if (region.action === "size") {
              key = 'e'; keyCode = 69; keyPressed();
            } else if (region.action === "density") {
              key = 'r'; keyCode = 82; keyPressed();
            } else if (region.action === "color") {
              key = 't'; keyCode = 84; keyPressed();
            } else if (region.action === "deleteSelected") {
              key = '`'; keyCode = 192; keyPressed();
            }
          }
        } else if (region.action === 'save') {
          key = 's'; keyCode = 83;
          // Simulate Ctrl key for save
          let oldKeyIsDown = keyIsDown;
          keyIsDown = function(k) { return k === CONTROL || k === 17; };
          keyPressed();
          keyIsDown = oldKeyIsDown;
        } else if (region.action === 'restart') {
          key = '';
          keyCode = 27;
          keyPressed();
        } else if (region.action === 'info') {
          key = 'i'; keyCode = 73; keyPressed();
        }
        return false;
      }
    }
  }
// ===== 7. INTERACTION HANDLERS =====
// ===== 8. ANIMATION & STATE HELPERS =====
  // Only handle info overlay close logic here
  if (showInfoOverlay) {
    let boxW = min(width * 0.7, 520);
    let boxH = min(height * 0.6, 340);
    let paddingX = 32;
    let paddingY = 28;
    let boxX = (width - boxW) / 2;
    let boxY = (height - boxH) / 2;
    if (
      mouseX < boxX || mouseX > boxX + boxW ||
      mouseY < boxY || mouseY > boxY + boxH
    ) {
      showInfoOverlay = false;
    }
    // Block all other mouse interactions while overlay is open
    return false;
  }
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
  let hit = getObjectAtScreen(mouseX, mouseY);
  if (hit) {
    // Always allow immediate reselection, even during reverse animation
    // Reset all selection and animation state
    selectedObject = hit.obj;
    selectedType = hit.type;
    selectedName = hit.name;
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
    prevSelectedObject = null;
    prevSelectedType = "";
    prevSelectedName = "";
    prevLabelLineStart = null;
    prevLabelLineEnd = null;
    labelAnimReverse = false;
    labelAnimActive = true;
  } else if (selectedObject) {
    // If no object found, always start reverse animation (even if already reversing)
    labelAnimStart = millis();
    labelAnimActive = true;
    labelAnimReverse = true;
    prevSelectedObject = selectedObject;
    prevSelectedType = selectedType;
    prevSelectedName = selectedName;
    prevLabelLineStart = labelLineStart;
    prevLabelLineEnd = labelLineEnd;
    // Do not clear selection until reverse animation completes
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
  // Ctrl+S: Save canvas without UI, all labels shown (no borders)
  if ((key === 's' || key === 'S') && (keyIsDown(CONTROL) || keyIsDown(17))) {
    // Hide UI overlays
    let prevShowInstructions = showInstructions;
    let prevShowInfoOverlay = showInfoOverlay;
    let prevSelectedObject = selectedObject;
    let prevSelectedType = selectedType;
    let prevSelectedName = selectedName;
    let prevLabelAnimActive = labelAnimActive;
    let prevLabelAnimReverse = labelAnimReverse;
    let prevLabelLineStart = labelLineStart;
    let prevLabelLineEnd = labelLineEnd;
    showInstructions = false;
    showInfoOverlay = false;
    // Show all labels (no border)
    let allObjects = [
      ...nebulae.map(o => ({obj: o, type: 'nebula'})),
      ...galaxies.map(o => ({obj: o, type: 'galaxy'})),
      ...blackholes.map(o => ({obj: o, type: 'blackhole'})),
      ...starClusters.map(o => ({obj: o, type: 'starcluster'})),
      ...pulsars.map(o => ({obj: o, type: 'pulsar'})),
      ...quasars.map(o => ({obj: o, type: 'quasar'}))
    ];
    // Draw to an offscreen buffer the size of the full galaxy
    let saveBuffer = createGraphics(galaxyW, galaxyH);
    saveBuffer.background(5, 5, 5);
    saveBuffer.image(galaxyBuffer, 0, 0, galaxyW, galaxyH);
    // Draw all labels (no border) at their true map positions
    setMainFont();
    saveBuffer.textAlign(LEFT, TOP);
    saveBuffer.textSize(instructionFontSize * 1.27);
    for (let {obj, type} of allObjects) {
      let r = obj.r || 40;
      let borderScale = getBorderScale(type);
      let side = r * borderScale;
      let half = side / 2;
      let objScreenX = obj.x + half + 16;
      let objScreenY = obj.y - half;
      let name = obj.name;
      let labelX = objScreenX;
      let labelY = objScreenY;
      let labelWidth = saveBuffer.textWidth(name) + 8;
      let labelHeight = instructionFontSize * 1.27 + instructionFontSize + 8;
      if (labelX + labelWidth > galaxyW) labelX = galaxyW - labelWidth;
      if (labelY + labelHeight > galaxyH) labelY = galaxyH - labelHeight;
      if (labelX < 0) labelX = 0;
      if (labelY < 0) labelY = 0;
      saveBuffer.fill(255);
      saveBuffer.stroke(40, 20, 0, 180);
      saveBuffer.strokeWeight(2);
      saveBuffer.text(name, labelX, labelY);
      saveBuffer.textSize(instructionFontSize);
      saveBuffer.noStroke();
      saveBuffer.fill(200);
      let classLabel = "";
      if (type === "galaxy") classLabel = "Galaxy";
      else if (type === "blackhole") classLabel = "Black Hole";
      else if (type === "nebula") classLabel = "Nebula";
      else if (type === "starcluster") classLabel = "Star Cluster";
      else if (type === "pulsar") classLabel = "Pulsar";
      else if (type === "quasar") classLabel = "Quasar";
      saveBuffer.text(classLabel, labelX, labelY + instructionFontSize * 1.27);
      saveBuffer.textSize(instructionFontSize * 1.27);
    }
    saveBuffer.textSize(instructionFontSize);
    saveBuffer.textAlign(LEFT, TOP);
    saveBuffer.noStroke();
    // Save the image
    save(saveBuffer, 'galaxy_map_full.png');
    // Restore UI state
    showInstructions = prevShowInstructions;
    showInfoOverlay = prevShowInfoOverlay;
    selectedObject = prevSelectedObject;
    selectedType = prevSelectedType;
    selectedName = prevSelectedName;
    labelAnimActive = prevLabelAnimActive;
    labelAnimReverse = prevLabelAnimReverse;
    labelLineStart = prevLabelLineStart;
    labelLineEnd = prevLabelLineEnd;
    return false;
  }
  // Always handle info overlay toggle first
  if (key === 'i' || key === 'I') {
    showInfoOverlay = !showInfoOverlay;
    if (showInfoOverlay) {
      infoOverlayStartTime = millis();
      infoOverlayTypedChars = 0;
    }
    return false;
  }
  // If overlay is open, block all other actions
  if (showInfoOverlay) return false;
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
  // Delete selected item with backtick (`)
  if (key === '`') {
    if (selectedObject && selectedType) {
      let list = null;
      if (selectedType === "nebula") list = nebulae;
      else if (selectedType === "galaxy") list = galaxies;
      else if (selectedType === "blackhole") list = blackholes;
      else if (selectedType === "starcluster") list = starClusters;
      else if (selectedType === "pulsar") list = pulsars;
           else if (selectedType === "quasar") list = quasars;
      if (list) {
        let idx = list.indexOf(selectedObject);
        if (idx !== -1) {
          list.splice(idx, 1);
          selectedObject = null;
          selectedType = "";
          selectedName = "";
          redrawBuffer();
        }
      }
    }
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

    // E: Cycle size (expanded ranges)
    if (key === 'e' || key === 'E') {
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
    // R: Cycle density (expanded and more dramatic changes)
    if (key === 'r' || key === 'R') {
      if (selectedType === 'nebula') {
        // Dramatically increase/decrease layers
        let minLayers = 2, maxLayers = 24;
        let step = random([2, 3, 4, 5]);
        if (!selectedObject._densityDir) selectedObject._densityDir = 1;
        selectedObject.layers += step * selectedObject._densityDir;
        if (selectedObject.layers > maxLayers) { selectedObject.layers = maxLayers; selectedObject._densityDir = -1; }
        if (selectedObject.layers < minLayers) { selectedObject.layers = minLayers; selectedObject._densityDir = 1; }
        // Add more variation to layer properties
        selectedObject.layerSeeds = Array.from({length: selectedObject.layers}, () => random(10000));
        selectedObject.layerRads = Array.from({length: selectedObject.layers}, (_, i) => selectedObject.r * map(i, 0, selectedObject.layers - 1, random(0.7, 1.2), random(2.2, 6.2)));
        selectedObject.layerAlphas = Array.from({length: selectedObject.layers}, (_, i) => map(i, 0, selectedObject.layers - 1, random(20, 180), random(8, 120)));
        selectedObject.armCounts = Array.from({length: selectedObject.layers}, () => int(random(2, 32)));
        selectedObject.armSpreads = Array.from({length: selectedObject.layers}, () => random(0.1, 10.2));
      } else if (selectedType === 'galaxy') {
        // Dramatically increase/decrease arms
        let minArms = 2, maxArms = 18;
        let step = random([2, 3, 4]);
        if (!selectedObject._densityDir) selectedObject._densityDir = 1;
        selectedObject.arms += step * selectedObject._densityDir;
        if (selectedObject.arms > maxArms) { selectedObject.arms = maxArms; selectedObject._densityDir = -1; }
        if (selectedObject.arms < minArms) { selectedObject.arms = minArms; selectedObject._densityDir = 1; }
        selectedObject.armSeeds = Array.from({length: selectedObject.arms}, () => random(10000));
        selectedObject.armAngles = Array.from({length: selectedObject.arms}, (v, arm) => (TWO_PI / selectedObject.arms) * arm + random(-0.5, 0.5));
      } else if (selectedType === 'starcluster') {
        // Dramatically increase/decrease count
        let minCount = 40, maxCount = 600;
        let step = int(random([40, 60, 80]));
        if (!selectedObject._densityDir) selectedObject._densityDir = 1;
        selectedObject.count += step * selectedObject._densityDir;
        if (selectedObject.count > maxCount) { selectedObject.count = maxCount; selectedObject._densityDir = -1; }
        if (selectedObject.count < minCount) { selectedObject.count = minCount; selectedObject._densityDir = 1; }
      } else if (selectedType === 'quasar') {
        // Dramatically increase/decrease radius
        let minR = 30, maxR = 220;
        let step = int(random([16, 24, 32]));
        if (!selectedObject._densityDir) selectedObject._densityDir = 1;
        selectedObject.r += step * selectedObject._densityDir;
        if (selectedObject.r > maxR) { selectedObject.r = maxR; selectedObject._densityDir = -1; }
        if (selectedObject.r < minR) { selectedObject.r = minR; selectedObject._densityDir = 1; }
      }
      redrawBuffer();
    }
    // T: Cycle hue
    if (key === 't' || key === 'T') {
      if (selectedObject && typeof selectedObject.baseHue === 'number') {
        selectedObject.baseHue = (selectedObject.baseHue + 30) % 360;
        redrawBuffer();
      }
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
  // For tap-to-select
  window._touchStartX = touches[0].x;
  window._touchStartY = touches[0].y;
}
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // Recenter viewport
  offsetX = galaxyW / 2;
  offsetY = galaxyH / 2;
  redrawBuffer();
}
// Touch move: smooth panning with momentum
function touchMoved() {
  if (dragging && touches.length > 0) {
    let dx = touches[0].x - lastTouchX;
    let dy = touches[0].y - lastTouchY;
    offsetX -= dx;
    offsetY -= dy;
    panVXAvg = panVXAvg * 0.7 - dx * 0.3;
    panVYAvg = panVYAvg * 0.7 - dy * 0.3;
    lastTouchX = touches[0].x;
    lastTouchY = touches[0].y;
    offsetX = constrain(offsetX, 0, galaxyW);
    offsetY = constrain(offsetY, 0, galaxyH);
  }
  return false;
}

function touchEnded() {
  dragging = false;
  panVX = panVXAvg;
  panVY = panVYAvg;
  // On tap (touch ends with minimal movement), simulate mousePressed at tap location
  if (typeof window._touchStartX === 'number' && typeof window._touchStartY === 'number') {
    let dx = Math.abs((touches[0] && touches[0].x) ? touches[0].x - window._touchStartX : lastTouchX - window._touchStartX);
    let dy = Math.abs((touches[0] && touches[0].y) ? touches[0].y - window._touchStartY : lastTouchY - window._touchStartY);
    if (dx < 8 && dy < 8) {
      // Temporarily set mouseX/mouseY to tap location, call mousePressed, then restore
      let prevMouseX = mouseX, prevMouseY = mouseY;
      window.mouseX = window._touchStartX;
      window.mouseY = window._touchStartY;
      mousePressed();
      window.mouseX = prevMouseX;
      window.mouseY = prevMouseY;
    }
    window._touchStartX = undefined;
    window._touchStartY = undefined;
  }
  return false;
}
// =========================
// Debugging & Testing
// =========================
function keyTyped() {
  if (key === 'd') {
    // Debug: Print object counts
    console.log(`Nebulae: ${nebulae.length}, Galaxies: ${galaxies.length}, Blackholes: ${blackholes.length}, Star Clusters: ${starClusters.length}, Pulsars: ${pulsars.length}, Quasars: ${quasars.length}`);
  }
}
// =========================
// Task Bar
// =========================
function drawTaskBar() {
  // Store clickable regions for mousePressed
  if (!window._taskBarRegions) window._taskBarRegions = [];
  window._taskBarRegions.length = 0;
  // Task bar settings
  let barWidth = Math.max(120, Math.min(0.13 * width, 160));
  let buttonHeight = Math.max(28, Math.min(0.045 * height, 44));
  setMainFont();
  let fontSize = instructionFontSize;
  let buttons = [
    { label: 'Size: E', key: 'e', action: 'size' },
    { label: 'Density: R', key: 'r', action: 'density' },
    { label: 'Color: T', key: 't', action: 'color' },
    { label: 'Delete Selected: `', key: '`', action: 'deleteSelected' },
    { label: 'Restart: Esc', key: 'escape', action: 'restart' },
    { label: 'Info: I', key: 'i', action: 'info' },
    { label: 'Save: Ctrl+S', key: 'ctrls', action: 'save' }
  ];
  // Center vertically
  let totalBarHeight = buttons.length * buttonHeight;
  let barY = (height - totalBarHeight) / 2;
  let barX = 0;
  // No background, no stroke, no blendMode for task bar
  textAlign(LEFT, CENTER);
  textSize(fontSize);
  fill(255);
  for (let i = 0; i < buttons.length; i++) {
    let bx = barX;
    let by = barY + i * buttonHeight;
    let padding = 14;
    let region = {x: bx, y: by, w: barWidth, h: buttonHeight, action: buttons[i].action, key: buttons[i].key};
    window._taskBarRegions.push(region);
    let isHovered = mouseX >= bx && mouseX <= bx + barWidth && mouseY >= by && mouseY <= by + buttonHeight && mouseInViewport;
    let isTouchActive = window._lastTouch && window._lastTouch.x >= bx && window._lastTouch.x <= bx + barWidth && window._lastTouch.y >= by && window._lastTouch.y <= by + buttonHeight;
    if (isHovered || isTouchActive) {
      fill(255, 255, 0);
    } else {
      fill(255);
    }
    text(buttons[i].label, bx + padding, by + buttonHeight / 2);
  }
  // (No click handling here; handled in mousePressed)
}
function drawInfoOverlay() {
  // Animate swipe (slide up/down)
  infoOverlayTarget = showInfoOverlay ? 1 : 0;
  infoOverlayAnim = lerp(infoOverlayAnim, infoOverlayTarget, 0.18);
  if (abs(infoOverlayAnim - infoOverlayTarget) < 0.01) infoOverlayAnim = infoOverlayTarget;
  if (infoOverlayAnim < 0.01) return;
  push();
  // Overlay dimensions and style
  let boxW = min(width * 0.9, 600);
  let boxH = min(height * 0.8, 400);
  let paddingX = 32;
  let paddingY = 32;
  // Slide in from left
  let boxXHidden = -boxW - 40;
  let boxXShown = (width - boxW) / 2;
  let boxX = lerp(boxXHidden, boxXShown, infoOverlayAnim);
  let boxY = (height - boxH) / 2;
  // Shadow
  noStroke();
  fill(0, 0, 0, 120 * infoOverlayAnim);
  rect(0, 0, width, height);
  // Card
  fill(10, 10, 10, 230);
  stroke(255, 200);
  strokeWeight(2);
  rectMode(CORNER);
  rect(boxX, boxY, boxW, boxH); // no roundness
  noStroke();
  // Title
  let isOverlayActive = showInfoOverlay && infoOverlayAnim > 0.95;
  if (isOverlayActive && (mouseInViewport && mouseIsPressed || window._lastTouch)) {
    fill(255, 255, 0);
  } else {
    fill(255);
  }
  textAlign(LEFT, CENTER);
  textSize(instructionFontSize * 1.6);
  let title = 'Point Zer0';
  let titleH = instructionFontSize * 2.5;
  text(title, boxX + paddingX, boxY + paddingY, boxW - 2 * paddingX, titleH);
  // Info text (with typing effect)
  textSize(instructionFontSize * 1.08);
  let infoText =
    'The project is based on the Big Bang Theory (Georges Lemaître 1927):\n\n' +
    'The universe began as an extremely hot, dense point (a singularity) approximately 13.8 billion years ago, and it has been expanding ever since.\n\n' +
    'This website allows users to create a custom map of their own universe — it is your canvas! Go wild, create a universe to your liking, and most importantly: have fun!\n\n' +
    '- Nguyen Trong Tin';
  let infoY = boxY + paddingY + titleH + instructionFontSize * 0.7;
  let infoH = boxH - (infoY - boxY) - paddingY;
  // Typing effect
  let charsPerSec = 120;
  let elapsed = (millis() - infoOverlayStartTime) / 1000;
  let maxChars = min(infoText.length, Math.floor(elapsed * charsPerSec));
  let displayText = infoText.substring(0, maxChars);
  textAlign(LEFT, TOP);
  // Draw text (no scrolling needed)
  let y = infoY;
  text(displayText, boxX + paddingX, y, boxW - 2 * paddingX, boxH - (y - boxY) - paddingY);
  pop();
}

// Mouse wheel scroll for info overlay
