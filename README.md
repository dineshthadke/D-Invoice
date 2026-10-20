# D-Invoice — Modern Invoice Generator & Billing Suite
**Site is Live at URL** =  https://dinvoice-billing.web.app

**D-Invoice** is a modern, responsive, and full-featured invoice generator web application designed with a professional blue-and-white color palette. It complies with Indian GST requirements (CGST, SGST, IGST) and provides standard A4 PDF downloads, printing, client management, business branding, and permanent database storage with MySQL.

---

## 🌟 Key Features

1. **🔐 Firebase Authentication & Security**
   - **Email & Password Authentication**: Dedicated login and registration screens with input validation, password strength requirements, and clear Firebase error messages.
   - **Authentication Guard**: Unauthenticated visitors are automatically routed to the Sign In / Sign Up portal before they can create or view invoices.
   - **1-Click Quick Demo Sign-In**: Instant test credentials button (`demo@dinvoice.com` / `demo1234`) for rapid evaluation.
   - **User Header Controls**: Displays user avatar initial, logged-in email badge, and a **Logout** button.

2. **☁️ User-Scoped Firebase Firestore Storage**
   - **Strict Data Isolation**: Every invoice, client, and business profile is linked to the authenticated user's unique Firebase User ID (`uid`).
   - Users can **only** access, view, edit, and delete their own invoices.
   - When users log in again, their previously saved invoices are automatically retrieved from Firestore.
   - Included production-ready security rules in [firestore.rules](file:///c:/Users/Dinesh/Downloads/Antigravity/firestore.rules).

3. **📊 Comprehensive Dashboard**
   - Real-time billing metrics: **Total Invoiced**, **Paid Invoices**, **Pending Invoices**, and **Overdue Invoices**.
   - Cumulative revenue tracking in Indian Rupees (**₹**).
   - Recent invoices table with quick action shortcuts.
   - Monthly revenue comparison chart (billed vs. collected).

2. **🏢 Business Details Management**
   - Business name, logo upload with live preview, registered address, email, phone number.
   - Optional **GSTIN** and **PAN** details.
   - Bank details (Bank Name, Account Name, Account Number, IFSC Code) & **UPI ID**.
   - Dynamic **UPI QR Code** generated directly on printed/downloaded A4 invoices for instant mobile scan-and-pay settlement.
   - Customizable default notes and terms & conditions.

3. **👥 Client Directory**
   - Add, edit, search, and delete customer profiles.
   - Store client company name, contact numbers, email, billing address, state, and GSTIN.
   - Create new clients on-the-fly directly inside the invoice creation screen.

4. **➕ Invoice Creation & Editing**
   - Auto-generated sequential invoice numbers (`INV-YYYY-XXXX`).
   - Issue date and due date with **Quick Payment Terms** buttons (*Due on Receipt*, *Net 15*, *Net 30*, *Net 60*).
   - Dynamic line items: description, HSN/SAC code, quantity, unit (*Nos, Hours, Days, Units, Pcs, etc.*), unit price, item-level discount %, and GST tax bracket (*0%, 5%, 12%, 18%, 28%*).
   - Auto-population of client address and place of supply.

5. **🧮 Automatic Calculations & Tax Logic**
   - Automatic line-item taxable amounts and line totals.
   - **Intra-State GST**: Automatically detects when business state matches supply state and splits tax into **CGST** (Tax/2 %) and **SGST** (Tax/2 %).
   - **Inter-State GST**: Automatically detects interstate transactions and applies **IGST** (Tax %).
   - Subtotal, overall discount (flat ₹ or %), shipping/freight charges, and automatic round-off.
   - **Amount in Words**: Converts total payable amount into formal Indian accounting words (*e.g., "One Lakh Twenty-Three Thousand Four Hundred Fifty-Six Rupees Only"*).

6. **📄 Pixel-Perfect A4 Invoice Preview**
   - Designed to strict international A4 sheet specifications (210mm x 297mm).
   - Includes business branding, TAX INVOICE title, client details, item table, tax summary, bank details with UPI QR code, notes, terms, and authorized signatory line.
   - Live draft preview available before saving.

7. **🖨️ PDF Export & Pristine Printing**
   - **1-Click PDF Download** using `html2pdf.js` with high-resolution rendering.
   - **Direct Print** via dedicated print CSS (`@media print`) that removes application chrome and preserves vector colors.

8. **🗄️ Invoice Management**
   - Search invoices by invoice number, client name, or company.
   - Filter invoices by status: *All*, *Paid*, *Pending*, *Overdue*, *Draft*, *Cancelled*.
   - **Record Payment Modal**: Mark invoices as paid with settlement mode (*Bank Transfer, UPI, Cheque, Card, Cash*) and payment date.
   - **Duplicate Invoice**: Clone existing invoices with auto-incremented invoice numbers.
   - **Delete Invoice** with confirmation safeguard.

9. **💾 Permanent Database Storage (MySQL & SQLite Dual-Engine)**
   - **MySQL Support**: Native connection via `mysql2/promise` with auto database creation (`dinvoice_db`) and automatic schema migrations.
   - **Zero-Config Fallback**: If MySQL credentials have not been configured yet, D-Invoice automatically runs on an embedded SQLite database (`dinvoice.db`), so the application is 100% operational out of the box with zero setup hurdles.
   - **In-App Database Switcher**: Configure and test MySQL credentials at any time in the **Database** tab or via `.env`.

10. **📱 Responsive Design**
    - Seamlessly adapts across desktops, laptops, tablets, and mobile smartphones.
    - Accessible navigation with mobile hamburger drawer and keyboard shortcuts (ESC to close modals).

## 📁 Project Structure

Antigravity/
├── package.json              # Project dependencies and scripts
├── .env                      # Active environment configuration
├── .env.example              # Sample environment template
├── dinvoice.db               # Embedded SQLite database (for zero-config fallback)
├── server/
│   ├── index.js              # Express server and static middleware
│   ├── database.js           # Dual-engine DB manager (MySQL + SQLite fallback)
│   ├── schema.sql            # MySQL schema definitions
│   └── routes/
│       ├── stats.js          # Dashboard analytics API
│       ├── business.js       # Business profile & logo upload API
│       ├── clients.js        # Client directory API
│       ├── invoices.js       # Invoice CRUD, duplicate, status API
│       └── settings.js       # MySQL test & configuration API
└── public/
    ├── index.html            # Single Page Application HTML structure
    ├── css/
    │   ├── style.css         # Modern corporate blue-and-white stylesheet
    │   └── print.css         # Dedicated A4 print stylesheet
    ├── js/
    │   ├── app.js            # App coordinator & navigation router
    │   ├── api.js            # Fetch REST client
    │   ├── utils.js          # Currency formatter (₹), Number-to-Words, Indian states
    │   ├── dashboard.js      # Dashboard metrics & trends
    │   ├── invoice-preview.js# A4 rendering, UPI QR code, print & PDF export
    │   ├── invoice-form.js   # Dynamic item repeater & GST calculation engine
    │   ├── invoice-list.js   # Invoice table, search, filters & actions
    │   ├── clients.js        # Client management controller
    │   ├── business.js       # Business profile & bank details controller
    │   └── settings.js       # Database status & MySQL switcher
    └── uploads/              # Uploaded logos and business media
