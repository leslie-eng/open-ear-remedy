# Neon for both the database and file storage

Postgres and uploaded files (cover images, ebooks) both live on Neon: one account, one bill, and branch databases for tests. Neon's S3-compatible storage has no public buckets, so everything sits in one private bucket: ebooks download through 5-minute signed links, and cover links point at the API (`/uploads/covers/<name>`), which redirects to an hour-long signed link.

## Considered Options

- **Cloudflare R2**: the first plan. It supports public buckets and free downloads, and the storage code still works with it (set `S3_PUBLIC_URL` to serve covers directly). We picked Neon for simplicity.
- **Render's disk**: wiped on every deploy, so it is used only for local development.

## Consequences

- Every cover image load makes one quick request to the API before the browser fetches the file (cached by the browser for about an hour).
