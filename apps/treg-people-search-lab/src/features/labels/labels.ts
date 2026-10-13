export interface Labels {
  title: string
  companyColumn: string
  peopleColumn: string
  emailColumn: string
  providers: Record<string, string>
}

export const defaultLabels: Labels = {
  title: "People Search",
  companyColumn: "Company",
  peopleColumn: "People",
  emailColumn: "Emails",
  providers: {
    crustdata: "Crustdata",
    apollo: "Apollo",
    hunter: "Hunter",
    kitt: "Kitt",
    trykitt: "Kitt",
    tomba: "Tomba",
    bounceban: "BounceBan",
    pdl: "People Data Labs",
    leadmagic: "LeadMagic",
    treg: "Treg",
  },
}

export function providerLabel(labels: Labels, providerId: string): string {
  const named = labels.providers[providerId]
  if (named && named.trim()) return named
  if (!providerId) return "Provider"
  return providerId.charAt(0).toUpperCase() + providerId.slice(1)
}

export function capabilityLabel(capability: string): string {
  switch (capability) {
    case "companies.enrich":
      return "enrich"
    case "people.search":
      return "search"
    case "people.email.find":
      return "email find"
    case "email.verify":
      return "verify"
    default:
      return capability
  }
}
