"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createFight,
  deleteFight,
  getFight,
  listFights,
  saveFightState,
  updateFightName,
} from "./actions";
import type {
  DeathSavesState,
  FightState,
  FightSummary,
  FightLogEntry,
  TrackerRow,
} from "@/lib/tracker-types";

const MIN_ROWS = 0;
const MAX_ROWS = 20;
const DEFAULT_ROWS = 0;

const EMPTY_DEATH_SAVES: DeathSavesState = {
  cleric: { successes: [false, false, false], failures: [false, false, false] },
  fighter: { successes: [false, false, false], failures: [false, false, false] },
  rogue: { successes: [false, false, false], failures: [false, false, false] },
  wizard: { successes: [false, false, false], failures: [false, false, false] },
};

const CHARACTER_LABELS: Array<keyof DeathSavesState> = [
  "cleric",
  "fighter",
  "rogue",
  "wizard",
];

function createEmptyRows(count: number): TrackerRow[] {
  return Array.from({ length: count }, () => ({
    initiative: "",
    combatant: "",
    hp: "",
    conditions: "",
  }));
}

function cloneTriple(values: [boolean, boolean, boolean]): [
  boolean,
  boolean,
  boolean,
] {
  return [values[0], values[1], values[2]];
}

function cloneDeathSaves(): DeathSavesState {
  return {
    cleric: {
      successes: cloneTriple(EMPTY_DEATH_SAVES.cleric.successes),
      failures: cloneTriple(EMPTY_DEATH_SAVES.cleric.failures),
    },
    fighter: {
      successes: cloneTriple(EMPTY_DEATH_SAVES.fighter.successes),
      failures: cloneTriple(EMPTY_DEATH_SAVES.fighter.failures),
    },
    rogue: {
      successes: cloneTriple(EMPTY_DEATH_SAVES.rogue.successes),
      failures: cloneTriple(EMPTY_DEATH_SAVES.rogue.failures),
    },
    wizard: {
      successes: cloneTriple(EMPTY_DEATH_SAVES.wizard.successes),
      failures: cloneTriple(EMPTY_DEATH_SAVES.wizard.failures),
    },
  };
}

export default function CombatTrackerPage() {
  const [fights, setFights] = useState<FightSummary[]>([]);
  const [currentFightId, setCurrentFightId] = useState<number | null>(null);
  const [rows, setRows] = useState<TrackerRow[]>(createEmptyRows(DEFAULT_ROWS));
  const [deathSaves, setDeathSaves] =
    useState<DeathSavesState>(cloneDeathSaves);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<"setup" | "table">("table");
  const [hasMounted, setHasMounted] = useState(false);
  const [attackerIndex, setAttackerIndex] = useState<number | null>(null);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [damage, setDamage] = useState("");
  const [attackerCondition, setAttackerCondition] = useState("");
  const [targetCondition, setTargetCondition] = useState("");
  const [round, setRound] = useState(0);
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [fightLog, setFightLog] = useState<FightLogEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    listFights()
      .then(async (data) => {
        if (!active) return;
        if (data.length > 0) {
          setFights(data);
          setCurrentFightId(data[0].id);
          setMode("table");
          return;
        }

        const created = await createFight("Fight 1");
        if (!active) return;
        setFights([created]);
        setCurrentFightId(created.id);
        setRows(created.rows);
        setDeathSaves(created.deathSaves);
        setMode("setup");
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!currentFightId) {
      return;
    }

    let active = true;
    setIsLoading(true);
    getFight(currentFightId)
      .then((fight) => {
        if (!active || !fight) return;

        setRows(fight.rows);
        setDeathSaves(fight.deathSaves);
        setAttackerIndex(fight.currentAttackerIndex ?? null);
        setRound(fight.round ?? 0);
        setTargetIndex(null);
        setDraftName(fight.name);
        setFightLog(fight.log ?? []);
        setHistoryIndex(null);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [currentFightId]);

  const canAddRow = rows.length < MAX_ROWS;
  const canRemoveRow = rows.length > MIN_ROWS;

  const persistFight = async (
    nextRows: TrackerRow[],
    nextDeathSaves = deathSaves,
    nextAttackerIndex: number | null = attackerIndex,
    nextRound: number = round,
    nextLog: FightLogEntry[] = fightLog
  ) => {
    setRows(nextRows);
    setDeathSaves(nextDeathSaves);
    setAttackerIndex(nextAttackerIndex);
    setRound(nextRound);
    setFightLog(nextLog);
    setHistoryIndex(null);
    if (currentFightId) {
      await saveFightState(
        currentFightId,
        nextRows,
        nextDeathSaves,
        nextAttackerIndex,
        nextRound,
        nextLog
      );
    }
  };

  const handleAddRow = async () => {
    if (!canAddRow) return;
    const nextRows = [
      ...rows,
      { initiative: "", combatant: "", hp: "", conditions: "" },
    ];
    await persistFight(nextRows);
  };

  const handleRemoveRow = async () => {
    if (!canRemoveRow) return;
    const nextRows = rows.slice(0, -1);
    await persistFight(nextRows);
  };

  const handleReset = async () => {
    await persistFight(createEmptyRows(DEFAULT_ROWS), cloneDeathSaves());
  };

  const handleNewFight = async () => {
    const created = await createFight(`Fight ${fights.length + 1}`);
    setFights((prev) => [created, ...prev]);
    setCurrentFightId(created.id);
    setRows(created.rows);
    setDeathSaves(created.deathSaves);
    setAttackerIndex(created.currentAttackerIndex ?? null);
    setRound(created.round ?? 0);
    setTargetIndex(null);
    setDraftName(created.name);
    setFightLog(created.log ?? []);
    setHistoryIndex(null);
    setMode("setup");
  };

  const mockNames = [
    "Aelar",
    "Aeris",
    "Alaric",
    "Althea",
    "Amara",
    "Arden",
    "Aric",
    "Brenna",
    "Bram",
    "Caelan",
    "Cassia",
    "Cedric",
    "Daria",
    "Doran",
    "Eira",
    "Elowen",
    "Ember",
    "Eamon",
    "Fiona",
    "Galen",
    "Garrick",
    "Hale",
    "Helena",
    "Isla",
    "Ivor",
    "Jora",
    "Kael",
    "Kara",
    "Kieran",
    "Liora",
    "Lys",
    "Maeve",
    "Magnus",
    "Mira",
    "Nessa",
    "Nolan",
    "Orin",
    "Perrin",
    "Quinn",
    "Rhea",
    "Rowan",
    "Sable",
    "Seren",
    "Sylas",
    "Tamsin",
    "Thorne",
    "Tova",
    "Vera",
    "Wren",
    "Zarek",
  ];

  const handleNewMockFight = async () => {
    const created = await createFight(`Mock Fight ${fights.length + 1}`);
    const shuffled = [...mockNames].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 5);
    const conditions = ["normal", "rooted", "stunned", "knocked", "silenced"];

    const mockedRows: TrackerRow[] = selected.map((name) => {
      const hp = Math.floor(Math.random() * 11) + 15; // 15-25
      const initiative = Math.floor(Math.random() * 27) - 1; // -1 to 25
      const conditionRoll = Math.random();
      const condition =
        conditionRoll < 0.8
          ? "normal"
          : conditions[Math.floor(Math.random() * (conditions.length - 1)) + 1];

      return {
        combatant: name,
        initiative: String(initiative),
        hp: String(hp),
        conditions: condition,
      };
    });

    setFights((prev) => [created, ...prev]);
    setCurrentFightId(created.id);
    setTargetIndex(null);
    setMode("table");
    await persistFight(
      mockedRows,
      created.deathSaves,
      created.currentAttackerIndex ?? null,
      0,
      []
    );
  };

  const handleSelectFight = (fightId: number) => {
    if (fightId === currentFightId) return;
    setCurrentFightId(fightId);
    setMode("table");
  };

  const handleSaveFightName = async () => {
    if (!currentFightId) return;
    const nextName = draftName.trim() || "Untitled Fight";
    await updateFightName(currentFightId, nextName);
    setFights((prev) =>
      prev.map((fight) =>
        fight.id === currentFightId ? { ...fight, name: nextName } : fight
      )
    );
    setIsEditingName(false);
  };

  const handleDeleteFight = async (fightId: number) => {
    await deleteFight(fightId);
    setFights((prev) => {
      const remaining = prev.filter((fight) => fight.id !== fightId);
      if (fightId === currentFightId) {
        if (remaining.length > 0) {
          setCurrentFightId(remaining[0].id);
        } else {
          setCurrentFightId(null);
          setRows(createEmptyRows(DEFAULT_ROWS));
          setDeathSaves(cloneDeathSaves());
          setAttackerIndex(null);
          setRound(0);
          setFightLog([]);
          setHistoryIndex(null);
        }
      }
      return remaining;
    });
  };

  const handleProceedToTable = async () => {
    await persistFight(rows);
    setMode("table");
  };

  const handleBackToSetup = () => {
    setMode("setup");
  };

  const combatantOptions = useMemo(
    () =>
      rows.map((row, index) => ({
        value: index,
        label: row.combatant?.trim() || `Combatant ${index + 1}`,
      })),
    [rows]
  );

  const isAlive = (row: TrackerRow) => {
    const hpValue = Number.parseFloat(row.hp);
    if (!Number.isFinite(hpValue)) return true;
    return hpValue > 0;
  };

  const aliveIndices = useMemo(
    () =>
      rows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => isAlive(row))
        .map(({ index }) => index),
    [rows]
  );

  const turnOrder = useMemo(() => {
    return rows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const aInit = Number.parseFloat(a.row.initiative);
        const bInit = Number.parseFloat(b.row.initiative);
        const aHas = Number.isFinite(aInit);
        const bHas = Number.isFinite(bInit);
        if (aHas && bHas) {
          if (bInit !== aInit) return bInit - aInit;
          return a.index - b.index;
        }
        if (aHas) return -1;
        if (bHas) return 1;
        return a.index - b.index;
      })
      .map((item) => item.index);
  }, [rows]);

  const targetOptions = useMemo(
    () =>
      combatantOptions.filter(
        (option) =>
          option.value !== attackerIndex && aliveIndices.includes(option.value)
      ),
    [combatantOptions, attackerIndex, aliveIndices]
  );

  const attackerOptions = useMemo(
    () => combatantOptions.filter((option) => aliveIndices.includes(option.value)),
    [combatantOptions, aliveIndices]
  );

  const handleApplyAttack = async () => {
    if (attackerIndex === null || targetIndex === null) return;
    if (attackerIndex === targetIndex) return;
    if (turnOrder.length === 0) return;
    if (!aliveIndices.includes(attackerIndex)) return;
    if (!aliveIndices.includes(targetIndex)) return;

    const damageValue = Number.parseFloat(damage);
    const nextRows = rows.map((row, index) => {
      if (index !== attackerIndex && index !== targetIndex) return row;
      const nextRow = { ...row };

      if (index === targetIndex && Number.isFinite(damageValue)) {
        const hpValue = Number.parseFloat(row.hp);
        if (Number.isFinite(hpValue)) {
          nextRow.hp = String(hpValue - damageValue);
        }
      }

      if (index === attackerIndex && attackerCondition.trim()) {
        nextRow.conditions = attackerCondition.trim();
      }
      if (index === targetIndex && targetCondition.trim()) {
        nextRow.conditions = targetCondition.trim();
      }

      return nextRow;
    });

    const aliveTurnOrder = turnOrder.filter((index) =>
      isAlive(nextRows[index])
    );
    const currentTurnIndex = aliveTurnOrder.indexOf(attackerIndex);
    const safeIndex = currentTurnIndex === -1 ? 0 : currentTurnIndex;
    const nextTurnIndex = aliveTurnOrder.length
      ? (safeIndex + 1) % aliveTurnOrder.length
      : 0;
    const nextAttacker = aliveTurnOrder.length
      ? aliveTurnOrder[nextTurnIndex]
      : null;
    const roundIncrement =
      aliveTurnOrder.length && nextTurnIndex === 0 ? 1 : 0;
    const nextRound = round + roundIncrement;

    const entry: FightLogEntry = {
      round: nextRound,
      attackerIndex,
      targetIndex,
      damage: Number.isFinite(damageValue) ? damageValue : null,
      attackerCondition: attackerCondition.trim() || undefined,
      targetCondition: targetCondition.trim() || undefined,
      rows: nextRows,
    };
    const nextLog = [...fightLog, entry];

    await persistFight(nextRows, deathSaves, nextAttacker, nextRound, nextLog);
    setDamage("");
    setAttackerCondition("");
    setTargetCondition("");
    setTargetIndex(attackerIndex);
  };

  useEffect(() => {
    if (rows.length === 0) return;
    if (round !== 0 || attackerIndex !== null) return;
    const nextTurnOrder = turnOrder.filter((index) =>
      isAlive(rows[index])
    );
    if (nextTurnOrder.length === 0) return;
    persistFight(rows, deathSaves, nextTurnOrder[0], round, fightLog);
  }, [rows, round, attackerIndex, deathSaves, turnOrder, fightLog]);

  useEffect(() => {
    if (attackerIndex === null) return;
    if (isAlive(rows[attackerIndex])) return;
    const nextTurnOrder = turnOrder.filter((index) =>
      isAlive(rows[index])
    );
    const nextAttacker = nextTurnOrder.length ? nextTurnOrder[0] : null;
    persistFight(rows, deathSaves, nextAttacker, round, fightLog);
  }, [attackerIndex, rows, turnOrder, deathSaves, round, fightLog]);

  const isHistory = historyIndex !== null;
  const displayedRows = useMemo(() => {
    if (historyIndex === null) return rows;
    return fightLog[historyIndex]?.rows ?? rows;
  }, [historyIndex, fightLog, rows]);

  const displayedAttacker =
    historyIndex === null
      ? attackerIndex
      : fightLog[historyIndex]?.attackerIndex ?? null;
  const displayedTarget =
    historyIndex === null
      ? targetIndex
      : fightLog[historyIndex]?.targetIndex ?? null;

  const deadIndexSet = useMemo(() => {
    const set = new Set<number>();
    displayedRows.forEach((row, index) => {
      const hpValue = Number.parseFloat(row.hp);
      if (Number.isFinite(hpValue) && hpValue <= 0) {
        set.add(index);
      }
    });
    return set;
  }, [displayedRows]);

  const currentLogEntry =
    historyIndex === null ? null : fightLog[historyIndex] ?? null;
  const logAttackerName = currentLogEntry
    ? currentLogEntry.rows[currentLogEntry.attackerIndex]?.combatant ||
      `Combatant ${currentLogEntry.attackerIndex + 1}`
    : "";
  const logTargetName = currentLogEntry
    ? currentLogEntry.rows[currentLogEntry.targetIndex]?.combatant ||
      `Combatant ${currentLogEntry.targetIndex + 1}`
    : "";

  const currentAttackerName = isHistory
    ? logAttackerName
    : displayedAttacker !== null
    ? combatantOptions[displayedAttacker]?.label
    : "";

  const currentFight = useMemo(
    () => fights.find((fight) => fight.id === currentFightId) || null,
    [fights, currentFightId]
  );

  if (!hasMounted) {
    return <div className="min-h-screen bg-zinc-100 text-zinc-900" />;
  }

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-zinc-100 text-zinc-900 print:bg-white">
      <div className="mx-auto w-full max-w-[1240px] min-w-0 px-6 py-8 print:px-0 print:py-0">
        <header className="print-hide mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600 transition hover:border-zinc-400"
            >
              Menu
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500">
                D&amp;D Combat Tracker
              </p>
              {isEditingName ? (
                <input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleSaveFightName();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setDraftName(currentFight?.name ?? "");
                      setIsEditingName(false);
                    }
                  }}
                  autoFocus
                  className="h-9 w-full max-w-[320px] rounded-md border border-zinc-300 bg-white px-3 text-base font-semibold text-zinc-900 outline-none focus:border-zinc-400"
                />
              ) : (
                <h1
                  className="text-2xl font-semibold tracking-tight text-zinc-900"
                  onDoubleClick={() => {
                    if (!currentFight) return;
                    setDraftName(currentFight.name);
                    setIsEditingName(true);
                  }}
                >
                  {currentFight?.name ?? "No fight selected"}
                </h1>
              )}
            </div>
          </div>
          <div />
        </header>

        <section className="print-hide mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                Saved Fights
              </p>
              <p className="text-sm text-zinc-600">
                Select a past encounter or start a new one.
              </p>
            </div>
            <button
              type="button"
              onClick={handleNewFight}
              className="inline-flex h-9 items-center justify-center rounded-full bg-zinc-900 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-zinc-800"
            >
              New Fight
            </button>
            <button
              type="button"
              onClick={handleNewMockFight}
              className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-300 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-700 transition hover:border-zinc-400"
            >
              New Fight Mock
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {fights.length === 0 ? (
              <p className="text-sm text-zinc-500">No fights saved yet.</p>
            ) : (
              fights.map((fight) => (
                <div
                  key={fight.id}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                    fight.id === currentFightId
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-300 text-zinc-700 hover:border-zinc-400"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectFight(fight.id)}
                    className="text-left"
                  >
                    {fight.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteFight(fight.id)}
                    className={`ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                      fight.id === currentFightId
                        ? "text-white/80 hover:text-white"
                        : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="tracker-sheet mx-auto w-full max-w-[1122px] break-inside-avoid rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm print:mx-0 print:h-[210mm] print:w-[297mm] print:rounded-none print:border-0 print:p-0 print:shadow-none">
          {mode === "setup" ? (
            <SetupPanel
              rows={rows}
              onPersist={persistFight}
              canAddRow={canAddRow}
              onProceed={handleProceedToTable}
            />
          ) : (
            <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-[1fr_56px]">
              <div className="flex min-w-0 flex-col gap-4">
              <AttackPanel
                attackerIndex={attackerIndex}
                targetIndex={targetIndex}
                damage={damage}
                attackerCondition={attackerCondition}
                targetCondition={targetCondition}
                combatants={attackerOptions}
                targets={targetOptions}
                currentAttackerName={currentAttackerName}
                round={round}
                onAttackerChange={(value) => {
                  setAttackerIndex(value);
                  persistFight(rows, deathSaves, value, round, fightLog);
                }}
                onTargetChange={setTargetIndex}
                onDamageChange={setDamage}
                onAttackerConditionChange={setAttackerCondition}
                onTargetConditionChange={setTargetCondition}
                onApply={handleApplyAttack}
                logCount={fightLog.length}
                historyIndex={historyIndex}
                isHistory={isHistory}
                onPrev={() =>
                  setHistoryIndex((prev) =>
                    prev === null ? fightLog.length - 1 : Math.max(prev - 1, 0)
                  )
                }
                onNext={() =>
                  setHistoryIndex((prev) =>
                    prev === null
                      ? null
                      : Math.min(prev + 1, fightLog.length - 1)
                  )
                }
                onLive={() => setHistoryIndex(null)}
                logEntry={currentLogEntry}
                logAttackerName={logAttackerName}
                logTargetName={logTargetName}
              />
              <DeathSavesPanel
                deathSaves={deathSaves}
                onPersist={(nextDeathSaves) =>
                  persistFight(rows, nextDeathSaves)
                }
                disabled={!currentFightId || isLoading}
              />
              <TrackerTable
                rows={displayedRows}
                onChange={setRows}
                onPersist={persistFight}
                highlightIndex={displayedAttacker}
                targetHighlightIndex={displayedTarget}
                deadIndexSet={deadIndexSet}
                disabled={!currentFightId || isLoading || isHistory}
              />
              </div>
              <div className="hidden items-center justify-center border border-zinc-200 bg-zinc-100 text-xs font-semibold uppercase tracking-[0.5em] text-zinc-600 print:flex print:bg-white md:flex">
                <span
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                  }}
                >
                  Combat Tracker
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
        @media print {
          html,
          body {
            background: white !important;
          }
          .print-hide {
            display: none !important;
          }
          .tracker-sheet {
            width: 297mm;
            height: 210mm;
          }
        }
      `}</style>
    </div>
  );
}

type TrackerTableProps = {
  rows: TrackerRow[];
  onChange: (rows: TrackerRow[]) => void;
  onPersist: (rows: TrackerRow[]) => Promise<void>;
  highlightIndex?: number | null;
  targetHighlightIndex?: number | null;
  deadIndexSet?: Set<number>;
  disabled?: boolean;
};

type SetupPanelProps = {
  rows: TrackerRow[];
  onPersist: (rows: TrackerRow[]) => Promise<void>;
  canAddRow: boolean;
  onProceed: () => void;
};

type AttackOption = {
  value: number;
  label: string;
};

type AttackPanelProps = {
  attackerIndex: number | null;
  targetIndex: number | null;
  damage: string;
  attackerCondition: string;
  targetCondition: string;
  combatants: AttackOption[];
  targets: AttackOption[];
  currentAttackerName: string;
  round: number;
  logCount: number;
  historyIndex: number | null;
  isHistory: boolean;
  onPrev: () => void;
  onNext: () => void;
  onLive: () => void;
  logEntry: FightLogEntry | null;
  logAttackerName: string;
  logTargetName: string;
  onAttackerChange: (value: number | null) => void;
  onTargetChange: (value: number | null) => void;
  onDamageChange: (value: string) => void;
  onAttackerConditionChange: (value: string) => void;
  onTargetConditionChange: (value: string) => void;
  onApply: () => void;
};

function AttackPanel({
  attackerIndex,
  targetIndex,
  damage,
  attackerCondition,
  targetCondition,
  combatants,
  targets,
  currentAttackerName,
  round,
  logCount,
  historyIndex,
  isHistory,
  onPrev,
  onNext,
  onLive,
  logEntry,
  logAttackerName,
  logTargetName,
  onAttackerChange,
  onTargetChange,
  onDamageChange,
  onAttackerConditionChange,
  onTargetConditionChange,
  onApply,
}: AttackPanelProps) {
  const hasCombatants = combatants.length > 0;
  const historyLabel =
    historyIndex === null ? "Live" : `Step ${historyIndex + 1} / ${logCount}`;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Attack Menu
          </p>
          <p className="text-sm text-zinc-600">
            {currentAttackerName
              ? `${currentAttackerName} is attacking`
              : "Select attacker and target"}
          </p>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Round {round}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          <button
            type="button"
            onClick={onPrev}
            disabled={logCount === 0 || historyIndex === 0}
            className="rounded-full border border-zinc-300 px-3 py-1 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={logCount === 0 || historyIndex === null || historyIndex >= logCount - 1}
            className="rounded-full border border-zinc-300 px-3 py-1 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
          <button
            type="button"
            onClick={onLive}
            className="rounded-full border border-zinc-300 px-3 py-1 transition hover:border-zinc-400"
          >
            Live
          </button>
          <span>{historyLabel}</span>
        </div>
      </div>
      {logEntry ? (
        <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          Round {logEntry.round}: {logAttackerName || "Attacker"} attacked{" "}
          {logTargetName || "Target"}
          {logEntry.damage !== null ? ` for ${logEntry.damage} dmg` : ""}.
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Attacker
          <select
            value={attackerIndex ?? ""}
            onChange={(event) =>
              onAttackerChange(
                event.target.value === "" ? null : Number(event.target.value)
              )
            }
            disabled={isHistory}
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-zinc-400"
          >
            <option value="">Select attacker</option>
            {combatants.map((combatant) => (
              <option key={combatant.value} value={combatant.value}>
                {combatant.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Target
          <select
            value={targetIndex ?? ""}
            onChange={(event) =>
              onTargetChange(
                event.target.value === "" ? null : Number(event.target.value)
              )
            }
            disabled={isHistory}
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-zinc-400"
          >
            <option value="">Select target</option>
            {targets.map((combatant) => (
              <option key={combatant.value} value={combatant.value}>
                {combatant.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Damage
          <input
            value={damage}
            onChange={(event) => onDamageChange(event.target.value)}
            placeholder="0"
            disabled={isHistory}
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-zinc-400"
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Attacker Condition
          <input
            value={attackerCondition}
            onChange={(event) => onAttackerConditionChange(event.target.value)}
            placeholder="Optional"
            disabled={isHistory}
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-zinc-400"
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Target Condition
          <input
            value={targetCondition}
            onChange={(event) => onTargetConditionChange(event.target.value)}
            placeholder="Optional"
            disabled={isHistory}
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-zinc-400"
          />
        </label>
      </div>
      <div className="mt-3">
        <button
          type="button"
          onClick={onApply}
          disabled={
            isHistory ||
            !hasCombatants ||
            attackerIndex === null ||
            targetIndex === null
          }
          className="inline-flex h-9 items-center justify-center rounded-full bg-zinc-900 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply Attack
        </button>
      </div>
    </div>
  );
}

function SetupPanel({
  rows,
  onPersist,
  canAddRow,
  onProceed,
}: SetupPanelProps) {
  const [draft, setDraft] = useState<TrackerRow>({
    initiative: "",
    combatant: "",
    hp: "",
    conditions: "",
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.combatant.trim() && !draft.initiative.trim() && !draft.hp.trim() && !draft.conditions.trim()) {
      return;
    }
    if (editingIndex === null) {
      if (!canAddRow) return;
      const nextRows = [...rows, draft];
      await onPersist(nextRows);
    } else {
      const nextRows = rows.map((row, index) =>
        index === editingIndex ? draft : row
      );
      await onPersist(nextRows);
      setEditingIndex(null);
    }
    setDraft({ initiative: "", combatant: "", hp: "", conditions: "" });
  };

  const handleEdit = (index: number) => {
    setDraft(rows[index]);
    setEditingIndex(index);
  };

  const handleDelete = async (index: number) => {
    const nextRows = rows.filter((_, rowIndex) => rowIndex !== index);
    await onPersist(nextRows);
    if (editingIndex === index) {
      setDraft({ initiative: "", combatant: "", hp: "", conditions: "" });
      setEditingIndex(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500">
            Step 1
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
            Add Combatants
          </h2>
          <p className="text-sm text-zinc-600">
            Fill combatant details, then proceed to the tracker.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onProceed}
            className="inline-flex h-9 items-center justify-center rounded-full bg-zinc-900 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-zinc-800"
          >
            Proceed to Table
          </button>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="mb-6 grid gap-3">
        <input
          value={draft.combatant}
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, combatant: event.target.value }))
          }
          placeholder="Combatant name"
          className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-zinc-400"
        />
        <input
          value={draft.initiative}
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, initiative: event.target.value }))
          }
          placeholder="Initiative"
          className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-zinc-400"
        />
        <input
          value={draft.hp}
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, hp: event.target.value }))
          }
          placeholder="Hit Points"
          className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-zinc-400"
        />
        <input
          value={draft.conditions}
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, conditions: event.target.value }))
          }
          placeholder="Conditions"
          className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-zinc-400"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={!canAddRow && editingIndex === null}
            className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-300 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-700 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {editingIndex === null ? "Add Combatant" : "Update Combatant"}
          </button>
          {editingIndex !== null ? (
            <button
              type="button"
              onClick={() => {
                setEditingIndex(null);
                setDraft({
                  initiative: "",
                  combatant: "",
                  hp: "",
                  conditions: "",
                });
              }}
              className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-300 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-700 transition hover:border-zinc-400"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>
      <div className="flex-1 overflow-auto rounded-xl border border-zinc-200">
        {rows.length === 0 ? (
          <div className="p-4 text-sm text-zinc-500">No combatants yet.</div>
        ) : (
          <div className="grid divide-y divide-zinc-200 text-sm text-zinc-700">
            {rows.map((row, index) => (
              <div key={index} className="grid grid-cols-[1.2fr_0.6fr_0.6fr_1fr_auto] items-center gap-3 px-3 py-2">
                <span className="truncate font-medium text-zinc-900">
                  {row.combatant || "Untitled"}
                </span>
                <span className="truncate text-zinc-600">{row.initiative}</span>
                <span className="truncate text-zinc-600">{row.hp}</span>
                <span className="truncate text-zinc-500">{row.conditions}</span>
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em]">
                  <button
                    type="button"
                    onClick={() => handleEdit(index)}
                    className="text-zinc-500 transition hover:text-zinc-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(index)}
                    className="text-zinc-500 transition hover:text-zinc-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TrackerTable({
  rows,
  onChange,
  onPersist,
  highlightIndex,
  targetHighlightIndex,
  deadIndexSet,
  disabled,
}: TrackerTableProps) {
  const columns =
    "grid grid-cols-[48px_minmax(240px,1.2fr)_72px_80px_minmax(220px,1fr)_120px]";

  const [editing, setEditing] = useState<{
    rowIndex: number;
    key: keyof TrackerRow;
    value: string;
  } | null>(null);

  const handleCommit = async () => {
    if (!editing) return;
    const nextRows = rows.map((row, rowIndex) =>
      rowIndex === editing.rowIndex ? { ...row, [editing.key]: editing.value } : row
    );
    onChange(nextRows);
    await onPersist(nextRows);
    setEditing(null);
  };

  const handleCancel = () => {
    setEditing(null);
  };

  const sortedRows = rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const aInit = Number.parseFloat(a.row.initiative);
      const bInit = Number.parseFloat(b.row.initiative);
      const aHas = Number.isFinite(aInit);
      const bHas = Number.isFinite(bInit);

      if (aHas && bHas) {
        if (bInit !== aInit) return bInit - aInit;
        return a.index - b.index;
      }
      if (aHas) return -1;
      if (bHas) return 1;
      return a.index - b.index;
    });

  return (
    <div className="-mx-4 w-full max-w-full min-w-0 overflow-x-auto overflow-y-visible overscroll-x-contain px-4">
      <div className="w-max min-w-[900px] border border-zinc-300">
        <div
          className={`${columns} border-b border-zinc-300 bg-zinc-50 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-600`}
        >
          <div className="sticky left-0 z-10 border-r border-zinc-300 bg-zinc-50 px-2 py-2 text-center whitespace-nowrap">
            #
          </div>
          <div className="border-r border-zinc-300 px-2 py-2 whitespace-nowrap text-xs sm:text-sm">
            Combatant
          </div>
          <div className="border-r border-zinc-300 px-2 py-2 whitespace-nowrap text-xs sm:text-sm">
            Init
          </div>
          <div className="border-r border-zinc-300 px-2 py-2 whitespace-nowrap text-xs sm:text-sm">
            HP
          </div>
          <div className="border-r border-zinc-300 px-2 py-2 whitespace-nowrap text-xs sm:text-sm">
            Cond.
          </div>
          <div className="px-2 py-2 text-center whitespace-nowrap text-xs sm:text-sm">
            Actions
          </div>
        </div>
        {sortedRows.map(({ row, index }, displayIndex) => (
          <div
            key={index}
            className={`${columns} h-[36px] border-b border-zinc-300 text-sm text-zinc-800 ${
              highlightIndex === index
                ? "bg-blue-50"
                : targetHighlightIndex === index
                ? "bg-red-50"
                : deadIndexSet?.has(index)
                ? "bg-zinc-100 text-zinc-400"
                : ""
            }`}
          >
            <div className="sticky left-0 z-10 border-r border-zinc-300 bg-white px-2 py-2 text-center text-xs text-zinc-500 whitespace-nowrap">
              {displayIndex + 1}
            </div>
            <Cell
              value={
                editing?.rowIndex === index && editing.key === "combatant"
                  ? editing.value
                  : row.combatant
              }
              isEditing={editing?.rowIndex === index && editing.key === "combatant"}
              onDoubleClick={() =>
                !disabled &&
                setEditing({ rowIndex: index, key: "combatant", value: row.combatant })
              }
              onChange={(value) =>
                setEditing({ rowIndex: index, key: "combatant", value })
              }
              onCommit={handleCommit}
              onCancel={handleCancel}
            />
            <Cell
              value={
                editing?.rowIndex === index && editing.key === "initiative"
                  ? editing.value
                  : row.initiative
              }
              isEditing={editing?.rowIndex === index && editing.key === "initiative"}
              onDoubleClick={() =>
                !disabled &&
                setEditing({ rowIndex: index, key: "initiative", value: row.initiative })
              }
              onChange={(value) =>
                setEditing({ rowIndex: index, key: "initiative", value })
              }
              onCommit={handleCommit}
              onCancel={handleCancel}
            />
            <Cell
              value={
                editing?.rowIndex === index && editing.key === "hp"
                  ? editing.value
                  : row.hp
              }
              isEditing={editing?.rowIndex === index && editing.key === "hp"}
              onDoubleClick={() =>
                !disabled && setEditing({ rowIndex: index, key: "hp", value: row.hp })
              }
              onChange={(value) =>
                setEditing({ rowIndex: index, key: "hp", value })
              }
              onCommit={handleCommit}
              onCancel={handleCancel}
            />
            <Cell
              value={
                editing?.rowIndex === index && editing.key === "conditions"
                  ? editing.value
                  : row.conditions
              }
              isEditing={editing?.rowIndex === index && editing.key === "conditions"}
              onDoubleClick={() =>
                !disabled &&
                setEditing({ rowIndex: index, key: "conditions", value: row.conditions })
              }
              onChange={(value) =>
                setEditing({ rowIndex: index, key: "conditions", value })
              }
              onCommit={handleCommit}
              onCancel={handleCancel}
            />
            <div className="px-2 py-2 text-center whitespace-nowrap">
              {editing?.rowIndex === index ? (
                <div className="flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  <button
                    type="button"
                    onClick={handleCommit}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-300 text-xs text-zinc-600 transition hover:border-zinc-400"
                    aria-label="Save"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-300 text-xs text-zinc-600 transition hover:border-zinc-400"
                    aria-label="Discard"
                  >
                    ✕
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type CellProps = {
  value: string;
  isEditing: boolean;
  onDoubleClick: () => void;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
};

function Cell({
  value,
  isEditing,
  onDoubleClick,
  onChange,
  onCommit,
  onCancel,
}: CellProps) {
  return (
    <div
      className="border-r border-zinc-300 px-2 py-2"
      onDoubleClick={onDoubleClick}
    >
      {isEditing ? (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onCommit();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              onCancel();
            }
          }}
          autoFocus
          className="h-8 w-full bg-transparent text-sm outline-none"
        />
      ) : (
        <div className="h-8 w-full truncate text-sm text-zinc-800">
          {value}
        </div>
      )}
    </div>
  );
}

type DeathSavesPanelProps = {
  deathSaves: DeathSavesState;
  onPersist: (state: DeathSavesState) => Promise<void> | void;
  disabled?: boolean;
};

function DeathSavesPanel({
  deathSaves,
  onPersist,
  disabled,
}: DeathSavesPanelProps) {
  const toggleCircle = (
    character: keyof DeathSavesState,
    type: "successes" | "failures",
    index: number
  ) => {
    onPersist({
      ...deathSaves,
      [character]: {
        ...deathSaves[character],
        [type]: deathSaves[character][type].map((value, i) =>
          i === index ? !value : value
        ) as [boolean, boolean, boolean],
      },
    });
  };

  return (
    <div className="grid grid-cols-1 gap-3 border border-zinc-200 bg-zinc-100 p-3 md:grid-cols-4">
      {CHARACTER_LABELS.map((character) => (
        <div
          key={character}
          className="flex w-full min-h-[120px] border border-zinc-300 bg-white"
        >
          <div className="flex items-center justify-center border-r border-zinc-300 bg-zinc-200 px-2 text-[10px] font-semibold uppercase tracking-[0.4em] text-zinc-600">
            <span
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
              }}
            >
              {character}
            </span>
          </div>
          <div className="flex flex-1 flex-col px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-zinc-500">
              Death Saves
            </p>
            <div className="mt-2 grid gap-1 text-xs uppercase tracking-[0.3em] text-zinc-500">
              <span>Successes</span>
                <div className="flex gap-2 text-lg text-zinc-600">
                  {deathSaves[character].successes.map((filled, index) => (
                    <button
                      key={`s-${index}`}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleCircle(character, "successes", index)}
                      className="h-9 w-9 leading-none disabled:cursor-not-allowed"
                      aria-label={`${character} success ${index + 1}`}
                    >
                      {filled ? "●" : "○"}
                    </button>
                  ))}
                </div>
              <span>Failures</span>
              <div className="flex gap-2 text-lg text-zinc-600">
                {deathSaves[character].failures.map((filled, index) => (
                  <button
                    key={`f-${index}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleCircle(character, "failures", index)}
                    className="h-9 w-9 leading-none disabled:cursor-not-allowed"
                    aria-label={`${character} failure ${index + 1}`}
                  >
                    {filled ? "●" : "○"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
