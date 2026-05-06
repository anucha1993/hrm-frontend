"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Badge from "@/components/Badge";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { TodayStatus, OfficeLocation, Attendance } from "@/lib/types";
import { Camera, LogIn, LogOut, MapPin, Clock, RefreshCw, AlertTriangle, CheckCircle, X } from "lucide-react";

type GeoPos = {
  lat: number;
  lng: number;
  accuracy: number;
};

function statusBadge(s: Attendance["status"]) {
  const map: Record<Attendance["status"], { label: string; variant: "success" | "warning" | "danger" | "info" }> = {
    normal: { label: "ปกติ", variant: "success" },
    late: { label: "สาย", variant: "warning" },
    early_leave: { label: "ออกก่อน", variant: "warning" },
    overtime: { label: "ทำงานล่วงเวลา", variant: "info" },
  };
  return map[s] || map.normal;
}

function fmtTime(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function fmtDateThai(d: Date) {
  return d.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short", year: "2-digit" });
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function nearestOffice(pos: GeoPos | null, offices: OfficeLocation[]): { office: OfficeLocation; distance: number } | null {
  if (!pos || offices.length === 0) return null;
  let best: { office: OfficeLocation; distance: number } | null = null;
  for (const o of offices) {
    if (o.latitude == null || o.longitude == null) continue;
    const d = haversine(pos.lat, pos.lng, +o.latitude, +o.longitude);
    if (!best || d < best.distance) best = { office: o, distance: d };
  }
  return best;
}

export default function AttendanceCheckInPage() {
  const { hasRole } = useAuth();
  const isEmployee = hasRole("employee");
  const [today, setToday] = useState<TodayStatus | null>(null);
  const [now, setNow] = useState(new Date());
  const [pos, setPos] = useState<GeoPos | null>(null);
  const [posError, setPosError] = useState<string | null>(null);
  const [geoNonce, setGeoNonce] = useState(0);
  const [cameraOn, setCameraOn] = useState(false);
  const [pendingType, setPendingType] = useState<"check_in" | "check_out" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [captureStage, setCaptureStage] = useState<"" | "snap" | "uploading">("");
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [snapshotBlob, setSnapshotBlob] = useState<Blob | null>(null);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [faceState, setFaceState] = useState<"idle" | "searching" | "ok" | "too_small" | "too_large" | "off_center" | "unsupported">("idle");
  const [note, setNote] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadToday = useCallback(async () => {
    try {
      const data = await apiFetch<TodayStatus>("/attendance/today");
      setToday(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setPosError("เบราว์เซอร์ไม่รองรับ GPS");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
        setPosError(null);
      },
      (err) => {
        let msg = "ดึงตำแหน่งไม่สำเร็จ: " + err.message;
        if (err.code === err.PERMISSION_DENIED) {
          msg = "ผู้ใช้ปฏิเสธการเข้าถึงตำแหน่ง — โปรดอนุญาต Location ที่ไอคอน 🔒/ⓘ ข้างซ้าย URL bar แล้วรีเฟรชหน้านี้";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "ไม่สามารถระบุตำแหน่งได้ — ลองเปิด GPS/Wi-Fi แล้วลองใหม่";
        } else if (err.code === err.TIMEOUT) {
          msg = "หาตำแหน่งนานเกินไป — กรุณาลองใหม่อีกครั้ง";
        }
        setPosError(msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [geoNonce]);

  async function startCamera(type: "check_in" | "check_out") {
    setResult(null);
    setPendingType(type);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch (e) {
      setResult({ ok: false, msg: "เข้าถึงกล้องไม่ได้: " + (e instanceof Error ? e.message : "ไม่ทราบสาเหตุ") });
      setPendingType(null);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
    setPendingType(null);
    setNote("");
    setFaceState("idle");
    setSnapshot(null);
    setSnapshotBlob(null);
  }

  // Face/skin detection loop. ใช้ FaceDetector API ถ้ามี, ไม่งั้น fallback เป็น skin-tone heuristic
  useEffect(() => {
    if (!cameraOn) return;
    type FDFace = { boundingBox: DOMRectReadOnly };
    type FDCtor = new (opts?: { fastMode?: boolean }) => { detect: (s: CanvasImageSource) => Promise<FDFace[]> };
    const FD = (window as unknown as { FaceDetector?: FDCtor }).FaceDetector;
    const detector = FD ? new FD({ fastMode: true }) : null;

    setFaceState("searching");
    let stopped = false;
    let timer = 0;

    // Offscreen canvas สำหรับ fallback
    const sampleCanvas = document.createElement("canvas");
    const SAMPLE_W = 160;
    const SAMPLE_H = 120;
    sampleCanvas.width = SAMPLE_W;
    sampleCanvas.height = SAMPLE_H;
    const sctx = sampleCanvas.getContext("2d", { willReadFrequently: true });

    // ตรวจว่าเป็น skin tone ไหม (RGB heuristic)
    const isSkin = (r: number, g: number, b: number) => {
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      return r > 95 && g > 40 && b > 20 &&
        max - min > 15 &&
        Math.abs(r - g) > 15 &&
        r > g && r > b;
    };

    const detectByPixels = () => {
      const v = videoRef.current;
      if (!v || v.videoWidth === 0 || !sctx) return;
      // Mirror to match preview
      sctx.save();
      sctx.translate(SAMPLE_W, 0);
      sctx.scale(-1, 1);
      sctx.drawImage(v, 0, 0, SAMPLE_W, SAMPLE_H);
      sctx.restore();
      const img = sctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);
      const data = img.data;

      let totalSkin = 0;
      let sumX = 0, sumY = 0;
      let minX = SAMPLE_W, maxX = 0, minY = SAMPLE_H, maxY = 0;

      // sample every 2 px
      for (let y = 0; y < SAMPLE_H; y += 2) {
        for (let x = 0; x < SAMPLE_W; x += 2) {
          const i = (y * SAMPLE_W + x) * 4;
          if (isSkin(data[i], data[i + 1], data[i + 2])) {
            totalSkin++;
            sumX += x; sumY += y;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      const sampledPixels = (SAMPLE_W * SAMPLE_H) / 4;
      const skinRatio = totalSkin / sampledPixels;

      if (totalSkin < 50 || skinRatio < 0.02) {
        setFaceState("searching");
        return;
      }

      const cx = sumX / totalSkin;
      const cy = sumY / totalSkin;
      const offX = Math.abs(cx - SAMPLE_W / 2) / SAMPLE_W;
      const offY = Math.abs(cy - SAMPLE_H / 2) / SAMPLE_H;
      const bboxArea = (maxX - minX) * (maxY - minY);
      const areaRatio = bboxArea / (SAMPLE_W * SAMPLE_H);

      if (skinRatio < 0.05 || areaRatio < 0.08) setFaceState("too_small");
      else if (skinRatio > 0.55 || areaRatio > 0.75) setFaceState("too_large");
      else if (offX > 0.18 || offY > 0.22) setFaceState("off_center");
      else setFaceState("ok");
    };

    const tick = async () => {
      if (stopped) return;
      const v = videoRef.current;
      if (v && v.videoWidth > 0 && !snapshot) {
        if (detector) {
          try {
            const faces = await detector.detect(v);
            if (faces.length === 0) {
              setFaceState("searching");
            } else {
              const face = faces.reduce((a, b) => (a.boundingBox.width * a.boundingBox.height >= b.boundingBox.width * b.boundingBox.height ? a : b));
              const bb = face.boundingBox;
              const vw = v.videoWidth, vh = v.videoHeight;
              const faceRatio = (bb.width * bb.height) / (vw * vh);
              const cx = bb.x + bb.width / 2;
              const cy = bb.y + bb.height / 2;
              const offX = Math.abs(cx - vw / 2) / vw;
              const offY = Math.abs(cy - vh / 2) / vh;
              if (faceRatio < 0.06) setFaceState("too_small");
              else if (faceRatio > 0.55) setFaceState("too_large");
              else if (offX > 0.18 || offY > 0.22) setFaceState("off_center");
              else setFaceState("ok");
            }
          } catch {
            detectByPixels();
          }
        } else {
          detectByPixels();
        }
      }
      timer = window.setTimeout(tick, 300) as unknown as number;
    };
    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [cameraOn, snapshot]);

  function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number, p: GeoPos, offices: OfficeLocation[]) {
    const near = nearestOffice(p, offices);
    const dt = new Date();
    const lines = [
      dt.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "medium" }),
      `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}  (±${p.accuracy.toFixed(0)}m)`,
      near ? `${near.office.name} • ห่าง ${near.distance.toFixed(0)} ม.` : "ไม่พบสถานที่ใกล้เคียง",
      near?.office.address || "",
    ].filter(Boolean) as string[];

    const padding = Math.round(w * 0.02);
    const fontSize = Math.max(14, Math.round(w * 0.025));
    ctx.font = `${fontSize}px sans-serif`;
    const lineH = fontSize * 1.4;
    const boxH = lineH * lines.length + padding * 1.2;
    const boxW = w - padding * 2;
    const x = padding;
    const y = h - boxH - padding;

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x, y, boxW, boxH);

    ctx.fillStyle = "#fff";
    ctx.textBaseline = "top";
    lines.forEach((l, i) => {
      ctx.fillText(l, x + padding * 0.6, y + padding * 0.6 + i * lineH);
    });

    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.textAlign = "right";
    ctx.fillText("CYC-HRM", w - padding, padding);
    ctx.textAlign = "left";
  }

  // ขั้นที่ 1: ถ่ายภาพและแสดง preview ให้ยืนยัน
  async function capture() {
    if (!videoRef.current || !pendingType) return;
    if (!pos) {
      setResult({ ok: false, msg: "ยังไม่ได้ตำแหน่ง GPS โปรดรอสักครู่" });
      return;
    }
    if (faceState !== "ok" && faceState !== "unsupported") {
      setResult({ ok: false, msg: "กรุณาจัดใบหน้าให้อยู่ในกรอบก่อนถ่าย" });
      return;
    }
    setCaptureStage("snap");
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    try {
      const video = videoRef.current;
      const w = video.videoWidth;
      const h = video.videoHeight;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      drawWatermark(ctx, w, h, pos, today?.office_locations || []);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.85);
      });
      setSnapshotBlob(blob);
      setSnapshot(canvas.toDataURL("image/jpeg", 0.7));
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : "ถ่ายไม่สำเร็จ" });
    } finally {
      setCaptureStage("");
    }
  }

  // ขั้นที่ 2: ยืนยัน → อัปโหลด
  async function confirmAndUpload() {
    if (!snapshotBlob || !pendingType || !pos) return;
    setSubmitting(true);
    setCaptureStage("uploading");
    try {
      const fd = new FormData();
      fd.append("type", pendingType);
      fd.append("latitude", pos.lat.toString());
      fd.append("longitude", pos.lng.toString());
      fd.append("accuracy_m", pos.accuracy.toFixed(1));
      fd.append("photo", snapshotBlob, `selfie-${Date.now()}.jpg`);
      if (note.trim()) fd.append("note", note.trim());

      const res = await apiFetch<{ message: string; data: Attendance }>("/attendance/check-in", {
        method: "POST",
        body: fd,
      });
      setResult({ ok: true, msg: res.message });
      stopCamera();
      setSnapshot(null);
      setSnapshotBlob(null);
      await loadToday();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "บันทึกไม่สำเร็จ";
      setResult({ ok: false, msg });
    } finally {
      setSubmitting(false);
      setCaptureStage("");
    }
  }

  function retakePhoto() {
    setSnapshot(null);
    setSnapshotBlob(null);
  }

  const lastIn = today?.last_check_in;
  const lastOut = today?.last_check_out;
  const canCheckIn = !lastIn || (!!lastOut && new Date(lastOut.checked_at) > new Date(lastIn.checked_at));
  const canCheckOut = !!lastIn && (!lastOut || new Date(lastIn.checked_at) > new Date(lastOut.checked_at));
  const gpsReady = !!pos && !posError;

  const near = nearestOffice(pos, today?.office_locations || []);
  const insideGeofence = near ? (!near.office.enforce_geofence || near.distance <= near.office.radius_m) : false;

  return (
    <div className="px-4 py-3 space-y-3 max-w-md mx-auto">
        {/* Header: เวลา + ตำแหน่ง (compact) */}
        <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl px-3 py-2 text-white flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2">
            <span className="text-lg font-bold font-mono leading-none">
              {now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <span className="text-white/70 text-[10px] leading-tight">{fmtDateThai(now)}</span>
            {today?.employee && (
              <span className="text-white/80 text-[10px] leading-tight truncate hidden sm:inline">
                • {today.employee.first_name} {today.employee.employee_code}
              </span>
            )}
          </div>
          <div className="shrink-0 text-[10px]">
            {pos ? (
              near ? (
                insideGeofence ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/20">
                    <CheckCircle className="w-3 h-3" /> ในพื้นที่
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/30">
                    <AlertTriangle className="w-3 h-3" /> นอกพื้นที่
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/20">
                  <MapPin className="w-3 h-3" /> GPS
                </span>
              )
            ) : posError ? (
              <button
                onClick={() => { setPosError(null); setGeoNonce((n) => n + 1); }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/40 hover:bg-red-500/60"
                title={posError}
              >
                <RefreshCw className="w-3 h-3" /> GPS
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/20">
                <RefreshCw className="w-3 h-3 animate-spin" /> GPS
              </span>
            )}
          </div>
        </div>

        {today && !today.has_employee && isEmployee && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-3 text-sm">
            บัญชีของคุณยังไม่ได้เชื่อมกับข้อมูลพนักงาน กรุณาติดต่อผู้ดูแลระบบ
          </div>
        )}

        {/* แสดงเฉพาะกะวันนี้ (สั้น ๆ) */}
        {!cameraOn && today?.shift && (
          <div className="bg-white rounded-xl border border-border px-3 py-2 text-xs text-muted flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            กะ {today.shift.name} • {today.shift.start_time.substring(0, 5)}-{today.shift.end_time.substring(0, 5)}
          </div>
        )}

        {result && (
          <div className={`rounded-xl p-4 text-sm flex items-start gap-2 ${result.ok ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
            {result.ok ? <CheckCircle className="w-5 h-5 mt-0.5" /> : <AlertTriangle className="w-5 h-5 mt-0.5" />}
            <div className="flex-1">{result.msg}</div>
            <button onClick={() => setResult(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {!cameraOn && today?.has_employee && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => startCamera("check_in")}
              disabled={!canCheckIn || !gpsReady}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-green-500 text-white rounded-2xl font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <LogIn className="w-5 h-5" /> ลงเวลาเข้างาน
            </button>
            <button
              onClick={() => startCamera("check_out")}
              disabled={!canCheckOut || !gpsReady}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-red-500 text-white rounded-2xl font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <LogOut className="w-5 h-5" /> ลงเวลาออกงาน
            </button>
          </div>
        )}

        {cameraOn && (
          <div className="bg-white rounded-2xl border border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary-600" />
                {pendingType === "check_in" ? "ถ่ายเซลฟี่เข้างาน" : "ถ่ายเซลฟี่ออกงาน"}
              </h4>
              <button onClick={stopCamera} className="text-sm text-muted hover:text-foreground inline-flex items-center gap-1">
                <X className="w-4 h-4" /> ยกเลิก
              </button>
            </div>
            <div className="relative rounded-xl overflow-hidden bg-black">
              <video ref={videoRef} className="w-full max-h-[480px] object-contain" style={{ transform: "scaleX(-1)" }} playsInline muted />

              {/* Face guide overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 200 280" preserveAspectRatio="xMidYMid meet" className="w-[55%] h-[80%] opacity-90">
                  <ellipse
                    cx="100" cy="130" rx="75" ry="105"
                    fill="none"
                    stroke={faceState === "ok" ? "#22c55e" : faceState === "unsupported" ? "#ffffff" : "#ef4444"}
                    strokeWidth="3"
                    strokeDasharray={faceState === "ok" ? "0" : "6 4"}
                  />
                </svg>
              </div>
              <div className={`pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 text-white text-[11px] px-3 py-1 rounded-full font-medium ${
                faceState === "ok" ? "bg-emerald-600/85" :
                faceState === "unsupported" ? "bg-black/55" : "bg-rose-600/85"
              }`}>
                {faceState === "ok" && "✓ พร้อมถ่าย"}
                {faceState === "searching" && "กำลังค้นหาใบหน้า..."}
                {faceState === "too_small" && "ขยับใกล้ผู้ถ่ายอีกหน่อย"}
                {faceState === "too_large" && "ถอยห่างออกเล็กน้อย"}
                {faceState === "off_center" && "จัดใบหน้าให้อยู่กลางกรอบ"}
                {faceState === "unsupported" && "จัดใบหน้าให้อยู่ในกรอบ"}
                {faceState === "idle" && "กำลังเปิดกล้อง..."}
              </div>

              <div className="absolute bottom-2 left-2 right-2 bg-black/55 text-white text-xs p-2 rounded">
                <div>{now.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "medium" })}</div>
                {pos && <div className="font-mono">{pos.lat.toFixed(6)}, {pos.lng.toFixed(6)} (±{pos.accuracy.toFixed(0)}m)</div>}
                {near && <div>{near.office.name} • ห่าง {near.distance.toFixed(0)} ม.</div>}
              </div>

              {/* Shutter flash */}
              {captureStage === "snap" && (
                <div className="absolute inset-0 bg-white" style={{ animation: "flash 0.25s ease-out" }} />
              )}
              {/* Snapshot preview */}
              {snapshot && (
                <div className="absolute inset-0 bg-black flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={snapshot} alt="ตัวอย่าง" className="w-full max-h-[480px] object-contain" />
                  {captureStage === "uploading" && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white gap-2">
                      <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                      <div className="text-sm font-semibold">กำลังอัปโหลด...</div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">หมายเหตุ (ไม่บังคับ)</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} disabled={submitting} className="w-full px-3 py-2 border border-border rounded-lg text-sm disabled:bg-gray-50" placeholder="เช่น ออกงานนอกสถานที่" />
            </div>
            {snapshot ? (
              // ขั้นยืนยัน: ถ่ายซ้ำ / ยืนยัน
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={retakePhoto}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-border text-foreground rounded-2xl font-semibold hover:bg-gray-50 disabled:opacity-60 transition"
                >
                  <RefreshCw className="w-5 h-5" /> ถ่ายใหม่
                </button>
                <button
                  onClick={confirmAndUpload}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-2xl font-semibold hover:bg-green-700 disabled:opacity-60 transition"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      กำลังส่ง...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" /> ยืนยันและบันทึก
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={capture}
                disabled={!pos || captureStage === "snap" || (faceState !== "ok" && faceState !== "unsupported")}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-primary-600 text-white rounded-2xl font-semibold hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {captureStage === "snap" ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    กำลังถ่าย...
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    {faceState === "ok" || faceState === "unsupported" ? "ถ่ายภาพ" : "รอจัดใบหน้าให้อยู่ในกรอบ"}
                  </>
                )}
              </button>
            )}
          </div>
        )}
    </div>
  );
}
