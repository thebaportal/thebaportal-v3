/**
 * Company registry for the BrainWave ingestion system.
 *
 * To add a company:
 *   1. Find their ATS slug:
 *      Greenhouse → https://boards-api.greenhouse.io/v1/boards/{slug}/jobs
 *      Lever      → https://api.lever.co/v0/postings/{slug}?mode=json
 *      If the URL returns JSON, the slug is valid.
 *   2. Add an entry below.
 *   3. No other changes needed — the adapters pick up the list automatically.
 *
 * verified: true  → slug confirmed working
 * verified: false → needs a quick check before relying on it
 */

export type ATSPlatform =
  | "greenhouse"
  | "lever"
  | "workday"       // stub — adapter not yet built
  | "smartrecruiters"
  | "icims"
  | "ashby"
  | "bamboohr"
  | "custom";

export interface CompanyConfig {
  name: string;
  slug: string;
  platform: ATSPlatform;
  /** ISO country code or "GLOBAL" for fully-remote companies */
  country: string;
  sector: string;
  verified: boolean;
}

export const COMPANIES: CompanyConfig[] = [

  // ── Greenhouse — Canadian companies ───────────────────────────────────────
  { name: "Wealthsimple",       slug: "wealthsimple",        platform: "greenhouse", country: "CA", sector: "fintech",         verified: true  },
  { name: "Clio",               slug: "clio",                platform: "greenhouse", country: "CA", sector: "legaltech",       verified: true  },
  { name: "D2L",                slug: "d2l",                 platform: "greenhouse", country: "CA", sector: "edtech",          verified: true  },
  { name: "PointClickCare",     slug: "pointclickcare",      platform: "greenhouse", country: "CA", sector: "healthtech",      verified: true  },
  { name: "Kinaxis",            slug: "kinaxis",             platform: "greenhouse", country: "CA", sector: "supply chain",    verified: true  },
  { name: "Arctic Wolf",        slug: "arcticwolf",          platform: "greenhouse", country: "CA", sector: "cybersecurity",   verified: true  },
  { name: "Hootsuite",          slug: "hootsuite",           platform: "greenhouse", country: "CA", sector: "social media",    verified: true  },
  { name: "1Password",          slug: "1password",           platform: "greenhouse", country: "CA", sector: "security",        verified: true  },
  { name: "Achievers",          slug: "achievers",           platform: "greenhouse", country: "CA", sector: "hr tech",         verified: true  },
  { name: "League",             slug: "league",              platform: "greenhouse", country: "CA", sector: "healthtech",      verified: true  },
  { name: "Ada",                slug: "ada",                 platform: "greenhouse", country: "CA", sector: "ai",              verified: true  },
  { name: "Vidyard",            slug: "vidyard",             platform: "greenhouse", country: "CA", sector: "video tech",      verified: true  },
  { name: "Top Hat",            slug: "tophat",              platform: "greenhouse", country: "CA", sector: "edtech",          verified: true  },
  { name: "Elastic Path",       slug: "elasticpath",         platform: "greenhouse", country: "CA", sector: "ecommerce",       verified: true  },
  { name: "Miovision",          slug: "miovision",           platform: "greenhouse", country: "CA", sector: "smart cities",    verified: true  },
  { name: "Trulioo",            slug: "trulioo",             platform: "greenhouse", country: "CA", sector: "identity",        verified: true  },
  { name: "AbCellera",          slug: "abcellera",           platform: "greenhouse", country: "CA", sector: "biotech",         verified: true  },
  { name: "Resolver",           slug: "resolver",            platform: "greenhouse", country: "CA", sector: "risk mgmt",       verified: true  },
  { name: "MindBridge",         slug: "mindbridge",          platform: "greenhouse", country: "CA", sector: "ai audit",        verified: true  },
  { name: "Xanadu",             slug: "xanadu",              platform: "greenhouse", country: "CA", sector: "quantum",         verified: false },
  { name: "Properly",           slug: "properly",            platform: "greenhouse", country: "CA", sector: "proptech",        verified: false },
  { name: "Borealis AI",        slug: "borealisai",          platform: "greenhouse", country: "CA", sector: "ai research",     verified: false },
  { name: "Tulip Retail",       slug: "tulip",               platform: "greenhouse", country: "CA", sector: "retail tech",     verified: false },
  { name: "Klue",               slug: "klue",                platform: "greenhouse", country: "CA", sector: "competitive intel",verified: false },
  { name: "Unbounce",           slug: "unbounce",            platform: "greenhouse", country: "CA", sector: "martech",         verified: false },
  { name: "Later",              slug: "later",               platform: "greenhouse", country: "CA", sector: "social media",    verified: false },
  { name: "Procurify",          slug: "procurify",           platform: "greenhouse", country: "CA", sector: "procurement",     verified: false },
  { name: "Invoiced",           slug: "invoiced",            platform: "greenhouse", country: "CA", sector: "fintech",         verified: false },
  { name: "Vendasta",           slug: "vendasta",            platform: "greenhouse", country: "CA", sector: "saas",            verified: false },
  { name: "INOVIO",             slug: "inovio",              platform: "greenhouse", country: "CA", sector: "healthcare",      verified: false },

  // ── Greenhouse — Global companies (remote-first or Canada offices) ──────────
  { name: "GitLab",             slug: "gitlab",              platform: "greenhouse", country: "GLOBAL", sector: "devops",       verified: true  },
  { name: "Stripe",             slug: "stripe",              platform: "greenhouse", country: "GLOBAL", sector: "fintech",      verified: true  },
  { name: "Databricks",         slug: "databricks",          platform: "greenhouse", country: "GLOBAL", sector: "data/ai",      verified: true  },
  { name: "Notion",             slug: "notion",              platform: "greenhouse", country: "GLOBAL", sector: "productivity",  verified: true  },
  { name: "HashiCorp",          slug: "hashicorp",           platform: "greenhouse", country: "GLOBAL", sector: "infrastructure",verified: false },
  { name: "Figma",              slug: "figma",               platform: "greenhouse", country: "GLOBAL", sector: "design",       verified: false },
  { name: "Benchling",          slug: "benchling",           platform: "greenhouse", country: "GLOBAL", sector: "biotech saas", verified: false },
  { name: "Okta",               slug: "okta",                platform: "greenhouse", country: "GLOBAL", sector: "identity",     verified: false },
  { name: "Twilio",             slug: "twilio",              platform: "greenhouse", country: "GLOBAL", sector: "communications",verified: false },
  { name: "Zendesk",            slug: "zendesk",             platform: "greenhouse", country: "GLOBAL", sector: "customer exp",  verified: false },

  // ── Lever — Canadian companies ─────────────────────────────────────────────
  { name: "TouchBistro",        slug: "touchbistro",         platform: "lever", country: "CA", sector: "restaurant tech", verified: true  },
  { name: "Clearco",            slug: "clearco",             platform: "lever", country: "CA", sector: "fintech",         verified: true  },
  { name: "Shopify",            slug: "shopify",             platform: "lever", country: "CA", sector: "ecommerce",       verified: false },
  { name: "BuildDirect",        slug: "builddirect",         platform: "lever", country: "CA", sector: "retail",          verified: false },
  { name: "Maple",              slug: "getmaple",            platform: "lever", country: "CA", sector: "healthtech",      verified: false },
  { name: "KOHO",               slug: "koho",                platform: "lever", country: "CA", sector: "fintech",         verified: false },
  { name: "Mysa",               slug: "mysa",                platform: "lever", country: "CA", sector: "cleantech",       verified: false },
  { name: "Ritual",             slug: "ritual",              platform: "lever", country: "CA", sector: "restaurant tech", verified: false },
  { name: "Bench Accounting",   slug: "bench",               platform: "lever", country: "CA", sector: "fintech",         verified: false },
  { name: "Float",              slug: "floatfinancial",      platform: "lever", country: "CA", sector: "fintech",         verified: false },
  { name: "FreshBooks",         slug: "freshbooks",          platform: "lever", country: "CA", sector: "saas",            verified: false },

  // ── Lever — Global companies ───────────────────────────────────────────────
  { name: "Affirm",             slug: "affirm",              platform: "lever", country: "GLOBAL", sector: "fintech",    verified: false },
  { name: "Brex",               slug: "brex",                platform: "lever", country: "GLOBAL", sector: "fintech",    verified: false },
  { name: "Intercom",           slug: "intercom",            platform: "lever", country: "GLOBAL", sector: "customer exp",verified: false },

  // ── Workday — stubs (adapter not built yet) ────────────────────────────────
  // Uncomment once WorkdayAdapter is implemented:
  // { name: "RBC",             slug: "rbc",                 platform: "workday", country: "CA", sector: "banking",      verified: false },
  // { name: "TD Bank",         slug: "tdbank",              platform: "workday", country: "CA", sector: "banking",      verified: false },
  // { name: "Deloitte Canada", slug: "deloitte",            platform: "workday", country: "CA", sector: "consulting",   verified: false },
  // { name: "KPMG Canada",     slug: "kpmg",                platform: "workday", country: "CA", sector: "consulting",   verified: false },
  // { name: "Accenture",       slug: "accenture",           platform: "workday", country: "CA", sector: "consulting",   verified: false },
  // { name: "Bell Canada",     slug: "bell",                platform: "workday", country: "CA", sector: "telecom",      verified: false },
  // { name: "Rogers",          slug: "rogers",              platform: "workday", country: "CA", sector: "telecom",      verified: false },
  // { name: "Suncor Energy",   slug: "suncor",              platform: "workday", country: "CA", sector: "energy",       verified: false },
  // { name: "Government of BC",slug: "bcgov",               platform: "workday", country: "CA", sector: "public sector",verified: false },
];
