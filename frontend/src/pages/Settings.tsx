import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Settings as SettingsIcon, Key, Globe, Clock, Save } from 'lucide-react';
import { configAPI } from '../services/api';

const PROVIDERS = [
  { value: 'kimi', label: 'Kimi (Moonshot)' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'mistral', label: 'Mistral' },
];

const MODELS = {
  kimi: ['kimi-k2.5', 'kimi-k2.6', 'moonshot-v1-128k'],
  deepseek: ['deepseek-v4-flash', 'deepseek-v4-pro'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-4-5-20251001'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  mistral: ['mistral-large-latest', 'mistral-medium-latest'],
};

export default function Settings() {
  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => configAPI.get(),
  });

  const [form, setForm] = useState({
    llm_provider: 'kimi',
    llm_model: 'kimi-k2.5',
    llm_api_key: '',
    daily_goal_minutes: 180,
  });

  useEffect(() => {
    if (config?.data) {
      setForm({
        llm_provider: config.data.llm_provider || 'kimi',
        llm_model: config.data.llm_model || '',
        llm_api_key: '',
        daily_goal_minutes: config.data.daily_goal_minutes || 180,
      });
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: (data) => configAPI.update(data),
    onSuccess: () => {
      toast.success('Settings saved');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to save settings');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      llm_provider: form.llm_provider,
      llm_model: form.llm_model,
      llm_api_key: form.llm_api_key || undefined,
      daily_goal_minutes: form.daily_goal_minutes,
    });
  };

  const handleProviderChange = (provider) => {
    const defaultModel = MODELS[provider]?.[0] || '';
    setForm({ ...form, llm_provider: provider, llm_model: defaultModel });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Configure your AI tutor and preferences</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Globe className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">AI Provider</h2>
            <p className="text-sm text-gray-500">Choose which LLM powers your tutor</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
            <select
              value={form.llm_provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <select
              value={form.llm_model}
              onChange={(e) => setForm({ ...form, llm_model: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {(MODELS[form.llm_provider] || []).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Key className="w-4 h-4 inline mr-1" />
            API Key (optional)
          </label>
          <input
            type="password"
            value={form.llm_api_key}
            onChange={(e) => setForm({ ...form, llm_api_key: e.target.value })}
            placeholder="Leave empty to use global key"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-400 mt-1">Stored encrypted. Uses global key if empty.</p>
        </div>

        <div className="flex items-center space-x-3 pb-4 border-b">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Clock className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Daily Goal</h2>
            <p className="text-sm text-gray-500">Minutes of study per day</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Minutes per day</label>
          <input
            type="number"
            value={form.daily_goal_minutes}
            onChange={(e) => setForm({ ...form, daily_goal_minutes: parseInt(e.target.value) || 0 })}
            min={30}
            max={480}
            step={30}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{updateMutation.isPending ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </form>
    </div>
  );
}