# Test Kimi API Key

```bash
source .env && curl -X POST https://api.moonshot.ai/v1/chat/completions \
  -H "Authorization: Bearer sk-H7t4FZnmzztHqvO3eIh3TMrj4AAr4SAFoZNTZNQSTiTnwbaf" \
  -H "Content-Type: application/json" \
  -d '{"model":"kimi-k2.6","messages":[{"role":"user","content":"hola"}]}'
```

Si devuelve `{"error":{"code":"401","message":"invalid authentication","type":"authentication_error"}}` → la key es inválida.

Si devuelve una respuesta → la key es válida y el problema está en otra parte (encriptación, usuario en DB, etc).
