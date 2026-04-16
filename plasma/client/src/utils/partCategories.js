export function categoryChangesDeviceColor(categoryId, categories) {
  const category = categories.find((c) => String(c.id) === String(categoryId));
  const name = category?.name?.toLowerCase() || '';
  return name === 'service pack' || name === 'frame';
}
