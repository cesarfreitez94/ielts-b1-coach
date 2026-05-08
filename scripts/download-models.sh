#!/bin/bash
set -e

echo "=== Instalando servicios locales (sin Docker) ==="
echo ""

# ── Whisper.cpp ─────────────────────────────────────────────────────
echo ">>> Instalando Whisper.cpp..."

mkdir -p whisper/models

# Descargar binary pre-compilado (desde ggml-org, ya no hay binarios Linux en releases)
# Se compila desde source usando el source zip de ggml-org
if [ ! -f whisper/whisper-server ]; then
  echo "Compilando whisper.cpp desde source..."
  if [ ! -f whisper/whisper.cpp-1.8.4 ]; then
    echo "Descargando source..."
    wget -q -O whisper/whisper.cpp-src.zip https://github.com/ggml-org/whisper.cpp/archive/refs/tags/v1.8.4.zip
    unzip -o whisper/whisper.cpp-src.zip -d whisper/
    rm whisper/whisper.cpp-src.zip
  fi
  echo "Compilando..."
  mkdir -p whisper/whisper.cpp-1.8.4/build
  cd whisper/whisper.cpp-1.8.4/build
  cmake .. -DCMAKE_BUILD_TYPE=Release > /dev/null 2>&1
  make -j$(nproc) > /dev/null 2>&1
  cd ../..
  cp whisper.cpp-1.8.4/build/bin/whisper-server whisper/
  cp whisper.cpp-1.8.4/build/bin/whisper-cli whisper/
  chmod +x whisper/whisper-server whisper/whisper-cli
  echo "Whisper.cpp compilado"
fi

# Descargar modelo small.en
if [ ! -f whisper/models/small.en.bin ]; then
  echo "Descargando modelo small.en (~466 MB)..."
  wget -q -O whisper/models/small.en.bin \
    "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin"
  mv whisper/models/ggml-small.en.bin whisper/models/small.en.bin
else
  echo "Modelo small.en ya existe"
fi

# ── Piper TTS ────────────────────────────────────────────────────────
echo ""
echo ">>> Instalando Piper TTS..."

# Verificar si piper ya está instalado
if ! python3 -c "import piper" > /dev/null 2>&1; then
  echo "Instalando piper-tts via pip..."
  pip install piper-tts[http] -q --break-system-packages 2>/dev/null || \
  pip install piper-tts[http] -q
fi

mkdir -p piper/models

# Descargar voz American (lessac)
if [ ! -f piper/models/en_US-lessac-medium.onnx ]; then
  echo "Descargando voz en_US-lessac-medium..."
  python3 -c "from piper.download_voices import download_voice; from pathlib import Path; download_voice('en_US-lessac-medium', Path('./piper/models'))"
else
  echo "Voz en_US-lessac-medium ya existe"
fi

# ── Resumen ──────────────────────────────────────────────────────────
echo ""
echo "=== Instalación completada ==="
echo ""
echo "Archivos descargados:"
ls -lh whisper/models/ 2>/dev/null || true
ls -lh piper/models/ 2>/dev/null || true
echo ""
echo "=== Para iniciar servicios ==="
echo ""
echo "# Whisper.cpp (STT - transcripción):"
echo "  ./whisper/whisper-server -m whisper/models/small.en.bin -t 4 --port 8080"
echo ""
echo "# Piper (TTS - audio):"
echo "  python3 -m piper.http_server -m piper/models/en_US-lessac-medium.onnx --port 5000"
echo ""
echo "=== URLs de los servicios ==="
echo "  Piper TTS:  http://localhost:5000"
echo "  Whisper:    http://localhost:8080"