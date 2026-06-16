import { useState } from 'react'
import { StoryViewer } from './StoryViewer';
import { useStoryDatabase } from './hooks/useStoryDatabase';
import { CharacterGraphView } from './views/CharacterGraphView';

function App() {
  const { loading, allCharacters, fullTimeline, getCharacterBeats } = useStoryDatabase();
  
  if (loading) return <div>Loading the lore bible...</div>;

  return (
    <CharacterGraphView entities={allCharacters} />
  )
}

export default App
