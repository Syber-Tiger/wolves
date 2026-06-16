import { useEffect, useRef } from "react";
import { StoryEntity } from "../schemas/jsonSchemas";
import { Edge, Network, Options } from "vis-network";
import { be } from "zod/locales";
import { parse } from "zod";

// Define a clean interface for Vis.js node options
export interface VisNode {
  id: string;
  label: string;
  shape: 'box' | 'diamond' | 'ellipse' | 'database';
  opacity: number;
  color: {
    background: string;
    border: string;
    hover: { background: string; border: string };
    highlight: { background: string; border: string };
  };
  font: {
    color: string;
    size: number;
    face: string;
    multi: boolean | 'html' | 'md';
  };
  borderWidth: number;
  shadow: {
    enabled: boolean;
    color: string;
    size: number;
    x: number;
    y: number;
  };
  margin: { top: number; bottom: number; left: number; right: number };
}

interface NodeEvaluationOptions {
  /** Target opacity (e.g., 1.0 for active paths, 0.3 for low-alpha hidden paths) */
  opacity?: number;
  /** Pass the character name if you want to display it on c-beats/death beats */
  characterName?: string;
}

/**
 * Transforms a story beat into a beautifully styled Vis.js node configuration.
 */
export function generateVisNode(
  id: string,
  beat: StoryEntity,
  options: NodeEvaluationOptions = {}
): VisNode | null {
  // If a character object slips into the pipeline, ignore it for the timeline graph
  if (beat.type === 'character') return null;

  const opacity = options.opacity ?? 1.0;
  const charName = options.characterName ?? 'Unknown';

  // Base styling defaults applied to all nodes for visual consistency
  const baseNode: Omit<VisNode, 'label' | 'shape' | 'color'> = {
    id,
    opacity,
    borderWidth: 2,
    margin: { top: 12, bottom: 12, left: 16, right: 16 },
    font: {
      color: opacity < 1.0 ? '#888888' : '#222222',
      size: 14,
      face: 'system-ui, -apple-system, sans-serif',
      multi: 'html', // Allows us to use <b> tags in labels
    },
    shadow: {
      enabled: opacity === 1.0, // Drop shadows only for active timeline elements
      color: 'rgba(0,0,0,0.08)',
      size: 6,
      x: 0,
      y: 3,
    },
  };

  // Type-specific customization styling
  switch (beat.type) {
    case 's-beat':
      return {
        ...baseNode,
        shape: 'box',
        label: `<b>Story Beat</b>\n${truncateText(beat.content)}`,
        color: createColorPalette('#3b82f6', '#1d4ed8'), // Sleek modern blue
      };

    case 'c-beat':
      return {
        ...baseNode,
        shape: 'box',
        label: `<b>${charName}</b>\n${truncateText(beat.content)}`,
        color: createColorPalette('#ec4899', '#be185d'), // Vibrant character pink
      };

    case 'decision':
      return {
        ...baseNode,
        shape: 'diamond', // Vis diamond layout relies heavily on margin for padding
        label: `<b>Choice?</b>\n${truncateText(beat.question, 40)}`,
        color: createColorPalette('#eab308', '#a16207'), // Amber warning color
        margin: { top: 20, bottom: 20, left: 20, right: 20 },
      };

    case 'death':
      return {
        ...baseNode,
        shape: 'box',
        label: `💀 <b>${charName} Dies</b>`,
        font: {
          ...baseNode.font,
          color: opacity < 1.0 ? '#666666' : '#ffffff', // High-contrast white on black text
        },
        color: createColorPalette('#1f2937', '#111827'), // Grim dark-mode slate
      };
  }
}

/**
 * Helper to generate cohesive background, border, hover, and active states
 */
function createColorPalette(bg: string, border: string) {
  return {
    background: bg,
    border: border,
    hover: {
      background: adjustBrightness(bg, 10),
      border: border,
    },
    highlight: {
      background: adjustBrightness(bg, -10),
      border: border,
    },
  };
}

/** Keeps nodes from becoming massive text walls if your script is wordy */
function truncateText(text: string, maxLength: number = 60): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/** Quick fallback utility to tint colors slightly for UI states */
function adjustBrightness(hex: string, percent: number): string {
  const R = parseInt(hex.substring(1, 3), 16);
  const G = parseInt(hex.substring(3, 5), 16);
  const B = parseInt(hex.substring(5, 7), 16);
  
  const num = percent > 0 ? 255 : 0;
  const p = Math.abs(percent) / 100;
  
  const r = Math.round(R + (num - R) * p);
  const g = Math.round(G + (num - G) * p);
  const b = Math.round(B + (num - B) * p);
  
  return `#${(1 << 24) + (r << 16) + (g << 8) + b}`.toString().slice(1);
}

interface TimelineGraphViewProps {
  timeline: StoryEntity[];
  characterEntities: StoryEntity[];
  characterFilter?: string[]; // Optional filter to only include certain characters in the timeline (by ID)
  beatTypeFilter?: string[]; // Optional filter to only include certain beat types (e.g., ['c-beat', 's-beat'])
}

export const TimelineGraphView: React.FC<TimelineGraphViewProps> = ({ timeline, characterEntities, characterFilter, beatTypeFilter }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const networkRef = useRef<Network | null>(null);
    useEffect(() => {
        console.log("Timeline beats:", timeline);
        console.log("Characters:", characterEntities);

        if(!timeline || !characterEntities) return;

        const beats = timeline.filter(e => e.type === 'c-beat' || e.type === 's-beat' || e.type === 'death' || e.type === 'decision').sort((a, b) => a.time - b.time);
        const characters = characterEntities.filter(e => e.type === 'character');

        console.log("Timeline beats:", beats);
        console.log("Characters:", characters);

        const timelineBeats: Record<number, number[]> = {};
        const timelineBranches: {from: number, to: number, options: string[]}[] = [];

        let branchIdCounter = 0;
        const conditionsToEvaluate: {condition: string[], startIndex: number, id: number}[] = [];
        conditionsToEvaluate.push({condition: characters.map(c => c.id), startIndex: 0, id: branchIdCounter++}); // Start with all characters alive and no conditions

        // Calculate linear timelines based on conditions, branching at decision beats and updating conditions at death beats
        while(conditionsToEvaluate.length > 0) {
            const {condition, startIndex, id} = conditionsToEvaluate.pop()!;
            let updatedCondition = condition.slice();
            const timeline: number[] = [];

            for(let i = startIndex; i < beats.length; i++) {
                const beat = beats[i];
                let breakLoop = false;
                console.log(`Evaluating beat at time ${beat.time} for branch ${id} with conditions:`, updatedCondition);
                if(beat.conditions && !beat.conditions?.every(c => updatedCondition.includes(c)))
                    continue;

                if(beat.type === 's-beat' && !beat.characters.every(c => updatedCondition.includes(c)))
                    continue;
                
                if(beat.type === 'c-beat' && !updatedCondition.includes(beat.character))
                    continue;

                if(beat.type === 'decision') {
                    beat.options.forEach((option, index) => {
                        const cleanOption = option.startsWith('!') || option.startsWith('+') ? option.slice(1) : option;
                        const newCondition = updatedCondition.slice().filter(c => c !== cleanOption && c !== `!${cleanOption}` && c !== `+${cleanOption}`);
                        newCondition.push(option);
                        timelineBranches.push({from: id, to: branchIdCounter, options: [option]});
                        conditionsToEvaluate.push({condition: newCondition, startIndex: i + 1, id: branchIdCounter++});
                    });
                    breakLoop = true; // Stop processing this timeline after a decision beat, as it branches into multiple paths
                } else if(beat.type === 'death'){
                    updatedCondition = updatedCondition.filter(c => c !== beat.character && c !== `!${beat.character}` && c !== `+${beat.character}`);
                    updatedCondition.push(`!${beat.character}`);
                }

                if(beatTypeFilter && !beatTypeFilter.includes(beat.type)) {
                    continue;
                }

                if(characterFilter) {
                    if(beat.type === 's-beat' && !beat.characters.some(c => characterFilter.includes(c))) {
                        continue;
                    }
                    if(beat.type === 'c-beat' && !characterFilter.includes(beat.character)) {
                        continue;
                    }
                    if(beat.type === 'death' && !characterFilter.includes(beat.character)) {
                        continue;
                    }
                    if(beat.type === 'decision' && !beat.options.some(o => characterFilter.includes(o.replace('!', '').replace('+', '')))) {
                        continue;
                    }
                }

                console.log(`--> Beat at time ${beat.time} matches conditions for branch ${id}, adding to timeline.`);
                timeline.push(i);

                if(breakLoop) break;
            }
            timelineBeats[id] = timeline;
        }

        console.log("Initial timeline beats by branch:", timelineBeats);

        // Merge timelines that have the same structure of beats
        for(let i = Object.keys(timelineBeats).length-1; i >= 0; i--) {
            for(let j = Object.keys(timelineBeats).length-1; j > i; j--) {
                const branchesToJ = timelineBranches.filter(b => b.to === j).length;
                if(branchesToJ <= 0) continue; // Only consider merging timelines that have branches leading to them, to avoid merging unrelated paths
                const timelineI = timelineBeats[i];
                const timelineJ = timelineBeats[j];
                const branchesFromI = timelineBranches.filter(b => b.from === i);
                const branchesFromJ = timelineBranches.filter(b => b.from === j);
                if(timelineI.length === timelineJ.length && timelineI.every((value, index) => value === timelineJ[index]) && branchesFromI.length === branchesFromJ.length && branchesFromI.every((b, index) => b.to === branchesFromJ[index].to)) {
                    // Merge branch j into i
                    for(let k = 0; k < timelineBranches.length; k++) {
                        if(timelineBranches[k].from === j) {
                            timelineBranches[k].from = i;
                        }
                        if(timelineBranches[k].to === j) {
                            timelineBranches[k].to = i;
                        }
                    }
                }
            }
        }

        const mergedTimelineBranches: {from: number, to: number, options: string[]}[] = [];
        for(let i = 0; i < timelineBranches.length; i++) {
            if(!mergedTimelineBranches.some(b => b.from === timelineBranches[i].from && b.to === timelineBranches[i].to)) {
                mergedTimelineBranches.push(timelineBranches[i]);
            } else {
                const existingBranch = mergedTimelineBranches.find(b => b.from === timelineBranches[i].from && b.to === timelineBranches[i].to);
                if(existingBranch) {
                    existingBranch.options = Array.from(new Set([...existingBranch.options, ...timelineBranches[i].options]));
                }
            }
        }

        console.log("Merged timeline beats by branch:", timelineBeats);
        console.log("Merged timeline branches:", mergedTimelineBranches);

        // Construct Vis.js nodes and edges based on the merged timelines and branches
        const nodes: VisNode[] = [];
        const edges: Edge[] = [];

        Object.keys(timelineBeats).forEach(key => {
                const numKey = parseInt(key);
                const branchesToKey = mergedTimelineBranches.filter(b => b.to === numKey).length;
                if(branchesToKey <= 0 && numKey !== 0) return; // Only create nodes for timelines that have branches leading to them, to avoid creating nodes for unrelated paths
                for(let i = 0; i < timelineBeats[numKey].length; i++) {
                    const beatIndex = timelineBeats[numKey][i];
                    const beat = beats[beatIndex];
                    if(beat.type === 'death' || beat.type === 'c-beat') {
                        const char = characters.find(c => c.id === beat.character);
                        if(char) {
                            nodes.push(generateVisNode(`node-${numKey}-${beatIndex}`, beat, {characterName: char.name})!);
                        }
                    } else {
                      nodes.push(generateVisNode(`node-${numKey}-${beatIndex}`, beat)!);
                    }
                    
                    if(i > 0) {
                        edges.push(
                            {
                                id: `edge-${numKey}-${beatIndex}`,
                                from: `node-${numKey}-${timelineBeats[numKey][i-1]}`,
                                to: `node-${numKey}-${beatIndex}`,
                                label: "",
                                width: 1.2,
                                dashes: false,
                                arrows: { to: { enabled: true, scaleFactor: 0.8 } },
                                color: { color: '#475569', highlight: '#475569' },
                                font: {
                                size: 11,
                                color: '#475569',
                                face: 'ui-sans-serif, system-ui, sans-serif',
                                background: '#f8fafc', // Matches container background to clean up cross lines
                                strokeWidth: 0,
                                },
                            }
                        );
                    }
                }
        })

        mergedTimelineBranches.forEach(branch => {
            edges.push({
                            id: `edge-b-${branch.from}-${branch.to}`,
                            from: `node-${branch.from}-${timelineBeats[branch.from][timelineBeats[branch.from].length-1]}`,
                                to: `node-${branch.to}-${timelineBeats[branch.to][0]}`,
                                label: branch.options.join(', ') || "",
                                width: 1.2,
                                dashes: false,
                                arrows: { to: { enabled: true, scaleFactor: 0.8 } },
                                color: { color: '#475569', highlight: '#475569' },
                                font: {
                                size: 11,
                                color: '#475569',
                                face: 'ui-sans-serif, system-ui, sans-serif',
                                background: '#f8fafc', // Matches container background to clean up cross lines
                                strokeWidth: 0,
                                },
                            }
                        );
        });

        console.log("Generated nodes:", nodes);
        console.log("Generated edges:", edges);
        console.log("Timeline beats by branch:", timelineBeats);
        console.log("Merged timeline branches:", mergedTimelineBranches);

        // Make graph
        const options = {
              layout: {
                hierarchical: {
                  enabled: true,
                  direction: 'LR',        // 'LR' = Left to Right timeline flow. Use 'UD' for a classic top-down tree.
                  sortMethod: 'directed', // 'directed' ensures edges dictate the sequence/levels
                  nodeSpacing: 150,       // Distance between nodes on the same level (vertical spacing here)
                  levelSeparation: 250,   // Distance between timeline steps (horizontal spacing here)
                  parentCentralization: true,
                  edgeMinimization: true, // Tries to keep branching lines clean and uncrossed
                },
              },
              physics: {
                enabled: false, // CRITICAL: Physics must be off, otherwise it fights the timeline layout
              },
              edges: {
                smooth: {
                  type: 'cubicBezier', // Smooth curves look much better on timeline grids than straight lines
                  forceDirection: 'horizontal', // Forces curves to align along the horizontal timeline path
                  roundness: 0.5,
                },
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
    }, [timeline, characterEntities, characterFilter, beatTypeFilter]);

    return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        position: 'fixed', // Fixed positioning ensures it locks to the viewport edges
        top: 0,
        left: 0,
        border: '1px solid #cbd5e1',
        backgroundColor: '#f8fafc', 
        zIndex: 1,
      }}
    />
);
};