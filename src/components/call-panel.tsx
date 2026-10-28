"use client";

import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getIceServers } from "@/app/actions/calls";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/i18n/client";

type Kind = "audio" | "video";
type Phase = "idle" | "calling" | "incoming" | "connecting" | "live";
type Signal =
  | { type: "ring"; callId: string; kind: Kind; from: string }
  | { type: "accept" | "decline" | "hangup" | "busy"; callId: string; from: string }
  | { type: "offer" | "answer"; callId: string; sdp: RTCSessionDescriptionInit; from: string }
  | { type: "ice"; callId: string; candidate: RTCIceCandidateInit; from: string };

// Omit distributif : conserve chaque variante de l'union.
type Outgoing = Signal extends infer S ? (S extends Signal ? Omit<S, "from"> : never) : never;

const RING_TIMEOUT_MS = 45_000;

function duration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m} min ${String(s).padStart(2, "0")} s`;
}

/** Appels audio et vidéo entre l'expéditeur et le voyageur, de navigateur à navigateur (WebRTC). */
export function CallPanel({ bookingId, myId, otherName }: { bookingId: string; myId: string; otherName: string }) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("idle");
  const [kind, setKind] = useState<Kind>("audio");
  const [notice, setNotice] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [ready, setReady] = useState(false);

  const supabase = useRef(createClient());
  const channel = useRef<RealtimeChannel | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const local = useRef<MediaStream | null>(null);
  const callId = useRef<string | null>(null);
  const role = useRef<"caller" | "callee" | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const ringTimer = useRef<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const ringtone = useRef<{ stop: () => void } | null>(null);

  const go = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const send = useCallback((payload: Outgoing) => {
    channel.current?.send({ type: "broadcast", event: "signal", payload: { ...payload, from: myId } });
  }, [myId]);

  const stopRing = () => {
    ringtone.current?.stop();
    ringtone.current = null;
    if (ringTimer.current) window.clearTimeout(ringTimer.current);
    ringTimer.current = null;
  };

  const cleanup = useCallback(
    async (reason: string | null, log = false) => {
      stopRing();
      const wasLive = startedAt.current !== null;
      const secs = startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0;
      pc.current?.close();
      pc.current = null;
      local.current?.getTracks().forEach((t) => t.stop());
      local.current = null;
      pendingIce.current = [];
      startedAt.current = null;
      const wasCaller = role.current === "caller";
      role.current = null;
      callId.current = null;
      setMuted(false);
      setCamOff(false);
      setSeconds(0);
      go("idle");
      setNotice(reason);
      // L'appelant garde une trace dans la conversation (RLS : seuls les participants écrivent).
      if (log && wasCaller) {
        const body = wasLive
          ? kind === "video" ? t("Appel vidéo terminé · {d}", { d: duration(secs) }) : t("Appel audio terminé · {d}", { d: duration(secs) })
          : kind === "video" ? t("Appel vidéo sans réponse") : t("Appel audio sans réponse");
        await supabase.current.from("messages").insert({ booking_id: bookingId, author_id: myId, body });
      }
    },
    [bookingId, kind, myId, t],
  );

  const getMedia = async (k: Kind) => {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: k === "video" ? { facingMode: "user" } : false });
    } catch (e) {
      const name = (e as DOMException)?.name;
      setNotice(
        name === "NotAllowedError"
          ? k === "video"
            ? t("Autorisez l'accès au micro et à la caméra dans votre navigateur pour appeler.")
            : t("Autorisez l'accès au micro dans votre navigateur pour appeler.")
          : t("Micro ou caméra introuvable sur cet appareil."),
      );
      return null;
    }
  };

  const createPeer = async (stream: MediaStream) => {
    const iceServers = (await getIceServers(bookingId)) ?? [];
    const peer = new RTCPeerConnection({ iceServers });
    stream.getTracks().forEach((t) => peer.addTrack(t, stream));
    peer.onicecandidate = (e) => {
      if (e.candidate && callId.current) send({ type: "ice", callId: callId.current, candidate: e.candidate.toJSON() });
    };
    peer.ontrack = (e) => {
      const [remote] = e.streams;
      if (remoteVideo.current) remoteVideo.current.srcObject = remote;
      if (remoteAudio.current) remoteAudio.current.srcObject = remote;
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected" && phaseRef.current !== "live") {
        startedAt.current = Date.now();
        go("live");
      }
      if (peer.connectionState === "failed") {
        if (callId.current) send({ type: "hangup", callId: callId.current });
        void cleanup(t("La connexion a échoué. Réessayez, ou passez par le Wi-Fi."), true);
      }
    };
    pc.current = peer;
    return peer;
  };

  const flushIce = async () => {
    for (const c of pendingIce.current) await pc.current?.addIceCandidate(c).catch(() => {});
    pendingIce.current = [];
  };

  // Réception de la signalisation
  const onSignal = useCallback(
    async (s: Signal) => {
      if (s.from === myId) return;
      if (s.type === "ring") {
        if (phaseRef.current !== "idle") return send({ type: "busy", callId: s.callId });
        callId.current = s.callId;
        role.current = "callee";
        setKind(s.kind);
        setNotice(null);
        go("incoming");
        ringtone.current = playRing();
        ringTimer.current = window.setTimeout(() => void cleanup(t("Appel manqué de {otherName}.", { otherName })), RING_TIMEOUT_MS);
        return;
      }
      if (s.callId !== callId.current) return;
      switch (s.type) {
        case "accept": {
          if (role.current !== "caller") return;
          stopRing();
          go("connecting");
          const peer = pc.current;
          if (!peer) return;
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          send({ type: "offer", callId: s.callId, sdp: offer });
          break;
        }
        case "offer": {
          const peer = pc.current;
          if (!peer) return;
          await peer.setRemoteDescription(s.sdp);
          await flushIce();
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          send({ type: "answer", callId: s.callId, sdp: answer });
          break;
        }
        case "answer":
          await pc.current?.setRemoteDescription(s.sdp);
          await flushIce();
          break;
        case "ice":
          if (pc.current?.remoteDescription) await pc.current.addIceCandidate(s.candidate).catch(() => {});
          else pendingIce.current.push(s.candidate);
          break;
        case "decline":
          void cleanup(t("{otherName} a refusé l'appel.", { otherName }), true);
          break;
        case "busy":
          void cleanup(t("{otherName} est déjà en appel.", { otherName }));
          break;
        case "hangup":
          void cleanup(phaseRef.current === "incoming" ? t("Appel manqué de {otherName}.", { otherName }) : t("Appel terminé."));
          break;
      }
    },
    [myId, otherName, send, cleanup, t],
  );

  // Canal privé : la RLS sur realtime.messages n'admet que les participants de la réservation.
  useEffect(() => {
    let active = true;
    const client = supabase.current;
    (async () => {
      const { data } = await client.auth.getSession();
      if (!active || !data.session) return;
      await client.realtime.setAuth(data.session.access_token);
      const ch = client
        .channel(`call:${bookingId}`, { config: { private: true, broadcast: { self: false } } })
        .on("broadcast", { event: "signal" }, ({ payload }) => void onSignal(payload as Signal))
        .subscribe((status) => setReady(status === "SUBSCRIBED"));
      channel.current = ch;
    })();
    return () => {
      active = false;
      if (callId.current) send({ type: "hangup", callId: callId.current });
      if (channel.current) client.removeChannel(channel.current);
      channel.current = null;
    };
  }, [bookingId, onSignal, send]);

  // Durée de l'appel
  useEffect(() => {
    if (phase !== "live") return;
    const timer = window.setInterval(() => setSeconds(Math.round((Date.now() - (startedAt.current ?? Date.now())) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  // Aperçu local
  useEffect(() => {
    if (localVideo.current && local.current) localVideo.current.srcObject = local.current;
  }, [phase]);

  async function startCall(k: Kind) {
    setNotice(null);
    setKind(k);
    const stream = await getMedia(k);
    if (!stream) return;
    local.current = stream;
    role.current = "caller";
    callId.current = crypto.randomUUID();
    await createPeer(stream);
    go("calling");
    send({ type: "ring", callId: callId.current, kind: k });
    ringTimer.current = window.setTimeout(() => {
      if (callId.current) send({ type: "hangup", callId: callId.current });
      void cleanup(t("{otherName} n'a pas répondu.", { otherName }), true);
    }, RING_TIMEOUT_MS);
  }

  async function accept() {
    stopRing();
    const stream = await getMedia(kind);
    if (!stream || !callId.current) {
      if (callId.current) send({ type: "decline", callId: callId.current });
      return void cleanup(null);
    }
    local.current = stream;
    await createPeer(stream);
    go("connecting");
    send({ type: "accept", callId: callId.current });
  }

  function decline() {
    if (callId.current) send({ type: "decline", callId: callId.current });
    void cleanup(null);
  }

  function hangup() {
    if (callId.current) send({ type: "hangup", callId: callId.current });
    void cleanup(t("Appel terminé."), true);
  }

  function toggleMute() {
    local.current?.getAudioTracks().forEach((t) => (t.enabled = muted));
    setMuted(!muted);
  }

  function toggleCam() {
    local.current?.getVideoTracks().forEach((t) => (t.enabled = camOff));
    setCamOff(!camOff);
  }

  const inCall = phase !== "idle";
  const btn = "flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-line text-ink hover:bg-paper disabled:opacity-40";

  return (
    <>
      <div className="ml-auto flex items-center gap-2">
        <button type="button" className={btn} onClick={() => startCall("audio")} disabled={!ready || inCall} aria-label={t("Appeler {otherName}", { otherName })} title={t("Appel audio")}>
          <Phone className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" className={btn} onClick={() => startCall("video")} disabled={!ready || inCall} aria-label={t("Appel vidéo avec {otherName}", { otherName })} title={t("Appel vidéo")}>
          <Video className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {notice && !inCall && (
        <p role="status" className="basis-full pt-3 text-sm text-muted">
          {notice}
        </p>
      )}

      <audio ref={remoteAudio} autoPlay className="hidden" />

      {inCall && (
        <div role="dialog" aria-modal="true" aria-label={t("Appel avec {otherName}", { otherName })} className="fixed inset-0 z-[60] flex flex-col bg-ink text-white">
          {kind === "video" && (
            <>
              <video ref={remoteVideo} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
              <video ref={localVideo} autoPlay playsInline muted className="absolute top-4 right-4 h-40 w-28 rounded-2xl object-cover ring-2 ring-white/20 sm:h-48 sm:w-36" />
            </>
          )}
          <div className="relative flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            {(kind === "audio" || phase !== "live") && (
              <>
                <span className="wide flex h-24 w-24 items-center justify-center rounded-full bg-signal text-3xl font-extrabold text-ink">
                  {otherName.slice(0, 1).toUpperCase()}
                </span>
                <p className="display text-2xl">{otherName}</p>
              </>
            )}
            <p className="tabular text-white/70" aria-live="polite">
              {phase === "calling" && t("Appel en cours…")}
              {phase === "incoming" && (kind === "video" ? t("Appel vidéo entrant") : t("Appel audio entrant"))}
              {phase === "connecting" && t("Connexion…")}
              {phase === "live" && duration(seconds)}
            </p>
          </div>
          <div className="relative flex items-center justify-center gap-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
            {phase === "incoming" ? (
              <>
                <button type="button" onClick={decline} className="flex h-16 w-16 items-center justify-center rounded-full bg-danger" aria-label={t("Refuser l'appel")}>
                  <PhoneOff className="h-7 w-7" aria-hidden="true" />
                </button>
                <button type="button" onClick={accept} className="flex h-16 w-16 items-center justify-center rounded-full bg-ok" aria-label={t("Décrocher")}>
                  {kind === "video" ? <Video className="h-7 w-7" aria-hidden="true" /> : <Phone className="h-7 w-7" aria-hidden="true" />}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={toggleMute} className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15" aria-pressed={muted} aria-label={muted ? t("Réactiver le micro") : t("Couper le micro")}>
                  {muted ? <MicOff className="h-6 w-6" aria-hidden="true" /> : <Mic className="h-6 w-6" aria-hidden="true" />}
                </button>
                {kind === "video" && (
                  <button type="button" onClick={toggleCam} className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15" aria-pressed={camOff} aria-label={camOff ? t("Réactiver la caméra") : t("Couper la caméra")}>
                    {camOff ? <VideoOff className="h-6 w-6" aria-hidden="true" /> : <Video className="h-6 w-6" aria-hidden="true" />}
                  </button>
                )}
                <button type="button" onClick={hangup} className="flex h-16 w-16 items-center justify-center rounded-full bg-danger" aria-label={t("Raccrocher")}>
                  <PhoneOff className="h-7 w-7" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Sonnerie générée (aucun fichier audio à charger). */
function playRing() {
  try {
    const ctx = new AudioContext();
    let stopped = false;
    const beep = () => {
      if (stopped) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 480;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.9);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 1);
    };
    beep();
    const t = window.setInterval(beep, 2500);
    return {
      stop: () => {
        stopped = true;
        window.clearInterval(t);
        void ctx.close();
      },
    };
  } catch {
    return { stop: () => {} };
  }
}
