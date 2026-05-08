# IELTS App - Comandos de Activación

## 1. Instalar Servicios Locales (Whisper + Piper)

```bash
./scripts/download-models.sh
```

## 2. Configurar API Key de Kimi

Editar `.env` y agregar:
```env
KIMI_API_KEY=tu_key_de_kimi_aqui
```

## 3. Iniciar Whisper.cpp (STT - Transcripción)

```bash
./whisper/whisper-server -m whisper/models/small.en.bin -t 4 --port 8080
```

## 4. Iniciar Piper (TTS - Audio)

```bash
python3 -m piper.http_server -m piper/models/en_US-lessac-medium.onnx --port 5000
```

## 5. Reiniciar Backend

```bash
cd backend && npm run dev
```

## 6. Verificar Servicios

### Test Piper TTS:
```bash
curl -X POST http://localhost:5000/ \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world"}' -o test.wav
file test.wav  # RIFF (little-endian) data, WAVE audio
```

### Test Whisper STT:
```bash
curl -X POST http://localhost:8080/inference \
  -F "file=@test.wav"
# Respuesta: {"text":" Hello World!\n"}
```

## 7. URLs de Referencia

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend (Express) | http://localhost:3001 |
| Piper TTS | http://localhost:5000 |
| Whisper Server | http://localhost:8080 |

## Notas

- Whisper tarda ~45-90 segundos en transcribir 1 minuto de audio (modelo small.en)
- Piper genera audio en ~3-5x tiempo real
- Ambos servicios usan CPU (sin GPU)
- La API key de Kimi puede ser global (.env) o por-usuario (DB encriptada)
- Los binarios de Whisper se compilaron desde source (ggml-org/whisper.cpp v1.8.4)