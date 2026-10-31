/** A controllable clock for code that takes { now, setTimeout, clearTimeout }. */
export function createFakeClock(start = Date.parse('2026-11-02T09:00:00Z')) {
  let now = start;
  let nextId = 1;
  const timers = new Map();

  return {
    now: () => now,
    setTimeout(fn, ms) {
      const id = nextId++;
      timers.set(id, { at: now + ms, fn });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    /** Moves time forward, running (and awaiting) every timer that falls due, in order. */
    async advance(ms) {
      const target = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        const [id, timer] = due;
        timers.delete(id);
        now = timer.at;
        await timer.fn();
      }
      now = target;
    },
  };
}
