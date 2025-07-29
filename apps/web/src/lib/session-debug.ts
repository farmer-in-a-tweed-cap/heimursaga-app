interface SessionDebugInfo {
  timestamp: string;
  event: string;
  data?: any;
  error?: any;
}

class SessionDebugger {
  private logs: SessionDebugInfo[] = [];
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'development';
  }

  log(event: string, data?: any, error?: any) {
    if (!this.isEnabled) return;

    const logEntry: SessionDebugInfo = {
      timestamp: new Date().toISOString(),
      event,
      data,
      error,
    };

    this.logs.push(logEntry);
    
    // Keep only last 50 logs
    if (this.logs.length > 50) {
      this.logs = this.logs.slice(-50);
    }

    // Console output
    const prefix = `[Session Debug]`;
    if (error) {
      console.error(`${prefix} ${event}:`, error, data);
    } else {
      console.log(`${prefix} ${event}:`, data);
    }
  }

  getLogs(): SessionDebugInfo[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const sessionDebugger = new SessionDebugger();