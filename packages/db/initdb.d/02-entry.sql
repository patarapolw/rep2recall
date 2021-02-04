CREATE TABLE "entry" (
  "id"              UUID NOT NULL DEFAULT uuid_generate_v1(),
  "createdAt"       TIMESTAMPTZ DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ DEFAULT now(),
  "userId"          UUID NULL REFERENCES "user"("id"),  -- instead of "user", may be binded to "library"
  PRIMARY KEY ("id")
);

CREATE TRIGGER "t_entry_updatedAt"
  BEFORE UPDATE ON "entry"
  FOR EACH ROW
  EXECUTE PROCEDURE "f_updatedAt"();

CREATE TABLE "entryRow" (
  "id"              INT GENERATED ALWAYS AS IDENTITY,
  "createdAt"       TIMESTAMPTZ DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ DEFAULT now(),
  "entryId"         UUID NOT NULL REFERENCES "entry"("id"),
  "key"             TEXT NOT NULL,
  "value"           TEXT NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("entryId", "key")
);

CREATE INDEX "idx_entryRow_value" ON "entryRow" USING pgroonga("value");

CREATE TRIGGER "t_entryRow_updatedAt"
  BEFORE UPDATE ON "entryRow"
  FOR EACH ROW
  EXECUTE PROCEDURE "f_updatedAt"();
