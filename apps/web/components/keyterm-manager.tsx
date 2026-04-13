"use client";

import { useState } from "react";
import { id } from "@instantdb/react";
import db from "@/lib/instant";
import { useKeyterms } from "@/hooks/use-session";

export function KeytermManager() {
  const { keyterms, isLoading } = useKeyterms();
  const [newTerm, setNewTerm] = useState("");
  const [newBoost, setNewBoost] = useState(2);

  function addKeyterm() {
    if (!newTerm.trim()) return;
    const keytermId = id();
    db.transact(
      db.tx.keyterms[keytermId].update({
        term: newTerm.trim(),
        boost: newBoost,
        active: true,
      })
    );
    setNewTerm("");
    setNewBoost(2);
  }

  function toggleKeyterm(keytermId: string, active: boolean) {
    db.transact(db.tx.keyterms[keytermId].update({ active: !active }));
  }

  function deleteKeyterm(keytermId: string) {
    db.transact(db.tx.keyterms[keytermId].delete());
  }

  if (isLoading) {
    return (
      <div className="rounded-[--radius-card] bg-oa-white border border-oa-stone-200 p-6 shadow-[--shadow-card]">
        <p className="text-sm text-oa-stone-300">Loading...</p>
      </div>
    );
  }

  return (
    <div className="rounded-[--radius-card] bg-oa-white border border-oa-stone-200 p-6 shadow-[--shadow-card] space-y-5">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-oa-black-900">
          Vocabulary Boost
        </h2>
        <p className="text-xs text-oa-black-700">
          Add church-specific terms to improve Deepgram accuracy
        </p>
      </div>

      {/* Add new keyterm */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newTerm}
          onChange={(e) => setNewTerm(e.target.value)}
          placeholder="e.g. ONE&ALL, Pastor Brian"
          className="flex-1 rounded-[--radius-input] border border-oa-stone-200 bg-oa-white px-3 py-2.5 text-sm placeholder:text-oa-stone-300 focus:border-oa-yellow-500 focus:outline-none transition-colors"
          onKeyDown={(e) => e.key === "Enter" && addKeyterm()}
        />
        <select
          value={newBoost}
          onChange={(e) => setNewBoost(parseInt(e.target.value))}
          className="rounded-[--radius-input] border border-oa-stone-200 px-2 py-2.5 text-sm focus:border-oa-yellow-500 focus:outline-none transition-colors"
        >
          {[1, 2, 3, 4, 5].map((b) => (
            <option key={b} value={b}>
              +{b}
            </option>
          ))}
        </select>
        <button
          onClick={addKeyterm}
          disabled={!newTerm.trim()}
          className="rounded-[--radius-button] bg-oa-black-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-oa-black-800 transition-colors duration-150 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {/* Keyterm list */}
      <div className="space-y-1.5">
        {keyterms.length === 0 ? (
          <p className="text-sm text-oa-stone-300 italic py-2">
            No keyterms added yet.
          </p>
        ) : (
          keyterms.map((kt) => (
            <div
              key={kt.id}
              className="flex items-center gap-3 rounded-[--radius-input] border border-oa-stone-200 px-3 py-2.5 hover:bg-oa-stone-100 transition-colors duration-150"
            >
              <button
                onClick={() => toggleKeyterm(kt.id, kt.active)}
                className={`h-2.5 w-2.5 rounded-full shrink-0 transition-colors duration-150 ${
                  kt.active ? "bg-green-500" : "bg-oa-stone-300"
                }`}
                title={kt.active ? "Active" : "Inactive"}
              />
              <span
                className={`flex-1 text-sm ${
                  kt.active
                    ? "text-oa-black-900"
                    : "text-oa-stone-300 line-through"
                }`}
              >
                {kt.term}
              </span>
              <span className="rounded-full bg-oa-stone-100 px-2 py-0.5 text-xs font-medium text-oa-black-700">
                +{kt.boost}
              </span>
              <button
                onClick={() => deleteKeyterm(kt.id)}
                className="text-xs text-oa-stone-300 hover:text-oa-coral transition-colors duration-150"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
