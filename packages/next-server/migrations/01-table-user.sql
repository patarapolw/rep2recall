-- DROP TABLE IF EXISTS "user";
CREATE TABLE "user" (
  "id"        UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  "email"     TEXT NOT NULL UNIQUE,
  "name"      TEXT NOT NULL,
  "image"     TEXT NOT NULL,
  "apiKey"    TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP
);

CREATE INDEX "user_createdAt" ON "user"("createdAt");
CREATE INDEX "user_updatedAt" ON "user"("updatedAt");

-- DROP TRIGGER IF EXISTS "t_user_updatedAt" ON "user";
CREATE TRIGGER "t_user_updatedAt"
  BEFORE UPDATE ON "user"
  FOR EACH ROW
  EXECUTE PROCEDURE "f_updatedAt"();
