CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION pgroonga;
CREATE EXTENSION "postgres-json-schema";

CREATE OR REPLACE FUNCTION "f_updatedAt"()   
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = now();
    RETURN NEW;   
END;
$$ language 'plpgsql';

CREATE TABLE "user" (
  "id"              UUID NOT NULL DEFAULT uuid_generate_v1(),
  "createdAt"       TIMESTAMPTZ DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ DEFAULT now(),
  "name"            TEXT NOT NULL,
  "identifier"      TEXT NOT NULL UNIQUE,
  "apiKey.wanikani" TEXT,
  "quiz"            JSONB,
  "sentence"        JSONB,
  PRIMARY KEY ("id")
);

CREATE TRIGGER "t_user_updatedAt"
  BEFORE UPDATE ON "user"
  FOR EACH ROW
  EXECUTE PROCEDURE "f_updatedAt"();

CREATE TABLE "entry" (
  "id"                UUID NOT NULL DEFAULT uuid_generate_v1(),
  "createdAt"         TIMESTAMPTZ DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ DEFAULT now(),
  "userId"            UUID NOT NULL REFERENCES "user"("id"),
  "data"              JSONB NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX "idx_entry_updatedAt" ON "entry" ("updatedAt");
CREATE INDEX "idx_entry_userId" ON "entry" ("userId");
CREATE INDEX "idx_entry_data" ON "entry" USING pgroonga("data");

CREATE TRIGGER "t_entry_updatedAt"
  BEFORE UPDATE ON "entry"
  FOR EACH ROW
  EXECUTE PROCEDURE "f_updatedAt"();

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

CREATE TABLE "library" (
  "id"                UUID NOT NULL DEFAULT uuid_generate_v1(),
  "createdAt"         TIMESTAMPTZ DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ DEFAULT now(),
  "data"              JSONB NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX "idx_library_updatedAt" ON "library" ("updatedAt");
CREATE INDEX "idx_library_data" ON "library" USING pgroonga("data");

CREATE TRIGGER "t_library_updatedAt"
  BEFORE UPDATE ON "library"
  FOR EACH ROW
  EXECUTE PROCEDURE "f_updatedAt"();
