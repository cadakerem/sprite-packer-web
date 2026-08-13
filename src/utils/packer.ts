export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  id?: string;
  rotated?: boolean;
}

export class MaxRectsPacker {
  public width: number;
  public height: number;
  public freeRectangles: Rect[] = [];
  public usedRectangles: Rect[] = [];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.freeRectangles.push({ x: 0, y: 0, width, height, rotated: false });
  }

  public insert(width: number, height: number, id: string, allowRotation: boolean = false): Rect | null {
    let bestNode: Rect = { x: 0, y: 0, width: 0, height: 0, rotated: false };
    let bestShortSideFit = Number.MAX_VALUE;
    let bestLongSideFit = Number.MAX_VALUE;

    let bestFreeRectIndex = -1;

    // Find the best free rectangle to place this rectangle using Best Short Side Fit
    for (let i = 0; i < this.freeRectangles.length; i++) {
      const freeRect = this.freeRectangles[i];
      
      // Try Normal Orientation
      if (freeRect.width >= width && freeRect.height >= height) {
        const leftoverHoriz = Math.abs(freeRect.width - width);
        const leftoverVert = Math.abs(freeRect.height - height);
        const shortSideFit = Math.min(leftoverHoriz, leftoverVert);
        const longSideFit = Math.max(leftoverHoriz, leftoverVert);

        if (shortSideFit < bestShortSideFit || (shortSideFit === bestShortSideFit && longSideFit < bestLongSideFit)) {
          bestNode.x = freeRect.x;
          bestNode.y = freeRect.y;
          bestNode.width = width;
          bestNode.height = height;
          bestNode.id = id;
          bestNode.rotated = false;
          bestShortSideFit = shortSideFit;
          bestLongSideFit = longSideFit;
          bestFreeRectIndex = i;
        }
      }

      // Try Rotated Orientation
      if (allowRotation && freeRect.width >= height && freeRect.height >= width) {
        const leftoverHoriz = Math.abs(freeRect.width - height);
        const leftoverVert = Math.abs(freeRect.height - width);
        const shortSideFit = Math.min(leftoverHoriz, leftoverVert);
        const longSideFit = Math.max(leftoverHoriz, leftoverVert);

        if (shortSideFit < bestShortSideFit || (shortSideFit === bestShortSideFit && longSideFit < bestLongSideFit)) {
          bestNode.x = freeRect.x;
          bestNode.y = freeRect.y;
          bestNode.width = height; // Rotated width
          bestNode.height = width; // Rotated height
          bestNode.id = id;
          bestNode.rotated = true;
          bestShortSideFit = shortSideFit;
          bestLongSideFit = longSideFit;
          bestFreeRectIndex = i;
        }
      }
    }

    if (bestFreeRectIndex === -1) return null; // Doesn't fit!

    // Split the free rectangles based on the new used rectangle
    let numRectanglesToProcess = this.freeRectangles.length;
    for (let i = 0; i < numRectanglesToProcess; i++) {
      if (this.splitFreeNode(this.freeRectangles[i], bestNode)) {
        this.freeRectangles.splice(i, 1);
        i--;
        numRectanglesToProcess--;
      }
    }

    this.pruneFreeList();
    this.usedRectangles.push(bestNode);
    return bestNode;
  }

  private splitFreeNode(freeNode: Rect, usedNode: Rect): boolean {
    // Test if rectangles intersect
    if (usedNode.x >= freeNode.x + freeNode.width || usedNode.x + usedNode.width <= freeNode.x ||
        usedNode.y >= freeNode.y + freeNode.height || usedNode.y + usedNode.height <= freeNode.y) {
      return false;
    }

    if (usedNode.x < freeNode.x + freeNode.width && usedNode.x + usedNode.width > freeNode.x) {
      // New node at the top
      if (usedNode.y > freeNode.y && usedNode.y < freeNode.y + freeNode.height) {
        let newNode = { ...freeNode };
        newNode.height = usedNode.y - newNode.y;
        this.freeRectangles.push(newNode);
      }
      // New node at the bottom
      if (usedNode.y + usedNode.height < freeNode.y + freeNode.height) {
        let newNode = { ...freeNode };
        newNode.y = usedNode.y + usedNode.height;
        newNode.height = freeNode.y + freeNode.height - (usedNode.y + usedNode.height);
        this.freeRectangles.push(newNode);
      }
    }

    if (usedNode.y < freeNode.y + freeNode.height && usedNode.y + usedNode.height > freeNode.y) {
      // New node at the left
      if (usedNode.x > freeNode.x && usedNode.x < freeNode.x + freeNode.width) {
        let newNode = { ...freeNode };
        newNode.width = usedNode.x - newNode.x;
        this.freeRectangles.push(newNode);
      }
      // New node at the right
      if (usedNode.x + usedNode.width < freeNode.x + freeNode.width) {
        let newNode = { ...freeNode };
        newNode.x = usedNode.x + usedNode.width;
        newNode.width = freeNode.x + freeNode.width - (usedNode.x + usedNode.width);
        this.freeRectangles.push(newNode);
      }
    }

    return true;
  }

  private pruneFreeList() {
    for (let i = 0; i < this.freeRectangles.length; i++) {
      for (let j = i + 1; j < this.freeRectangles.length; j++) {
        if (this.isContainedIn(this.freeRectangles[i], this.freeRectangles[j])) {
          this.freeRectangles.splice(i, 1);
          i--;
          break;
        }
        if (this.isContainedIn(this.freeRectangles[j], this.freeRectangles[i])) {
          this.freeRectangles.splice(j, 1);
          j--;
        }
      }
    }
  }

  private isContainedIn(a: Rect, b: Rect) {
    return a.x >= b.x && a.y >= b.y && 
           a.x + a.width <= b.x + b.width && 
           a.y + a.height <= b.y + b.height;
  }
}
