export type TrackerRow = {
  initiative: string;
  combatant: string;
  hp: string;
  conditions: string;
};

export type DeathSaves = {
  successes: [boolean, boolean, boolean];
  failures: [boolean, boolean, boolean];
};

export type DeathSavesState = {
  cleric: DeathSaves;
  fighter: DeathSaves;
  rogue: DeathSaves;
  wizard: DeathSaves;
};

export type FightSummary = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type FightState = FightSummary & {
  rows: TrackerRow[];
  deathSaves: DeathSavesState;
  currentAttackerIndex: number | null;
  round: number;
  log: FightLogEntry[];
};

export type FightLogEntry = {
  round: number;
  attackerIndex: number;
  targetIndex: number;
  damage: number | null;
  attackerCondition?: string;
  targetCondition?: string;
  rows: TrackerRow[];
};
