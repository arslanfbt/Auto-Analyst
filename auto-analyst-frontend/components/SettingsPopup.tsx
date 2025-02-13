import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface SettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

// const API_URL = 'http://localhost:8000';
const API_URL = "https://ashad001-auto-analyst-backend.hf.space"

// Define model providers and their models
const MODEL_PROVIDERS = [
  {
    name: 'OpenAI',
    models: [
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    ]
  },
  {
    name: 'Anthropic',
    models: [
      { id: 'anthropic/claude-3-opus-20240229', name: 'Claude 3 Opus' },
    ]
  },
  {
    name: 'GROQ',
    models: [
      { id: 'deepseek-r1-distill-qwen-32b', name: 'DeepSeek R1 Distill Qwen 32b' },
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70b' },
    ]
  }
];

const SettingsPopup: React.FC<SettingsPopupProps> = ({ isOpen, onClose }) => {
  const [selectedProvider, setSelectedProvider] = useState(MODEL_PROVIDERS[0].name);
  const [selectedModel, setSelectedModel] = useState(MODEL_PROVIDERS[0].models[0].id);
  const [useCustomAPI, setUseCustomAPI] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Update selected model when provider changes
  useEffect(() => {
    const provider = MODEL_PROVIDERS.find(p => p.name === selectedProvider);
    if (provider) {
      setSelectedModel(provider.models[0].id);
    }
  }, [selectedProvider]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate API key if custom API is enabled
      if (useCustomAPI && !apiKey.trim()) {
        setNotification({ 
          type: 'error', 
          message: 'Please provide an API key or disable custom API option'
        });
        return;
      }

      const response = await fetch(`${API_URL}/settings/model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: selectedProvider,
          model: selectedModel,
          api_key: useCustomAPI ? apiKey.trim() : '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.message || 'Failed to update settings');
      }

      setNotification({ type: 'success', message: 'Settings updated successfully!' });
      setTimeout(() => {
        setNotification(null);
        onClose();
      }, 2000);
    } catch (error) {
      setNotification({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to update settings'
      });
      console.error('Failed to update settings:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-[#FF7F7F] transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
        
        <h2 className="text-xl font-semibold mb-6">Settings</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model Provider
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF7F7F] focus:border-transparent"
            >
              {MODEL_PROVIDERS.map((provider) => (
                <option key={provider.name} value={provider.name}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF7F7F] focus:border-transparent"
            >
              {MODEL_PROVIDERS.find(p => p.name === selectedProvider)?.models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useCustomAPI"
              checked={useCustomAPI}
              onChange={(e) => setUseCustomAPI(e.target.checked)}
              className="rounded border-gray-300 text-[#FF7F7F] focus:ring-[#FF7F7F]"
            />
            <label htmlFor="useCustomAPI" className="text-sm font-medium text-gray-700">
              Use custom API key
            </label>
          </div>

          {useCustomAPI && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  API Key
                </label>
                <div className="relative group">
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded-md shadow-lg">
                    Your API key is never stored on our servers. It's only used once for the current request.
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                      <div className="border-solid border-4 border-transparent border-t-gray-800"></div>
                    </div>
                  </div>
                </div>
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF7F7F] focus:border-transparent"
              />
            </div>
          )}
          
          {notification && (
            <div className={`flex items-center gap-2 p-3 rounded-md ${
              notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {notification.type === 'success' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span className="text-sm">{notification.message}</span>
            </div>
          )}
          
          <button
            type="submit"
            className="w-full bg-[#FF7F7F] text-white py-2 px-4 rounded-md hover:bg-[#FF6B6B] transition-colors"
          >
            Save Settings
          </button>
        </form>
      </div>
    </div>
  );
};

export default SettingsPopup; 