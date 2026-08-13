import { useState } from 'react';
import './App.css';

function App() {
  const [algorithm, setAlgorithm] = useState('MaxRects');
  
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
                  <option value="BinPacking">Bin Packing</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group half">
                <label>Width</label>
                <div className="input-with-suffix">
                  <input type="number" defaultValue={1024} />
                  <span>px</span>
                </div>
              </div>
              <div className="form-group half">
                <label>Height</label>
                <div className="input-with-suffix">
                  <input type="number" defaultValue={1024} />
                  <span>px</span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>PADDING</label>
              <input type="range" min="0" max="20" defaultValue="2" className="slider" />
              <div className="slider-labels">
                <span>0px</span>
                <span>20px</span>
              </div>
            </div>

            <div className="form-group">
              <label>SPACING</label>
              <input type="range" min="0" max="20" defaultValue="2" className="slider" />
              <div className="slider-labels">
                <span>0px</span>
                <span>20px</span>
              </div>
            </div>
            
            <div className="form-group">
              <label>FORMAT</label>
              <div className="select-wrapper">
                <select className="select-input">
                  <option>PNG, WEBP</option>
                  <option>PNG</option>
                  <option>WEBP</option>
                </select>
              </div>
            </div>

          </div>

          <div className="sprite-list-section">
            <div className="section-header">
              <h3>Sprite List</h3>
              <span className="badge">0 assets</span>
            </div>
            <div className="empty-list">
              No assets loaded yet.
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="btn-export">
            EXPORT SPRITESHEET
          </button>
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main className="main-content">
        <div className="dropzone-container">
          <div className="dropzone">
            <div className="dropzone-content">
              <div className="icon-wrapper">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </div>
              <h3>Drag & Drop Images Here</h3>
              <p>Optimize & Pack Your Assets</p>
            </div>
          </div>
        </div>
        
        <div className="bottom-bar">
           <div className="zoom-controls">
             <span>Zoom</span>
             <input type="range" min="10" max="200" defaultValue="100" className="slider small" />
           </div>
           <div className="info-stats">
             <span>Files: 0 &nbsp;|&nbsp; Size: 1024x1024 px</span>
           </div>
        </div>
      </main>
    </div>
  );
}

export default App;
