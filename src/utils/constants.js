export const ROLE_BASED_ACCESS_CONTROL = [
  { "name": "Superadmin", "permissions": ["view","upload","edit","delete","download"] },
  { "name": "Department Admin", "permissions": ["view","upload","edit","delete"] },
  { "name": "Team Member", "permissions": ["view","upload","download"] },
  { "name": "Member Bank", "permissions": ["view","download"] },
  { "name": "Public User", "permissions": ["view"] }
]

