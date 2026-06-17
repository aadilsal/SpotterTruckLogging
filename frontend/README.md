# Nexus Frontend

The frontend of the Nexus ELD Trip Planner application is a beautiful, performant dashboard built using React 19, TypeScript, Vite, and Tailwind CSS v4.

## Key Features
- **Glassmorphism UI:** Stunning aesthetics with translucent panels, blur effects, and vibrant gradients.
- **Interactive Maps:** Route geometries and points of interest are beautifully rendered using `react-leaflet`.
- **Log Viewer:** View generated driver daily log SVGs via an intuitive tab-based browser.
- **Responsive Layout:** Dynamic panels that adjust gracefully.

## Setup Instructions

1. **Ensure Node.js is Installed**
   You'll need a recent version of Node.js.

2. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173/`. Ensure the Django backend API is also running on `http://localhost:8000/`.
