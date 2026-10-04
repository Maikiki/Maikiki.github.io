import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    category: z.string().default('未分类'),
    draft: z.boolean().default(false),
    toc: z.boolean().default(true),
    cover: z.string().optional(),
  }),
});

export const collections = { blog };
