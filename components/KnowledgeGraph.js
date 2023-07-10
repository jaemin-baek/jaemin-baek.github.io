'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { useRouter } from 'next/navigation';
import { getCategoryColorMap, getNodeCategory } from '@/lib/graphStyle';

export default function KnowledgeGraph({ data, mini = false }) {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const router = useRouter();

    const getColors = useCallback(() => ({
        bg: '#FAF9F5',
        node: '#1A1A19',
        nodeHover: '#1A1A19',
        edge: '#D5D4D0',
        edgeHover: '#1A1A19',
        label: '#6B6B6A',
        labelHover: '#1A1A19',
        nodeInactive: '#CCCBC7',
        edgeInactive: '#EDECE8',
        hubStroke: '#FAF9F5',
    }), []);

    useEffect(() => {
        if (!data || !data.nodes.length || !svgRef.current || !containerRef.current) return;

        const colors = getColors();
        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Clear previous
        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', [0, 0, width, height]);

        // Create a group for zoom/pan
        const g = svg.append('g');

        // Zoom behavior (not for mini)
        if (!mini) {
            const zoom = d3.zoom()
                .scaleExtent([0.3, 4])
                .on('zoom', (event) => {
                    g.attr('transform', event.transform);
                });
            svg.call(zoom);
        }

        // Deep copy data for D3 mutation
        const nodes = data.nodes.map((d) => ({ ...d }));
        const links = data.links.map((d) => ({ ...d }));
        const nodesById = new Map(nodes.map((d) => [d.id, d]));
        const categoryColorMap = getCategoryColorMap(nodes);
        const groupCenters = getGroupCenters(nodes, width, height, mini);
        const getNodeFill = (d) => categoryColorMap.get(getNodeCategory(d));
        const getNodeRadius = (d) => {
            const baseRadius = mini ? 5 : 7;
            return d.hub ? baseRadius + (mini ? 3 : 5) : baseRadius;
        };
        const getLinkNodes = (d) => ({
            source: typeof d.source === 'object' ? d.source : nodesById.get(d.source),
            target: typeof d.target === 'object' ? d.target : nodesById.get(d.target),
        });
        const isSeriesLink = (d) => {
            const { source, target } = getLinkNodes(d);
            return Boolean(d.series || (source?.series && source.series === target?.series));
        };
        const getLinkStroke = (d) => {
            if (!isSeriesLink(d)) return colors.edge;
            const { source } = getLinkNodes(d);
            return source ? getNodeFill(source) : colors.edgeHover;
        };
        const getLinkWidth = (d) => isSeriesLink(d) ? (mini ? 1.8 : 2.4) : 1;
        const getLinkOpacity = (d) => isSeriesLink(d) ? 0.82 : 0.48;

        // Force simulation
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id((d) => d.id).distance(mini ? 80 : 150))
            .force('charge', d3.forceManyBody().strength(mini ? -100 : -300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('x', d3.forceX((d) => groupCenters.get(getNodeGroup(d)).x).strength(mini ? 0.05 : 0.08))
            .force('y', d3.forceY((d) => groupCenters.get(getNodeGroup(d)).y).strength(mini ? 0.05 : 0.08))
            .force('collision', d3.forceCollide().radius((d) => getNodeRadius(d) + (mini ? 15 : 32)));

        // Draw edges
        const link = g.append('g')
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('stroke', getLinkStroke)
            .attr('stroke-width', getLinkWidth)
            .attr('stroke-opacity', getLinkOpacity);

        // Draw nodes
        const node = g.append('g')
            .selectAll('circle')
            .data(nodes)
            .join('circle')
            .attr('r', getNodeRadius)
            .attr('fill', getNodeFill)
            .attr('stroke', colors.hubStroke)
            .attr('stroke-width', (d) => d.hub ? 3 : 2)
            .style('cursor', 'pointer')
            .style('transition', 'r 0.2s ease');

        // Labels
        const labelFontSize = mini ? '10px' : '12px';
        const label = g.append('g')
            .selectAll('text')
            .data(nodes)
            .join('text')
            .text((d) => d.title)
            .attr('font-family', "'Inter', sans-serif")
            .attr('font-size', labelFontSize)
            .attr('font-weight', 500)
            .attr('fill', colors.label)
            .attr('text-anchor', 'middle')
            .attr('dy', mini ? -12 : -16)
            .style('pointer-events', 'none')
            .style('user-select', 'none');

        // Interaction (not mini)
        if (!mini) {
            // Hover effects
            node
                .on('mouseover', (event, d) => {
                    const connectedIds = new Set();
                    connectedIds.add(d.id);
                    links.forEach((l) => {
                        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
                        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                        if (sourceId === d.id) connectedIds.add(targetId);
                        if (targetId === d.id) connectedIds.add(sourceId);
                    });

                    node.attr('fill', (n) => connectedIds.has(n.id) ? getNodeFill(n) : colors.nodeInactive)
                        .attr('r', (n) => n.id === d.id ? getNodeRadius(n) + 3 : (connectedIds.has(n.id) ? getNodeRadius(n) + 1 : getNodeRadius(n)));

                    link.attr('stroke', (l) => {
                        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
                        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                        return sourceId === d.id || targetId === d.id ? getLinkStroke(l) : colors.edgeInactive;
                    })
                        .attr('stroke-width', (l) => {
                            const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
                            const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                            return sourceId === d.id || targetId === d.id ? getLinkWidth(l) + 1 : 0.5;
                        });

                    label.attr('fill', (n) => connectedIds.has(n.id) ? colors.labelHover : colors.nodeInactive)
                        .attr('font-weight', (n) => n.id === d.id ? 700 : 500);
                })
                .on('mouseout', () => {
                    node.attr('fill', getNodeFill).attr('r', getNodeRadius);
                    link.attr('stroke', getLinkStroke).attr('stroke-width', getLinkWidth);
                    label.attr('fill', colors.label).attr('font-weight', 500);
                })
                .on('click', (event, d) => {
                    router.push(`/blog/${d.id}`);
                });

            // Drag behavior
            const drag = d3.drag()
                .on('start', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on('drag', (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on('end', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                });

            node.call(drag);
        }

        // Simulation tick
        simulation.on('tick', () => {
            link
                .attr('x1', (d) => d.source.x)
                .attr('y1', (d) => d.source.y)
                .attr('x2', (d) => d.target.x)
                .attr('y2', (d) => d.target.y);

            node
                .attr('cx', (d) => d.x)
                .attr('cy', (d) => d.y);

            label
                .attr('x', (d) => d.x)
                .attr('y', (d) => d.y);
        });

        // Cleanup
        return () => {
            simulation.stop();
        };
    }, [data, mini, getColors, router]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
            <svg ref={svgRef} />
        </div>
    );
}

function getGroupCenters(nodes, width, height, mini) {
    const groups = [...new Set(nodes.map(getNodeGroup))];
    const groupStats = new Map(groups.map((group) => [group, { group, latestTime: 0 }]));

    nodes.forEach((node) => {
        const group = getNodeGroup(node);
        const stat = groupStats.get(group);
        stat.latestTime = Math.max(stat.latestTime, getNodeTime(node));
    });

    const sortedGroups = [...groupStats.values()]
        .sort((a, b) => b.latestTime - a.latestTime || a.group.localeCompare(b.group))
        .map((stat) => stat.group);
    const groupCenters = new Map();

    if (sortedGroups.length === 1) {
        groupCenters.set(sortedGroups[0], { x: width / 2, y: height / 2 });
        return groupCenters;
    }

    const radiusX = width * (mini ? 0.24 : 0.32);
    const radiusY = height * (mini ? 0.20 : 0.28);

    sortedGroups.forEach((group, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / sortedGroups.length;
        groupCenters.set(group, {
            x: width / 2 + Math.cos(angle) * radiusX,
            y: height / 2 + Math.sin(angle) * radiusY,
        });
    });

    return groupCenters;
}

function getNodeGroup(node) {
    return normalizeGraphValue(node?.group || node?.category, 'Uncategorized');
}

function normalizeGraphValue(value, fallback) {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function getNodeTime(node) {
    const time = Date.parse(node?.date || '');
    return Number.isNaN(time) ? 0 : time;
}
