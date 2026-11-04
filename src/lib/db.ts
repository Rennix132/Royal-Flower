import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";

export type ImportantDateInput = {
  person: string;
  relation: string;
  date: string;
};

type ClientRow = {
  id: number;
  name: string;
  phone: string;
  card_number: string;
  consent_at: string;
  created_at: string;
};

export type AdminClient = {
  id: number;
  name: string;
  phone: string;
  cardNumber: string;
  createdAt: string;
  dates: ImportantDateInput[];
};

const globalForDatabase = globalThis as typeof globalThis & {
  royalFlowersDatabase?: Database.Database;
};

function openDatabase() {
  const databasePath = resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    process.env.DATABASE_PATH ?? "data/royal-flowers.db",
  );
  mkdirSync(dirname(databasePath), { recursive: true });

  const database = new Database(databasePath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      card_number TEXT NOT NULL UNIQUE,
      consent_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS important_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      person TEXT NOT NULL,
      relation TEXT NOT NULL,
      event_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS important_dates_client_id_idx
      ON important_dates(client_id);
  `);
  return database;
}

export function getDatabase() {
  if (!globalForDatabase.royalFlowersDatabase) {
    globalForDatabase.royalFlowersDatabase = openDatabase();
  }
  return globalForDatabase.royalFlowersDatabase;
}

export function createClient(
  name: string,
  phone: string,
  importantDates: ImportantDateInput[],
) {
  const database = getDatabase();
  const existing = database
    .prepare("SELECT * FROM clients WHERE phone = ?")
    .get(phone) as ClientRow | undefined;

  if (existing) {
    const savedDates = database
      .prepare("SELECT COUNT(*) AS count FROM important_dates WHERE client_id = ?")
      .get(existing.id) as { count: number };
    return {
      cardNumber: existing.card_number,
      name: existing.name,
      dateCount: savedDates.count,
      alreadyRegistered: true,
    };
  }

  const createdAt = new Date().toISOString();
  const cardNumber = `RF-${randomBytes(6).toString("hex").toUpperCase()}`;
  const insertClient = database.prepare(`
    INSERT INTO clients (name, phone, card_number, consent_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertDate = database.prepare(`
    INSERT INTO important_dates (client_id, person, relation, event_date, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const transaction = database.transaction(() => {
    const result = insertClient.run(
      name,
      phone,
      cardNumber,
      createdAt,
      createdAt,
    );

    for (const importantDate of importantDates) {
      insertDate.run(
        result.lastInsertRowid,
        importantDate.person,
        importantDate.relation,
        importantDate.date,
        createdAt,
      );
    }
  });
  transaction();

  return {
    cardNumber,
    name,
    dateCount: importantDates.length,
    alreadyRegistered: false,
  };
}

export function getAdminClients(): AdminClient[] {
  const database = getDatabase();
  const clients = database
    .prepare("SELECT * FROM clients ORDER BY created_at DESC")
    .all() as ClientRow[];
  const dates = database
    .prepare(`
      SELECT client_id, person, relation, event_date
      FROM important_dates
      ORDER BY event_date
    `)
    .all() as Array<{
    client_id: number;
    person: string;
    relation: string;
    event_date: string;
  }>;
  const datesByClient = new Map<number, ImportantDateInput[]>();

  for (const item of dates) {
    const clientDates = datesByClient.get(item.client_id) ?? [];
    clientDates.push({
      person: item.person,
      relation: item.relation,
      date: item.event_date,
    });
    datesByClient.set(item.client_id, clientDates);
  }

  return clients.map((client) => ({
    id: client.id,
    name: client.name,
    phone: client.phone,
    cardNumber: client.card_number,
    createdAt: client.created_at,
    dates: datesByClient.get(client.id) ?? [],
  }));
}

export function deleteClient(id: number) {
  const result = getDatabase().prepare("DELETE FROM clients WHERE id = ?").run(id);
  return result.changes > 0;
}
