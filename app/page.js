import AboutContent from '@/components/AboutContent';

export const metadata = {
  title: 'Jaemin Baek — Digital Garden',
  description: 'Android 개발자 백재민 포트폴리오 겸 기술 블로그',
};

export default function HomePage() {
  return (
    <div className="page-container">
      <AboutContent />
    </div>
  );
}
