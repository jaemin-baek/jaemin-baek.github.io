import AboutContent from '@/components/AboutContent';

export const metadata = {
    title: 'About — Digital Garden',
    description: 'Android 개발자 백재민 소개',
};

export default function AboutPage() {
    return (
        <div className="page-container">
            <AboutContent />
        </div>
    );
}
