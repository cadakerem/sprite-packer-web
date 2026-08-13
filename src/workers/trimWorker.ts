self.onmessage = async (e: MessageEvent<{ file: File; id: string }>) => {
  try {
    const { file, id } = e.data;
    const bitmap = await createImageBitmap(file);
    
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error("No 2d context");
    
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    const data = imageData.data;
    
    let top = 0, bottom = bitmap.height - 1, left = 0, right = bitmap.width - 1;
    let found = false;
    
    // Top
    for (let y = 0; y < bitmap.height && !found; y++) {
      for (let x = 0; x < bitmap.width; x++) {
        if (data[(y * bitmap.width + x) * 4 + 3] !== 0) { top = y; found = true; break; }
      }
    }
    if (!found) {
      self.postMessage({ id, rect: { x: 0, y: 0, w: bitmap.width, h: bitmap.height } });
      bitmap.close();
      return;
    }
    
    // Bottom
    found = false;
    for (let y = bitmap.height - 1; y >= top && !found; y--) {
      for (let x = 0; x < bitmap.width; x++) {
        if (data[(y * bitmap.width + x) * 4 + 3] !== 0) { bottom = y; found = true; break; }
      }
    }
    
    // Left
    found = false;
    for (let x = 0; x < bitmap.width && !found; x++) {
      for (let y = top; y <= bottom; y++) {
        if (data[(y * bitmap.width + x) * 4 + 3] !== 0) { left = x; found = true; break; }
      }
    }
    
    // Right
    found = false;
    for (let x = bitmap.width - 1; x >= left && !found; x--) {
      for (let y = top; y <= bottom; y++) {
        if (data[(y * bitmap.width + x) * 4 + 3] !== 0) { right = x; found = true; break; }
      }
    }
    
    self.postMessage({ id, rect: { x: left, y: top, w: right - left + 1, h: bottom - top + 1 } });
    bitmap.close();
  } catch (error) {
    self.postMessage({ error: (error as Error).message });
  }
};
