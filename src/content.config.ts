import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

const products = defineCollection({
  loader: file('src/content/products.json'),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string(),
    position: z.string().default('center'),
    href: z.string().default('#kontaktai'),
  }),
});
export const collections = { products };
