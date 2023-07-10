import { getGraphData } from '@/lib/posts';
import { getCategoryColorMap } from '@/lib/graphStyle';
import KnowledgeGraph from '@/components/KnowledgeGraph';

export const metadata = {
    title: 'Knowledge Graph — Digital Garden',
    description: '글 간의 연결을 시각적으로 탐색하는 인터랙티브 지식 그래프',
};

export default function GraphPage() {
    const graphData = getGraphData();

    return (
        <div className="graph-page">
            <div className="graph-container">
                <KnowledgeGraph data={graphData} mini={false} />
            </div>
            <GraphLegend nodes={graphData.nodes} />
            <div className="graph-info">
                {graphData.nodes.length} notes · {graphData.links.length} connections — drag to explore, click to navigate
            </div>
        </div>
    );
}

function GraphLegend({ nodes }) {
    const categoryColorMap = getCategoryColorMap(nodes);
    const categories = [...categoryColorMap.keys()];

    return (
        <div className="graph-legend" aria-label="Graph category colors">
            {categories.map((category) => (
                <span key={category} className="graph-legend-item">
                    <span
                        className="graph-legend-swatch"
                        style={{ backgroundColor: categoryColorMap.get(category) }}
                        aria-hidden="true"
                    />
                    {category}
                </span>
            ))}
        </div>
    );
}
