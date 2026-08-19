import { useState, useRef, useEffect } from 'react';
import type { DragEvent as ReactDragEvent } from 'react';
import { trimWorkerPool } from './utils/WorkerPool';
import './App.css';
import { MaxRectsPacker } from './utils/packer';
import type { Rect } from './utils/packer';

interface SpriteAsset {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  file: File;
  imgElement?: HTMLImageElement;
  trimRect: { x: number, y: number, w: number, h: number };
}

interface TexturePackerFrame {
  frame: { x: number, y: number, w: number, h: number };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: { x: number, y: number, w: number, h: number };
  sourceSize: { w: number, h: number };
}

interface PackedAsset extends Rect {
  asset: SpriteAsset;
}

function App() {
  const algorithm = 'MaxRects';
  const [autoSize, setAutoSize] = useState(true);
  const [allowRotate, setAllowRotate] = useState(false);
  const [enableTrim, setEnableTrim] = useState(false);
  const [sortByName, setSortByName] = useState(false);
  const [targetWidth, setTargetWidth] = useState(1024);
  const [targetHeight, setTargetHeight] = useState(1024);
  const [padding, setPadding] = useState(2);
  const [zoom, setZoom] = useState(100);
  
  const [isDragging, setIsDragging] = useState(false);
  const [assets, setAssets] = useState<SpriteAsset[]>([]);
  const [packedAssets, setPackedAssets] = useState<PackedAsset[]>([]);
  const [finalSize, setFinalSize] = useState({ w: 0, h: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const processFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const assetId = Math.random().toString(36).substring(7);
        trimWorkerPool.process(file, assetId, (rect) => {
          setAssets(prev => {
            if (prev.some(a => a.name === file.name)) return prev;
            
            const newAssets = [...prev, {
              id: assetId,
              name: file.name,
              url,
              width: img.width,
              height: img.height,
              file,
              imgElement: img,
              trimRect: rect
            }];
            return newAssets.sort((a, b) => a.name.localeCompare(b.name));
          });
        });
      };
      img.src = url;
    });
  };

  const removeAsset = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  const clearAllAssets = () => {
    setAssets([]);
  };

  const handleDragOver = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  useEffect(() => {
    if (assets.length === 0) {
      setPackedAssets([]);
      setFinalSize({ w: 0, h: 0 });
      return;
    }

    const sortedAssets = [...assets].sort((a, b) => {
      if (sortByName) {
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      }
      const aHeight = enableTrim ? a.trimRect.h : a.height;
      const bHeight = enableTrim ? b.trimRect.h : b.height;
      return bHeight - aHeight;
    });

    let packed: PackedAsset[] = [];
    let currentW = targetWidth;
    let currentH = targetHeight;

    if (autoSize) {
      currentW = Math.max(...sortedAssets.map(a => (enableTrim ? a.trimRect.w : a.width) + padding * 2), 256);
      currentH = Math.max(...sortedAssets.map(a => (enableTrim ? a.trimRect.h : a.height) + padding * 2), 256);
      
      let success = false;
      while (!success && currentW <= 8192 && currentH <= 8192) {
        const packer = new MaxRectsPacker(currentW, currentH);
        packed = [];
        success = true;

        for (const asset of sortedAssets) {
          const w = enableTrim ? asset.trimRect.w : asset.width;
          const h = enableTrim ? asset.trimRect.h : asset.height;
          
          const rect = packer.insert(w + padding * 2, h + padding * 2, asset.id, allowRotate);
          if (rect) {
            packed.push({
              ...rect,
              x: rect.x + padding,
              y: rect.y + padding,
              width: rect.rotated ? h : w,
              height: rect.rotated ? w : h,
              asset
            });
          } else {
            success = false;
            break;
          }
        }

        if (!success) {
          currentW *= 1.5;
          currentH *= 1.5;
        }
      }

      if (success && packed.length > 0) {
        let maxRight = 0;
        let maxBottom = 0;
        packed.forEach(p => {
          if (p.x + p.width + padding > maxRight) maxRight = p.x + p.width + padding;
          if (p.y + p.height + padding > maxBottom) maxBottom = p.y + p.height + padding;
        });
        currentW = Math.ceil(maxRight);
        currentH = Math.ceil(maxBottom);
      }

    } else {
      const packer = new MaxRectsPacker(currentW, currentH);
      for (const asset of sortedAssets) {
        const w = enableTrim ? asset.trimRect.w : asset.width;
        const h = enableTrim ? asset.trimRect.h : asset.height;
        const rect = packer.insert(w + padding * 2, h + padding * 2, asset.id, allowRotate);
        if (rect) {
          packed.push({
            ...rect,
            x: rect.x + padding,
            y: rect.y + padding,
            width: rect.rotated ? h : w,
            height: rect.rotated ? w : h,
            asset
          });
        }
      }
    }

    setFinalSize({ w: currentW, h: currentH });
    setPackedAssets(packed);

    // Auto-fit Zoom
    setTimeout(() => {
      if (wrapperRef.current && currentW > 0 && currentH > 0) {
        const availableW = wrapperRef.current.clientWidth - 48; // 24px padding * 2
        const availableH = wrapperRef.current.clientHeight - 48;
        const scaleX = availableW / currentW;
        const scaleY = availableH / currentH;
        const bestScale = Math.min(scaleX, scaleY, 1);
        setZoom(Math.max(10, Math.floor(bestScale * 100)));
      }
    }, 10);
  }, [assets, autoSize, targetWidth, targetHeight, padding, algorithm, allowRotate, enableTrim, sortByName]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    packedAssets.forEach(p => {
      if (p.asset.imgElement) {
        ctx.save();
        
        const sourceX = enableTrim ? p.asset.trimRect.x : 0;
        const sourceY = enableTrim ? p.asset.trimRect.y : 0;
        const sourceW = enableTrim ? p.asset.trimRect.w : p.asset.width;
        const sourceH = enableTrim ? p.asset.trimRect.h : p.asset.height;

        if (p.rotated) {
          ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
          ctx.rotate(-Math.PI / 2);
          // When rotated, width and height logic swap visually
          ctx.drawImage(
            p.asset.imgElement, 
            sourceX, sourceY, sourceW, sourceH,
            -p.height / 2, -p.width / 2, p.height, p.width
          );
        } else {
          ctx.drawImage(
            p.asset.imgElement,
            sourceX, sourceY, sourceW, sourceH,
            p.x, p.y, p.width, p.height
          );
        }
        ctx.restore();
      }
    });
  }, [packedAssets, finalSize, enableTrim]);

  const handleExport = () => {
    if (packedAssets.length === 0 || !canvasRef.current) return;
    
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'spritesheet.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    });

    const jsonData = {
      meta: {
        image: 'spritesheet.png',
        format: 'RGBA8888',
        size: { w: finalSize.w, h: finalSize.h },
        scale: 1,
        algorithm: algorithm,
        padding: padding,
        allowRotation: allowRotate,
        trimmed: enableTrim
      },
      frames: packedAssets.reduce((acc, p) => {
        const w = enableTrim ? p.asset.trimRect.w : p.asset.width;
        const h = enableTrim ? p.asset.trimRect.h : p.asset.height;
        
        acc[p.asset.name] = {
          frame: { x: p.x, y: p.y, w: p.width, h: p.height },
          rotated: !!p.rotated,
          trimmed: enableTrim,
          spriteSourceSize: { 
            x: enableTrim ? p.asset.trimRect.x : 0, 
            y: enableTrim ? p.asset.trimRect.y : 0, 
            w, h 
          },
          sourceSize: { w: p.asset.width, h: p.asset.height }
        };
        return acc;
      }, {} as Record<string, TexturePackerFrame>)
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonData, null, 2));
    const jsonA = document.createElement('a');
    jsonA.href = dataStr;
    jsonA.download = 'spritesheet.json';
    jsonA.click();
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Sprite Packer <span className="version">v3.0 PRO</span></h2>
        </div>

        <div className="sidebar-content">
          <div className="settings-section">
            <h3>Settings</h3>
            
            <div className="form-group row-checkbox">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" checked={autoSize} onChange={(e) => setAutoSize(e.target.checked)} 
                  style={{ accentColor: 'var(--accent-sage-green)' }}
                /> AUTO-SIZE CANVAS
              </label>
            </div>

            <div className="form-group row-checkbox">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" checked={enableTrim} onChange={(e) => setEnableTrim(e.target.checked)} 
                  style={{ accentColor: 'var(--accent-sage-green)' }}
                /> ENABLE TRIMMING
              </label>
            </div>

            <div className="form-group row-checkbox">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" checked={allowRotate} onChange={(e) => setAllowRotate(e.target.checked)} 
                  style={{ accentColor: 'var(--accent-sage-green)' }}
                /> ALLOW ROTATION
              </label>
            </div>

            <div className="form-group row-checkbox">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" checked={sortByName} onChange={(e) => setSortByName(e.target.checked)} 
                  style={{ accentColor: 'var(--accent-sage-green)' }}
                /> SORT BY NAME
              </label>
              {sortByName && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', paddingLeft: '24px', lineHeight: '1.4' }}>
                  Uses natural sort (1, 2, 3… not 1, 10, 2…)
                </span>
              )}
            </div>

            {!autoSize && (
              <div className="form-row">
                <div className="form-group half">
                  <label>Width</label>
                  <div className="input-with-suffix">
                    <input type="number" value={targetWidth} onChange={(e) => setTargetWidth(Number(e.target.value))} />
                    <span>px</span>
                  </div>
                </div>
                <div className="form-group half">
                  <label>Height</label>
                  <div className="input-with-suffix">
                    <input type="number" value={targetHeight} onChange={(e) => setTargetHeight(Number(e.target.value))} />
                    <span>px</span>
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>PADDING ({padding}px)</label>
              <input 
                type="range" min="0" max="20" 
                value={padding} onChange={(e) => setPadding(Number(e.target.value))} 
                className="slider" 
              />
              <div className="slider-labels">
                <span>0px</span>
                <span>20px</span>
              </div>
            </div>
          </div>

          <div className="sprite-list-section">
            <div className="section-header">
              <h3>Sprite List</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-icon" title="Add Assets" onClick={() => fileInputRef.current?.click()}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                {assets.length > 0 && (
                  <button className="btn-icon text-danger" title="Clear All" onClick={clearAllAssets}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                )}
              </div>
            </div>
            {assets.length === 0 ? (
              <div className="empty-list">No assets loaded yet.</div>
            ) : (
              <ul className="asset-list">
                {assets.map(asset => (
                  <li key={asset.id} className="asset-item">
                    <img src={asset.url} alt={asset.name} className="asset-thumb" />
                    <span className="asset-name" title={asset.name}>{asset.name}</span>
                    <button className="btn-remove" onClick={() => removeAsset(asset.id)} title="Remove">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="btn-export" disabled={assets.length === 0} onClick={handleExport} style={{ opacity: assets.length === 0 ? 0.5 : 1 }}>
            EXPORT SPRITESHEET
          </button>
        </div>
      </aside>

      <main 
        className="main-content"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && assets.length > 0 && (
          <div className="drag-overlay">
            <div className="dropzone-content">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <h3>Drop to Add More Assets</h3>
            </div>
          </div>
        )}

        <div className="dropzone-container">
          <input 
            type="file" multiple accept="image/*" 
            ref={fileInputRef} 
            onChange={(e) => { if(e.target.files) processFiles(e.target.files); }} 
            style={{ display: 'none' }} 
          />
          
          {assets.length === 0 ? (
            <div 
              className={`dropzone ${isDragging ? 'dragging' : ''}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="dropzone-content">
                <div className="icon-wrapper">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                </div>
                <h3>Drag & Drop Images Here</h3>
                <p>or click to browse files</p>
              </div>
            </div>
          ) : (
            <div className="canvas-wrapper" ref={wrapperRef}>
               <canvas 
                 ref={canvasRef}
                 width={finalSize.w}
                 height={finalSize.h}
                 style={{ 
                   width: `${(finalSize.w * zoom) / 100}px`,
                   height: `${(finalSize.h * zoom) / 100}px`,
                   boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                   background: 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYNgvwMDwnxhMDGBEUjy0Mhg1gGEwMAxhGByEwSjEgAEmGo0CDDCBgQEA8yYwE1kX5jMAAAAASUVORK5CYII=)'
                 }}
               />
            </div>
          )}
        </div>
        
        <div className="bottom-bar">
           <div className="zoom-controls">
             <span>Zoom ({zoom}%)</span>
             <input type="range" min="10" max="300" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="slider small" />
           </div>
           <div className="info-stats">
             {packedAssets.length < assets.length && (
                <span style={{ color: '#ef4444', marginRight: '16px' }}>
                  Warning: {assets.length - packedAssets.length} assets didn't fit! 
                </span>
             )}
             <span>Files: {packedAssets.length}/{assets.length} &nbsp;|&nbsp; Canvas: {finalSize.w}x{finalSize.h} px</span>
           </div>
        </div>
      </main>
    </div>
  );
}

export default App;
