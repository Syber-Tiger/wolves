import { useEffect, useMemo, useState } from "react";
import { Character, StoryEntity, StoryFileSchema } from "../schemas/jsonSchemas";
import { ca } from "zod/locales";

export function useStoryDatabase() {
    const [database, setDatabase] = useState<StoryEntity[]>([]);
    const [loading, setLoading] = useState(true);

    const baseUrl = "https://raw.githubusercontent.com/Syber-Tiger/wolves/refs/heads/main/story/";

    useEffect(() => {
        let isMounted = true;

        async function loadEverything() {
            try {
                const indexRes = await fetch(`${baseUrl}index.json`);
                const index = await indexRes.json();

                const filePromises = index.map(async (entry: any) => {
                    const fileRes = await fetch(`${baseUrl}${entry}`);
                    return fileRes.json();
                });

                const rawFiles = await Promise.all(filePromises);

                const combinedData = rawFiles.flat();
                const validData = StoryFileSchema.parse(combinedData);

                if (isMounted) {
                    setDatabase(validData);
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error loading story database:", error);
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadEverything();
        return () => {
            isMounted = false;
        };
    }, []);

    const allCharacters = useMemo(() => {
        return database.filter((item):item is Character => item.type === "character");
    }, [database]);
    
    const fullTimeline = useMemo(() => {
        const beats = database.filter((item) => item.type === "c-beat" || item.type === "s-beat" || item.type === "death" || item.type === "decision");
        return beats.sort((a: any, b: any) => a.time - b.time);
    }, [database]);

    const getCharacterBeats = (characterId: string) => {
        return fullTimeline.filter(beat => {
            if (beat.type === "c-beat") {
                return beat.character === characterId;
            } else if (beat.type === "s-beat") {
                return beat.characters.includes(characterId);
            }
            return false;
        });
    };

    return {
        database,
        loading,
        allCharacters,
        fullTimeline,
        getCharacterBeats,
    };
}