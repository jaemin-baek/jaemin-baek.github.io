import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import remarkGfm from 'remark-gfm';

const postsDirectory = path.join(process.cwd(), 'content/posts');

function ensurePostsDirectory() {
    if (!fs.existsSync(postsDirectory)) {
        fs.mkdirSync(postsDirectory, { recursive: true });
    }
}

export function getAllPostSlugs() {
    ensurePostsDirectory();
    const fileNames = fs.readdirSync(postsDirectory);
    return fileNames
        .filter((name) => name.endsWith('.md'))
        .map((name) => name.replace(/\.md$/, ''));
}

export function getPostBySlug(slug) {
    ensurePostsDirectory();
    const fullPath = path.join(postsDirectory, `${slug}.md`);
    if (!fs.existsSync(fullPath)) return null;

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    // Extract wiki-links [[target]] or [[target|display]]
    const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    const links = [];
    let match;
    while ((match = wikiLinkRegex.exec(content)) !== null) {
        links.push({
            target: match[1].trim(),
            display: match[2] ? match[2].trim() : match[1].trim(),
        });
    }

    return {
        slug,
        links,
        ...data,
        content,
    };
}

export async function getPostWithHtml(slug) {
    const post = getPostBySlug(slug);
    if (!post) return null;

    // Replace wiki-links with HTML links before markdown processing
    let processedContent = post.content.replace(
        /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
        (match, target, display) => {
            const targetSlug = target.trim().toLowerCase().replace(/\s+/g, '-');
            const displayText = display ? display.trim() : target.trim();
            return `[${displayText}](/blog/${targetSlug})`;
        }
    );

    const result = await remark()
        .use(remarkGfm)
        .use(html, { sanitize: false })
        .process(processedContent);

    return {
        ...post,
        contentHtml: result.toString(),
    };
}

export function getAllPosts() {
    const slugs = getAllPostSlugs();
    const posts = slugs
        .map((slug) => getPostBySlug(slug))
        .filter((post) => post !== null)
        .sort((a, b) => (a.date > b.date ? -1 : 1));
    return posts;
}

export function getGraphData() {
    const posts = getAllPosts();
    const slugMap = new Map(posts.map((p) => [p.slug, p]));

    const nodes = posts.map((post) => ({
        id: post.slug,
        title: post.title || post.slug,
        category: post.category || 'Uncategorized',
        date: post.date || '',
    }));

    const links = [];
    const linkSet = new Set();

    posts.forEach((post) => {
        post.links.forEach((link) => {
            const targetSlug = link.target.toLowerCase().replace(/\s+/g, '-');
            if (slugMap.has(targetSlug)) {
                const key = [post.slug, targetSlug].sort().join('->');
                if (!linkSet.has(key)) {
                    linkSet.add(key);
                    links.push({
                        source: post.slug,
                        target: targetSlug,
                    });
                }
            }
        });
    });

    return { nodes, links };
}
