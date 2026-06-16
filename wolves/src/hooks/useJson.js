import { useState, useEffect } from "react";
import { is } from "zod/v4/locales";

export function useJson(filename) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if(!filename) return;

        let isMounted = true;
        setLoading(true);
        setError(null);

        const fetchJson = async () => {
            try {
                console.log(`Fetching JSON from: ${import.meta.env.BASE_URL}story/${filename}`);
                const response = await fetch(`https://github.com/Syber-Tiger${import.meta.env.BASE_URL}story/${filename}`);
                if (!response.ok) throw new Error(`Failed to fetch ${filename}: ${response.statusText}`);

                const rawJson = await response.json();

                if (isMounted) {
                    setData(JSON.stringify(rawJson));
                    setLoading(false);
                }
            } catch (err) {
                if(isMounted) {
                    setError(err instanceof Error ? err : new Error(String(err)));
                    setLoading(false);
                }
            }
        };

        fetchJson();

        return () => { isMounted = false; };
    }, [filename]);

    return { data, loading, error };
}