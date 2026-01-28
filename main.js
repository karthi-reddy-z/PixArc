import { Uploader } from './src/components/Uploader.js';
import { Renderer } from './src/components/Renderer.js';
import { getDominantColor } from './src/components/ColorExtractor.js';

class App {
    constructor() {
        this.items = []; // { id, file, image, color }
        this.renderer = new Renderer('main-canvas');
        this.uploader = new Uploader('uploader-overlay', 'file-input', this.handleFiles.bind(this));

        // Modal elements
        this.modal = document.getElementById('export-modal');
        this.modalResolution = document.getElementById('modal-resolution');
        this.modalFormat = document.getElementById('modal-format');
        this.layoutSelect = document.getElementById('layout-mode');

        // Bind global events
        document.getElementById('add-images-btn').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });

        this.layoutSelect.addEventListener('change', () => {
            this.updateLayoutMode();
        });

        window.addEventListener('resize', () => {
            this.updateLayoutMode(); // Recalculate zones on resize
        });

        document.getElementById('export-btn').addEventListener('click', () => {
            this.openExportModal();
        });

        document.getElementById('modal-cancel').addEventListener('click', () => {
            this.closeExportModal();
        });

        document.getElementById('modal-download').addEventListener('click', () => {
            this.processExport();
        });

        // Close modal on outside click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeExportModal();
        });

        this.renderer.onRemove = (id) => {
            this.removeItem(id);
        };
    }

    updateLayoutMode() {
        const mode = this.layoutSelect.value;
        const canvas = document.getElementById('main-canvas');
        const w = canvas.width;
        const h = canvas.height;

        let zones = [];

        if (mode === 'pc') {
            // PC: Top Center 40% width, 35% height
            zones.push({
                x: w * 0.3,
                y: 0,
                w: w * 0.4,
                h: h * 0.35
            });
        } else if (mode === 'phone') {
            // Phone: Top 30% entire width
            zones.push({
                x: 0,
                y: 0,
                w: w,
                h: h * 0.3
            });
        }

        this.renderer.setExclusionZones(zones);
    }

    openExportModal() {
        if (this.items.length === 0) return;
        this.modal.classList.remove('hidden');
    }

    closeExportModal() {
        this.modal.classList.add('hidden');
    }

    processExport() {
        const resVal = this.modalResolution.value;
        const fmtVal = this.modalFormat.value;

        let width, height;
        let exclusionZones = [];

        if (resVal === 'screen') {
            width = undefined;
            height = undefined;
        } else if (resVal === 'pc-lock') {
            width = 1920;
            height = 1080;
            exclusionZones.push({
                x: 1920 * 0.3,
                y: 0,
                w: 1920 * 0.4,
                h: 1080 * 0.35
            });
        } else if (resVal === 'phone-lock') {
            width = 1080;
            height = 1920;
            exclusionZones.push({
                x: 0,
                y: 0,
                w: 1080,
                h: 1920 * 0.3
            });
        } else {
            const parts = resVal.split('x');
            width = parseInt(parts[0]);
            height = parseInt(parts[1]);
        }

        let mimeType = 'image/png';
        let quality = 1.0;
        let ext = 'png';

        if (fmtVal === 'jpeg-high') {
            mimeType = 'image/jpeg';
            quality = 0.92;
            ext = 'jpg';
        } else if (fmtVal === 'jpeg-mid') {
            mimeType = 'image/jpeg';
            quality = 0.75;
            ext = 'jpg';
        }

        const dataUrl = this.renderer.exportImage(width, height, mimeType, quality, exclusionZones);
        const link = document.createElement('a');
        link.download = `circle-composer-${resVal}.${ext}`;
        link.href = dataUrl;
        link.click();

        this.closeExportModal();
    }

    async handleFiles(files) {
        if (files.length === 0) return;

        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;
            try {
                const item = await this.processFile(file);
                this.items.push(item);
            } catch (err) {
                console.error("Failed to load image", err);
            }
        }
        this.updateState();
    }

    processFile(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.src = url;
            img.onload = async () => {
                const color = await getDominantColor(img);
                resolve({
                    id: Date.now() + Math.random(),
                    file,
                    image: img,
                    color
                });
            };
            img.onerror = reject;
        });
    }

    updateState() {
        const addBtn = document.getElementById('add-images-btn');
        const exportBtn = document.getElementById('export-btn');

        if (this.items.length > 0) {
            this.uploader.hide();
            addBtn.style.display = 'inline-flex';
            exportBtn.style.display = 'inline-flex';
        } else {
            this.uploader.show();
            addBtn.style.display = 'none';
            exportBtn.style.display = 'none';
        }
        this.renderer.setItems(this.items);
    }

    removeItem(id) {
        this.items = this.items.filter(item => item.id !== id);
        this.updateState();
    }
}

new App();
