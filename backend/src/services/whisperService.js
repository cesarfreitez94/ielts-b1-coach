const WHISPER_URL = process.env.WHISPER_URL || 'http://localhost:8080';

export async function speechToTextLocal({ audioBuffer, mimeType = 'audio/webm' }) {
  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer], { type: mimeType }), 'audio.webm');
  formData.append('model', 'small.en');

  const res = await fetch(`${WHISPER_URL}/inference`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(`Whisper error: ${res.status}`);
  const data = await res.json();
  return data.text;
}