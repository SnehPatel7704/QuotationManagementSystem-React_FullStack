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
CORS_ORIGINS="http://localhost:3000"
FRONTEND_URL="http://localhost:3000"
```

For production, set a unique `JWT_SECRET` with at least 32 characters, configure
`CORS_ORIGINS` with the exact frontend origins (comma-separated, no trailing
slashes), set `FRONTEND_URL` to the deployed frontend, and set
`REACT_APP_API_URL` in the frontend build environment to the deployed backend
API URL. Configure `MAIL_USERNAME`, `MAIL_PASSWORD`, and optionally `MAIL_FROM`
to enable email delivery. Production startup rejects missing CORS/frontend
origins and short JWT secrets.

When running the React development server with its `/api` proxy, keep
`http://localhost:8080` in the development `CORS_ORIGINS` list: the proxy
rewrites the request origin to the backend URL. Production should list only the
actual origins from which browsers access the API.

### Step 3: Setup the Database Schema & Seed Data
Ensure MySQL is running and the database specified in your connection string is created (or will be auto-created by Prisma). Then run:

```bash
cd backend
npm run prisma:push
npm run prisma:seed
cd ..
```

The demo seed is for an empty development database only. It refuses to run in
production or when application data already exists, and it does not erase
existing data.
For a production database, set `BOOTSTRAP_ADMIN_USERNAME`,
`BOOTSTRAP_ADMIN_EMAIL`, and a unique `BOOTSTRAP_ADMIN_PASSWORD` of at least 12
characters in `backend/.env`, then run:

```bash
cd backend
npm run prisma:bootstrap-admin
```

Remove the bootstrap password from the deployment environment after this
one-time command. The initial Super Admin can then create the tenant and its
first Admin from the application.

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

The empty-database demo seed creates the following accounts for local testing:

| Role | Username | Password | Access Level |
|------|----------|----------|--------------|
| **Super Admin** | `spadmin` | `pass` | Full system access & User management |
| **Alpha Admin** | `admin_alpha` | `password` | Create, edit, approve quotations, manage companies & products |
| **Alpha User** | `user_alpha` | `password123` | View only access |
| **Beta Admin** | `admin_beta` | `password` | Create, edit, approve quotations, manage companies & products |
| **Beta User** | `user_beta` | `password123` | View only access |

> ⚠️ **Important:** Never use demo-seed credentials in production. Use the one-time administrator bootstrap above instead.

To add representative quotation states and extra sample products/clients to an
already seeded **development** database without deleting or overwriting
existing records, run `cd backend && npm run prisma:seed-demo`. This command
is safe to repeat and is disabled when `NODE_ENV=production`. It also creates
two view-only sample accounts: `demo_viewer_alpha` and `demo_viewer_beta`
(password: `DemoUser!2026`).

---

## Features

- **Role-Based Access Control**
  - **Super Admin**: Full access to the system, including user management (creating, editing, disabling users).
  - **Admin**: Full access to quotations, companies, and products.
  - **User**: View-only access to quotations, companies, and products.
- **Quotation Management**
  - Create and edit quotations.
  - Add items (products with custom quantities and prices).
  - Draft, submission, approval, rejection-with-revision, and client delivery status flow.
  - Revision history and comprehensive **Audit Trail Timeline** for all actions.
  - Client-branded PDF exports and email delivery, available only after approval.
  - Configurable tax rate and tax-inclusive pricing with totals shown before submission.
- **Company & Product Directory**
  - Manage companies/clients.
  - Manage product catalogs with base prices.
  - Excel import/export supports exported workbook headers, duplicate skipping, and bounded upload sizes.
  - Super Admin workflows support selecting a tenant when managing users, clients, products, and company settings.
- **Dashboard Analytics**
  - View key metrics (Total Revenue, Approved Quotes, Win Rate).
  - Interactive charts (Revenue trends and Status distribution) using Recharts.
  - Recent quotation activity and follow-ups filtered to the selected date range.
- **Theme Support**
  - Light/Dark mode toggle with persistent preference.
- **Search, Filters & Pagination**
  - Filter quotations by status and search by quote number or client.
  - Paginated lists for production-scale data handling.
- **Professional Workflow Enhancements**
  - Clone quotes for quick revisions.
  - Compare revision history and track value changes.
  - Stronger environment validation and startup checks.
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
- nodemailer for sending mail notifications with attachments
- exceljs & multer for Excel file import/export processing

### Frontend
- React 18
- React Router v6 for routing
- Tailwind CSS 3 for UI styling
- Radix UI Primitives (Select, Dialog, Toast, etc.) for interactive components
- Recharts for interactive dashboard analytics charts
- Axios for API requests
- React Icons

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - Authenticate user & get JWT token
- `GET /api/auth/me` - Get current authenticated user details

### Quotations
- `GET /api/quotations` - Fetch list of quotations
- `GET /api/quotations/analytics` - Fetch dashboard analytics and charts data
- `GET /api/quotations/:id` - Fetch quotation by ID
- `POST /api/quotations` - Create new quotation (Admin/Super Admin only)
- `PUT /api/quotations/:id` - Update existing quotation (Admin/Super Admin only)
- `DELETE /api/quotations/:id` - Delete quotation (Admin/Super Admin only)
- `POST /api/quotations/:id/approve` - Approve quotation (Admin/Super Admin only)
- `POST /api/quotations/:id/submit` - Submit a draft for approval
- `POST /api/quotations/:id/reject` - Reject a pending quotation and create a draft revision
- `POST /api/quotations/:id/send` - Email quotation to company client
- `GET /api/quotations/:id/pdf` - Download PDF version of quotation
- `GET /api/quotations/:id/revisions` - Read quotation revision history
- `POST /api/quotations/:id/clone` - Create a new draft by cloning a quotation (Admin/Super Admin only)

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
- `GET /api/companies/export-excel` - Export companies to Excel
- `POST /api/companies/import-excel` - Import companies from Excel

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product (Admin/Super Admin only)
- `PUT /api/products/:id` - Update product details (Admin/Super Admin only)
- `DELETE /api/products/:id` - Delete product (Admin/Super Admin only)
- `GET /api/products/export-excel` - Export products to Excel
- `POST /api/products/import-excel` - Import products from Excel

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