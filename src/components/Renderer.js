export class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.items = []; // { id, image, color, x, y }
        this.hoveredIndex = -1;
        this.hoverScales = [];
        this.baseRadius = 50;
        this.onRemove = null;
        this.activeExclusionZones = [];

        this.resize();
        window.addEventListener('resize', () => {
            this.resize();
        });

        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredIndex = -1;
            this.canvas.style.cursor = 'default';
        });

        this.animate();
    }

    setExclusionZones(zones) {
        this.activeExclusionZones = zones;
        this.recalculateLayout();
    }

    resize() {
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;
        this.recalculateLayout();
    }

    setItems(items) {
        this.items = items.map(newItem => {
            return {
                ...newItem,
                x: undefined,
                y: undefined
            };
        });

        if (this.hoverScales.length !== this.items.length) {
            this.hoverScales = new Array(this.items.length).fill(1.0);
        }

        this.recalculateLayout();
    }

    recalculateLayout() {
        if (this.items.length === 0) return;

        const layout = this.computeLayout(this.canvas.width, this.canvas.height, this.activeExclusionZones);

        if (layout) {
            this.baseRadius = layout.radius;
            this.items.forEach((item, i) => {
                item.x = layout.positions[i].x;
                item.y = layout.positions[i].y;
            });
        }
    }

    computeLayout(width, height, exclusionZones = []) {
        let targetCoverage = 0.4;
        let maxIterations = 15;
        const canvasArea = width * height;

        while (maxIterations > 0) {
            maxIterations--;

            const areaPerItem = (canvasArea * targetCoverage) / this.items.length;
            let r = Math.sqrt(areaPerItem / Math.PI);

            const minR = 20;
            const maxR = Math.min(width, height) * 0.25;
            r = Math.max(minR, Math.min(r, maxR));

            const positions = this.tryPlaceSymmetric(width, height, r, exclusionZones);

            if (positions) {
                return { positions, radius: r };
            } else {
                targetCoverage *= 0.8;
                if (r <= minR) {
                    const forced = this.forcePlaceSymmetric(width, height, minR, exclusionZones);
                    return { positions: forced, radius: minR };
                }
            }
        }
        return null;
    }

    tryPlaceSymmetric(width, height, radius, exclusionZones = []) {
        const padding = radius + 10;
        const rangeX = (width / 2) - padding * 2 - 5;
        const rangeY = height - padding * 2;

        if (rangeX < 0 || rangeY < 0) return null;

        const positions = new Array(this.items.length);
        const placedToCheck = [];

        const isColliding = (x, y) => {
            const distLimit = radius * 2 + 10;
            for (const p of placedToCheck) {
                if (Math.hypot(x - p.x, y - p.y) < distLimit) return true;
            }

            for (const zone of exclusionZones) {
                const clampX = Math.max(zone.x, Math.min(x, zone.x + zone.w));
                const clampY = Math.max(zone.y, Math.min(y, zone.y + zone.h));
                const dist = Math.hypot(x - clampX, y - clampY);
                if (dist < radius + 10) return true;
            }
            return false;
        };

        if (this.items.length % 2 !== 0) {
            const centerIdx = this.items.length - 1;
            let cx = width / 2;
            let cy;
            let found = false;

            for (let k = 0; k < 200; k++) {
                cy = padding + Math.random() * rangeY;
                if (!isColliding(cx, cy)) {
                    found = true;
                    break;
                }
            }
            if (!found) return null;

            positions[centerIdx] = { x: cx, y: cy };
            placedToCheck.push({ x: cx, y: cy });
        }

        const numPairs = Math.floor(this.items.length / 2);
        for (let i = 0; i < numPairs; i++) {
            const leftIdx = i * 2;
            const rightIdx = i * 2 + 1;
            let lx, ly, rx, ry;
            let found = false;

            for (let k = 0; k < 200; k++) {
                lx = padding + Math.random() * rangeX;
                ly = padding + Math.random() * rangeY;
                rx = width - lx;
                ry = ly;

                if (Math.hypot(lx - rx, ly - ry) >= radius * 2 + 10 &&
                    !isColliding(lx, ly) &&
                    !isColliding(rx, ry)) {
                    found = true;
                    break;
                }
            }

            if (!found) return null;

            positions[leftIdx] = { x: lx, y: ly };
            positions[rightIdx] = { x: rx, y: ry };
            placedToCheck.push({ x: lx, y: ly });
            placedToCheck.push({ x: rx, y: ry });
        }

        return positions;
    }

    forcePlaceSymmetric(width, height, radius, exclusionZones = []) {
        const padding = radius + 5;
        const rangeX = Math.max(1, (width / 2) - padding * 2);
        const rangeY = Math.max(1, height - padding * 2);
        const positions = new Array(this.items.length);

        if (this.items.length % 2 !== 0) {
            const centerIdx = this.items.length - 1;
            positions[centerIdx] = { x: width / 2, y: padding + Math.random() * rangeY };
        }

        const numPairs = Math.floor(this.items.length / 2);
        for (let i = 0; i < numPairs; i++) {
            const lx = padding + Math.random() * rangeX;
            const ly = padding + Math.random() * rangeY;
            const rx = width - lx;
            const ry = ly;
            positions[i * 2] = { x: lx, y: ly };
            positions[i * 2 + 1] = { x: rx, y: ry };
        }
        return positions;
    }

    animate() {
        const speed = 0.2;
        if (this.items.length !== this.hoverScales.length) {
            this.hoverScales = new Array(this.items.length).fill(1.0);
        }
        for (let i = 0; i < this.items.length; i++) {
            const target = (i === this.hoveredIndex) ? 1.2 : 1.0;
            const diff = target - this.hoverScales[i];
            if (Math.abs(diff) > 0.001) this.hoverScales[i] += diff * speed;
            else this.hoverScales[i] = target;
        }
        this.draw();
        requestAnimationFrame(() => this.animate());
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.items.length === 0) return;

        this.items.forEach((item, index) => {
            if (index !== this.hoveredIndex) this.drawItem(item, index);
        });
        if (this.hoveredIndex !== -1 && this.items[this.hoveredIndex]) {
            this.drawItem(this.items[this.hoveredIndex], this.hoveredIndex);
        }

        if (this.activeExclusionZones.length > 0) {
            this.ctx.save();
            this.activeExclusionZones.forEach(zone => {
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([10, 10]);
                this.ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                this.ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.font = '16px Outfit, sans-serif';
                this.ctx.fillText("Clock Area", zone.x + 20, zone.y + 40);
            });
            this.ctx.restore();
        }
    }

    drawItem(item, index) {
        if (!item || item.x === undefined) return;
        const x = item.x;
        const y = item.y;
        const scale = this.hoverScales[index] || 1.0;
        const r = this.baseRadius * scale;
        const diameter = r * 2;

        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0,0,0,0.3)';
        this.ctx.shadowBlur = 10 * scale;
        this.ctx.shadowOffsetY = 5 * scale;
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgb(${item.color[0]}, ${item.color[1]}, ${item.color[2]})`;
        this.ctx.fill();
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.clip();
        const img = item.image;
        if (img) {
            const aspect = img.width / img.height;
            let dw, dh;
            if (aspect > 1) { dh = diameter; dw = dh * aspect; }
            else { dw = diameter; dh = dw / aspect; }
            this.ctx.drawImage(img, x - dw / 2, y - dh / 2, dw, dh);
        }
        this.ctx.restore();
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#fff';
        this.ctx.stroke();
        this.ctx.restore();

        if (this.hoveredIndex === index && scale > 1.05) {
            this.drawRemoveButton(x, y, r);
        }
    }

    drawRemoveButton(x, y, r) {
        const btnAngle = -Math.PI / 4;
        const btnDist = r;
        const btnX = x + Math.cos(btnAngle) * btnDist;
        const btnY = y + Math.sin(btnAngle) * btnDist;
        const btnR = 12;

        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0,0,0,0.2)';
        this.ctx.shadowBlur = 4;
        this.ctx.fillStyle = '#ff4444';
        this.ctx.beginPath();
        this.ctx.arc(btnX, btnY, btnR, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = 'white';
        this.ctx.stroke();
        const s = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(btnX - s, btnY - s);
        this.ctx.lineTo(btnX + s, btnY + s);
        this.ctx.moveTo(btnX + s, btnY - s);
        this.ctx.lineTo(btnX - s, btnY + s);
        this.ctx.stroke();
        this.ctx.restore();
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;
        let found = -1;
        let minDist = Infinity;
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            if (!item || item.x === undefined) continue;
            const dx = mx - item.x;
            const dy = my - item.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const r = this.baseRadius * (this.hoverScales[i] || 1.0);
            if (dist <= r) {
                if (i === this.hoveredIndex) { found = i; break; }
                if (dist < minDist) { minDist = dist; found = i; }
            }
        }
        if (found !== this.hoveredIndex) {
            this.hoveredIndex = found;
            this.canvas.style.cursor = found !== -1 ? 'pointer' : 'default';
        }
    }

    handleClick(e) {
        if (this.hoveredIndex === -1 || !this.onRemove) return;
        const rect = this.canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        const index = this.hoveredIndex;
        const item = this.items[index];
        const r = this.baseRadius * (this.hoverScales[index] || 1.0);
        const btnAngle = -Math.PI / 4;
        const btnDist = r;
        const btnX = item.x + Math.cos(btnAngle) * btnDist;
        const btnY = item.y + Math.sin(btnAngle) * btnDist;
        if (Math.hypot(mx - btnX, my - btnY) < 20) {
            this.onRemove(item.id);
            this.hoveredIndex = -1;
        }
    }

    exportImage(targetWidth, targetHeight, format = 'image/png', quality = 1.0, exclusionZones = []) {
        const w = targetWidth || this.canvas.width;
        const h = targetHeight || this.canvas.height;
        let positions;
        let r;
        if (exclusionZones && exclusionZones.length > 0) {
            const layout = this.computeLayout(w, h, exclusionZones);
            if (layout) { positions = layout.positions; r = layout.radius; }
        }
        if (!positions) {
            const scaleX = w / this.canvas.width;
            const scaleY = h / this.canvas.height;
            const scale = Math.min(scaleX, scaleY);
            r = this.baseRadius * scale;
            positions = this.items.map(item => ({ x: item.x * scaleX, y: item.y * scaleY }));
        }
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = w;
        exportCanvas.height = h;
        const ctx = exportCanvas.getContext('2d');
        if (format === 'image/jpeg') {
            ctx.fillStyle = '#0f0f13';
            ctx.fillRect(0, 0, w, h);
        }
        this.items.forEach((item, i) => {
            const pos = positions[i];
            if (!pos) return;
            const x = pos.x; const y = pos.y; const diameter = r * 2;
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = `rgb(${item.color[0]}, ${item.color[1]}, ${item.color[2]})`;
            ctx.fill();
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.clip();
            const img = item.image;
            if (img) {
                const aspect = img.width / img.height;
                let dw, dh;
                if (aspect > 1) { dh = diameter; dw = dh * aspect; }
                else { dw = diameter; dh = dw / aspect; }
                ctx.drawImage(img, x - dw / 2, y - dh / 2, dw, dh);
            }
            ctx.restore();
            ctx.lineWidth = 3 * (w / this.canvas.width);
            ctx.strokeStyle = '#fff';
            ctx.stroke();
            ctx.restore();
        });
        return exportCanvas.toDataURL(format, quality);
    }
}
