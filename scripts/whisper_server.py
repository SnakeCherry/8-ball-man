#!/usr/bin/env python3
"""
Tiny Whisper HTTP service for the app's "shout your guess" button.

  GET  /health      -> {"ok": true, "model": "...", "device": "..."}
  POST /transcribe  -> body: audio bytes (16 kHz mono WAV from the browser); returns {"text": "..."}

Needs:  pip install faster-whisper   (numpy comes with it). Input must be 16 kHz mono 16-bit WAV, which the browser sends.
Binds to 127.0.0.1 only. Reach it from the laptop with an SSH tunnel:

  ssh -N -L 8765:127.0.0.1:8765 spark

Env: WHISPER_MODEL (default "small.en"; try "distil-large-v3" or "large-v3-turbo" on a GPU),
     WHISPER_DEVICE ("auto"|"cuda"|"cpu"), PORT (default 8765).
"""
import io
import json
import os
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np
from faster_whisper import WhisperModel

MODEL = os.environ.get("WHISPER_MODEL", "small.en")
DEVICE = os.environ.get("WHISPER_DEVICE", "auto")
PORT = int(os.environ.get("PORT", "8765"))
MAX_BYTES = 2_000_000  # a few seconds of 16 kHz audio is about 100 KB; refuse anything silly

# int8 keeps the CPU path quick; on CUDA faster-whisper uses float16 when asked
model = WhisperModel(MODEL, device=DEVICE, compute_type="int8" if DEVICE == "cpu" else "default")
# nudges the decoder towards short money answers and away from hallucinated sentences
PROMPT = "A number of pounds. Forty quid. Fifty-two pounds. A hundred and twenty."


def decode_wav(audio: bytes) -> np.ndarray:
    """16-bit PCM WAV (what the browser sends) to float32 mono in [-1, 1]; no ffmpeg/PyAV needed."""
    with wave.open(io.BytesIO(audio)) as w:
        if w.getsampwidth() != 2:
            raise ValueError("expected 16-bit PCM WAV")
        raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
        if w.getnchannels() > 1:
            raw = raw.reshape(-1, w.getnchannels()).mean(axis=1)
        if w.getframerate() != 16000:
            raise ValueError("expected 16 kHz audio")
    return raw.astype(np.float32) / 32768.0


def transcribe(audio: bytes, mode: str = "guess") -> str:
    # "guess" is a short money answer, so the number prompt helps; "speech" is a whole sentence about what someone
    # spends on, where that prompt pulled the text towards "forty quid", so it gets no prompt at all
    segments, _ = model.transcribe(
        decode_wav(audio),
        language="en",
        initial_prompt=PROMPT if mode == "guess" else None,
        vad_filter=True,
        beam_size=1,
        condition_on_previous_text=False,
        temperature=0.0,
    )
    return " ".join(s.text.strip() for s in segments).strip()


class Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, payload: dict) -> None:
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):  # noqa: N802
        if self.path == "/health":
            self._send(200, {"ok": True, "model": MODEL, "device": DEVICE})
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self):  # noqa: N802
        path, _, query = self.path.partition("?")
        if path != "/transcribe":
            return self._send(404, {"error": "not found"})
        mode = "speech" if "mode=speech" in query else "guess"
        n = int(self.headers.get("Content-Length", "0"))
        if n <= 0 or n > MAX_BYTES:
            return self._send(413, {"error": "audio missing or too large"})
        try:
            self._send(200, {"text": transcribe(self.rfile.read(n), mode)})
        except Exception as e:  # keep serving; the app falls back to the browser recogniser
            self._send(500, {"error": str(e)})

    def log_message(self, fmt, *args):  # quiet: no audio or transcripts in logs
        pass


if __name__ == "__main__":
    print(f"whisper {MODEL} on {DEVICE}, listening on 127.0.0.1:{PORT}")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
