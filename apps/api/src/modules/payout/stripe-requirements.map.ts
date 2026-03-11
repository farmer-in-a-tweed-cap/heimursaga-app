/**
 * Maps Stripe requirement field names to user-friendly descriptions.
 */

const REQUIREMENTS_MAP: Record<string, string> = {
  // Identity
  'individual.first_name': 'Legal first name',
  'individual.last_name': 'Legal last name',
  'individual.dob.day': 'Date of birth',
  'individual.dob.month': 'Date of birth',
  'individual.dob.year': 'Date of birth',
  'individual.email': 'Email address',
  'individual.phone': 'Phone number',
  'individual.ssn_last_4': 'Last 4 digits of SSN',
  'individual.id_number': 'Government-issued ID number',
  'individual.address.line1': 'Home address',
  'individual.address.line2': 'Home address',
  'individual.address.city': 'Home address',
  'individual.address.state': 'Home address',
  'individual.address.postal_code': 'Home address',
  'individual.address.country': 'Home address',

  // Verification documents
  'individual.verification.document':
    "Identity document (e.g., passport or driver's license)",
  'individual.verification.additional_document': 'Additional identity document',

  // Business info
  'business_profile.url': 'Business website URL',
  'business_profile.mcc': 'Business category',
  'business_profile.product_description': 'Description of goods or services',
  'company.name': 'Legal business name',
  'company.tax_id': 'Business tax ID (EIN)',
  'company.address.line1': 'Business address',
  'company.address.line2': 'Business address',
  'company.address.city': 'Business address',
  'company.address.state': 'Business address',
  'company.address.postal_code': 'Business address',
  'company.address.country': 'Business address',
  'company.phone': 'Business phone number',
  'company.verification.document': 'Business verification document',

  // Banking
  external_account: 'Bank account or debit card for payouts',

  // Terms of service
  'tos_acceptance.date': 'Terms of service acceptance',
  'tos_acceptance.ip': 'Terms of service acceptance',

  // Representatives
  'representative.first_name': 'Company representative details',
  'representative.last_name': 'Company representative details',
  'representative.dob.day': 'Company representative date of birth',
  'representative.dob.month': 'Company representative date of birth',
  'representative.dob.year': 'Company representative date of birth',
  'representative.email': 'Company representative email',
  'representative.address.line1': 'Company representative address',
  'representative.address.city': 'Company representative address',
  'representative.address.state': 'Company representative address',
  'representative.address.postal_code': 'Company representative address',
  'representative.address.country': 'Company representative address',
  'representative.verification.document':
    'Company representative identity document',

  // Owners
  'owners.first_name': 'Business owner details',
  'owners.last_name': 'Business owner details',
  'owners.email': 'Business owner email',
  'owners.dob.day': 'Business owner date of birth',
  'owners.dob.month': 'Business owner date of birth',
  'owners.dob.year': 'Business owner date of birth',
  'owners.address.line1': 'Business owner address',
  'owners.address.city': 'Business owner address',
  'owners.address.state': 'Business owner address',
  'owners.address.postal_code': 'Business owner address',
  'owners.address.country': 'Business owner address',
};

/**
 * Humanize a raw Stripe requirement field name as a fallback.
 * e.g. "individual.verification.document" → "Individual verification document"
 */
function humanize(field: string): string {
  return field
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Maps an array of Stripe requirement field names to user-friendly descriptions.
 * Deduplicates results (e.g., dob.day/dob.month/dob.year all map to "Date of birth").
 */
export function mapRequirementsToFriendly(requirements: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const req of requirements) {
    const friendly = REQUIREMENTS_MAP[req] || humanize(req);
    if (!seen.has(friendly)) {
      seen.add(friendly);
      result.push(friendly);
    }
  }

  return result;
}
