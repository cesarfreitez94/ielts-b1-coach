import { useState, useEffect } from 'react';
import { configAPI } from '../services/api';
import toast from 'react-hot-toast';

const PROVIDERS = {
  llm: [
    { value: 'kimi', label: 'Kimi (Moonshot) ⭐ default', models: ['kimi-k2.6', 'kimi-k2.5', 'moonshot-v1-128k'] },
    { value: 'deepseek', label: 'DeepSeek (v4-flash)', models: ['deepseek-v4-flash', 'deepseek-v4-pro'] },
    { value: 'anthropic', label: 'Anthropic (Claude)', models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-4-5-20251001'] },
    { value: 'openai', label: 'OpenAI (GPT-4)', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
    { value: 'mistral', label: 'Mistral AI', models: ['mistral-large-latest', 'mistral-medium-latest'] },
  ],
  tts: [
    { value: 'local', label: '🔊 Local (Piper - gratis)', voices: ['en_US-lessac-medium'] },
    { value: 'openai', label: 'OpenAI TTS', voices: ['nova', 'alloy', 'echo', 'fable', 'onyx', 'shimmer'] },
    { value: 'elevenlabs', label: 'ElevenLabs (alta calidad)', voices: ['Rachel', 'Domi', 'Bella', 'Antoni'] },
    { value: 'google', label: 'Google TTS', voices: ['en-GB-Standard-A', 'en-GB-Standard-B'] },
  ],
  stt: [
    { value: 'local', label: '🔊 Local (Whisper - gratis)', note: 'Modelo small.en' },
    { value: 'openai', label: 'OpenAI Whisper (recomendado)', note: 'Misma key que LLM si usas OpenAI' },
    { value: 'assemblyai', label: 'AssemblyAI', note: 'Alta precisión' },
    { value: 'deepgram', label: 'Deepgram', note: 'Muy rápido' },
  ],
};

export default function ConfigPanel() {
  const [config, setConfig] = useState({
    llm_provider: 'kimi', llm_model: 'kimi-k2.5', llm_api_key: '',
    tts_provider: 'openai', tts_voice: 'nova', tts_api_key: '',
    stt_provider: 'openai', stt_api_key: '',
    daily_goal_minutes: 180, target_exam_date: '',
  });
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    configAPI.get().then(r => {
      setConfig(prev => ({ ...prev, ...r.data }));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const save = async () => {
    try {
      await configAPI.update(config);
      setSaved(true);
      toast.success('Configuración guardada ✅');
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      toast.error('Error al guardar: ' + e.message);
    }
  };

  const testService = async (service) => {
    setTesting(p => ({ ...p, [service]: 'loading' }));
    try {
      await configAPI.update(config); // save first
      const r = await configAPI.test(service);
      setTesting(p => ({ ...p, [service]: r.data.success ? 'ok' : 'error' }));
      if (r.data.success) toast.success(`${service.toUpperCase()} funcionando ✅`);
      else toast.error(`Error: ${r.data.error}`);
    } catch (e) {
      setTesting(p => ({ ...p, [service]: 'error' }));
      toast.error('Error al probar: ' + e.message);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-400">Cargando configuración...</div>;

  const llmProviders = PROVIDERS.llm;
  const selectedLLM = llmProviders.find(p => p.value === config.llm_provider);
  const selectedTTS = PROVIDERS.tts.find(p => p.value === config.tts_provider);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">⚙️ Configuración</h1>
        <p className="text-gray-400 text-sm mt-1">Configura tus servicios de IA, audio y reconocimiento de voz</p>
      </div>

      {/* ── LLM Tutor ──────────────────────────────────────── */}
      <ServiceCard
        title="🧠 Tutor IA (LLM)"
        subtitle="Motor de inteligencia para el tutor, evaluaciones y plan del día"
        testStatus={testing.llm}
        onTest={() => testService('llm')}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="config-label">Proveedor</label>
            <select className="config-select" value={config.llm_provider}
              onChange={e => setConfig(p => ({ ...p, llm_provider: e.target.value, llm_model: PROVIDERS.llm.find(x => x.value === e.target.value)?.models[0] || '' }))}>
              {llmProviders.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="config-label">Modelo</label>
            <select className="config-select" value={config.llm_model} onChange={e => setConfig(p => ({ ...p, llm_model: e.target.value }))}>
              {selectedLLM?.models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="config-label">API Key {config.llm_key_set && <span className="text-green-400 text-xs ml-1">✓ guardada</span>}</label>
          <input type="password" className="config-input" placeholder="sk-..." value={config.llm_api_key}
            onChange={e => setConfig(p => ({ ...p, llm_api_key: e.target.value }))} />
        </div>
      </ServiceCard>

      {/* ── TTS Audio ──────────────────────────────────────── */}
      <ServiceCard
        title="🔊 Audio TTS"
        subtitle="Generación de audio para pronunciación de palabras"
        testStatus={testing.tts}
        onTest={() => testService('tts')}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="config-label">Proveedor</label>
            <select className="config-select" value={config.tts_provider}
              onChange={e => setConfig(p => ({ ...p, tts_provider: e.target.value }))}>
              {PROVIDERS.tts.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="config-label">Voz</label>
            <select className="config-select" value={config.tts_voice} onChange={e => setConfig(p => ({ ...p, tts_voice: e.target.value }))}>
              {selectedTTS?.voices.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="config-label">API Key {config.tts_key_set && <span className="text-green-400 text-xs ml-1">✓ guardada</span>}</label>
          <input type="password" className="config-input" placeholder="API key..." value={config.tts_api_key}
            onChange={e => setConfig(p => ({ ...p, tts_api_key: e.target.value }))} />
          <p className="text-xs text-gray-500 mt-1">Si usas el mismo proveedor que LLM (ej. OpenAI), puede ser la misma key</p>
        </div>
      </ServiceCard>

      {/* ── STT Speaking ───────────────────────────────────── */}
      <ServiceCard
        title="🎤 Speech-to-Text (Speaking)"
        subtitle="Reconocimiento de voz para evaluar tu pronunciación"
        testStatus={null}
        onTest={null}
      >
        <div>
          <label className="config-label">Proveedor</label>
          {PROVIDERS.stt.map(p => (
            <label key={p.value} className="flex items-start gap-3 p-3 rounded-lg border border-gray-700 cursor-pointer mb-2 hover:border-purple-500 transition-colors"
              style={{ borderColor: config.stt_provider === p.value ? 'var(--accent)' : '' }}>
              <input type="radio" name="stt" value={p.value} checked={config.stt_provider === p.value}
                onChange={() => setConfig(prev => ({ ...prev, stt_provider: p.value }))} className="mt-0.5" />
              <div>
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-xs text-gray-400">{p.note}</div>
              </div>
            </label>
          ))}
        </div>
        <div>
          <label className="config-label">API Key STT {config.stt_key_set && <span className="text-green-400 text-xs ml-1">✓ guardada</span>}</label>
          <input type="password" className="config-input" placeholder="API key..." value={config.stt_api_key}
            onChange={e => setConfig(p => ({ ...p, stt_api_key: e.target.value }))} />
        </div>
      </ServiceCard>

      {/* ── Study Goals ────────────────────────────────────── */}
      <ServiceCard title="🎯 Metas de estudio" subtitle="Configura tu objetivo diario y fecha del examen" testStatus={null} onTest={null}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="config-label">Meta diaria (minutos)</label>
            <input type="number" className="config-input" min="60" max="480" step="30"
              value={config.daily_goal_minutes} onChange={e => setConfig(p => ({ ...p, daily_goal_minutes: parseInt(e.target.value) }))} />
            <p className="text-xs text-gray-500 mt-1">{Math.round(config.daily_goal_minutes / 60 * 10) / 10}h / día</p>
          </div>
          <div>
            <label className="config-label">Fecha del examen IELTS</label>
            <input type="date" className="config-input" value={config.target_exam_date}
              onChange={e => setConfig(p => ({ ...p, target_exam_date: e.target.value }))} />
          </div>
        </div>
      </ServiceCard>

      <button onClick={save} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors">
        {saved ? '✅ Guardado' : 'Guardar configuración'}
      </button>
    </div>
  );
}

function ServiceCard({ title, subtitle, testStatus, onTest, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-bold text-base">{title}</h2>
          <p className="text-gray-400 text-xs mt-0.5">{subtitle}</p>
        </div>
        {onTest && (
          <button onClick={onTest} disabled={testStatus === 'loading'}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              testStatus === 'ok' ? 'border-green-500 text-green-400' :
              testStatus === 'error' ? 'border-red-500 text-red-400' :
              'border-gray-600 text-gray-400 hover:border-purple-500 hover:text-purple-400'
            }`}>
            {testStatus === 'loading' ? '...' : testStatus === 'ok' ? '✓ OK' : testStatus === 'error' ? '✗ Error' : 'Probar'}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
