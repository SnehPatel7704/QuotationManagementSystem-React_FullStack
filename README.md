# Quotation Management System

A full-stack quotation management system with role-based access control, built with Spring Boot (backend) and React with Tailwind CSS (frontend).

## 🚀 Quick Start

**👉 New to this project? Start here: [GET_STARTED.md](GET_STARTED.md)**

**Step 1: Run the setup script (first time only)**

**macOS/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

**Windows:**
```cmd
setup.bat
```

**Step 2: Start the application**

**macOS/Linux:**
```bash
./start-all.sh
```

**Windows:**
```cmd
start-all.bat
```

Then open `http://localhost:3000` and login with:

**📋 See [CREDENTIALS.md](CREDENTIALS.md) for all login credentials**

- **Super Admin:** `spadmin` / `pass`
- **Admin:** `admin` / `password`  
- **User:** `user` / `password`

---

**📋 For detailed setup instructions, see [GET_STARTED.md](GET_STARTED.md) or [SETUP_CHECKLIST.md](SETUP_CHECKLIST.md)**

## Features

- **Role-Based Access Control**
  - Super Admin: Full system access
  - Admin: Create, edit, approve quotations
  - User: View-only access

- **Quotation Management**
  - Create and manage quotations
  - Upload and customize templates
  - Track quotation status
  - Email notifications

- **Theme Support**
  - Light/Dark mode toggle
  - Persistent theme preference

- **Responsive Design**
  - Mobile-friendly interface
  - Modern UI with Tailwind CSS

## Project Structure

```
quotation-system/
├── backend (Spring Boot)
│   └── src/main/
│       ├── java/com/quotation/
│       │   ├── config/          # Security, JWT configuration
│       │   ├── controller/      # REST API endpoints
│       │   ├── dto/             # Data Transfer Objects
│       │   ├── model/           # Entity models
│       │   ├── repository/      # JDBC repositories
│       │   └── service/         # Business logic
│       └── resources/
│           ├── application.properties
│           └── schema.sql       # Database schema
│
└── frontend (React + Tailwind CSS)
    └── src/
        ├── components/
        │   ├── common/          # Reusable components
        │   └── layout/          # Layout components
        ├── contexts/            # React contexts (Auth, Theme)
        ├── pages/               # Page components
        │   ├── auth/
        │   ├── dashboard/
        │   ├── quotations/
        │   ├── users/
        │   ├── companies/
        │   └── products/
        └── services/            # API service layer
```

## Technology Stack

### Backend
- Java 17
- Spring Boot 3.2.1
- Spring Security with JWT
- Spring JDBC
- MySQL Database
- JavaMail for email notifications
- Apache POI for Excel processing

### Frontend
- React 18
- React Router v6
- Tailwind CSS 3
- Axios for API calls
- React Icons
- Context API for state management

## Setup Instructions

### Prerequisites
- Java 17 or higher
- Node.js 16 or higher
- MySQL 8.0 or higher
- Maven 3.6 or higher

### Database Setup

**macOS/Linux:**
```bash
# Install MySQL (if not installed)
brew install mysql

# Start MySQL service
brew services start mysql

# Login to MySQL
mysql -u root -p

# Create database (optional, auto-created by app)
CREATE DATABASE quotation_db;
```

**Windows:**
```cmd
# Download and install MySQL from https://dev.mysql.com/downloads/installer/

# Start MySQL service
net start MySQL80

# Login to MySQL
mysql -u root -p

# Create database (optional, auto-created by app)
CREATE DATABASE quotation_db;
```

### Backend Setup

1. **Configure database** in `src/main/resources/application.properties` (recommended: use environment variables):
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/quotation_db?createDatabaseIfNotExist=true
spring.datasource.username=${DB_USERNAME:root}
spring.datasource.password=${DB_PASSWORD}
```

> Tip: The project expects a Maven wrapper (`mvnw` and `.mvn/wrapper/*`). If missing, either install Maven locally or commit the wrapper files so CI and contributors can use `./mvnw` reliably.

2. **Configure email settings** (for quotation notifications):
```properties
spring.mail.username=${MAIL_USERNAME}
spring.mail.password=${MAIL_PASSWORD}
```

### Configuration & Secrets 🔐
- Do **not** commit secrets. Use environment variables or a secrets manager. See `.env.example` for sample variables.
- JWT signing key: set `JWT_SECRET` to a base64-encoded value (32+ bytes) to persist token validity across restarts. Example generator:
```bash
# generate a 32-byte base64 secret
openssl rand -base64 32
```
- CI note: to run OWASP NVD-backed scans the workflow will look for `NVD_API_KEY` in repo secrets. If not set the scan may fall back to cached data.

3. **Run the backend application:**

**macOS/Linux:**
```bash
# Using Maven Wrapper (recommended)
./mvnw spring-boot:run

# Or using Maven directly
mvn spring-boot:run

# Or build and run JAR
./mvnw clean package
java -jar target/quotation-system-1.0.0.jar
```

**Windows:**
```cmd
# Using Maven Wrapper (recommended)
mvnw.cmd spring-boot:run

# Or using Maven directly
mvn spring-boot:run

# Or build and run JAR
mvnw.cmd clean package
java -jar target\quotation-system-1.0.0.jar
```

Backend will start on `http://localhost:8080`

### Frontend Setup

**macOS/Linux:**
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start

# Or using Yarn
yarn install
yarn start
```

**Windows:**
```cmd
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start

# Or using Yarn
yarn install
yarn start
```

Frontend will start on `http://localhost:3000`

### Running Both Servers Simultaneously

**macOS/Linux:**
```bash
# Terminal 1 - Backend
./mvnw spring-boot:run

# Terminal 2 - Frontend
cd frontend && npm start
```

**Windows:**
```cmd
# Command Prompt 1 - Backend
mvnw.cmd spring-boot:run

# Command Prompt 2 - Frontend
cd frontend && npm start
```

### Building for Production

**Backend:**

**macOS/Linux:**
```bash
./mvnw clean package -DskipTests
java -jar target/quotation-system-1.0.0.jar
```

**Windows:**
```cmd
mvnw.cmd clean package -DskipTests
java -jar target\quotation-system-1.0.0.jar
```

**Frontend:**

**macOS/Linux:**
```bash
cd frontend
npm run build
# Serve the build folder using a static server
npx serve -s build
```

**Windows:**
```cmd
cd frontend
npm run build
REM Serve the build folder using a static server
npx serve -s build
```

## Default Credentials

**📋 See [CREDENTIALS.md](CREDENTIALS.md) for complete login information**

| Role | Username | Password | Access Level |
|------|----------|----------|--------------|
| **Super Admin** | `spadmin` | `pass` | Full system access |
| **Admin** | `admin` | `password` | Create/edit quotations, manage data |
| **User** | `user` | `password` | View only |

⚠️ **Important:** Change these passwords before production use!

## Quick Start Guide

### Option 1: Using Startup Scripts (Easiest)

**macOS/Linux:**
```bash
# Make scripts executable (first time only)
chmod +x start-backend.sh start-frontend.sh start-all.sh

# Start both backend and frontend together
./start-all.sh

# Or start them separately in different terminals:
# Terminal 1:
./start-backend.sh

# Terminal 2:
./start-frontend.sh
```

**Windows:**
```cmd
# Start both backend and frontend together (opens 2 windows)
start-all.bat

# Or start them separately in different command prompts:
# Command Prompt 1:
start-backend.bat

# Command Prompt 2:
start-frontend.bat
```

### Option 2: Manual Setup

### 1. Clone or Download the Project

**macOS/Linux:**
```bash
git clone <repository-url>
cd quotation-system
```

**Windows:**
```cmd
git clone <repository-url>
cd quotation-system
```

### 2. Setup MySQL Database

Make sure MySQL is running and update credentials in `src/main/resources/application.properties`

### 3. Start Backend (Terminal/CMD 1)

**macOS/Linux:**
```bash
./mvnw spring-boot:run
```

**Windows:**
```cmd
mvnw.cmd spring-boot:run
```

Wait for: `Started QuotationSystemApplication in X seconds`

### 4. Start Frontend (Terminal/CMD 2)

**macOS/Linux:**
```bash
cd frontend
npm install
npm start
```

**Windows:**
```cmd
cd frontend
npm install
npm start
```

### 5. Access the Application

Open browser and go to: `http://localhost:3000`

Login with: `spadmin` / `pass`

## Troubleshooting

### Backend Issues

**Port 8080 already in use:**

**macOS/Linux:**
```bash
# Find process using port 8080
lsof -i :8080

# Kill the process
kill -9 <PID>
```

**Windows:**
```cmd
# Find process using port 8080
netstat -ano | findstr :8080

# Kill the process
taskkill /PID <PID> /F
```

**MySQL Connection Error:**
- Verify MySQL is running
- Check username/password in `application.properties`
- Ensure database exists or `createDatabaseIfNotExist=true` is set

**Maven Build Errors:**

**macOS/Linux:**
```bash
# Clean and rebuild
./mvnw clean install -U
```

**Windows:**
```cmd
# Clean and rebuild
mvnw.cmd clean install -U
```

### Frontend Issues

**Port 3000 already in use:**

**macOS/Linux:**
```bash
# Find and kill process
lsof -i :3000
kill -9 <PID>

# Or run on different port
PORT=3001 npm start
```

**Windows:**
```cmd
# Find and kill process
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or run on different port
set PORT=3001 && npm start
```

**Node modules issues:**

**macOS/Linux:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Windows:**
```cmd
# Clear cache and reinstall
rmdir /s /q node_modules
del package-lock.json
npm cache clean --force
npm install
```

**CORS Errors:**
- Ensure backend is running on port 8080
- Check `SecurityConfig.java` CORS configuration
- Verify `frontend/package.json` has `"proxy": "http://localhost:8080"`

### Common Issues

**JWT Token Expired:**
- Login again to get a new token
- Token expires after 24 hours

**Theme Not Persisting:**
- Check browser localStorage is enabled
- Clear browser cache and try again

**Email Not Sending:**
- Verify SMTP settings in `application.properties`
- For Gmail, use App Password (not regular password)
- Enable "Less secure app access" or use OAuth2

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Quotations
- `GET /api/quotations` - List all quotations
- `GET /api/quotations/{id}` - Get quotation by ID
- `POST /api/quotations` - Create quotation
- `PUT /api/quotations/{id}` - Update quotation
- `DELETE /api/quotations/{id}` - Delete quotation
- `POST /api/quotations/{id}/approve` - Approve quotation
- `POST /api/quotations/{id}/send` - Send to client

### Users (Super Admin only)
- `GET /api/superadmin/users` - List users
- `POST /api/superadmin/users` - Create user
- `PUT /api/superadmin/users/{id}` - Update user
- `DELETE /api/superadmin/users/{id}` - Delete user

### Companies
- `GET /api/companies` - List companies
- `POST /api/companies` - Create company
- `PUT /api/companies/{id}` - Update company
- `DELETE /api/companies/{id}` - Delete company

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `PUT /api/products/{id}` - Update product
- `DELETE /api/products/{id}` - Delete product

## Features Implementation Status

✅ User authentication with JWT
✅ Role-based access control
✅ Quotation CRUD operations
✅ Company management
✅ Product management
✅ User management (Super Admin)
✅ Dark/Light theme toggle
✅ Responsive design
✅ Email notifications
⏳ Template customization (Coming soon)
⏳ File upload for quotations (Coming soon)
⏳ PDF generation (Coming soon)

## License

MIT License

---

## 📚 Documentation

- **[GET_STARTED.md](GET_STARTED.md)** - 🚀 **START HERE** - Get up and running in 5 minutes
- **[CREDENTIALS.md](CREDENTIALS.md)** - 🔑 Default login credentials for all user roles
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - 🔧 Common issues and solutions
- **[MAVEN_SETUP.md](MAVEN_SETUP.md)** - 📦 Maven wrapper issues and fixes
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick commands and common tasks
- **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** - Complete project architecture and structure
- **[SETUP_CHECKLIST.md](SETUP_CHECKLIST.md)** - Detailed setup checklist
- **[SCRIPTS_GUIDE.md](SCRIPTS_GUIDE.md)** - Complete guide to all startup scripts

## 🎯 Quick Links

- Backend API: http://localhost:8080
- Frontend UI: http://localhost:3000
- Default Login: `spadmin` / `pass`

## 📞 Support

For issues and questions:
1. Check the documentation files above
2. Review the troubleshooting section
3. Check application logs
4. Verify all prerequisites are installed

---

**Built with ❤️ using Spring Boot and React**




jdbc:mysql://localhost:3306/?user=root