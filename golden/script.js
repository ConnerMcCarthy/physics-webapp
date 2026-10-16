'use strict';

const PHI = (1 + Math.sqrt(5)) / 2;
const INV_PHI = 1 / PHI;

class CoefficientExplorer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = 0;
    this.height = 0;
    this.scale = 52;
    this.offset = { x: 0, y: 0 };
    this.point = { a: 1, b: 0 };
    this.history = [{ a: 1, b: 0 }];
    this.animation = null;
    this.drag = null;
    this.autoTimer = null;
    this.sequenceAnimation = null;
    this.collisionAnnotation = false;
    this.powersShown = 7;
    this.atlasDigitCount = 6;
    this.cachedDigitGroups = new Map();
    this.options = {
      grid: true,
      basis: false,
      transformedGrid: false,
      eigen: false,
      complex: false,
      digitAtlas: true
    };

    this.elements = this.getElements();
    this.bindControls();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas.parentElement);
    this.resize();
    this.fitRepresentationAtlas();
    this.updateInterface();
    this.renderSequence();
    this.updateDigitBuilder();
    this.updateAtlasSummary();
    requestAnimationFrame(time => this.frame(time));
  }

  getElements() {
    const ids = [
      'pairReadout', 'expressionReadout', 'complexReadout', 'realValue', 'aInput', 'bInput',
      'multiplyButton', 'backButton', 'resetButton', 'autoButton', 'pauseButton',
      'basisToggle', 'gridToggle', 'transformGridToggle', 'eigenToggle', 'complexToggle', 'digitAtlasToggle',
      'algebraStart', 'algebraStepOne', 'algebraStepTwo', 'algebraResult',
      'fitViewButton', 'showEigenButton', 'powerSlider', 'powerCount',
      'sequenceStrip', 'animatePowersButton', 'complexViewButton', 'atlasSummary',
      'atlasDigitSlider', 'atlasDigitCount', 'atlasDigitLimit', 'atlasToggleLabel',
      'phiDigitsInput', 'digitExpression', 'digitPair', 'plotDigitsButton'
    ];
    return Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.offset.x === 0 && this.offset.y === 0) {
      this.offset.x = this.width * 0.43;
      this.offset.y = this.height * 0.62;
    }
    if (this.options.digitAtlas) this.fitRepresentationAtlas();
  }

  worldToScreen(a, b) {
    return {
      x: this.offset.x + a * this.scale,
      y: this.offset.y - b * this.scale
    };
  }

  screenToWorld(x, y) {
    return {
      a: (x - this.offset.x) / this.scale,
      b: (this.offset.y - y) / this.scale
    };
  }

  visibleBounds() {
    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(this.width, this.height);
    return {
      minA: topLeft.a,
      maxA: bottomRight.a,
      minB: bottomRight.b,
      maxB: topLeft.b
    };
  }

  niceGridStep() {
    const targetPixels = 65;
    const raw = targetPixels / this.scale;
    const power = Math.pow(10, Math.floor(Math.log10(raw)));
    const normalized = raw / power;
    const factor = normalized < 1.5 ? 1 : normalized < 3.5 ? 2 : normalized < 7.5 ? 5 : 10;
    return factor * power;
  }

  renderGrid() {
    if (!this.options.grid) return;
    const ctx = this.ctx;
    const bounds = this.visibleBounds();
    const step = this.niceGridStep();
    const startA = Math.floor(bounds.minA / step) * step;
    const startB = Math.floor(bounds.minB / step) * step;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(210, 232, 221, 0.075)';
    ctx.beginPath();
    for (let a = startA; a <= bounds.maxA + step * 0.5; a += step) {
      const x = this.worldToScreen(a, 0).x;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    for (let b = startB; b <= bounds.maxB + step * 0.5; b += step) {
      const y = this.worldToScreen(0, b).y;
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
    }
    ctx.stroke();
    this.renderCoordinateLabels(step, bounds);
  }

  renderCoordinateLabels(step, bounds) {
    const ctx = this.ctx;
    const origin = this.worldToScreen(0, 0);
    ctx.fillStyle = 'rgba(190, 207, 199, 0.62)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const startA = Math.ceil(bounds.minA / step) * step;
    for (let a = startA; a <= bounds.maxA; a += step) {
      if (Math.abs(a) < step * 0.1) continue;
      const point = this.worldToScreen(a, 0);
      if (origin.y > 4 && origin.y < this.height - 18) ctx.fillText(this.formatTick(a), point.x, origin.y + 6);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const startB = Math.ceil(bounds.minB / step) * step;
    for (let b = startB; b <= bounds.maxB; b += step) {
      if (Math.abs(b) < step * 0.1) continue;
      const point = this.worldToScreen(0, b);
      if (origin.x > 32 && origin.x < this.width - 5) ctx.fillText(this.formatTick(b), origin.x - 7, point.y);
    }
  }

  formatTick(value) {
    return Math.abs(value) >= 1000 ? value.toExponential(0) : Number(value.toPrecision(4)).toString();
  }

  renderAxes() {
    const ctx = this.ctx;
    const origin = this.worldToScreen(0, 0);
    ctx.strokeStyle = 'rgba(232, 243, 237, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(this.width, origin.y);
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, this.height);
    ctx.stroke();

    ctx.fillStyle = '#eef5f0';
    ctx.font = '600 14px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    const horizontalLabel = this.options.complex ? 'Re(z) = a' : 'a · coefficient of 1';
    const verticalLabel = this.options.complex ? 'Im(z) = b' : 'b · coefficient of φ';
    ctx.fillText(horizontalLabel, this.width - 15, Math.min(this.height - 8, origin.y - 10));
    ctx.save();
    ctx.translate(Math.max(18, origin.x + 17), 18);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'right';
    ctx.fillText(verticalLabel, 0, 0);
    ctx.restore();

    ctx.fillStyle = '#f5c451';
    ctx.fillRect(origin.x - 4, origin.y - 4, 8, 8);
  }

  renderBasisVectors() {
    if (!this.options.basis) return;
    this.drawArrow({ a: 0, b: 0 }, { a: 1, b: 0 }, '#64c5e8', '1  ↔  (1, 0)');
    const verticalLabel = this.options.complex ? 'i  ↔  (0, 1)' : 'φ  ↔  (0, 1)';
    this.drawArrow({ a: 0, b: 0 }, { a: 0, b: 1 }, '#61d6ac', verticalLabel);
  }

  drawArrow(from, to, color, label) {
    const ctx = this.ctx;
    const p1 = this.worldToScreen(from.a, from.b);
    const p2 = this.worldToScreen(to.a, to.b);
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const head = 9;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p2.x - head * Math.cos(angle - 0.45), p2.y - head * Math.sin(angle - 0.45));
    ctx.lineTo(p2.x - head * Math.cos(angle + 0.45), p2.y - head * Math.sin(angle + 0.45));
    ctx.closePath();
    ctx.fill();
    ctx.font = '600 11px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, p2.x + 8, p2.y - 7);
  }

  transform(point) {
    return { a: point.b, b: point.a + point.b };
  }

  inverseTransform(point) {
    return { a: point.b - point.a, b: point.a };
  }

  renderTransformedGrid() {
    if (!this.options.transformedGrid) return;
    const ctx = this.ctx;
    const bounds = this.visibleBounds();
    const extent = Math.max(
      Math.abs(bounds.minA), Math.abs(bounds.maxA),
      Math.abs(bounds.minB), Math.abs(bounds.maxB)
    ) * 1.6;
    const step = this.niceGridStep();
    ctx.save();
    ctx.strokeStyle = 'rgba(245, 196, 81, 0.20)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    for (let k = -extent; k <= extent; k += step) {
      let a = this.transform({ a: k, b: -extent });
      let b = this.transform({ a: k, b: extent });
      let p1 = this.worldToScreen(a.a, a.b);
      let p2 = this.worldToScreen(b.a, b.b);
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      a = this.transform({ a: -extent, b: k });
      b = this.transform({ a: extent, b: k });
      p1 = this.worldToScreen(a.a, a.b);
      p2 = this.worldToScreen(b.a, b.b);
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  renderEigenDirections() {
    if (!this.options.eigen) return;
    const bounds = this.visibleBounds();
    const extent = Math.max(Math.abs(bounds.minA), Math.abs(bounds.maxA)) + 5;
    this.drawInfiniteDirection(1, PHI, extent, '#f5c451', 'λ = φ · expands');
    this.drawInfiniteDirection(1, -INV_PHI, extent, '#ef7d67', 'λ = −1/φ · contracts + flips');
  }

  drawInfiniteDirection(a, b, extent, color, label) {
    const ctx = this.ctx;
    const p1 = this.worldToScreen(-a * extent, -b * extent);
    const p2 = this.worldToScreen(a * extent, b * extent);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.75;
    ctx.setLineDash([10, 7]);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);
    const labelPoint = this.worldToScreen(a * Math.min(extent * 0.55, 3), b * Math.min(extent * 0.55, 3));
    ctx.fillStyle = color;
    ctx.font = '600 11px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, labelPoint.x + 8, labelPoint.y - 8);
    ctx.restore();
  }

  fibonacciPowers(count = this.powersShown) {
    const result = [{ n: 0, a: 1, b: 0 }];
    let current = { a: 0, b: 1 };
    for (let n = 1; n <= count; n++) {
      result.push({ n, a: current.a, b: current.b });
      current = this.transform(current);
    }
    return result;
  }

  renderPowerPath(time) {
    const ctx = this.ctx;
    const powers = this.fibonacciPowers();
    ctx.strokeStyle = 'rgba(97, 214, 172, 0.48)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    powers.forEach((power, index) => {
      const point = this.worldToScreen(power.a, power.b);
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();

    powers.forEach(power => {
      const point = this.worldToScreen(power.a, power.b);
      const active = this.sequenceAnimation && power.n <= this.sequenceAnimation.visibleN;
      ctx.fillStyle = active ? '#f5c451' : '#61d6ac';
      const size = active ? 12 : 9;
      ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(226, 240, 232, 0.78)';
      const label = this.options.complex
        ? `φ${this.superscript(power.n)}  ${this.formatComplex(power.a, power.b)}`
        : `φ${this.superscript(power.n)} (${power.a}, ${power.b})`;
      ctx.fillText(label, point.x + 7, point.y - 5);
    });
  }

  superscript(number) {
    const digits = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    return String(number).split('').map(digit => digits[Number(digit)]).join('');
  }

  renderHistory() {
    if (this.history.length < 2) return;
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(245, 196, 81, 0.34)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    this.history.forEach((item, index) => {
      const point = this.worldToScreen(item.a, item.b);
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  }

  displayedPoint(time) {
    if (!this.animation) return this.point;
    const elapsed = time - this.animation.start;
    const progress = Math.min(1, elapsed / this.animation.duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const point = {
      a: this.animation.from.a + (this.animation.to.a - this.animation.from.a) * eased,
      b: this.animation.from.b + (this.animation.to.b - this.animation.from.b) * eased
    };
    if (progress >= 1) {
      const done = this.animation.to;
      this.animation = null;
      this.point = done;
      this.history.push({ ...done });
      this.updateInterface();
    }
    return point;
  }

  renderCurrentPoint(time) {
    const point = this.displayedPoint(time);
    const screen = this.worldToScreen(point.a, point.b);
    const ctx = this.ctx;
    ctx.shadowColor = 'rgba(245, 196, 81, 0.6)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#f5c451';
    ctx.fillRect(screen.x - 8, screen.y - 8, 16, 16);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#07100f';
    ctx.lineWidth = 2;
    ctx.strokeRect(screen.x - 8, screen.y - 8, 16, 16);
    ctx.fillStyle = '#f5c451';
    ctx.font = '600 12px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    if (this.collisionAnnotation) {
      this.renderCollisionAnnotation(screen);
    } else {
      const pointLabel = this.options.complex
        ? this.formatComplex(point.a, point.b)
        : `(${this.formatNumber(point.a)}, ${this.formatNumber(point.b)})`;
      ctx.fillText(pointLabel, screen.x + 12, screen.y - 9);
    }
  }

  renderCollisionAnnotation(screen) {
    const ctx = this.ctx;
    const width = 176;
    const height = 76;
    const x = screen.x + width + 24 < this.width ? screen.x + 15 : screen.x - width - 15;
    const y = Math.max(12, Math.min(this.height - height - 12, screen.y - height - 14));
    ctx.fillStyle = 'rgba(7, 16, 15, 0.94)';
    ctx.strokeStyle = 'rgba(245, 196, 81, 0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 5);
    ctx.fill();
    ctx.stroke();
    ctx.font = '600 12px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#61d6ac';
    ctx.fillText('011 (base φ) = φ + 1', x + 11, y + 18);
    ctx.fillStyle = '#f5c451';
    ctx.fillText('100 (base φ) = φ²', x + 11, y + 38);
    ctx.fillStyle = 'rgba(226, 240, 232, 0.72)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('same grid point  (1, 1)', x + 11, y + 59);
  }

  render(time) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#0b1514';
    ctx.fillRect(0, 0, this.width, this.height);
    this.renderGrid();
    this.renderTransformedGrid();
    this.renderAxes();
    this.renderEigenDirections();
    this.renderBasisVectors();
    if (this.options.digitAtlas) this.renderDigitRepresentationAtlas();
    else this.renderPowerPath(time);
    this.renderHistory();
    this.renderCurrentPoint(time);
  }

  frame(time) {
    if (this.sequenceAnimation) {
      const elapsed = time - this.sequenceAnimation.start;
      this.sequenceAnimation.visibleN = Math.min(this.powersShown, Math.floor(elapsed / 430));
      this.updateSequenceHighlight(this.sequenceAnimation.visibleN);
      if (this.sequenceAnimation.visibleN >= this.powersShown) this.sequenceAnimation = null;
    }
    this.render(time);
    requestAnimationFrame(next => this.frame(next));
  }

  animateTo(target) {
    if (this.animation) return;
    this.collisionAnnotation = false;
    this.animation = {
      from: { ...this.point },
      to: target,
      start: performance.now(),
      duration: 620
    };
  }

  multiply() {
    this.stopSequenceAnimation();
    this.animateTo(this.transform(this.point));
  }

  stepBackward() {
    this.stopSequenceAnimation();
    this.animateTo(this.inverseTransform(this.point));
  }

  setPoint(a, b, addHistory = false, preserveAnnotation = false) {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return;
    if (!preserveAnnotation) this.collisionAnnotation = false;
    this.animation = null;
    this.point = { a, b };
    if (addHistory) this.history.push({ ...this.point });
    else this.history = [{ ...this.point }];
    this.updateInterface();
  }

  showCollisionPoint() {
    this.options.digitAtlas = true;
    this.elements.digitAtlasToggle.checked = true;
    this.elements.atlasSummary.style.display = '';
    this.collisionAnnotation = true;
    this.setPoint(1, 1, false, true);
    this.scale = Math.max(58, Math.min(90, this.width / 10));
    this.offset = { x: this.width * 0.44, y: this.height * 0.6 };
  }

  reset() {
    this.pauseAuto();
    this.stopSequenceAnimation();
    this.setPoint(1, 0);
    this.scale = 52;
    this.offset = { x: this.width * 0.43, y: this.height * 0.62 };
  }

  startAuto() {
    if (this.autoTimer) return;
    this.elements.autoButton.disabled = true;
    this.elements.pauseButton.disabled = false;
    this.multiply();
    this.autoTimer = window.setInterval(() => {
      if (!this.animation) this.multiply();
    }, 900);
  }

  pauseAuto() {
    if (this.autoTimer) window.clearInterval(this.autoTimer);
    this.autoTimer = null;
    this.elements.autoButton.disabled = false;
    this.elements.pauseButton.disabled = true;
  }

  updateInterface() {
    const { a, b } = this.point;
    this.elements.pairReadout.textContent = `(${this.formatNumber(a)}, ${this.formatNumber(b)})`;
    this.elements.expressionReadout.textContent = `${this.formatNumber(a)} + ${this.formatNumber(b)}φ`;
    this.elements.complexReadout.textContent = `Complex coordinate z = ${this.formatComplex(a, b)}`;
    this.elements.realValue.textContent = (a + b * PHI).toFixed(6);
    this.elements.aInput.value = this.formatNumber(a);
    this.elements.bInput.value = this.formatNumber(b);
    this.elements.algebraStart.textContent = `${this.formatNumber(a)} + ${this.formatNumber(b)}φ`;
    this.elements.algebraStepOne.textContent = `${this.formatNumber(a)}φ + ${this.formatNumber(b)}φ²`;
    this.elements.algebraStepTwo.textContent = `= ${this.formatNumber(a)}φ + ${this.formatNumber(b)}(φ + 1)`;
    this.elements.algebraResult.textContent = `= ${this.formatNumber(b)} + ${this.formatNumber(a + b)}φ`;
  }

  formatNumber(value) {
    if (Math.abs(value) < 1e-10) return '0';
    if (Number.isInteger(value)) return String(value);
    return String(Number(value.toFixed(3)));
  }

  formatComplex(a, b) {
    const real = this.formatNumber(a);
    const imagMagnitude = this.formatNumber(Math.abs(b));
    if (Math.abs(b) < 1e-10) return real;
    const imag = imagMagnitude === '1' ? 'i' : `${imagMagnitude}i`;
    if (Math.abs(a) < 1e-10) return b < 0 ? `−${imag}` : imag;
    return `${real} ${b < 0 ? '−' : '+'} ${imag}`;
  }

  evaluatePhiDigits(digits) {
    let pair = { a: 0, b: 0 };
    const terms = [];
    for (let index = 0; index < digits.length; index++) {
      const digit = Number(digits[index]);
      pair = this.transform(pair);
      pair.a += digit;
      if (digit === 1) {
        const exponent = digits.length - 1 - index;
        terms.push(exponent === 0 ? '1' : exponent === 1 ? 'φ' : `φ${this.superscript(exponent)}`);
      }
    }
    return { pair, expansion: terms.length ? terms.join(' + ') : '0' };
  }

  updateDigitBuilder() {
    const digits = this.elements.phiDigitsInput.value.replace(/[^01]/g, '').slice(0, 16);
    this.elements.phiDigitsInput.value = digits;
    if (!digits) {
      this.elements.digitExpression.textContent = 'Enter at least one 0 or 1';
      this.elements.digitPair.textContent = '—';
      this.elements.plotDigitsButton.disabled = true;
      return null;
    }
    const result = this.evaluatePhiDigits(digits);
    this.elements.digitExpression.textContent = `${result.expansion} = ${result.pair.a} + ${result.pair.b}φ`;
    this.elements.digitPair.textContent = `(${result.pair.a}, ${result.pair.b})`;
    this.elements.plotDigitsButton.disabled = false;
    return result;
  }

  digitRepresentationGroups() {
    if (this.cachedDigitGroups.has(this.atlasDigitCount)) {
      return this.cachedDigitGroups.get(this.atlasDigitCount);
    }
    const groups = new Map();
    const maximum = 2 ** this.atlasDigitCount - 1;
    for (let value = 0; value <= maximum; value++) {
      const digits = value.toString(2);
      const result = this.evaluatePhiDigits(digits);
      const key = `${result.pair.a},${result.pair.b}`;
      if (!groups.has(key)) groups.set(key, { ...result.pair, representations: [] });
      groups.get(key).representations.push(digits);
    }
    const sortedGroups = [...groups.values()].sort((left, right) => left.b - right.b || left.a - right.a);
    this.cachedDigitGroups.set(this.atlasDigitCount, sortedGroups);
    return sortedGroups;
  }

  updateAtlasSummary() {
    const groups = this.digitRepresentationGroups();
    const strings = 2 ** this.atlasDigitCount;
    const collisions = groups.filter(group => group.representations.length > 1).length;
    const upperDigits = '1'.repeat(this.atlasDigitCount);
    this.elements.atlasSummary.innerHTML = `<strong>${strings}</strong> strings · <strong>${groups.length}</strong> points · <strong>${collisions}</strong> collisions`;
    this.elements.atlasDigitCount.textContent = String(this.atlasDigitCount);
    this.elements.atlasDigitLimit.textContent = `0 through ${upperDigits}`;
    this.elements.atlasToggleLabel.textContent = `Digit representations through ${upperDigits}`;
  }

  renderDigitRepresentationAtlas() {
    const ctx = this.ctx;
    const groups = this.digitRepresentationGroups();
    ctx.save();

    for (const group of groups) {
      const point = this.worldToScreen(group.a, group.b);
      const collision = group.representations.length > 1;
      const width = Math.max(...group.representations.map(item => item.length));
      const labels = group.representations.map(item => item.padStart(width, '0'));
      const cellSize = Math.max(14, this.scale * 0.9);
      const cellX = point.x - cellSize / 2;
      const cellY = point.y - cellSize / 2;
      const lineHeight = Math.min(13, (cellSize - 5) / labels.length);
      const fontSize = Math.max(3.2, Math.min(11, lineHeight * 0.82, cellSize / (width * 0.62)));

      ctx.fillStyle = collision ? 'rgba(239, 125, 103, 0.24)' : 'rgba(100, 197, 232, 0.16)';
      ctx.strokeStyle = collision ? 'rgba(239, 125, 103, 0.82)' : 'rgba(100, 197, 232, 0.58)';
      ctx.lineWidth = collision ? 1.5 : 1;
      ctx.fillRect(cellX, cellY, cellSize, cellSize);
      ctx.strokeRect(cellX, cellY, cellSize, cellSize);

      ctx.font = `600 ${fontSize}px JetBrains Mono, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = collision ? '#ffd0c7' : '#c7ecf8';
      const textStartY = point.y - ((labels.length - 1) * lineHeight) / 2;
      labels.forEach((label, index) => {
        ctx.fillText(label, point.x, textStartY + index * lineHeight);
      });
    }
    ctx.restore();
  }

  fitRepresentationAtlas() {
    const groups = this.digitRepresentationGroups();
    const minA = Math.min(...groups.map(group => group.a)) - 1;
    const maxA = Math.max(...groups.map(group => group.a)) + 2;
    const minB = Math.min(...groups.map(group => group.b)) - 1;
    const maxB = Math.max(...groups.map(group => group.b)) + 1;
    this.scale = Math.max(16, Math.min(72,
      (this.width - 50) / (maxA - minA),
      (this.height - 50) / (maxB - minB)
    ));
    this.offset.x = 25 - minA * this.scale;
    this.offset.y = 25 + maxB * this.scale;
  }

  fitView() {
    if (this.options.digitAtlas) {
      this.fitRepresentationAtlas();
      return;
    }
    const points = this.fibonacciPowers().concat(this.history).concat([this.point]);
    let minA = Math.min(0, ...points.map(point => point.a));
    let maxA = Math.max(0, ...points.map(point => point.a));
    let minB = Math.min(0, ...points.map(point => point.b));
    let maxB = Math.max(0, ...points.map(point => point.b));
    const spanA = Math.max(2, maxA - minA);
    const spanB = Math.max(2, maxB - minB);
    minA -= spanA * 0.16; maxA += spanA * 0.16;
    minB -= spanB * 0.16; maxB += spanB * 0.16;
    this.scale = Math.max(0.001, Math.min(90, (this.width - 70) / (maxA - minA), (this.height - 70) / (maxB - minB)));
    this.offset.x = 35 - minA * this.scale;
    this.offset.y = 35 + maxB * this.scale;
  }

  renderSequence() {
    const powers = this.fibonacciPowers().slice(1);
    this.elements.sequenceStrip.innerHTML = powers.map(power =>
      `<div class="sequence-item" data-n="${power.n}"><small>φ${this.superscript(power.n)}</small><strong>(${power.a}, ${power.b})</strong></div>`
    ).join('');
    this.elements.powerCount.textContent = String(this.powersShown);
  }

  animatePowerSequence() {
    this.sequenceAnimation = { start: performance.now(), visibleN: 0 };
    this.updateSequenceHighlight(0);
  }

  stopSequenceAnimation() {
    this.sequenceAnimation = null;
    this.updateSequenceHighlight(-1);
  }

  updateSequenceHighlight(n) {
    this.elements.sequenceStrip.querySelectorAll('.sequence-item').forEach(item => {
      item.classList.toggle('active', Number(item.dataset.n) === n);
    });
  }

  eventPosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  bindControls() {
    const e = this.elements;
    e.multiplyButton.addEventListener('click', () => this.multiply());
    e.backButton.addEventListener('click', () => this.stepBackward());
    e.resetButton.addEventListener('click', () => this.reset());
    e.autoButton.addEventListener('click', () => this.startAuto());
    e.pauseButton.addEventListener('click', () => this.pauseAuto());
    e.fitViewButton.addEventListener('click', () => this.fitView());

    const updateFromInputs = () => {
      const a = Number(e.aInput.value);
      const b = Number(e.bInput.value);
      if (Number.isFinite(a) && Number.isFinite(b)) this.setPoint(a, b);
    };
    e.aInput.addEventListener('change', updateFromInputs);
    e.bInput.addEventListener('change', updateFromInputs);

    e.basisToggle.addEventListener('change', event => { this.options.basis = event.target.checked; });
    e.gridToggle.addEventListener('change', event => { this.options.grid = event.target.checked; });
    e.transformGridToggle.addEventListener('change', event => { this.options.transformedGrid = event.target.checked; });
    e.eigenToggle.addEventListener('change', event => { this.options.eigen = event.target.checked; });
    e.complexToggle.addEventListener('change', event => { this.options.complex = event.target.checked; });
    e.digitAtlasToggle.addEventListener('change', event => {
      this.options.digitAtlas = event.target.checked;
      e.atlasSummary.style.display = this.options.digitAtlas ? '' : 'none';
      if (this.options.digitAtlas) this.fitRepresentationAtlas();
    });
    e.atlasDigitSlider.addEventListener('input', event => {
      this.atlasDigitCount = Number(event.target.value);
      this.collisionAnnotation = false;
      this.updateAtlasSummary();
      if (this.options.digitAtlas) this.fitRepresentationAtlas();
    });
    e.showEigenButton.addEventListener('click', () => {
      e.eigenToggle.checked = true;
      this.options.eigen = true;
      document.querySelector('.explorer').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    e.complexViewButton.addEventListener('click', () => {
      e.complexToggle.checked = true;
      this.options.complex = true;
      document.querySelector('.explorer').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    e.phiDigitsInput.addEventListener('input', () => this.updateDigitBuilder());
    e.plotDigitsButton.addEventListener('click', () => {
      const result = this.updateDigitBuilder();
      if (!result) return;
      this.setPoint(result.pair.a, result.pair.b);
      this.fitView();
      document.querySelector('.explorer').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    e.powerSlider.addEventListener('input', event => {
      this.powersShown = Number(event.target.value);
      this.renderSequence();
      this.fitView();
    });
    e.animatePowersButton.addEventListener('click', () => this.animatePowerSequence());

    this.canvas.addEventListener('pointerdown', event => {
      const position = this.eventPosition(event);
      const current = this.worldToScreen(this.point.a, this.point.b);
      const pointHit = Math.hypot(position.x - current.x, position.y - current.y) < 18;
      this.drag = {
        type: pointHit ? 'point' : 'pan',
        start: position,
        originalOffset: { ...this.offset }
      };
      this.canvas.classList.add('dragging');
      this.canvas.setPointerCapture(event.pointerId);
    });

    this.canvas.addEventListener('pointermove', event => {
      if (!this.drag) return;
      const position = this.eventPosition(event);
      if (this.drag.type === 'pan') {
        this.offset.x = this.drag.originalOffset.x + position.x - this.drag.start.x;
        this.offset.y = this.drag.originalOffset.y + position.y - this.drag.start.y;
      } else {
        const world = this.screenToWorld(position.x, position.y);
        const snap = event.shiftKey ? 0.1 : 1;
        this.setPoint(Math.round(world.a / snap) * snap, Math.round(world.b / snap) * snap);
      }
    });

    const endDrag = event => {
      if (!this.drag) return;
      this.drag = null;
      this.canvas.classList.remove('dragging');
      if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    };
    this.canvas.addEventListener('pointerup', endDrag);
    this.canvas.addEventListener('pointercancel', endDrag);

    this.canvas.addEventListener('wheel', event => {
      event.preventDefault();
      const position = this.eventPosition(event);
      const before = this.screenToWorld(position.x, position.y);
      const factor = Math.exp(-event.deltaY * 0.0012);
      this.scale = Math.max(0.001, Math.min(300, this.scale * factor));
      this.offset.x = position.x - before.a * this.scale;
      this.offset.y = position.y + before.b * this.scale;
    }, { passive: false });
  }
}

class CollisionLab {
  constructor(explorer) {
    this.explorer = explorer;
    this.board = document.querySelector('.place-value-board');
    this.tiles = [...document.querySelectorAll('#collisionDigits .digit-tile')];
    this.placeValues = [...this.board.querySelectorAll('.place-values span')];
    this.carryButton = document.getElementById('carryButton');
    this.showOnGridButton = document.getElementById('showCollisionOnGridButton');
    this.symbols = document.getElementById('collisionSymbols');
    this.expansion = document.getElementById('collisionExpansion');
    this.normalizeInput = document.getElementById('normalizeInput');
    this.normalizeButton = document.getElementById('normalizeButton');
    this.normalizeSteps = document.getElementById('normalizeSteps');
    this.normalizeResult = document.getElementById('normalizeResult');
    this.normalized = false;
    this.bind();
  }

  bind() {
    this.carryButton.addEventListener('click', () => this.toggleCollision());
    this.showOnGridButton.addEventListener('click', () => {
      this.explorer.showCollisionPoint();
      document.querySelector('.explorer').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    this.normalizeInput.addEventListener('input', () => {
      this.normalizeInput.value = this.normalizeInput.value.replace(/[^01]/g, '').slice(0, 20);
    });
    this.normalizeButton.addEventListener('click', () => this.normalizeEnteredDigits());
  }

  toggleCollision() {
    if (this.carryButton.disabled) return;
    if (this.normalized) {
      this.showDigits(['0', '1', '1']);
      this.board.classList.remove('normalized');
      this.symbols.innerHTML = '011<sub>φ</sub>';
      this.expansion.textContent = 'φ + 1';
      this.carryButton.textContent = 'Carry 011 → 100';
      this.normalized = false;
      return;
    }

    this.carryButton.disabled = true;
    this.board.classList.add('carrying');
    window.setTimeout(() => {
      this.showDigits(['1', '0', '0']);
      this.board.classList.remove('carrying');
      this.board.classList.add('normalized');
      this.symbols.innerHTML = '100<sub>φ</sub>';
      this.expansion.textContent = 'φ²';
      this.carryButton.textContent = 'Split 100 → 011';
      this.carryButton.disabled = false;
      this.normalized = true;
    }, 620);
  }

  showDigits(digits) {
    const labels = digits.map((digit, index) => `${digit} × ${index === 0 ? 'φ²' : index === 1 ? 'φ' : '1'}`);
    this.tiles.forEach((tile, index) => { tile.textContent = digits[index]; });
    this.placeValues.forEach((label, index) => { label.textContent = labels[index]; });
  }

  normalizeDigits(rawDigits) {
    let current = rawDigits.replace(/[^01]/g, '');
    if (!current) return [];
    const steps = [current];
    let guard = 0;

    while (current.includes('11') && guard < 100) {
      if (current.startsWith('11')) current = `0${current}`;
      const collisionIndex = current.indexOf('011');
      if (collisionIndex < 0) break;
      current = `${current.slice(0, collisionIndex)}100${current.slice(collisionIndex + 3)}`;
      steps.push(current);
      guard++;
    }

    const trimmed = current.replace(/^0+(?=.)/, '');
    if (trimmed !== current) steps.push(trimmed);
    return steps;
  }

  normalizeEnteredDigits() {
    const steps = this.normalizeDigits(this.normalizeInput.value);
    if (!steps.length) {
      this.normalizeSteps.textContent = 'Enter at least one 0 or 1';
      this.normalizeResult.textContent = '—';
      return;
    }
    this.normalizeSteps.textContent = steps.join(' → ');
    this.normalizeResult.innerHTML = `${steps.at(-1)}<sub>φ</sub>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const explorer = new CoefficientExplorer(document.getElementById('coefficientCanvas'));
  new CollisionLab(explorer);
});
