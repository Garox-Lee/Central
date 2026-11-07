import LegalPage, { LegalSection } from '@/components/legal-page';

const sections: LegalSection[] = [
  {
    heading: 'About Central',
    body: [
      'Central is a mobile app for recording and confirming receipts, agreements and settlements between you and your counterparties, and for viewing your positions over time.',
    ],
  },
  {
    heading: 'Your account',
    body: [
      'You must provide accurate details when you sign up, including your name and date of birth, and keep them up to date.',
      'You are responsible for keeping your password and device secure, and for activity under your account. Tell us promptly if you think your account has been accessed without your permission.',
    ],
  },
  {
    heading: 'Receipts and records',
    body: [
      'A receipt is a record created by a user. Central does not verify the accuracy of any receipt and is not a party to any agreement recorded in it.',
      'When you attach a counterparty to a receipt, they can view its full details and may confirm it, decline it, or request an amendment. Declining means they do not recognise the receipt. A declined receipt is removed from the counterparty\'s view and remains with you, unattached.',
      'A confirmation applies to the exact version of the receipt the counterparty viewed. Once a receipt is confirmed, changes can only be made through an amendment request that the other party must accept.',
      'Until a receipt is confirmed, it is treated as your own personal record and you may edit or delete it.',
    ],
  },
  {
    heading: 'What Central is not',
    body: [
      'Central is a record-keeping tool. It does not hold funds, process payments, or settle transactions between users, and it does not provide financial, legal or tax advice.',
      'You are solely responsible for your dealings with your counterparties and for any decisions you make using information in the app.',
    ],
  },
  {
    heading: 'Acceptable use',
    body: [
      'You agree not to create false or misleading receipts, attach receipts to people who have not agreed to deal with you, harass other users, attempt to access other users\' data, or interfere with or reverse engineer the app.',
    ],
  },
  {
    heading: 'Notifications',
    body: [
      'If you allow notifications, Central may send push notifications about your receipts and account. You can turn these off at any time in your phone settings.',
    ],
  },
  {
    heading: 'Availability',
    body: [
      'We aim to keep Central available and accurate but do not guarantee uninterrupted or error-free service. We may change, suspend or discontinue features at any time.',
    ],
  },
  {
    heading: 'Limitation of liability',
    body: [
      'To the maximum extent permitted by law, Central is provided "as is" and we are not liable for loss arising from your use of the app, including loss resulting from inaccurate records, disputes with counterparties, or unavailability of the service.',
      'Nothing in these terms excludes rights you have under law that cannot be excluded.',
    ],
  },
  {
    heading: 'Ending your account',
    body: [
      'You may stop using Central at any time. We may suspend or close accounts that breach these terms.',
    ],
  },
  {
    heading: 'Changes to these terms',
    body: [
      'We may update these terms from time to time. If we make a material change we will tell you in the app. Continuing to use Central after a change means you accept the updated terms.',
    ],
  },
  {
    heading: 'Governing law',
    body: ['These terms are governed by the laws of [JURISDICTION].'],
  },
  {
    heading: 'Contact',
    body: ['Questions about these terms: [SUPPORT EMAIL].'],
  },
];

export default function TermsOfServiceScreen() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="11 October 2026"
      intro="These terms govern your use of Central. By creating an account or using the app you agree to them."
      sections={sections}
    />
  );
}