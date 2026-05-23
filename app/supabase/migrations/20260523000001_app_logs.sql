-- Internal debug logging table for diagnosing issues
CREATE TABLE IF NOT EXISTS app_logs (
  id          bigserial PRIMARY KEY,
  context     text NOT NULL,           -- e.g. 'rank-batch', 'import-refresh'
  level       text NOT NULL DEFAULT 'info',  -- 'info' | 'warn' | 'error'
  message     text NOT NULL,
  data        jsonb DEFAULT '{}',
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_logs_context ON app_logs(context);
CREATE INDEX IF NOT EXISTS idx_app_logs_created  ON app_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_level    ON app_logs(level);

-- Keep only last 1000 rows per context (trimmed on insert via trigger)
CREATE OR REPLACE FUNCTION trim_app_logs() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM app_logs
  WHERE id IN (
    SELECT id FROM app_logs
    WHERE context = NEW.context
    ORDER BY created_at DESC
    OFFSET 500
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_trim_app_logs
  AFTER INSERT ON app_logs
  FOR EACH ROW EXECUTE FUNCTION trim_app_logs();

-- Allow service role full access (used by getAuth bypass)
ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access" ON app_logs USING (true) WITH CHECK (true);
