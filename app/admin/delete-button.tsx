'use client';
import {deleteLocationAction} from './new/actions';

/** Delete removes the whole brand (cascade). Confirm first — it's irreversible. */
export default function DeleteButton({
  restaurantId,
  name,
}: {
  restaurantId: string;
  name: string;
}) {
  return (
    <form
      action={deleteLocationAction}
      onSubmit={(e) => {
        if (!confirm(`Obrisati „${name}“? Ovo se ne može poništiti.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <button
        type="submit"
        className="text-sm text-red-600 hover:underline dark:text-red-400"
      >
        Obriši
      </button>
    </form>
  );
}
