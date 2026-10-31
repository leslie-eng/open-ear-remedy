import { query } from '../db.js';

const minorToMajor = (n) => Math.round(Number(n) || 0) / 100;

/** Public view of a products row (never includes the private file location). */
export function mapEbook(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    author: row.author,
    description: row.description,
    short_description: row.short_description,
    category: row.category,
    price: Number(row.price),
    currency: row.currency,
    cover_image_url: row.cover_image_url,
    file_format: row.file_format,
    file_size: Number(row.file_size) || 0,
    publication_date: row.publication_date,
    is_active: row.is_active,
    created_at: row.created_at,
  };
}

export function mapAdminEbook(row) {
  return {
    ...mapEbook(row),
    file_url: row.file_url,
    purchase_count: Number(row.purchase_count) || 0,
  };
}

export async function mapOrders(orderRows) {
  if (orderRows.length === 0) return [];
  const { rows: items } = await query(
    `SELECT order_id, product_id, title, price_amount FROM ebook_order_items WHERE order_id = ANY($1)`,
    [orderRows.map((o) => o.id)],
  );
  return orderRows.map((o) => ({
    reference: o.reference,
    status: o.status,
    total: minorToMajor(o.total_amount),
    currency: o.currency,
    created_at: o.created_at,
    completed_at: o.completed_at,
    items: items
      .filter((i) => i.order_id === o.id)
      .map((i) => ({ ebook_id: i.product_id, title: i.title, price: minorToMajor(i.price_amount) })),
  }));
}
