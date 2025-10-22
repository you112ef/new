'use client';

import { useState } from 'react';
import ModelSelector from './components/ModelSelector';
import ProjectCreator from './components/ProjectCreator';
import FileManager from './components/FileManager';

export default function HomePage() {
  const [projectId, setProjectId] = useState<string | null>(null);

  const handleProjectCreated = (id: string) => {
    setProjectId(id);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '1px solid #ccc', marginBottom: '20px', paddingBottom: '10px' }}>
        <h1>AI Coding Assistant</h1>
        {projectId && <p><strong>Project ID:</strong> {projectId}</p>}
        <ModelSelector />
      </header>

      <main>
        {!projectId ? (
          <ProjectCreator onProjectCreated={handleProjectCreated} />
        ) : (
          <FileManager projectId={projectId} />
        )}
      </main>
    </div>
  );
}
