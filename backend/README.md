# Nexus Backend 

The backend of the Nexus ELD Trip Planner application is built with Django 5 and Django REST Framework (DRF).

## Core Modules
- `trips`: Handles the REST API endpoints and coordinates the routing and HOS engines.
- `hos`: The Hours of Service simulator engine. Ensures FMCSA compliance (11h drive limit, 14h duty window, 70h cycle, 30m break).
- `logs`: Generates SVG image representations of the 24-hour driver daily log sheets based on duty events.
- `routing`: Interfaces with the OpenRouteService API to geocode addresses and calculate paths.

## Setup Instructions

1. **Ensure Database is Running:**
   Ensure the PostgreSQL database from the root `docker-compose.yml` is active.
   ```bash
   docker-compose up -d
   ```

2. **Setup Python Environment:**
   ```bash
   cd backend
   python -m venv venv
   # Activate on Windows:
   .\venv\Scripts\Activate
   # Activate on Mac/Linux:
   source venv/bin/activate
   ```

3. **Install Dependencies:**
   ```bash
   pip install django djangorestframework psycopg2-binary django-cors-headers requests svgwrite python-dateutil
   ```

4. **Run Migrations:**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

5. **Start Development Server:**
   ```bash
   python manage.py runserver 8000
   ```

The API will be available at `http://localhost:8000/api/`.
