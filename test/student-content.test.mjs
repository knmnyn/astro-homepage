import assert from "node:assert/strict";
import test from "node:test";

import { siteData } from "../src/lib/site-data.js";

test("student items expose title, avatar, and url fields from the sheet", () => {
  const firstStudent = siteData.students[0];

  assert.ok(firstStudent);
  assert.equal(firstStudent.title, "Yajing Yang");
  assert.equal(firstStudent.avatar.includes("/author/yajing-yang/"), true);
  assert.equal(firstStudent.url, "https://wing.comp.nus.edu.sg/author/yajing-yang/");
});

test("student cohort items use title instead of name for display", () => {
  assert.equal(siteData.students.some((item) => item.name && item.name !== item.title), false);
});

