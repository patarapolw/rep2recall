CREATE TABLE "noteAttr" (
  "noteId"      INT NOT NULL REFERENCES "note"("id") ON UPDATE RESTRICT ON DELETE CASCADE,
  "key"         TEXT NOT NULL,
  "value"       TEXT NOT NULL,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP,
  PRIMARY KEY ("noteId", "key")
);

CREATE INDEX "noteAttr_createdAt"   ON "noteAttr"("createdAt");
CREATE INDEX "noteAttr_updatedAt"   ON "noteAttr"("updatedAt");

CREATE TRIGGER "t_noteAttr_updatedAt"
  BEFORE UPDATE ON "noteAttr"
  FOR EACH ROW
  EXECUTE PROCEDURE "f_updatedAt"();
