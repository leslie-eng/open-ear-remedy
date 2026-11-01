import { useEffect, useRef, useState } from 'react';

const BARS = 16;

type MicState = 'idle' | 'listening' | 'blocked';

/**
 * Lets someone hear-check their microphone before a call. The test stream is local only and is
 * stopped before the call starts (the call asks for the microphone itself).
 */
export default function MicCheck({ disabled = false }: { disabled?: boolean }) {
  const [state, setState] = useState<MicState>('idle');
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0.08));
  const stop = useRef<() => void>(() => {});

  useEffect(() => () => stop.current(), []);
  useEffect(() => {
    if (disabled) stop.current();
  }, [disabled]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let frame = 0;
      const tick = () => {
        analyser.getByteFrequencyData(data);
        setLevels(Array.from({ length: BARS }, (_, i) => Math.max(0.08, data[i + 1] / 255)));
        frame = requestAnimationFrame(tick);
      };
      tick();
      stop.current = () => {
        cancelAnimationFrame(frame);
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close();
        setLevels(Array(BARS).fill(0.08));
        setState('idle');
        stop.current = () => {};
      };
      setState('listening');
    } catch {
      setState('blocked');
    }
  };

  return (
    <div className="rounded-2xl bg-oe-surface-low p-5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium">
          <i className="ri-mic-line text-oe-accent" aria-hidden="true" />
          {state === 'listening' ? 'Microphone is working' : state === 'blocked' ? 'Microphone blocked' : 'Microphone check'}
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => (state === 'listening' ? stop.current() : void start())}
          className="flex cursor-pointer items-center gap-1.5 text-oe-accent hover:underline disabled:opacity-50"
        >
          <i className="ri-volume-up-line" aria-hidden="true" />
          {state === 'listening' ? 'Stop test' : 'Test audio'}
        </button>
      </div>
      <div className="mt-4 flex h-10 items-center justify-between gap-1 rounded-full bg-white/70 px-4" aria-hidden="true">
        {levels.map((level, i) => (
          <span
            key={i}
            className="w-1.5 rounded-full bg-oe-accent/70 transition-[height] duration-75"
            style={{ height: `${Math.round(level * 100)}%` }}
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-oe-muted">
        {state === 'blocked'
          ? 'Allow microphone access in your browser settings, or text a Listener instead.'
          : state === 'listening'
            ? 'Say a few words. The bars should move. Nothing is recorded.'
            : 'Optional. Say a few words to see the bars move. Nothing is recorded.'}
      </p>
    </div>
  );
}
