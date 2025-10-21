'use client';

import { useEffect, useState } from 'react';

// Simplified model interface based on OpenRouter's API response
interface Model {
  id: string;
  name: string;
}

async function fetchModels(): Promise<Model[]> {
  try {
    // Attempt to fetch from the official, structured API endpoint first
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (!res.ok) {
      console.error('Failed to fetch models from API:', res.statusText);
      return []; // Handle API errors gracefully
    }
    const { data } = await res.json();
    return data || []; // The API response wraps models in a 'data' property
  } catch (error) {
    console.error('Error fetching models:', error);
    return []; // Return an empty array on any exception
  }
}

export default function ModelSelector() {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadModels() {
      setLoading(true);
      const fetchedModels = await fetchModels();
      setModels(fetchedModels);
      // Set a default selection if models are found
      if (fetchedModels.length > 0) {
        setSelectedModel(fetchedModels[0].id);
      }
      setLoading(false);
    }
    loadModels();
  }, []);

  if (loading) {
    return <div>Loading available models...</div>;
  }

  if (models.length === 0) {
    return <div>Could not load models. Please try again later.</div>
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <label htmlFor="model-select" style={{ marginRight: '10px' }}>
        Choose an AI Model:
      </label>
      <select
        id="model-select"
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
        style={{ padding: '8px', fontSize: '16px' }}
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
    </div>
  );
}
