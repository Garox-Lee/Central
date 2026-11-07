import LegalPage, { LegalSection } from '@/components/legal-page';

const sections: LegalSection[] = [
  {
    heading: 'What we collect',
    body: [
      'Account details: your first name, last name, date of birth, email and sign-in credentials, and the public ID shown on your profile.',
      'Receipt data: the receipts you create, including counterparty, amounts, instruments, dates, notes, and the confirmation, decline and amendment history.',
      'Device data: if you enable notifications, a push notification token for your device.',
    ],
  },
  {
    heading: 'How we use it',
    body: [
      'To run your account, show your receipts and positions, deliver confirmation requests to counterparties, send notifications you have enabled, keep the app secure, and fix problems.',
      'We do not sell your personal information.',
    ],
  },
  {
    heading: 'What other users can see',
    body: [
      'When you attach a counterparty to a receipt, that person can see the receipt\'s full details, along with your name and public ID. Receipts that are not attached to anyone are visible only to you.',
    ],
  },
  {
    heading: 'Biometrics',
    body: [
      'If you turn on Biometrics, fingerprint or face checks are handled by your phone\'s operating system. Central does not receive or store your biometric data.',
    ],
  },
  {
    heading: 'Notifications',
    body: [
      'Push notifications are sent through your phone platform\'s notification service. You can turn them off at any time in your phone settings.',
    ],
  },
  {
    heading: 'Where your data is stored',
    body: [
      'Your data is stored with our backend provider, Supabase, and protected with access controls and encryption in transit. No system is perfectly secure, so please use a strong, unique password.',
    ],
  },
  {
    heading: 'Sharing',
    body: [
      'Apart from counterparties you choose to share receipts with, we share data only with service providers that help us run Central (such as hosting and notification delivery), and where required by law.',
    ],
  },
  {
    heading: 'How long we keep it',
    body: [
      'We keep your data while your account is active. If you ask us to delete your account we will delete or de-identify your personal information, except where we must keep it by law or where it forms part of a confirmed receipt shared with another user.',
    ],
  },
  {
    heading: 'Your choices and rights',
    body: [
      'You can ask to access, correct or delete your personal information by contacting us. You can also change your date of birth and other profile details in the app where available.',
    ],
  },
  {
    heading: 'Changes to this policy',
    body: [
      'We may update this policy from time to time. If we make a material change we will tell you in the app.',
    ],
  },
  {
    heading: 'Contact',
    body: ['Privacy questions or requests: [PRIVACY EMAIL].'],
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="11 October 2026"
      intro="This policy explains what personal information Central collects, how it is used, and the choices you have."
      sections={sections}
    />
  );
}