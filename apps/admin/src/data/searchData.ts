type SearchData = {
  id: string
  name: string
  url: string
  icon: string
  section: string
  shortcut?: string
}

const data: SearchData[] = [
  {
    id: '1',
    name: 'Tenants',
    url: '/admin/tenants',
    icon: 'ri-building-line',
    section: 'Admin'
  },
  {
    id: '2',
    name: 'Audit Log',
    url: '/admin/audit',
    icon: 'ri-file-list-line',
    section: 'Admin'
  },
  {
    id: '3',
    name: 'Dashboard',
    url: '/admin',
    icon: 'ri-home-line',
    section: 'Admin'
  }
]

export default data