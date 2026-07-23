import { FormEvent, useState } from 'react';

export const DEEPSEEK_CONFIG_KEY = 'ai-battleground:deepseek-config';

export type DeepSeekConfig = {
  baseUrl: string;
  model: string;
  apiKey: string;
};

type DeepSeekConfigGateProps = {
  initialConfig?: DeepSeekConfig;
  onSave: (config: DeepSeekConfig) => void;
};

export function readDeepSeekConfig() {
  try {
    const raw = window.localStorage.getItem(DEEPSEEK_CONFIG_KEY);
    if (!raw) {
      return undefined;
    }
    const parsed = JSON.parse(raw) as DeepSeekConfig;
    if (!parsed.apiKey || !parsed.baseUrl || !parsed.model) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

export function saveDeepSeekConfig(config: DeepSeekConfig) {
  window.localStorage.setItem(DEEPSEEK_CONFIG_KEY, JSON.stringify(config));
}

export default function DeepSeekConfigGate({ initialConfig, onSave }: DeepSeekConfigGateProps) {
  const [baseUrl, setBaseUrl] = useState(initialConfig?.baseUrl ?? 'https://api.deepseek.com');
  const [model, setModel] = useState(initialConfig?.model ?? 'deepseek-chat');
  const [apiKey, setApiKey] = useState(initialConfig?.apiKey ?? '');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const config = {
      baseUrl: baseUrl.trim().replace(/\/$/, ''),
      model: model.trim(),
      apiKey: apiKey.trim(),
    };
    if (!config.baseUrl || !config.model || !config.apiKey) {
      return;
    }
    saveDeepSeekConfig(config);
    onSave(config);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-brown-900/92 p-4 backdrop-blur-sm">
      <form
        className="w-full max-w-[440px] border-2 border-amber-300 bg-brown-900 p-5 text-brown-50 shadow-2xl"
        onSubmit={submit}
      >
        <div className="text-xs uppercase tracking-wide text-amber-200">DeepSeek setup</div>
        <h2 className="font-display text-4xl leading-none text-amber-100">DS API</h2>

        <label className="mt-4 block text-sm text-brown-200">
          Base URL
          <input
            className="mt-1 w-full border-brown-500 bg-brown-800 text-brown-50 focus:border-amber-300 focus:ring-amber-300"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            spellCheck={false}
          />
        </label>

        <label className="mt-3 block text-sm text-brown-200">
          Model
          <input
            className="mt-1 w-full border-brown-500 bg-brown-800 text-brown-50 focus:border-amber-300 focus:ring-amber-300"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            spellCheck={false}
          />
        </label>

        <label className="mt-3 block text-sm text-brown-200">
          API Key
          <input
            className="mt-1 w-full border-brown-500 bg-brown-800 text-brown-50 focus:border-amber-300 focus:ring-amber-300"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            spellCheck={false}
            type="password"
            autoFocus
          />
        </label>

        <button
          className="mt-5 h-12 w-full border-2 border-amber-300 bg-amber-500 text-lg text-brown-900 disabled:opacity-40"
          disabled={!apiKey.trim() || !baseUrl.trim() || !model.trim()}
          type="submit"
        >
          Enter Arena
        </button>
      </form>
    </div>
  );
}
