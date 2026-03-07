'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { useRouter } from 'next/navigation';

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

        // Force simulation
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id((d) => d.id).distance(mini ? 80 : 150))
            .force('charge', d3.forceManyBody().strength(mini ? -100 : -300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(mini ? 20 : 40));

        // Draw edges
        const link = g.append('g')
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('stroke', colors.edge)
            .attr('stroke-width', 1)
            .attr('stroke-opacity', 0.6);

        // Draw nodes
        const nodeRadius = mini ? 5 : 7;
        const node = g.append('g')
            .selectAll('circle')
            .data(nodes)
            .join('circle')
            .attr('r', nodeRadius)
            .attr('fill', colors.node)
            .attr('stroke', colors.bg)
            .attr('stroke-width', 2)
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

                    node.attr('fill', (n) => connectedIds.has(n.id) ? colors.nodeHover : colors.nodeInactive)
                        .attr('r', (n) => n.id === d.id ? nodeRadius + 3 : (connectedIds.has(n.id) ? nodeRadius + 1 : nodeRadius));

                    link.attr('stroke', (l) => {
                        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
                        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                        return sourceId === d.id || targetId === d.id ? colors.edgeHover : colors.edgeInactive;
                    })
                        .attr('stroke-width', (l) => {
                            const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
                            const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                            return sourceId === d.id || targetId === d.id ? 2 : 0.5;
                        });

                    label.attr('fill', (n) => connectedIds.has(n.id) ? colors.labelHover : colors.nodeInactive)
                        .attr('font-weight', (n) => n.id === d.id ? 700 : 500);
                })
                .on('mouseout', () => {
                    node.attr('fill', colors.node).attr('r', nodeRadius);
                    link.attr('stroke', colors.edge).attr('stroke-width', 1);
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
