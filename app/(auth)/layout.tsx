// app/(auth)/layout.tsx
// Minimal layout for auth pages — no sidebar, centered content

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-10">
      {children}
    </div>
  )
}

