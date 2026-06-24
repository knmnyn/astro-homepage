import profileSheet from "../generated/content-sources/profile.json";
import navSheet from "../generated/content-sources/nav.json";
import publicationsSheet from "../generated/content-sources/publications.json";
import teachingSheet from "../generated/content-sources/teaching.json";
import studentsSheet from "../generated/content-sources/students.json";
import talksSheet from "../generated/content-sources/talks.json";
import grantsSheet from "../generated/content-sources/grants.json";
import softwareSheet from "../generated/content-sources/software.json";
import serviceSheet from "../generated/content-sources/service.json";
import personalLinksSheet from "../generated/content-sources/personal-links.json";

function fieldValue(record, fieldName) {
  const target = String(fieldName).toLowerCase();
  for (const [key, value] of Object.entries(record ?? {})) {
    if (key.toLowerCase() === target) {
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
      label: fieldValue(record, "Label"),
      path: fieldValue(record, "Slug / Path"),
      visible: fieldValue(record, "Visible"),
      notes: fieldValue(record, "Notes"),
    }))
    .filter((item) => item.id && item.visible !== "no");
}

function publicationItems() {
  return records(publicationsSheet).map((record) => ({
    id: fieldValue(record, "ID"),
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
  }));
}

function studentItems() {
  return records(studentsSheet).map((record) => ({
    id: fieldValue(record, "ID"),
    cohort: fieldValue(record, "Cohort"),
    level: fieldValue(record, "Level"),
    name: fieldValue(record, "Name"),
    role: fieldValue(record, "Role"),
    interests: fieldValue(record, "Research Interests"),
    profileUrl: fieldValue(record, "Profile URL"),
    status: fieldValue(record, "Status"),
  }));
}

function talkItems() {
  return records(talksSheet).map((record) => ({
    id: fieldValue(record, "ID"),
    date: fieldValue(record, "Date"),
    year: fieldValue(record, "Year"),
    type: fieldValue(record, "Type"),
    title: fieldValue(record, "Title"),
    event: fieldValue(record, "Event"),
    venue: fieldValue(record, "Venue"),
    location: fieldValue(record, "Location"),
    notes: fieldValue(record, "Notes"),
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
    notes: fieldValue(record, "Notes"),
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
  }));
}

export const siteData = {
  profile: profileMap(),
  navItems: navItems(),
  publications: publicationItems(),
  teaching: teachingItems(),
  students: studentItems(),
  talks: talkItems(),
  grants: grantItems(),
  software: softwareItems(),
  service: serviceItems(),
  personalLinks: personalLinkItems(),
};
