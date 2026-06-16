import { useState } from 'react'
import { useJson } from './hooks/useJson';
import './App.css'

function App() {
  const { data, loading, error } = useJson("characters/village.json");

  if (loading) return <div>Loading file contents...</div>;
  if (error) return <div className="error">Failed to load: {error.message}</div>;

  // Because of Zod, TypeScript knows `data` is safe and typed!
  return (
    <pre>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default App
