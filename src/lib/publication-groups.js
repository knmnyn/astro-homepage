export function groupPublicationsBySection(publications = []) {
  const groups = new Map();

  for (const publication of publications) {
    const label = String(publication?.section || "").trim() || "Other";
    const group = groups.get(label) || [];
    group.push(publication);
    groups.set(label, group);
  }

  return Array.from(groups, ([label, items]) => ({ label, items }));
}

export function groupPublicationsBySectionWithSheet(publications = [], sheet = null) {
  const groups = groupPublicationsBySection(publications);
  const sourceRecords = Array.isArray(sheet?.records) ? sheet.records : [];

  return groups.map((group) => {
    const records = group.items
      .map((item) => sourceRecords[publications.indexOf(item)])
      .filter(Boolean);

    return {
      ...group,
      sheet: {
        ...sheet,
        records,
        row_count: records.length,
      },
    };
  });
}
