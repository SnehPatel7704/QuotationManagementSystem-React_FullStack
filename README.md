# Quotation Management System

A full-stack quotation management system with role-based access control, built with **Node.js/Express + Prisma ORM** (backend) and **React with Tailwind CSS** (frontend).

## 🚀 Quick Start

### Step 1: Run the setup script (first time only)
This will install dependencies in both the backend and frontend folders and generate the Prisma Client.

- **macOS / Linux:**
  ```bash
  ./setup.sh
  ```
- **Windows:**
  ```cmd
  setup.bat
  ```

### Step 2: Configure Environment Variables
Copy the environment templates to create the `.env` files and edit them as needed.

- **macOS / Linux:**
  ```bash
  cp backend/.env.example backend/.env
  cp frontend/.env.example frontend/.env
  ```
- **Windows:**
  ```cmd
  copy backend\.env.example backend\.env
  copy frontend\.env.example frontend\.env
  ```

Configure your MySQL database connection string in `backend/.env`:
```env
DATABASE_URL="mysql://username:password@localhost:3306/quotation_db"
JWT_SECRET="your-jwt-secret-key-change-in-production"
PORT=8080
```

### Step 3: Setup the Database Schema & Seed Data
Ensure MySQL is running and the database specified in your connection string is created (or will be auto-created by Prisma). Then run:

```bash
cd backend
npm run prisma:push
npm run prisma:seed
cd ..
```

### Step 4: Start the application
Run the start-all script from the root directory to launch both servers simultaneously:

- **macOS / Linux:**
  ```bash
  ./start-all.sh
  ```
- **Windows:**
  ```cmd
  start-all.bat
  ```

Alternatively, you can run them separately in different terminals:
- **Backend:**
  - macOS/Linux: `./start-backend.sh`
  - Windows: `start-backend.bat`
- **Frontend:**
  - macOS/Linux: `./start-frontend.sh`
  - Windows: `start-frontend.bat`

Once running, open `http://localhost:3000` in your browser.


---

## 🔑 Default Credentials

The following credentials are seeded by default for testing purposes:

| Role | Username | Password | Access Level |
|------|----------|----------|--------------|
| **Super Admin** | `spadmin` | `pass` | Full system access & User management |
| **Admin** | `admin` | `password` | Create, edit, approve quotations, manage companies & products |
| **User** | `user` | `password` | View only access |
| **User 2** | `user2` | `password123` | View only access |

> ⚠️ **Important:** Make sure to change these passwords/delete these seed users before moving to production!

---

## Features

- **Role-Based Access Control**
  - **Super Admin**: Full access to the system, including user management (creating, editing, disabling users).
  - **Admin**: Full access to quotations, companies, and products.
  - **User**: View-only access to quotations, companies, and products.
- **Quotation Management**
  - Create and edit quotations.
  - Add items (products with custom quantities and prices).
  - Status tracking (Draft, Pending Approval, Approved, Sent, Rejected).
  - Revision history (track quotation revisions).
  - PDF generation for quotations.
- **Company & Product Directory**
  - Manage companies/clients.
  - Manage product catalogs with base prices.
- **Theme Support**
  - Light/Dark mode toggle with persistent preference.
- **Responsive Modern UI**
  - Built with Tailwind CSS and Radix UI primitives.

---

## Project Structure

```
quotation-system/
├── backend/                  # Node.js + Express backend
│   ├── prisma/               # Prisma Schema & Database Seeder
│   │   ├── schema.prisma     # Database schema configuration
│   │   └── seed.js           # Seed data setup script
│   ├── middleware/           # Express middlewares (auth, etc.)
│   ├── routes/               # REST API route handlers
│   ├── services/             # Business/Helper services (e.g. mail, PDF generation)
│   ├── server.js             # Express application root
│   └── .env                  # Backend environment variables
│
└── frontend/                 # React frontend
    ├── public/
    └── src/
        ├── components/       # Layouts, UI components, toast notifications
        ├── contexts/         # Authentication & Theme contexts
        ├── hooks/            # Custom hooks
        ├── pages/            # Page views (Auth, Companies, Dashboard, Products, Quotations, Users)
        ├── services/         # Axios API connection layer
        └── utils/            # Shared helper functions
```

---

## Technology Stack

### Backend
- Node.js & Express
- Prisma ORM (Object-Relational Mapping)
- MySQL Database
- JSON Web Token (JWT) for secure authentication
- bcryptjs for password hashing
- pdfkit for PDF generation
- nodemailer for sending mail notifications

### Frontend
- React 18
- React Router v6 for routing
- Tailwind CSS 3 for UI styling
- Radix UI Primitives (Select, Dialog, Toast, etc.) for interactive components
- Axios for API requests
- React Icons

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - Authenticate user & get JWT token
- `GET /api/auth/me` - Get current authenticated user details

### Quotations
- `GET /api/quotations` - Fetch list of quotations
- `GET /api/quotations/:id` - Fetch quotation by ID
- `POST /api/quotations` - Create new quotation (Admin/Super Admin only)
- `PUT /api/quotations/:id` - Update existing quotation (Admin/Super Admin only)
- `DELETE /api/quotations/:id` - Delete quotation (Admin/Super Admin only)
- `POST /api/quotations/:id/approve` - Approve quotation (Admin/Super Admin only)
- `POST /api/quotations/:id/send` - Email quotation to company client
- `GET /api/quotations/:id/pdf` - Download PDF version of quotation

### User Management (Super Admin only)
- `GET /api/superadmin/users` - List all users
- `POST /api/superadmin/users` - Create a new user
- `PUT /api/superadmin/users/:id` - Edit user details/roles/status
- `DELETE /api/superadmin/users/:id` - Remove a user

### Companies
- `GET /api/companies` - List companies
- `POST /api/companies` - Create company (Admin/Super Admin only)
- `PUT /api/companies/:id` - Update company details (Admin/Super Admin only)
- `DELETE /api/companies/:id` - Delete company (Admin/Super Admin only)

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product (Admin/Super Admin only)
- `PUT /api/products/:id` - Update product details (Admin/Super Admin only)
- `DELETE /api/products/:id` - Delete product (Admin/Super Admin only)

---

## Troubleshooting

### Port 8080 (Backend) or 3000 (Frontend) already in use
Find the process ID running on the port and terminate it:
**macOS/Linux:**
```bash
lsof -i :8080
kill -9 <PID>
```
**Windows:**
```cmd
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

### Prisma Client issues
If you make changes to `schema.prisma`, regenerate the client:
```bash
cd backend
npm run prisma:generate
```

### Database Changes
If you update database tables, push the schema to the database:
```bash
cd backend
npm run prisma:push
```

### CORS Errors
Verify that `backend/server.js` CORS settings allow requests from your frontend origin (typically `http://localhost:3000`).

---

## License

MIT License