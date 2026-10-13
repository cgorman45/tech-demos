export interface DatasetPerson {
  name: string
  title: string
  email: string
}

export interface DatasetCompany {
  name: string
  domain: string
  industry: string
  stage: string
  size: string
  hq: string
  people: DatasetPerson[]
}

export interface Suggestion {
  company: string
  role: string
}

function person(name: string, title: string, domain: string): DatasetPerson {
  const slug = name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")
  return { name, title, email: `${slug}@${domain}` }
}

export const companies: DatasetCompany[] = [
  {
    name: "Northwind Robotics",
    domain: "northwind-robotics.example",
    industry: "Industrial robots",
    stage: "Series B",
    size: "120 employees",
    hq: "Austin",
    people: [
      person("Jordan Lee", "Head of Marketing", "northwind-robotics.example"),
      person("Priya Raman", "VP Sales", "northwind-robotics.example"),
      person("Elliot Marsh", "CTO", "northwind-robotics.example"),
      person("Samira Haddad", "Head of People", "northwind-robotics.example"),
      person("Noah Berg", "Product Lead", "northwind-robotics.example"),
      person("Camille Ortiz", "Finance Lead", "northwind-robotics.example"),
    ],
  },
  {
    name: "Pinnacle Loom",
    domain: "pinnacle-loom.example",
    industry: "Textile software",
    stage: "Seed",
    size: "28 employees",
    hq: "Portland",
    people: [
      person("Avery Cho", "Head of Marketing", "pinnacle-loom.example"),
      person("Mateo Ibarra", "VP Sales", "pinnacle-loom.example"),
      person("Helen Okonkwo", "CTO", "pinnacle-loom.example"),
      person("Jules Adler", "Head of People", "pinnacle-loom.example"),
      person("Rowan Petrov", "Product Lead", "pinnacle-loom.example"),
    ],
  },
  {
    name: "Harborline Freight",
    domain: "harborline-freight.example",
    industry: "Logistics",
    stage: "Series C",
    size: "640 employees",
    hq: "Savannah",
    people: [
      person("Casey Nguyen", "Head of Marketing", "harborline-freight.example"),
      person("Imani Brooks", "VP Sales", "harborline-freight.example"),
      person("Theo Marlow", "CTO", "harborline-freight.example"),
      person("Leila Santos", "Head of People", "harborline-freight.example"),
      person("Owen Clarke", "Finance Lead", "harborline-freight.example"),
      person("Nadia Feldman", "Customer Lead", "harborline-freight.example"),
    ],
  },
  {
    name: "Lumenfield Health",
    domain: "lumenfield-health.example",
    industry: "Clinic software",
    stage: "Series A",
    size: "85 employees",
    hq: "Denver",
    people: [
      person("Riley Shah", "Head of Marketing", "lumenfield-health.example"),
      person("Diego Alvarez", "VP Sales", "lumenfield-health.example"),
      person("Mina Sato", "CTO", "lumenfield-health.example"),
      person("Parker Quinn", "Head of People", "lumenfield-health.example"),
      person("Esme Duarte", "Product Lead", "lumenfield-health.example"),
    ],
  },
  {
    name: "Copperline Analytics",
    domain: "copperline-analytics.example",
    industry: "Data tools",
    stage: "Series A",
    size: "54 employees",
    hq: "Chicago",
    people: [
      person("Skyler Bennett", "Head of Marketing", "copperline-analytics.example"),
      person("Amira Hassan", "VP Sales", "copperline-analytics.example"),
      person("Felix Navarro", "CTO", "copperline-analytics.example"),
      person("Harper Singh", "Engineering Manager", "copperline-analytics.example"),
      person("Lois Keller", "Finance Lead", "copperline-analytics.example"),
    ],
  },
  {
    name: "Bramble Pantry",
    domain: "bramble-pantry.example",
    industry: "Grocery",
    stage: "Growth",
    size: "210 employees",
    hq: "Minneapolis",
    people: [
      person("Remy Cole", "Head of Marketing", "bramble-pantry.example"),
      person("Sasha Petrov", "VP Sales", "bramble-pantry.example"),
      person("Ines Moreau", "Head of Operations", "bramble-pantry.example"),
      person("Grant Ellison", "Finance Lead", "bramble-pantry.example"),
    ],
  },
  {
    name: "Sableforge Studio",
    domain: "sableforge-studio.example",
    industry: "Design tools",
    stage: "Seed",
    size: "16 employees",
    hq: "Santa Fe",
    people: [
      person("Noa Vidal", "Head of Marketing", "sableforge-studio.example"),
      person("Eden Cho", "Design Lead", "sableforge-studio.example"),
      person("Malik Reeves", "CTO", "sableforge-studio.example"),
      person("Tessa Lang", "Product Lead", "sableforge-studio.example"),
    ],
  },
  {
    name: "Redcedar Mutual",
    domain: "redcedar-mutual.example",
    industry: "Insurance",
    stage: "Private",
    size: "400 employees",
    hq: "Des Moines",
    people: [
      person("Morgan Hale", "Head of Marketing", "redcedar-mutual.example"),
      person("Beatrice Cole", "VP Sales", "redcedar-mutual.example"),
      person("Andre Wilson", "CTO", "redcedar-mutual.example"),
      person("Priyanka Das", "Head of People", "redcedar-mutual.example"),
      person("Colin Burke", "Finance Lead", "redcedar-mutual.example"),
      person("Yara Nasser", "Customer Lead", "redcedar-mutual.example"),
    ],
  },
  {
    name: "Orbitglass Media",
    domain: "orbitglass-media.example",
    industry: "Video",
    stage: "Series A",
    size: "73 employees",
    hq: "Los Angeles",
    people: [
      person("Lane Mercer", "Head of Marketing", "orbitglass-media.example"),
      person("Sofia Reyes", "VP Sales", "orbitglass-media.example"),
      person("Jonah Adler", "CTO", "orbitglass-media.example"),
      person("Hana Ishikawa", "Product Lead", "orbitglass-media.example"),
      person("Chris Doyle", "Customer Lead", "orbitglass-media.example"),
    ],
  },
  {
    name: "Marlowe Circuit",
    domain: "marlowe-circuit.example",
    industry: "Electronics",
    stage: "Series B",
    size: "190 employees",
    hq: "Boise",
    people: [
      person("Quinn Adler", "Head of Marketing", "marlowe-circuit.example"),
      person("Fatima Noor", "VP Sales", "marlowe-circuit.example"),
      person("Leo Park", "CTO", "marlowe-circuit.example"),
      person("Greta Holm", "Engineering Manager", "marlowe-circuit.example"),
      person("Silas Nguyen", "Finance Lead", "marlowe-circuit.example"),
      person("Marta Klein", "Head of Operations", "marlowe-circuit.example"),
    ],
  },
  {
    name: "Fernwhistle Tea",
    domain: "fernwhistle-tea.example",
    industry: "Consumer goods",
    stage: "Seed",
    size: "22 employees",
    hq: "Asheville",
    people: [
      person("Ellis Ward", "Head of Marketing", "fernwhistle-tea.example"),
      person("Nia Boateng", "VP Sales", "fernwhistle-tea.example"),
      person("Hugo Pell", "Head of Operations", "fernwhistle-tea.example"),
      person("Adaeze Okeke", "Finance Lead", "fernwhistle-tea.example"),
    ],
  },
  {
    name: "Westbridge Civic",
    domain: "westbridge-civic.example",
    industry: "Govtech",
    stage: "Series A",
    size: "61 employees",
    hq: "Sacramento",
    people: [
      person("Reese Dalton", "Head of Marketing", "westbridge-civic.example"),
      person("Omar Farouk", "VP Sales", "westbridge-civic.example"),
      person("Lila Chen", "CTO", "westbridge-civic.example"),
      person("Bennett Shaw", "Head of People", "westbridge-civic.example"),
      person("Vera Sokolov", "Product Lead", "westbridge-civic.example"),
    ],
  },
]

export const suggestions: Suggestion[] = [
  { company: "Northwind Robotics", role: "Head of Marketing" },
  { company: "Lumenfield Health", role: "VP Sales" },
  { company: "Orbitglass Media", role: "CTO" },
  { company: "Harborline Freight", role: "Head of People" },
]

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase()
}

export function findCompany(query: string): DatasetCompany | undefined {
  const key = normalizeName(query)
  return companies.find(
    (company) => normalizeName(company.name) === key || normalizeName(company.domain) === key,
  )
}
