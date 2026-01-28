export class Uploader {
    constructor(overlayId, inputId, onFilesSelected) {
        this.overlay = document.getElementById(overlayId);
        this.input = document.getElementById(inputId);
        this.onFilesSelected = onFilesSelected;
        this.content = this.overlay.querySelector('.uploader-content');

        this.init();
    }

    init() {
        // Click to browse
        this.content.addEventListener('click', () => {
            this.input.click();
        });

        this.input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.onFilesSelected(Array.from(e.target.files));
                this.input.value = ''; // Reset
            }
        });

        // Drag and Drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.overlay.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false); // Global prevent
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            this.overlay.addEventListener(eventName, () => {
                this.overlay.classList.add('dragging');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.overlay.addEventListener(eventName, () => {
                this.overlay.classList.remove('dragging');
            }, false);
        });

        this.overlay.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                this.onFilesSelected(Array.from(files));
            }
        }, false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    show() {
        this.overlay.classList.remove('has-images');
    }

    hide() {
        this.overlay.classList.add('has-images');
    }
}
