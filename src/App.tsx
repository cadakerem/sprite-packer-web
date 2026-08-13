import { useState, useRef, DragEvent, useEffect } from 'react';
import './App.css';
import { MaxRectsPacker, Rect } from './utils/packer';

interface SpriteAsset {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  file: File;
  imgElement?: HTMLImageElement;
}

interface PackedAsset extends Rect {
  asset: SpriteAsset;
}

function App() {
  const [algorithm, setAlgorithm] = useState('MaxRects');
  const [autoSize, setAutoSize] = useState(true);
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

  // Dosyaları okuma ve resim boyutlarını alma
  const processFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setAssets(prev => [...prev, {
          id: Math.random().toString(36).substring(7),
          name: file.name,
          url,
          width: img.width,
          height: img.height,
          file,
          imgElement: img
        }]);
      };
      img.src = url;
    });
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Paketleme (Packing) Algoritmasını Çalıştırma
  useEffect(() => {
    if (assets.length === 0) {
      setPackedAssets([]);
      setFinalSize({ w: 0, h: 0 });
      return;
    }

    // Resimleri yüksekliğe göre büyükten küçüğe sırala (daha iyi yerleşim için)
    const sortedAssets = [...assets].sort((a, b) => b.height - a.height);
    let packed: PackedAsset[] = [];
    let currentW = targetWidth;
    let currentH = targetHeight;

    if (autoSize) {
      // Auto-size mantığı: En büyük resmi baz alarak başla ve sığana kadar Canvas'ı büyüt
      currentW = Math.max(...sortedAssets.map(a => a.width + padding * 2), 256);
      currentH = Math.max(...sortedAssets.map(a => a.height + padding * 2), 256);
      
      let success = false;
      while (!success && currentW <= 8192 && currentH <= 8192) {
        const packer = new MaxRectsPacker(currentW, currentH);
        packed = [];
        success = true;

        for (const asset of sortedAssets) {
          const rect = packer.insert(asset.width + padding * 2, asset.height + padding * 2, asset.id);
          if (rect) {
            packed.push({
              ...rect,
              x: rect.x + padding, // Padding'i içeriye doğru uygula
              y: rect.y + padding,
              width: asset.width,
              height: asset.height,
              asset
            });
          } else {
            success = false;
            break; // Sığmadı, daha büyük canvas dene
          }
        }

        if (!success) {
          currentW *= 1.5;
          currentH *= 1.5;
        }
      }

      // Sığdıktan sonra gereksiz boşlukları kırp (Trim bounding box)
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
      // Manuel boyut
      const packer = new MaxRectsPacker(currentW, currentH);
      for (const asset of sortedAssets) {
        const rect = packer.insert(asset.width + padding * 2, asset.height + padding * 2, asset.id);
        if (rect) {
          packed.push({
            ...rect,
            x: rect.x + padding,
            y: rect.y + padding,
            width: asset.width,
            height: asset.height,
            asset
          });
        }
      }
    }

    setFinalSize({ w: currentW, h: currentH });
    setPackedAssets(packed);
  }, [assets, autoSize, targetWidth, targetHeight, padding, algorithm]);

  // Canvas'a çizim yapma
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    packedAssets.forEach(p => {
      if (p.asset.imgElement) {
        ctx.drawImage(p.asset.imgElement, p.x, p.y, p.width, p.height);
      }
    });
  }, [packedAssets, finalSize]);

  const handleExport = () => {
    if (packedAssets.length === 0 || !canvasRef.current) return;
    
    // PNG İndirme
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

    // JSON İndirme (Koordinatlar)
    const jsonData = {
      meta: {
        image: 'spritesheet.png',
        format: 'RGBA8888',
        size: { w: finalSize.w, h: finalSize.h },
        scale: 1,
        algorithm: algorithm,
        padding: padding
      },
      frames: packedAssets.reduce((acc, p) => {
        acc[p.asset.name] = {
          frame: { x: p.x, y: p.y, w: p.width, h: p.height },
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: p.width, h: p.height },
          sourceSize: { w: p.width, h: p.height }
        };
        return acc;
      }, {} as any)
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonData, null, 2));
    const jsonA = document.createElement('a');
    jsonA.href = dataStr;
    jsonA.download = 'spritesheet.json';
    jsonA.click();
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Sprite Packer <span className="version">v2.1</span></h2>
        </div>

        <div className="sidebar-content">
          <div className="settings-section">
            <h3>Settings</h3>
            
            <div className="form-group">
              <label>PACKING ALGORITHM</label>
              <div className="select-wrapper">
                <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)} className="select-input">
                  <option value="MaxRects">MaxRects</option>
                  {/* Bin Packing eklenebilir, şu an default MaxRects */}
                </select>
              </div>
            </div>

            <div className="form-group row-checkbox">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={autoSize} 
                  onChange={(e) => setAutoSize(e.target.checked)} 
                  style={{ accentColor: 'var(--accent-sage-green)' }}
                />
                AUTO-SIZE CANVAS (TIGHT FIT)
              </label>
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
              <span className="badge">{assets.length} assets</span>
            </div>
            {assets.length === 0 ? (
              <div className="empty-list">No assets loaded yet.</div>
            ) : (
              <ul className="asset-list">
                {assets.map(asset => (
                  <li key={asset.id} className="asset-item">
                    <img src={asset.url} alt={asset.name} className="asset-thumb" />
                    <span className="asset-name">{asset.name}</span>
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

      {/* Main Canvas Area */}
      <main className="main-content">
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
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
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
            <div className="canvas-wrapper">
               <canvas 
                 ref={canvasRef}
                 width={finalSize.w}
                 height={finalSize.h}
                 style={{ 
                   transform: `scale(${zoom / 100})`, 
                   transformOrigin: 'top left',
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
