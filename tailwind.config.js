/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'space-black': '#050505', // Deeper, flatter black
                'deep-space': '#0a0a0a',   // Slightly lighter for cards
                'star-white': '#f5f5f7',   // Apple-style off-white
                'nebula-purple': '#00dc82', // Kept variable name (legacy) but made it Green
                'tech-blue': '#00dc82',    // New primary accent: Neon Green (Vue/Matrix style)
                'stardust': '#a1a1aa',     // Zinc-400 for text
                'glass-border': 'rgba(255, 255, 255, 0.08)',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                cinzel: ['Inter', 'sans-serif'], // Replacing Cinzel with Inter for headers too (cleaner look), or we can use a new variable
                display: ['Inter', 'sans-serif'], // Corporate display font
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
            }
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
