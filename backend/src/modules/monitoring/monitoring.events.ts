import { EventEmitter } from 'events';
import type { PingResult } from '@prisma/client';

class MonitoringEventEmitter extends EventEmitter {
  emitPingResult(record: PingResult) {
    this.emit('ping:result', record);
  }

  onPingResult(listener: (record: PingResult) => void) {
    this.on('ping:result', listener);
    return () => this.off('ping:result', listener);
  }
}

export const monitoringEvents = new MonitoringEventEmitter();
