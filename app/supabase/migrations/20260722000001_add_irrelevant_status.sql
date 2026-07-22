-- Add 'irrelevant' status for jobs filtered by keyword cleanup
ALTER TABLE jobs
  DROP CONSTRAINT jobs_status_check;

ALTER TABLE jobs
  ADD CONSTRAINT jobs_status_check CHECK (status IN (
    'imported', 'ranked', 'shortlisted', 'documents_generated',
    'applied', 'interview', 'offer', 'rejected', 'withdrawn', 'skipped', 'error', 'irrelevant'
  ));
