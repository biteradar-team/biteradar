import type {Metadata} from "next";
import Link from "next/link";
import {desc, eq} from "drizzle-orm";
import {redirect} from "next/navigation";
import {db} from "@/src/db";
import {restaurantLocations, restaurants} from "@/src/db/schema";
import {CITY_NAMES as CITY} from "@/src/lib/cities";
import {requireAdmin} from "@/src/lib/auth";
import {createClient} from "@/src/lib/supabase/server";
import DeleteButton from "./delete-button";

export const metadata: Metadata = {title: "BiteRadar Admin"};

async function logout() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export default async function AdminDashboard() {
  const {email} = await requireAdmin();

  // db bypasses RLS, so this lists drafts too (unlike the public site).
  const locations = await db
    .select({
      id: restaurantLocations.id,
      restaurantId: restaurantLocations.restaurantId,
      slug: restaurantLocations.slug,
      brand: restaurants.name,
      label: restaurantLocations.name,
      city: restaurantLocations.city,
      status: restaurantLocations.status,
      createdAt: restaurantLocations.createdAt,
    })
    .from(restaurantLocations)
    .innerJoin(restaurants, eq(restaurants.id, restaurantLocations.restaurantId))
    .orderBy(desc(restaurantLocations.createdAt))
    .limit(100);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
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

      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Prijavljen kao{" "}
          <span className="font-medium text-black dark:text-zinc-200">{email}</span>.
        </p>
        <Link
          href="/admin/new"
          className="rounded bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
        >
          + Novi lokal
        </Link>
      </div>

      {locations.length === 0 ? (
        <p className="text-sm text-zinc-500">Još nema unetih lokala.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
            <tr>
              <th className="py-2 font-medium">Naziv</th>
              <th className="py-2 font-medium">Grad</th>
              <th className="py-2 font-medium">Status</th>
              <th className="py-2 text-right font-medium">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((l) => (
              <tr
                key={l.id}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-2 text-black dark:text-zinc-100">
                  {l.brand}
                  {l.label ? (
                    <span className="text-zinc-500"> · {l.label}</span>
                  ) : null}
                </td>
                <td className="py-2 text-zinc-600 dark:text-zinc-400">
                  {CITY[l.city]}
                </td>
                <td className="py-2">
                  <span
                    className={
                      l.status === "published"
                        ? "text-green-700 dark:text-green-400"
                        : "text-zinc-500"
                    }
                  >
                    {l.status === "published" ? "Objavljeno" : "Nacrt"}
                  </span>
                </td>
                <td className="py-2">
                  <div className="flex items-center justify-end gap-4">
                    {l.status === "published" ? (
                      <Link
                        href={`/lokal/${l.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
                      >
                        Vidi stranicu
                      </Link>
                    ) : null}
                    <Link
                      href={`/admin/${l.id}/edit`}
                      className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
                    >
                      Uredi
                    </Link>
                    <DeleteButton restaurantId={l.restaurantId} name={l.brand} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
