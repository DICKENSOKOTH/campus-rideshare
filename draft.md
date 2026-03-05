```file structure
RideU/
├── README.md
├── .env.example
├── .gitignore
├── requirements.txt
├── run.py
│
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── create-ride.html
│   ├── find-ride.html
│   ├── ride-details.html
│   ├── profile.html
│   ├── ai-assistant.html
│   ├── admin.html
│   │
│   ├── css/
│   │   ├── base.css
│   │   ├── components.css
│   │   └── pages.css
│   │
│   ├── js/
│   │   ├── config.js
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   ├── createRide.js
│   │   ├── findRide.js
│   │   ├── rideDetails.js
│   │   ├── profile.js
│   │   ├── map.js
│   │   ├── websocket.js
│   │   ├── aiAssistant.js
│   │   └── admin.js
│   │
│   └── assets/
│       ├── logo.svg
│       └── icons.svg
│
├── backend/
│   ├── app.py
│   ├── config.py
│   │
│   ├── routes/
│   │   ├── auth_routes.py
│   │   ├── ride_routes.py
│   │   ├── user_routes.py
│   │   ├── ai_routes.py
│   │   └── admin_routes.py
│   │
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── ride_service.py
│   │   ├── matching_service.py
│   │   ├── ai_service.py
│   │   └── admin_service.py
│   │
│   ├── models/
│   │   ├── user.py
│   │   ├── ride.py
│   │   ├── booking.py
│   │   └── rating.py
│   │
│   ├── database/
│   │   ├── database.py
│   │   └── schema.sql
│   │
│   └── utils/
│       ├── validators.py
│       └── response.py
│
├── ai/
│   ├── assistant.py
│   ├── prompts.py
│   └── context.py
│
└── realtime/
    ├── websocket_server.py
    └── location_broadcast.py
```