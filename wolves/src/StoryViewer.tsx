import { useStoryDatabase } from "./hooks/useStoryDatabase";

export function StoryViewer() {
  const { loading, allCharacters, fullTimeline, getCharacterBeats } = useStoryDatabase();

  if (loading) return <div>Loading the lore bible...</div>;

  const marysBeats = getCharacterBeats('mary');

  return (
    <div>
      <h2>Characters ({allCharacters.length})</h2>
      <ul>
        {allCharacters.map(c => <li key={c.id}>{c.name}</li>)}
      </ul>

      <h2>Mary's Journey</h2>
      <ul>
        {marysBeats.map((beat, i) => (
          <li key={i}>[{beat.time}] {beat.content}</li>
        ))}
      </ul>
    </div>
  );
}