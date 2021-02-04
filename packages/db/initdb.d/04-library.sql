CREATE TABLE "library" (
  "id"                UUID NOT NULL DEFAULT uuid_generate_v1(),
  "createdAt"         TIMESTAMPTZ DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ DEFAULT now(),
  "title"             TEXT NOT NULL,
  "description"       TEXT,
  "entries"           UUID[] NOT NULL, -- many2many
  PRIMARY KEY ("id")
);

CREATE INDEX "idx_library_updatedAt" ON "library" ("updatedAt");

CREATE TRIGGER "t_library_updatedAt"
  BEFORE UPDATE ON "library"
  FOR EACH ROW
  EXECUTE PROCEDURE "f_updatedAt"();
