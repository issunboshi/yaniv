import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Yaniv Score Tracker',
				short_name: 'Yaniv',
				description: 'Track scores for the card game Yaniv',
				theme_color: '#1a3a2a',
				background_color: '#0f1f17',
				display: 'standalone',
				icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}']
			}
		})
	],
	test: {
		include: ['src/**/*.test.ts']
	}
});
