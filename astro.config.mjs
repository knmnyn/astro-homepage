/**
 * Astro configuration for the Min-Yen Kan homepage.
 *
 * This repo uses a fixed deployment subpath on the NUS homepage host, so we
 * keep the config intentionally small and set the deploy URL explicitly. That
 * keeps exported asset URLs working when the static site is copied into
 * `~/public_html/astro-homepage/`.
 */
// @ts-check
import { defineConfig } from 'astro/config';

const basePath = process.env.ASTRO_BASE_PATH || "/";

// https://astro.build/config
export default defineConfig({
  site: 'https://www.comp.nus.edu.sg/~kanmy/astro-homepage/',
  base: basePath,
});
