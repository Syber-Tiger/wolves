// CharacterGraphView.tsx
import React, { useEffect, useRef } from 'react';
import { Network, Edge, Node, Options } from 'vis-network';
import { StoryEntity, Character } from '../schemas/jsonSchemas'; // Adjust path to your schema

interface CharacterGraphViewProps {
  entities: StoryEntity[];
}

export const CharacterGraphView: React.FC<CharacterGraphViewProps> = ({ entities }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Filter out only the Character entities
    const characters = entities.filter(
      (entity): entity is Character => entity.type === 'character'
    );

    // 2. Map Characters to clean, rectangular text boxes
    const nodes: Node[] = characters.map((char) => ({
      id: char.id,
      label: char.name, // Displays full name inside the box
      shape: 'box',     // Rectangular box shape
      margin: 12,       // Padding around the text inside the box
      borderWidth: 2,
      shapeProperties: {
        borderRadius: 6, // Slightly rounded corners for a modern look
      },
      color: {
        background: '#ffffff',
        border: '#475569', // Slate 600
        highlight: { background: '#f8fafc', border: '#1e293b' },
        hover: { background: '#f8fafc', border: '#1e293b' },
      },
      font: {
        color: '#0f172a', // Slate 900
        size: 14,
        face: 'ui-sans-serif, system-ui, sans-serif',
        weight: '500', // Medium font weight for the full name
      },
      // Initial spread
      x: Math.random() * 400,
      y: Math.random() * 300,
    }));

    // 3. Process and combine mutual relationships
    // We use a Map to group relationships by the unique pair of character IDs
    const edgeMap = new Map<string, { from: string; to: string; types: Set<string> }>();

    characters.forEach((char) => {
      if (!char.relationships) return;

      char.relationships.forEach((rel) => {
        // Create a deterministic key by sorting the IDs alphabetically
        // e.g. "char-1" and "char-2" always combine into "char-1_char-2"
        const ids = [char.id, rel.to].sort();
        const key = `${ids[0]}_${ids[1]}`;

        if (!edgeMap.has(key)) {
          edgeMap.set(key, {
            from: char.id,
            to: rel.to,
            types: new Set<string>([rel.type]),
          });
        } else {
          // If the pair exists, add this relationship type to the set
          edgeMap.get(key)!.types.add(rel.type);
        }
      });
    });

    // 4. Construct styled Vis.js edges from the grouped map
    const edges: Edge[] = Array.from(edgeMap.values()).map((edgeData, index) => {
      const typeList = Array.from(edgeData.types);
      
      // Join combined relationships together nicely (e.g., "parent / child")
      const displayLabel = typeList.join(' / ');

      // Style settings based on what's inside the grouped relationship
      let color = '#94a3b8'; // Default Slate 300
      let width = 1.5;
      let dashes: boolean | number[] = false;

      if (edgeData.types.has('spouse')) {
        color = '#0284c7'; // Sky Blue
        width = 2.5;
      } else if (edgeData.types.has('fiance')) {
        color = '#38bdf8'; 
        width = 2;
        dashes = [6, 4];
      } else if (edgeData.types.has('parent') || edgeData.types.has('child') || edgeData.types.has('sibling')) {
        color = '#16a34a'; // Emerald Green
        width = 2;
      } else if (edgeData.types.has('employer') || edgeData.types.has('employee')) {
        color = '#64748b'; // Slate 500
        dashes = [4, 4];
      }

      // If a relationship is explicitly one-sided (e.g. only Employer listed, no Employee back-reference)
      // we show an arrow. If it's fully combined (Parent/Child), an arrow is usually messy, so we omit it.
      const isPurelyDirectional = 
        typeList.length === 1 && 
        ['parent', 'child', 'employer', 'employee'].includes(typeList[0]);

      return {
        id: `combined-edge-${index}`,
        from: edgeData.from,
        to: edgeData.to,
        label: displayLabel,
        width: width,
        dashes: dashes,
        arrows: isPurelyDirectional ? { to: { enabled: true, scaleFactor: 0.8 } } : undefined,
        color: { color: color, highlight: '#475569' },
        font: {
          size: 11,
          color: '#475569',
          face: 'ui-sans-serif, system-ui, sans-serif',
          background: '#f8fafc', // Matches container background to clean up cross lines
          strokeWidth: 0,
        },
        // Clean straight lines now that overlapping dual-edges are compressed down into one
        smooth: { enabled: false } 
      };
    });

    // 5. Build diagram network rules
    const options: Options = {
      physics: {
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -80,
          centralGravity: 0.01,
          springLength: 160,
          springConstant: 0.06,
          avoidOverlap: 1, // Strict layout spacing rule for text boxes
        },
        stabilization: {
          iterations: 120,
        },
      },
      interaction: {
        hover: true,
        navigationButtons: true,
        dragNodes: true, 
      },
    };

    // Initialize Network
    networkRef.current = new Network(
      containerRef.current,
      { nodes, edges },
      options
    );

    // Lock physics post-layout so elements stay exactly where dragged
    networkRef.current.on('stabilizationIterationsDone', () => {
      if (networkRef.current) {
        networkRef.current.setOptions({ physics: { enabled: false } });
      }
    });

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [entities]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '650px',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        backgroundColor: '#f8fafc', // Very clean off-white canvas
      }}
    />
  );
};