CREATE TABLE "quiz" (
  "id"              UUID NOT NULL DEFAULT uuid_generate_v1(),
  "createdAt"       TIMESTAMPTZ DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ DEFAULT now(),
  "userId"          UUID NOT NULL REFERENCES "user"("id"),
  "entryId"         UUID NOT NULL REFERENCES "entry"("id"),
  "direction"       TEXT NOT NULL,
  "srsLevel"        INT,
  "nextReview"      TIMESTAMPTZ,
  "lastRight"       TIMESTAMPTZ,
  "lastWrong"       TIMESTAMPTZ,
  "rightStreak"     INT,
  "wrongStreak"     INT,
  "maxRight"        INT,
  "maxWrong"        INT,
  PRIMARY KEY ("id"),
  UNIQUE ("userId", "entryId", "direction")
);

CREATE INDEX "idx_quiz_srsLevel" ON "quiz" ("srsLevel");
CREATE INDEX "idx_quiz_nextReview" ON "quiz" ("nextReview");
CREATE INDEX "idx_quiz_lastRight" ON "quiz" ("lastRight");
CREATE INDEX "idx_quiz_lastWrong" ON "quiz" ("lastWrong");
CREATE INDEX "idx_quiz_rightStreak" ON "quiz" ("rightStreak");
CREATE INDEX "idx_quiz_wrongStreak" ON "quiz" ("wrongStreak");
CREATE INDEX "idx_quiz_maxRight" ON "quiz" ("maxRight");
CREATE INDEX "idx_quiz_maxWrong" ON "quiz" ("maxWrong");

CREATE TRIGGER "t_quiz_updatedAt"
  BEFORE UPDATE ON "quiz"
  FOR EACH ROW
  EXECUTE PROCEDURE "f_updatedAt"();
