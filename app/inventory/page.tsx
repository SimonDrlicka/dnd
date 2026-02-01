"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createInventoryItem,
  deleteInventoryItem,
  listInventoryItems,
  updateInventoryItem,
} from "./actions";
import type { InventoryItem } from "./actions";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    origin: "",
    estimatedPrice: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState({
    name: "",
    origin: "",
    estimatedPrice: "",
  });

  useEffect(() => {
    listInventoryItems().then(setItems);
  }, []);

  const handleAddItem = async () => {
    if (!draft.name.trim()) return;
    const created = await createInventoryItem(
      draft.name,
      draft.origin,
      draft.estimatedPrice
    );
    setItems((prev) => [created, ...prev]);
    setDraft({ name: "", origin: "", estimatedPrice: "" });
    setIsOpen(false);
  };

  const handleDeleteItem = async (id: number) => {
    await deleteInventoryItem(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const startEditing = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditingDraft({
      name: item.name,
      origin: item.origin ?? "",
      estimatedPrice: item.estimatedPrice ?? "",
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingDraft({ name: "", origin: "", estimatedPrice: "" });
  };

  const commitEditing = async () => {
    if (editingId === null) return;
    const name = editingDraft.name.trim();
    if (!name) return;
    const origin = editingDraft.origin.trim();
    const price = editingDraft.estimatedPrice.trim();
    await updateInventoryItem(editingId, name, origin, price);
    setItems((prev) =>
      prev.map((item) =>
        item.id === editingId
          ? {
              ...item,
              name,
              origin: origin || null,
              estimatedPrice: price || null,
            }
          : item
      )
    );
    cancelEditing();
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500">
              D&amp;D Inventory
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              Party Inventory & Notes
            </h1>
            <p className="text-sm text-zinc-600">
              Track loot, origin, and a quick sell estimate.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600 transition hover:border-zinc-400"
            >
              Menu
            </Link>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-5 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-zinc-800"
            >
              Add Item
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-[1.2fr_0.9fr_0.5fr_auto] gap-3 border-b border-zinc-200 pb-3 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            <span>Item</span>
            <span>Origin</span>
            <span>Est. Price</span>
            <span className="text-right">Actions</span>
          </div>
          {items.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              No items yet. Add your first loot entry.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1.2fr_0.9fr_0.5fr_auto] gap-3 py-3 text-sm text-zinc-700"
                >
                  <div
                    onDoubleClick={() => startEditing(item)}
                    className="font-medium text-zinc-900"
                  >
                    {editingId === item.id ? (
                      <input
                        value={editingDraft.name}
                        onChange={(event) =>
                          setEditingDraft((prev) => ({
                            ...prev,
                            name: event.target.value,
                          }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            commitEditing();
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            cancelEditing();
                          }
                        }}
                        autoFocus
                        className="h-8 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                      />
                    ) : (
                      item.name
                    )}
                  </div>
                  <div onDoubleClick={() => startEditing(item)}>
                    {editingId === item.id ? (
                      <input
                        value={editingDraft.origin}
                        onChange={(event) =>
                          setEditingDraft((prev) => ({
                            ...prev,
                            origin: event.target.value,
                          }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            commitEditing();
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            cancelEditing();
                          }
                        }}
                        className="h-8 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                      />
                    ) : (
                      item.origin || "—"
                    )}
                  </div>
                  <div onDoubleClick={() => startEditing(item)}>
                    {editingId === item.id ? (
                      <input
                        value={editingDraft.estimatedPrice}
                        onChange={(event) =>
                          setEditingDraft((prev) => ({
                            ...prev,
                            estimatedPrice: event.target.value,
                          }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            commitEditing();
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            cancelEditing();
                          }
                        }}
                        className="h-8 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                      />
                    ) : (
                      item.estimatedPrice || "—"
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    {editingId === item.id ? (
                      <>
                        <button
                          type="button"
                          onClick={commitEditing}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-300 text-xs text-zinc-600 transition hover:border-zinc-400"
                          aria-label="Save"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-300 text-xs text-zinc-600 transition hover:border-zinc-400"
                          aria-label="Discard"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 transition hover:text-zinc-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-zinc-900">
                Add Inventory Item
              </h2>
              <p className="text-sm text-zinc-600">
                Enter the item, its origin, and estimated sale price.
              </p>
            </div>
            <div className="grid gap-3">
              <input
                value={draft.name}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Item name"
                className="h-11 rounded-md border border-zinc-300 px-3 text-sm text-zinc-800 outline-none focus:border-zinc-400"
              />
              <input
                value={draft.origin}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, origin: event.target.value }))
                }
                placeholder="Origin / source"
                className="h-11 rounded-md border border-zinc-300 px-3 text-sm text-zinc-800 outline-none focus:border-zinc-400"
              />
              <input
                value={draft.estimatedPrice}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    estimatedPrice: event.target.value,
                  }))
                }
                placeholder="Estimated price"
                className="h-11 rounded-md border border-zinc-300 px-3 text-sm text-zinc-800 outline-none focus:border-zinc-400"
              />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600 transition hover:border-zinc-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-5 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-zinc-800"
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
