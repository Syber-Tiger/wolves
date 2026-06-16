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
    time: z.int(),
    conditions: z.array(z.string()).optional(),
});

export const StoryBeatSchema = z.object({
    type: z.literal("s-beat"),
    content: z.string(),
    time: z.int(),
    characters: z.array(z.string()),
    conditions: z.array(z.string()).optional(),
});

export const DeathBeatSchema = z.object({
    type: z.literal("death"),
    character: z.string(),
    time: z.int(),
    conditions: z.array(z.string()).optional(),
});

export const DecisionBeatSchema = z.object({
    type: z.literal("decision"),
    question: z.string(),
    options: z.array(z.string()),
    time: z.int(),
    conditions: z.array(z.string()).optional(),
});

export const AnyStoryEntitySchema = z.discriminatedUnion( "type", [
    CharacterSchema,
    CharacterBeatSchema,
    StoryBeatSchema,
    DeathBeatSchema,
    DecisionBeatSchema,
]);

export const StoryFileSchema = z.array(AnyStoryEntitySchema);

export type StoryEntity = z.infer<typeof AnyStoryEntitySchema>;
export type Character = z.infer<typeof CharacterSchema>;