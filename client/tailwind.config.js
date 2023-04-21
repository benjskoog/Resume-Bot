// tailwind.config.js
module.exports = {
  mode: 'jit', // This enables Just-In-Time mode for faster builds
  content: ['./src/**/*.{js,jsx,ts,tsx}', './src/**/*'], // This line is important to remove unused CSS in production
  theme: {
    extend: {},
  },
  plugins: [],
};
