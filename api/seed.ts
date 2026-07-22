import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import type Database from 'better-sqlite3';
import { getDb } from './db';

type SeedRow = Record<string, string>;

function resolveDataPath(fileName: string): string {
  const candidates = [
    path.resolve(__dirname, '../data', fileName),
    path.resolve(__dirname, '../../data', fileName),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

function parseFile(csvPath: string): SeedRow[] {
  return parse(fs.readFileSync(csvPath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });
}

export function seedHotelReviews(db: Database.Database): void {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM hotel_reviews').get() as { count: number };
  if (count > 0) {
    console.log('[seed] hotel_reviews: already seeded, skipping');
    return;
  }

  const csvPath = resolveDataPath('hotel_reviews.csv');
  if (!fs.existsSync(csvPath)) {
    console.warn(`[seed] Missing file: ${csvPath}`);
    return;
  }

  const records = parseFile(csvPath);

  const stmt = db.prepare(`
    INSERT INTO hotel_reviews (
      address, categories, city, country, latitude, longitude,
      name, postal_code, province,
      review_date, review_date_added, review_do_recommend, review_id,
      review_rating, review_text, review_title,
      review_user_city, review_username, review_user_province
    ) VALUES (
      @address, @categories, @city, @country, @latitude, @longitude,
      @name, @postalCode, @province,
      @reviewDate, @reviewDateAdded, @reviewDoRecommend, @reviewId,
      @reviewRating, @reviewText, @reviewTitle,
      @reviewUserCity, @reviewUsername, @reviewUserProvince
    )
  `);

  const insertMany = db.transaction((rows: SeedRow[]) => {
    for (const r of rows) {
      stmt.run({
        address: r.address || null,
        categories: r.categories || null,
        city: r.city || null,
        country: r.country || null,
        latitude: parseFloat(r.latitude) || null,
        longitude: parseFloat(r.longitude) || null,
        name: r.name || null,
        postalCode: r.postalCode || null,
        province: r.province || null,
        reviewDate: r['reviews.date'] || null,
        reviewDateAdded: r['reviews.dateAdded'] || null,
        reviewDoRecommend: r['reviews.doRecommend'] || null,
        reviewId: r['reviews.id'] || null,
        reviewRating: parseInt(r['reviews.rating'], 10) || null,
        reviewText: r['reviews.text'] || null,
        reviewTitle: r['reviews.title'] || null,
        reviewUserCity: r['reviews.userCity'] || null,
        reviewUsername: r['reviews.username'] || null,
        reviewUserProvince: r['reviews.userProvince'] || null,
      });
    }
  });

  insertMany(records);
  console.log(`[seed] hotel_reviews: inserted ${records.length} rows`);
}

export function seedHotelReviewsDataset(db: Database.Database): void {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM hotel_reviews_dataset').get() as { count: number };
  if (count > 0) {
    console.log('[seed] hotel_reviews_dataset: already seeded, skipping');
    return;
  }

  const csvPath = resolveDataPath('hotel_reviews_dataset.csv');
  if (!fs.existsSync(csvPath)) {
    console.warn(`[seed] Missing file: ${csvPath}`);
    return;
  }

  const records = parseFile(csvPath);

  const stmt = db.prepare(`
    INSERT INTO hotel_reviews_dataset (
      original_id, date_added, date_updated, address, categories, primary_categories,
      city, country, keys, latitude, longitude, name, postal_code, province,
      review_date, review_date_seen, review_rating, review_source_urls,
      review_text, review_title, review_user_city, review_user_province,
      review_username, source_urls, websites
    ) VALUES (
      @originalId, @dateAdded, @dateUpdated, @address, @categories, @primaryCategories,
      @city, @country, @keys, @latitude, @longitude, @name, @postalCode, @province,
      @reviewDate, @reviewDateSeen, @reviewRating, @reviewSourceUrls,
      @reviewText, @reviewTitle, @reviewUserCity, @reviewUserProvince,
      @reviewUsername, @sourceUrls, @websites
    )
  `);

  const insertMany = db.transaction((rows: SeedRow[]) => {
    for (const r of rows) {
      stmt.run({
        originalId: r.id || null,
        dateAdded: r.dateAdded || null,
        dateUpdated: r.dateUpdated || null,
        address: r.address || null,
        categories: r.categories || null,
        primaryCategories: r.primaryCategories || null,
        city: r.city || null,
        country: r.country || null,
        keys: r.keys || null,
        latitude: parseFloat(r.latitude) || null,
        longitude: parseFloat(r.longitude) || null,
        name: r.name || null,
        postalCode: r.postalCode || null,
        province: r.province || null,
        reviewDate: r['reviews.date'] || null,
        reviewDateSeen: r['reviews.dateSeen'] || null,
        reviewRating: parseInt(r['reviews.rating'], 10) || null,
        reviewSourceUrls: r['reviews.sourceURLs'] || null,
        reviewText: r['reviews.text'] || null,
        reviewTitle: r['reviews.title'] || null,
        reviewUserCity: r['reviews.userCity'] || null,
        reviewUserProvince: r['reviews.userProvince'] || null,
        reviewUsername: r['reviews.username'] || null,
        sourceUrls: r.sourceURLs || null,
        websites: r.websites || null,
      });
    }
  });

  insertMany(records);
  console.log(`[seed] hotel_reviews_dataset: inserted ${records.length} rows`);
}

if (require.main === module) {
  const db = getDb();
  seedHotelReviews(db);
  seedHotelReviewsDataset(db);
  console.log('[seed] Done!');
}
