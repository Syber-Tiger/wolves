import { useEffect, useState } from 'react'
import { StoryViewer } from './StoryViewer';
import { useStoryDatabase } from './hooks/useStoryDatabase';
import { CharacterGraphView } from './views/CharacterGraphView';
import { TimelineGraphView } from './views/TimelineGraphView';
import { CheckboxFilter } from './components/CheckboxFilter';

function App() {
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [selectedBeatTypes, setSelectedBeatTypes] = useState<string[]>(['c-beat', 's-beat', 'death', 'decision']);
  const { loading, allCharacters, fullTimeline, getCharacterBeats } = useStoryDatabase();
  
  useEffect(() => {
    setSelectedCharacters(allCharacters.map(c => c.id)); // Default to all characters selected on initial load
  }, [allCharacters]);

  if (loading) return <div>Loading the lore bible...</div>;

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        left: '20px', 
        zIndex: 10, // Keeps panels floating cleanly above the graph canvas background
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <CheckboxFilter 
          title="Filter Characters"
          options={allCharacters.map(c => c.id)}
          selectedOptions={selectedCharacters}
          onChange={setSelectedCharacters}
        />
        <CheckboxFilter 
          title="Filter Beat Types"
          options={['c-beat', 's-beat', 'death', 'decision']}
          selectedOptions={selectedBeatTypes}
          onChange={setSelectedBeatTypes}
        />
      </div>
      <TimelineGraphView timeline={fullTimeline} characterEntities={allCharacters} characterFilter={selectedCharacters} beatTypeFilter={selectedBeatTypes} />
    </div>
  );
}

export default App
