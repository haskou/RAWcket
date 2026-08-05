export async function readImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dimensions;
}

export async function createDemoImageBlob(): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1000;
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('El navegador no puede generar la imagen de demostracion.');
  const sky = context.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#153043');
  sky.addColorStop(0.56, '#d27854');
  sky.addColorStop(1, '#141820');
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#eecb8e';
  context.beginPath();
  context.arc(1180, 310, 78, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#1a2529';
  context.beginPath();
  context.moveTo(0, 820);
  context.lineTo(380, 460);
  context.lineTo(650, 760);
  context.lineTo(980, 410);
  context.lineTo(1600, 850);
  context.lineTo(1600, 1000);
  context.lineTo(0, 1000);
  context.closePath();
  context.fill();
  context.fillStyle = 'rgba(238, 203, 142, 0.16)';
  context.fillRect(0, 850, 1600, 150);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob === null ? reject(new Error('No se pudo crear la demo.')) : resolve(blob), 'image/jpeg', 0.9);
  });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
