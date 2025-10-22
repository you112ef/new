'use client';

import { useState } from 'react';

interface ProjectCreatorProps {
  onProjectCreated: (projectId: string) => void;
}

export default function ProjectCreator({ onProjectCreated }: ProjectCreatorProps) {
  const [projectName, setProjectName] = useState('');
  const [framework, setFramework] = useState('nextjs');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  const handleCreateProject = async () => {
    setLoading(true);
    setError(null);
    setCreatedProjectId(null);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: projectName, framework }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }
      const data = await response.json();
      setCreatedProjectId(data.project_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProject = () => {
    if (createdProjectId) {
      onProjectCreated(createdProjectId);
    }
  };

  return (
    <div>
      <h2>Create a New Project</h2>
      <input
        type="text"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        placeholder="Enter project name"
        style={{ padding: '8px', marginRight: '10px' }}
      />
      <select value={framework} onChange={(e) => setFramework(e.target.value)} style={{ padding: '8px', marginRight: '10px' }}>
        <option value="nextjs">Next.js</option>
        <option value="react">React</option>
        <option value="vite">Vite</option>
        <option value="vue">Vue</option>
        <option value="svelte">Svelte</option>
      </select>
      <button onClick={handleCreateProject} disabled={loading || !projectName}>
        {loading ? 'Creating...' : 'Create Project'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {createdProjectId && (
        <div style={{ marginTop: '20px' }}>
          <p>Project "{projectName}" created successfully!</p>
          <button onClick={handleViewProject}>View Project Files</button>
        </div>
      )}
    </div>
  );
}
