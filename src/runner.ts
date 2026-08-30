import { CellOutput, NotebookCell } from './types';

class MobileRunner {
  private pyodide: any = null;
  private loadingPromise: Promise<any> | null = null;

  private async getPyodide() {
    if (this.pyodide) return this.pyodide;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      if ((window as any).loadPyodide) {
        this.pyodide = await (window as any).loadPyodide();
        return this.pyodide;
      }
      throw new Error('Pyodide WebAssembly runtime loading...');
    })();

    return this.loadingPromise;
  }

  public async execute(cell: NotebookCell): Promise<CellOutput[]> {
    const outputs: CellOutput[] = [];

    if (cell.type === 'markdown') return outputs;

    if (cell.language === 'python') {
      try {
        const py = await this.getPyodide();
        py.setStdout({
          batched: (str: string) => {
            outputs.push({
              id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
              type: 'text',
              content: str,
              timestamp: Date.now(),
            });
          },
        });
        const res = await py.runPythonAsync(cell.content);
        if (res !== undefined && res !== null) {
          outputs.push({
            id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
            type: 'text',
            content: String(res),
            timestamp: Date.now(),
          });
        }
      } catch (err: any) {
        outputs.push({
          id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
          type: 'error',
          content: err.message || String(err),
          timestamp: Date.now(),
        });
      }
      return outputs;
    }

    // JavaScript evaluation
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: any[]) =>
      logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));

    try {
      const fn = new Function('console', `return (async () => { ${cell.content} })();`);
      const res = await fn({ log: console.log, error: console.error });
      console.log = origLog;

      if (logs.length > 0) {
        outputs.push({
          id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
          type: 'text',
          content: logs.join('\n'),
          timestamp: Date.now(),
        });
      }
      if (res !== undefined) {
        outputs.push({
          id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
          type: 'text',
          content: String(res),
          timestamp: Date.now(),
        });
      }
    } catch (err: any) {
      console.log = origLog;
      outputs.push({
        id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
        type: 'error',
        content: err.message || String(err),
        timestamp: Date.now(),
      });
    }

    return outputs;
  }
}

export const runner = new MobileRunner();
