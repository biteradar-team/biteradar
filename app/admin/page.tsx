import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {requireAdmin} from "@/src/lib/auth";
import {createClient} from "@/src/lib/supabase/server";

export const metadata: Metadata = {title: "BiteRadar Admin"};

async function logout() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export default async function AdminDashboard() {
  const {email} = await requireAdmin();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          BiteRadar Admin
        </h1>
        <form action={logout}>
          <button
            type="submit"
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Odjava
          </button>
        </form>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Prijavljen kao{" "}
        <span className="font-medium text-black dark:text-zinc-200">{email}</span>.
      </p>

      <p className="text-sm text-zinc-500 dark:text-zinc-500">
        Alat za unos lokala stiže u sledećem koraku.
      </p>
    </main>
  );
}
