import VeraChat from '../components/VeraChat';

export const metadata = { title: 'Is this photo AI? · Fact or Feed?' };

export default function Page() {
  return <VeraChat tool="photo" />;
}
