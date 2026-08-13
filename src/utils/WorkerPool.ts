import TrimWorker from '../workers/trimWorker?worker';

type TaskCallback = (rect: { x: number; y: number; w: number; h: number }) => void;

interface Task {
  file: File;
  id: string;
  callback: TaskCallback;
}

export class TrimWorkerPool {
  private workers: Worker[] = [];
  private freeWorkers: Worker[] = [];
  private taskQueue: Task[] = [];
  private callbacks: Map<string, TaskCallback> = new Map();

  constructor() {
    // Toplam donanım çekirdeği (varsayılan 4)
    const cores = navigator.hardwareConcurrency || 4;
    // İşletim sistemi ve UI'ın kilitlenmemesi için 2 çekirdek boşta bırakılır, min 1 garanti edilir.
    const poolSize = Math.max(1, cores - 2); 
    
    for (let i = 0; i < poolSize; i++) {
      const worker = new TrimWorker();
      worker.onmessage = this.handleMessage.bind(this, worker);
      this.workers.push(worker);
      this.freeWorkers.push(worker);
    }
  }

  private handleMessage(worker: Worker, e: MessageEvent) {
    const { id, rect, error } = e.data;
    const callback = this.callbacks.get(id);
    
    if (callback && !error) {
      callback(rect);
    }
    
    this.callbacks.delete(id);
    this.freeWorkers.push(worker);
    this.processNext();
  }

  private processNext() {
    if (this.taskQueue.length === 0 || this.freeWorkers.length === 0) return;
    
    const worker = this.freeWorkers.pop()!;
    const task = this.taskQueue.shift()!;
    
    this.callbacks.set(task.id, task.callback);
    worker.postMessage({ file: task.file, id: task.id });
  }

  public process(file: File, id: string, callback: TaskCallback) {
    this.taskQueue.push({ file, id, callback });
    this.processNext();
  }
}

// Singleton pattern
export const trimWorkerPool = new TrimWorkerPool();
