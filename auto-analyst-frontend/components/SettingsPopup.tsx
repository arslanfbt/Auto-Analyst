import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

interface SettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

// const API_URL = 'http://localhost:8000';
const API_URL = "https://ashad001-auto-analyst-backend.hf.space"

const SettingsPopup: React.FC<SettingsPopupProps> = ({ isOpen, onClose }) => {
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [apiKey, setApiKey] = useState('');
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/settings/model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          api_key: apiKey,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update settings');
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
              LLM Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF7F7F] focus:border-transparent"
            >
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4o-mini">GPT-4o-mini</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="anthropic/claude-3-opus-20240229">Claude 3 Opus</option>
              {/* <option value="together_ai/togethercomputer/llama-2-70b-chat">Llama 2 70b (Together AI)</option> */}
              <option value="deepseek-r1-distill-qwen-32b"> DeepSeek R1 Distill Qwen 32b (GROQ)</option>
              <option value="llama-3.3-70b-versatile">Llama 3.3 70b (GROQ)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF7F7F] focus:border-transparent"
            />
          </div>
          
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