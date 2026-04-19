export function getUserInitials(fullName: string): string {
  const [firstName = '', lastName = ''] = fullName.split(' ');
  const first = firstName.trim().charAt(0).toUpperCase();
  const last = lastName.trim().charAt(0).toUpperCase();
  return `${first}${last}`;
}
