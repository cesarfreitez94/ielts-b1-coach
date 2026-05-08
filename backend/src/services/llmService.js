import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { pool } from '../db/pool.js';

const KIMI_API_KEY = process.env.KIMI_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY environment variable is required');
if (ENCRYPTION_KEY.length < 30) throw new Error('ENCRYPTION_KEY must be at least 30 characters');

export function decryptKey(encrypted) {
  if (!encrypted) return null;
  const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function encryptKey(key) {
  return CryptoJS.AES.encrypt(key, ENCRYPTION_KEY).toString();
}

function resolveApiKey(provider, encryptedUserKey) {
  const userKey = decryptKey(encryptedUserKey);
  if (userKey) return userKey;
  if (provider === 'kimi') return KIMI_API_KEY;
  if (provider === 'deepseek') return DEEPSEEK_API_KEY;
  if (provider === 'anthropic') return KIMI_API_KEY;
  return null;
}

export const PROVIDER_MODELS = {
  kimi: { default: 'kimi-k2.6', models: ['kimi-k2.6', 'kimi-k2.5', 'moonshot-v1-128k'] },
  deepseek: { default: 'deepseek-v4-flash', models: ['deepseek-v4-flash', 'deepseek-v4-pro'] },
  anthropic: { default: 'claude-sonnet-4-20250514', models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-4-5-20251001'] },
  openai: { default: 'gpt-4o', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
  mistral: { default: 'mistral-large-latest', models: ['mistral-large-latest', 'mistral-medium-latest'] },
};

// ── Load user config from DB ─────────────────────────────────────
export async function getUserConfig(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM app_config WHERE user_id = $1', [userId]
  );
  return rows[0] || null;
}

// ── LLM Chat ─────────────────────────────────────────────────────
export async function llmChat({ userId, messages, system, maxTokens = 1000 }) {
  const config = await getUserConfig(userId);
  if (!config) {
    console.error('[llmChat] No config found for user:', userId);
    throw new Error('No config found for user — configure your AI provider in Settings');
  }

  const apiKey = resolveApiKey(config.llm_provider, config.llm_api_key_enc);
  if (!apiKey) {
    console.error('[llmChat] No API key resolved — provider:', config.llm_provider, 'userKey present:', !!config.llm_api_key_enc, 'global KIMI present:', !!KIMI_API_KEY);
    throw new Error(`No API key for ${config.llm_provider}. Add your API key in Settings or set KIMI_API_KEY in .env`);
  }

  const provider = config.llm_provider;
  let model = config.llm_model;
  if (!model) {
    model = PROVIDER_MODELS[provider]?.default;
  }

  console.error('[llmChat] Calling provider:', provider, 'model:', model, 'userId:', userId);

  try {
    if (provider === 'anthropic') {
      const client = new Anthropic({ apiKey });
      const res = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system,
        messages,
      });
      return res.content[0].text;
    }

    if (provider === 'openai') {
      const client = new OpenAI({ apiKey });
      const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages;
      const res = await client.chat.completions.create({ model, messages: msgs, max_tokens: maxTokens });
      return res.choices[0].message.content;
    }

    if (provider === 'mistral') {
      const res = await axios.post('https://api.mistral.ai/v1/chat/completions', {
        model, messages: system ? [{ role: 'system', content: system }, ...messages] : messages,
        max_tokens: maxTokens,
      }, { headers: { Authorization: `Bearer ${apiKey}` } });
      return res.data.choices[0].message.content;
    }

    if (provider === 'kimi') {
      const client = new OpenAI({ apiKey, baseURL: 'https://api.moonshot.ai/v1' });
      const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages;
      const res = await client.chat.completions.create({
        model: model || 'kimi-k2.5',
        messages: msgs,
        max_tokens: maxTokens,
      });
      return res.choices[0].message.content;
    }

    if (provider === 'deepseek') {
      const client = new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com' });
      const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages;
      const res = await client.chat.completions.create({ model, messages: msgs, max_tokens: maxTokens });
      return res.choices[0].message.content;
    }

    throw new Error(`Unknown LLM provider: ${provider}`);
  } catch (e) {
    console.error(`[llmChat] Provider ${provider} failed:`, e.message, '| model:', model, '| userId:', userId);
    throw e;
  }
}

// ── TTS Audio ────────────────────────────────────────────────────
export async function textToSpeech({ userId, text }) {
  const config = await getUserConfig(userId);
  const provider = config.tts_provider;
  const voice = config.tts_voice || 'nova';

  if (provider === 'openai') {
    const apiKey = decryptKey(config.tts_api_key_enc);
    const client = new OpenAI({ apiKey });
    const mp3 = await client.audio.speech.create({ model: 'tts-1', voice, input: text, speed: 0.9 });
    return Buffer.from(await mp3.arrayBuffer());
  }

  if (provider === 'elevenlabs') {
    const apiKey = decryptKey(config.tts_api_key_enc);
    const voiceId = voice || 'EXAVITQu4vr4xnSDxMaL';
    const res = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      { text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } },
      { headers: { 'xi-api-key': apiKey }, responseType: 'arraybuffer' }
    );
    return Buffer.from(res.data);
  }

  if (provider === 'google') {
    const apiKey = decryptKey(config.tts_api_key_enc);
    const res = await axios.post(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      { input: { text }, voice: { languageCode: 'en-GB', ssmlGender: 'FEMALE' }, audioConfig: { audioEncoding: 'MP3', speakingRate: 0.9 } }
    );
    return Buffer.from(res.data.audioContent, 'base64');
  }

  if (provider === 'local') {
    const { textToSpeechLocal } = await import('./piperService.js');
    return textToSpeechLocal({ text });
  }

  throw new Error(`Unknown TTS provider: ${provider}`);
}

// ── Speech to Text ───────────────────────────────────────────────
export async function speechToText({ userId, audioBuffer, mimeType = 'audio/webm' }) {
  const config = await getUserConfig(userId);
  const provider = config.stt_provider;

  if (provider === 'openai') {
    const apiKey = decryptKey(config.stt_api_key_enc);
    const client = new OpenAI({ apiKey });
    const { Readable } = await import('stream');
    const stream = Readable.from(audioBuffer);
    stream.path = 'audio.webm';
    const res = await client.audio.transcriptions.create({ file: stream, model: 'whisper-1', language: 'en' });
    return res.text;
  }

  if (provider === 'assemblyai') {
    const apiKey = decryptKey(config.stt_api_key_enc);
    const uploadRes = await axios.post('https://api.assemblyai.com/v2/upload', audioBuffer, {
      headers: { authorization: apiKey, 'content-type': 'application/octet-stream' }
    });
    const transcriptRes = await axios.post('https://api.assemblyai.com/v2/transcript',
      { audio_url: uploadRes.data.upload_url, language_code: 'en' },
      { headers: { authorization: apiKey } }
    );
    const id = transcriptRes.data.id;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const poll = await axios.get(`https://api.assemblyai.com/v2/transcript/${id}`, { headers: { authorization: apiKey } });
      if (poll.data.status === 'completed') return poll.data.text;
      if (poll.data.status === 'error') throw new Error('AssemblyAI error');
    }
    throw new Error('AssemblyAI timeout');
  }

  if (provider === 'deepgram') {
    const apiKey = decryptKey(config.stt_api_key_enc);
    const res = await axios.post('https://api.deepgram.com/v1/listen?language=en',
      audioBuffer,
      { headers: { Authorization: `Token ${apiKey}`, 'Content-Type': mimeType } }
    );
    return res.data.results.channels[0].alternatives[0].transcript;
  }

  if (provider === 'local') {
    const { speechToTextLocal } = await import('./whisperService.js');
    return speechToTextLocal({ audioBuffer, mimeType });
  }

  throw new Error(`Unknown STT provider: ${provider}`);
}
