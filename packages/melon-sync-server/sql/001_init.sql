-- Monotonic server clock (ms) — returned as pull timestamp
CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY,
  value BIGINT NOT NULL
);
INSERT INTO sync_meta (key, value) VALUES ('clock', 0) ON CONFLICT DO NOTHING;

-- Reference tasks collection
CREATE TABLE IF NOT EXISTS sync_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  server_created_at BIGINT NOT NULL,
  server_updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS sync_tasks_updated_at_idx ON sync_tasks (server_updated_at);

-- Tombstones for deletions
CREATE TABLE IF NOT EXISTS sync_tombstones (
  collection TEXT NOT NULL,
  record_id TEXT NOT NULL,
  deleted_at BIGINT NOT NULL,
  PRIMARY KEY (collection, record_id)
);
CREATE INDEX IF NOT EXISTS sync_tombstones_deleted_at_idx ON sync_tombstones (deleted_at);
