import { useState } from 'react'
import { useDynamicJson } from './hooks/useDynamicJson';
import './App.css'

function App() {
  const { data, loading, error } = useDynamicJson("characters/village.json");

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
