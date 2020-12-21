CREATE TABLE "noteTag" (
  "noteId"    INT NOT NULL REFERENCES "note"("id"),
  "tagId"     INT NOT NULL REFERENCES "tag"("id"),
  PRIMARY KEY ("noteId", "tagId")
);
