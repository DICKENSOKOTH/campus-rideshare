#  RideU — Ride Sharing App

RideU is a ride sharing app we built as a group project. 
It connects drivers and riders, lets them book trips, 
and has a built in AI assistant to help users.

---

## Our Team

| Member | Role |
|--------|------|
| Member 1 (Me) | Backend Core & Project Setup |
| Member 2 | Frontend UI |
| Member 3 | Frontend Logic |
| Member 4 | Backend API & Services |
| Member 5 | AI & Realtime Features |

---

##  Tech We Used

- Backend: Django 5 + Django REST Framework
- Database: PostgreSQL
- Login System: JWT Tokens
- Live Updates: Django Channels + Redis
- AI Chat: OpenAI API
- Frontend: HTML, CSS and JavaScript

---

##  How To Run The Project

1. Clone the repo
2. Install everything: pip install -r requirements.txt
3. Copy .env.example to .env and fill in your details
4. Set up the database: python run.py migrate
5. Start the server: python run.py runserver

---

## Project Structure

RideU/
├── run.py              # Starts the server
├── requirements.txt    # All packages we need
├── .env.example        # Template for environment variables
├── backend/
│   ├── app.py          # Sets up the app
│   ├── config.py       # All settings live here
│   ├── database/
│   │   ├── database.py # Handles database queries
│   │   └── schema.sql  # Creates all our tables
│   └── utils/
│       ├── validators.py # Checks user input
│       └── response.py   # Formats API responses
├── frontend/           # All the pages (Member 2 & 3)
├── ai/                 # AI assistant (Member 5)
└── realtime/           # Live location updates (Member 5)

---

## 🔌 API Endpoints

| Method | URL | What it does |
|--------|-----|--------------|
| POST | /api/auth/register/ | Create new account |
| POST | /api/auth/login/ | Login and get token |
| GET | /api/rides/ | See available rides |
| POST | /api/rides/ | Create a ride |
| POST | /api/rides/{id}/book/ | Book a ride |
| GET | /api/profile/ | View your profile |
| POST | /api/ai/chat/ | Chat with AI assistant |
| GET | /api/health/ | Check if server is running |

---

##  Notes

- Make sure you never push your .env file to GitHub
- Each team member works on their own branch
- All PRs go through Member 1 for review before merging