import json
import urllib.request
import urllib.parse
import re


def handler(event: dict, context) -> dict:
    """Генерирует HTML5 код по запросу пользователя через бесплатный AI."""

    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Max-Age": "86400",
            },
            "body": "",
        }

    body = json.loads(event.get("body") or "{}")
    prompt = body.get("prompt", "").strip()
    history = body.get("history", [])

    if not prompt:
        return {
            "statusCode": 400,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"error": "prompt is required"}),
        }

    system_prompt = (
        "You are an expert HTML5 and JavaScript game/website generator. "
        "Respond with ONLY a complete working HTML5 document. "
        "Rules: output ONLY HTML code starting with <!DOCTYPE html>, no explanations. "
        "All CSS in <style>, all JS in <script>. "
        "Use dark background #080a0e. Neon colors with glow effects. "
        "For games use Canvas API. Make it visually impressive."
    )

    messages = [{"role": "system", "content": system_prompt}]
    for msg in history[-4:]:
        if msg.get("role") in ("user", "assistant") and msg.get("content"):
            messages.append({"role": msg["role"], "content": str(msg["content"])[:300]})
    messages.append({"role": "user", "content": f"Generate HTML5: {prompt}"})

    html_code, last_error = None, ""

    # Provider 1: Pollinations GET API (без ключа)
    try:
        html_code = call_pollinations_get(system_prompt, prompt)
    except Exception as e:
        last_error = f"pollinations_get: {e}"

    # Provider 2: Pollinations POST API
    if not html_code:
        try:
            html_code = call_pollinations_post(messages)
        except Exception as e:
            last_error += f" | pollinations_post: {e}"

    # Provider 3: Cerebras (бесплатный tier, публичный доступ)
    if not html_code:
        try:
            html_code = call_cerebras(messages)
        except Exception as e:
            last_error += f" | cerebras: {e}"

    if not html_code:
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"error": f"AI сервис недоступен: {last_error}"}),
        }

    html_code = extract_html(html_code)

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
        },
        "body": json.dumps({
            "reply": "Готово! Сгенерировал HTML5 код. Превью обновлено справа — скопируйте или скачайте файл.",
            "code": html_code,
        }),
    }


def call_pollinations_get(system: str, user_prompt: str) -> str:
    """Pollinations AI GET endpoint — без ключа."""
    combined = f"{system}\n\nTask: Generate HTML5 code for: {user_prompt}\nRespond with ONLY the HTML code."
    encoded = urllib.parse.quote(combined[:1500])
    url = f"https://text.pollinations.ai/{encoded}?model=openai-large&seed=42"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 NeonForge/1.0"},
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=28) as resp:
        content = resp.read().decode("utf-8").strip()
    if len(content) < 100:
        raise ValueError(f"response too short ({len(content)} chars)")
    return content


def call_pollinations_post(messages: list) -> str:
    """Pollinations AI POST endpoint — без ключа."""
    url = "https://text.pollinations.ai/openai"
    payload = json.dumps({
        "model": "openai",
        "messages": messages,
        "max_tokens": 3500,
        "temperature": 0.7,
        "seed": 42,
    }).encode("utf-8")
    req = urllib.request.Request(
        url, data=payload,
        headers={
            "Content-Type": "application/json",
            "Referer": "https://pollinations.ai",
            "Origin": "https://pollinations.ai",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=28) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    content = data["choices"][0]["message"]["content"].strip()
    if not content:
        raise ValueError("empty response")
    return content


def call_cerebras(messages: list) -> str:
    """Cerebras inference API — бесплатный tier."""
    url = "https://api.cerebras.ai/v1/chat/completions"
    payload = json.dumps({
        "model": "llama3.1-8b",
        "messages": messages,
        "max_tokens": 3500,
        "temperature": 0.7,
    }).encode("utf-8")
    req = urllib.request.Request(
        url, data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer csk-demo",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=28) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    content = data["choices"][0]["message"]["content"].strip()
    if not content:
        raise ValueError("empty response")
    return content


def extract_html(text: str) -> str:
    """Извлекает HTML из ответа модели."""
    for pattern in [
        r"```html\s*([\s\S]*?)```",
        r"```\s*(<!DOCTYPE[\s\S]*?)```",
        r"(<!DOCTYPE html[\s\S]*?</html>)",
        r"(<html[\s\S]*?</html>)",
    ]:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    stripped = text.strip()
    if stripped.lower().startswith(("<!doctype", "<html")):
        return stripped
    return text.strip()
