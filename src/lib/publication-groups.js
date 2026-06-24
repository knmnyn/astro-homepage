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
