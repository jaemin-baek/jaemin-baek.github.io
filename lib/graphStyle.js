export const CATEGORY_COLORS = {
    Android: '#2F7D6D',
    Kotlin: '#7C5CC4',
    Blockchain: '#C18416',
    Web: '#3867D6',
    Tools: '#667085',
    Essay: '#8A6652',
    Uncategorized: '#2F3237',
};

export const FALLBACK_CATEGORY_COLORS = [
    '#2F7D6D',
    '#7C5CC4',
    '#C18416',
    '#3867D6',
    '#B24A60',
    '#4D7C8A',
    '#8A6652',
    '#667085',
];

export function getCategoryColorMap(nodes) {
    const categories = [...new Set(nodes.map(getNodeCategory))].sort();
    const categoryColorMap = new Map();

    categories.forEach((category, index) => {
        categoryColorMap.set(
            category,
            CATEGORY_COLORS[category] || FALLBACK_CATEGORY_COLORS[index % FALLBACK_CATEGORY_COLORS.length]
        );
    });

    return categoryColorMap;
}

export function getNodeCategory(node) {
    return normalizeGraphValue(node?.category, 'Uncategorized');
}

function normalizeGraphValue(value, fallback) {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
