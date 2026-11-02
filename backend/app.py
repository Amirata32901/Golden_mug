import os
import time
from collections import defaultdict, deque

import requests
from flask import Flask, jsonify, request

# Read .env without requiring an extra package.
def load_env_file(path=".env"):
    if not os.path.isfile(path):
        return
    with open(path, "r", encoding="utf-8") as file:
        for line in file:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value

load_env_file()

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 12 * 1024

ALLOWED_ORIGIN = os.getenv(
    "ALLOWED_ORIGIN",
    "https://amirata32901.github.io"
).rstrip("/")
BASE_URL = os.getenv("GAPGPT_BASE_URL", "https://api.gapgpt.app/v1").rstrip("/")
API_KEY = os.getenv("GAPGPT_API_KEY", "").strip()
MODEL = os.getenv("GAPGPT_MODEL", "gpt-4o-mini").strip()

# Simple per-process rate limit: 12 messages per IP per minute.
recent_requests = defaultdict(deque)

SYSTEM_PROMPT = """تو دستیار پشتیبانی فروشگاه اینترنتی گلدن ماگ هستی.
فقط به زبان فارسی، محترمانه، کوتاه و روشن پاسخ بده.
در موضوعات سفارش، قیمت، موجودی، ارسال و مرجوعی فقط اطلاعاتی را قطعی اعلام کن
که در پیام‌های داده‌شده وجود دارد. اگر اطلاعات کافی نداری، حدس نزن و مشتری را
به پشتیبان انسانی روبیکا راهنمایی کن: https://rubika.ir/sajad_yousefi1317
هرگز ادعا نکن سفارش ثبت یا پیگیری شده، چون به سامانه سفارش‌ها دسترسی نداری.
از مشتری رمز، کد ورود، اطلاعات بانکی یا اطلاعات حساس درخواست نکن.
اگر پرسش خارج از موضوع فروشگاه است، کوتاه بگو حوزه پشتیبانی تو گلدن ماگ است.
"""

@app.get("/health")
def health():
    return jsonify({"status": "ok"})


def allowed_origin(origin):
    return origin and origin.rstrip("/") == ALLOWED_ORIGIN

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin", "")
    if allowed_origin(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    return response

@app.route("/api/chat", methods=["POST", "OPTIONS"])
def chat():
    if request.method == "OPTIONS":
        return ("", 204)

    origin = request.headers.get("Origin", "")
    if origin and not allowed_origin(origin):
        return jsonify({"error": "مبدأ درخواست مجاز نیست."}), 403

    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip()
    now = time.time()
    bucket = recent_requests[ip]
    while bucket and now - bucket[0] > 60:
        bucket.popleft()
    if len(bucket) >= 12:
        return jsonify({"error": "تعداد پیام‌ها زیاد است؛ یک دقیقه دیگر تلاش کن."}), 429
    bucket.append(now)

    if not API_KEY:
        return jsonify({"error": "کلید API روی سرور تنظیم نشده است."}), 503

    data = request.get_json(silent=True) or {}
    message = str(data.get("message", "")).strip()
    if not message:
        return jsonify({"error": "پیام خالی است."}), 400
    if len(message) > 400:
        return jsonify({"error": "پیام بیش از حد طولانی است."}), 400

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": message}
        ],
        "temperature": 0.4,
        "max_tokens": 350
    }

    try:
        result = requests.post(
            BASE_URL + "/chat/completions",
            headers={
                "Authorization": "Bearer " + API_KEY,
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=35
        )
        if result.status_code >= 400:
            app.logger.error("GapGPT returned HTTP %s", result.status_code)
            return jsonify({"error": "سرویس هوش مصنوعی فعلاً پاسخ نداد."}), 502

        body = result.json()
        reply = body["choices"][0]["message"]["content"]
        if not isinstance(reply, str) or not reply.strip():
            raise ValueError("Empty AI response")
        return jsonify({"reply": reply.strip()})

    except requests.Timeout:
        return jsonify({"error": "پاسخ‌گویی زمان‌بر شد؛ دوباره تلاش کن."}), 504
    except (requests.RequestException, ValueError, KeyError, IndexError):
        app.logger.exception("AI request failed")
        return jsonify({"error": "در دریافت پاسخ مشکلی پیش آمد."}), 502

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
