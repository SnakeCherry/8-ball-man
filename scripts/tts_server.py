#!/usr/bin/env python3
"""
Tiny text-to-speech HTTP service for the app's spoken suggestions (Piper, a fast local neural voice).

  GET  /health  -> {"ok": true, "voice": "..."}
  POST /speak   -> body: {"text": "..."}; returns a WAV (audio/wav)

Needs:  pip install piper-tts   and a voice, e.g. en_GB-alba-medium (Scottish English):
  https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_GB/alba/medium
Binds to 127.0.0.1 only. Reach it from the laptop with an SSH tunnel:

  ssh -N -L 8766:127.0.0.1:8766 spark

Env: VOICE (path to the .onnx, default voices/en_GB-alba-medium.onnx), PORT (default 8766).
"""
import io
import json
import os
import wave
from collections import OrderedDict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from piper import PiperVoice

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = os.environ.get("VOICE", os.path.join(HERE, "voices", "en_GB-alba-medium.onnx"))
PORT = int(os.environ.get("PORT", "8766"))
MAX_CHARS = 500
CACHE_SIZE = 64

voice = PiperVoice.load(VOICE)
cache: "OrderedDict[str, bytes]" = OrderedDict()


def synth(text: str) -> bytes:
    if text in cache:
        cache.move_to_end(text)
        return cache[text]
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        voice.synthesize_wav(text, w)
    out = buf.getvalue()
    cache[text] = out
    while len(cache) > CACHE_SIZE:
        cache.popitem(last=False)
    return out


class Handler(BaseHTTPRequestHandler):
    def _json(self, code: int, payload: dict) -> None:
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):  # noqa: N802
        if self.path == "/health":
            self._json(200, {"ok": True, "voice": os.path.basename(VOICE)})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):  # noqa: N802
        if self.path != "/speak":
            return self._json(404, {"error": "not found"})
        n = int(self.headers.get("Content-Length", "0"))
        if n <= 0 or n > 10_000:
            return self._json(413, {"error": "bad body"})
        try:
            text = str(json.loads(self.rfile.read(n)).get("text", "")).strip()[:MAX_CHARS]
            if not text:
                return self._json(400, {"error": "no text"})
            audio = synth(text)
        except Exception as e:  # keep serving; the app falls back to the browser's voice
            return self._json(500, {"error": str(e)})
        self.send_response(200)
        self.send_header("Content-Type", "audio/wav")
        self.send_header("Content-Length", str(len(audio)))
        self.end_headers()
        self.wfile.write(audio)

    def log_message(self, fmt, *args):  # quiet: no text in logs
        pass


if __name__ == "__main__":
    print(f"piper {os.path.basename(VOICE)}, listening on 127.0.0.1:{PORT}")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
