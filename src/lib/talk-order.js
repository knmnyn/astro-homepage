function sortValue(value) {
  const parsed = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function sortTalkItems(items) {
  return [...(Array.isArray(items) ? items : [])].sort((left, right) => {
    const leftSort = sortValue(left?.sort);
    const rightSort = sortValue(right?.sort);
    const leftHasSort = leftSort !== null;
    const rightHasSort = rightSort !== null;

    if (leftHasSort && rightHasSort && leftSort !== rightSort) {
      return leftSort - rightSort;
    }

    if (leftHasSort !== rightHasSort) {
      return leftHasSort ? -1 : 1;
    }

    return Number(left?.sourceIndex ?? 0) - Number(right?.sourceIndex ?? 0);
  });
}
