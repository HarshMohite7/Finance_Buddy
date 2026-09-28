# UI/UX Specification: Finance Buddy

## 1. Design System & Theming
*   **Framework:** Tailwind CSS with shadcn/ui components (Radix UI base, Nova preset).
*   **Theme:** Clean, modern, minimalist SaaS aesthetic. Mobile-first design approach is mandatory.
*   **Color Palette:** Zinc/Slate for backgrounds (`bg-zinc-50`), high-contrast text, and a vibrant primary accent (e.g., Indigo-600 or Emerald-600) for primary CTA buttons.

## 2. Core Components (shadcn/ui)
*   **Cards:** Use `<Card>` to encapsulate forms, charts, and data tables to maintain a clean interface.
*   **Buttons:** 
    *   Primary `<Button>`: Used for the main action (e.g., "Log In", "Save & Pay via GPay").
    *   Secondary `<Button variant="outline">`: Used for secondary actions (e.g., "Take Photo", "Cancel").
*   **Inputs:** Use `<Input>` and `<Label>` for amounts and notes.
*   **Icons:** Use `lucide-react` icons extensively (e.g., `Camera`, `IndianRupee`, `Trash2`, `Mail`) to enhance visual hierarchy.

## 3. Screen Layouts & Routing

### A. Landing & Auth Page (`app/page.tsx`)
*   **Layout:** Centered flexbox layout.
*   **Hero:** Bold headline ("Finance Buddy: Track Intent, Not Just Receipts").
*   **Auth Form:** A `<Card>` containing the Supabase Email/Password login/signup form.

### B. The "Intent" Form - Protected (`app/intent/page.tsx`)
*   **Layout:** Single, centered `<Card>` (mobile-optimized).
*   **Elements:**
    1.  Amount Input (type="number").
    2.  Quick Note Input (type="text").
    3.  "Snap Context" Button (Triggers hidden `<input type="file" capture="environment" accept="image/*" />`).
    4.  Loading state indicator (spinner) while Groq Vision analyzes the image.
    5.  Category Display (Shows Groq result, or a manual `<select>` fallback if Vision fails).
    6.  Primary "Save & Pay via GPay" Button (Full width, triggers Supabase insert + UPI redirect using upi://pay?pa=mohitevharsh777@oksbi).

### C. Analytics Dashboard - Protected (`app/dashboard/page.tsx`)
*   **Layout:** Top navigation bar with "Log Out" and "Send Daily Summary" buttons.
*   **Visualizations:** Use `recharts` to render a Pie Chart showing the spending breakdown by category.
*   **Data Table:** A shadcn `<Table>` component listing today's transactions. Must include "Edit" and "Delete" icons for each row to satisfy CRUD requirements.