# Movie Theater Management System

## Overview

Movie Theater Management System is a web-based application designed to help Rio Cinema manage its cinema services in Oulu and Tampere, Finland.

The system aims to provide customers with an easy and flexible way to browse movies, view screening times, select seats, reserve seats, and purchase tickets. It also provides administrative features for managing cinema operations.

## Features

### Customer Features
- Browse movies and view movie details.
- Search for movies and screening times.
- Watch movie trailers.
- View cinema information and seating maps.
- Select available seats and reserve tickets.
- Purchase tickets without creating an account.
- Cancel reservations before payment.
- Request private screenings or group bookings.
- Receive warnings about age-restricted movies.

### Administration Features
- Manage movies and screening schedules.
- Manage cinemas, rooms, and seating maps.
- Manage bookings and ticket reservations.
- Manage employee and administrative permissions.

### Business Rules
- Child discounts are available for customers aged 12 or younger.
- A 50% discount applies to every tenth ticket, subject to the final business rules.
- Movies restricted to adults require an age-warning message.
- Customers requesting more than six seats are directed to a contact request.
- The seating map must clearly display accessible seats, the screen, and entrances.

## Technology Stack

**Frontend**
- React
- JavaScript
- Vite
- CSS

**Backend**
- Node.js
- Express.js
- JavaScript

**Database**
- PostgreSQL
- Neon

**Deployment**
- Azure Static Web Apps — Frontend
- Azure App Service — Backend

**Version Control**
- Git and GitHub

## Project Structure

```text
movie-theater-project/
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│   └── .gitignore
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── app.js
│   │   └── server.js
│   ├── db/
│   └── package.json
│   └── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

Install the following tools before starting development:

- [Node.js](https://nodejs.org/)
- [Git](https://git-scm.com/)
- A Neon PostgreSQL account
- A code editor, such as [Visual Studio Code](https://code.visualstudio.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/trandiem-cmd/movie-theater-management-system
cd movie-theater-project
```

### 2. Set Up the Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite will display the local development URL in the terminal.

### 3. Set Up the Backend

Open a separate terminal:

```bash
cd backend
npm install
npm run start
```

The backend requires its environment variables to be configured before connecting to the database.

### 4. Configure Environment Variables

Create a `.env` file inside the `backend/` directory.

Example:

```dotenv
PORT=3000
DATABASE_URL="your-neon-postgresql-connection-string"
```

Use the actual connection string provided by Neon. Never commit credentials or secrets to Git.

If the frontend requires a backend URL, configure it in `frontend/.env`:

```dotenv
VITE_API_BASE_URL=http://localhost:3000
```

Only expose non-sensitive configuration through variables prefixed with `VITE_`.

## Database

The application uses PostgreSQL hosted by Neon.

Planned data entities include:

- Users
- Cinemas
- Rooms
- Seats
- Movies
- Showtimes
- Bookings
- Tickets
- Payments
- Contact Requests

Database migrations should be used to keep the development and production schemas consistent.

## Deployment

The planned deployment architecture consists of three independent services:

1. **Frontend:** Azure Static Web Apps
2. **Backend:** Azure App Service
3. **Database:** Neon PostgreSQL

The frontend communicates with the backend through a REST API. The backend connects to Neon using a secure connection string stored in the hosting environment's configuration.

Production credentials must be configured securely and must not be stored in the repository.

## Development Roadmap

- [ ] Define functional and non-functional requirements.
- [ ] Design use cases and user flows.
- [ ] Design the database schema.
- [ ] Implement the Express backend and REST API.
- [ ] Develop the React frontend.
- [ ] Implement seat selection and booking.
- [ ] Implement ticket pricing and discount rules.
- [ ] Integrate payment processing.
- [ ] Implement authentication and role-based access control.
- [ ] Test the application.
- [ ] Deploy the frontend and backend to Azure.

## Design Guidelines

The website will use gold, red, and black as its primary colors.

The user interface should prioritize usability, clear navigation, accessible seating information, and a straightforward ticket-booking experience.

## Project Status

**Status:** In Development

This project is being developed incrementally, starting with project setup, requirements analysis, and database design.

## License

