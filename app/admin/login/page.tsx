import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {isAllowed} from "@/src/lib/admin-allowlist";
import {createClient} from "@/src/lib/supabase/server";

export const metadata: Metadata = {title: "Prijava — BiteRadar Admin"};

// Server action: sign in with email + password, then re-check the allowlist
// server-side. A valid Supabase account that isn't an admin must be rejected.
async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const {data, error} = await supabase.auth.signInWithPassword({email, password});

  if (error || !isAllowed(data.user?.email)) {
    if (!error) {
      await supabase.auth.signOut(); // authenticated, but not an allowlisted admin
    }
    redirect("/admin/login?error=1");
  }

  redirect("/admin");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{error?: string}>;
}) {
  // Already signed in as an admin? Skip the form.
  const supabase = await createClient();
  const {data} = await supabase.auth.getClaims();
  if (isAllowed((data?.claims as {email?: string} | undefined)?.email)) {
    redirect("/admin");
  }

  const {error} = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form
        action={login}
        className="w-full max-w-sm space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h1 className="text-lg font-semibold text-black dark:text-zinc-50">
          BiteRadar Admin
        </h1>

        {error ? (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            Pogrešan email ili lozinka, ili nalog nema pristup.
          </p>
        ) : null}

        <label className="block text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </label>

        <label className="block text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Lozinka</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded bg-black px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          Prijavi se
        </button>
      </form>
    </main>
  );
}
