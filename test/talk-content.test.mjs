import assert from "node:assert/strict";
import test from "node:test";

import { siteData } from "../src/lib/site-data.js";

test("talk items map the talks sheet video field into data", () => {
  const talkWithVideo = siteData.talks.find((item) => item.videoUrl);

  assert.ok(talkWithVideo);
  assert.equal(talkWithVideo.videoUrl.startsWith("https://www.youtube.com/embed/"), true);
});

test("talk items preserve video links as labeled card links", () => {
  const talkWithVideo = siteData.talks.find((item) => item.links.some((link) => link.label === "Video"));

  assert.ok(talkWithVideo);
  assert.equal(
    talkWithVideo.links.some((link) => link.label === "Video" && link.href === talkWithVideo.videoUrl),
    true,
  );
});

