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

  if (isLoading) return <p className="text-sm text-neutral-400">Loading...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium">Keyterms (Deepgram Vocabulary Boost)</h2>

      {/* Add new keyterm */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newTerm}
          onChange={(e) => setNewTerm(e.target.value)}
          placeholder="e.g. ONE&ALL, Pastor Brian"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          onKeyDown={(e) => e.key === "Enter" && addKeyterm()}
        />
        <select
          value={newBoost}
          onChange={(e) => setNewBoost(parseInt(e.target.value))}
          className="rounded-lg border border-neutral-300 px-2 py-2 text-sm"
        >
          {[1, 2, 3, 4, 5].map((b) => (
            <option key={b} value={b}>
              Boost: {b}
            </option>
          ))}
        </select>
        <button
          onClick={addKeyterm}
          disabled={!newTerm.trim()}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition-colors disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {/* Keyterm list */}
      <div className="space-y-1">
        {keyterms.length === 0 ? (
          <p className="text-sm text-neutral-400 italic">
            No keyterms added yet. Add church-specific terms to improve transcription accuracy.
          </p>
        ) : (
          keyterms.map((kt) => (
            <div
              key={kt.id}
              className="flex items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2"
            >
              <button
                onClick={() => toggleKeyterm(kt.id, kt.active)}
                className={`w-2 h-2 rounded-full ${
                  kt.active ? "bg-green-500" : "bg-neutral-300"
                }`}
                title={kt.active ? "Active" : "Inactive"}
              />
              <span
                className={`flex-1 text-sm ${
                  kt.active ? "" : "text-neutral-400 line-through"
                }`}
              >
                {kt.term}
              </span>
              <span className="text-xs text-neutral-400">
                boost: {kt.boost}
              </span>
              <button
                onClick={() => deleteKeyterm(kt.id)}
                className="text-xs text-red-400 hover:text-red-600"
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
