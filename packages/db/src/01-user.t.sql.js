// @ts-check
const fs = require('fs')
const ejs = require('ejs')
const S = require('jsonschema-definer').default

const s = ejs.render(/* sql */ `
CREATE TABLE "user" (
  "id"              UUID NOT NULL DEFAULT uuid_generate_v1(),
  "createdAt"       TIMESTAMPTZ DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ DEFAULT now(),
  "name"            TEXT NOT NULL,
  "identifier"      TEXT NOT NULL UNIQUE,
  "quiz"            JSONB CHECK (validate_json_schema('<%- JSON.stringify(quizSchema) %>', "quiz")),
  PRIMARY KEY ("id")
);

CREATE TRIGGER "t_user_updatedAt"
  BEFORE UPDATE ON "user"
  FOR EACH ROW
  EXECUTE PROCEDURE "f_updatedAt"();

INSERT INTO "user" ("name", "identifier")
VALUES ('Default', '');
`, {
  quizSchema: S.shape({
    type: S.list(S.string()),
    stage: S.list(S.string()),
    direction: S.list(S.string()),
    includeUndue: S.boolean(),
  }).valueOf()
})

fs.writeFileSync('./initdb.d/01-user.t.sql', s)
