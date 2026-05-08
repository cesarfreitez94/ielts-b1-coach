const PIPER_URL = process.env.PIPER_URL || 'http://localhost:5000';

export async function textToSpeechLocal({ text }) {
  const res = await fetch(`${PIPER_URL}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error(`Piper error: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}