import ColorThief from 'colorthief';

const colorThief = new ColorThief();

export async function getDominantColor(imageElement) {
  if (imageElement.complete) {
    return colorThief.getColor(imageElement);
  } else {
    return new Promise((resolve) => {
      imageElement.onload = () => {
        resolve(colorThief.getColor(imageElement));
      };
    });
  }
}

export function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
