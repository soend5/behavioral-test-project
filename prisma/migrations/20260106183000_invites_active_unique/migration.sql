-- Invariants for production hardening

-- Only 1 active invite per customer + version (avoid concurrent double-active)
-- If historical dirty data exists, keep the latest one and expire the rest before adding the index.
WITH ranked AS (
  SELECT
    "id",
    "customer_id",
    "version",
    ROW_NUMBER() OVER (
      PARTITION BY "customer_id", "version"
      ORDER BY "created_at" DESC
    ) AS rn
  FROM "invites"
  WHERE "status" = 'active'
)
UPDATE "invites" AS i
SET "status" = 'expired'
FROM ranked r
WHERE i."id" = r."id" AND r.rn > 1;

CREATE UNIQUE INDEX "invites_customer_id_version_active_key"
  ON "invites"("customer_id", "version")
  WHERE "status" = 'active';

