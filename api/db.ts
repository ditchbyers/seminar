import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.basename(__dirname) === 'dist'
  ? path.resolve(__dirname, '..', 'hotel_reviews.db')
  : path.join(__dirname, 'hotel_reviews.db');
let db: Database.Database | undefined;

function createTables(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS hotel_reviews (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      address        TEXT,
      categories     TEXT,
      city           TEXT,
      country        TEXT,
      latitude       REAL,
      longitude      REAL,
      name           TEXT,
      postal_code    TEXT,
      province       TEXT,
      review_date           TEXT,
      review_date_added     TEXT,
      review_do_recommend   TEXT,
      review_id             TEXT,
      review_rating         INTEGER,
      review_text           TEXT,
      review_title          TEXT,
      review_user_city      TEXT,
      review_username       TEXT,
      review_user_province  TEXT
    );

    CREATE TABLE IF NOT EXISTS hotel_reviews_dataset (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      original_id         TEXT,
      date_added          TEXT,
      date_updated        TEXT,
      address             TEXT,
      categories          TEXT,
      primary_categories  TEXT,
      city                TEXT,
      country             TEXT,
      keys                TEXT,
      latitude            REAL,
      longitude           REAL,
      name                TEXT,
      postal_code         TEXT,
      province            TEXT,
      review_date         TEXT,
      review_date_seen    TEXT,
      review_rating       INTEGER,
      review_source_urls  TEXT,
      review_text         TEXT,
      review_title        TEXT,
      review_user_city    TEXT,
      review_user_province TEXT,
      review_username     TEXT,
      source_urls         TEXT,
      websites            TEXT
    );
  `);
}

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    createTables(db);
  }

  return db;
}
