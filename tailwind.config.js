/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,html}"
  ],
  theme: {
    extend: {
      colors: {
        material: {
          indigo: '#3F51B5',
          'indigo-light': '#5C6BC0',
          'indigo-dark': '#303F9F',
          pink: '#E91E63',
          'pink-light': '#F06292',
          'pink-dark': '#C2185B',
          blue: '#2196F3',
          'blue-light': '#64B5F6',
          'blue-dark': '#1976D2',
          green: '#4CAF50',
          'green-light': '#81C784',
          'green-dark': '#388E3C',
          amber: '#FFC107',
          'amber-light': '#FFD54F',
          'amber-dark': '#F57C00',
          grey: '#9E9E9E',
          'grey-light': '#BDBDBD',
          'grey-dark': '#616161',
        },
        primary: {
          50: '#E8EAF6',
          100: '#C5CAE9',
          200: '#9FA8DA',
          300: '#7986CB',
          400: '#5C6BC0',
          500: '#3F51B5',
          600: '#3949AB',
          700: '#303F9F',
          800: '#283593',
          900: '#1A237E',
        },
      },
    },
  },
  plugins: [],
}

