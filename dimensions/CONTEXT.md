# Dimensions Webapp — Context & Architecture

## Project Overview
Interactive single-page site explaining high-dimensional geometry paradoxes through 7 sections + summary. Deployed at `/home/ubuntu/physics-webapp/dimensions/` and live at `https://physics.connermccarthy.com/dimensions/`.

**Theme**: Dark space aesthetic (#030711 bg, purple/blue/orange accents)  
**Key interaction**: Simple/Detailed toggle for each section's prose; sliders and buttons for dimension control  
**Target**: Make unintuitive high-dimensional math visceral through 2D canvas animations

---

## File Structure

### index.html
Single HTML file containing all structure, styles, and JavaScript. No build step.

**Sections (02–08)**:
1. **Shell paradox** (volume concentration)
2. **Word vectors** (king − man + woman ≈ queen)
3. **Equatorial collapse** (surface area flattening)
4. **Nearest-neighbor** (soccer field, distance collapse, 1D/2D/3D visualization)
5. **Volume-overlap** (darts, probability)
6. **Orthogonality** (removed; was embedding capacity payoff)
7. **Summary table** (tradeoffs side-by-side)

### content.js
All text content (hero, section tags, headings, simple/detail prose, captions, footer) stored as `window.DIM_CONTENT` object. Injected into HTML via IIFE on page load. **Edit this file to change prose.**

---

## Key Math Utilities

All defined in `<script>` tag of index.html, before section handlers.

### gamma(z)
Lanczos approximation (9-coefficient set) for Gamma function. Verified against π (for gamma(2,1)) and 4π/3 (for gamma(3,1)) to ~14 digits.

### Ball Volume
`ballVolume(d, r)` — Volume of d-dimensional ball with radius r.  
Uses: π^(d/2) / Gamma(d/2 + 1) · r^d

### Shell Interior Fraction
`shellInteriorFraction(d, thickness)` — Fraction of ball volume inside outer shell of specified thickness.  
Shows collapse as d increases.

### Equatorial Fraction
`equatorialFraction(d, thetaDeg, resolution=400)` — Simpson's rule numerical integration over S^(d-1).  
Computes fraction of surface area within θ degrees of equator.

### Nearest-Neighbor Simulation
`nnSimulation(d, N)` — N random points in [0,1]^d, one fixed reference.  
Returns: `{minDist, maxDist, ratio}` (ratio → 1 as d increases).

### Volume-Overlap / Collision Probability
`collisionProbability(d, r)` — Probability random point in [-1,1]^d lands inside ball of radius r.  
Formula: V_d(r) / 2^d

### Orthogonal Count
`approxOrthogonalCount(d, toleranceDegrees)` — Estimate of nearly-orthogonal directions in d dims.

---

## Section Visualizations

### Section 2 (Shell)
- **Canvas**: 260×260, 2D circle with orange ring + pulsing blue core
- **Animation**: Blue core scales with actual volume fraction (collapse visible)
- **Slider**: Shell thickness (0–50% of radius)
- **Charts** (detail-only): Fraction vs. dimension

### Section 3 (Word Vectors)
- **Canvas**: 600×480 (2× pixel density via ctx.scale), 2D scatter plot
- **Coordinates**: 4 hand-placed words (man, woman, king, queen) in 2D slice
- **Animation**: 3-phase arrow sequence showing king → (king − man) → (predicted) → queen
  - Phase 1: king to king−man (blue arrow, labeled "− man"), animT ∈ [0, 1]
  - Phase 2: (king−man) to king−man+woman (orange arrow, labeled "+ woman"), animT ∈ [1, 2]
  - Phase 3: dashed residual to actual queen, animT ∈ [2, 3]
- **Static pause**: animT starts at -0.36 (0.5s delay before phase 1)
- **Reference arrow removed**: Man→woman faint arrow was removed per user
- **Axis labels**: "status/royalty →" on left, "♀/♂" on y-axis
- **Detail-only**: Cosine similarity readout

### Section 4 (Equatorial)
- **Canvas**: 280×200, 2D ellipse showing band squashing
- **Visualization**: Dashed equator line + pole tick marks, orange band marking ±θ degrees
- **Slider**: Band half-width (5–45 degrees)
- **Charts** (detail-only): Equatorial fraction vs. dimension

### Section 5 (Nearest-Neighbor / Soccer)
- **Canvas**: 560×440 (2× pixel density), **dimension-specific visualizations**:
  - **d=1**: Horizontal line showing distance range (min left, max right)
  - **d=2**: Radial 2D plot (angle by index, radius by distance)
  - **d≥3**: **Isometric 3D projection** of first 3 dimensions
    - Projection: screen_x = x − z·cos(30°), screen_y = y + z·sin(30°)
    - Depth sorting (painter's algorithm)
    - Faint XY grid plane, colored axes (red X, green Y, blue Z)
- **Sliders** (detail-only): Dimension slider (1–300), points slider (10–200), resample button
- **Buttons** (simple-only): Preset dimensions [1, 2, 3, 10, 100, 300] — **no re-randomization** on click
  - Fixed point set stored in 300 dims; dimension change reuses same points with fewer coords
  - Only regenerate on "Resample" or page load
- **Highlights**: Closest (blue), farthest (orange), center (you)
- **Charts** (detail-only): Ratio curve vs. dimension

### Section 6 (Volume-Overlap / Darts)
- **Canvas**: 260×260, 2D dartboard
- **Visualization**: Target rings (outer green, middle red, bullseye dark red), crosshair, random darts
- **Darts buffer**: ~70 darts, ~0.5/frame spawn, fade over time
- **Colors**: Blue hit, orange miss
- **Sliders**: Dimension (1–100), radius % (10–90)
- **Charts** (detail-only): Probability vs. dimension, expected tries

### Section 7 (Orthogonality)
**Removed from this version.**

---

## Technical Implementation Details

### Canvas Resolution & Sharpness
Sections 3 & 5 use 2× pixel density:
- Canvas HTML attribute: 2× size (e.g., 600×480)
- ctx.scale(2, 2) at start of draw
- All coordinates use logical space (300×240 for section 3, 280×220 for section 5)
- ctx.restore() to undo scale before requestAnimationFrame

### Simple/Detailed Toggle
- CSS: `.simple-only { display:block }`, `.detail-only { display:none }`
- Page class: `.page.detail-mode` swaps visibility
- Event listeners on `.level-btn` toggle button
- Captions, secondary charts, detailed controls use `.detail-only` class

### Content Injection
IIFE at top of script:
```javascript
const injectSection = (sectionId, s) => {
  const root = document.getElementById(sectionId);
  if (!root || !s) return;
  const q = sel => root.querySelector(sel);
  if (s.tag)     { const e = q('.dim-tag');      if (e) e.innerHTML = s.tag; }
  if (s.heading) { const e = q('.dim-heading');  if (e) e.innerHTML = s.heading; }
  if (s.simple)  { const e = q('.simple-only');  if (e) e.innerHTML = s.simple; }
  if (s.detail)  { const e = q('.detail-only');  if (e) e.innerHTML = s.detail; }
  if (s.caption) { const e = q('.dim-caption');  if (e) e.innerHTML = s.caption; }
};
```

### Mobile Responsiveness
- **≤ 640px breakpoint**: CSS variables boost contrast
  - `--text: rgba(255,255,255, 1.0)` (was 0.88)
  - `--text-muted: rgba(255,255,255, 0.88)` (was 0.50)
  - `--text-faint: rgba(255,255,255, 0.68)` (was 0.28)
- Padding reduced, font sizes tuned
- Canvases expand to fill container width (via `width: 100%; align-self: stretch`)
- Charts auto-hide in simple mode (`.detail-only`)

### Color Palette
- Purple (main): 178, 139, 255
- Blue: 93, 170, 255
- Orange: 255, 140, 66
- Dark bg: #030711
- Text: 255, 255, 255 at variable opacity

---

## Known Design Decisions

1. **Word vector arithmetic is explicit**: Shows king − man + woman → queen, not just the residual, to make the formula visually obvious.

2. **Dimension slider vs. buttons**: Simple mode uses buttons for discrete jumps (1, 2, 3, 10, 100, 300); detailed mode uses slider for fine control.

3. **Fixed point set in NN section**: Same 50 points across all dimension changes (only re-randomize on explicit "Resample") so users see distances **converge**, not re-scatter.

4. **3D visualization for d≥3**: Isometric projection shows actual 3D geometry of first 3 coords, not a stylized representation. Helps intuition about how volume and distance behave in real high-dimensional space.

5. **Captions are detail-only**: Metaphor notes ("the circle's drawn radius is fixed...") hidden in simple mode to reduce cognitive load.

6. **Dimension label above buttons**: "Dimensions" label in subtle grey, buttons labeled as just numbers (1, 2, 3…) not "d=1".

---

## Future Work / Extensibility

- **Section 7 (Orthogonality)**: Removed but content.js still has a placeholder. Can re-add canvas + JS if needed.
- **3D rendering**: Could upgrade to WebGL for true 3D with rotation/zoom, but canvas 2D isometric is sufficient for current goals.
- **Export/sharing**: Could add URL params to save/share dimension + state.
- **Mobile: gesture controls**: Pinch/swipe on mobile for dimension changes instead of/alongside buttons.

---

## Quick Edits

| Goal | Where |
|------|-------|
| Change prose | `content.js` — edit `window.DIM_CONTENT` |
| Change colors | CSS `:root` variables in `<style>` tag |
| Adjust canvas size | Canvas `width`/`height` attributes + logical dimensions in JS |
| Add/remove section | Delete section HTML block + JS IIFE + content.js entry + injection call |
| Tweak math | Math utility functions in script tag (e.g., `gamma`, `ballVolume`, `nnSimulation`) |

---

## Deployment

Files live at `/home/ubuntu/physics-webapp/dimensions/`:
- `index.html` — main page
- `content.js` — text content
- Served by nginx from `/home/ubuntu/physics-webapp/` root, HTTPS via Let's Encrypt

No build step. Change, save, reload browser.
