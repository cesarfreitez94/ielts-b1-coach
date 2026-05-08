# IELTS App - Instalación y Ejecución de Servicios Locales

## Whisper.cpp (STT - Transcripción)

### Instalación

**Nota:** El repositorio oficial mudou de `ggerganov` a `ggml-org`. Ya no hay binarios Linux pre-compilados en los releases, por lo que se compila desde source.

```bash
mkdir -p whisper/models

# Descargar source y compilar
cd whisper
wget -q https://github.com/ggml-org/whisper.cpp/archive/refs/tags/v1.8.4.zip -O whisper.cpp-src.zip
unzip -o whisper.cpp-src.zip
rm whisper.cpp-src.zip
mkdir -p whisper.cpp-1.8.4/build && cd whisper.cpp-1.8.4/build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
cd ../..
cp whisper.cpp-1.8.4/build/bin/whisper-server .
cp whisper.cpp-1.8.4/build/bin/whisper-cli .
chmod +x whisper-server whisper-cli

# Descargar modelo small.en (~466 MB)
wget -q -O whisper/models/small.en.bin \
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin"
mv whisper/models/ggml-small.en.bin whisper/models/small.en.bin
```

### Ejecución
```bash
./whisper/whisper-server -m whisper/models/small.en.bin -t 4 --port 8080
```

---

## Piper TTS (TTS - Audio)

### Instalación
```bash
# Actualizar pip
pip install --upgrade pip

# Instalar piper-tts
pip install piper-tts[http] --break-system-packages

# Descargar voz American (lessac)
mkdir -p piper/models
python3 -c "from piper.download_voices import download_voice; from pathlib import Path; download_voice('en_US-lessac-medium', Path('./piper/models'))"
```

### Ejecución
```bash
python3 -m piper.http_server -m piper/models/en_US-lessac-medium.onnx --port 5000
```

---

## Verificación de Servicios

### Test Piper TTS:
```bash
curl -X POST http://localhost:5000/ \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world"}' -o test.wav
```

### Test Whisper STT:
```bash
curl -X POST http://localhost:8080/inference \
  -F "file=@test.wav"
```

---

## URLs de Referencia

| Servicio | URL |
|----------|-----|
| Piper TTS | http://localhost:5000 |
| Whisper Server | http://localhost:8080 |
| Backend (Express) | http://localhost:3001 |
| Frontend | http://localhost:3000 |

---

## Notas

- Whisper cpp: ~45-90 segundos para transcribir 1 min de audio (modelo small.en en CPU)
- Piper TTS: ~3-5x tiempo real (genera 1 segundo de audio en ~0.3 segundos)
- Ambos usan CPU, no requieren GPU
- Los archivos se descargan a `whisper/models/` y `piper/models/`