import type { SignalPayload } from '@openear/shared/calls';
import { apiFetch } from './api';

/**
 * One side of a WebRTC audio call. The caller makes the offer; the listener answers.
 * ICE candidates that arrive before the remote description are held until it is set.
 */
export interface CallPeer {
  handleSignal(payload: SignalPayload): Promise<void>;
  setMuted(muted: boolean): void;
  close(): void;
}

interface IceConfig {
  iceServers: RTCIceServer[];
  iceTransportPolicy: RTCIceTransportPolicy;
}

export function callsSupported(): boolean {
  return typeof RTCPeerConnection !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
}

/** Asks for the microphone. Call early, so a refusal is explained before anyone is rung. */
export function getMicrophone(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: false,
  });
}

export async function createCallPeer({
  role,
  microphone,
  sendSignal,
  onConnected,
  onFailed,
}: {
  role: 'caller' | 'listener';
  microphone: MediaStream;
  sendSignal: (payload: SignalPayload) => void;
  onConnected: () => void;
  onFailed: () => void;
}): Promise<CallPeer> {
  const ice = await apiFetch<IceConfig>('/api/calls/ice-servers');
  const pc = new RTCPeerConnection({ iceServers: ice.iceServers, iceTransportPolicy: ice.iceTransportPolicy });
  const audio = new Audio();
  audio.autoplay = true;
  let remoteDescriptionSet = false;
  let reportedConnected = false;
  const pendingCandidates: RTCIceCandidateInit[] = [];

  for (const track of microphone.getTracks()) pc.addTrack(track, microphone);
  pc.ontrack = (event) => {
    audio.srcObject = event.streams[0];
    void audio.play().catch(() => {});
  };
  pc.onicecandidate = (event) => {
    sendSignal({ kind: 'candidate', candidate: event.candidate ? event.candidate.toJSON() : null });
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected' && !reportedConnected) {
      reportedConnected = true;
      onConnected();
    }
    if (pc.connectionState === 'failed') onFailed();
  };

  const flushCandidates = async () => {
    remoteDescriptionSet = true;
    while (pendingCandidates.length) await pc.addIceCandidate(pendingCandidates.shift());
  };

  if (role === 'caller') {
    await pc.setLocalDescription(await pc.createOffer({ offerToReceiveAudio: true }));
    sendSignal({ kind: 'offer', sdp: pc.localDescription?.sdp ?? '' });
  }

  return {
    async handleSignal(payload) {
      if (payload.kind === 'offer' && role === 'listener') {
        await pc.setRemoteDescription({ type: 'offer', sdp: payload.sdp });
        await flushCandidates();
        await pc.setLocalDescription(await pc.createAnswer());
        sendSignal({ kind: 'answer', sdp: pc.localDescription?.sdp ?? '' });
      } else if (payload.kind === 'answer' && role === 'caller') {
        await pc.setRemoteDescription({ type: 'answer', sdp: payload.sdp });
        await flushCandidates();
      } else if (payload.kind === 'candidate' && payload.candidate) {
        const candidate: RTCIceCandidateInit = payload.candidate;
        if (remoteDescriptionSet) await pc.addIceCandidate(candidate);
        else pendingCandidates.push(candidate);
      }
    },
    setMuted(muted) {
      for (const track of microphone.getAudioTracks()) track.enabled = !muted;
    },
    close() {
      pc.close();
      for (const track of microphone.getTracks()) track.stop();
      audio.srcObject = null;
    },
  };
}
