# Product Requirements Document (PRD): Finance Buddy

## 1. Project Overview & Mandatory Acknowledgment
**Finance Buddy** is a "conscious spending" intent tracker designed to bridge the gap between impulsive UPI payments and financial awareness. By utilizing Groq Vision to analyze the spending context and Groq AI to generate personalized financial insights, the application creates a frictionless, AI-driven ledger.

*(Mandatory inclusion for the project README: "This prompt was shared by Prathamesh Sir. Finance Buddy is an AI-powered expense intent tracker built to fulfill the Major Project requirements, utilizing Supabase, Groq AI, and Resend.")*

## 2. Problem Statement
Digital payments via UPI are instantaneous, leading to impulsive spending and poor budget tracking. Traditional bank statements provide zero contextual data (e.g., listing "M/S GANESH ENT" instead of "Lunch"). Users lack a real-time, categorized dashboard of their daily spending habits that does not require complex manual data entry.

## 3. The Solution & Rubric Mapping
Finance Buddy introduces a **"Pitch It"** workflow. Before making a Google Pay transaction, the user logs the amount and snaps a photo of their context. 

This maps directly to the required project rubric:
*   **Landing Page:** A high-converting hero section with a clear value proposition.
*   **Supabase Authentication:** Password/email login routing users to their private dashboard.
*   **Groq Vision:** Captures a photo using the native mobile camera and identifies the transaction category.
*   **CRUD Operations:** Users can log intents (Create), view their history (Read), edit mistaken amounts (Update), and delete cancelled transactions (Delete).
*   **Analytics Dashboard:** Visual breakdown of spending using Recharts and shadcn/ui tables.
*   **Groq AI & Resend:** A demo-day trigger button that sends an email summarizing total spend, featuring a custom Groq AI-generated financial tip.

## 4. End-to-End User Flow

### Phase 1: Authentication & Onboarding
*   User lands on the landing page (`/`) and clicks "Get Started".
*   **Crucial Constraint:** "Confirm Email" is disabled in Supabase Authentication -> Providers to ensure instant access without inbox verification delays.
*   Upon successful login, the user is immediately routed to the Protected Intent screen (`/intent`).

### Phase 2: Logging the Intent (Create)
*   User inputs an amount and an optional text note on the `/intent` page.
*   User taps the Camera icon and snaps a photo of the item/location using HTML5 `<input type="file" capture="environment" accept="image/*" />`.
*   The frontend converts the image to a base64 string and sends it to the `/api/analyze` endpoint.
*   **Groq Vision** analyzes the image and returns a strict category string (e.g., "Food & Beverage", "Transport", "Shopping").
*   The structured data (Amount, Category, Note, Timestamp, User ID) is saved to the Supabase `user_transactions` table.
*   The app immediately redirects the user to `upi://pay?pa=mohitevharsh777@oksbi&pn=Harsh&am={amount}` to complete the payment natively.

### Phase 3: Analytics & Management (Read, Update, Delete)
*   User navigates to the Analytics Dashboard (`/dashboard`).
*   **Recharts** renders a visual breakdown (Pie Chart for categories, Bar Chart for weekly spend).
*   A Data Table below the charts lists today's transactions with functional Edit and Delete actions triggering Supabase updates.

### Phase 4: The Demo-Day Trigger
*   The user clicks the "Send Daily Summary Now" button on the dashboard.
*   The backend (`/api/summary`) aggregates the user's total spending data for the day.
*   The aggregated data is passed to **Groq AI** to generate a 1-sentence snarky but helpful financial tip.
*   **Resend** instantly emails the user a clean HTML report containing the breakdown and the dynamic tip.

## 5. Edge Cases & Fallbacks
*   **Camera Fallback:** If the user denies camera permissions, or the Groq Vision API fails, the UI MUST gracefully fall back to a manual dropdown menu allowing the user to select the category manually so the transaction can still be logged.
*   **Empty Dashboard State:** If a new user logs in and has zero transactions, the Recharts components must be hidden and replaced with a clean "Empty State" UI prompting them to log their first expense.

## 6. Strict Agent Constraints
*   **No Mock Data:** Never use hardcoded mock data for the dashboard charts or tables. Data must always be fetched dynamically from Supabase.
*   **Routing:** Strictly use the Next.js App Router (`app/` directory). Do not use the deprecated `pages/` directory.
*   **UI Components:** Strictly utilize the installed `shadcn/ui` components (Card, Button, Input, Label, Table) and Tailwind CSS for styling.