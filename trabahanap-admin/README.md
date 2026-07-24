# Trabahanap Admin

This is a monorepo containing both the frontend and backend code for the Trabahanap Admin application.

## Project Structure

```
trabahanap-admin/
├── packages/
│   ├── frontend/     # React + Vite frontend application
│   └── backend/      # Backend application (to be implemented)
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

To run the frontend development server:

```bash
npm run dev:frontend
```

To build the frontend:

```bash
npm run build:frontend
```

## Backend Setup (`packages/backend/admin_api`)

The backend is a FastAPI application.

### Prerequisites (Backend)

- Python >= 3.8
- Pip (Python package installer)
- MongoDB instance (running locally or accessible via URI)

### Installation & Setup (Backend)

1.  **Navigate to the backend directory:**

    ```bash
    cd packages/backend/admin_api
    ```

2.  **Create a virtual environment (recommended):**

    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```

3.  **Install Python dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

    _(Note: If `requirements.txt` doesn't exist yet, you'll need to create it based on your project's dependencies, e.g., `fastapi`, `uvicorn`, `pymongo`, `pydantic`, `python-jose`, `passlib`, `fastapi-mail`, `python-dotenv`)_

4.  **Configure Environment Variables:**
    Create a `.env` file in the `packages/backend/admin_api` directory. This file will store your configuration settings. **Do not commit this file to version control.**

    Copy the following template into your `.env` file and replace the placeholder values with your actual credentials and settings:

    ```env
    # MongoDB Configuration
    MONGO_URI="mongodb://localhost:27017,localhost:27018,localhost:27019/trabahanap-db?replicaSet=mongoReplica"
    MONGO_DB_NAME="trabahanap-db"

    # JWT Authentication
    SECRET_KEY="your_strong_secret_key_here_please_change_this"
    ALGORITHM="HS256"

    # Email Configuration for fastapi-mail (using Gmail as an example)
    MAIL_USERNAME="your_gmail_username@gmail.com"
    MAIL_PASSWORD="your_gmail_app_password"  # Use an App Password if 2-Step Verification is enabled
    MAIL_FROM="your_gmail_username@gmail.com"
    MAIL_PORT=587
    MAIL_SERVER="smtp.gmail.com"
    MAIL_STARTTLS=True
    MAIL_SSL_TLS=False
    MAIL_USE_CREDENTIALS=True
    MAIL_VALIDATE_CERTS=True
    ```

    **Important Notes for `.env`:**

    - `MONGO_URI`: Your MongoDB connection string.
    - `MONGO_DB_NAME`: The name of your MongoDB database.
    - `SECRET_KEY`: A strong, unique secret key for JWT token generation. **Change the default value.**
    - `ALGORITHM`: The algorithm used for JWT, typically HS256.
    - `MAIL_USERNAME`: Your email address for sending notifications.
    - `MAIL_PASSWORD`: Your email account password or an app-specific password (recommended for services like Gmail if 2-Step Verification is enabled).
    - `MAIL_FROM`: The email address that will appear as the sender.
    - `MAIL_PORT`: SMTP port (e.g., 587 for TLS, 465 for SSL).
    - `MAIL_SERVER`: SMTP server address (e.g., `smtp.gmail.com`).
    - `MAIL_STARTTLS`, `MAIL_SSL_TLS`, `MAIL_USE_CREDENTIALS`, `MAIL_VALIDATE_CERTS`: Settings for your email server connection.

### Running the Backend Development Server

Once the setup is complete, you can run the backend server (typically using Uvicorn):

```bash
npm run dev:backend
```

_(This assumes you have a script `dev:backend` in your root `package.json` like `"dev:backend": "cd packages/backend/admin_api && uvicorn main:app --reload"`. Adjust as necessary or run Uvicorn directly from the `packages/backend/admin_api` directory: `uvicorn main:app --reload`)_

## Available Scripts

### Root Workspace

- `npm run dev:frontend` - Start the frontend development server
- `npm run build:frontend` - Build the frontend application
- `npm run test:frontend` - Run frontend tests
- `fastapi dev main.py` - Start the backend development server

### Frontend Package

- `npm run dev` - Start the development server
- `npm run build` - Build the application
- `npm run lint` - Run ESLint
- `npm run preview` - Preview the production build

## License

[Your License Here]
