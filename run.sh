#!/usr/bin/env bash
set -euo pipefail

# --- 設定項目 ---
APP_DIR="${APP_DIR:-$(pwd)}"
GAS_WEBAPP_URL="https://script.google.com/macros/s/AKfycby-XCpPLaLcscCKZ0_uXencPWWmDkjvZm9ZtuiZ7s4-89YWa3XTX-xtH71wTJM-_00/exec"
SECRET_TOKEN="uniuniuni"
TUNNEL_PORT="${TUNNEL_PORT:-3000}"
TIMEOUT_SEC="${TIMEOUT_SEC:-30}"

LOG_DIR="/tmp/cloudflared_gas_$$"
mkdir -p "$LOG_DIR"
NPM_LOG="$LOG_DIR/npm.log"
CF_LOG="$LOG_DIR/cloudflared.log"

NPM_PID=""
CF_PID=""

cleanup() {
  echo ""
  echo "[INFO] プロセスを停止しています..."
  if [[ -n "$CF_PID" ]] && kill -0 "$CF_PID" 2>/dev/null; then
    kill "$CF_PID" 2>/dev/null || true
    wait "$CF_PID" 2>/dev/null || true
  fi
  if [[ -n "$NPM_PID" ]] && kill -0 "$NPM_PID" 2>/dev/null; then
    # npm start の子プロセス（node等）も含めて停止
    pkill -P "$NPM_PID" 2>/dev/null || true
    kill "$NPM_PID" 2>/dev/null || true
    wait "$NPM_PID" 2>/dev/null || true
  fi
  rm -rf "$LOG_DIR"
  echo "[INFO] 停止完了。"
}

trap cleanup EXIT INT TERM

echo "[INFO] npm start をバックグラウンド起動します (dir: $APP_DIR)..."
(
  cd "$APP_DIR"
  PORT="$TUNNEL_PORT" npm start
) >"$NPM_LOG" 2>&1 &
NPM_PID=$!

# ポートがlistenされるまで待機（最大15秒）
echo "[INFO] localhost:${TUNNEL_PORT} の起動を待機中..."
for _ in $(seq 1 15); do
  if ! kill -0 "$NPM_PID" 2>/dev/null; then
    echo "[ERROR] npm start が途中で終了しました。ログを確認してください:" >&2
    cat "$NPM_LOG" >&2
    exit 1
  fi
  if (echo >/dev/tcp/127.0.0.1/"$TUNNEL_PORT") 2>/dev/null; then
    echo "[INFO] localhost:${TUNNEL_PORT} が応答可能になりました。"
    break
  fi
  sleep 1
done

echo "[INFO] cloudflared トンネルをバックグラウンド起動します..."
cloudflared tunnel --no-autoupdate --url "http://localhost:${TUNNEL_PORT}" >"$CF_LOG" 2>&1 &
CF_PID=$!

# 一時URL (*.trycloudflare.com) がログに出力されるのを待機
TUNNEL_URL=""
for _ in $(seq 1 "$TIMEOUT_SEC"); do
  if ! kill -0 "$CF_PID" 2>/dev/null; then
    echo "[ERROR] cloudflared が途中で終了しました。ログを確認してください:" >&2
    cat "$CF_LOG" >&2
    exit 1
  fi

  TUNNEL_URL=$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "$CF_LOG" | head -n 1 || true)
  if [[ -n "$TUNNEL_URL" ]]; then
    break
  fi
  sleep 1
done

if [[ -z "$TUNNEL_URL" ]]; then
  echo "[ERROR] ${TIMEOUT_SEC}秒以内に trycloudflare.com URL を取得できませんでした。" >&2
  cat "$CF_LOG" >&2
  exit 1
fi

echo "[INFO] 取得した一時URL: $TUNNEL_URL"
echo "[INFO] GAS へURLを送信中..."

JSON_PAYLOAD=$(printf '{"token":"%s","url":"%s"}' \
  "$(printf '%s' "$SECRET_TOKEN" | sed 's/\\/\\\\/g; s/"/\\"/g')" \
  "$(printf '%s' "$TUNNEL_URL" | sed 's/\\/\\\\/g; s/"/\\"/g')")

# GASはリダイレクトを返すため -L を付与してPOST送信
RESPONSE=$(curl -sS -L -X POST \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD" \
  "$GAS_WEBAPP_URL")

echo "[INFO] GAS 応答: $RESPONSE"
echo "[INFO] 稼働中です。終了するには Ctrl+C を押してください。"
echo "       npm ログ: $NPM_LOG"
echo "       cloudflared ログ: $CF_LOG"

# バックグラウンドプロセスを維持
wait "$CF_PID"
