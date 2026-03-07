import { getGraphData } from '@/lib/posts';
import KnowledgeGraph from '@/components/KnowledgeGraph';

export const metadata = {
    title: 'Knowledge Graph — Jaemin Baek',
    description: '글 간의 연결을 시각적으로 탐색하는 인터랙티브 지식 그래프',
};

export default function GraphPage() {
    const graphData = getGraphData();

    return (
        <div className="graph-page">
            <div className="graph-container">
                <KnowledgeGraph data={graphData} mini={false} />
            </div>
            <div className="graph-info">
                {graphData.nodes.length} notes · {graphData.links.length} connections — drag to explore, click to navigate
            </div>
        </div>
    );
}
