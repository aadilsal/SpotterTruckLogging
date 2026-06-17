# SpotterTruckLogger ELD Trip Planner & HOS Management System

SpotterTruckLogger is a full-stack web application designed to help dispatchers and truck drivers seamlessly plan trips while strictly adhering to the FMCSA Hours of Service (HOS) regulations. 

The application calculates the most optimal truck-legal route between destinations, intelligently breaks down the trip to ensure the driver does not violate 11-hour driving, 14-hour duty, 30-minute break, or 70-hour/8-day cycle rules, and automatically generates beautiful, industry-standard Driver Daily Log SVG sheets for compliance.

## Key Features
- **FMCSA Compliance Engine:** Automatically schedules 30-minute breaks, 10-hour sleeper berth resets, and 34-hour cycle restarts.
- **Dynamic Routing:** Integrates OpenRouteService API for routing logistics.
- **Log Sheet Generation:** Generates highly accurate 24-hour SVG driver log grids matching industry standards.
- **Premium User Interface:** A sleek, modern, glassmorphism UI built with React 19 and Tailwind CSS v4.
- **Interactive Mapping:** Powered by `react-leaflet` to visualize the planned route and stops.

## Architecture & Technology Stack
- **Database:** PostgreSQL (running via Docker Compose)
- **Backend:** Django 5 & Django REST Framework (DRF)
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4

## Getting Started

### Prerequisites
- Node.js & npm
- Python 3.10+
- Docker Desktop

### Quick Start
1. **Start the Database:**
   ```bash
   docker-compose up -d
   ```
2. **Start the Backend:**
   Please refer to the `backend/README.md` for complete setup instructions.
3. **Start the Frontend:**
   Please refer to the `frontend/README.md` for complete setup instructions.

Once both servers are running, visit `http://localhost:5173/` in your browser.

## Project Structure
- `/backend/` - Django application and HOS routing engine
- `/frontend/` - React application and beautiful UI components
- `docker-compose.yml` - PostgreSQL database setup
