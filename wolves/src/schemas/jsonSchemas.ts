import { z } from 'zod';

export const RelationshipSchema = z.object({
    to: z.string(),
    type: z.enum(['parent', 'child', 'employer', 'employee', 'sibling', 'fiance', 'spouse']),
});

export const CharacterSchema = z.object({
    type: z.literal("character"),
    id: z.string(),
    name: z.string(),
    relationships: z.array(RelationshipSchema).optional(),
});

export const CharacterBeatSchema = z.object({
    type: z.literal("c-beat"),
    character: z.string(),
    content: z.string(),
    time: z.string(),
});

export const StoryBeatSchema = z.object({
    type: z.literal("s-beat"),
    content: z.string(),
    time: z.string(),
    characters: z.array(z.string()),
});

export const AnyStoryEntitySchema = z.discriminatedUnion( "type", [
    CharacterSchema,
    CharacterBeatSchema,
    StoryBeatSchema,
]);

export const StoryFileSchema = z.array(AnyStoryEntitySchema);

export type StoryEntity = z.infer<typeof AnyStoryEntitySchema>;
export type Character = z.infer<typeof CharacterSchema>;