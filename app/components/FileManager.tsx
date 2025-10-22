'use client';

import { useState, useEffect } from 'react';

interface File {
  name: string;
  isDirectory: boolean;
}

export default function FileManager({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [devServerUrl, setDevServerUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      // Give the scaffolding a moment to run
      setTimeout(async () => {
        const response = await fetch(`/api/projects/${projectId}/files`);
        if (response.ok) {
          const data = await response.json();
          setFiles(data.files);
        }
      }, 2000); // A short delay to allow `bun create` to run
    };
    fetchFiles();
  }, [projectId]);

  const handleFileSelect = async (file: File) => {
    if (file.isDirectory) return;
    setSelectedFile(file.name);
    const response = await fetch(`/api/projects/${projectId}/files/${file.name}`);
    const data = await response.json();
    setFileContent(data.content);
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    setLoading(true);
    await fetch(`/api/projects/${projectId}/files/${selectedFile}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: fileContent }),
    });
    setLoading(false);
  };

  const handleStartDevServer = async () => {
    await fetch(`/api/projects/${projectId}/start-dev-server`, {
      method: 'POST',
    });
    // For now, we'll hardcode the URL. A real implementation would
    // need to get the port from the container's port mappings.
    setDevServerUrl(`http://localhost:3000`);
  };

  return (
    <div>
      <button onClick={handleStartDevServer}>Start Dev Server</button>
      {devServerUrl && (
        <p>
          Live Preview: <a href={devServerUrl} target="_blank" rel="noopener noreferrer">{devServerUrl}</a>
        </p>
      )}
      <h3>Files</h3>
      <ul>
        {files.map((file) => (
          <li key={file.name} onClick={() => handleFileSelect(file)} style={{ cursor: 'pointer' }}>
            {file.name} {file.isDirectory ? '/' : ''}
          </li>
        ))}
      </ul>
      {selectedFile && (
        <div>
          <h4>Editing: {selectedFile}</h4>
          <textarea
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            rows={20}
            cols={80}
          />
          <button onClick={handleSaveFile} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}
