export function validateName(name: string) {
  if (!name) {
    return 'name is required'
  }
  if (name.includes('.')) {
    return 'name cannot include an extension'
  }
  if (name.includes(' ')) {
    return 'name cannot include spaces'
  }
  if (!/^[a-z0-9-]+$/.test(name)) {
    return 'name must be lowercase and contain only letters, numbers, and dashes'
  }
  return true
}
