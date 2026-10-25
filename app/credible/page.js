import VeraChat from '../components/VeraChat';

export const metadata = { title: 'Is this news credible? · Fact or Feed?' };

export default function Page() {
  return <VeraChat tool="credible" />;
}
