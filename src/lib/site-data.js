import profileSheet from "../generated/content-sources/profile.json" with { type: "json" };
import navSheet from "../generated/content-sources/nav.json" with { type: "json" };
import publicationsSheet from "../generated/content-sources/publications.json" with { type: "json" };
import teachingSheet from "../generated/content-sources/teaching.json" with { type: "json" };
import studentsSheet from "../generated/content-sources/students.json" with { type: "json" };
import talksSheet from "../generated/content-sources/talks.json" with { type: "json" };
import grantsSheet from "../generated/content-sources/grants.json" with { type: "json" };
import softwareSheet from "../generated/content-sources/software.json" with { type: "json" };
import serviceSheet from "../generated/content-sources/service.json" with { type: "json" };
import personalLinksSheet from "../generated/content-sources/personal-links.json" with { type: "json" };
import { stripMetricMarker } from "./sheet-metrics.js";
import { collectSheetUrlLinks } from "./url-links.js";

function fieldValue(record, fieldName) {
  const target = stripMetricMarker(fieldName).toLowerCase();
  for (const [key, value] of Object.entries(record ?? {})) {
    if (stripMetricMarker(key).toLowerCase() === target) {
      return value;
    }
  }
  return "";
}

function records(sheet) {
  return Array.isArray(sheet?.records) ? sheet.records : [];
}

function profileMap() {
  const map = {};
  for (const record of records(profileSheet)) {
    const field = fieldValue(record, "Field");
    const value = fieldValue(record, "Value");
    if (field) {
      map[field] = value;
    }
  }
  return map;
}

function navItems() {
  return records(navSheet)
    .map((record) => ({
      id: fieldValue(record, "ID"),
      navHeader: fieldValue(record, "Nav Header"),
      header: fieldValue(record, "Header"),
      order: fieldValue(record, "Order"),
      path: fieldValue(record, "Slug / Path"),
      visible: fieldValue(record, "Visible"),
      notes: fieldValue(record, "Notes"),
      summary: fieldValue(record, "Summary"),
      intro: fieldValue(record, "Intro"),
      kicker: fieldValue(record, "Kicker"),
      trailer: fieldValue(record, "Trailer"),
    }))
    .filter((item) => item.id);
}

function publicationItems() {
  return records(publicationsSheet).map((record) => ({
    id: fieldValue(record, "ID"),
    section: fieldValue(record, "Section"),
    year: fieldValue(record, "Year"),
    type: fieldValue(record, "Type"),
    area: fieldValue(record, "Area"),
    authors: fieldValue(record, "Authors"),
    title: fieldValue(record, "Title"),
    venue: fieldValue(record, "Venue"),
    volume: fieldValue(record, "Volume"),
    issue: fieldValue(record, "Issue"),
    pages: fieldValue(record, "Pages"),
    doi: fieldValue(record, "DOI"),
    url: fieldValue(record, "URL"),
    pdfUrl: fieldValue(record, "PDF URL"),
    slidesUrl: fieldValue(record, "Slides URL"),
    award: fieldValue(record, "Award"),
    status: fieldValue(record, "Status"),
    sort: fieldValue(record, "Sort"),
    notes: fieldValue(record, "Notes"),
    sourceUrl: fieldValue(record, "Source URL"),
    links: collectSheetUrlLinks(record),
  }));
}

function teachingItems() {
  return records(teachingSheet).map((record) => ({
    id: fieldValue(record, "ID"),
    academicYear: fieldValue(record, "Academic Year"),
    term: fieldValue(record, "Term"),
    courseCode: fieldValue(record, "Course Code"),
    courseTitle: fieldValue(record, "Course Title"),
    role: fieldValue(record, "Role"),
    level: fieldValue(record, "Level"),
    section: fieldValue(record, "Section"),
    url: fieldValue(record, "URL"),
    notes: fieldValue(record, "Notes"),
    links: collectSheetUrlLinks(record),
  }));
}

function studentItems() {
  return records(studentsSheet).map((record) => ({
    id: fieldValue(record, "ID"),
    cohort: fieldValue(record, "Cohort"),
    level: fieldValue(record, "Level"),
    title: fieldValue(record, "Title"),
    name: fieldValue(record, "Title"),
    role: fieldValue(record, "Role"),
    avatar: fieldValue(record, "Avatar"),
    url: fieldValue(record, "URL"),
    interests: fieldValue(record, "Research Interests"),
    profileUrl: fieldValue(record, "URL"),
    status: fieldValue(record, "Status"),
    links: collectSheetUrlLinks(record),
  }));
}

function talkItems() {
  return records(talksSheet).map((record, index) => ({
    id: fieldValue(record, "ID"),
    sort: fieldValue(record, "Sort"),
    role: fieldValue(record, "Role"),
    recordType: fieldValue(record, "Record Type"),
    title: fieldValue(record, "Title"),
    event: fieldValue(record, "Event"),
    location: fieldValue(record, "Location"),
    date: fieldValue(record, "Date"),
    slidesUrl: fieldValue(record, "Slides URL"),
    videoUrl: fieldValue(record, "Video") || fieldValue(record, "Video URL"),
    notes: fieldValue(record, "Notes"),
    sourceIndex: index,
    links: collectSheetUrlLinks(record),
  }));
}

function grantItems() {
  return records(grantsSheet).map((record) => ({
    id: fieldValue(record, "ID"),
    startYear: fieldValue(record, "Start Year"),
    endYear: fieldValue(record, "End Year"),
    recordType: fieldValue(record, "Record Type"),
    title: fieldValue(record, "Title"),
    role: fieldValue(record, "Role"),
    sponsor: fieldValue(record, "Sponsor"),
    amount: fieldValue(record, "Amount"),
    currency: fieldValue(record, "Currency"),
    url: fieldValue(record, "URL"),
    notes: fieldValue(record, "Notes"),
    links: collectSheetUrlLinks(record),
  }));
}

function softwareItems() {
  return records(softwareSheet).map((record) => ({
    id: fieldValue(record, "ID"),
    name: fieldValue(record, "Name"),
    description: fieldValue(record, "Description"),
    repoUrl: fieldValue(record, "Repo URL"),
    docsUrl: fieldValue(record, "Docs URL"),
    status: fieldValue(record, "Status"),
    tags: fieldValue(record, "Tags"),
    featured: fieldValue(record, "Featured"),
    links: collectSheetUrlLinks(record),
  }));
}

function serviceItems() {
  return records(serviceSheet).map((record) => ({
    id: fieldValue(record, "ID"),
    startYear: fieldValue(record, "Start Year"),
    endYear: fieldValue(record, "End Year"),
    category: fieldValue(record, "Category"),
    role: fieldValue(record, "Role"),
    organization: fieldValue(record, "Organization"),
    description: fieldValue(record, "Description"),
    url: fieldValue(record, "URL"),
    links: collectSheetUrlLinks(record),
  }));
}

function personalLinkItems() {
  return records(personalLinksSheet).map((record) => ({
    id: fieldValue(record, "ID"),
    label: fieldValue(record, "Label"),
    category: fieldValue(record, "Category"),
    description: fieldValue(record, "Description"),
    url: fieldValue(record, "URL"),
    featured: fieldValue(record, "Featured"),
    links: collectSheetUrlLinks(record),
  }));
}

export const siteData = {
  profile: profileMap(),
  navItems: navItems(),
  sources: {
    profile: profileSheet,
    nav: navSheet,
    publications: publicationsSheet,
    teaching: teachingSheet,
    students: studentsSheet,
    talks: talksSheet,
    grants: grantsSheet,
    software: softwareSheet,
    service: serviceSheet,
    personalLinks: personalLinksSheet,
  },
  publications: publicationItems(),
  teaching: teachingItems(),
  students: studentItems(),
  talks: talkItems(),
  grants: grantItems(),
  software: softwareItems(),
  service: serviceItems(),
  personalLinks: personalLinkItems(),
};
