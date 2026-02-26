# 🧾 Invoice System – Full Specification Document

## 1. Overview
The Invoice System will allow the organization to create, manage, send, and track invoices for clients and integrate with the Task Management System.

## 2. Core Invoice Features
- Invoice Number (auto-generated)
- Client Name / Company Name
- Client Email & Address
- Invoice Date
- Due Date
- Status: Draft, Sent, Paid, Unpaid, Overdue, Cancelled

## 3. Invoice Items / Services
- Item / Service Name
- Description
- Quantity
- Rate / Price
- Subtotal (auto calculated)
- Tax (optional)
- Discount (optional)
- Total Amount (auto calculated)

Formula:
Total = (Quantity × Rate) + Tax – Discount

## 4. Client Management
- Add / Edit / Delete clients
- Client profile with name, company, email, phone, address
- Client-wise invoice history

## 5. Payment Management
- Payment Method: Cash, Bank Transfer, Mobile Banking
- Payment Date
- Transaction ID
- Payment Status: Pending, Paid, Failed, Refunded

## 6. Invoice Dashboard & Reports
- Total invoices
- Paid invoices
- Unpaid invoices
- Overdue invoices
- Monthly and yearly revenue
- Export PDF / Excel

## 7. Invoice PDF & Print
- Company logo and address
- Client details
- Item table
- Total amount
- Download PDF
- Print invoice

## 8. Notification System
- Invoice created notification
- Payment received notification
- Overdue reminder

## 9. Role & Permission
Admin:
- Manage invoices and clients
- Generate reports
User:
- Create invoices
- View assigned invoices

## 10. Settings
- Company name and logo
- Currency
- Tax percentage
- Invoice prefix
- Footer note

## 11. UI Pages
- Invoice Dashboard
- Create Invoice Page
- Invoice List
- Invoice Details
- Client List
- Payment History
- Invoice Settings

## 12. Database Schema (Concept)
Tables:
- invoices
- invoice_items
- clients
- payments
- invoice_settings

## 13. Smart Prompt
Build Invoice System without changing existing UI, classes, components, or logic.

## 14. Client Explanation
Helps manage billing, payments, and financial reports efficiently.

## 15. Future Features
- Recurring invoices
- Online payment gateway
- Multi-currency
- QR code payment
- Accounting integration
